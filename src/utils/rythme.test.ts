import { describe, expect, it } from 'vitest';
import { DELAI_TRANSITION_MS, calculerDelai } from './rythme';

// Ces attentes ne sont vérifiables ni à l'œil ni au chronomètre dans un onglet en arrière-plan
// (Chrome y cadence tout setTimeout à 1 s), d'où un test sur la règle elle-même.
describe('calculerDelai', () => {
    it('laisse la durée intacte à la vitesse normale', () => {
        expect(calculerDelai(900, 1)).toBe(900);
    });

    // Le cœur du correctif : une temporisation qui ignore le réglage de Vitesse devient
    // proportionnellement N fois plus longue que le reste du tour, et c'est ce qui donnait
    // l'impression d'un écran figé après chaque boss.
    it('divise la durée par la vitesse choisie', () => {
        expect(calculerDelai(900, 2)).toBe(450);
        expect(calculerDelai(900, 4)).toBe(225);
    });

    it('arrondit à la milliseconde', () => {
        expect(calculerDelai(901, 4)).toBe(225);
    });

    // Une valeur persistée corrompue ne doit jamais figer le jeu sur une attente infinie.
    it('retombe sur la cadence normale pour une vitesse absurde', () => {
        for (const vitesse of [0, -2, NaN, Infinity]) {
            expect(calculerDelai(900, vitesse)).toBe(900);
        }
    });
});

describe('DELAI_TRANSITION_MS', () => {
    // Elle s'ajoute à la pause servie sur le cadavre du boss : la laisser gonfler reproduirait le
    // défaut d'origine.
    it('reste courte, la pause de mort étant déjà servie par l\'arène', () => {
        expect(DELAI_TRANSITION_MS).toBeLessThanOrEqual(1000);
    });
});
