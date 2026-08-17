// src/utils/classement.ts
// Classement des joueurs ayant terrassé la Tour en mode hardcore. Le score est le nombre de runs
// qu'il leur a fallu DEPUIS LE DERNIER EFFACEMENT de profil : la mort remettant toute la puissance
// à zéro, « fini en 4 runs » veut dire fini presque en partant de rien. C'est l'exploit que le mode
// met en jeu, et ça laisse une chance à tout le monde, même après cinquante morts.
//
// Contrairement à `public.runs` (en ajout seul, jamais relu), cette table est LISIBLE PAR TOUS :
// c'est ce qui en fait un classement. Le nom est donc du contenu public choisi par le joueur, d'où
// le nettoyage ci-dessous — doublé d'une contrainte en base, le client pouvant être contourné.

export const LONGUEUR_MAX_NOM = 20;

// Nombre de places affichées. Chaque joueur n'occupe qu'une ligne (sa meilleure : `user_id` est la
// clé primaire), donc c'est bien un top 10 de joueurs distincts, pas des dix meilleures tentatives.
export const TAILLE_CLASSEMENT = 10;

/**
 * Ramène une saisie libre à un nom affichable. Les caractères hors lettres/chiffres/espace/-/_/'
 * sont retirés plutôt que la saisie rejetée : un joueur qui colle une émoticône doit voir son nom
 * se nettoyer, pas se faire refuser sans comprendre pourquoi.
 *
 * `\p{L}` (et non [a-z]) parce que le jeu est français : « Élodie » doit passer intact.
 */
/**
 * Nettoyage appliqué À LA FRAPPE. Identique au nettoyage final à une chose près : il ne rogne pas
 * la FIN de la chaîne.
 *
 * ⚠️ Rogner la fin à chaque touche rend l'espace impossible à saisir — il serait retiré à l'instant
 * même où il est tapé, et un nom en deux mots ne pourrait jamais s'écrire. Le piège ne se voit pas
 * en testant la fonction sur une chaîne complète, seulement en la rejouant caractère par caractère.
 */
export function nettoyerSaisieNom(brut: string): string {
    return brut
        .replace(/[^\p{L}\p{N} '\-_]/gu, '')
        // Les espaces multiples sont écrasés APRÈS le filtrage : « a  b » et « a👍b » ne doivent
        // pas produire deux résultats différents.
        .replace(/ +/g, ' ')
        .trimStart()
        .slice(0, LONGUEUR_MAX_NOM);
}

// Forme définitive, celle qui part en base : la fin est rognée pour de bon.
export function nettoyerNomJoueur(brut: string): string {
    return nettoyerSaisieNom(brut).trimEnd();
}

export function nomJoueurValide(brut: string): boolean {
    return nettoyerNomJoueur(brut).length > 0;
}

export interface EntreeClassement {
    nom: string;
    nb_runs: number;
    runs_totales: number;
    monstres_tues: number;
    obtenu_le: string;
}

// Regroupé en objet plutôt qu'en arguments positionnels : quatre nombres de suite s'intervertissent
// sans que rien ne le signale, et le score est justement ce qu'on ne peut pas corriger après coup.
export interface ScoreHardcore {
    nom: string;
    nbRuns: number;
    runsTotales: number;
    monstresTues: number;
}

/**
 * Enregistre (ou améliore) le score du joueur. Un déclencheur Postgres refuse le remplacement par
 * un score moins bon, donc renvoyer ici n'importe quelle victoire est sans danger pour le record.
 *
 * @returns true si l'envoi a abouti, pour que l'écran puisse le dire au joueur — contrairement au
 *   journal de runs, qui est purement passif, celui-ci est une action délibérée dont l'échec doit
 *   se voir.
 */
export async function soumettreScore(score: ScoreHardcore): Promise<boolean> {
    try {
        // Import différé pour la même raison que dans telemetrieRuns.ts : supabaseClient.ts
        // construit son client au niveau module et lève si l'environnement est incomplet, ce qui
        // rendrait `nettoyerNomJoueur` intestable par le seul fait d'importer ce fichier.
        const { supabase } = await import('./supabaseClient');
        const { APP_VERSION } = await import('./versionApp');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        // `user_id` n'est pas transmis : la colonne le tire du JWT (default auth.uid()), et c'est
        // aussi la clé primaire — un joueur ne peut donc occuper qu'une seule ligne.
        const { error } = await supabase
            .from('classement')
            .upsert({
                nom: score.nom,
                nb_runs: score.nbRuns,
                runs_totales: score.runsTotales,
                monstres_tues: score.monstresTues,
                version: APP_VERSION,
            });
        if (error) {
            console.error("Erreur d'envoi du score:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Classement indisponible:', error);
        return false;
    }
}

export async function lireClassement(limite = TAILLE_CLASSEMENT): Promise<EntreeClassement[] | null> {
    try {
        const { supabase } = await import('./supabaseClient');
        // À égalité de runs, le premier arrivé passe devant : un record n'est pas repris par
        // quelqu'un qui l'égale plus tard.
        const { data, error } = await supabase
            .from('classement')
            .select('nom, nb_runs, runs_totales, monstres_tues, obtenu_le')
            .order('nb_runs', { ascending: true })
            .order('obtenu_le', { ascending: true })
            .limit(limite);
        if (error) {
            console.error('Erreur de lecture du classement:', error);
            return null;
        }
        return data ?? [];
    } catch (error) {
        console.error('Classement indisponible:', error);
        return null;
    }
}
