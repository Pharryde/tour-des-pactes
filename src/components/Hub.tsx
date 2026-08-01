import type { Ecran } from '../types';

interface HubProps {
    onLancerRun: () => void;
    onChangeEcran: (ecran: Ecran) => void;
    xpTotal: number;
}

export function Hub({ onLancerRun, onChangeEcran, xpTotal }: HubProps) {
    return (
        <div id="ecran-hub" className="ecran">
            <h1 className="titre-geant">Tour des Pactes</h1>
            <div className="menu-vertical">
                <button className="btn-menu btn-jouer" onClick={onLancerRun}>▶️ Commencer l'Ascension</button>
                <button className="btn-menu" onClick={() => onChangeEcran('ecran-inventaire')}>🎒 Inventaire des Pactes</button>
                <button className="btn-menu" onClick={() => onChangeEcran('ecran-tuto')}>📖 Les Archives (Tuto)</button>
                
                {/* Caché tant qu'aucun monstre n'a été tué (1er point d'XP) */}
                {xpTotal > 0 && (
                    <button className="btn-menu" onClick={() => onChangeEcran('ecran-arbre')}>
                        ✨ Arbre de Compétences
                    </button>
                )}
            </div>
        </div>
    );
}