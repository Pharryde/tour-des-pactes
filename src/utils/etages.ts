// src/utils/etages.ts
import type { Entite, StructureEtage } from '../types';

export function getImageCinematique(idPacte: string): string {
    switch (idPacte) {
        case "Pacte de l'Armure": return "/images/boss_armure.png";
        case "Pacte de l'Esquive": return "/images/boss_esquive.png";
        case "Pacte du Combo": return "/images/boss_combo.png";
        case "Pacte de la Vie": return "/images/boss_vie.png";
        case "Pacte de l'Ombre": return "/images/boss_ombre.png";
        case "Pacte du Temps": return "/images/boss_temps.png";
        case "Pacte de la Fluidité": return "/images/boss_fluidite.png";
        default: return "/images/boss_default.png";
    }
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

// Puissance effective d'un étage : le palier de progression (commun à tous les étages de ce rang)
// plus la résonance du Pacte équipé, qui ne concerne que l'étage correspondant.
function appliquerPuissanceEtage(etage: StructureEtage, pactesEquipes: string[], palier: number): StructureEtage {
    let mult = 1;
    if (pactesEquipes.includes(etage.idPacte + " II")) mult = 1.2;
    else if (pactesEquipes.includes(etage.idPacte)) mult = 1.1;

    if (mult === 1 && palier <= 0) return etage;

    return {
        ...etage,
        monstres: etage.monstres.map(m => buffProgressionEtage(buffEntite(m, mult), palier, 10)),
        bossNormal: buffProgressionEtage(etage.bossNormal, palier, 20),
        bossHeroique: buffProgressionEtage(etage.bossHeroique, palier, 20),
        bossHeroiqueLvl2: buffProgressionEtage(etage.bossHeroiqueLvl2, palier, 20),
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
 */
export function genererCycleInfini(
    etages: StructureEtage[],
    pactesEquipes: string[],
    palierDeDepart: number,
): StructureEtage[] {
    return melangerAleatoirement(etages)
        .map((etage, index) => appliquerPuissanceEtage(etage, pactesEquipes, palierDeDepart + index + 1));
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
