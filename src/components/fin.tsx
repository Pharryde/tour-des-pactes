interface FinProps {
    victoire: boolean;
    onRetourHub: () => void;
    logsMort?: string[]; // NOUVEAU : On ajoute le tableau de logs (optionnel)
}

export function Fin({ victoire, onRetourHub, logsMort = [] }: FinProps) {
    return (
        <div id="ecran-fin" className="ecran" style={{ overflowY: 'auto' }}>
            {victoire ? (
                <>
                    <h1 className="titre-geant" style={{ color: '#a6e3a1' }}>🏆 ASCENSION RÉUSSIE !</h1>
                    <p className="texte-fin">Vous avez terrassé tous les gardiens de la Tour des Pactes !</p>
                </>
            ) : (
                <>
                    <h1 className="titre-geant" style={{ color: '#f38ba8' }}>💀 VOUS ÊTES MORT...</h1>
                    <p className="texte-fin">La tour a eu raison de vous. Relevez-vous et essayez encore.</p>

                    {/* NOUVEAU : Le bloc du Coup de Grâce, centré et stylisé */}
                    {logsMort.length > 0 && (
                        <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#181825', border: '1px solid #313244', borderRadius: '8px', padding: '15px', margin: '20px auto' }}>
                            <h3 style={{ color: '#89b4fa', marginTop: 0, borderBottom: '1px solid #313244', paddingBottom: '10px', textAlign: 'center' }}>
                                Le Coup de Grâce (Dernier Tour)
                            </h3>
                            <div style={{ padding: '10px', backgroundColor: '#11111b', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', fontSize: '0.9em', textAlign: 'left' }}>
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