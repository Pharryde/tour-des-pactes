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

export function buffEntite(entite: Entite, multiplicateur: number): Entite {
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

export function melangerEtages(etages: StructureEtage[], pactesEquipes: string[], estPremierePartie: boolean = false): StructureEtage[] {
    return ordonnerEtages(etages, estPremierePartie)
        .map((etage, index) => {
            const numeroEtage = index + 1;
            const palierProgression = Math.floor(numeroEtage / 2);

            let mult = 1;
            if (pactesEquipes.includes(etage.idPacte + " II")) mult = 1.2;
            else if (pactesEquipes.includes(etage.idPacte)) mult = 1.1;

            if (mult === 1 && palierProgression === 0) return etage;

            return {
                ...etage,
                monstres: etage.monstres.map(m => buffProgressionEtage(buffEntite(m, mult), palierProgression, 10)),
                bossNormal: buffProgressionEtage(etage.bossNormal, palierProgression, 20),
                bossHeroique: buffProgressionEtage(etage.bossHeroique, palierProgression, 20),
                bossHeroiqueLvl2: buffProgressionEtage(etage.bossHeroiqueLvl2, palierProgression, 20),
            };
        });
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
