// src/utils/animations.ts
// Type partagé entre les tables d'animation du héros et des monstres (voir animationsJoueur.ts
// et animationsMonstre.ts), et consommé par le composant générique SpriteAnime.
export interface DefinitionAnimation {
    fichier: string;
    frames: number;
    largeurFrame: number;
    hauteurFrame: number;
    bouclage: boolean;
    // Optionnel : ne joue qu'un sous-segment de la feuille (ex: la fin d'une animation qui sert
    // aussi ailleurs pour son début). `frames` doit rester le nombre RÉEL de frames de l'image
    // (nécessaire au calcul de background-size) — frameDebut/frameFin ne font que borner la
    // lecture. Défaut : toute la feuille (0 à frames - 1).
    frameDebut?: number;
    frameFin?: number;
}
