// src/utils/animationsJoueur.ts
import type { ActionType } from '../types';
import type { DefinitionAnimation } from './animations';

export type NomAnimation = 'idle' | 'attaque1' | 'attaque2' | 'defense' | 'coup' | 'esquive' | 'mort';

// Feuilles de sprites 96x84/frame, un seul rang horizontal (Knight 2D Pixel Art, variante with_outline).
export const ANIMATIONS: Record<NomAnimation, DefinitionAnimation> = {
    idle: { fichier: '/sprites/knight/idle.png', frames: 7, largeurFrame: 96, hauteurFrame: 84, bouclage: true },
    attaque1: { fichier: '/sprites/knight/attack-1.png', frames: 6, largeurFrame: 96, hauteurFrame: 84, bouclage: false },
    attaque2: { fichier: '/sprites/knight/attack-2.png', frames: 5, largeurFrame: 96, hauteurFrame: 84, bouclage: false },
    defense: { fichier: '/sprites/knight/defend.png', frames: 6, largeurFrame: 96, hauteurFrame: 84, bouclage: false },
    coup: { fichier: '/sprites/knight/hurt.png', frames: 4, largeurFrame: 96, hauteurFrame: 84, bouclage: false },
    esquive: { fichier: '/sprites/knight/jump.png', frames: 5, largeurFrame: 96, hauteurFrame: 84, bouclage: false },
    mort: { fichier: '/sprites/knight/death.png', frames: 12, largeurFrame: 96, hauteurFrame: 84, bouclage: false },
};

// Beat 1 : l'action que le joueur a lui-même programmée pour ce tick.
export function animationPourAction(action: ActionType): NomAnimation {
    switch (action) {
        case 'A': return 'attaque1';
        case 'P': return 'attaque2';
        case 'D': return 'defense';
        case 'E': return 'esquive';
    }
}

// Beat 2 : la résolution de l'action du monstre sur le joueur — s'il a perdu des PV ce tick,
// on montre l'impact ; sinon (bloqué, esquivé, ou le monstre n'attaquait pas), la posture défensive.
export function animationResolution(pvJoueurAvant: number, pvJoueurApres: number): NomAnimation {
    return pvJoueurApres < pvJoueurAvant ? 'coup' : 'defense';
}
