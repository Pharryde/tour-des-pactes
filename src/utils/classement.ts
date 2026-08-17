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

// Une ligne = un joueur, et une seule pour TOUS les classements : le `nom` est une identité
// partagée, ce qui évite qu'un même joueur apparaisse sous deux pseudos selon la liste consultée.
// `nb_runs` est nul tant qu'il n'a pas gagné en hardcore ; `etage_*` valent 0 tant qu'il n'a rien
// à y inscrire, ce qui l'exclut naturellement du classement correspondant.
export interface EntreeClassement {
    nom: string;
    nb_runs: number | null;
    runs_totales: number | null;
    monstres_tues: number | null;
    obtenu_le: string;
    etage_normal: number;
    etage_hardcore: number;
}

// Les trois classements proposés. Le mode infini n'a pas de catégorie à lui : il pousse simplement
// `etage_*` au-delà de 12, donc un record de 27 se lit comme « a poursuivi bien après la Tour ».
export type Categorie = 'hardcore' | 'etageNormal' | 'etageHardcore';

interface DefCategorie {
    titre: string;
    colonne: 'nb_runs' | 'etage_normal' | 'etage_hardcore';
    horodatage: 'obtenu_le' | 'etage_normal_le' | 'etage_hardcore_le';
    // Le classement des runs se lit à l'envers des autres : moins il y en a, mieux c'est.
    croissant: boolean;
}

export const CATEGORIES: Record<Categorie, DefCategorie> = {
    hardcore: { titre: 'Vainqueurs du Hardcore', colonne: 'nb_runs', horodatage: 'obtenu_le', croissant: true },
    etageNormal: { titre: 'Étage le plus profond — Normal', colonne: 'etage_normal', horodatage: 'etage_normal_le', croissant: false },
    etageHardcore: { titre: 'Étage le plus profond — Hardcore', colonne: 'etage_hardcore', horodatage: 'etage_hardcore_le', croissant: false },
};

// Valeur classée d'une entrée pour une catégorie donnée. `null` = le joueur n'y figure pas.
export function valeurCategorie(entree: EntreeClassement, categorie: Categorie): number | null {
    if (categorie === 'hardcore') return entree.nb_runs;
    const etage = categorie === 'etageNormal' ? entree.etage_normal : entree.etage_hardcore;
    return etage > 0 ? etage : null;
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

const COLONNES = 'nom, nb_runs, runs_totales, monstres_tues, obtenu_le, etage_normal, etage_hardcore';

export async function lireClassement(
    categorie: Categorie,
    limite = TAILLE_CLASSEMENT,
): Promise<EntreeClassement[] | null> {
    try {
        const { supabase } = await import('./supabaseClient');
        const def = CATEGORIES[categorie];
        // `not.is null` / `gt 0` écartent ceux qui n'ont rien à inscrire dans CETTE catégorie —
        // sans ce filtre, un joueur venu pour son record d'étage occuperait une place du classement
        // hardcore avec un score vide.
        const requete = supabase.from('classement').select(COLONNES);
        const filtree = categorie === 'hardcore'
            ? requete.not('nb_runs', 'is', null)
            : requete.gt(def.colonne, 0);

        const { data, error } = await filtree
            .order(def.colonne, { ascending: def.croissant })
            // À égalité, le premier arrivé passe devant : un record n'est pas repris par quelqu'un
            // qui l'égale plus tard.
            .order(def.horodatage, { ascending: true })
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

/**
 * L'entrée du joueur courant, quelle que soit sa place. C'est ce qui lui permet de se situer même
 * hors du top 10 — sans quoi un joueur classé 40e ne verrait jamais son propre score nulle part.
 */
export async function lireMonEntree(): Promise<EntreeClassement | null> {
    try {
        const { supabase } = await import('./supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data, error } = await supabase
            .from('classement')
            .select(COLONNES)
            .eq('user_id', session.user.id)
            .maybeSingle();
        if (error) {
            console.error('Erreur de lecture de votre entrée:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Classement indisponible:', error);
        return null;
    }
}

/**
 * Rang du joueur dans une catégorie : on compte ceux qui font STRICTEMENT mieux, plutôt que de
 * rapatrier tout le classement pour y chercher sa place. `head: true` ne transfère que le compte.
 */
export async function lireMonRang(categorie: Categorie, maValeur: number): Promise<number | null> {
    try {
        const { supabase } = await import('./supabaseClient');
        const def = CATEGORIES[categorie];
        const base = supabase.from('classement').select('*', { count: 'exact', head: true });
        const requete = def.croissant
            ? base.lt(def.colonne, maValeur)
            : base.gt(def.colonne, maValeur);

        const { count, error } = await requete;
        if (error) {
            console.error('Erreur de lecture de votre rang:', error);
            return null;
        }
        return (count ?? 0) + 1;
    } catch (error) {
        console.error('Classement indisponible:', error);
        return null;
    }
}

/**
 * Publie le nom du joueur et, s'il y a lieu, son record d'étage. Appelée à chaque fin de run qui
 * bat le record — le déclencheur Postgres se charge de ne rien laisser régresser, donc envoyer une
 * valeur moins bonne est sans conséquence.
 *
 * Ne fait rien sans nom : la colonne est `not null`, et un joueur qui n'a jamais choisi de pseudo
 * n'a pas demandé à figurer dans une liste publique.
 */
export async function publierRecordEtage(nom: string, hardcore: boolean, etage: number): Promise<boolean> {
    if (!nom || etage <= 0) return false;
    try {
        const { supabase } = await import('./supabaseClient');
        const { APP_VERSION } = await import('./versionApp');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { error } = await supabase.from('classement').upsert({
            nom,
            version: APP_VERSION,
            ...(hardcore ? { etage_hardcore: etage } : { etage_normal: etage }),
        });
        if (error) {
            console.error("Erreur d'envoi du record d'étage:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Classement indisponible:', error);
        return false;
    }
}

/**
 * Enregistre (ou renomme) l'identité publique du joueur, sans toucher à ses records : le
 * déclencheur Postgres conserve les colonnes absentes de l'envoi.
 */
export async function enregistrerNom(nom: string): Promise<boolean> {
    try {
        const { supabase } = await import('./supabaseClient');
        const { APP_VERSION } = await import('./versionApp');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { error } = await supabase.from('classement').upsert({ nom, version: APP_VERSION });
        if (error) {
            console.error("Erreur d'enregistrement du nom:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Classement indisponible:', error);
        return false;
    }
}
