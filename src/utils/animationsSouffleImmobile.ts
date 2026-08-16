// src/utils/animationsSouffleImmobile.ts
import type { DefinitionAnimation } from './animations';
import type { NomAnimationMonstre } from './animationsMonstre';

// Feuilles 80x64/frame du Gardien de l'Étage du Froid — même format que le champignon, donc même
// cadrage : personnage centré en x, posé sur le bas du cadre.
// ⚠️ Ces PNG ne viennent pas d'un pack tiers : ils sont produits par
// `node outils/sprites/souffleImmobile.mjs`, qui dessine chaque frame. Toute retouche passe par ce
// script — repeindre le PNG à la main serait écrasé à la prochaine génération.
// Le Gardien est un colosse au dos voûté, pas un coureur : son « esquive » est un pas d'appui
// lourd avec rémanence (dodge.png), là où le champignon fait un bond de côté.
export const ANIMATIONS_SOUFFLE_IMMOBILE: Record<NomAnimationMonstre, DefinitionAnimation> = {
    idle: { fichier: '/sprites/souffle-immobile/idle.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: true },
    attaque: { fichier: '/sprites/souffle-immobile/attack.png', frames: 6, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    fuite: { fichier: '/sprites/souffle-immobile/dodge.png', frames: 8, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    coup: { fichier: '/sprites/souffle-immobile/hit.png', frames: 4, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
    mort: { fichier: '/sprites/souffle-immobile/die.png', frames: 12, largeurFrame: 80, hauteurFrame: 64, bouclage: false },
};
