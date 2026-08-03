// src/hooks/useCombatResume.ts
import { useEffect } from 'react';
import type { ActionType, Entite } from '../types';

export interface EtatCombat {
    joueur: Entite;
    monstre: Entite;
    tourActuel: number;
    actionsMonstre: ActionType[];
    actionsJoueur: ActionType[];
    indicesVisiblesMonstre: number[];
}

const CLE_COMBAT_ACTIF = 'tdp_active_combat_key';
const CLES_ETAT: { [K in keyof EtatCombat]: string } = {
    joueur: 'tdp_c_joueur',
    monstre: 'tdp_c_monstre',
    tourActuel: 'tdp_c_tour',
    actionsMonstre: 'tdp_c_actions_m',
    actionsJoueur: 'tdp_c_actions_j',
    indicesVisiblesMonstre: 'tdp_c_indices_visibles_m',
};

function lireCache<T>(cle: string, defaut: T): T {
    try {
        const item = window.localStorage.getItem(cle);
        return item ? JSON.parse(item) : defaut;
    } catch {
        return defaut;
    }
}

// Un combat ne reprend son état sauvegardé (utile après un rechargement de page en plein
// combat) que si la clé active en cache correspond exactement à ce combat précis.
export function chargerEtatCombat(combatKey: string, defauts: EtatCombat): EtatCombat {
    const estReprise = lireCache(CLE_COMBAT_ACTIF, '') === combatKey;
    if (!estReprise) return defauts;

    return {
        joueur: lireCache(CLES_ETAT.joueur, defauts.joueur),
        monstre: lireCache(CLES_ETAT.monstre, defauts.monstre),
        tourActuel: lireCache(CLES_ETAT.tourActuel, defauts.tourActuel),
        actionsMonstre: lireCache(CLES_ETAT.actionsMonstre, defauts.actionsMonstre),
        actionsJoueur: lireCache(CLES_ETAT.actionsJoueur, defauts.actionsJoueur),
        indicesVisiblesMonstre: lireCache(CLES_ETAT.indicesVisiblesMonstre, defauts.indicesVisiblesMonstre),
    };
}

// Persiste un instantané du combat en cours pour permettre une reprise après rechargement.
// On n'écrit pas pendant `enPause` (résolution d'un tour en cours d'animation) : cela évite de
// rejouer deux fois les mêmes actions si l'utilisateur recharge la page en pleine animation.
export function usePersisterCombat(
    combatKey: string,
    joueur: Entite,
    monstre: Entite,
    tourActuel: number,
    actionsMonstre: ActionType[],
    actionsJoueur: ActionType[],
    indicesVisiblesMonstre: number[],
    enPause: boolean
) {
    useEffect(() => {
        if (enPause) return;
        window.localStorage.setItem(CLE_COMBAT_ACTIF, JSON.stringify(combatKey));
        window.localStorage.setItem(CLES_ETAT.joueur, JSON.stringify(joueur));
        window.localStorage.setItem(CLES_ETAT.monstre, JSON.stringify(monstre));
        window.localStorage.setItem(CLES_ETAT.tourActuel, JSON.stringify(tourActuel));
        window.localStorage.setItem(CLES_ETAT.actionsMonstre, JSON.stringify(actionsMonstre));
        window.localStorage.setItem(CLES_ETAT.actionsJoueur, JSON.stringify(actionsJoueur));
        window.localStorage.setItem(CLES_ETAT.indicesVisiblesMonstre, JSON.stringify(indicesVisiblesMonstre));
    }, [combatKey, joueur, monstre, tourActuel, actionsMonstre, actionsJoueur, indicesVisiblesMonstre, enPause]);
}
