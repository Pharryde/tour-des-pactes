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
import type { ActionType, BenedictionChat, ChoixRepos, Competences, IssueAscension, Synergie } from '../types';

// L'abandon n'est pas une run « achevée » (il ne compte ni pour runsTerminees ni pour le record),
// mais c'est le signal de frustration le plus fort du jeu, et le seul qui disparaissait entièrement.
// Les trois autres issues sont celles d'une ascension menée à son terme, extraction hardcore comprise.
export type IssueRun = IssueAscension | 'abandon';

export type CompteursRepos = Record<ChoixRepos, number>;
export type CompteursActions = Record<ActionType, number>;

export const COMPTEURS_REPOS_VIDES: CompteursRepos = { soin: 0, pv: 0, atk: 0, pre: 0, def: 0 };
export const COMPTEURS_ACTIONS_VIDES: CompteursActions = { A: 0, P: 0, D: 0, E: 0 };

// Le `?? 0` couvre une sauvegarde écrite avant l'ajout d'une clé (une option de repos, une action) :
// elle manquerait dans les compteurs restaurés, et un NaN se propagerait jusqu'en base.
export function incrementerCompteurs<K extends string>(
    compteurs: Record<K, number>,
    cles: readonly K[],
): Record<K, number> {
    const suivant = { ...compteurs };
    for (const cle of cles) suivant[cle] = (suivant[cle] ?? 0) + 1;
    return suivant;
}

// Combo d'un camp. On stocke la SOMME et le NOMBRE plutôt que la moyenne déjà calculée : une
// moyenne de moyennes est fausse dès qu'on agrège plusieurs runs de longueurs différentes, alors
// que `sum(somme) / sum(actions)` reste exact quel que soit le découpage.
export interface StatCombo {
    somme: number;
    actions: number;
    max: number;
}

export const COMBO_VIDE: StatCombo = { somme: 0, actions: 0, max: 0 };

export function fusionnerCombo(a: StatCombo, b: StatCombo): StatCombo {
    return { somme: a.somme + b.somme, actions: a.actions + b.actions, max: Math.max(a.max, b.max) };
}

// Ce que CombatArene remonte à la fin de chaque tour. Regroupé en objet plutôt qu'en liste
// d'arguments : la fonction en prenait déjà trois et en compterait neuf.
export interface StatsTour {
    degatsInfliges: number;
    degatsBloques: number;
    degatsEsquives: number;
    actions: CompteursActions;
    comboJoueur: StatCombo;
    comboMonstre: StatCombo;
}

// Miroir des colonnes de public.runs, hors `user_id` (rempli côté serveur) et `fini_le` (défaut).
export interface EvenementRun {
    numero_run: number;
    version: string;
    issue: IssueRun;
    // Une run hardcore se joue sur un profil reparti de zéro : à étage égal, ses Pactes et son
    // arbre sont bien plus faibles. Les mélanger aux runs normales fausserait toute analyse
    // d'équilibrage, d'où ce drapeau plutôt qu'une issue supplémentaire.
    hardcore: boolean;
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
    actions: CompteursActions;
    combo_somme_joueur: number;
    combo_actions_joueur: number;
    combo_max_joueur: number;
    combo_somme_monstres: number;
    combo_actions_monstres: number;
    combo_max_monstres: number;
}

export function construireEvenementRun(params: {
    numeroRun: number;
    issue: IssueRun;
    hardcore: boolean;
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
    actions: CompteursActions;
    comboJoueur: StatCombo;
    comboMonstres: StatCombo;
}): EvenementRun {
    return {
        numero_run: params.numeroRun,
        version: APP_VERSION,
        issue: params.issue,
        hardcore: params.hardcore,
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
        // Ce que le joueur PROGRAMME, la seule mesure de sa façon de jouer — le reste du journal ne
        // dit que ce qu'il équipe. Les créneaux gelés par l'Étage du Froid sont comptés : le joueur
        // les a bel et bien choisis, c'est le moteur qui les annule ensuite.
        actions: params.actions,
        // Combo des deux camps, pour comparer. Le monstre est l'étalon : ses actions sont tirées
        // au hasard, donc son combo moyen est la valeur qu'on obtient SANS jouer. Un joueur qui ne
        // le dépasse pas n'a pas compris la mécanique — ou elle est trop difficile à exploiter.
        combo_somme_joueur: params.comboJoueur.somme,
        combo_actions_joueur: params.comboJoueur.actions,
        combo_max_joueur: params.comboJoueur.max,
        combo_somme_monstres: params.comboMonstres.somme,
        combo_actions_monstres: params.comboMonstres.actions,
        combo_max_monstres: params.comboMonstres.max,
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
