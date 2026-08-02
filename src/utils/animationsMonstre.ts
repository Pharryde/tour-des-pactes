// src/utils/animationsMonstre.ts
import type { ActionType } from '../types';
import type { DefinitionAnimation } from './animations';

export type NomAnimationMonstre = 'idle' | 'attaque' | 'attaqueSpeciale' | 'fuite' | 'coup' | 'mort';

// Feuilles de sprites 80x64/frame (Forest Monsters FREE - Mushroom, variante with VFX). Un seul
// monstre pour l'instant : tous les monstres du jeu empruntent ce même sprite. Le pack ne fournit
// pas de posture de blocage/esquive dédiée : on retombe sur idle/run pour ces cas.
export const ANIMATIONS_MONSTRE: Record<NomAnimationMonstre, DefinitionAnimation> = {
    idle: { fichier: '/sprites/mushroom/idle.png', frames: 7, largeurFrame: 80, hauteurFrame: 64, bouclage: true },
    attaque: { fichier: '/sprites/mushroom/attack.png', frames: 10, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    attaqueSpeciale: { fichier: '/sprites/mushroom/attack-stun.png', frames: 24, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    fuite: { fichier: '/sprites/mushroom/run.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    coup: { fichier: '/sprites/mushroom/hit.png', frames: 5, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    mort: { fichier: '/sprites/mushroom/die.png', frames: 15, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
};

// Beat 1 : l'action que le monstre a lui-même tirée pour ce tick.
export function animationMonstrePourAction(action: ActionType): NomAnimationMonstre {
    switch (action) {
        case 'A': return 'attaque';
        case 'P': return 'attaqueSpeciale';
        case 'D': return 'idle';
        case 'E': return 'fuite';
    }
}

// Beat 2 : la résolution de l'action du joueur sur le monstre — même règle binaire que côté
// héros (voir animationsJoueur.ts) : PV perdus ce tick -> impact, sinon posture neutre.
export function animationResolutionMonstre(pvMonstreAvant: number, pvMonstreApres: number): NomAnimationMonstre {
    return pvMonstreApres < pvMonstreAvant ? 'coup' : 'idle';
}
