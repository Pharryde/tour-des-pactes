import { describe, expect, it } from 'vitest';
import type { Entite } from '../types';
import {
    calculerAttaqueAffichee,
    calculerPaliersEsquiveAffiches,
    calculerPreciseAffichee,
    corrigerActionsPourLimiteCombo,
} from './combat';

function creerHeros(surcharges: Partial<Entite> = {}): Entite {
    return {
        nom: 'Héros',
        pv: 100,
        pvMax: 100,
        armure: 0,
        nivEsquive: 0,
        baseA: 10,
        baseP: 10,
        baseD: 10,
        paliersEsquive: [0, 50, 75, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
        ...surcharges,
    };
}

// Ces trois fonctions rejouent en TS des calculs dont le moteur Rust est la source de vérité :
// toute divergence rend l'affichage mensonger sans casser le jeu, donc sans se voir. D'où ces tests.
describe('calculerAttaqueAffichee', () => {
    it("renvoie l'Attaque de base sans bonus", () => {
        expect(calculerAttaqueAffichee(creerHeros())).toBe(10);
    });

    it('applique le bonus % du Pacte de la Puissance Brute', () => {
        expect(calculerAttaqueAffichee(creerHeros({ bonusDegatsAttaquePourcentage: 10 }))).toBe(11);
        expect(calculerAttaqueAffichee(creerHeros({ bonusDegatsAttaquePourcentage: 20 }))).toBe(12);
    });

    it('ajoute +2 par Défense programmée avec la Synergie Guerrier', () => {
        const guerrier = creerHeros({ synergieActive: 'Guerrier' });
        expect(calculerAttaqueAffichee(guerrier, ['D', 'D'])).toBe(14);
        expect(calculerAttaqueAffichee(guerrier, ['A', 'D', 'E'])).toBe(12);
    });

    it('ignore les actions en attente sans la Synergie Guerrier', () => {
        expect(calculerAttaqueAffichee(creerHeros(), ['D', 'D'])).toBe(10);
    });

    // Ordre imposé par le moteur : le bonus plat de la synergie entre dans la base, PUIS le % s'applique.
    it('applique le % APRÈS le bonus plat de la Synergie Guerrier', () => {
        const entite = creerHeros({ synergieActive: 'Guerrier', bonusDegatsAttaquePourcentage: 10 });
        expect(calculerAttaqueAffichee(entite, ['D'])).toBe(13);
    });
});

describe('calculerPreciseAffichee', () => {
    it('renvoie la Précise de base sans bonus', () => {
        expect(calculerPreciseAffichee(creerHeros())).toBe(10);
    });

    it("double les dégâts avec le Pacte de l'Ombre", () => {
        expect(calculerPreciseAffichee(creerHeros({ degatsPrecisDoubles: true }))).toBe(20);
    });

    it("n'applique le bonus de Puissance Brute à la Précise qu'avec la Synergie Assassin", () => {
        expect(calculerPreciseAffichee(creerHeros({ bonusDegatsAttaquePourcentage: 10 }))).toBe(10);
        expect(calculerPreciseAffichee(creerHeros({
            bonusDegatsAttaquePourcentage: 10,
            synergieActive: 'Assassin',
        }))).toBe(11);
    });

    it('applique le % avant le doublage, comme le moteur', () => {
        expect(calculerPreciseAffichee(creerHeros({
            bonusDegatsAttaquePourcentage: 10,
            synergieActive: 'Assassin',
            degatsPrecisDoubles: true,
        }))).toBe(22);
    });
});

describe('calculerPaliersEsquiveAffiches', () => {
    it('laisse les paliers inchangés sans Pacte du Combo', () => {
        expect(calculerPaliersEsquiveAffiches(creerHeros())).toEqual([0, 50, 75, 100]);
    });

    // Le Pacte du Combo amplifie l'ÉCART entre paliers, et seulement à partir du 2e : le 1er palier
    // n'est jamais atteint par un enchaînement, donc jamais concerné par un multiplicateur de combo.
    it('amplifie les écarts à partir du 2e palier', () => {
        const entite = creerHeros({ paliersEsquive: [0, 30, 45, 60], comboMultiplicateur: 2 });
        expect(calculerPaliersEsquiveAffiches(entite)).toEqual([0, 30, 60, 90]);
    });

    it('plafonne chaque palier à 100', () => {
        const entite = creerHeros({ comboMultiplicateur: 1.5 });
        expect(calculerPaliersEsquiveAffiches(entite)).toEqual([0, 50, 88, 100]);
    });
});

describe('corrigerActionsPourLimiteCombo', () => {
    it('ne touche à rien quand la limite est de 5', () => {
        const actions = ['A', 'A', 'A', 'A', 'A'] as const;
        expect(corrigerActionsPourLimiteCombo([...actions], 5)).toEqual([...actions]);
    });

    // La correction pioche une action de remplacement au hasard : on vérifie donc la PROPRIÉTÉ
    // garantie (jamais plus de `limite` actions identiques d'affilée), pas une sortie précise.
    it('brise toute série dépassant la limite', () => {
        for (const limite of [2, 3]) {
            const corrigees = corrigerActionsPourLimiteCombo(['A', 'A', 'A', 'A', 'A'], limite);
            expect(corrigees).toHaveLength(5);

            let serie = 1;
            for (let i = 1; i < corrigees.length; i++) {
                serie = corrigees[i] === corrigees[i - 1] ? serie + 1 : 1;
                expect(serie).toBeLessThanOrEqual(limite);
            }
        }
    });
});
