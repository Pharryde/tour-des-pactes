// src/components/Inventaire.tsx
import type { Ecran } from '../types';
import { genererBadgesPactes } from '../utils/pactes';
import { pactesManquantsPourSynergie } from '../utils/synergies';

interface InventaireProps {
    pactesDebloques: string[];
    pactesEquipes: string[];
    aPacteChat: boolean;
    onBasculerPacte: (nomPacte: string) => void;
    onChangeEcran: (ecran: Ecran) => void;
}

export function Inventaire({ pactesDebloques, pactesEquipes, aPacteChat, onBasculerPacte, onChangeEcran }: InventaireProps) {

    const pactesLvl1 = pactesDebloques.filter(p => !p.endsWith(" II")).sort((a, b) => a.localeCompare(b));
    const pactesLvl2 = pactesDebloques.filter(p => p.endsWith(" II")).sort((a, b) => a.localeCompare(b));

    // Si le joueur équipe déjà 3 des 4 Pactes d'une synergie cachée, le 4e s'illumine dans son
    // inventaire (à condition de le posséder déjà) pour l'aider à repérer la combinaison.
    const pactesManquants = pactesManquantsPourSynergie(pactesEquipes);

    const renderPacte = (pacte: string) => {
        const estEquipe = pactesEquipes.includes(pacte);
        const estSuggere = !estEquipe && pactesManquants.includes(pacte.replace(" II", ""));
        const infoPacte = genererBadgesPactes([pacte])[0];
        const description = infoPacte ? infoPacte.desc : "Effet inconnu";

        return (
            <div
                key={pacte}
                onClick={() => onBasculerPacte(pacte)}
                className={`pacte-carte${estEquipe ? ' pacte-carte--equipe' : ''}${estSuggere ? ' pacte-carte--suggere' : ''}`}
            >
                <h3 className="pacte-carte-titre">{pacte}</h3>
                <p className="pacte-carte-desc">{description}</p>
                {estEquipe && <div className="pacte-carte-badge">Équipé</div>}
                {estSuggere && <div className="pacte-carte-badge pacte-carte-badge--suggere">Synergie possible !</div>}
            </div>
        );
    };

    return (
        <div id="ecran-inventaire" className="ecran inventaire-ecran">
            <h1 className="titre-geant">📜 Vos Pactes</h1>
            <p className="texte-description inventaire-intro">
                Équipez jusqu'à 3 Pactes de Niveau I et 1 Pacte de Niveau II.
            </p>

            {aPacteChat && (
                <div className="inventaire-liste">
                    <h2 className="inventaire-section-titre inventaire-section-titre--lvl0">Pacte de Niveau 0</h2>
                    <div className="inventaire-grille">
                        <div className="pacte-carte pacte-carte--equipe pacte-carte--speciale">
                            <h3 className="pacte-carte-titre">🐈 Pacte de la Vie Éternelle</h3>
                            <p className="pacte-carte-desc">Don de l'Esprit de la Tour. Vous ressuscitez toujours au Hub après une chute.</p>
                            <div className="pacte-carte-badge">Toujours équipé</div>
                        </div>
                    </div>
                </div>
            )}

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
