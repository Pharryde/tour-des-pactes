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

function melangerAleatoirement<T>(tableau: T[]): T[] {
    const resultat = [...tableau];
    for (let i = resultat.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
    }
    return resultat;
}

export function melangerEtages(etages: StructureEtage[], pactesEquipes: string[]): StructureEtage[] {
    return melangerAleatoirement(etages)
        .map(etage => {
            let mult = 1;
            if (pactesEquipes.includes(etage.idPacte + " II")) mult = 1.2;
            else if (pactesEquipes.includes(etage.idPacte)) mult = 1.1;

            if (mult === 1) return etage;

            return {
                ...etage,
                monstres: etage.monstres.map(m => buffEntite(m, mult))
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
