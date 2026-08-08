// src/utils/tutoCombat.ts
// Contenu du tutoriel d'introduction : un PNJ intuable (Chat Mystérieux) guide le joueur à travers
// les mécaniques de base sur 5 tours scriptés (un par action, plus un pour le Combo), puis révèle
// son identité (voir TutoConclusion.tsx). Un seul bouton d'action reste actif par tour
// (ACTIONS_AUTORISEES_TUTO) pour forcer le joueur à réellement pratiquer la leçon en cours,
// plutôt que de simplement regarder le Chat la démontrer.
import type { ActionType, Entite } from '../types';

// Stats figées demandées : encaisse tout (12000 PV, 100 en Défense de base) et esquive toujours
// (100% dès le 1er palier) — un PNJ conçu pour ne jamais représenter une menace réelle.
export function construireChatMysterieux(): Entite {
    return {
        nom: "Chat Mystérieux",
        pv: 12000,
        pvMax: 12000,
        armure: 0,
        nivEsquive: 0,
        baseA: 2,
        baseP: 1,
        baseD: 100,
        paliersEsquive: [0, 100, 100, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
    };
}

// Héros vierge (aucune compétence ni pacte, puisque c'est la toute première partie du joueur).
export function construireHerosTuto(): Entite {
    return {
        nom: "Héros",
        pv: 100,
        pvMax: 100,
        armure: 0,
        nivEsquive: 0,
        baseA: 10,
        baseP: 4,
        baseD: 10,
        paliersEsquive: [0, 50, 75, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
    };
}

// Actions du Chat pour chacun des 5 tours scriptés — pensées pour rester inoffensives quel que
// soit ce que joue le joueur (ACTIONS_AUTORISEES_TUTO garantit de toute façon un seul type
// d'action possible par tour) :
// - Tours 1/2 (Attaque/Précise) : le Chat ne fait que se Défendre, pour que le joueur voie
//   l'Attaque se faire absorber par l'armure adverse puis la Précise l'ignorer totalement.
// - Tour 3 (Défense) : le Chat Attaque à chaque action ; le joueur, forcé de se Défendre, voit sa
//   propre armure encaisser les dégâts qui montent en flèche (2, 7, 12, 17, 22).
// - Tour 4 (Esquive) : même chose, pour que le joueur voie sa jauge d'esquive grimper et finir
//   par annuler complètement les attaques du Chat.
// - Tour 5 (Combo) : le Chat se Défend sans arrêt (aucune menace) pendant que le joueur martèle
//   sa propre Attaque et voit sa valeur grimper dans le journal de combat (Combo x2, x3...).
export const ACTIONS_CHAT_TUTO: ActionType[][] = [
    ['D', 'D', 'D', 'D', 'D'],
    ['D', 'D', 'D', 'D', 'D'],
    ['A', 'A', 'A', 'A', 'A'],
    ['A', 'A', 'A', 'A', 'A'],
    ['D', 'D', 'D', 'D', 'D'],
];

// Seule(s) action(s) que le joueur peut programmer ce tour-ci (les autres boutons sont grisés) —
// c'est le joueur qui pratique chaque mécanique lui-même, pas seulement le Chat qui la démontre.
export const ACTIONS_AUTORISEES_TUTO: ActionType[][] = [
    ['A'],
    ['P'],
    ['D'],
    ['E'],
    ['A'],
];

// Dialogue injecté dans le log AVANT le tour indiqué (clé = numéro de tour, 1-indexé). Il n'y a
// volontairement aucune entrée au-delà du dernier tour scripté : dépasser ACTIONS_CHAT_TUTO est le
// signal de fin, géré directement par CombatArene (la révélation finale et le don du Pacte se font
// sur l'écran de conclusion, voir TutoConclusion.tsx).
export const DIALOGUE_CHAT_TUTO: Record<number, string[]> = {
    1: [
        `<br><b style="color: #f9e2af;">🐈 Un chat mystérieux vous barre la route, un sourire énigmatique aux lèvres...</b>`,
        `<span class="log-tour">"Avant de gravir cette Tour, petit être, laisse-moi t'enseigner les bases, une par une. Tiens, en haut de l'écran : la Vitesse (⚡) accélère la résolution des tours, et le Mode te laisse choisir entre dérouler chaque action automatiquement, ou pas à pas (Manuel) pour ne rien manquer — n'hésite pas à ajuster ça selon ton aise."</span>`,
        `<span class="log-tour">"Commençons par l'Attaque (⚔️) : une frappe brute qui vient cogner en priorité contre l'Armure de ta cible. Je verrouille tes autres actions pour ce tour — utilise l'Attaque, cinq fois, pour bien sentir comment elle fonctionne."</span>`,
    ],
    2: [
        `<span class="log-tour">"Bien joué ! Passons à la Précise (🎯) : contrairement à l'Attaque, elle ignore totalement l'armure adverse et va droit aux PV. Seule la Précise est disponible ce tour-ci."</span>`,
    ],
    3: [
        `<span class="log-tour">"Voyons maintenant la Défense (🛡️) : elle te construit une Armure qui absorbe les dégâts reçus. Cette Armure s'accumule et te protège pendant TOUT le tour — mais retiens bien ceci : elle retombe à zéro à la fin du tour. Rien ne se reporte sur le suivant, il faut la reconstruire à chaque fois. Regarde comme mes attaques peinent à te blesser pendant que tu te protèges. Seule la Défense est disponible ce tour-ci."</span>`,
    ],
    4: [
        `<span class="log-tour">"À ton tour d'apprendre l'Esquive (💨) : chaque fois que tu l'utilises, ta jauge d'esquive monte d'un palier, augmentant tes chances d'annuler complètement une attaque adverse. Il y a trois paliers, et le troisième est le maximum : au-delà, l'enchaîner encore ne te rapporte plus rien. Attention aussi : dès que tu fais autre chose, elle redescend aussitôt — un guerrier avisé sait quand esquiver, et quand frapper. Seule l'Esquive est disponible ce tour-ci."</span>`,
    ],
    5: [
        `<span class="log-tour">"Une dernière leçon avant que je ne te révèle quelque chose d'important. Enchaîner plusieurs fois LA MÊME action dans un même tour amplifie sa puissance à chaque répétition — c'est un Combo. Je te rends l'Attaque : martèle-la cinq fois d'affilée, et observe sa valeur grimper dans le journal de combat."</span>`,
    ],
};
