// src/utils/etages.ts
import type { Entite, StructureEtage } from '../types';

// Forme du Gardien mise en scène : 0 = normale, 1 = évoluée (Niveau I), 2 = finale (Niveau II).
export type NiveauBoss = 0 | 1 | 2;

// Fragment de nom de fichier par étage. Les cinq derniers étages n'ont pas encore d'illustration
// propre, mais leur slug est défini d'avance : en déposer une suffira à l'activer, sans toucher au
// code (voir la chaîne de repli ci-dessous).
const SLUGS_ETAGES: Record<string, string> = {
    "Pacte de l'Armure": 'armure',
    "Pacte de l'Esquive": 'esquive',
    'Pacte du Combo': 'combo',
    'Pacte de la Vie': 'vie',
    "Pacte de l'Ombre": 'ombre',
    'Pacte du Temps': 'temps',
    'Pacte de la Fluidité': 'fluidite',
    'Pacte de la Puissance Brute': 'brute',
    'Pacte du Froid': 'froid',
    'Pacte de la Foudre': 'foudre',
    'Pacte du Feu': 'feu',
    'Pacte du Poison': 'poison',
};

/**
 * Illustrations candidates pour la mise en scène d'un Gardien, de la plus spécifique à la plus
 * générale. L'affichage descend la liste à chaque image introuvable (voir `ImageCinematique`), ce
 * qui rend le tout ADDITIF : déposer un fichier suffit à l'utiliser, ne pas le déposer ne casse rien.
 *
 *   1. `boss_<etage>_lvl<N>.png` — l'étage ET la forme (le cas le plus soigné, aucun pour l'instant)
 *   2. `boss_lvl<N>.png`         — la forme seule, commune aux douze étages
 *   3. `boss_<etage>.png`        — l'étage seul, les illustrations historiques
 *   4. `boss_default.png`        — le filet de sécurité
 *
 * ⚠️ La forme NORMALE inverse les rangs 2 et 3 : les illustrations d'étage existantes SONT l'image
 * du Gardien tel qu'on le rencontre par défaut. Une image de niveau 0 commune passerait sinon devant
 * elles et les retirerait toutes du jeu d'un coup.
 */
export function imagesCinematique(idPacte: string, niveau: NiveauBoss): string[] {
    const slug = SLUGS_ETAGES[idPacte];
    const parEtage = slug ? [`/images/boss_${slug}.png`] : [];
    const parNiveau = [`/images/boss_lvl${niveau}.png`];
    return [
        ...(slug ? [`/images/boss_${slug}_lvl${niveau}.png`] : []),
        ...(niveau === 0 ? [...parEtage, ...parNiveau] : [...parNiveau, ...parEtage]),
        '/images/boss_default.png',
    ];
}

// Le Gardien Absolu n'appartient à aucun étage : lui donner l'illustration du dernier étage
// traversé, comme le ferait `imagesCinematique`, annoncerait un Gardien qu'on ne va pas affronter.
export function imagesGardienAbsolu(): string[] {
    return ['/images/boss_absolu.png', '/images/boss_default.png'];
}

function buffEntite(entite: Entite, multiplicateur: number): Entite {
    if (multiplicateur === 1) return entite;
    return {
        ...entite,
        pv: Math.floor(entite.pv * multiplicateur),
        pvMax: Math.floor(entite.pvMax * multiplicateur),
        baseA: Math.floor(entite.baseA * multiplicateur),
        baseP: Math.floor(entite.baseP * multiplicateur),
        baseD: Math.floor(entite.baseD * multiplicateur),
    };
}

