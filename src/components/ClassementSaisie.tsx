import { useState } from 'react';
import { LONGUEUR_MAX_NOM, nettoyerNomJoueur, nomJoueurValide, soumettreScore } from '../utils/classement';

interface ClassementSaisieProps {
    nbRuns: number;
    runsTotales: number;
    onTermine: () => void;
}

// Affiché une seule fois, juste après la victoire hardcore et AVANT l'écran de fin. C'est le seul
// endroit du jeu où le joueur saisit du texte libre, et le seul dont le résultat sera lu par
// d'autres joueurs.
export function ClassementSaisie({ nbRuns, runsTotales, onTermine }: ClassementSaisieProps) {
    const [nom, setNom] = useState('');
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [echec, setEchec] = useState(false);

    // Nettoyé à la frappe plutôt qu'à la validation : le joueur voit tout de suite ce qui sera
    // publié, au lieu de découvrir après coup que son émoticône a disparu.
    const changerNom = (saisie: string) => {
        setNom(nettoyerNomJoueur(saisie));
        setEchec(false);
    };

    const valider = async () => {
        if (!nomJoueurValide(nom) || envoiEnCours) return;
        setEnvoiEnCours(true);
        const envoye = await soumettreScore(nom, nbRuns, runsTotales);
        // En cas d'échec réseau on ne bloque pas le joueur dans cet écran : il vient de gagner,
        // il doit pouvoir avancer. On le lui dit, et le bouton devient « Continuer ».
        if (envoye) onTermine(); else { setEchec(true); setEnvoiEnCours(false); }
    };

    return (
        <div id="ecran-classement-saisie" className="ecran">
            <h1 className="titre-geant c-rose">☠️ LA TOUR EST TOMBÉE</h1>
            <p className="texte-fin">
                Vous avez terrassé le Gardien Absolu en mode hardcore, là où la moindre erreur
                efface tout. La Tour retient les noms de ceux qui en reviennent.
            </p>

            <div className="classement-score">
                <span className="classement-score-valeur">{nbRuns}</span>
                <span className="classement-score-label">
                    {nbRuns > 1 ? 'ascensions' : 'ascension'} depuis votre dernier effacement
                </span>
            </div>

            <label className="classement-champ">
                <span>Votre nom pour le classement</span>
                <input
                    type="text"
                    className="classement-input"
                    value={nom}
                    onChange={e => changerNom(e.target.value)}
                    maxLength={LONGUEUR_MAX_NOM}
                    placeholder="Anonyme des profondeurs"
                    autoFocus
                />
                <span className="classement-compteur">{nom.length}/{LONGUEUR_MAX_NOM}</span>
            </label>

            <p className="classement-avertissement">
                Ce nom sera visible par tous les autres joueurs.
            </p>

            {echec && (
                <p className="classement-echec">
                    Le classement est injoignable. Votre victoire reste acquise, mais elle ne sera
                    pas inscrite.
                </p>
            )}

            <div className="menu-vertical">
                <button
                    className="btn-menu btn-jouer"
                    onClick={valider}
                    disabled={!nomJoueurValide(nom) || envoiEnCours}
                >
                    {envoiEnCours ? 'Inscription…' : '🏆 Inscrire mon nom'}
                </button>
                <button className="btn-menu" onClick={onTermine}>
                    {echec ? 'Continuer' : 'Rester anonyme'}
                </button>
            </div>
        </div>
    );
}
