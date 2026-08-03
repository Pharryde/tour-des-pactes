// src/utils/animationsChat.ts
import type { DefinitionAnimation } from './animations';
import type { NomAnimationMonstre } from './animationsMonstre';

// Feuilles de sprites 80x64/frame (Cat 2D Pixel Art), réservées au Chat Mystérieux du tutoriel
// d'introduction — aucun autre monstre du jeu ne les utilise. Même mapping action -> clé que
// animationsMonstre.ts (animationMonstrePourAction), seuls les fichiers changent.
export const ANIMATIONS_CHAT: Record<NomAnimationMonstre, DefinitionAnimation> = {
    idle: { fichier: '/sprites/chat/idle.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: true },
    attaque: { fichier: '/sprites/chat/attack.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    fuite: { fichier: '/sprites/chat/run.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    coup: { fichier: '/sprites/chat/hit.png', frames: 4, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    mort: { fichier: '/sprites/chat/idle.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: true },
};