// Chaque étage PAIR de la run (le 2e, le 4e, ...) augmente durablement la puissance de TOUS les
// monstres (mobs et boss) à partir de ce point : le palier ne redescend jamais et s'additionne
// au fil de la progression. Le bonus d'esquive ne modifie que les paliers atteints via l'action
// Esquive (indices 1 à 3) — jamais le palier 0, pour rester "non passif" comme demandé.
// bonusPvParPalier : +10 PV pour un monstre normal, +20 PV pour un boss (peu importe sa forme).
export function buffProgressionEtage(entite: Entite, palier: number, bonusPvParPalier: number): Entite {
    if (palier <= 0) return entite;
    const bonusPv = bonusPvParPalier * palier;
    return {
        ...entite,
        pv: entite.pv + bonusPv,
        pvMax: entite.pvMax + bonusPv,
        baseA: entite.baseA + 2 * palier,
        baseD: entite.baseD + 2 * palier,
        baseP: entite.baseP + 1 * palier,
        paliersEsquive: entite.paliersEsquive.map((p, i) => i === 0 ? p : Math.min(100, p + 2 * palier)),
    };
}

export function melangerAleatoirement<T>(tableau: T[]): T[] {
    const resultat = [...tableau];
    for (let i = resultat.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
    }
    return resultat;
}

// Pour la toute première partie d'un joueur, les 2 premiers étages sont toujours pris parmi ces
// 3 pactes (mécaniques simples, sans effet de statut caché/temporel) pour un onboarding en douceur.
const PACTES_ETAGES_DEBUTANT = ["Pacte de l'Armure", "Pacte de la Vie", "Pacte de la Puissance Brute"];

function ordonnerEtages(etages: StructureEtage[], estPremierePartie: boolean): StructureEtage[] {
    if (!estPremierePartie) return melangerAleatoirement(etages);

    const debutants = melangerAleatoirement(etages.filter(e => PACTES_ETAGES_DEBUTANT.includes(e.idPacte)));
    const autres = etages.filter(e => !PACTES_ETAGES_DEBUTANT.includes(e.idPacte));

    // Les 2 premiers étages "débutant" ouvrent la run ; le 3e (s'il existe) rejoint le reste du mélange.
    return [...debutants.slice(0, 2), ...melangerAleatoirement([...debutants.slice(2), ...autres])];
}

// Part d'élément que les créatures de l'étage encaissent quand la résonance du Pacte est active.
// Elles maîtrisent le même élément que leur Gardien : les enrager en équipant son Pacte les rend
// aussi plus dures à brûler ou à empoisonner.
// ⚠️ **Plafonnée à la moitié, jamais l'immunité** : le 0.0 reste le privilège du Gardien. Une dose
// entièrement absorbée par du menu fretin rendrait une action du joueur purement inutile pendant
// trois salles — sur l'Étage du Poison, dont les créatures n'ont même pas l'Attaque, ce serait une
// impasse. La moitié se sent, l'immunité bloque.
const PART_ELEMENT_MOBS = 0.5;

// L'étage est reconnu à ce que son Gardien maîtrise, jamais à son `idPacte` : un renommage dans
// boss_data.rs ferait échouer une comparaison de chaîne EN SILENCE (cf. animationsMonstre.test.ts).
function resistancesMobs(etage: StructureEtage): Partial<Entite> {
    return {
        ...(etage.bossHeroique.partBrulureSubie !== undefined ? { partBrulureSubie: PART_ELEMENT_MOBS } : {}),
        ...(etage.bossHeroique.partPoisonSubi !== undefined ? { partPoisonSubi: PART_ELEMENT_MOBS } : {}),
    };
}

