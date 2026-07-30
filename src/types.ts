// src/types.ts
export type Ecran = 'ecran-hub' | 'ecran-combat' | 'ecran-fin' | 'ecran-choix-boss' | 'ecran-repos' | 'ecran-inventaire';
export type ActionType = 'A' | 'P' | 'D' | 'E';

export interface Entite {
    nom: string;
    pv: number;
    pvMax: number;
    armure: number;
    nivEsquive: number;
    baseA: number;
    baseP: number;
    baseD: number;
    paliersEsquive: number[];
    actionsPossibles: ActionType[];
    actionsCachees?: boolean;

    // --- PROPRIÉTÉS DES PACTES ---
    actionFinTourDoublee?: boolean;
    actionTroisiemeTriplee?: boolean;
    comboMultiplicateur?: number; // CORRIGÉ : Aligné sur la variable Rust
    degatsPrecisDoubles?: boolean;
    bloqueEsquiveOpposant?: boolean;
    degatsArmureRestanteFinTour?: boolean;

    // --- PROPRIÉTÉS DES BOSS ---
    regenArmureTour?: number;
    regenPvChaqueXTours?: number;
    regenPvPourcentage?: number;
    pertePvChaqueXTours?: number;
    pertePvPourcentage?: number;
    pertePvBaseMax?: boolean;
}