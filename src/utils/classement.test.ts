import { describe, expect, it } from 'vitest';
import { LONGUEUR_MAX_NOM, nettoyerNomJoueur, nettoyerSaisieNom, nomJoueurValide } from './classement';

// Rejoue une saisie touche par touche, comme le fait le champ contrôlé de ClassementSaisie : à
// chaque frappe la valeur courante repasse par le nettoyage. Tester la fonction sur la chaîne
// complète ne suffit pas — c'est précisément ce qui avait laissé passer le bug de l'espace.
function saisirAuClavier(texte: string): string {
    let valeur = '';
    for (const touche of texte) valeur = nettoyerSaisieNom(valeur + touche);
    return valeur;
}

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

// Le champ nettoie à chaque frappe. Si ce nettoyage rogne la FIN, l'espace est retiré à l'instant
// où il est tapé et aucun nom en deux mots ne peut plus être saisi — invisible sur un appel unique.
describe('saisie au clavier, touche par touche', () => {
    it('laisse écrire un nom en deux mots', () => {
        expect(saisirAuClavier('Le Grand')).toBe('Le Grand');
    });

    it('laisse écrire un nom en trois mots avec accents', () => {
        expect(saisirAuClavier("Élodie de l'Ombre")).toBe("Élodie de l'Ombre");
    });

    // Le filtrage reste actif à la frappe : rien d'interdit ne doit pouvoir s'installer.
    it('filtre quand même au fil de la frappe', () => {
        expect(saisirAuClavier('a<b>c')).toBe('abc');
    });

    // Un espace de tête n'a aucune raison d'exister et empêcherait de commencer à taper.
    it('refuse un espace en tête', () => {
        expect(saisirAuClavier('  Bob')).toBe('Bob');
    });

    // Deux espaces consécutifs restent écrasés en un seul, même tapés l'un après l'autre.
    it('écrase les espaces répétés', () => {
        expect(saisirAuClavier('a   b')).toBe('a b');
    });

    // L'espace final est toléré pendant la frappe mais jamais dans ce qui part en base.
    it('rogne la fin seulement au nettoyage définitif', () => {
        expect(saisirAuClavier('Bob ')).toBe('Bob ');
        expect(nettoyerNomJoueur(saisirAuClavier('Bob '))).toBe('Bob');
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
