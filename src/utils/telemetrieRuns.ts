// src/utils/telemetrieRuns.ts
// Journal des runs (table public.runs), en complément du miroir de sauvegarde de sauvegardeCloud.ts.
// Ce dernier ne conserve qu'un état courant, écrasé à chaque envoi et remis à zéro par tout
// incrément d'APP_VERSION ; il ne peut donc pas répondre à « quels Pactes, quelles compétences et
// quels choix ont été joués, run après run, version après version ».
//
// Coût pour le joueur : UN insert par run terminée ou abandonnée (soit quelques minutes de jeu), au
// mieux — jamais attendu, jamais bloquant, silencieux en cas d'échec. Aucun script tiers n'est
// chargé et aucune donnée personnelle n'est envoyée : on réutilise la connexion Supabase déjà
// ouverte pour la sauvegarde, et l'identifiant reste l'utilisateur anonyme qui existe déjà.
import { detecterSynergie } from './synergies';
import { APP_VERSION } from './versionApp';
import type { BenedictionChat, ChoixRepos, Competences, Synergie } from '../types';

// L'abandon n'est pas une run « achevée » (il ne compte ni pour runsTerminees ni pour le record),
// mais c'est le signal de frustration le plus fort du jeu, et le seul qui disparaissait entièrement.
export type IssueRun = 'mort' | 'victoire' | 'abandon';

export type CompteursRepos = Record<ChoixRepos, number>;

export const COMPTEURS_REPOS_VIDES: CompteursRepos = { soin: 0, pv: 0, atk: 0, pre: 0, def: 0 };

// Le `?? 0` couvre une sauvegarde écrite avant l'ajout d'une option de repos : la clé manquerait
// alors dans les compteurs restaurés, et un NaN se propagerait jusqu'en base.
export function incrementerRepos(compteurs: CompteursRepos, choix: readonly ChoixRepos[]): CompteursRepos {
    const suivant = { ...compteurs };
    for (const c of choix) suivant[c] = (suivant[c] ?? 0) + 1;
    return suivant;
}

// Miroir des colonnes de public.runs, hors `user_id` (rempli côté serveur) et `fini_le` (défaut).
export interface EvenementRun {
    numero_run: number;
    version: string;
    issue: IssueRun;
    etage: number;
    salle: number;
    etages: string[];
    pactes: string[];
    competences: Competences;
    benediction: BenedictionChat | null;
    synergie: Synergie | null;
    monstres_tues: number;
    pactes_arraches: string[];
    degats_infliges: number;
    degats_bloques: number;
    degats_esquives: number;
    repos_proposes: CompteursRepos;
    repos_pris: CompteursRepos;
}

export function construireEvenementRun(params: {
    numeroRun: number;
    issue: IssueRun;
    etage: number;
    salle: number;
    etages: string[];
    pactesEquipes: string[];
    competences: Competences;
    benediction: BenedictionChat | null;
    monstresTues: number;
    pactesArraches: string[];
    degatsInfliges: number;
    degatsBloques: number;
    degatsEsquives: number;
    reposProposes: CompteursRepos;
    reposPris: CompteursRepos;
}): EvenementRun {
    return {
        numero_run: params.numeroRun,
        version: APP_VERSION,
        issue: params.issue,
        etage: params.etage,
        salle: params.salle,
        // Séquence réellement tirée : `etage` seul ne veut rien dire puisque la Tour est mélangée
        // à chaque run. NON trié, contrairement à `pactes` — c'est l'ordre qui porte l'information.
        etages: params.etages,
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
        monstres_tues: params.monstresTues,
        pactes_arraches: [...params.pactesArraches].sort(),
        degats_infliges: params.degatsInfliges,
        degats_bloques: params.degatsBloques,
        degats_esquives: params.degatsEsquives,
        // Deux compteurs et non un : au-delà de la 1re visite d'une run, seules 3 des 5 options de
        // repos sont tirées. Un choix peu pris peut donc simplement avoir été peu PROPOSÉ — sans
        // le dénominateur, le taux d'utilisation est faux.
        repos_proposes: params.reposProposes,
        repos_pris: params.reposPris,
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
