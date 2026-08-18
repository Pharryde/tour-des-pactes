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

// Étage du Feu / du Poison : c'est la forme ÉVOLUÉE du Gardien qui porte la maîtrise élémentaire,
// et c'est elle qui sert à reconnaître l'étage (jamais son `idPacte`, qu'un renommage casserait).
function creerEtageElementaire(idPacte: string, champ: 'partBrulureSubie' | 'partPoisonSubi'): StructureEtage {
    const etage = creerEtage(idPacte);
    return {
        ...etage,
        bossHeroique: { ...etage.bossHeroique, [champ]: 0.5 },
        bossHeroiqueLvl2: { ...etage.bossHeroiqueLvl2, [champ]: 0 },
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

    // La résonance du Pacte équipé s'ajoute au palier, sur le seul étage correspondant. Tour d'un
    // étage unique : le mélange rendrait sinon la position — donc le palier — aléatoire, et la
    // comparaison ne mesurerait plus la résonance mais le tirage.
    it('cumule le palier et la résonance du Pacte équipé', () => {
        const [sansPacte] = melangerEtages([creerEtage('solo')], []);
        const [avecPacteI] = melangerEtages([creerEtage('solo')], ['solo']);
        const [avecPacteII] = melangerEtages([creerEtage('solo')], ['solo II']);

        expect(avecPacteI.monstres[0].pvMax).toBeGreaterThan(sansPacte.monstres[0].pvMax);
        expect(avecPacteII.monstres[0].pvMax).toBeGreaterThan(avecPacteI.monstres[0].pvMax);
    });

    // Les trois formes du Gardien restent DISTINCTES dans la Tour normale : c'est ce qui permet de
    // réveiller le Gardien pour lui arracher son Pacte. Seul l'infini les fait converger.
    it('conserve les trois formes distinctes du Gardien', () => {
        const [etage] = melangerEtages([creerEtage('solo')], ['solo II']);

        expect(etage.bossNormal).not.toEqual(etage.bossHeroiqueLvl2);
    });
});

// Les créatures des étages du Feu et du Poison maîtrisent le même élément que leur Gardien :
// équiper son Pacte les enrage ET les rend plus dures à brûler / empoisonner.
describe('résistance élémentaire des créatures', () => {
    const FEU = creerEtageElementaire('Pacte du Feu', 'partBrulureSubie');
    const POISON = creerEtageElementaire('Pacte du Poison', 'partPoisonSubi');

    const mobDe = (etages: StructureEtage[], pactes: string[], idPacte: string) =>
        melangerEtages(etages, pactes).find(e => e.idPacte === idPacte)!.monstres[0];

    it("ne résiste à rien tant que le Pacte n'est pas équipé", () => {
        // Douze étages pour que celui du Feu tombe forcément sur un palier > 0 quelque part : sans
        // Pacte équipé, il ne doit RIEN gagner, même à un palier élevé.
        const tour = [FEU, ...Array.from({ length: 11 }, (_, i) => creerEtage(`autre-${i}`))];

        expect(mobDe(tour, [], 'Pacte du Feu').partBrulureSubie).toBeUndefined();
    });

    it('résiste à moitié dès que le Pacte est équipé, quel que soit son niveau', () => {
        expect(mobDe([FEU], ['Pacte du Feu'], 'Pacte du Feu').partBrulureSubie).toBe(0.5);
        expect(mobDe([FEU], ['Pacte du Feu II'], 'Pacte du Feu').partBrulureSubie).toBe(0.5);
        expect(mobDe([POISON], ['Pacte du Poison II'], 'Pacte du Poison').partPoisonSubi).toBe(0.5);
    });

    // ⚠️ Jamais l'immunité : une dose entièrement absorbée par du menu fretin rendrait une action
    // du joueur inutile pendant trois salles — impasse sur l'Étage du Poison, dont les créatures
    // n'ont même pas l'Attaque. Le 0 reste le privilège du Gardien.
    it("ne rend jamais les créatures immunisées, même sous le Pacte de Niveau II", () => {
        const mob = mobDe([POISON], ['Pacte du Poison II'], 'Pacte du Poison');

        expect(mob.partPoisonSubi).not.toBe(0);
        expect(POISON.bossHeroiqueLvl2.partPoisonSubi).toBe(0);
    });

    it("n'attribue que la résistance de son propre élément", () => {
        const mob = mobDe([FEU], ['Pacte du Feu'], 'Pacte du Feu');

        expect(mob.partBrulureSubie).toBe(0.5);
        expect(mob.partPoisonSubi).toBeUndefined();
    });

    // Dans l'infini, tous les étages sont traités comme sous un Pacte de Niveau II.
    it('réveille la maîtrise élémentaire dans le mode infini sans Pacte équipé', () => {
        const [etage] = genererCycleInfini([FEU], [], 6);

        expect(etage.monstres[0].partBrulureSubie).toBe(0.5);
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

    // Dans l'infini, l'étage est traité comme si son Pacte de Niveau II y était équipé : le Gardien
    // n'y connaît plus que sa Forme Finale, il n'y a donc plus de forme supérieure à réveiller.
    it('ne laisse subsister que la Forme Finale du Gardien', () => {
        const [etage] = genererCycleInfini([creerEtage('solo')], [], 6);

        expect(etage.bossNormal).toEqual(etage.bossHeroiqueLvl2);
        expect(etage.bossHeroique).toEqual(etage.bossHeroiqueLvl2);
    });

    it('renforce les créatures comme sous un Pacte de Niveau II', () => {
        const [infini] = genererCycleInfini([creerEtage('solo')], [], 6);
        const [avecPacteII] = genererCycleInfini([creerEtage('solo')], ['solo II'], 6);

        expect(infini.monstres[0].pvMax).toBe(avecPacteII.monstres[0].pvMax);
    });

    it('conserve les douze étages du cycle', () => {
        const cycle = genererCycleInfini(TOUR, [], 6);

        expect(cycle).toHaveLength(12);
        expect(new Set(cycle.map(e => e.idPacte)).size).toBe(12);
    });

    // Le Pacte équipé ne change plus rien dans l'infini : l'étage y est DÉJÀ traité comme un
    // Niveau II. C'est dans la Tour normale que la résonance se mesure (voir melangerEtages).
    it("ignore le Pacte équipé, l'étage étant déjà au maximum", () => {
        const [sansPacte] = genererCycleInfini([creerEtage('solo')], [], 6);
        const [avecPacte] = genererCycleInfini([creerEtage('solo')], ['solo II'], 6);

        expect(avecPacte.monstres[0].pvMax).toBe(sansPacte.monstres[0].pvMax);
    });
});
