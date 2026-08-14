import { describe, expect, it } from 'vitest';
import { LECONS_MORT_REGISTRY, detecterLeconMort, leconAAfficher, type ContexteMort } from './leconsMort';

// Mort banale : tué par une action normale d'un Gardien sans pouvoir remarquable.
function contexte(surcharges: Partial<ContexteMort> = {}): ContexteMort {
    return {
        idPacteEtage: 'Pacte du Combo',
        estCombatDeGardien: true,
        mortEnFinDeTour: false,
        alterationDeclenchee: false,
        assautArmure: false,
        bloqueEsquive: false,
        sestSoigne: false,
        ...surcharges,
    };
}

describe('detecterLeconMort', () => {
    it('reste muet sur une mort sans rien à expliquer', () => {
        expect(detecterLeconMort(contexte())).toBeNull();
    });

    // Ces pouvoirs n'appartiennent qu'aux Gardiens : mourir contre un mob de l'étage n'a rien
    // à voir avec eux, et une leçon y serait à côté de la plaque.
    it('ne dit rien quand la mort survient hors du combat de Gardien', () => {
        expect(detecterLeconMort(contexte({
            idPacteEtage: 'Pacte de la Puissance Brute',
            estCombatDeGardien: false,
        }))).toBeNull();
    });

    describe('Chronos', () => {
        const chronos = (s: Partial<ContexteMort>) => detecterLeconMort(contexte({ idPacteEtage: 'Pacte du Temps', ...s }));

        it("se déclenche quand l'altération temporelle porte le coup fatal", () => {
            expect(chronos({ mortEnFinDeTour: true, alterationDeclenchee: true })).toBe('chronos');
        });

        // Mourir sous les coups normaux de Chronos n'apprend rien sur son pouvoir.
        it('ne se déclenche pas sur une mort en pleine action', () => {
            expect(chronos({ mortEnFinDeTour: false, alterationDeclenchee: true })).toBeNull();
        });

        // Un tour où l'altération ne tombe pas (intervalle non atteint) : c'est autre chose qui a tué.
        it("ne se déclenche pas si l'altération ne s'est pas déclenchée ce tour-là", () => {
            expect(chronos({ mortEnFinDeTour: true, alterationDeclenchee: false })).toBeNull();
        });
    });

    describe("Le Mur de Fer", () => {
        const armure = (s: Partial<ContexteMort>) => detecterLeconMort(contexte({ idPacteEtage: "Pacte de l'Armure", ...s }));

        it("se déclenche quand l'assaut d'armure porte le coup fatal", () => {
            expect(armure({ mortEnFinDeTour: true, assautArmure: true })).toBe('armure');
        });

        // Seule la forme finale renvoie son armure : les deux autres tuent normalement.
        it("ne se déclenche pas contre une forme qui ne renvoie pas son armure", () => {
            expect(armure({ mortEnFinDeTour: true, assautArmure: false })).toBeNull();
        });
    });

    describe('Le Vent Mortel', () => {
        const vent = (s: Partial<ContexteMort>) => detecterLeconMort(contexte({ idPacteEtage: "Pacte de l'Esquive", ...s }));

        // Ici aucune condition sur le coup fatal : c'est l'esquive neutralisée pendant tout le
        // combat qui mérite l'explication, pas la façon dont le joueur est tombé.
        it("se déclenche dès que l'adversaire neutralise l'esquive", () => {
            expect(vent({ bloqueEsquive: true })).toBe('ventMortel');
        });

        it('ne se déclenche pas contre les formes qui laissent esquiver', () => {
            expect(vent({ bloqueEsquive: false })).toBeNull();
        });
    });

    describe("L'Anomalie", () => {
        const vie = (s: Partial<ContexteMort>) => detecterLeconMort(contexte({ idPacteEtage: 'Pacte de la Vie', ...s }));

        it("se déclenche si le Gardien s'est soigné pendant le combat", () => {
            expect(vie({ sestSoigne: true })).toBe('anomalie');
        });

        // La forme normale ne régénère pas : rien à faire remarquer.
        it("ne se déclenche pas si le Gardien ne s'est jamais soigné", () => {
            expect(vie({ sestSoigne: false })).toBeNull();
        });
    });

    // La seule leçon sans condition : le Chat pose sa question idiote quelle que soit la mort.
    it('se déclenche toujours contre la Brute', () => {
        expect(detecterLeconMort(contexte({ idPacteEtage: 'Pacte de la Puissance Brute' }))).toBe('brute');
    });
});

// Certaines leçons se répètent : retomber dans le même piège prouve qu'elle n'a pas porté.
describe('leconAAfficher', () => {
    it('ne montre rien quand la mort n\'a rien appris', () => {
        expect(leconAAfficher(null, [])).toBeNull();
    });

    it('montre une leçon jamais vue', () => {
        expect(leconAAfficher('chronos', [])).toBe('chronos');
        expect(leconAAfficher('armure', [])).toBe('armure');
    });

    it('tait une leçon à usage unique déjà donnée', () => {
        expect(leconAAfficher('chronos', ['chronos'])).toBeNull();
        expect(leconAAfficher('anomalie', ['anomalie'])).toBeNull();
        expect(leconAAfficher('brute', ['brute'])).toBeNull();
    });

    it("répète l'esquive bloquée et l'assaut d'armure à chaque rechute", () => {
        expect(leconAAfficher('ventMortel', ['ventMortel'])).toBe('ventMortel');
        expect(leconAAfficher('armure', ['armure'])).toBe('armure');
    });

    it('ne confond pas deux leçons différentes', () => {
        expect(leconAAfficher('chronos', ['anomalie', 'brute'])).toBe('chronos');
    });
});

describe('LECONS_MORT_REGISTRY', () => {
    // Le caractère rejouable est une décision de game design, pas un détail : ce test la fige.
    it('ne rend rejouables que les deux pièges dans lesquels on retombe', () => {
        const rejouables = Object.entries(LECONS_MORT_REGISTRY)
            .filter(([, def]) => def.rejouable)
            .map(([nom]) => nom)
            .sort();
        expect(rejouables).toEqual(['armure', 'ventMortel']);
    });

    it('donne un titre, une réplique et un libellé de bouton à chaque leçon', () => {
        for (const [nom, def] of Object.entries(LECONS_MORT_REGISTRY)) {
            expect(def.titre, nom).toBeTruthy();
            expect(def.replique, nom).toBeTruthy();
            expect(def.libelleBouton, nom).toBeTruthy();
        }
    });
});
