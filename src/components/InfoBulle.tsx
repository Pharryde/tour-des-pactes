// src/components/InfoBulle.tsx
// Bulle d'information ouverte au survol (souris) ou à l'appui long (tactile). Remplace l'attribut
// `title=` natif, que les navigateurs mobiles n'affichent pas de façon fiable : une explication
// réservée au survol est invisible pour la moitié des joueurs.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAppuiLong } from '../hooks/useAppuiLong';

// Marge minimale conservée entre la bulle et le bord de l'écran après recadrage.
const MARGE_ECRAN = 8;

interface Props {
    contenu: ReactNode;
    // `haut` par défaut. `bas` pour les éléments collés au sommet de l'écran (entête de combat),
    // où une bulle ouverte vers le haut sortirait de la page.
    sens?: 'haut' | 'bas';
    // `debut` aligne la bulle sur le bord gauche de l'ancre, `fin` sur son bord droit. Ce n'est
    // qu'un point de départ : le recadrage ci-dessous corrige ce qui dépasse malgré tout.
    alignement?: 'debut' | 'fin';
    className?: string;
    // Réservé aux valeurs calculées à l'exécution (couleur d'une Bénédiction tirée au hasard).
    style?: CSSProperties;
    children: ReactNode;
}

export function InfoBulle({ contenu, sens = 'haut', alignement = 'debut', className = '', style, children }: Props) {
    const { ouverte, gestes } = useAppuiLong();
    const bulleRef = useRef<HTMLSpanElement>(null);
    const [decalage, setDecalage] = useState(0);

    // ⚠️ Un alignement fixe ne suffit pas : une ancre au milieu d'une carte étroite (les cases
    // d'action sur téléphone) fait sortir la bulle d'un côté ou de l'autre selon sa position, et le
    // texte est alors purement et simplement coupé. On mesure donc à l'ouverture et on ramène la
    // bulle dans l'écran. Elle reste toujours dans le flux (`visibility`, pas `display: none`),
    // donc mesurable même fermée.
    const recadrerDansEcran = () => {
        const bulle = bulleRef.current;
        if (!bulle) return;

        const rect = bulle.getBoundingClientRect();
        // On raisonne sur la position NON décalée, sinon les corrections s'empilent d'une
        // ouverture à l'autre.
        const gauche = rect.left - decalage;
        const droite = rect.right - decalage;

        let correction = 0;
        if (droite > window.innerWidth - MARGE_ECRAN) correction = window.innerWidth - MARGE_ECRAN - droite;
        // Le recentrage à gauche passe APRÈS : sur un écran plus étroit que la bulle, mieux vaut
        // sacrifier la fin du texte que son début.
        if (gauche + correction < MARGE_ECRAN) correction = MARGE_ECRAN - gauche;

        setDecalage(correction);
    };

    // Le recadrage vaut pour les deux chemins d'ouverture : l'appui long passe par cet effet, le
    // survol par `onPointerEnter` ci-dessous.
    useEffect(() => {
        if (ouverte) recadrerDansEcran();
        // `recadrerDansEcran` se recrée à chaque rendu : la lister ici relancerait l'effet en
        // boucle. Seul le passage à l'état ouvert doit le déclencher.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ouverte]);

    return (
        <span
            className={`info-ancre${ouverte ? ' info-ancre--ouverte' : ''}${className ? ` ${className}` : ''}`}
            style={style}
            onPointerEnter={recadrerDansEcran}
            {...gestes}
        >
            {children}
            <span
                ref={bulleRef}
                className={`info-bulle info-bulle--${sens} info-bulle--${alignement}`}
                style={decalage ? { transform: `translateX(${decalage}px)` } : undefined}
            >
                {contenu}
            </span>
        </span>
    );
}
