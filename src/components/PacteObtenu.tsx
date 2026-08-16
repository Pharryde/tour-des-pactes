// src/components/PacteObtenu.tsx
// Écran de félicitations à l'arrachage d'un Pacte. C'est la récompense d'un combat que le joueur a
// choisi de livrer en connaissance du risque : elle ne peut pas se réduire à une ligne de journal
// qui défile pendant que l'écran bascule déjà vers l'étage suivant.
import { PACTES_REGISTRY } from '../utils/pactes';

interface Props {
    nomPacte: string;
    // Vrai quand c'est le tout premier Pacte de la partie : le Chat en profite pour expliquer
    // l'Inventaire, que le joueur n'a aucune raison d'avoir ouvert avant.
    estPremierPacte: boolean;
    onContinuer: () => void;
}

export function PacteObtenu({ nomPacte, estPremierPacte, onContinuer }: Props) {
    const effet = (PACTES_REGISTRY[nomPacte]?.desc ?? '').replace(/^\((.*)\)$/, '$1');
    const estNiveauII = nomPacte.endsWith(' II');

    return (
        <div id="ecran-pacte-obtenu" className="ecran">
            <h1 className="titre-geant c-orange">✨ PACTE ARRACHÉ ✨</h1>

            <div className="pacte-obtenu-carte">
                <span className="pacte-obtenu-rang">{estNiveauII ? 'Niveau II' : 'Niveau I'}</span>
                <h2 className="pacte-obtenu-nom">{nomPacte}</h2>
                <p className="pacte-obtenu-effet">{effet}</p>
            </div>

            <p className="texte-description">
                Le Gardien s'effondre, et son pouvoir vous appartient. Il est <b>vôtre à jamais</b> :
                même la mort ne vous le reprendra pas.
            </p>

            {estPremierPacte && (
                <p className="texte-description pacte-obtenu-astuce">
                    🐈 "Un conseil, petit être : un Pacte ne sert à rien tant qu'il dort dans ta besace.
                    Passe par l'<b>Inventaire</b> depuis le Hub avant ta prochaine ascension pour
                    l'équiper — tu peux en porter <b>trois de Niveau I</b> à la fois."
                </p>
            )}

            <button className="btn-menu btn-jouer" onClick={onContinuer}>Poursuivre l'ascension</button>
        </div>
    );
}
