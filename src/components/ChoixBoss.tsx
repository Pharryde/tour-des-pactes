import { ImageCinematique } from './ImageCinematique';

interface ChoixBossProps {
    aLvl1Equipe: boolean;
    estDernierEtage: boolean;
    // Illustrations de la forme PROPOSÉE (celle qu'on s'apprête à réveiller), pas de celle qu'on
    // vient de croiser : c'est le risque qu'on pèse à cet écran.
    images: string[];
    onFuir: () => void;
    onCombattreLvl1: () => void;
    onCombattreLvl2: () => void;
}

export function ChoixBoss({ aLvl1Equipe, estDernierEtage, images, onFuir, onCombattreLvl1, onCombattreLvl2 }: ChoixBossProps) {
    return (
        <div id="ecran-choix-boss" className="ecran">
            <h1 className="titre-geant texte-danger">⚠️ L'HEURE DU CHOIX ⚠️</h1>
            <p className="texte-description texte-description--grand">
                {aLvl1Equipe
                    ? "Votre Pacte de Rang I entre en résonnance ! Le Gardien peut être réveillé dans sa Forme Héroïque de Niveau 2 pour arracher un fragment supérieur."
                    : "Vous pouvez continuer l'ascension sereinement, ou prendre un risque mortel : affronter sa Forme Héroïque pour lui arracher son Pacte."}
            </p>

            <div className="choix-boss-image-frame">
                <ImageCinematique
                    candidates={images}
                    alt={aLvl1Equipe ? 'Forme Finale du Gardien' : 'Forme Évoluée du Gardien'}
                    className="choix-boss-image"
                />
            </div>

            <div className="menu-vertical">
                {!aLvl1Equipe && (
                    <button className="btn-menu btn-danger" onClick={onCombattreLvl1}>
                        ⚔️ Affronter la Forme Héroïque (Rang I)
                    </button>
                )}
                {aLvl1Equipe && (
                    <button className="btn-menu btn-danger" onClick={onCombattreLvl2}>
                        🔥 Affronter la Forme Subméditée (Rang II)
                    </button>
                )}
                <button className="btn-menu btn-jouer" onClick={onFuir}>
                    {estDernierEtage ? "🏆 Revendiquer la victoire totale" : "▶️ Continuer l'ascension"}
                </button>
            </div>
        </div>
    );
}
