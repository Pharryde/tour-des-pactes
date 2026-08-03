export type Ecran = 'ecran-hub' | 'ecran-combat' | 'ecran-fin' | 'ecran-choix-boss' | 'ecran-repos' | 'ecran-inventaire' | 'ecran-cinematique' | 'ecran-tuto' | 'ecran-arbre' | 'ecran-sortie-tour' | 'ecran-etage-pair';
export type ActionType = 'A' | 'P' | 'D' | 'E';
export type ChoixRepos = 'soin' | 'atk' | 'pre' | 'def' | 'pv';
export type Synergie = 'Guerrier' | 'Ninja' | 'Tank' | 'Assassin';

export interface Competences {
    pv: number;
    atk: number;
    def: number;
    pre: number;
    esq: number;
}

export type TypeMonstre = 'normal' | 'boss' | 'evolue' | 'final';

export interface Bestiaire {
    normal: number;
    boss: number;
    evolue: number;
    final: number;
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
    actionsVisibles?: number;

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
    chanceSuiteDefense?: number;
    regenPvChaqueXTours?: number;
    regenPvPourcentage?: number;
    pertePvChaqueXTours?: number;
    pertePvPourcentage?: number;
    pertePvBaseMax?: boolean;

    // --- NOUVEAU : ANTI-COMBO ---
    limiteComboMax?: number;
    annuleBonusCombo?: boolean;

    // --- NOUVEAU : PUISSANCE BRUTE ---
    bonusDegatsAttaquePourcentage?: number;
    bonusComboAttaquePalier?: number;

    // --- NOUVEAU : SYNERGIES CACHÉES ---
    synergieActive?: Synergie;
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
    degatsInfliges: number;
    degatsBloques: number;
    degatsEsquives: number;
}

export interface StructureEtage {
    idPacte: string;
    nom: string;
    monstres: Entite[];
    bossNormal: Entite;
    bossHeroique: Entite;
    bossHeroiqueLvl2: Entite;
}

// Statistiques figées d'une run, capturées au moment de la mort/victoire (avant la remise à zéro
// de l'état de run) pour être affichées sur l'écran de fin.
export interface StatsRun {
    etageAtteint: number;
    etageRecord: number;
    estNouveauRecord: boolean;
    monstresTues: number;
    nouveauxPactes: string[];
    degatsInfliges: number;
    degatsBloques: number;
    degatsEsquives: number;
}