import { useState } from 'react';
import { LONGUEUR_MAX_NOM, nettoyerNomJoueur, nettoyerSaisieNom, nomJoueurValide, soumettreScore } from '../utils/classement';

interface ClassementSaisieProps {
    nbRuns: number;
    runsTotales: number;
    monstresTues: number;
    // Le nom devient l'identité publique du joueur, réutilisée par les classements d'étage : il
    // doit donc être mémorisé même s'il n'est saisi qu'ici.
    onNomChoisi: (nom: string) => void;
    onTermine: () => void;
}

// Affiché une seule fois, juste après la victoire hardcore et AVANT l'écran de fin. C'est le seul
// endroit du jeu où le joueur saisit du texte libre, et le seul dont le résultat sera lu par
// d'autres joueurs.
export function ClassementSaisie({ nbRuns, runsTotales, monstresTues, onNomChoisi, onTermine }: ClassementSaisieProps) {
    const [nom, setNom] = useState('');
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [echec, setEchec] = useState(false);

    // Nettoyé à la frappe plutôt qu'à la validation : le joueur voit tout de suite ce qui sera
    // publié, au lieu de découvrir après coup que son émoticône a disparu.
    const changerNom = (saisie: string) => {
        // Version « frappe » : elle ne rogne pas la fin, sans quoi l'espace serait retiré à
        // l'instant où il est tapé et un nom en deux mots serait impossible à saisir.
        setNom(nettoyerSaisieNom(saisie));
        setEchec(false);
    };

    const valider = async () => {
        if (!nomJoueurValide(nom) || envoiEnCours) return;
        setEnvoiEnCours(true);
        // C'est la forme définitive qui part en base : un espace final resterait sinon dans le
        // classement, et la contrainte `nom = btrim(nom)` le rejetterait.
        const propre = nettoyerNomJoueur(nom);
        const envoye = await soumettreScore({ nom: propre, nbRuns, runsTotales, monstresTues });
        // En cas d'échec réseau on ne bloque pas le joueur dans cet écran : il vient de gagner,
        // il doit pouvoir avancer. On le lui dit, et le bouton devient « Continuer ».
        if (envoye) { onNomChoisi(propre); onTermine(); } else { setEchec(true); setEnvoiEnCours(false); }
    };

    return (
        <div id="ecran-classement-saisie" className="ecran">
            <h1 className="titre-geant c-rose">☠️ LA TOUR EST TOMBÉE</h1>
            <p className="texte-fin">
                Vous avez terrassé le Gardien Absolu en mode hardcore, là où la moindre erreur
                efface tout. La Tour retient les noms de ceux qui en reviennent.
            </p>

            <div className="classement-score">
                <div className="classement-score-paire">
                    <div className="classement-score-bloc">
                        <span className="classement-score-valeur">{nbRuns}</span>
                        <span className="classement-score-label">{nbRuns > 1 ? 'ascensions' : 'ascension'}</span>
                    </div>
                    <div className="classement-score-bloc">
                        <span className="classement-score-valeur">{monstresTues}</span>
                        <span className="classement-score-label">{monstresTues > 1 ? 'monstres terrassés' : 'monstre terrassé'}</span>
                    </div>
                </div>
                <span className="classement-score-periode">depuis votre dernier effacement</span>
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
