import { describe, expect, it } from 'vitest';
import type { BenedictionChat, Entite } from '../types';
import {
    BENEDICTIONS_REGISTRY,
    LISTE_BENEDICTIONS,
    appliquerBenedictionSurJoueur,
    appliquerBonusXp,
    tirerBenediction,
} from './benedictions';

function creerHeros(surcharges: Partial<Entite> = {}): Entite {
    return {
        nom: 'Héros',
        pv: 100,
        pvMax: 100,
        armure: 0,
        nivEsquive: 0,
        baseA: 10,
        baseP: 4,
        baseD: 10,
        paliersEsquive: [0, 50, 75, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
        ...surcharges,
    };
}

describe('BENEDICTIONS_REGISTRY', () => {
    it('décrit les six bénédictions annoncées au joueur', () => {
        expect(LISTE_BENEDICTIONS).toHaveLength(6);
    });

    // La Roue et l'écran du Chat lisent tous les deux ces champs : un trou laisserait un secteur
    // sans couleur ni étiquette, sans que rien ne casse par ailleurs.
    it('renseigne titre, emoji, description et couleur pour chaque entrée', () => {
        for (const cle of LISTE_BENEDICTIONS) {
            const def = BENEDICTIONS_REGISTRY[cle];
            expect(def.titre).toBeTruthy();
            expect(def.emoji).toBeTruthy();
            expect(def.description).toBeTruthy();
            expect(def.couleur).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });
});

describe('appliquerBenedictionSurJoueur', () => {
    it("ne touche pas au héros sans bénédiction (avant le don du Chat)", () => {
        const heros = creerHeros();
        expect(appliquerBenedictionSurJoueur(heros, null)).toEqual(heros);
    });

    // Les quatre bénédictions de combat posent des champs miroirs du moteur Rust : une faute de
    // frappe ici ne casserait rien à la compilation, le bonus serait simplement ignoré en jeu.
    it('pose les champs attendus pour chaque bénédiction de combat', () => {
        expect(appliquerBenedictionSurJoueur(creerHeros(), 'esquive').bonusEsquiveFlat).toBe(5);
        expect(appliquerBenedictionSurJoueur(creerHeros(), 'critique').chanceCritique).toBe(10);
        expect(appliquerBenedictionSurJoueur(creerHeros(), 'armure').regenArmureTour).toBe(10);
        expect(appliquerBenedictionSurJoueur(creerHeros(), 'hypnose').reductionEsquiveOpposant).toBe(25);
    });

    // Vie de Chat et Leçon du Maître sont gérées hors entité (résurrection en combat, gain d'XP).
    it("laisse les stats intactes pour les bénédictions hors combat", () => {
        const heros = creerHeros();
        expect(appliquerBenedictionSurJoueur(heros, 'vieDeChat')).toEqual(heros);
        expect(appliquerBenedictionSurJoueur(heros, 'apprentissage')).toEqual(heros);
    });

    it("ne modifie jamais le héros d'origine", () => {
        const heros = creerHeros();
        appliquerBenedictionSurJoueur(heros, 'critique');
        expect(heros.chanceCritique).toBeUndefined();
    });
});

describe('appliquerBonusXp', () => {
    it("double l'XP avec la Leçon du Maître", () => {
        expect(appliquerBonusXp(8, 'apprentissage')).toBe(16);
    });

    it('laisse le gain intact avec toute autre bénédiction, ou aucune', () => {
        expect(appliquerBonusXp(8, null)).toBe(8);
        for (const cle of LISTE_BENEDICTIONS.filter(c => c !== 'apprentissage')) {
            expect(appliquerBonusXp(8, cle)).toBe(8);
        }
    });
});

describe('tirerBenediction', () => {
    // Tirage aléatoire : on vérifie la propriété garantie (un résultat toujours valide), pas une
    // sortie précise.
    it('renvoie toujours une bénédiction du registre', () => {
        const tirages = new Set<BenedictionChat>();
        for (let i = 0; i < 200; i++) {
            const tirage = tirerBenediction();
            expect(LISTE_BENEDICTIONS).toContain(tirage);
            tirages.add(tirage);
        }
        // 200 tirages sur 6 secteurs : n'en voir qu'une partie signalerait un index mal borné.
        expect(tirages.size).toBe(LISTE_BENEDICTIONS.length);
    });
});
