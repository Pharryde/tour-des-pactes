// src/hooks/useSauvegardeCloud.ts
// Miroir asynchrone de l'état local vers Supabase : session anonyme, restauration au premier
// lancement sur un appareil, puis autosauvegarde débouncée. Extrait de useGameState.ts pour que
// la logique de synchro (réseau, cadence, ordre des opérations) reste lisible isolément — elle
// n'a besoin de connaître aucune règle du jeu, seulement QUAND l'état a changé.
import { useEffect, useRef, useState } from 'react';
import {
    assurerSessionAnonyme,
    ecrireSnapshotLocal,
    lireSnapshotLocal,
    pousserSauvegarde,
    tirerSauvegarde,
} from '../utils/sauvegardeCloud';

// On attend une accalmie de DELAI_DEBOUNCE_MS, mais jamais plus de DELAI_PLAFOND_MS sans écrire.
const DELAI_DEBOUNCE_MS = 3000;
const DELAI_PLAFOND_MS = 30000;

/**
 * @param etatLocalViergeAuLancement État local jugé "vierge" au premier rendu : seule condition
 *   autorisant une restauration depuis le cloud, pour ne jamais écraser une partie déjà en cours.
 * @param valeursSurveillees Valeurs dont un changement doit déclencher une sauvegarde. Le contenu
 *   n'est jamais lu : l'instantané est relu depuis localStorage au moment d'écrire.
 */
export function useSauvegardeCloud(
    etatLocalViergeAuLancement: boolean,
    valeursSurveillees: readonly unknown[],
) {
    const [cloudUserId, setCloudUserId] = useState<string | null>(null);
    const dernierePousseeRef = useRef(0);

    useEffect(() => {
        let annule = false;
        const initialiser = async () => {
            const userId = await assurerSessionAnonyme();
            if (!userId || annule) return;

            if (etatLocalViergeAuLancement) {
                const sauvegarde = await tirerSauvegarde(userId);
                if (annule) return;
                if (sauvegarde) {
                    // Recharger la page réinitialise proprement tous les `useState` depuis le
                    // localStorage fraîchement réécrit — bien plus sûr que d'appeler à la main les
                    // ~35 setters du hook de jeu. Ne peut se produire qu'une fois par appareil.
                    ecrireSnapshotLocal(sauvegarde);
                    window.location.reload();
                    return;
                }
            }

            // `cloudUserId` n'est renseigné qu'ICI, une fois la restauration tranchée : c'est lui
            // qui arme l'autosauvegarde ci-dessous. S'il était posé avant l'appel réseau, un réseau
            // lent (> DELAI_DEBOUNCE_MS) laisserait l'autosauvegarde pousser l'état local ENCORE
            // VIDE et écraser la sauvegarde cloud avant même de l'avoir lue — exactement la perte
            // de progression que cette fonctionnalité est censée empêcher.
            if (!annule) setCloudUserId(userId);
        };
        initialiser();
        return () => { annule = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Le plafond est indispensable : les valeurs surveillées changent à chaque tour de combat, donc
    // un joueur qui enchaîne les actions plus vite que le debounce réarmerait le minuteur sans fin
    // et ne sauvegarderait JAMAIS.
    useEffect(() => {
        if (!cloudUserId) return;
        const depuisDernierePoussee = Date.now() - dernierePousseeRef.current;
        const delai = depuisDernierePoussee >= DELAI_PLAFOND_MS ? 0 : DELAI_DEBOUNCE_MS;
        const minuteur = setTimeout(() => {
            dernierePousseeRef.current = Date.now();
            pousserSauvegarde(cloudUserId, lireSnapshotLocal());
        }, delai);
        return () => clearTimeout(minuteur);
        // `valeursSurveillees` est étalé volontairement : sa longueur est fixe (toujours construite
        // par le même appelant), ce que la règle ne sait pas vérifier statiquement.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cloudUserId, ...valeursSurveillees]);

    // Meilleur effort pour ne pas perdre la progression des dernières secondes si le joueur quitte
    // avant la fin du debounce (pas de garantie stricte : le navigateur peut annuler la requête en
    // pleine fermeture, mais couvre déjà le cas courant du changement d'onglet).
    useEffect(() => {
        if (!cloudUserId) return;
        const gererVisibilite = () => {
            if (document.visibilityState === 'hidden') {
                dernierePousseeRef.current = Date.now();
                pousserSauvegarde(cloudUserId, lireSnapshotLocal());
            }
        };
        document.addEventListener('visibilitychange', gererVisibilite);
        return () => document.removeEventListener('visibilitychange', gererVisibilite);
    }, [cloudUserId]);
}
