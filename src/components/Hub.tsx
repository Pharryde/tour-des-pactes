import type { Ecran } from '../types';

interface HubProps {
    onLancerRun: () => void;
    onChangeEcran: (ecran: Ecran) => void;
}

export function Hub({ onLancerRun, onChangeEcran }: HubProps) {
    return (
        <div id="ecran-hub" className="ecran">
            <h1 className="titre-geant">Tour des Pactes</h1>
            <div className="menu-vertical">
                <button className="btn-menu btn-jouer" onClick={onLancerRun}>▶️ Commencer l'Ascension</button>
                <button className="btn-menu" onClick={() => onChangeEcran('ecran-inventaire')}>🎒 Inventaire des Pactes</button>
            </div>
        </div>
    );
}