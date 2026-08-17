import { describe, expect, it } from 'vitest';
// Import brut (`?raw`, fourni par Vite) plutôt que `node:fs` : la config TS de l'app ne charge pas
// les types Node, et cette machine ne supporte pas bien les `npm install` incrémentaux (cf. CLAUDE.md).
import sourceSauvegardeCloud from './sauvegardeCloud.ts?raw';
import sourceUseGameState from '../hooks/useGameState.ts?raw';
import { CLES_PROFIL, cleProfil } from './hardcore';

// Ce test lit du SOURCE, ce qui est inhabituel — mais c'est le seul angle possible : une clé gérée
// par useGameState mais absente de la liste de synchronisation ne casse rien, ne lève rien, et ne
// se voit qu'au moment où un joueur restaure sa sauvegarde sur un autre appareil et constate qu'il
// lui manque quelque chose. C'est exactement ce qui est arrivé aux leçons de mort.
function extraireLitteraux(source: string): string[] {
    return [...source.matchAll(/'(tdp_[a-z0-9_]+)'/g)].map(m => m[1]);
}

// Clés volontairement hors synchronisation, chacune pour une raison documentée à son point d'usage.
const EXCLUSIONS_ASSUMEES = new Set([
    // Détail purement local : c'est elle qui pilote la purge de version (useLocalStorage.ts).
    'tdp_version',
    // Réécrite à chaque tick de combat et purement éphémère (useCombatResume.ts).
    'tdp_combat_actif',
    // Préférences d'affichage appartenant à CombatArene, pas à la progression.
    'tdp_vitesse_reso',
    'tdp_mode_reso',
]);

describe('synchronisation cloud', () => {
    it('pousse toutes les clés de progression gérées par useGameState', () => {
        const bloc = sourceSauvegardeCloud.match(/const CLES_JEU = \[([\s\S]*?)\] as const;/);
        expect(bloc, 'CLES_JEU introuvable — le test doit être mis à jour avec la refonte').not.toBeNull();

        const synchronisees = new Set([
            ...extraireLitteraux(bloc![1]),
            ...CLES_PROFIL.map(cle => cleProfil(cle, true)),
        ]);

        const oubliees = [...new Set(extraireLitteraux(sourceUseGameState))]
            .filter(cle => !synchronisees.has(cle))
            .filter(cle => !EXCLUSIONS_ASSUMEES.has(cle))
            // Les clés du profil hardcore sont dérivées de CLES_PROFIL, jamais écrites en dur.
            .filter(cle => !cle.startsWith('tdp_hc_'))
            .sort();

        expect(oubliees, `Clés jamais poussées vers le cloud : ${oubliees.join(', ')}`).toEqual([]);
    });

    // Une clé listée deux fois passerait inaperçue et fausserait toute lecture du fichier.
    it('ne liste aucune clé en double', () => {
        const bloc = sourceSauvegardeCloud.match(/const CLES_JEU = \[([\s\S]*?)\] as const;/)!;
        const cles = extraireLitteraux(bloc[1]);
        expect(cles).toHaveLength(new Set(cles).size);
    });

    // Les clés de profil sont dédoublées par `cleProfil` : les inscrire en dur sous leur forme
    // hardcore ferait doublon avec CLES_PROFIL_HARDCORE, ajouté séparément.
    //
    // Les seules exceptions légitimes sont les compteurs du classement : ils n'ont PAS de jumeau en
    // mode normal (rien ne les mesure là-bas), donc ils ne peuvent pas venir de CLES_PROFIL et
    // doivent figurer en dur. Toute autre clé `tdp_hc_` ici est une erreur — le signe qu'on a
    // recopié à la main un miroir que `cleProfil` produit déjà.
    it("n'inscrit aucune clé hardcore en dur dans CLES_JEU", () => {
        const bloc = sourceSauvegardeCloud.match(/const CLES_JEU = \[([\s\S]*?)\] as const;/)!;
        const enDur = extraireLitteraux(bloc[1]).filter(cle => cle.startsWith('tdp_hc_'));
        expect(enDur).toEqual(['tdp_hc_runs', 'tdp_hc_runs_totales', 'tdp_hc_monstres']);
    });
});
