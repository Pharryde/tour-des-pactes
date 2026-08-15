// src/components/InfoBulle.tsx
// Bulle d'information ouverte au survol (souris) ou à l'appui long (tactile). Remplace l'attribut
// `title=` natif, que les navigateurs mobiles n'affichent jamais : une explication réservée au
// survol est invisible pour la moitié des joueurs.
import type { CSSProperties, ReactNode } from 'react';
import { useAppuiLong } from '../hooks/useAppuiLong';

interface Props {
    contenu: ReactNode;
    // Réservé aux valeurs calculées à l'exécution (couleur d'une Bénédiction tirée au hasard).
    style?: CSSProperties;
    // `haut` par défaut. `bas` pour les éléments collés au sommet de l'écran (entête de combat),
    // où une bulle ouverte vers le haut sortirait de la page.
    sens?: 'haut' | 'bas';
    // `debut` aligne la bulle sur le bord gauche de l'ancre, `fin` sur son bord droit. C'est ce qui
    // évite le débordement horizontal selon le côté de l'écran où vit l'élément.
    alignement?: 'debut' | 'fin';
    className?: string;
    children: ReactNode;
}

export function InfoBulle({ contenu, sens = 'haut', alignement = 'debut', className = '', style, children }: Props) {
    const { ouverte, gestes } = useAppuiLong();

    return (
        <span
            className={`info-ancre${ouverte ? ' info-ancre--ouverte' : ''}${className ? ` ${className}` : ''}`}
            style={style}
            {...gestes}
        >
            {children}
            <span className={`info-bulle info-bulle--${sens} info-bulle--${alignement}`}>{contenu}</span>
        </span>
    );
}
