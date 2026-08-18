import { describe, expect, it } from 'vitest';
import {
    ID_FINISSEUR, SUCCES_REGISTRY, SUCCES_PAR_ID, THEMES,
    compterPactes, succesDebloques, themeMerite, topPourcent, valeurAtteinte,
    type ProgressionSucces,
} from './succes';

const VIDE: ProgressionSucces = {
    monstresTues: 0, etageRecord: 0, runs: 0, pactesLvl1: 0, pactesLvl2: 0,
    synergies: 0, bossLvl0: 0, bossLvl1: 0, bossLvl2: 0,
    degatsEsquives: 0, degatsBloques: 0, degatsAttaque: 0, degatsPrecise: 0, soins: 0,
    monstresTuesHc: 0, etageRecordHc: 0, runsHc: 0, pactesLvl1Hc: 0, pactesLvl2Hc: 0,
    synergiesHc: 0, bossLvl0Hc: 0, bossLvl1Hc: 0, bossLvl2Hc: 0,
    degatsEsquivesHc: 0, degatsBloquesHc: 0, degatsAttaqueHc: 0, degatsPreciseHc: 0, soinsHc: 0,
    themes: [],
};

// Les identifiants partent en base et servent au calcul du top % : les renommer ferait disparaître
// les succès déjà obtenus par les joueurs. Ce test fige donc la forme ET l'unicité.
describe('registre', () => {
    it("n'a aucun identifiant en double", () => {
        const ids = SUCCES_REGISTRY.map(s => s.id);
        expect(ids).toHaveLength(new Set(ids).size);
    });

    // Même règle que les clés de SYNERGIES_REGISTRY : un identifiant technique ne porte ni accent
    // ni espace, sinon il devient fragile dès qu'il traverse une URL ou une colonne.
    it("n'utilise que des identifiants techniques", () => {
        for (const s of SUCCES_REGISTRY) expect(s.id).toMatch(/^[a-z0-9_]+$/);
    });

    it('décline chaque série en normal ET en hardcore', () => {
        const normaux = SUCCES_REGISTRY.filter(s => s.groupe === 'normal');
        const hardcore = SUCCES_REGISTRY.filter(s => s.groupe === 'hardcore');
        expect(hardcore).toHaveLength(normaux.length);
        for (const n of normaux) expect(SUCCES_PAR_ID[`${n.id}_hc`]).toBeDefined();
    });

    it('contient les 3 succès à thème et le Finisseur', () => {
        expect(SUCCES_REGISTRY.filter(s => s.groupe === 'theme')).toHaveLength(THEMES.length);
        expect(SUCCES_PAR_ID[ID_FINISSEUR]).toBeDefined();
    });
});

describe('succesDebloques', () => {
    it('ne débloque rien sur une progression vierge', () => {
        expect(succesDebloques(VIDE)).toEqual([]);
    });

    // Les paliers 50 et 100 d'ascensions ont été retirés : le succès s'arrête à 10.
    it("n'expose plus de palier d'ascensions au-delà de 10", () => {
        const ids = SUCCES_REGISTRY.map(s => s.id);
        expect(ids).toContain('runs_10');
        expect(ids).not.toContain('runs_50');
        expect(ids).not.toContain('runs_100');
    });

    // Un palier atteint débloque aussi tous ceux d'en dessous : les seuils sont cumulatifs, pas
    // exclusifs — un joueur à 100 monstres doit avoir les paliers 1, 10 et 100.
    it('débloque tous les paliers inférieurs atteints', () => {
        const obtenus = succesDebloques({ ...VIDE, monstresTues: 100 });
        expect(obtenus).toContain('monstres_1');
        expect(obtenus).toContain('monstres_10');
        expect(obtenus).toContain('monstres_100');
        expect(obtenus).not.toContain('monstres_1000');
    });

    // Les deux profils sont indépendants : progresser en normal ne doit rien donner en hardcore.
    it('ne mélange pas les deux modes', () => {
        const obtenus = succesDebloques({ ...VIDE, monstresTues: 1000 });
        expect(obtenus).toContain('monstres_1000');
        expect(obtenus).not.toContain('monstres_1_hc');
    });

    it('débloque le versant hardcore sur ses propres compteurs', () => {
        const obtenus = succesDebloques({ ...VIDE, monstresTuesHc: 10 });
        expect(obtenus).toContain('monstres_10_hc');
        expect(obtenus).not.toContain('monstres_10');
    });

    it('débloque un succès à thème sur sa clé', () => {
        expect(succesDebloques({ ...VIDE, themes: ['poison'] })).toEqual(['theme_poison']);
    });

    // Le Finisseur ne se mesure pas : il tombe exactement quand tout le reste est acquis.
    it('ne donne le Finisseur que lorsque tout le reste est obtenu', () => {
        const presqueTout: ProgressionSucces = {
            monstresTues: 1000, etageRecord: 12, runs: 100, pactesLvl1: 12, pactesLvl2: 12,
            synergies: 5, bossLvl0: 12, bossLvl1: 12, bossLvl2: 12,
            degatsEsquives: 10000, degatsBloques: 10000, degatsAttaque: 10000, degatsPrecise: 10000, soins: 1000,
            monstresTuesHc: 1000, etageRecordHc: 12, runsHc: 100, pactesLvl1Hc: 12, pactesLvl2Hc: 12,
            synergiesHc: 5, bossLvl0Hc: 12, bossLvl1Hc: 12, bossLvl2Hc: 12,
            degatsEsquivesHc: 10000, degatsBloquesHc: 10000, degatsAttaqueHc: 10000, degatsPreciseHc: 10000, soinsHc: 1000,
            themes: ['feu', 'poison'],
        };
        expect(succesDebloques(presqueTout)).not.toContain(ID_FINISSEUR);

        const tout = { ...presqueTout, themes: ['feu', 'poison', 'armure'] };
        const obtenus = succesDebloques(tout);
        expect(obtenus).toContain(ID_FINISSEUR);
        expect(obtenus).toHaveLength(SUCCES_REGISTRY.length);
    });
});

