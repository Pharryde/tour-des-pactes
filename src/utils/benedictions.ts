// src/utils/benedictions.ts
// La Bénédiction du Chat, offerte par l'Esprit de la Tour après la première run achevée : à chaque
// entrée dans la Tour, la Roue de la Chance tire UN de ces bonus pour toute la durée de la run.
import type { BenedictionChat, Entite } from '../types';

// Miroir de MULTIPLICATEUR_CRITIQUE dans moteur_wasm/src/combat.rs — sert ici uniquement au texte
// affiché au joueur, le calcul réel restant du ressort du moteur.
export const MULTIPLICATEUR_CRITIQUE = 1.5;

// Part des PV Max rendue par la Vie de Chat quand le joueur tombe (voir CombatArene).
export const POURCENTAGE_VIE_CHAT = 0.5;

interface BenedictionDef {
    titre: string;
    emoji: string;
    description: string;
    // Couleur du secteur sur la Roue de la Chance, reprise sur le badge affiché en combat.
    couleur: string;
    // Absente pour les bénédictions qui ne passent pas par les stats de l'entité (Vie de Chat et
    // Leçon du Maître) : celles-là sont appliquées par useGameState au moment voulu.
    appliquer?: (j: Entite) => void;
}

// ============================================================================
// SOURCE DE VÉRITÉ UNIQUE POUR LES BÉNÉDICTIONS
// Ajouter une entrée ici l'ajoute automatiquement à la Roue, à l'écran du Chat et au tirage.
// ============================================================================
export const BENEDICTIONS_REGISTRY: Record<BenedictionChat, BenedictionDef> = {
    esquive: {
        titre: "Grâce Féline",
        emoji: "💨",
        description: "+5% de chance d'esquive en permanence, même sans avoir joué Esquive.",
        couleur: "#a6e3a1",
        appliquer: (j) => { j.bonusEsquiveFlat = 5; },
    },
    critique: {
        titre: "Griffe Acérée",
        emoji: "🐾",
        description: `10% de chance qu'une Attaque ou une Précise frappe en Coup Critique (${MULTIPLICATEUR_CRITIQUE * 100}% des dégâts).`,
        couleur: "#f38ba8",
        appliquer: (j) => { j.chanceCritique = 10; },
    },
    armure: {
        titre: "Pelage d'Acier",
        emoji: "🛡️",
        description: "+10 Armure offerts au début de chaque tour, avant même votre première action.",
        couleur: "#89b4fa",
        appliquer: (j) => { j.regenArmureTour = 10; },
    },
    hypnose: {
        titre: "Regard Hypnotique",
        emoji: "👁️",
        description: "-25% de chance d'esquive pour vos adversaires.",
        couleur: "#cba6f7",
        appliquer: (j) => { j.reductionEsquiveOpposant = 25; },
    },
    vieDeChat: {
        titre: "Vie de Chat",
        emoji: "🐈",
        description: "La première fois que vous tombez, vous retombez sur vos pattes avec 50% de vos PV Max.",
        couleur: "#f9e2af",
    },
    apprentissage: {
        titre: "Leçon du Maître",
        emoji: "📖",
        description: "Toute l'XP gagnée pendant cette ascension est doublée.",
        couleur: "#fab387",
    },
};
// ============================================================================

export const LISTE_BENEDICTIONS = Object.keys(BENEDICTIONS_REGISTRY) as BenedictionChat[];

export function tirerBenediction(): BenedictionChat {
    return LISTE_BENEDICTIONS[Math.floor(Math.random() * LISTE_BENEDICTIONS.length)];
}

export function appliquerBenedictionSurJoueur(joueur: Entite, benediction: BenedictionChat | null): Entite {
    if (!benediction) return joueur;

    const j = { ...joueur };
    BENEDICTIONS_REGISTRY[benediction].appliquer?.(j);
    return j;
}

// Bénédiction "Leçon du Maître" : appliquée à la source (chaque gain d'XP) plutôt qu'au total
// cumulé, pour que le doublement ne concerne que les âmes récoltées pendant CETTE ascension.
export function appliquerBonusXp(gain: number, benediction: BenedictionChat | null): number {
    return benediction === 'apprentissage' ? gain * 2 : gain;
}
