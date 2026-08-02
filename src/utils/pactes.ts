// src/utils/pactes.ts
import type { Entite } from '../types';

interface PacteDef {
    desc: string;
    appliquer?: (j: Entite) => void;
    bonusSoinRepos?: number;      // Multiplicateur optionnel (ex: 1.1 pour +10%)
    bonusGainPvMaxRepos?: number; // Multiplicateur optionnel (ex: 1.1 pour +10%)
}

// ============================================================================
// SOURCE DE VÉRITÉ UNIQUE POUR TOUS LES PACTES
// Ajouter un nouveau pacte ici l'activera instantanément dans tout le jeu.
// ============================================================================
export const PACTES_REGISTRY: Record<string, PacteDef> = {
    "Pacte de la Vie": {
        desc: "(+10% PV Max)",
        appliquer: (j) => {
            j.pvMax = Math.floor(j.pvMax * 1.10);
            j.pv = j.pvMax;
        },
        bonusSoinRepos: 1.1,
        bonusGainPvMaxRepos: 1.1
    },
    "Pacte de la Vie II": {
        desc: "(+25% PV Max, Heal 10% / 5 Tours)",
        appliquer: (j) => {
            j.pvMax = Math.floor(j.pvMax * 1.25);
            j.pv = j.pvMax;
            j.pacteSoinVieII = true;
        },
        bonusSoinRepos: 1.1,
        bonusGainPvMaxRepos: 1.1
    },
    "Pacte de l'Armure": {
        desc: "(+5 Défense)",
        appliquer: (j) => { j.baseD += 5; }
    },
    "Pacte de l'Armure II": {
        desc: "(+5 Déf, Renvoi d'Armure)",
        appliquer: (j) => {
            j.baseD += 5;
            j.degatsArmureRestanteFinTour = true;
        }
    },
    "Pacte de l'Esquive": {
        desc: "(+10% Paliers Esquive)",
        appliquer: (j) => { j.paliersEsquive = [0, 60, 85, 100]; }
    },
    "Pacte de l'Esquive II": {
        desc: "(+30% Paliers Esquive)",
        appliquer: (j) => { j.paliersEsquive = [0, 80, 100, 100]; }
    },
    "Pacte du Combo": {
        desc: "(*1.5 Multiplicateur Combo)",
        appliquer: (j) => { j.comboMultiplicateur = 1.5; }
    },
    "Pacte du Combo II": {
        desc: "(*2 Multiplicateur Combo)",
        appliquer: (j) => { j.comboMultiplicateur = 2.0; }
    },
    "Pacte de l'Ombre": {
        desc: "(Dégâts Précis x2)",
        appliquer: (j) => { j.degatsPrecisDoubles = true; }
    },
    "Pacte de l'Ombre II": {
        desc: "(Bloque Esquive Ennemi)",
        appliquer: (j) => { j.bloqueEsquiveOpposant = true; }
    },
    "Pacte du Temps": {
        desc: "(5e Action x2)",
        appliquer: (j) => { j.actionFinTourDoublee = true; }
    },
    "Pacte du Temps II": {
        desc: "(3e Action x3)",
        appliquer: (j) => { j.actionTroisiemeTriplee = true; }
    },
    // --- NOUVEAU : PACTE DE LA FLUIDITÉ ---
    "Pacte de la Fluidité": {
        desc: "(Max 3 actions identiques)",
        // L'effet technique (limiteComboMax = 3) est déjà géré directement dans App.tsx 
        // car il modifie un comportement fondamental du joueur pour l'arène.
        // On pourrait le mettre ici si on uniformisait l'architecture, 
        // mais pour l'instant cela suffit pour l'affichage !
        appliquer: (j) => { j.limiteComboMax = 3; }
    },
    "Pacte de la Fluidité II": {
        desc: "(Max 2 act., Casse Combo Ennemi)",
        appliquer: (j) => {
            j.limiteComboMax = 2;
            j.annuleBonusCombo = true;
        }
    },
    // --- NOUVEAU : PACTE DE LA PUISSANCE BRUTE ---
    "Pacte de la Puissance Brute": {
        desc: "(+10% Dégâts d'Attaque)",
        appliquer: (j) => { j.bonusDegatsAttaquePourcentage = 10; }
    },
    "Pacte de la Puissance Brute II": {
        desc: "(+20% Dégâts d'Attaque, +1 Combo/Palier)",
        appliquer: (j) => {
            j.bonusDegatsAttaquePourcentage = 20;
            j.bonusComboAttaquePalier = 1;
        }
    }
};
// ============================================================================

