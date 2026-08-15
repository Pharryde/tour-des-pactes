// src/utils/hardcore.ts
// Mode hardcore : un second profil de progression, débloqué une fois la Tour vaincue et quittée.
//
// La règle qui définit le mode : **la mort efface le profil**. Plus de Pactes, plus d'XP, plus de
// points de compétence — on repart de zéro. La seule parade est la porte de sortie offerte à la
// fin de chaque étage : la franchir met le butin définitivement à l'abri, la refuser le remet en
// jeu jusqu'au prochain Gardien.
//
// Techniquement, le mode ne change AUCUNE règle de combat : il change seulement la CLÉ localStorage
// sous laquelle la progression est rangée. Les deux profils coexistent donc sans se voir, et une
// mort en hardcore ne peut jamais toucher la partie normale.

export const PREFIXE_HARDCORE = 'tdp_hc_';

// Clés dont la valeur appartient à UN profil : elles sont dédoublées, et c'est le mode actif qui
// décide laquelle est lue et écrite. Tout ce qui n'est pas dans cette liste est PARTAGÉ entre les
// deux modes — délibérément, parce que c'est du savoir et non de la puissance : Synergies
// découvertes, bestiaire, connaissances des Archives, tutoriel, progrès du Chat (Bénédiction,
// Forgeron, leçons). Le joueur ne « désapprend » pas ce qu'il a compris en mourant.
export const CLES_PROFIL = [
    'tdp_pactes_debloques',
    'tdp_pactes_equipes',
    'tdp_pactes_vus',
    'tdp_pactes_victorieux',
    'tdp_xp_total',
    'tdp_competences',
    'tdp_etage_record',
] as const;

export type CleProfil = typeof CLES_PROFIL[number];

/**
 * Clé de stockage effective d'une valeur de profil, selon le mode actif.
 *
 * ⚠️ Le résultat ne doit changer qu'au prix d'un rechargement de page : `useLocalStorage` ne lit sa
 * clé qu'une fois (initialiseur de `useState`), donc basculer de mode en cours de session
 * laisserait tous ces états sur les valeurs de l'ancien profil tout en écrivant dans les clés du
 * nouveau (voir `basculerProfil` dans useGameState.ts).
 */
export function cleProfil(cle: CleProfil, modeHardcore: boolean): string {
    return modeHardcore ? cle.replace('tdp_', PREFIXE_HARDCORE) : cle;
}

// Noms des clés du profil hardcore, pour la liste de synchronisation cloud : les DEUX profils
// doivent être sauvegardés, y compris celui qui dort pendant que l'autre est actif.
export const CLES_PROFIL_HARDCORE: string[] = CLES_PROFIL.map(cle => cleProfil(cle, true));
