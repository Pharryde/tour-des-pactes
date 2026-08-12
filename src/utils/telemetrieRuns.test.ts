import { describe, expect, it } from 'vitest';
import { construireEvenementRun } from './telemetrieRuns';
import { SYNERGIES_REGISTRY } from './synergies';
import { APP_VERSION } from './versionApp';

const COMPETENCES_VIDES = { pv: 0, atk: 0, def: 0, pre: 0, esq: 0 };

function construire(pactesEquipes: string[]) {
    return construireEvenementRun({
        numeroRun: 1,
        issue: 'mort',
        etage: 3,
        pactesEquipes,
        competences: COMPETENCES_VIDES,
        benediction: null,
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

    // C'est `version` qui permet de comparer l'équilibrage d'avant et d'après une mise à jour :
    // une valeur figée rendrait toute la table inexploitable pour ça.
    it("estampille l'événement avec la version courante", () => {
        expect(construire([]).version).toBe(APP_VERSION);
    });
});
