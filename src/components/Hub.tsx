import type { Ecran } from '../types';

interface HubProps {
    onLancerRun: () => void;
    onChangeEcran: (ecran: Ecran) => void;
    xpTotal: number;
    aNouveauteTuto: boolean;
    marquerTutoLu: () => void;
}

export function Hub({ onLancerRun, onChangeEcran, xpTotal, aNouveauteTuto, marquerTutoLu }: HubProps) {
    
    const ouvrirTuto = () => {
        marquerTutoLu();
        onChangeEcran('ecran-tuto');
    };

    return (
        <div id="ecran-hub" className="ecran">
            <h1 className="titre-geant">Tour des Pactes</h1>
            <div className="menu-vertical">
                <button className="btn-menu btn-jouer" onClick={onLancerRun}>▶️ Commencer l'Ascension</button>
                <button className="btn-menu" onClick={() => onChangeEcran('ecran-inventaire')}>🎒 Inventaire des Pactes</button>
                
                {/* BOUTON TUTO - Pastille discrète */}
                <button className="btn-menu" onClick={ouvrirTuto} style={{ position: 'relative' }}>
                    📖 Les Archives (Tuto)
                    {aNouveauteTuto && (
                        <span 
                            title="Nouvelle connaissance acquise"
                            style={{ 
                                position: 'absolute', 
                                top: '8px', 
                                right: '12px', 
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#f9e2af', // Jaune doré pastel très doux (Catppuccin Macchiato Yellow)
                                borderRadius: '50%',
                                boxShadow: '0 0 5px rgba(249, 226, 175, 0.6)'
                            }}
                        />
                    )}
                </button>
                
                {xpTotal > 0 && (
                    <button className="btn-menu" onClick={() => onChangeEcran('ecran-arbre')}>
                        ✨ Arbre de Compétences
                    </button>
                )}
            </div>
        </div>
    );
}