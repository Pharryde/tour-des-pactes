import { describe, expect, it } from 'vitest';
import type { Entite } from '../types';
import { appliquerFormeMegaBoss, construireMegaBoss, tirerNouvelleForme } from './megaboss';

function creerEntite(surcharges: Partial<Entite> = {}): Entite {
    return {
        nom: 'X',
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

// Le Gardien Absolu prend l'apparence d'un Gardien de Niveau II à chaque tour. L'emprunt doit être
// complet : ses stats, son pouvoir ET sa panoplie. Garder son propre kit revenait à lui faire
// sortir des actions que la forme empruntée ne possède pas.
describe('appliquerFormeMegaBoss', () => {
    const absolu = () => creerEntite({ nom: '👑 LE GARDIEN ABSOLU', pv: 640, pvMax: 1200, armure: 25, nivEsquive: 2 });

    it("emprunte la panoplie de la forme : pas de Précise sous les traits du Brasier Vorace", () => {
        const brasier = creerEntite({ nom: 'Le Brasier Vorace', actionsPossibles: ['A', 'D', 'E'], multiplicateurBrulure: 1 });
        const resultat = appliquerFormeMegaBoss(absolu(), brasier);

        expect(resultat.actionsPossibles).not.toContain('P');
        expect(resultat.multiplicateurBrulure).toBe(1);
    });

    it("emprunte la panoplie de la forme : pas d'Attaque sous les traits de la Sève Noire", () => {
        const seve = creerEntite({ nom: 'La Sève Noire', actionsPossibles: ['P', 'D', 'E'], multiplicateurPoison: 1 });
        const resultat = appliquerFormeMegaBoss(absolu(), seve);

        // Seule offensive possible : la Précise, elle-même convertie en poison.
        expect(resultat.actionsPossibles).not.toContain('A');
        expect(resultat.actionsPossibles.filter(a => a === 'A' || a === 'P')).toEqual(['P']);
        expect(resultat.multiplicateurPoison).toBe(1);
    });

    // PV, armure et jauge d'esquive assurent la continuité entre les tours : ils ne doivent JAMAIS
    // être repris de la forme, sinon le combat se réinitialiserait à chaque changement d'apparence.
    it('conserve les PV, l\'armure et l\'esquive en cours', () => {
        const resultat = appliquerFormeMegaBoss(absolu(), creerEntite({ pv: 145, pvMax: 145, armure: 0, nivEsquive: 0 }));

        expect(resultat.pv).toBe(640);
        expect(resultat.pvMax).toBe(1200);
        expect(resultat.armure).toBe(25);
        expect(resultat.nivEsquive).toBe(2);
    });

    // Ce sont des états SUBIS par le Gardien Absolu : ils doivent survivre à ses changements
    // d'apparence, sinon il suffirait d'attendre le tour suivant pour être lavé de sa brûlure.
    it('ne remet jamais à zéro la brûlure ni le poison qu\'il subit', () => {
        const empoisonne = { ...absolu(), brulureActive: 40, poisonActif: 22 };
        const resultat = appliquerFormeMegaBoss(empoisonne, creerEntite({ multiplicateurBrulure: 1 }));

        expect(resultat.brulureActive).toBe(40);
        expect(resultat.poisonActif).toBe(22);
    });

    // La forme change à chaque tour : un effet « tous les 3 tours » ne se déclencherait quasiment
    // jamais s'il gardait son intervalle réel.
    it('force les effets périodiques à se déclencher chaque tour', () => {
        const anomalie = creerEntite({ regenPvChaqueXTours: 3, regenPvPourcentage: 10 });
        expect(appliquerFormeMegaBoss(absolu(), anomalie).regenPvChaqueXTours).toBe(1);

        const chronos = creerEntite({ pertePvChaqueXTours: 5, pertePvPourcentage: 10 });
        expect(appliquerFormeMegaBoss(absolu(), chronos).pertePvChaqueXTours).toBe(1);
    });

    it('laisse intacts les intervalles absents', () => {
        const resultat = appliquerFormeMegaBoss(absolu(), creerEntite());
        expect(resultat.regenPvChaqueXTours).toBeUndefined();
        expect(resultat.pertePvChaqueXTours).toBeUndefined();
    });

    // Les Gardiens du Feu et du Poison maîtrisent leur élément : sous leurs traits, le Gardien
    // Absolu doit en hériter, sinon on le noierait sous l'élément dont il vient de prendre la forme.
    it("emprunte la résistance élémentaire et la réduction d'esquive de la forme", () => {
        const brasier = appliquerFormeMegaBoss(absolu(), creerEntite({ partBrulureSubie: 0 }));
        expect(brasier.partBrulureSubie).toBe(0);

        const seve = appliquerFormeMegaBoss(absolu(), creerEntite({ partPoisonSubi: 0.5 }));
        expect(seve.partPoisonSubi).toBe(0.5);

        const vent = appliquerFormeMegaBoss(absolu(), creerEntite({ reductionEsquiveOpposant: 25 }));
        expect(vent.reductionEsquiveOpposant).toBe(25);
    });
});

describe('construireMegaBoss', () => {
    it('fixe ses PV à 100 par étage de la Tour', () => {
        const boss = construireMegaBoss(Array.from({ length: 12 }, () => ({
            idPacte: 'x', nom: 'x', monstres: [], bossNormal: creerEntite(), bossHeroique: creerEntite(), bossHeroiqueLvl2: creerEntite(),
        })));
        expect(boss.pvMax).toBe(1200);
        expect(boss.pv).toBe(1200);
    });
});

describe('tirerNouvelleForme', () => {
    it('ne reprend jamais la forme du tour précédent', () => {
        const formes = [creerEntite({ nom: 'A' }), creerEntite({ nom: 'B' }), creerEntite({ nom: 'C' })];
        for (let essai = 0; essai < 60; essai++) {
            expect(tirerNouvelleForme(formes, 'B').nom).not.toBe('B');
        }
    });

    // Avec une seule forme disponible, l'interdiction devient impossible à respecter : mieux vaut
    // la répéter que de ne rien renvoyer.
    it('se rabat sur la forme unique plutôt que de ne rien rendre', () => {
        const seule = [creerEntite({ nom: 'A' })];
        expect(tirerNouvelleForme(seule, 'A').nom).toBe('A');
    });
});
