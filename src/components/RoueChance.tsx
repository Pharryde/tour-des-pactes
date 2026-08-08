// src/components/RoueChance.tsx
// Roue de la Chance jouée à chaque entrée dans la Tour, une fois la Bénédiction du Chat obtenue.
// Le tirage est déjà fait à l'arrivée ici (useGameState en a besoin avant de construire le héros) :
// cet écran ne fait que le mettre en scène, puis rendre la main pour lancer la run.
import { useEffect, useState } from 'react';
import type { BenedictionChat } from '../types';
import { BENEDICTIONS_REGISTRY, LISTE_BENEDICTIONS } from '../utils/benedictions';

interface Props {
    benediction: BenedictionChat;
    onEntrer: () => void;
}

const DUREE_ROTATION_MS = 4000;
const TOURS_COMPLETS = 5;
const ANGLE_SECTEUR = 360 / LISTE_BENEDICTIONS.length;

// Rotation à appliquer pour amener le CENTRE du secteur tiré sous l'aiguille (en haut, à 0°). Les
// tours complets ne servent qu'au spectacle : c'est le reste qui décide où la roue s'immobilise.
function rotationFinale(benediction: BenedictionChat): number {
    const index = LISTE_BENEDICTIONS.indexOf(benediction);
    return TOURS_COMPLETS * 360 - (index * ANGLE_SECTEUR + ANGLE_SECTEUR / 2);
}

// Un `conic-gradient` part de midi et tourne dans le sens horaire, exactement comme la numérotation
// des secteurs — les deux restent donc alignés sans correction d'angle.
function degradeSecteurs(): string {
    const tranches = LISTE_BENEDICTIONS.map((cle, i) =>
        `${BENEDICTIONS_REGISTRY[cle].couleur} ${i * ANGLE_SECTEUR}deg ${(i + 1) * ANGLE_SECTEUR}deg`
    );
    return `conic-gradient(${tranches.join(', ')})`;
}

export function RoueChance({ benediction, onEntrer }: Props) {
    const [rotationTerminee, setRotationTerminee] = useState(false);
    const def = BENEDICTIONS_REGISTRY[benediction];

    useEffect(() => {
        const id = setTimeout(() => setRotationTerminee(true), DUREE_ROTATION_MS);
        return () => clearTimeout(id);
    }, []);

    return (
        <div id="ecran-roue" className="ecran roue-ecran">
            <h1 className="roue-titre">🎡 La Roue de la Chance</h1>
            <p className="texte-description">
                Le Chat Mystérieux fait tourner sa roue. Son verdict vaudra pour toute cette ascension.
            </p>

            <div className="roue-cadre">
                <div className="roue-aiguille" aria-hidden="true" />
                <div
                    className="roue-plateau"
                    style={{
                        background: degradeSecteurs(),
                        animationDuration: `${DUREE_ROTATION_MS}ms`,
                        '--roue-rotation': `${rotationFinale(benediction)}deg`,
                    } as React.CSSProperties}
                >
                    {LISTE_BENEDICTIONS.map((cle, i) => (
                        <span
                            key={cle}
                            className="roue-secteur-emoji"
                            style={{
                                transform: `translate(-50%, -50%) rotate(${i * ANGLE_SECTEUR + ANGLE_SECTEUR / 2}deg) translateY(calc(-1 * var(--roue-rayon-emoji)))`,
                            }}
                        >
                            {BENEDICTIONS_REGISTRY[cle].emoji}
                        </span>
                    ))}
                </div>
                <div className="roue-moyeu" aria-hidden="true">🐈</div>
            </div>

            {rotationTerminee ? (
                <>
                    <div className="roue-resultat" style={{ borderColor: def.couleur }}>
                        <h2 className="roue-resultat-titre" style={{ color: def.couleur }}>
                            {def.emoji} {def.titre}
                        </h2>
                        <p className="roue-resultat-desc">{def.description}</p>
                    </div>
                    <button className="btn-menu btn-jouer" onClick={onEntrer}>
                        ▶️ Entrer dans la Tour
                    </button>
                </>
            ) : (
                <p className="roue-attente">La roue tourne...</p>
            )}
        </div>
    );
}
