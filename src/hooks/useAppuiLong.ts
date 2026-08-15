// src/hooks/useAppuiLong.ts
// Ouverture d'une infobulle au doigt. Le `:hover` n'existe pas sur tactile : sans ce geste, toute
// bulle réservée au survol est purement et simplement inaccessible sur téléphone.
import { useEffect, useRef, useState } from 'react';

// Assez long pour ne pas se déclencher quand on effleure l'écran en jouant, assez court pour ne pas
// donner l'impression que rien ne répond.
const DELAI_APPUI_LONG = 450;
// Au-delà de ce déplacement, l'appui devient un défilement : la bulle ne doit pas s'ouvrir.
// Un seuil, et non une annulation au moindre pixel — un doigt posé n'est jamais parfaitement
// immobile, et annuler au premier frémissement rendrait l'appui long impossible à réussir.
const TOLERANCE_DEPLACEMENT = 10;

export function useAppuiLong() {
    const [ouverte, setOuverte] = useState(false);
    const minuterie = useRef<number | null>(null);
    const origineAppui = useRef<{ x: number; y: number } | null>(null);

    const annulerAttente = () => {
        if (minuterie.current !== null) {
            window.clearTimeout(minuterie.current);
            minuterie.current = null;
        }
        origineAppui.current = null;
    };

    useEffect(() => annulerAttente, []);

    // Une fois ouverte au doigt, la bulle reste affichée jusqu'au prochain appui ou défilement :
    // sur tactile il n'existe aucune « sortie de survol » pour la refermer d'elle-même.
    useEffect(() => {
        if (!ouverte) return;
        const fermer = () => setOuverte(false);
        window.addEventListener('pointerdown', fermer);
        window.addEventListener('scroll', fermer, true);
        return () => {
            window.removeEventListener('pointerdown', fermer);
            window.removeEventListener('scroll', fermer, true);
        };
    }, [ouverte]);

    const gestes = {
        // La souris a déjà le survol : l'appui long ne concerne que le doigt et le stylet.
        onPointerDown: (e: React.PointerEvent) => {
            if (e.pointerType === 'mouse') return;
            annulerAttente();
            origineAppui.current = { x: e.clientX, y: e.clientY };
            minuterie.current = window.setTimeout(() => setOuverte(true), DELAI_APPUI_LONG);
        },
        onPointerUp: annulerAttente,
        onPointerCancel: annulerAttente,
        onPointerMove: (e: React.PointerEvent) => {
            const origine = origineAppui.current;
            if (!origine) return;
            if (Math.hypot(e.clientX - origine.x, e.clientY - origine.y) > TOLERANCE_DEPLACEMENT) {
                annulerAttente();
            }
        },
        // Sans ça, un appui prolongé ouvre le menu contextuel du navigateur par-dessus la bulle.
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };

    return { ouverte, gestes };
}
