import { describe, expect, it } from 'vitest';
import { imagesCinematique, imagesGardienAbsolu } from './etages';

// La chaîne d'illustrations est parcourue jusqu'à la première image qui charge : son ORDRE est donc
// toute la règle. Une inversion ne casse rien à la compilation et ne se voit qu'en jeu, sur un écran
// qu'on n'atteint qu'après trois combats.
describe('imagesCinematique', () => {
    // Les illustrations d'étage existantes SONT celles de la forme normale : une image de niveau 0
    // commune passerait sinon devant les douze et les retirerait toutes du jeu d'un coup.
    it("fait primer l'illustration de l'étage sur la forme normale", () => {
        expect(imagesCinematique("Pacte de l'Armure", 0)).toEqual([
            '/images/boss_armure_lvl0.png',
            '/images/boss_armure.png',
            '/images/boss_lvl0.png',
            '/images/boss_default.png',
        ]);
    });

    // Sur les formes supérieures, c'est l'inverse : c'est la forme qui doit se voir, pas l'étage.
    it('fait primer la forme sur les formes évoluée et finale', () => {
        expect(imagesCinematique("Pacte de l'Armure", 1)).toEqual([
            '/images/boss_armure_lvl1.png',
            '/images/boss_lvl1.png',
            '/images/boss_armure.png',
            '/images/boss_default.png',
        ]);
        expect(imagesCinematique("Pacte de l'Armure", 2)[1]).toBe('/images/boss_lvl2.png');
    });

    // Les douze étages ont un slug, y compris ceux qui n'ont pas encore d'illustration propre :
    // en déposer une suffit à l'activer, sans toucher au code.
    it('donne un slug aux douze étages', () => {
        const etages = [
            "Pacte de l'Armure", "Pacte de l'Esquive", 'Pacte du Combo', 'Pacte de la Vie',
            "Pacte de l'Ombre", 'Pacte du Temps', 'Pacte de la Fluidité', 'Pacte de la Puissance Brute',
            'Pacte du Froid', 'Pacte de la Foudre', 'Pacte du Feu', 'Pacte du Poison',
        ];
        const slugs = etages.map(e => imagesCinematique(e, 0)[0]);
        expect(new Set(slugs).size).toBe(etages.length);
        expect(slugs.every(s => s?.endsWith('_lvl0.png'))).toBe(true);
    });

    // Un étage inconnu ne doit produire aucun chemin bâti sur un slug indéfini.
    it("se rabat proprement sur un idPacte inconnu", () => {
        expect(imagesCinematique('Pacte Inconnu', 1)).toEqual([
            '/images/boss_lvl1.png',
            '/images/boss_default.png',
        ]);
    });

    // Il n'appartient à aucun étage : lui donner l'illustration du dernier étage traversé
    // annoncerait un Gardien qu'on ne va pas affronter.
    it("n'emprunte jamais l'illustration d'un étage pour le Gardien Absolu", () => {
        expect(imagesGardienAbsolu()).toEqual(['/images/boss_absolu.png', '/images/boss_default.png']);
    });
});
