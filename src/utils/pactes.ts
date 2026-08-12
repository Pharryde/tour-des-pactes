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
        // On ajoute au tableau déjà présent (au lieu de l'écraser) pour ne pas effacer le bonus
        // des points de compétence Esquive investis par le joueur. Le palier 0 ne bouge jamais.
        appliquer: (j) => { j.paliersEsquive = j.paliersEsquive.map((p, i) => i === 0 ? p : Math.min(100, p + 10)); }
    },
    "Pacte de l'Esquive II": {
        desc: "(+30% Paliers Esquive)",
        appliquer: (j) => { j.paliersEsquive = j.paliersEsquive.map((p, i) => i === 0 ? p : Math.min(100, p + 30)); }
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
        desc: "(Bloque Esquive Ennemi, Dégâts Précis x2)",
        appliquer: (j) => {
            j.bloqueEsquiveOpposant = true;
            j.degatsPrecisDoubles = true;
        }
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
    },
    // --- NOUVEAU : les 4 Pactes arrachés aux Gardiens du Froid, de la Foudre, du Feu et du Poison.
    // Chacun retourne contre les monstres la mécanique de son Gardien (voir boss_data.rs).
    "Pacte du Froid": {
        desc: "(2 actions résolues avant l'ennemi)",
        appliquer: (j) => { j.actionsResolutionInversee = 2; }
    },
    "Pacte du Froid II": {
        desc: "(2 actions en premier, gèle 1 action ennemie)",
        appliquer: (j) => {
            j.actionsResolutionInversee = 2;
            j.actionsGelees = 1;
        }
    },
    // Le bonus ne s'applique QUE si la cible a de l'Armure sur elle à cet instant : personne ne
    // s'étant défendu, pas de bonus. D'où la formulation, l'ancienne (« cible armée ») laissait
    // croire à une propriété permanente de la cible.
    "Pacte de la Foudre": {
        desc: "(x1.5 Dégâts si la cible a de l'Armure)",
        appliquer: (j) => { j.multiplicateurDegatsSiArmure = 1.5; }
    },
    "Pacte de la Foudre II": {
        desc: "(x2 Dégâts si la cible a de l'Armure)",
        appliquer: (j) => { j.multiplicateurDegatsSiArmure = 2; }
    },
    // ⚠️ Feu et Poison CONVERTISSENT une action : elle cesse de blesser sur le coup et se résout en
    // fin de tour. C'est un changement de style de jeu (dégâts différés), pas un simple bonus.
    // La conversion n'est totale qu'au Niveau II : à 100% dès le Niveau I, le Pacte serait
    // strictement supérieur à l'action qu'il remplace (brûlure qui s'empile, poison qui ignore
    // l'armure) et rendrait tous les autres Pactes offensifs inutiles.
    "Pacte du Feu": {
        desc: "(Vos Attaques deviennent une Brûlure de 50% des dégâts, cumulée)",
        appliquer: (j) => { j.multiplicateurBrulure = 0.5; }
    },
    "Pacte du Feu II": {
        desc: "(Vos Attaques deviennent une Brûlure de 100% des dégâts, cumulée)",
        appliquer: (j) => { j.multiplicateurBrulure = 1; }
    },
    "Pacte du Poison": {
        desc: "(Vos Précises deviennent un Poison de 50% des dégâts, ignore l'armure)",
        appliquer: (j) => { j.multiplicateurPoison = 0.5; }
    },
    "Pacte du Poison II": {
        desc: "(Vos Précises deviennent un Poison de 100% des dégâts, ignore l'armure)",
        appliquer: (j) => { j.multiplicateurPoison = 1; }
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