import { describe, expect, it } from 'vitest';
import type { Entite } from '../types';
import {
    calculerAttaqueAffichee,
    calculerPaliersEsquiveAffiches,
    calculerPreciseAffichee,
    corrigerActionsPourLimiteCombo,
    genererActionsMonstre,
    symbolePour,
    tirerCreneauxFroid,
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

    // Bénédiction "Grâce Féline" : le bonus est plat, donc il s'applique AUSSI au palier 0 (le
    // joueur esquive un peu même sans avoir joué Esquive) — c'est là toute sa différence avec le
    // Pacte de l'Esquive, qui ne relève que les paliers suivants.
    it("décale tous les paliers, palier 0 compris, avec le bonus d'esquive plat", () => {
        const entite = creerHeros({ bonusEsquiveFlat: 5 });
        expect(calculerPaliersEsquiveAffiches(entite)).toEqual([5, 55, 80, 100]);
    });

    // Bénédiction "Regard Hypnotique" : la réduction vient de l'ADVERSAIRE, jamais de l'entité
    // affichée, d'où le second paramètre.
    it("retranche la réduction d'esquive imposée par l'adversaire", () => {
        expect(calculerPaliersEsquiveAffiches(creerHeros(), 25)).toEqual([0, 25, 50, 75]);
    });

    it('borne le résultat entre 0 et 100 après décalage', () => {
        const entite = creerHeros({ paliersEsquive: [0, 50, 75, 100], bonusEsquiveFlat: 5 });
        expect(calculerPaliersEsquiveAffiches(entite, 60)).toEqual([0, 0, 20, 45]);
    });
});

// Un tour entier sans action offensive n'a de sens que pour les créatures dont le pouvoir travaille
// pendant l'attente. Ailleurs c'est un tour offert au joueur, donc un défaut de conception.
describe('genererActionsMonstre — obligation d\'attaquer', () => {
    // Kit sans offensive du tout : le garde-fou ne doit rien inventer.
    it("n'invente pas d'offensive quand la créature n'en possède aucune", () => {
        const actions = genererActionsMonstre(creerHeros({ actionsPossibles: ['D', 'E'] }));
        expect(actions.every(a => a === 'D' || a === 'E')).toBe(true);
    });

    it('force au moins une offensive pour une créature qui ne peut pas temporiser', () => {
        for (let essai = 0; essai < 40; essai++) {
            const actions = genererActionsMonstre(creerHeros({ actionsPossibles: ['A', 'P', 'D', 'E'] }));
            expect(actions.some(a => a === 'A' || a === 'P')).toBe(true);
        }
    });

    // L'étage du Poison ne temporise qu'à partir du 2e tour : au 1er, il doit poser sa dose.
    it('respecte le tour à partir duquel la temporisation est permise', () => {
        const creature = creerHeros({ actionsPossibles: ['P', 'D', 'E'], peutTemporiserDesTour: 2 });
        for (let essai = 0; essai < 40; essai++) {
            expect(genererActionsMonstre(creature, 1).some(a => a === 'P')).toBe(true);
        }
    });
});

// Le Feu et le Poison REMPLACENT l'action : garder ⚔️/🎯 laisserait croire à des dégâts immédiats
// qui n'ont plus lieu. Le porteur du pouvoir décide de l'icône — jamais sa cible.
describe('symbolePour', () => {
    it('garde les symboles par défaut sans pouvoir de conversion', () => {
        const nu = creerHeros();
        expect((['A', 'P', 'D', 'E'] as const).map(a => symbolePour(a, nu))).toEqual(['⚔️', '🎯', '🛡️', '💨']);
    });

    it("bascule l'Attaque en feu et la Précise en poison, chacune indépendamment", () => {
        expect(symbolePour('A', creerHeros({ multiplicateurBrulure: 1 }))).toBe('🔥');
        expect(symbolePour('P', creerHeros({ multiplicateurBrulure: 1 }))).toBe('🎯');
        expect(symbolePour('P', creerHeros({ multiplicateurPoison: 2 }))).toBe('🧪');
        expect(symbolePour('A', creerHeros({ multiplicateurPoison: 2 }))).toBe('⚔️');
    });

    it('ne convertit jamais la Défense ni l\'Esquive', () => {
        const double = creerHeros({ multiplicateurBrulure: 1, multiplicateurPoison: 1 });
        expect(symbolePour('D', double)).toBe('🛡️');
        expect(symbolePour('E', double)).toBe('💨');
    });
});

describe('tirerCreneauxFroid', () => {
    // Le pouvoir porté des deux côtés s'annule : seul l'écart compte. Mais les créneaux neutralisés
    // doivent quand même être désignés, sinon le Pacte a l'air inopérant à l'écran.
    it('annule le dérèglement quand les deux camps le portent à égalité', () => {
        const creneaux = tirerCreneauxFroid(
            creerHeros({ actionsResolutionInversee: 2 }),
            creerHeros({ actionsResolutionInversee: 2 }),
        );
        expect(creneaux.joueurDabord).toHaveLength(0);
        expect(creneaux.monstreDabord).toHaveLength(0);
        expect(creneaux.annules).toHaveLength(2);
    });

    // Écart de 1 sur un total de 3 portés : 1 créneau effectif + 2 neutralisés, tous distincts.
    it('sépare la part effective de la part neutralisée sans jamais réutiliser un créneau', () => {
        const creneaux = tirerCreneauxFroid(
            creerHeros({ actionsResolutionInversee: 3 }),
            creerHeros({ actionsResolutionInversee: 2 }),
        );
        expect(creneaux.joueurDabord).toHaveLength(1);
        expect(creneaux.monstreDabord).toHaveLength(0);
        expect(creneaux.annules).toHaveLength(2);
        const tous = [...creneaux.joueurDabord, ...creneaux.annules];
        expect(new Set(tous).size).toBe(3);
    });

    it("ne neutralise rien quand un seul camp porte le pouvoir", () => {
        const creneaux = tirerCreneauxFroid(creerHeros(), creerHeros({ actionsResolutionInversee: 2 }));
        expect(creneaux.annules).toHaveLength(0);
        expect(creneaux.monstreDabord).toHaveLength(2);
    });

    it('tire le nombre de créneaux demandé, tous distincts et dans les 5 du tour', () => {
        const creneaux = tirerCreneauxFroid(creerHeros(), creerHeros({ actionsResolutionInversee: 2, actionsGelees: 1 }));
        expect(creneaux.monstreDabord).toHaveLength(2);
        expect(new Set(creneaux.monstreDabord).size).toBe(2);
        expect(creneaux.gelesJoueur).toHaveLength(1);
        expect([...creneaux.monstreDabord, ...creneaux.gelesJoueur].every(i => i >= 0 && i < 5)).toBe(true);
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
