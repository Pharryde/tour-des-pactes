// src/utils/leconsMort.ts
// Le Chat Mystérieux revient sur la mort du joueur quand celle-ci vient d'un pouvoir de Gardien
// facile à ne pas voir : un tic de fin de tour, une esquive neutralisée, une régénération. Ces
// mécaniques ne se voient pas pendant qu'on programme son tour — le joueur meurt sans savoir de
// quoi, et refait la même erreur. La leçon ne se joue qu'UNE fois par cause, à vie.
import type { LeconMort } from '../types';

interface LeconDef {
    titre: string;
    // Rendu tel quel dans la scénette (voir LeconMortEcran) : du HTML léger y est admis.
    replique: string;
    libelleBouton: string;
    // Rejouée à CHAQUE mort de cette cause, au lieu d'une seule fois dans la vie du joueur.
    // Réservé aux pièges dans lesquels on retombe : se faire à nouveau bloquer l'esquive ou
    // exploser par une armure prouve que la leçon n'a pas porté, et mérite qu'on la répète.
    rejouable?: boolean;
}

// ============================================================================
// SOURCE DE VÉRITÉ UNIQUE POUR LES LEÇONS DE MORT
// ============================================================================
export const LECONS_MORT_REGISTRY: Record<LeconMort, LeconDef> = {
    chronos: {
        titre: '🐈 Une question de temps',
        replique: `"Alors ? Tu l'as vu venir, celui-là ?"<br/><br/>
            "Chronos ne t'a pas tué avec ses griffes. Il t'a tué <b>entre deux actions</b>, à la fin du
            tour, en te prenant une part de tes PV sans même te toucher. Sa forme évoluée calcule ça
            sur tes PV <b>maximum</b>, et sa forme finale le fait toutes les trois rondes au lieu de
            cinq."<br/><br/>
            "Ni l'armure ni l'esquive n'y peuvent quoi que ce soit. La seule parade, c'est de le tuer
            avant qu'il n'ait le temps de compter. Face à lui, un combat qui s'éternise est un combat
            déjà perdu."`,
        libelleBouton: "J'avais remarqué, oui",
    },
    armure: {
        titre: '🐈 Le mur qui rend les coups',
        replique: `"Tu as passé le combat à cogner sur sa carapace, et c'est elle qui t'a eu. Tu as vu
            comment, au moins ?"<br/><br/>
            "Le Mur de Fer, dans sa forme finale, ne garde pas son armure pour se protéger. À la fin du
            tour, tout ce qu'il n'a pas consommé pour encaisser tes coups lui <b>explose à la figure</b>
            — et à la tienne. Plus tu le laisses empiler ses Défenses, plus l'addition monte."<br/><br/>
            "Donc non, le laisser se barricader tranquillement n'était pas une stratégie. La sienne,
            si."`,
        libelleBouton: 'Je vois le problème',
        rejouable: true,
    },
    ventMortel: {
        titre: '🐈 Rien à esquiver',
        replique: `"J'ai bien aimé le moment où tu as enchaîné les Esquives. Très gracieux. Totalement
            inutile, mais gracieux."<br/><br/>
            "Le Vent Mortel, sous sa forme finale, <b>annule purement et simplement ton esquive</b>.
            Peu importe ton palier, peu importe combien de fois tu l'as enchaînée : tes chances tombent
            à zéro. Le journal te le disait à chaque coup, d'ailleurs."<br/><br/>
            "Contre lui, une Esquive est un tour perdu. Il fallait te couvrir autrement — ou frapper
            plus vite."`,
        libelleBouton: 'Message reçu',
        rejouable: true,
    },
    anomalie: {
        titre: '🐈 Le tonneau percé',
        replique: `"Tu as remarqué que sa barre de vie remontait, ou tu tapais sans regarder ?"<br/><br/>
            "L'Anomalie se <b>régénère</b> : un dixième de ses PV maximum, toutes les cinq rondes sous
            sa forme évoluée, toutes les trois sous sa forme finale. Si tu lui infliges moins que ça
            entre deux soins, tu peux frapper jusqu'à la fin des temps — elle ne descendra jamais."
            <br/><br/>
            "Ce combat-là ne se gagne pas à l'usure. Il se gagne en la dépassant."`,
        libelleBouton: 'Ça explique beaucoup',
    },
    brute: {
        titre: '🐈 Une observation fine',
        replique: `"J'ai une question importante."<br/><br/>
            "Tu as remarqué qu'il tapait fort ?"<br/><br/>
            "Non parce que c'est un peu tout ce qu'il fait. Il n'a même pas d'attaque Précise. Il
            avance, il frappe, très fort, et c'est tout le mystère du personnage."<br/><br/>
            "Voilà. C'était ma question. Bonne remontée."`,
        libelleBouton: '...merci',
    },
};
// ============================================================================

