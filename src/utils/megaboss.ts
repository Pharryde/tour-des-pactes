// src/utils/megaboss.ts
import type { Entite, StructureEtage } from '../types';

// Le Gardien Absolu : agglomération de tous les Gardiens de Niveau II vaincus durant la run.
// Ses PV sont globaux et persistent sur tout l'affrontement ; seules ses statistiques offensives
// et défensives changent de forme à chaque tour (voir tirerNouvelleForme / appliquerFormeMegaBoss).
export function construireMegaBoss(etages: StructureEtage[]): Entite {
    const pvMax = etages.length * 100;
    return {
        nom: "👑 LE GARDIEN ABSOLU",
        pv: pvMax,
        pvMax,
        armure: 0,
        nivEsquive: 0,
        baseA: 10,
        baseP: 4,
        baseD: 10,
        paliersEsquive: [0, 50, 75, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
    };
}

// Choisit une forme différente de la précédente parmi tous les Gardiens de Niveau II de la run.
export function tirerNouvelleForme(formes: Entite[], nomFormeActuelle: string): Entite {
    const disponibles = formes.filter(f => f.nom !== nomFormeActuelle);
    const pool = disponibles.length > 0 ? disponibles : formes;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Emprunte à la forme ses stats (attaque, précise, esquive, bouclier) ET son pouvoir spécial : la
// forme finale se bat avec la capacité propre au Gardien dont elle prend l'apparence (renvoi
// d'armure de l'Armure, esquive neutralisée du Vent Mortel, régénération/altération de la Vie et
// du Temps, etc.). Seuls les PV, l'armure et le niveau d'esquive en cours restent ceux du Gardien
// Absolu (continuité entre les tours).
// Les effets "tous les X tours" (régén/perte de PV) sont considérés remplis à CHAQUE tour où la
// forme est active plutôt que de dépendre du numéro de tour global du combat (sans quoi un effet
// à intervalle de 3-5 tours ne se déclencherait presque jamais, la forme changeant chaque tour) :
// on force donc l'intervalle à 1 quand la forme porte cet effet.
export function appliquerFormeMegaBoss(monstreActuel: Entite, forme: Entite): Entite {
    return {
        ...monstreActuel,
        nom: forme.nom,
        baseA: forme.baseA,
        baseP: forme.baseP,
        baseD: forme.baseD,
        // ⚠️ La panoplie fait partie de l'emprunt, au même titre que les stats et le pouvoir : sous
        // les traits du Brasier Vorace, il ne doit pas sortir une Précise que l'original ne possède
        // pas, et sous ceux de la Sève Noire, aucune offensive qui ne soit pas du poison. Sans ça
        // il gardait son propre kit complet et trahissait la forme qu'il venait de prendre.
        actionsPossibles: forme.actionsPossibles,
        paliersEsquive: forme.paliersEsquive,
        actionsVisibles: forme.actionsVisibles,
        bloqueEsquiveOpposant: forme.bloqueEsquiveOpposant,
        // Inatteignable en pratique — le Gardien Absolu ne prend que des formes de Niveau II, qui
        // neutralisent l'esquive au lieu de la réduire. Repris quand même : c'est un pouvoir de
        // forme comme un autre, et l'omettre créerait un trou muet le jour où une forme le porte.
        reductionEsquiveOpposant: forme.reductionEsquiveOpposant,
        degatsArmureRestanteFinTour: forme.degatsArmureRestanteFinTour,
        regenArmureTour: forme.regenArmureTour,
        chanceCombo: forme.chanceCombo,
        chanceSuiteDefense: forme.chanceSuiteDefense,
        comboMultiplicateur: forme.comboMultiplicateur,
        limiteComboMax: forme.limiteComboMax,
        annuleBonusCombo: forme.annuleBonusCombo,
        bonusDegatsAttaquePourcentage: forme.bonusDegatsAttaquePourcentage,
        bonusComboAttaquePalier: forme.bonusComboAttaquePalier,
        regenPvChaqueXTours: forme.regenPvChaqueXTours !== undefined ? 1 : undefined,
        regenPvPourcentage: forme.regenPvPourcentage,
        pertePvChaqueXTours: forme.pertePvChaqueXTours !== undefined ? 1 : undefined,
        pertePvPourcentage: forme.pertePvPourcentage,
        pertePvBaseMax: forme.pertePvBaseMax,
        // Pouvoirs des Gardiens du Froid, de la Foudre, du Feu et du Poison. `brulureActive` et
        // `poisonActif` ne sont surtout PAS repris de la forme : ce sont des états subis par le
        // Gardien Absolu lui-même, qui doivent survivre à ses changements d'apparence.
        actionsResolutionInversee: forme.actionsResolutionInversee,
        actionsGelees: forme.actionsGelees,
        multiplicateurDegatsSiArmure: forme.multiplicateurDegatsSiArmure,
        multiplicateurBrulure: forme.multiplicateurBrulure,
        multiplicateurPoison: forme.multiplicateurPoison,
        partBrulureSubie: forme.partBrulureSubie,
        partPoisonSubi: forme.partPoisonSubi,
        peutTemporiserSiPoisonDepasse: forme.peutTemporiserSiPoisonDepasse,
    };
}