export function appliquerPactesSurJoueur(joueur: Entite, pactesEquipes: string[]): Entite {
    const j = { ...joueur };
    
    pactesEquipes.forEach(nomPacte => {
        const def = PACTES_REGISTRY[nomPacte];
        if (def && def.appliquer) {
            def.appliquer(j);
        }
    });
    
    return j;
}

export function calculerSoinRepos(pvMax: number, pactesEquipes: string[]): number {
    const baseSoin = Math.floor(pvMax / 2);
    let multiplicateur = 1;

    pactesEquipes.forEach(nomPacte => {
        const def = PACTES_REGISTRY[nomPacte];
        if (def && def.bonusSoinRepos) {
            // Utiliser Math.max évite de cumuler bêtement le multiplicateur si un jour 
            // tu permets d'équiper deux pactes donnant des bonus de repos.
            multiplicateur = Math.max(multiplicateur, def.bonusSoinRepos);
        }
    });

    return Math.floor(baseSoin * multiplicateur);
}

export function calculerGainPvMaxRepos(pactesEquipes: string[]): number {
    const gainPvMax = 10;
    let multiplicateur = 1;

    pactesEquipes.forEach(nomPacte => {
        const def = PACTES_REGISTRY[nomPacte];
        if (def && def.bonusGainPvMaxRepos) {
            multiplicateur = Math.max(multiplicateur, def.bonusGainPvMaxRepos);
        }
    });

    return Math.floor(gainPvMax * multiplicateur);
}

export function genererBadgesPactes(pactesEquipes: string[]): { nom: string, desc: string }[] {
    return pactesEquipes.map(nom => ({
        nom,
        desc: PACTES_REGISTRY[nom]?.desc || "(Effet inconnu)"
    }));
}

export function peutEquiperPacte(nomPacte: string, pactesDejaEquipes: string[]): { valide: boolean, messageErreur?: string } {
    if (pactesDejaEquipes.includes(nomPacte)) return { valide: true };
    
    const estLvl2 = nomPacte.endsWith(" II");
    const nomBase = estLvl2 ? nomPacte.replace(" II", "") : nomPacte;
    const nomLvl1 = nomBase;
    const nomLvl2 = nomBase + " II";

    // Vérification des conflits intra-pacte (ne pas équiper Niveau I et Niveau II du même pacte)
    if (estLvl2 && pactesDejaEquipes.includes(nomLvl1)) {
        return { valide: false, messageErreur: `Vous ne pouvez pas équiper à la fois ${nomLvl1} et ${nomPacte}.` };
    }
    if (!estLvl2 && pactesDejaEquipes.includes(nomLvl2)) {
        return { valide: false, messageErreur: `Vous ne pouvez pas équiper à la fois ${nomPacte} et ${nomLvl2}.` };
    }

    // Vérification des limites de slots (3 de Nv 1, 1 de Nv 2)
    // Cette règle n'est pas liée à une donnée stricte de dictionnaire, c'est une règle métier de l'inventaire.
    if (estLvl2 && pactesDejaEquipes.filter(p => p.endsWith(" II")).length >= 1) {
        return { valide: false, messageErreur: "Vous ne pouvez équiper qu'un seul Pacte de Niveau 2." };
    } 
    if (!estLvl2 && pactesDejaEquipes.filter(p => !p.endsWith(" II")).length >= 3) {
        return { valide: false, messageErreur: "Vous ne pouvez équiper que 3 Pactes de Niveau 1." };
    }

    return { valide: true };
}