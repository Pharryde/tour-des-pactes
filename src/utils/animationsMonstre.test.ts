import { describe, it, expect } from 'vitest';
import { ANIMATIONS_MONSTRE, animationsPourMonstre } from './animationsMonstre';
import { ANIMATIONS_SOUFFLE_IMMOBILE } from './animationsSouffleImmobile';

// Le rapprochement se fait sur un FRAGMENT du nom, parce que le moteur Rust préfixe les boss par
// leur forme (nom_boss / nom_boss_evolue / nom_boss_finale dans boss_data.rs). Un renommage côté
// Rust ne casserait rien de visible : le boss retomberait simplement sur le sprite du champignon,
// en silence. D'où ces cas figés sur les noms réellement produits par le moteur.
describe('animationsPourMonstre', () => {
    it('donne le sprite dédié aux trois formes du Gardien du Froid', () => {
        for (const nom of [
            '👑 BOSS: Le Souffle Immobile',
            '👑FORME EVOLUEE: Le Souffle Immobile',
            '👑FORME FINALE: Le Souffle Immobile',
        ]) {
            expect(animationsPourMonstre(nom)).toBe(ANIMATIONS_SOUFFLE_IMMOBILE);
        }
    });

    it('laisse le sprite par défaut aux créatures sans feuille dédiée', () => {
        expect(animationsPourMonstre('Éclat de Givre')).toBe(ANIMATIONS_MONSTRE);
        expect(animationsPourMonstre('👑 BOSS: Le Mur de Fer')).toBe(ANIMATIONS_MONSTRE);
    });

    // appliquerFormeMegaBoss recopie le nom de la forme empruntée : le Gardien Absolu hérite donc
    // du sprite avec, ce qui est le comportement voulu (il change d'apparence à chaque tour).
    it('suit la forme empruntée par le Gardien Absolu', () => {
        expect(animationsPourMonstre('👑 LE GARDIEN ABSOLU')).toBe(ANIMATIONS_MONSTRE);
        expect(animationsPourMonstre('👑FORME FINALE: Le Souffle Immobile')).toBe(ANIMATIONS_SOUFFLE_IMMOBILE);
    });
});
