// src/components/ImageCinematique.tsx
// Illustration d'un Gardien, choisie parmi une liste de candidates de la plus spécifique à la plus
// générale (voir `imagesCinematique` dans utils/etages.ts).
//
// ⚠️ Le navigateur ne sait pas dire si un fichier existe sans essayer de le charger : la descente
// dans la liste passe donc par `onError`, et non par un test préalable. C'est ce qui rend le
// dispositif ADDITIF — déposer une illustration suffit à l'utiliser, ne pas la déposer n'affiche
// aucune erreur tant qu'un repli reste disponible.
import { useState } from 'react';

interface Props {
    candidates: string[];
    alt: string;
    className?: string;
}

export function ImageCinematique({ candidates, alt, className }: Props) {
    const [index, setIndex] = useState(0);
    // Clé de re-montage : sans elle, changer d'étage ou de forme garderait l'index de repli du
    // Gardien précédent et sauterait d'emblée son illustration la plus spécifique.
    const [pisteCourante, setPisteCourante] = useState(candidates[0]);
    if (candidates[0] !== pisteCourante) {
        setPisteCourante(candidates[0]);
        setIndex(0);
    }

    const source = candidates[index];
    if (source === undefined) {
        return (
            <span className="cinematique-erreur-image">
                (Image introuvable : placez <b>{candidates[candidates.length - 1]?.split('/').pop()}</b> dans le dossier public/images/)
            </span>
        );
    }

    return (
        <img
            key={source}
            src={source}
            alt={alt}
            className={className}
            onError={() => setIndex(i => i + 1)}
        />
    );
}
