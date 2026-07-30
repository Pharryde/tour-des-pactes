interface ChoixBossProps {
    aLvl1Equipe: boolean;
    estDernierEtage: boolean;
    onFuir: () => void;
    onCombattreLvl1: () => void;
    onCombattreLvl2: () => void;
}

export function ChoixBoss({ aLvl1Equipe, estDernierEtage, onFuir, onCombattreLvl1, onCombattreLvl2 }: ChoixBossProps) {
    return (
        <div id="ecran-choix-boss" className="ecran">
            <h1 className="titre-geant texte-danger">⚠️ L'HEURE DU CHOIX ⚠️</h1>
            <p className="texte-description" style={{ fontSize: '1.2em' }}>
                {aLvl1Equipe 
                    ? "Votre Pacte de Rang I entre en résonnance ! Le Gardien peut être réveillé dans sa Forme Héroïque de Niveau 2 pour arracher un fragment supérieur."
                    : "Vous pouvez continuer l'ascension sereinement, ou prendre un risque mortel : affronter sa Forme Héroïque pour lui arracher son Pacte."}
            </p>
            
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