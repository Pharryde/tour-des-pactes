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
    // --- Compteurs des succès (voir utils/succes.ts) ---
    // Dédoublés parce que les succès existent en version normale ET hardcore : un compteur partagé
    // les débloquerait des deux côtés en même temps, ce qui viderait la moitié du tableau de son
    // sens. `tdp_monstres_tues` était partagé jusqu'ici — il devient donc propre à chaque profil.
    'tdp_monstres_tues',
    // Distinct de `tdp_runs_terminees`, qui reste partagé (il cadence les apparitions du Chat) et
    // compterait donc les runs de l'autre mode.
    'tdp_runs_achevees',
    // Gardiens vaincus, par forme et en identifiants DISTINCTS : `tdp_bestiaire` ne compte que des
    // occurrences, il ne peut pas dire « 12 Gardiens différents ».
    'tdp_boss_lvl0',
    'tdp_boss_lvl1',
    'tdp_boss_lvl2',
    // Synergies effectivement ACTIVÉES dans ce mode. La découverte, elle, reste partagée : le
    // joueur ne « désapprend » pas un secret en changeant de profil.
    'tdp_synergies_activees',
    // Cumuls de combat sur toute la vie du profil : les `tdp_*_run` sont remis à zéro à chaque
    // ascension et ne peuvent donc pas porter des paliers à 10 000.
    'tdp_degats_esquives_total',
    'tdp_degats_bloques_total',
    'tdp_degats_attaque_total',
    'tdp_degats_precise_total',
    'tdp_soins_total',
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
