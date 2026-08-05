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

// Un seul enregistrement pour tout le combat en cours. L'état était auparavant éclaté sur 7 clés
// distinctes, donc 7 sérialisations + 7 écritures à CHAQUE tick de combat, alors qu'il n'a de sens
// que pris d'un bloc (un état partiellement réécrit serait de toute façon incohérent).
const CLE_COMBAT = 'tdp_combat_actif';

interface CombatPersiste {
    cle: string;
    etat: EtatCombat;
}

// Clés de l'ancien format éclaté. Elles ne sont plus jamais écrites : ce nettoyage unique évite de
// laisser traîner indéfiniment des instantanés d'`Entite` orphelins chez les joueurs existants
// (la purge de version, elle, n'interviendrait qu'au prochain incrément d'APP_VERSION).
const CLES_OBSOLETES = [
    'tdp_active_combat_key',
    'tdp_c_joueur',
    'tdp_c_monstre',
    'tdp_c_tour',
    'tdp_c_actions_m',
    'tdp_c_actions_j',
    'tdp_c_indices_visibles_m',
];

try {
    CLES_OBSOLETES.forEach(cle => window.localStorage.removeItem(cle));
} catch {
    // localStorage indisponible : rien à nettoyer, la reprise de combat sera simplement inactive.
}

// Un combat ne reprend son état sauvegardé (utile après un rechargement de page en plein
// combat) que si la clé enregistrée correspond exactement à ce combat précis.
export function chargerEtatCombat(combatKey: string, defauts: EtatCombat): EtatCombat {
    try {
        const brut = window.localStorage.getItem(CLE_COMBAT);
        if (!brut) return defauts;
        const persiste = JSON.parse(brut) as CombatPersiste;
        return persiste.cle === combatKey ? persiste.etat : defauts;
    } catch {
        return defauts;
    }
}

// Utilisé à la fin d'une run ou d'un combat : le prochain combat ne doit jamais reprendre l'état
// du précédent. Passe par cette fonction plutôt que par le nom de la clé, qui reste interne ici.
export function effacerEtatCombat() {
    try {
        window.localStorage.removeItem(CLE_COMBAT);
    } catch {
        // Rien à faire : au pire un état périmé subsiste, mais `chargerEtatCombat` le rejettera
        // puisque sa clé de combat ne correspondra pas.
    }
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
        const persiste: CombatPersiste = {
            cle: combatKey,
            etat: { joueur, monstre, tourActuel, actionsMonstre, actionsJoueur, indicesVisiblesMonstre },
        };
        try {
            window.localStorage.setItem(CLE_COMBAT, JSON.stringify(persiste));
        } catch (error) {
            console.error("Erreur d'écriture de l'état de combat:", error);
        }
    }, [combatKey, joueur, monstre, tourActuel, actionsMonstre, actionsJoueur, indicesVisiblesMonstre, enPause]);
}
