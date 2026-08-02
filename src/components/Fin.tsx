interface FinProps {
    victoire: boolean;
    onRetourHub: () => void;
    logsMort?: string[]; // NOUVEAU : On ajoute le tableau de logs (optionnel)
}

export function Fin({ victoire, onRetourHub, logsMort = [] }: FinProps) {
    return (
        <div id="ecran-fin" className="ecran">
            {victoire ? (
                <>
                    <h1 className="titre-geant c-vert">🏆 ASCENSION RÉUSSIE !</h1>
                    <p className="texte-fin">Vous avez terrassé tous les gardiens de la Tour des Pactes !</p>
                </>
            ) : (
                <>
                    <h1 className="titre-geant c-rose">💀 VOUS ÊTES MORT...</h1>
                    <p className="texte-fin">La tour a eu raison de vous. Relevez-vous et essayez encore.</p>

                    {logsMort.length > 0 && (
                        <div className="bloc-coup-de-grace">
                            <h3 className="coup-de-grace-titre">Le Coup de Grâce (Dernier Tour)</h3>
                            <div className="coup-de-grace-logs">
                                {logsMort.map((log, index) => (
                                    <div key={index} dangerouslySetInnerHTML={{ __html: log }} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
            <button className="btn-menu btn-jouer" onClick={onRetourHub}>Retourner au Menu</button>
        </div>
    );
}