// Ce que l'ARÈNE sait du combat au moment où le joueur tombe. Tout est structurel (drapeaux de
// l'adversaire, moment de la mort) : rien n'est déduit du texte du journal, qui n'est qu'un rendu.
export interface CirconstancesMort {
    // Le coup fatal est tombé pendant les effets de FIN de tour, pas sur une des 5 actions.
    mortEnFinDeTour: boolean;
    // L'altération temporelle de Chronos s'est déclenchée sur le tour fatal.
    alterationDeclenchee: boolean;
    // L'assaut d'armure du Gardien ("Pointes d'Acier") a frappé sur le tour fatal.
    assautArmure: boolean;
    // L'adversaire neutralise l'esquive du joueur.
    bloqueEsquive: boolean;
    // L'adversaire s'est soigné au moins une fois pendant CE combat.
    sestSoigne: boolean;
}

// Les circonstances, plus ce que seule la progression de la run peut dire : quel Gardien, et
// s'agissait-il bien de son combat (ces pouvoirs n'appartiennent qu'aux Gardiens).
export interface ContexteMort extends CirconstancesMort {
    // `idPacte` de l'étage, qui identifie le Gardien (voir boss_data.rs).
    idPacteEtage: string;
    estCombatDeGardien: boolean;
}

// Leçon à réellement montrer, une fois filtrées celles déjà données. Séparée de la détection : la
// cause d'une mort ne dépend pas de l'historique du joueur, le droit de la commenter si.
export function leconAAfficher(lecon: LeconMort | null, dejaVues: LeconMort[]): LeconMort | null {
    if (lecon === null) return null;
    if (LECONS_MORT_REGISTRY[lecon].rejouable) return lecon;
    return dejaVues.includes(lecon) ? null : lecon;
}

// Leçon méritée par cette mort, ou `null` si elle n'a rien d'instructif. L'ordre des cas n'a pas
// d'importance : deux Gardiens ne partagent jamais le même `idPacte`.
export function detecterLeconMort(contexte: ContexteMort): LeconMort | null {
    if (!contexte.estCombatDeGardien) return null;

    switch (contexte.idPacteEtage) {
        // Chronos et le Mur de Fer tuent par un tic de fin de tour : c'est CE point qui échappe au
        // joueur, pas le Gardien lui-même. Mourir sous leurs coups normaux n'apprend rien.
        case 'Pacte du Temps':
            return contexte.mortEnFinDeTour && contexte.alterationDeclenchee ? 'chronos' : null;
        case "Pacte de l'Armure":
            return contexte.mortEnFinDeTour && contexte.assautArmure ? 'armure' : null;
        case "Pacte de l'Esquive":
            return contexte.bloqueEsquive ? 'ventMortel' : null;
        case 'Pacte de la Vie':
            return contexte.sestSoigne ? 'anomalie' : null;
        // La Brute n'a aucune subtilité à expliquer : le Chat pose sa question idiote quoi qu'il arrive.
        case 'Pacte de la Puissance Brute':
            return 'brute';
        default:
            return null;
    }
}
