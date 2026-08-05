// src/utils/versionApp.ts
// Version des structures de données persistées. À incrémenter dès qu'un changement rend les
// anciennes sauvegardes incompatibles (champs d'`Entite`, valeurs d'`Ecran`, clés `tdp_*`...).
//
// Elle pilote DEUX garde-fous qui doivent rester cohérents entre eux :
//  - `useLocalStorage.ts` purge le localStorage quand la version stockée diffère ;
//  - `sauvegardeCloud.ts` refuse de restaurer une sauvegarde cloud d'une autre version.
// Sans le second, la restauration cloud réinjecterait aussitôt les données que la purge locale
// venait d'éliminer, annulant complètement l'effet de l'incrément.
export const APP_VERSION = "1.1";
