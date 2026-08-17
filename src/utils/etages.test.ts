import { describe, expect, it } from 'vitest';
import type { Entite, StructureEtage } from '../types';
import { genererCycleInfini, melangerEtages, palierFinDeTour } from './etages';

function creerEntite(nom: string): Entite {
    return {
        nom,
        pv: 100,
        pvMax: 100,
        armure: 0,
        nivEsquive: 0,
        baseA: 10,
        baseP: 4,
        baseD: 10,
        paliersEsquive: [0, 50, 75, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
    };
}

function creerEtage(idPacte: string): StructureEtage {
    return {
        idPacte,
        nom: `Étage ${idPacte}`,
        monstres: [creerEntite('mob 1'), creerEntite('mob 2'), creerEntite('mob 3')],
        bossNormal: creerEntite('boss'),
        bossHeroique: creerEntite('boss+'),
        bossHeroiqueLvl2: creerEntite('boss++'),
    };
}

const TOUR = Array.from({ length: 12 }, (_, i) => creerEtage(`pacte-${i}`));

// Le palier n'est lisible nulle part sur la structure : il est cuit dans les stats à la
// construction. On le reconstitue depuis l'Attaque, dont buffProgressionEtage ajoute exactement
// 2 par palier — c'est la seule façon de vérifier la cadence de progression.
function palierDepuisAttaque(etage: StructureEtage): number {
    return (etage.bossNormal.baseA - 10) / 2;
}

describe('melangerEtages', () => {
    // La cadence de la Tour normale : un palier tous les DEUX étages.
    it('monte le palier un étage sur deux', () => {
        const paliers = melangerEtages(TOUR, []).map(palierDepuisAttaque);

        expect(paliers).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);
    });
});

describe('genererCycleInfini', () => {
    // La règle du mode infini : chaque étage vaut un palier, là où la Tour normale en demande deux.
    it('monte le palier à chaque étage', () => {
        const paliers = genererCycleInfini(TOUR, [], palierFinDeTour(TOUR.length)).map(palierDepuisAttaque);

        expect(paliers).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    });

    // Sans continuité, le 1er étage d'un nouveau cycle serait plus FAIBLE que le dernier du
    // précédent : la difficulté redescendrait d'un cran à chaque Gardien Absolu vaincu, soit
    // l'inverse exact de ce que promet un mode infini.
    it('enchaîne deux cycles sans rupture de difficulté', () => {
        const cycle1 = genererCycleInfini(TOUR, [], palierFinDeTour(TOUR.length));
        const dernierDuCycle1 = palierDepuisAttaque(cycle1[cycle1.length - 1]);

        const cycle2 = genererCycleInfini(TOUR, [], dernierDuCycle1);

        expect(palierDepuisAttaque(cycle2[0])).toBe(dernierDuCycle1 + 1);
        expect(palierDepuisAttaque(cycle2[cycle2.length - 1])).toBe(30);
    });

    // Le palier de départ est dérivé de la taille de la Tour : ajouter un 13e étage doit décaler
    // l'infini automatiquement, sans retoucher une constante.
    it('dérive le palier de départ de la taille de la Tour', () => {
        expect(palierFinDeTour(12)).toBe(6);
        expect(palierFinDeTour(13)).toBe(6);
        expect(palierFinDeTour(14)).toBe(7);
    });

    it('conserve les douze étages du cycle', () => {
        const cycle = genererCycleInfini(TOUR, [], 6);

        expect(cycle).toHaveLength(12);
        expect(new Set(cycle.map(e => e.idPacte)).size).toBe(12);
    });

    // La résonance du Pacte équipé continue de s'appliquer dans l'infini, en plus du palier.
    // Tour d'un seul étage : le mélange rendrait sinon la position — donc le palier — aléatoire,
    // et la comparaison ne mesurerait plus la résonance mais le tirage.
    it('cumule le palier et la résonance du Pacte équipé', () => {
        const [sansPacte] = genererCycleInfini([creerEtage('solo')], [], 6);
        const [avecPacte] = genererCycleInfini([creerEtage('solo')], ['solo II'], 6);

        expect(palierDepuisAttaque(sansPacte)).toBe(palierDepuisAttaque(avecPacte));
        expect(avecPacte.monstres[0].pvMax).toBeGreaterThan(sansPacte.monstres[0].pvMax);
    });
});
