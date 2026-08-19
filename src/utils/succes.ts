// src/utils/succes.ts
// Registre des succès. SOURCE DE VÉRITÉ UNIQUE : les identifiants partent en base (`public.succes`)
// et servent au calcul du top %, donc ils sont figés une fois publiés — les renommer ferait
// disparaître les succès déjà obtenus par les joueurs.
//
// ⚠️ Comme pour les clés de SYNERGIES_REGISTRY, un identifiant est TECHNIQUE : sans accent ni
// espace. Le libellé affiché vit dans `titre`.

import type { Synergie } from '../types';

export type GroupeSucces = 'normal' | 'hardcore' | 'theme' | 'final';

export interface DefSucces {
    id: string;
    titre: string;
    description: string;
    groupe: GroupeSucces;
}

/**
 * Instantané de progression, seule entrée du calcul. Volontairement plat et sans dépendance au
 * reste du jeu : c'est ce qui rend `succesDebloques` testable sans état React ni localStorage.
 *
 * Les champs `...Hc` sont les compteurs du profil hardcore. Ils sont bien SÉPARÉS et non déduits
 * des autres : les deux profils sont des progressions indépendantes (voir utils/hardcore.ts).
 */
export interface ProgressionSucces {
    monstresTues: number;
    etageRecord: number;
    runs: number;
    pactesLvl1: number;
    pactesLvl2: number;
    synergies: number;
    bossLvl0: number;
    bossLvl1: number;
    bossLvl2: number;
    degatsEsquives: number;
    degatsBloques: number;
    degatsAttaque: number;
    degatsPrecise: number;
    soins: number;

    monstresTuesHc: number;
    etageRecordHc: number;
    runsHc: number;
    pactesLvl1Hc: number;
    pactesLvl2Hc: number;
    synergiesHc: number;
    bossLvl0Hc: number;
    bossLvl1Hc: number;
    bossLvl2Hc: number;
    degatsEsquivesHc: number;
    degatsBloquesHc: number;
    degatsAttaqueHc: number;
    degatsPreciseHc: number;
    soinsHc: number;

    // Boss tués par leur propre mécanique (voir THEMES).
    themes: string[];
}

type ChampCompteur = Exclude<keyof ProgressionSucces, 'themes'>;

interface Serie {
    cle: string;
    // Le libellé sert de titre : « Monstres terrassés » + le seuil, plutôt que 60 titres écrits à
    // la main qui divergeraient les uns des autres.
    libelle: string;
    champ: ChampCompteur;
    seuils: number[];
    // Complément de description, pour dire de QUOI on parle quand le libellé seul est ambigu.
    unite: string;
}

// Séries communes aux deux modes. Chacune est déclinée en version normale et hardcore.
//
// ⚠️ L'ORDRE de ce tableau est celui de l'affichage (écran des succès, file de célébration) : le
// changer est sans conséquence. Les `cle`, elles, sont FIGÉES — elles composent les identifiants
// publiés dans `public.succes.ids`, et les renommer ferait disparaître les succès déjà obtenus. Le
// texte visible vit dans `libelle`, jamais dans la clé.
const SERIES: Serie[] = [
    { cle: 'monstres', libelle: 'C\'était de la légitime défense', champ: 'monstresTues', seuils: [1, 10, 100, 1000], unite: 'monstre(s) tué(s)' },
    // Compteurs de combat, cumulés sur toute la vie du profil (les `tdp_*_run` ne couvrent qu'une
    // ascension). « Encaissé » = absorbé par l'armure, le pendant exact de « esquivé ».
    { cle: 'attaque', libelle: 'Taper fort', champ: 'degatsAttaque', seuils: [100, 500, 1000, 10000], unite: 'dégât(s) infligé(s) à l\'Attaque' },
    { cle: 'encaisse', libelle: 'Comment il t\'a défoncé ta gueule', champ: 'degatsBloques', seuils: [100, 500, 1000, 10000], unite: 'dégât(s) absorbé(s) par l\'armure' },
    { cle: 'precise', libelle: 'Bien vu l\'aveugle', champ: 'degatsPrecise', seuils: [100, 500, 1000, 10000], unite: 'dégât(s) infligé(s) à la Précise' },
    { cle: 'esquive', libelle: 'Là tu mvois, là tu mvois plus', champ: 'degatsEsquives', seuils: [100, 500, 1000, 10000], unite: 'dégât(s) évité(s) par l\'Esquive' },
    { cle: 'soins', libelle: 'Mercurochrome le pansement des héros', champ: 'soins', seuils: [50, 100, 500, 1000], unite: 'PV récupérés' },
    { cle: 'etages', libelle: 'Ben putain ça grimpe', champ: 'etageRecord', seuils: [1, 2, 6, 12], unite: 'étage(s) atteint(s) en une ascension' },
    { cle: 'runs', libelle: 'I\'m the danger', champ: 'runs', seuils: [1, 10], unite: 'ascension(s) menée(s) à son terme' },
    { cle: 'pactes1', libelle: 'Pactes de Niveau I', champ: 'pactesLvl1', seuils: [1, 3, 6, 12], unite: 'Pacte(s) de Niveau I arraché(s)' },
    { cle: 'pactes2', libelle: 'Pactes de Niveau II', champ: 'pactesLvl2', seuils: [1, 3, 6, 12], unite: 'Pacte(s) de Niveau II arraché(s)' },
    { cle: 'synergies', libelle: 'Synergies révélées', champ: 'synergies', seuils: [1, 2, 3, 5], unite: 'synergie(s) découverte(s)' },
    // Les Gardiens se comptent en formes DISTINCTES, pas en victoires répétées : la Tour compte 12
    // étages, donc « 12 » veut dire « tous », ce qui en fait un objectif de collection.
    { cle: 'boss0', libelle: 'Gardiens vaincus', champ: 'bossLvl0', seuils: [6, 12], unite: 'Gardien(s) différent(s) vaincu(s)' },
    { cle: 'boss1', libelle: 'Formes Héroïques vaincues', champ: 'bossLvl1', seuils: [12], unite: 'Forme(s) Héroïque(s) différente(s) vaincue(s)' },
    { cle: 'boss2', libelle: 'Formes Ultimes vaincues', champ: 'bossLvl2', seuils: [12], unite: 'Forme(s) Ultime(s) différente(s) vaincue(s)' },
];

