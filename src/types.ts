export type Ecran = 'ecran-hub' | 'ecran-combat' | 'ecran-fin' | 'ecran-choix-boss' | 'ecran-repos' | 'ecran-inventaire' | 'ecran-cinematique' | 'ecran-tuto' | 'ecran-arbre' | 'ecran-sortie-tour' | 'ecran-etage-pair' | 'ecran-tuto-intro' | 'ecran-tuto-conclusion' | 'ecran-benediction' | 'ecran-roue' | 'ecran-forgeron' | 'ecran-lecon-combo';
export type ActionType = 'A' | 'P' | 'D' | 'E';
export type ChoixRepos = 'soin' | 'atk' | 'pre' | 'def' | 'pv';
export type Synergie = 'Guerrier' | 'Ninja' | 'Tank' | 'Assassin';
// Bonus offert par le Chat Mystérieux, tiré à la Roue de la Chance à chaque entrée dans la Tour
// (voir utils/benedictions.ts pour leurs effets).
export type BenedictionChat = 'esquive' | 'critique' | 'armure' | 'hypnose' | 'vieDeChat' | 'apprentissage';

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

    // --- NOUVEAU : BÉNÉDICTIONS DU CHAT (joueur uniquement) ---
    bonusEsquiveFlat?: number;
    chanceCritique?: number;
    reductionEsquiveOpposant?: number;

    // --- NOUVEAU : ÉTAGES DU FROID / DE LA FOUDRE / DU FEU / DU POISON ---
    actionsResolutionInversee?: number;
    actionsGelees?: number;
    multiplicateurDegatsSiArmure?: number;
    // Multiplicateurs appliqués aux dégâts de l'action convertie (Attaque → brûlure, Précise →
    // poison). La valeur du DoT vaut donc les dégâts réels de l'action, combos compris.
    multiplicateurBrulure?: number;
    multiplicateurPoison?: number;
    // Tour à partir duquel la créature peut passer un tour entier sans action offensive.
    peutTemporiserDesTour?: number;
    // États subis, transportés d'un tour à l'autre par l'entité elle-même.
    brulureActive?: number;
    poisonActif?: number;
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
    // États différés au moment de cette étape, pour que les compteurs 🔥/🧪 montent AU FUR ET À
    // MESURE des actions au lieu de n'apparaître qu'une fois le tour entièrement résolu.
    joueurBrulure: number;
    joueurPoison: number;
    monstreBrulure: number;
    monstrePoison: number;
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