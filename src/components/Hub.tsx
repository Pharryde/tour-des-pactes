import { useRef } from 'react';
import type { Ecran } from '../types';
import { ChatHub } from './ChatHub';

interface HubProps {
    onLancerRun: () => void;
    onChangeEcran: (ecran: Ecran) => void;
    // L'Arbre reste absent tant que le Chat n'a pas présenté le Forgeron (fin de la 2e run au plus
    // tôt), même si le joueur a déjà de l'XP à dépenser : c'est le Chat qui ouvre la forge.
    forgeronPresente: boolean;
    aNouveauteTuto: boolean;
    marquerTutoLu: () => void;
    aNouveauPacte: boolean;
    aPointsCompetenceDispo: boolean;
    // Mode hardcore : le bouton n'apparaît qu'à un joueur ayant vaincu la Tour, et la bascule
    // n'est proposée qu'ici, au Hub, où aucune ascension n'est en cours.
    modeHardcore: boolean;
    aVaincuLaTour: boolean;
    onQuitterHardcore: () => void;
    // Pastille du Classement : des succès ont été débloqués depuis la dernière visite de l'onglet 🏅.
    aNouveauSucces: boolean;
}

export function Hub({
    onLancerRun, onChangeEcran, forgeronPresente, aNouveauteTuto, marquerTutoLu,
    aNouveauPacte, aPointsCompetenceDispo, modeHardcore, aVaincuLaTour, onQuitterHardcore,
    aNouveauSucces
}: HubProps) {
    // Cible du bond du Chat Mystérieux (voir ChatHub.tsx), qui mesure ce bouton à l'exécution.
    const refBoutonLancer = useRef<HTMLButtonElement>(null);

    const ouvrirTuto = () => {
        marquerTutoLu();
        onChangeEcran('ecran-tuto');
    };

    // Le marquage "vu" a lieu à la SORTIE de l'Inventaire (voir Inventaire.tsx) : le faire ici
    // viderait la liste des nouveautés avant même qu'elles ne soient affichées.
    const ouvrirInventaire = () => onChangeEcran('ecran-inventaire');

    return (
        <div id="ecran-hub" className={`ecran${modeHardcore ? ' ecran--hardcore' : ''}`}>
            <ChatHub refCible={refBoutonLancer} onLancer={onLancerRun} />

            <h1 className="titre-geant">Tour des Pactes</h1>

            {/* Rappel permanent : les deux profils partagent le même Hub, le joueur doit voir en
                permanence lequel est en jeu avant de lancer quoi que ce soit. */}
            {modeHardcore && (
                <div className="hub-banniere-hardcore">
                    <span className="hub-banniere-hardcore-titre">☠️ MODE HARDCORE</span>
                    <span className="hub-banniere-hardcore-detail">La mort efface tout. Sortez de la Tour pour garder votre butin.</span>
                </div>
            )}

            <div className="menu-vertical">
                <button ref={refBoutonLancer} className="btn-menu btn-jouer" onClick={onLancerRun}>▶️ Commencer l'Ascension</button>

                <button className="btn-menu" onClick={ouvrirInventaire}>
                    🎒 Inventaire des Pactes
                    {aNouveauPacte && (
                        <span title="Nouveau Pacte débloqué" className="badge-nouveaute" />
                    )}
                </button>

                <button className="btn-menu" onClick={ouvrirTuto}>
                    📖 Archives
                    {aNouveauteTuto && (
                        <span title="Nouvelle connaissance acquise" className="badge-nouveaute" />
                    )}
                </button>

                {forgeronPresente && (
                    <button className="btn-menu" onClick={() => onChangeEcran('ecran-arbre')}>
                        ✨ Arbre de Compétences
                        {aPointsCompetenceDispo && (
                            <span title="Point de compétence disponible" className="badge-nouveaute" />
                        )}
                    </button>
                )}

                {aVaincuLaTour && (
                    modeHardcore ? (
                        <button className="btn-menu" onClick={onQuitterHardcore}>🛡️ Revenir en Mode Normal</button>
                    ) : (
                        <button className="btn-menu btn-danger" onClick={() => onChangeEcran('ecran-hardcore-intro')}>☠️ Mode Hardcore</button>
                    )
                )}

                {/* Même seuil que le mode hardcore : le classement ne récompense que lui, l'afficher
                    plus tôt révélerait une fin de jeu que le joueur n'a pas encore atteinte. */}
                {aVaincuLaTour && (
                    <button className="btn-menu" onClick={() => onChangeEcran('ecran-classement')}>
                        🏆 Classement
                        {aNouveauSucces && (
                            <span title="Nouveau succès débloqué" className="badge-nouveaute" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