// Boss tuable par sa propre mécanique. Ce sont les SEULES qui portent un coup fatal distinct : la
// brûlure et le poison via `tics_de_fin_de_tour`, l'armure via son assaut de fin de tour. Foudre,
// Ombre, Froid et Temps ne sont que des multiplicateurs ou des réordonnancements — ils ne peuvent
// pas être la cause d'une mort, seulement l'amplifier.
// `etage` est l'`idPacte` de l'étage concerné (voir boss_data.rs) : c'est lui qui fait le lien
// entre la cause de la mort et le Gardien qui devait la subir.
export const THEMES = [
    { id: 'theme_feu', titre: 'Retour de flamme', description: 'Terrasser le Gardien du Feu avec sa propre brûlure.', cle: 'feu', etage: 'Pacte du Feu' },
    { id: 'theme_poison', titre: 'Sa propre médecine', description: 'Terrasser le Gardien du Poison avec son propre venin.', cle: 'poison', etage: 'Pacte du Poison' },
    { id: 'theme_armure', titre: 'Le mur retourné', description: "Terrasser le Gardien de l'Armure sous l'assaut de sa propre plaque.", cle: 'armure', etage: "Pacte de l'Armure" },
] as const;

export type CauseMortMonstre = typeof THEMES[number]['cle'];

/**
 * Clé du succès à thème mérité, ou `null`. Il faut que le Gardien tombe sous SA propre mécanique :
 * mourir empoisonné sur l'Étage du Feu ne prouve rien sur le Gardien du Feu.
 */
export function themeMerite(idEtage: string, causes: readonly string[]): CauseMortMonstre | null {
    const theme = THEMES.find(t => t.etage === idEtage && causes.includes(t.cle));
    return theme ? theme.cle : null;
}

export const ID_FINISSEUR = 'finisseur';

function construireRegistre(): DefSucces[] {
    const succes: DefSucces[] = [];
    for (const hardcore of [false, true]) {
        for (const serie of SERIES) {
            for (const seuil of serie.seuils) {
                succes.push({
                    id: `${serie.cle}_${seuil}${hardcore ? '_hc' : ''}`,
                    // Le versant hardcore CRIE son titre : c'est la même série des deux côtés, et
                    // la casse est le seul repère qui les distingue au premier coup d'œil.
                    titre: `${hardcore ? serie.libelle.toUpperCase() : serie.libelle} ${seuil}`,
                    description: `${seuil} ${serie.unite}${hardcore ? ' en mode hardcore' : ''}.`,
                    groupe: hardcore ? 'hardcore' : 'normal',
                });
            }
        }
    }
    for (const theme of THEMES) {
        succes.push({ id: theme.id, titre: theme.titre, description: theme.description, groupe: 'theme' });
    }
    succes.push({
        id: ID_FINISSEUR,
        titre: 'Finisseur',
        description: 'Débloquer tous les autres succès, mode normal, hardcore et succès à thème compris.',
        groupe: 'final',
    });
    return succes;
}

export const SUCCES_REGISTRY: DefSucces[] = construireRegistre();

export const SUCCES_PAR_ID: Record<string, DefSucces> = Object.fromEntries(
    SUCCES_REGISTRY.map(s => [s.id, s]),
);

