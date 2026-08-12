// src/utils/telemetrieRuns.ts
// Journal des runs achevées (table public.runs), en complément du miroir de sauvegarde de
// sauvegardeCloud.ts. Ce dernier ne conserve qu'un état courant, écrasé à chaque envoi et remis à
// zéro par tout incrément d'APP_VERSION : il ne peut donc pas répondre à « quels Pactes et quelles
// compétences ont été joués, run après run, version après version ».
//
// Coût pour le joueur : UN insert par run achevée (soit quelques minutes de jeu), au mieux — jamais
// attendu, jamais bloquant, silencieux en cas d'échec. Aucun script tiers n'est chargé et aucune
// donnée personnelle n'est envoyée : on réutilise la connexion Supabase déjà ouverte pour la
// sauvegarde, et l'identifiant reste l'utilisateur anonyme qui existe déjà.
import { detecterSynergie } from './synergies';
import { APP_VERSION } from './versionApp';
import type { BenedictionChat, Competences, Synergie } from '../types';

export type IssueRun = 'mort' | 'victoire';

// Miroir des colonnes de public.runs, hors `user_id` (rempli côté serveur) et `fini_le` (défaut).
export interface EvenementRun {
    numero_run: number;
    version: string;
    issue: IssueRun;
    etage: number;
    pactes: string[];
    competences: Competences;
    benediction: BenedictionChat | null;
    synergie: Synergie | null;
}

export function construireEvenementRun(params: {
    numeroRun: number;
    issue: IssueRun;
    etage: number;
    pactesEquipes: string[];
    competences: Competences;
    benediction: BenedictionChat | null;
}): EvenementRun {
    return {
        numero_run: params.numeroRun,
        version: APP_VERSION,
        issue: params.issue,
        etage: params.etage,
        // Trié : deux joueurs portant la MÊME composition dans un ordre d'équipement différent
        // doivent produire le même tableau, sinon un `group by pactes` éclate une seule et même
        // combinaison en autant de lignes que d'ordres possibles — et le classement des
        // compositions les plus jouées devient faux sans que rien ne le signale.
        pactes: [...params.pactesEquipes].sort(),
        competences: params.competences,
        benediction: params.benediction,
        // Recalculée depuis les Pactes plutôt que lue sur l'entité joueur : en fin de run celle-ci
        // a déjà pu être remplacée (victoire totale) ou vidée, alors que la composition, elle,
        // reste la source de vérité de la synergie.
        synergie: detecterSynergie(params.pactesEquipes),
    };
}

export async function journaliserRun(evenement: EvenementRun): Promise<void> {
    try {
        // Import différé : supabaseClient.ts construit son client AU NIVEAU MODULE et lève si les
        // variables d'environnement manquent. Le charger statiquement ici rendrait
        // `construireEvenementRun` — une fonction pure — intestable, puisque le seul fait
        // d'importer ce fichier suffirait à faire échouer la suite.
        const { supabase } = await import('./supabaseClient');

        const { data: { session } } = await supabase.auth.getSession();
        // Pas de session = sauvegarde cloud inactive pour ce joueur (captcha coupé, réseau filtré,
        // projet en pause...). Inutile de tenter un insert que la RLS rejettera de toute façon.
        if (!session) return;

        // `user_id` n'est volontairement pas transmis : la colonne le tire du JWT (default auth.uid()).
        const { error } = await supabase.from('runs').insert(evenement);
        // 23505 = violation de clé primaire, soit un double envoi de la même run. C'est le
        // comportement attendu de la déduplication, pas une panne à signaler.
        if (error && error.code !== '23505') {
            console.error("Erreur d'envoi du journal de run:", error);
        }
    } catch (error) {
        console.error("Journal de run indisponible:", error);
    }
}
