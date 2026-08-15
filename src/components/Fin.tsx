import type { StatsRun } from '../types';

interface FinProps {
    victoire: boolean;
    onRetourHub: () => void;
    logsMort?: string[];
    stats?: StatsRun | null;
    modeHardcore?: boolean;
}

export function Fin({ victoire, onRetourHub, logsMort = [], stats = null, modeHardcore = false }: FinProps) {
    // L'extraction est portée par les stats de la run et non par `victoire` : c'est une troisième
    // issue, ni mort ni victoire totale. Une sauvegarde antérieure au mode hardcore n'a pas ce
    // champ, d'où le repli sur l'ancien booléen.
    const estExtraction = stats?.issue === 'extraction';
    // Un abandon n'atteint cet écran qu'en hardcore : ailleurs il renvoie droit au Hub sans écrire
    // de statistiques de run.
    const estAbandon = stats?.issue === 'abandon';
    const estMort = !victoire && !estExtraction && !estAbandon;

    return (
        <div id="ecran-fin" className="ecran">
            {victoire && (
                <>
                    <h1 className="titre-geant c-vert">🏆 ASCENSION RÉUSSIE !</h1>
                    <p className="texte-fin">Vous avez terrassé tous les gardiens de la Tour des Pactes !</p>
                </>
            )}

            {estExtraction && (
                <>
                    <h1 className="titre-geant c-orange">🚪 VOUS AVEZ QUITTÉ LA TOUR</h1>
                    <p className="texte-fin">
                        Vous ressortez vivant, les mains pleines. Tout ce que vous avez arraché là-haut
                        est désormais à vous, définitivement.
                    </p>
                </>
            )}

            {estAbandon && (
                <>
                    <h1 className="titre-geant c-rose">🏳️ VOUS AVEZ FUI LA TOUR</h1>
                    <p className="texte-fin">
                        Renoncer en pleine ascension coûte exactement le même prix que d'y mourir.
                        Pactes, XP, compétences : il ne reste rien.
                    </p>
                </>
            )}

            {estMort && (
                <>
                    <h1 className="titre-geant c-rose">💀 VOUS ÊTES MORT...</h1>
                    <p className="texte-fin">
                        {modeHardcore
                            ? "La Tour a tout repris. Pactes, XP, compétences : il ne reste rien."
                            : "La tour a eu raison de vous. Relevez-vous et essayez encore."}
                    </p>
                </>
            )}

            {stats && (
                <div className="bloc-stats-run">
                    <h3 className="stats-run-titre">📊 Statistiques de cette Ascension</h3>
                    <div className="stats-run-grille">
                        <div className="stat-run-item">
                            <span className="stat-run-valeur">{stats.etageAtteint}</span>
                            <span className="stat-run-label">
                                Étage atteint
                                {stats.estNouveauRecord ? (
                                    <span className="stat-run-record stat-run-record--nouveau"> · 🏆 Nouveau record !</span>
                                ) : (
                                    <span className="stat-run-record"> · Record : {stats.etageRecord}</span>
                                )}
                            </span>
                        </div>
                        <div className="stat-run-item">
                            <span className="stat-run-valeur">{stats.monstresTues}</span>
                            <span className="stat-run-label">Monstres vaincus</span>
                        </div>
                        {stats.nouveauxPactes.length > 0 && (
                            <div className="stat-run-item">
                                <span className="stat-run-valeur">{stats.nouveauxPactes.length}</span>
                                <span className="stat-run-label">Nouveaux Pactes débloqués</span>
                            </div>
                        )}
                        <div className="stat-run-item">
                            <span className="stat-run-valeur">{stats.degatsInfliges}</span>
                            <span className="stat-run-label">Dégâts infligés</span>
                        </div>
                        <div className="stat-run-item">
                            <span className="stat-run-valeur">{stats.degatsBloques}</span>
                            <span className="stat-run-label">Dégâts bloqués</span>
                        </div>
                        <div className="stat-run-item">
                            <span className="stat-run-valeur">{stats.degatsEsquives}</span>
                            <span className="stat-run-label">Dégâts esquivés</span>
                        </div>
                    </div>
                </div>
            )}

            {estMort && logsMort.length > 0 && (
                <div className="bloc-coup-de-grace">
                    <h3 className="coup-de-grace-titre">Le Coup de Grâce (Dernier Tour)</h3>
                    <div className="coup-de-grace-logs">
                        {logsMort.map((log, index) => (
                            <div key={index} dangerouslySetInnerHTML={{ __html: log }} />
                        ))}
                    </div>
                </div>
            )}

            <button className="btn-menu btn-jouer" onClick={onRetourHub}>Retourner au Menu</button>
        </div>
    );
}
