import { describe, expect, it } from 'vitest';
import { bonusEsquive, gainProchainPointEsquive, POINTS_ESQUIVE_MAX } from './competences';

// Rendement dégressif : 2 points à 5%, puis 4 à 4%, puis 8 à 3%. Une erreur de tranche ne casse
// rien à la compilation et ne se voit qu'en comparant le % affiché à l'esquive réellement obtenue.
describe('bonusEsquive', () => {
    it('accorde 5% par point sur les deux premiers', () => {
        expect(bonusEsquive(0)).toBe(0);
        expect(bonusEsquive(1)).toBe(5);
        expect(bonusEsquive(2)).toBe(10);
    });

    it('retombe à 4% par point sur les quatre suivants', () => {
        expect(bonusEsquive(3)).toBe(14);
        expect(bonusEsquive(6)).toBe(26);
    });

    it('retombe à 3% par point sur les huit suivants', () => {
        expect(bonusEsquive(7)).toBe(29);
        expect(bonusEsquive(14)).toBe(50);
    });

    // +50% sature les trois paliers de base (50/75/100) : un point de plus ne peut rien apporter.
    it('ne rapporte plus rien au-delà de la dernière tranche', () => {
        expect(POINTS_ESQUIVE_MAX).toBe(14);
        expect(bonusEsquive(15)).toBe(50);
        expect(bonusEsquive(99)).toBe(50);
    });

    it('ignore un nombre de points négatif', () => {
        expect(bonusEsquive(-3)).toBe(0);
    });
});

// L'arbre annonce ce que rapporte le PROCHAIN point : une valeur fixe promettrait +5% jusqu'au bout.
describe('gainProchainPointEsquive', () => {
    it('annonce la valeur du point à venir, pas celle du précédent', () => {
        expect([0, 1, 2, 5, 6, 13].map(gainProchainPointEsquive)).toEqual([5, 5, 4, 4, 3, 3]);
    });

    it('annonce 0 une fois la maîtrise complète', () => {
        expect(gainProchainPointEsquive(POINTS_ESQUIVE_MAX)).toBe(0);
    });
});