// Puissance effective d'un étage : le palier de progression (commun à tous les étages de ce rang)
// plus la résonance du Pacte équipé, qui ne concerne que l'étage correspondant.
// `forcerNiveauII` (mode infini) traite l'étage comme si le Pacte de Niveau II y était équipé, et
// n'y laisse subsister que la Forme Finale du Gardien.
function appliquerPuissanceEtage(
    etage: StructureEtage,
    pactesEquipes: string[],
    palier: number,
    forcerNiveauII = false,
): StructureEtage {
    let mult = 1;
    if (forcerNiveauII || pactesEquipes.includes(etage.idPacte + " II")) mult = 1.2;
    else if (pactesEquipes.includes(etage.idPacte)) mult = 1.1;

    if (mult === 1 && palier <= 0) return etage;

    // La résonance ne renforce pas seulement les stats : elle réveille aussi la maîtrise
    // élémentaire des créatures de l'étage, à l'image de leur Gardien.
    // ⚠️ Conditionnée à `mult > 1`, jamais au simple fait d'entrer dans cette branche : un étage
    // sans Pacte équipé y entre quand même dès que son palier dépasse 0, et ses créatures
    // deviendraient résistantes sans que le joueur ait rien fait pour les enrager.
    const resistances = mult > 1 ? resistancesMobs(etage) : {};
    const monstres = etage.monstres.map(m => ({ ...buffProgressionEtage(buffEntite(m, mult), palier, 10), ...resistances }));

    // Dans l'infini, le Gardien ne connaît plus que sa Forme Finale : les trois formes convergent,
    // si bien que le joueur l'affronte sous ses traits les plus dangereux quoi qu'il équipe.
    const forme = forcerNiveauII
        ? buffProgressionEtage(etage.bossHeroiqueLvl2, palier, 20)
        : null;

    return {
        ...etage,
        monstres,
        bossNormal: forme ?? buffProgressionEtage(etage.bossNormal, palier, 20),
        bossHeroique: forme ?? buffProgressionEtage(etage.bossHeroique, palier, 20),
        bossHeroiqueLvl2: forme ?? buffProgressionEtage(etage.bossHeroiqueLvl2, palier, 20),
    };
}

export function melangerEtages(etages: StructureEtage[], pactesEquipes: string[], estPremierePartie: boolean = false): StructureEtage[] {
    return ordonnerEtages(etages, estPremierePartie)
        .map((etage, index) => appliquerPuissanceEtage(etage, pactesEquipes, Math.floor((index + 1) / 2)));
}

/**
 * Palier atteint au bout de la Tour normale : c'est de là que repart le mode infini. Dérivé de la
 * taille de la Tour plutôt que codé en dur, pour suivre automatiquement l'ajout d'un étage.
 */
export function palierFinDeTour(tailleTour: number): number {
    return Math.floor(tailleTour / 2);
}

/**
 * Un cycle du mode infini : les étages de la Tour re-mélangés, dont le palier de puissance monte
 * de 1 à CHAQUE étage au lieu d'un sur deux — c'est la règle que le joueur accepte en s'enfonçant
 * au-delà du Gardien Absolu. Le palier ne redescend jamais : il repart de celui atteint au bout du
 * segment précédent, si bien que deux cycles enchaînés continuent de grimper sans rupture.
 *
 * L'ordre de la Tour est retiré à chaque cycle (jamais `ordonnerEtages`) : la règle d'onboarding
 * des deux premiers étages n'a aucun sens pour un joueur qui vient de terrasser le Gardien Absolu.
 *
 * Tous les étages y sont traités comme si leur Pacte de Niveau II était équipé : créatures
 * renforcées de 20 % et maîtresses de leur élément, Gardien d'emblée dans sa Forme Finale. Il n'y a
 * donc plus de forme supérieure à réveiller — l'arrachage de Pacte n'existe pas dans l'infini
 * (voir `gererFinDeGardien`).
 */
export function genererCycleInfini(
    etages: StructureEtage[],
    pactesEquipes: string[],
    palierDeDepart: number,
): StructureEtage[] {
    return melangerAleatoirement(etages)
        .map((etage, index) => appliquerPuissanceEtage(etage, pactesEquipes, palierDeDepart + index + 1, true));
}

export function genererMessageBuff(etage: StructureEtage, pactesEquipes: string[]): string {
    if (pactesEquipes.includes(etage.idPacte + " II")) {
        return `<br><b style="color: #f38ba8;">⚠️ Les monstres sont enragés par la présence de votre Pacte de Niveau II !</b>`;
    }
    if (pactesEquipes.includes(etage.idPacte)) {
        return `<br><b style="color: #fab387;">⚠️ Les monstres sont renforcés par la présence de votre Pacte !</b>`;
    }
    return "";
}
