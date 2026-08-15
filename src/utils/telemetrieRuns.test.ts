import { describe, expect, it } from 'vitest';
import {
    COMBO_VIDE, COMPTEURS_ACTIONS_VIDES, COMPTEURS_REPOS_VIDES,
    construireEvenementRun, fusionnerCombo, incrementerCompteurs,
} from './telemetrieRuns';
import { SYNERGIES_REGISTRY } from './synergies';
import { APP_VERSION } from './versionApp';
import type { ChoixRepos } from '../types';

const COMPETENCES_VIDES = { pv: 0, atk: 0, def: 0, pre: 0, esq: 0 };

function construire(pactesEquipes: string[], hardcore = false) {
    return construireEvenementRun({
        numeroRun: 1,
        issue: 'mort',
        hardcore,
        etage: 3,
        salle: 2,
        etages: ['armure', 'vie', 'feu'],
        pactesEquipes,
        competences: COMPETENCES_VIDES,
        benediction: null,
        monstresTues: 7,
        pactesArraches: [],
        degatsInfliges: 120,
        degatsBloques: 40,
        degatsEsquives: 15,
        reposProposes: COMPTEURS_REPOS_VIDES,
        reposPris: COMPTEURS_REPOS_VIDES,
        actions: COMPTEURS_ACTIONS_VIDES,
        comboJoueur: COMBO_VIDE,
        comboMonstres: COMBO_VIDE,
    });
}

// Cette charge utile est le SEUL enregistrement d'une run : contrairement à un calcul de combat,
// une erreur ici ne casse rien de visible et ne se rattrape pas — les données faussées sont déjà
// en base quand on s'en aperçoit.
describe('construireEvenementRun', () => {
    // Sans tri, une même composition jouée dans deux ordres d'équipement différents produit deux
    // tableaux distincts, et un `group by pactes` en SQL la compte comme deux compositions.
    it('trie les Pactes pour rendre les compositions agrégeables', () => {
        const ordreA = construire(["Pacte du Temps", "Pacte de la Vie", "Pacte de l'Armure"]);
        const ordreB = construire(["Pacte de l'Armure", "Pacte du Temps", "Pacte de la Vie"]);

        expect(ordreA.pactes).toEqual(ordreB.pactes);
    });

    it("n'altère pas le tableau reçu en le triant", () => {
        const pactesEquipes = ["Pacte du Temps", "Pacte de la Vie"];
        construire(pactesEquipes);

        expect(pactesEquipes).toEqual(["Pacte du Temps", "Pacte de la Vie"]);
    });

    // La synergie est déduite de la composition, jamais lue sur l'entité joueur (déjà remplacée ou
    // vidée à ce stade de la fin de run).
    it('déduit la synergie active de la composition', () => {
        const requisNinja = SYNERGIES_REGISTRY.Ninja.pactesRequis;

        expect(construire([...requisNinja]).synergie).toBe('Ninja');
        expect(construire(requisNinja.slice(0, 3)).synergie).toBeNull();
    });

    // Un Pacte de Niveau II compte pour son Pacte de base dans une synergie : l'événement doit le
    // refléter, sinon les runs les plus abouties sortent des statistiques de synergie.
    it('reconnaît la synergie portée avec un Pacte de Niveau II', () => {
        const [premier, ...reste] = SYNERGIES_REGISTRY.Assassin.pactesRequis;

        expect(construire([`${premier} II`, ...reste]).synergie).toBe('Assassin');
    });

    // Sans ce drapeau, les runs hardcore (profil reparti de zéro, donc Pactes et arbre bien plus
    // faibles à étage égal) se mélangeraient aux normales et fausseraient tous les agrégats.
    it('distingue les runs hardcore des runs normales', () => {
        expect(construire([], false).hardcore).toBe(false);
        expect(construire([], true).hardcore).toBe(true);
    });

    // C'est `version` qui permet de comparer l'équilibrage d'avant et d'après une mise à jour :
    // une valeur figée rendrait toute la table inexploitable pour ça.
    it("estampille l'événement avec la version courante", () => {
        expect(construire([]).version).toBe(APP_VERSION);
    });

    // Contrairement aux Pactes, l'ordre des étages EST l'information : la Tour est mélangée à
    // chaque run, un tri effacerait la séquence réellement rencontrée.
    it("préserve l'ordre des étages tirés", () => {
        expect(construire([]).etages).toEqual(['armure', 'vie', 'feu']);
    });
});

// Sans le dénominateur « proposé », un choix de Zone de Repos peu pris est indiscernable d'un
// choix peu tiré : au-delà de la 1re visite d'une run, seules 3 des 5 options sont offertes.
describe('incrementerCompteurs', () => {
    // Générique explicite : imbriqué, l'inférence retomberait sur les seules clés du dernier
    // appel (`Record<'soin', number>`) au lieu du jeu complet des choix de repos.
    it('compte chaque clé indépendamment', () => {
        const premier = incrementerCompteurs<ChoixRepos>(COMPTEURS_REPOS_VIDES, ['soin', 'atk']);
        const apres = incrementerCompteurs<ChoixRepos>(premier, ['soin']);

        expect(apres.soin).toBe(2);
        expect(apres.atk).toBe(1);
        expect(apres.def).toBe(0);
    });

    it("n'altère pas les compteurs reçus", () => {
        incrementerCompteurs(COMPTEURS_ACTIONS_VIDES, ['A']);

        expect(COMPTEURS_ACTIONS_VIDES.A).toBe(0);
    });

    // Une sauvegarde écrite avant l'ajout d'une clé ne la contient pas : sans repli, l'incrément
    // produirait un NaN qui remonterait jusqu'en base.
    it('repart de zéro sur une clé absente', () => {
        const partiel = { soin: 3 } as unknown as typeof COMPTEURS_REPOS_VIDES;

        expect(incrementerCompteurs(partiel, ['pv']).pv).toBe(1);
    });
});

// Le combo d'une run est la somme de ceux de chaque tour. Stocker somme + nombre (et non la
// moyenne) est ce qui rend l'agrégation SQL exacte entre runs de longueurs différentes.
describe('fusionnerCombo', () => {
    it('additionne sommes et actions mais garde le MAXIMUM des maxima', () => {
        const fusion = fusionnerCombo({ somme: 6, actions: 3, max: 3 }, { somme: 10, actions: 4, max: 4 });

        expect(fusion).toEqual({ somme: 16, actions: 7, max: 4 });
    });

    // Un tour sans action (créneaux tous gelés) ne doit ni gonfler le dénominateur ni écraser le max.
    it('est neutre face à un tour vide', () => {
        const depart = { somme: 9, actions: 5, max: 4 };

        expect(fusionnerCombo(depart, COMBO_VIDE)).toEqual(depart);
    });
});
