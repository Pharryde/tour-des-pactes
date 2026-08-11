// src/components/Inventaire.tsx
import type { Ecran, Synergie } from '../types';
import { PACTES_REGISTRY, genererBadgesPactes } from '../utils/pactes';
import { SYNERGIES_REGISTRY, composerEquipementSynergie, pactesManquantsPourSynergie } from '../utils/synergies';

interface InventaireProps {
    pactesDebloques: string[];
    pactesEquipes: string[];
    // Pactes portés lors d'une victoire totale : ils arborent un trophée définitif.
    pactesVictorieux: string[];
    // Synergies déjà découvertes : elles seules donnent droit au raccourci d'équipement.
    synergiesDecouvertes: Synergie[];
    aPacteChat: boolean;
    onBasculerPacte: (nomPacte: string) => void;
    onEquiperSynergie: (pactes: string[]) => void;
    onChangeEcran: (ecran: Ecran) => void;
}

// Liste complète des Pactes existants (débloqués ou non), pour afficher les emplacements
// verrouillés dans la grille et donner au joueur une idée de sa progression vers la collection.
const TOUS_LES_PACTES = Object.keys(PACTES_REGISTRY);

export function Inventaire({ pactesDebloques, pactesEquipes, pactesVictorieux, synergiesDecouvertes, aPacteChat, onBasculerPacte, onEquiperSynergie, onChangeEcran }: InventaireProps) {

    // Tant que le joueur n'a encore arraché aucun Pacte d'un niveau donné, on ne montre même pas
    // les emplacements verrouillés de ce niveau (sinon la 1ère partie révèlerait déjà la liste
    // complète des Pactes de Niveau I/II avant que le joueur en ait seulement vu un).
    const possedeLvl1 = pactesDebloques.some(p => !p.endsWith(" II"));
    const possedeLvl2 = pactesDebloques.some(p => p.endsWith(" II"));

    const pactesLvl1 = TOUS_LES_PACTES.filter(p => !p.endsWith(" II")).sort((a, b) => a.localeCompare(b));
    const pactesLvl2 = TOUS_LES_PACTES.filter(p => p.endsWith(" II")).sort((a, b) => a.localeCompare(b));

    // Si le joueur équipe déjà 3 des 4 Pactes d'une synergie cachée, le 4e s'illumine dans son
    // inventaire (à condition de le posséder déjà) pour l'aider à repérer la combinaison.
    const pactesManquants = pactesManquantsPourSynergie(pactesEquipes);

    // Seules les synergies déjà découvertes ET réellement composables avec ce que le joueur possède
    // méritent un bouton : proposer un raccourci qui échoue serait pire que ne rien proposer.
    const synergiesEquipables = synergiesDecouvertes
        .map(synergie => ({ synergie, composition: composerEquipementSynergie(synergie, pactesDebloques) }))
        .filter((entree): entree is { synergie: Synergie; composition: string[] } => entree.composition !== null)
        .map(entree => ({
            ...entree,
            dejaEquipee: entree.composition.every(p => pactesEquipes.includes(p)) && pactesEquipes.length === entree.composition.length,
        }));

    const renderPacte = (pacte: string) => {
        const estDebloque = pactesDebloques.includes(pacte);

        // Pacte pas encore arraché à un Gardien : emplacement grisé, sans révéler son effet.
        if (!estDebloque) {
            return (
                <div key={pacte} className="pacte-carte pacte-carte--verrouille">
                    <h3 className="pacte-carte-titre">{pacte}</h3>
                    <p className="pacte-carte-desc">???</p>
                </div>
            );
        }

        const estEquipe = pactesEquipes.includes(pacte);
        const estSuggere = !estEquipe && pactesManquants.includes(pacte.replace(" II", ""));
        const aVaincuLaTour = pactesVictorieux.includes(pacte);
        const infoPacte = genererBadgesPactes([pacte])[0];
        const description = infoPacte ? infoPacte.desc : "Effet inconnu";

        return (
            <div
                key={pacte}
                onClick={() => onBasculerPacte(pacte)}
                className={`pacte-carte${estEquipe ? ' pacte-carte--equipe' : ''}${estSuggere ? ' pacte-carte--suggere' : ''}${aVaincuLaTour ? ' pacte-carte--victorieux' : ''}`}
            >
                <h3 className="pacte-carte-titre">{pacte}</h3>
                <p className="pacte-carte-desc">{description}</p>
                {/* États dans le FLUX, en pied de carte : en pastilles positionnées en absolu, ils
                    se superposaient au titre et débordaient sur les cartes voisines. */}
                <div className="pacte-carte-etats">
                    {aVaincuLaTour && (
                        <span className="pacte-etat pacte-etat--trophee" title="Vous avez terminé la Tour en portant ce Pacte">🏆</span>
                    )}
                    {estEquipe && <span className="pacte-etat pacte-etat--equipe">Équipé</span>}
                    {/* Volontairement réduit à une pastille : le halo doré de la carte porte déjà le
                        message, un libellé complet mangeait toute la place sur une carte étroite. */}
                    {estSuggere && (
                        <span className="pacte-etat pacte-etat--suggere" title="Ce Pacte compléterait une synergie cachée">⚡</span>
                    )}
                </div>
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
                            <div className="pacte-carte-etats">
                                <span className="pacte-etat pacte-etat--equipe">Toujours équipé</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Raccourci d'équipement : une synergie exige une combinaison exacte de 4 Pactes
                répartis sur 3 emplacements de Niveau I et 1 de Niveau II. La recomposer à la main
                à chaque run est fastidieux et facile à rater. */}
            {synergiesEquipables.length > 0 && (
                <div className="synergies-raccourcis">
                    <span className="synergies-raccourcis-titre">Synergies découvertes :</span>
                    {synergiesEquipables.map(({ synergie, composition, dejaEquipee }) => (
                        <button
                            key={synergie}
                            className={`synergie-bouton${dejaEquipee ? ' synergie-bouton--active' : ''}`}
                            onClick={() => onEquiperSynergie(composition)}
                            title={`${SYNERGIES_REGISTRY[synergie].titre} — ${composition.join(', ')}`}
                        >
                            🔮 {synergie}{dejaEquipee ? ' ✓' : ''}
                        </button>
                    ))}
                </div>
            )}

            <div className="inventaire-liste">
                {!possedeLvl1 && !possedeLvl2 && (
                    <p className="inventaire-vide">Vous n'avez arraché aucun Pacte pour le moment.</p>
                )}
                {possedeLvl1 && (
                    <div>
                        <h2 className="inventaire-section-titre inventaire-section-titre--lvl1">
                            Pactes de Niveau I <span className="inventaire-section-compteur">(3 max équipés)</span>
                        </h2>
                        <div className="inventaire-grille">
                            {pactesLvl1.map(renderPacte)}
                        </div>
                    </div>
                )}
                {possedeLvl2 && (
                    <div>
                        <h2 className="inventaire-section-titre inventaire-section-titre--lvl2">
                            Pactes de Niveau II <span className="inventaire-section-compteur">(1 max équipé)</span>
                        </h2>
                        <div className="inventaire-grille">
                            {pactesLvl2.map(renderPacte)}
                        </div>
                    </div>
                )}
            </div>

            <button className="btn-menu btn-jouer" onClick={() => onChangeEcran('ecran-hub')}>
                Retour au Hub
            </button>
        </div>
    );
}
