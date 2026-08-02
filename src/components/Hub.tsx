import type { Ecran } from '../types';

interface HubProps {
    onLancerRun: () => void;
    onChangeEcran: (ecran: Ecran) => void;
    xpTotal: number;
    aNouveauteTuto: boolean;
    marquerTutoLu: () => void;
    aNouveauPacte: boolean;
    marquerPactesVus: () => void;
    aPointsCompetenceDispo: boolean;
}

export function Hub({
    onLancerRun, onChangeEcran, xpTotal, aNouveauteTuto, marquerTutoLu,
    aNouveauPacte, marquerPactesVus, aPointsCompetenceDispo
}: HubProps) {

    const ouvrirTuto = () => {
        marquerTutoLu();
        onChangeEcran('ecran-tuto');
    };

    const ouvrirInventaire = () => {
        marquerPactesVus();
        onChangeEcran('ecran-inventaire');
    };

    return (
        <div id="ecran-hub" className="ecran">
            <h1 className="titre-geant">Tour des Pactes</h1>
            <div className="menu-vertical">
                <button className="btn-menu btn-jouer" onClick={onLancerRun}>▶️ Commencer l'Ascension</button>

                <button className="btn-menu" onClick={ouvrirInventaire}>
                    🎒 Inventaire des Pactes
                    {aNouveauPacte && (
                        <span title="Nouveau Pacte débloqué" className="badge-nouveaute" />
                    )}
                </button>

                <button className="btn-menu" onClick={ouvrirTuto}>
                    📖 Les Archives (Tuto)
                    {aNouveauteTuto && (
                        <span title="Nouvelle connaissance acquise" className="badge-nouveaute" />
                    )}
                </button>

                {xpTotal > 0 && (
                    <button className="btn-menu" onClick={() => onChangeEcran('ecran-arbre')}>
                        ✨ Arbre de Compétences
                        {aPointsCompetenceDispo && (
                            <span title="Point de compétence disponible" className="badge-nouveaute" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
