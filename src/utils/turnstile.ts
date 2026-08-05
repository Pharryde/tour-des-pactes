// src/utils/turnstile.ts
// Jeton Cloudflare Turnstile requis par Supabase avant une inscription anonyme (protection contre
// l'abus de création de comptes qui gonflerait la base et les quotas MAU gratuits — recommandation
// affichée dans le dashboard Supabase). En mode "Invisible" (configuré côté site Cloudflare), un
// visiteur légitime ne voit jamais aucun widget ; un défi ne s'affiche qu'en cas d'activité suspecte.
declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: {
                sitekey: string;
                callback: (token: string) => void;
                'error-callback'?: () => void;
            }) => string;
        };
    }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Toute attente doit être bornée : le script est servi par un tiers (challenges.cloudflare.com)
// que des bloqueurs de pub, extensions de confidentialité ou réseaux d'entreprise peuvent couper.
// Sans échéance, la promesse ne se résoudrait jamais et `assurerSessionAnonyme` resterait suspendue
// indéfiniment — la sauvegarde cloud serait morte en silence, sans la moindre erreur remontée.
const DELAI_MAX_SCRIPT_MS = 5000;
const DELAI_MAX_TOKEN_MS = 15000;

function attendreScriptCharge(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const echeance = Date.now() + DELAI_MAX_SCRIPT_MS;
        const verifier = () => {
            if (window.turnstile) { resolve(); return; }
            if (Date.now() >= echeance) {
                reject(new Error("Script Turnstile inaccessible (bloqueur de pub ou réseau ?)"));
                return;
            }
            setTimeout(verifier, 50);
        };
        verifier();
    });
}

export async function obtenirTokenTurnstile(): Promise<string> {
    if (!SITE_KEY) {
        throw new Error("VITE_TURNSTILE_SITE_KEY absente : vérification Turnstile ignorée.");
    }
    await attendreScriptCharge();

    const conteneur = document.createElement('div');
    document.body.appendChild(conteneur);

    return new Promise((resolve, reject) => {
        let echeance = 0;
        // Retire le widget du DOM quelle que soit l'issue : sans ça, un défi qui ne rappelle jamais
        // laisserait un conteneur orphelin à chaque tentative.
        const terminer = () => {
            clearTimeout(echeance);
            conteneur.remove();
        };

        echeance = window.setTimeout(() => {
            terminer();
            reject(new Error("Délai dépassé pour la vérification Turnstile"));
        }, DELAI_MAX_TOKEN_MS);

        window.turnstile!.render(conteneur, {
            sitekey: SITE_KEY,
            callback: (token) => { terminer(); resolve(token); },
            'error-callback': () => {
                terminer();
                reject(new Error("Échec de la vérification Turnstile"));
            },
        });
    });
}
