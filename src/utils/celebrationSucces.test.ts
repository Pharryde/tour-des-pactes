import { describe, expect, it } from 'vitest';
import sourceArene from '../components/CombatArene.tsx?raw';
import sourceEtat from '../hooks/useGameState.ts?raw';

// La célébration des succès ne doit s'ouvrir qu'à la SORTIE d'un combat. Cette garantie ne tient pas
// à un type ni à un calcul : elle tient à l'ORDRE de deux appels, que rien ne signale si on l'inverse.
//
//   - `ajouterStatsTour` (fin de CHAQUE tour) referme la fenêtre, juste avant de pousser des
//     compteurs qui peuvent franchir un palier à n'importe quel moment du combat.
//   - `handleFinDeCombat` (fin du combat) la rouvre.
//
// Sur le tour fatal les deux sont appelés, et c'est le second qui doit l'emporter — donc
// `ajouterStatsTour` doit apparaître AVANT `onFinDeCombat` dans CombatArene.
describe('fenêtre de célébration des succès', () => {
    it('referme la fenêtre à chaque tour de combat', () => {
        const corps = sourceEtat.slice(sourceEtat.indexOf('const ajouterStatsTour'));
        const fin = corps.indexOf('\n    };');
        expect(corps.slice(0, fin)).toContain('setCelebrationArmee(false)');
    });

    it("rouvre la fenêtre à la fin d'un combat", () => {
        const corps = sourceEtat.slice(sourceEtat.indexOf('const handleFinDeCombat'));
        expect(corps.slice(0, corps.indexOf('\n    };'))).toContain('armerCelebrationSucces()');
    });

    // ⚠️ Le cœur de la garantie : inverser ces deux lignes rouvrirait la fenêtre puis la refermerait
    // aussitôt, et plus aucun succès ne serait jamais fêté.
    it('met à jour les statistiques du tour AVANT de clore le combat', () => {
        const stats = sourceArene.indexOf('ajouterStatsTour({');
        const premiereFin = sourceArene.indexOf('onFinDeCombat(');
        expect(stats).toBeGreaterThan(-1);
        expect(premiereFin).toBeGreaterThan(-1);
        expect(stats).toBeLessThan(premiereFin);
    });

    // Sans cette dérivation, la file resterait ouverte entre deux combats : un palier franchi au
    // milieu du combat suivant éclaterait en pleine bataille.
    it('ne remplit la file que lorsque la fenêtre est ouverte', () => {
        expect(sourceEtat).toMatch(/succesAFeter[\s\S]{0,200}celebrationArmee \?/);
    });
});
