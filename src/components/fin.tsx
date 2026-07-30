interface FinProps {
    victoire: boolean;
    onRetourHub: () => void;
}

export function Fin({ victoire, onRetourHub }: FinProps) {
    return (
        <div id="ecran-fin" className="ecran">
            {victoire ? (
                <>
                    <h1 className="titre-geant" style={{ color: '#a6e3a1' }}>🏆 ASCENSION RÉUSSIE !</h1>
                    <p className="texte-fin">Vous avez terrassé tous les gardiens de la Tour des Pactes !</p>
                </>
            ) : (
                <>
                    <h1 className="titre-geant" style={{ color: '#f38ba8' }}>💀 VOUS ÊTES MORT...</h1>
                    <p className="texte-fin">La tour a eu raison de vous. Relevez-vous et essayez encore.</p>
                </>
            )}
            <button className="btn-menu btn-jouer" onClick={onRetourHub}>Retourner au Menu</button>
        </div>
    );
}