describe('valeurAtteinte', () => {
    it('lit le compteur du bon mode', () => {
        const p = { ...VIDE, etageRecord: 7, etageRecordHc: 3 };
        expect(valeurAtteinte('etages_6', p)).toBe(7);
        expect(valeurAtteinte('etages_6_hc', p)).toBe(3);
    });

    it("rend null pour un succès qui ne se compte pas", () => {
        expect(valeurAtteinte(ID_FINISSEUR, VIDE)).toBeNull();
        expect(valeurAtteinte('theme_feu', VIDE)).toBeNull();
    });
});

// Le Niveau II se reconnaît à son suffixe : c'est la même convention que `aLePacte` dans
// utils/synergies.ts, et la seule chose qui distingue les deux niveaux dans la liste stockée.
describe('compterPactes', () => {
    it('sépare les deux niveaux', () => {
        const compte = compterPactes(["Pacte du Feu", "Pacte du Feu II", "Pacte de la Vie", "Pacte de l'Ombre II"]);
        expect(compte).toEqual({ lvl1: 2, lvl2: 2 });
    });

    it('rend zéro sur une liste vide', () => {
        expect(compterPactes([])).toEqual({ lvl1: 0, lvl2: 0 });
    });
});

// Un Gardien doit tomber sous SA propre mécanique : mourir empoisonné sur l'Étage du Feu ne prouve
// rien sur le Gardien du Feu, et c'est exactement le genre de coïncidence qui arrive en jeu.
describe('themeMerite', () => {
    it('reconnaît le Gardien tué par sa propre mécanique', () => {
        expect(themeMerite('Pacte du Feu', ['feu'])).toBe('feu');
        expect(themeMerite("Pacte de l'Armure", ['armure'])).toBe('armure');
    });

    it("refuse une cause qui n'est pas celle de l'étage", () => {
        expect(themeMerite('Pacte du Feu', ['poison'])).toBeNull();
    });

    // Brûlure et poison peuvent être actifs en même temps : c'est l'étage qui départage.
    it('choisit la bonne cause quand plusieurs sont actives', () => {
        expect(themeMerite('Pacte du Poison', ['feu', 'poison'])).toBe('poison');
    });

    it("rend null sur un étage sans succès à thème", () => {
        expect(themeMerite('Pacte du Temps', ['feu', 'poison', 'armure'])).toBeNull();
    });
});

describe('topPourcent', () => {
    it('rend la part des détenteurs, au dixième', () => {
        expect(topPourcent({ detenteurs: 3, totalJoueurs: 8 })).toBe(37.5);
    });

    // Sans base de joueurs, annoncer « top 0 % » serait un compliment inventé.
    it("rend null quand personne n'a encore rien publié", () => {
        expect(topPourcent({ detenteurs: 0, totalJoueurs: 0 })).toBeNull();
        expect(topPourcent(undefined)).toBeNull();
    });
});
