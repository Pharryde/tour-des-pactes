interface ChoixExtractionProps {
    numeroEtage: number;
    totalEtages: number;
    nbPactes: number;
    xpTotal: number;
    onSortir: () => void;
    onContinuer: () => void;
}

// Porte de sortie du mode hardcore, offerte à la fin de chaque étage juste avant la Zone de Repos
// (voir utils/hardcore.ts). C'est la seule décision qui protège le profil de la remise à zéro : ce
// qui est affiché ici est exactement ce qu'une mort effacerait.
export function ChoixExtraction({
    numeroEtage, totalEtages, nbPactes, xpTotal, onSortir, onContinuer,
}: ChoixExtractionProps) {
    const etagesRestants = totalEtages - numeroEtage;

    return (
        <div id="ecran-extraction" className="ecran">
            <h1 className="titre-geant c-orange">🚪 UNE PORTE DANS LE MUR</h1>
            <p className="texte-fin">
                L'étage {numeroEtage} est derrière vous. Une brèche s'ouvre dans la paroi : la Tour
                vous laisse repartir, cette fois. Franchissez-la et tout ce que vous portez est
                acquis, définitivement.
            </p>

            <div className="extraction-enjeu">
                <h3 className="extraction-enjeu-titre">☠️ En jeu si vous restez</h3>
                <div className="extraction-enjeu-grille">
                    <div className="extraction-enjeu-item">
                        <span className="extraction-enjeu-valeur">{nbPactes}</span>
                        <span className="extraction-enjeu-label">Pacte{nbPactes > 1 ? 's' : ''} arraché{nbPactes > 1 ? 's' : ''}</span>
                    </div>
                    <div className="extraction-enjeu-item">
                        <span className="extraction-enjeu-valeur">{xpTotal}</span>
                        <span className="extraction-enjeu-label">XP accumulée</span>
                    </div>
                    <div className="extraction-enjeu-item">
                        <span className="extraction-enjeu-valeur">{etagesRestants}</span>
                        <span className="extraction-enjeu-label">Étage{etagesRestants > 1 ? 's' : ''} restant{etagesRestants > 1 ? 's' : ''}</span>
                    </div>
                </div>
                <p className="extraction-avertissement">
                    Rester referme la porte : il n'y aura plus aucune issue avant le prochain
                    Gardien. Mourir d'ici là ne vous laissera rien.
                </p>
            </div>

            <div className="menu-vertical">
                <button className="btn-menu btn-jouer" onClick={onSortir}>🚪 Sortir de la Tour</button>
                <button className="btn-menu btn-danger" onClick={onContinuer}>☠️ Continuer l'ascension</button>
            </div>
        </div>
    );
}
