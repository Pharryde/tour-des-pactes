// src/components/Inventaire.tsx
import type { Ecran } from '../types';
import { genererBadgesPactes } from '../utils/pactes';

interface InventaireProps {
    pactesDebloques: string[];
    pactesEquipes: string[];
    onBasculerPacte: (nomPacte: string) => void;
    onChangeEcran: (ecran: Ecran) => void;
}

export function Inventaire({ pactesDebloques, pactesEquipes, onBasculerPacte, onChangeEcran }: InventaireProps) {
    
    // NOUVEAU : On sépare physiquement les pactes dans deux listes distinctes, triées par ordre alphabétique
    const pactesLvl1 = pactesDebloques.filter(p => !p.endsWith(" II")).sort((a, b) => a.localeCompare(b));
    const pactesLvl2 = pactesDebloques.filter(p => p.endsWith(" II")).sort((a, b) => a.localeCompare(b));

    // Fonction pour dessiner la carte d'un pacte (évite de dupliquer le code)
    const renderPacte = (pacte: string) => {
        const estEquipe = pactesEquipes.includes(pacte);
        const infoPacte = genererBadgesPactes([pacte])[0];
        const description = infoPacte ? infoPacte.desc : "Effet inconnu";

        return (
            <div 
                key={pacte} 
                onClick={() => onBasculerPacte(pacte)}
                style={{
                    backgroundColor: estEquipe ? '#313244' : '#1e1e2e',
                    border: `2px solid ${estEquipe ? '#a6e3a1' : '#45475a'}`,
                    borderRadius: '8px',
                    padding: '20px',
                    width: '260px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    boxShadow: estEquipe ? '0 0 15px rgba(166, 227, 161, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2em', color: estEquipe ? '#a6e3a1' : '#cdd6f4' }}>
                    {pacte}
                </h3>
                
                <p style={{ margin: 0, fontSize: '0.95em', color: '#bac2de', minHeight: '45px', lineHeight: '1.4' }}>
                    {description}
                </p>
                
                {estEquipe && (
                    <div style={{ 
                        position: 'absolute', top: '-12px', right: '-12px', 
                        background: '#a6e3a1', color: '#11111b', 
                        padding: '4px 12px', borderRadius: '12px', 
                        fontSize: '0.85em', fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        Équipé
                    </div>
                )}
            </div>
        );
    };

    return (
        <div id="ecran-inventaire" className="ecran" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="titre-geant" style={{ marginBottom: '10px' }}>📜 Vos Pactes</h1>
            <p className="texte-description" style={{ marginBottom: '40px' }}>
                Équipez jusqu'à 3 Pactes de Niveau I et 1 Pacte de Niveau II. <br/>
                <span style={{ fontSize: '0.85em', color: '#f38ba8', fontStyle: 'italic' }}>
                    💡 Astuce : Vous devez équiper un Pacte de Niveau I pour affronter sa forme Héroïque (Niveau II) à la fin de son étage.
                </span>
            </p>

            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '40px', marginBottom: '40px' }}>
                {pactesDebloques.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#a6adc8', fontSize: '1.2em', textAlign: 'center' }}>Vous n'avez arraché aucun Pacte pour le moment.</p>
                ) : (
                    <>
                        {/* BLOC : PACTES DE NIVEAU I */}
                        {pactesLvl1.length > 0 && (
                            <div>
                                <h2 style={{ color: '#cba6f7', borderBottom: '2px solid #313244', paddingBottom: '10px', marginBottom: '20px', textAlign: 'left', fontSize: '1.4em' }}>
                                    Pactes de Niveau I <span style={{ fontSize: '0.6em', color: '#a6adc8', fontWeight: 'normal', marginLeft: '10px' }}>(3 max équipés)</span>
                                </h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                    {pactesLvl1.map(renderPacte)}
                                </div>
                            </div>
                        )}

                        {/* BLOC : PACTES DE NIVEAU II */}
                        {pactesLvl2.length > 0 && (
                            <div>
                                <h2 style={{ color: '#f38ba8', borderBottom: '2px solid #313244', paddingBottom: '10px', marginBottom: '20px', textAlign: 'left', fontSize: '1.4em' }}>
                                    Pactes de Niveau II <span style={{ fontSize: '0.6em', color: '#a6adc8', fontWeight: 'normal', marginLeft: '10px' }}>(1 max équipé)</span>
                                </h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                    {pactesLvl2.map(renderPacte)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <button className="btn-menu btn-jouer" onClick={() => onChangeEcran('ecran-hub')}>
                Retour au Hub
            </button>
        </div>
    );
}