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

function attendreScriptCharge(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve) => {
        const verifier = () => {
            if (window.turnstile) resolve();
            else setTimeout(verifier, 50);
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
        window.turnstile!.render(conteneur, {
            sitekey: SITE_KEY,
            callback: (token) => {
                resolve(token);
                conteneur.remove();
            },
            'error-callback': () => {
                reject(new Error("Échec de la vérification Turnstile"));
                conteneur.remove();
            },
        });
    });
}
