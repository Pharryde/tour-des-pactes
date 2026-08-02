// src/utils/animations.ts
// Type partagé entre les tables d'animation du héros et des monstres (voir animationsJoueur.ts
// et animationsMonstre.ts), et consommé par le composant générique SpriteAnime.
export interface DefinitionAnimation {
    fichier: string;
    frames: number;
    largeurFrame: number;
    hauteurFrame: number;
    bouclage: boolean;
}
