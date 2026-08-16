// src/components/ScenetteChat.tsx
// Mise en scène partagée par toutes les apparitions du Chat Mystérieux entre deux runs (offre de la
// Bénédiction, présentation du forgeron, rappel des combos...). Elles montrent le même personnage :
// un seul gabarit garantit qu'elles gardent la même allure au lieu de diverger une par une.
import type { ReactNode } from 'react';
import type { DefinitionAnimation } from '../utils/animations';
import { ANIMATIONS_CHAT } from '../utils/animationsChat';
import { SpriteAnime } from './SpriteAnime';

interface Props {
    identifiant: string;
    titre: string;
    // Sprite d'accompagnement affiché à côté du Chat (ex: le forgeron qu'il présente).
    spriteInvite?: DefinitionAnimation;
    libelleBouton: string;
    onContinuer: () => void;
    // Action de repli, rendue APRÈS le bouton principal et visuellement en retrait. Dans les
    // children, elle passerait avant lui et se lirait comme le choix par défaut.
    actionSecondaire?: ReactNode;
    children: ReactNode;
}

export function ScenetteChat({ identifiant, titre, spriteInvite, libelleBouton, onContinuer, actionSecondaire, children }: Props) {
    return (
        <div id={identifiant} className="ecran scenette-ecran">
            <div className="scenette-entete">
                {/* L'invité est placé AVANT le Chat : les deux feuilles de sprites regardent vers
                    la gauche, donc dans cet ordre le Chat regarde bien celui qu'il présente. */}
                <div className="scenette-sprites">
                    {spriteInvite && (
                        <div className="scenette-sprite scenette-sprite--invite">
                            <SpriteAnime definition={spriteInvite} />
                        </div>
                    )}
                    <div className="scenette-sprite">
                        <SpriteAnime definition={ANIMATIONS_CHAT.idle} />
                    </div>
                </div>
                <h1 className="titre-geant c-orange">{titre}</h1>
            </div>

            {children}

            <button className="btn-menu btn-jouer" onClick={onContinuer}>{libelleBouton}</button>
            {actionSecondaire}
        </div>
    );
}