/** Valeur atteinte pour un succès chiffré, ou `null` s'il n'est pas de ce type (thème, Finisseur). */
export function valeurAtteinte(id: string, progression: ProgressionSucces): number | null {
    const hardcore = id.endsWith('_hc');
    const sansMode = hardcore ? id.slice(0, -3) : id;
    const separateur = sansMode.lastIndexOf('_');
    const cle = sansMode.slice(0, separateur);
    const serie = SERIES.find(s => s.cle === cle);
    if (!serie) return null;
    const champ = (hardcore ? `${serie.champ}Hc` : serie.champ) as ChampCompteur;
    return progression[champ];
}

/**
 * Identifiants des succès débloqués. Recalculé intégralement à partir de la progression plutôt que
 * cumulé au fil du jeu : un succès ajouté après coup s'attribue alors rétroactivement aux joueurs
 * qui remplissaient déjà sa condition, sans migration.
 */
export function succesDebloques(progression: ProgressionSucces): string[] {
    const obtenus = SUCCES_REGISTRY
        .filter(def => {
            if (def.groupe === 'final') return false;
            if (def.groupe === 'theme') {
                const theme = THEMES.find(t => t.id === def.id);
                return theme ? progression.themes.includes(theme.cle) : false;
            }
            const atteint = valeurAtteinte(def.id, progression);
            const seuil = Number(def.id.replace('_hc', '').split('_').pop());
            return atteint !== null && atteint >= seuil;
        })
        .map(def => def.id);

    // Le Finisseur ne se mesure pas : il couronne tous les autres.
    if (obtenus.length === SUCCES_REGISTRY.length - 1) obtenus.push(ID_FINISSEUR);
    return obtenus;
}

/** Nombre de Pactes possédés par niveau. Le Niveau II se reconnaît à son suffixe » II «. */
export function compterPactes(pactesDebloques: string[]): { lvl1: number; lvl2: number } {
    let lvl1 = 0;
    let lvl2 = 0;
    for (const pacte of pactesDebloques) {
        if (pacte.endsWith(' II')) lvl2++; else lvl1++;
    }
    return { lvl1, lvl2 };
}

/** Synergies découvertes, en ne comptant que celles du registre (une clé inconnue serait du bruit). */
export function compterSynergies(decouvertes: Synergie[], connues: readonly string[]): number {
    return new Set(decouvertes.filter(s => connues.includes(s))).size;
}

// ============================================================================
// PUBLICATION ET RARETÉ (table `public.succes`, vue `public.succes_stats`)
// ============================================================================

export interface RareteSucces {
    detenteurs: number;
    totalJoueurs: number;
}

/**
 * Pousse la liste COMPLÈTE des succès obtenus. Envoyer l'ensemble plutôt qu'un ajout permet à un
 * succès créé après coup de s'attribuer rétroactivement, et rend l'écriture idempotente.
 */
export async function publierSucces(ids: string[]): Promise<boolean> {
    try {
        // Import différé, même raison que dans telemetrieRuns.ts : supabaseClient.ts lève au
        // niveau module si l'environnement est incomplet, ce qui rendrait tout ce fichier intestable.
        const { supabase } = await import('./supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { error } = await supabase.from('succes').upsert({ ids });
        if (error) { console.error("Erreur d'envoi des succès:", error); return false; }
        return true;
    } catch (error) {
        console.error('Succès indisponibles:', error);
        return false;
    }
}

/** Rareté de chaque succès, pour afficher « vous faites partie des X % ». */
export async function lireRaretes(): Promise<Record<string, RareteSucces> | null> {
    try {
        const { supabase } = await import('./supabaseClient');
        const { data, error } = await supabase.from('succes_stats').select('succes_id, detenteurs, total_joueurs');
        if (error) { console.error('Erreur de lecture des raretés:', error); return null; }

        const raretes: Record<string, RareteSucces> = {};
        for (const ligne of data ?? []) {
            raretes[ligne.succes_id] = { detenteurs: ligne.detenteurs, totalJoueurs: ligne.total_joueurs };
        }
        return raretes;
    } catch (error) {
        console.error('Succès indisponibles:', error);
        return null;
    }
}

/**
 * Part des joueurs détenant ce succès, arrondie. C'est le « top % » : plus il est bas, plus le
 * succès est rare. `null` quand personne n'a encore rien publié — afficher « top 0 % » sur une base
 * vide serait un mensonge flatteur.
 */
export function topPourcent(rarete: RareteSucces | undefined): number | null {
    if (!rarete || rarete.totalJoueurs <= 0) return null;
    // Arrondi au dixième pour que les succès très rares ne s'écrasent pas tous sur « 0 % ».
    return Math.round((rarete.detenteurs / rarete.totalJoueurs) * 1000) / 10;
}
