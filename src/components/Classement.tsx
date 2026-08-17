import { useEffect, useState } from 'react';
import { lireClassement, type EntreeClassement } from '../utils/classement';

interface ClassementProps {
    onRetour: () => void;
}

const MEDAILLES = ['🥇', '🥈', '🥉'];

export function Classement({ onRetour }: ClassementProps) {
    // `null` = pas encore répondu, `[]` = répondu et vide : les deux méritent un message différent,
    // d'où l'état de chargement séparé plutôt qu'un simple tableau vide.
    const [entrees, setEntrees] = useState<EntreeClassement[] | null>(null);
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        let annule = false;
        lireClassement().then(resultat => {
            if (annule) return;
            setEntrees(resultat);
            setChargement(false);
        });
        return () => { annule = true; };
    }, []);

    return (
        <div id="ecran-classement" className="ecran">
            <h1 className="titre-geant c-or">🏆 LES SURVIVANTS</h1>
            <p className="texte-description">
                Ceux qui ont terrassé la Tour en mode hardcore : le nombre d'ascensions qu'il leur a
                fallu depuis leur dernier effacement, et les monstres tombés en chemin.
            </p>

            {chargement && <p className="texte-description">Consultation des archives…</p>}

            {!chargement && entrees === null && (
                <p className="texte-description c-rose">
                    Le classement est injoignable pour le moment.
                </p>
            )}

            {!chargement && entrees?.length === 0 && (
                <p className="texte-description">
                    Personne n'en est encore revenu. La première ligne vous attend.
                </p>
            )}

            {!chargement && entrees && entrees.length > 0 && (
                <div className="classement-tableau">
                    {entrees.map((entree, index) => (
                        <div key={`${entree.nom}-${entree.obtenu_le}`} className="classement-ligne">
                            <span className="classement-rang">{MEDAILLES[index] ?? `${index + 1}.`}</span>
                            <span className="classement-nom">{entree.nom}</span>
                            <span className="classement-stats">
                                <span className="classement-runs">
                                    {entree.nb_runs} {entree.nb_runs > 1 ? 'ascensions' : 'ascension'}
                                </span>
                                <span className="classement-monstres">👿 {entree.monstres_tues}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="menu-vertical">
                <button className="btn-menu" onClick={onRetour}>Retour au Hub</button>
            </div>
        </div>
    );
}
