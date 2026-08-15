import { describe, expect, it } from 'vitest';
import { LONGUEUR_MAX_NOM, nettoyerNomJoueur, nomJoueurValide } from './classement';

// Ce nom est du contenu PUBLIC : c'est le seul texte libre du jeu que les autres joueurs voient.
// Le nettoyage est donc autant une question d'affichage que de sécurité.
describe('nettoyerNomJoueur', () => {
    // Le jeu est français : rejeter les accents rendrait la moitié des prénoms inutilisables.
    it('conserve lettres accentuées, chiffres et ponctuation autorisée', () => {
        expect(nettoyerNomJoueur("Élodie-3000")).toBe("Élodie-3000");
        expect(nettoyerNomJoueur("jean_luc O'Neil")).toBe("jean_luc O'Neil");
    });

    it('retire ce qui pourrait être interprété comme du balisage', () => {
        expect(nettoyerNomJoueur('<script>alert(1)</script>')).toBe('scriptalert1script');
        expect(nettoyerNomJoueur('a&b')).toBe('ab');
    });

    it('retire les émoticônes et les caractères de contrôle', () => {
        expect(nettoyerNomJoueur('Chat🐈Noir')).toBe('ChatNoir');
        expect(nettoyerNomJoueur('a b\nc')).toBe('a bc');
    });

    // Les espaces sont écrasés APRÈS le filtrage, sinon « a  b » et « a👍b » donneraient deux
    // résultats différents pour une même intention.
    it('écrase les espaces multiples et rogne les bords', () => {
        expect(nettoyerNomJoueur('  Le   Grand   ')).toBe('Le Grand');
    });

    it('tronque à la longueur maximale', () => {
        expect(nettoyerNomJoueur('a'.repeat(50))).toHaveLength(LONGUEUR_MAX_NOM);
    });

    it('rend une chaîne vide quand il ne reste rien', () => {
        expect(nettoyerNomJoueur('🐈🐈🐈')).toBe('');
        expect(nettoyerNomJoueur('   ')).toBe('');
    });
});

describe('nomJoueurValide', () => {
    it("refuse une saisie qui ne laisse aucun caractère affichable", () => {
        expect(nomJoueurValide('   ')).toBe(false);
        expect(nomJoueurValide('💀')).toBe(false);
    });

    it('accepte un nom ordinaire', () => {
        expect(nomJoueurValide('Pharryde')).toBe(true);
    });
});
