// src/types.ts
export type Ecran = 'ecran-hub' | 'ecran-combat' | 'ecran-fin' | 'ecran-choix-boss' | 'ecran-repos' | 'ecran-inventaire' | 'ecran-cinematique' | 'ecran-tuto' | 'ecran-arbre';
export type ActionType = 'A' | 'P' | 'D' | 'E';

export interface Competences {
    pv: number;
    atk: number;
    def: number;
    pre: number;
    esq: number;
}

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
    comboMultiplicateur?: number;
    degatsPrecisDoubles?: boolean;
    bloqueEsquiveOpposant?: boolean;
    degatsArmureRestanteFinTour?: boolean;
    pacteSoinVieII?: boolean; 

    // --- PROPRIÉTÉS DES BOSS ---
    regenArmureTour?: number;
    chanceCombo?: number;
    regenPvChaqueXTours?: number;
    regenPvPourcentage?: number;
    pertePvChaqueXTours?: number;
    pertePvPourcentage?: number;
    pertePvBaseMax?: boolean;
}

export interface EtapeCombat {
    estAction: boolean;
    log: string;
    joueurPv: number;
    joueurArmure: number;
    joueurNivEsquive: number;
    monstrePv: number;
    monstreArmure: number;
    monstreNivEsquive: number;
}

export interface StructureEtage {
    idPacte: string;
    nom: string;
    monstres: Entite[];
    bossNormal: Entite;
    bossHeroique: Entite;
    bossHeroiqueLvl2: Entite;
}