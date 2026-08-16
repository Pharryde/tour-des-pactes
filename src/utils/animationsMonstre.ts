// src/utils/animationsMonstre.ts
import type { ActionType } from '../types';
import type { DefinitionAnimation } from './animations';
import { ANIMATIONS_SOUFFLE_IMMOBILE } from './animationsSouffleImmobile';

export type NomAnimationMonstre = 'idle' | 'attaque' | 'fuite' | 'coup' | 'mort';

// Feuilles de sprites 80x64/frame (Forest Monsters FREE - Mushroom, variante with VFX). Un seul
// monstre pour l'instant : tous les monstres du jeu empruntent ce même sprite. Le pack ne fournit
// pas de posture de blocage/esquive dédiée.
// attack.png contient en réalité 2 mouvements distincts sur ses 10 frames : un bond/esquive bas
// au sol (F0-F9 en entier, utilisé ici pour l'Esquive) puis un coup de griffe (F5-F9, la fin du
// mouvement, utilisé pour l'Attaque et la Précise) — d'où le partage du même fichier entre ces
// animations.
export const ANIMATIONS_MONSTRE: Record<NomAnimationMonstre, DefinitionAnimation> = {
    idle: { fichier: '/sprites/mushroom/idle.png', frames: 7, largeurFrame: 80, hauteurFrame: 64, bouclage: true },
    attaque: { fichier: '/sprites/mushroom/attack.png', frames: 10, frameDebut: 5, frameFin: 9, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    fuite: { fichier: '/sprites/mushroom/attack.png', frames: 10, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    coup: { fichier: '/sprites/mushroom/hit.png', frames: 5, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    mort: { fichier: '/sprites/mushroom/die.png', frames: 15, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
};

export type TableAnimationsMonstre = Record<NomAnimationMonstre, DefinitionAnimation>;

// Créatures dotées de leur propre feuille de sprites. La clé est un FRAGMENT de nom : un boss
// porte un préfixe de forme devant le sien (« 👑 BOSS: », « 👑FORME EVOLUEE: »...), et les trois
// formes doivent partager la même apparence. Le Gardien Absolu emprunte le nom de la forme qu'il
// revêt (cf. appliquerFormeMegaBoss) : il hérite donc du sprite avec, ce qui est voulu.
const SPRITES_DEDIES: [string, TableAnimationsMonstre][] = [
    ['Le Souffle Immobile', ANIMATIONS_SOUFFLE_IMMOBILE],
];

export function animationsPourMonstre(nom: string): TableAnimationsMonstre {
    return SPRITES_DEDIES.find(([fragment]) => nom.includes(fragment))?.[1] ?? ANIMATIONS_MONSTRE;
}

// Beat 1 : l'action que le monstre a lui-même tirée pour ce tick.
export function animationMonstrePourAction(action: ActionType): NomAnimationMonstre {
    switch (action) {
        case 'A': return 'attaque';
        case 'P': return 'attaque';
        case 'D': return 'idle';
        case 'E': return 'fuite';
    }
}

// Beat 2 : la résolution de l'action du joueur sur le monstre — même règle binaire que côté
// héros (voir animationsJoueur.ts) : PV perdus ce tick -> impact, sinon posture neutre.
export function animationResolutionMonstre(pvMonstreAvant: number, pvMonstreApres: number): NomAnimationMonstre {
    return pvMonstreApres < pvMonstreAvant ? 'coup' : 'idle';
}
