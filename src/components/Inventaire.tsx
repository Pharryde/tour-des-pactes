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

    const pactesLvl1 = pactesDebloques.filter(p => !p.endsWith(" II")).sort((a, b) => a.localeCompare(b));
    const pactesLvl2 = pactesDebloques.filter(p => p.endsWith(" II")).sort((a, b) => a.localeCompare(b));

    const renderPacte = (pacte: string) => {
        const estEquipe = pactesEquipes.includes(pacte);
        const infoPacte = genererBadgesPactes([pacte])[0];
        const description = infoPacte ? infoPacte.desc : "Effet inconnu";

        return (
            <div
                key={pacte}
                onClick={() => onBasculerPacte(pacte)}
                className={`pacte-carte${estEquipe ? ' pacte-carte--equipe' : ''}`}
            >
                <h3 className="pacte-carte-titre">{pacte}</h3>
                <p className="pacte-carte-desc">{description}</p>
                {estEquipe && <div className="pacte-carte-badge">Équipé</div>}
            </div>
        );
    };

    return (
        <div id="ecran-inventaire" className="ecran inventaire-ecran">
            <h1 className="titre-geant">📜 Vos Pactes</h1>
            <p className="texte-description inventaire-intro">
                Équipez jusqu'à 3 Pactes de Niveau I et 1 Pacte de Niveau II.
            </p>

            <div className="inventaire-liste">
                {pactesDebloques.length === 0 ? (
                    <p className="inventaire-vide">Vous n'avez arraché aucun Pacte pour le moment.</p>
                ) : (
                    <>
                        {pactesLvl1.length > 0 && (
                            <div>
                                <h2 className="inventaire-section-titre inventaire-section-titre--lvl1">
                                    Pactes de Niveau I <span className="inventaire-section-compteur">(3 max équipés)</span>
                                </h2>
                                <div className="inventaire-grille">
                                    {pactesLvl1.map(renderPacte)}
                                </div>
                            </div>
                        )}
                        {pactesLvl2.length > 0 && (
                            <div>
                                <h2 className="inventaire-section-titre inventaire-section-titre--lvl2">
                                    Pactes de Niveau II <span className="inventaire-section-compteur">(1 max équipé)</span>
                                </h2>
                                <div className="inventaire-grille">
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
