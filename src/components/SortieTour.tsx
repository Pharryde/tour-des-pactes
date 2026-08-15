interface SortieTourProps {
    onContinuer: () => void;
    // Hardcore : la porte de sortie existe aussi au sommet. C'est le dernier — et le plus cher —
    // des choix offerts par le mode, le Gardien Absolu mettant en jeu tout le profil.
    modeHardcore?: boolean;
    onQuitterLaTour?: () => void;
}

export function SortieTour({ onContinuer, modeHardcore = false, onQuitterLaTour }: SortieTourProps) {
    return (
        <div id="ecran-sortie-tour" className="ecran">
            <h1 className="titre-geant c-orange">🌅 LA SORTIE DE LA TOUR...</h1>
            <p className="texte-fin">
                Au sommet, la lumière du dehors perce enfin à travers les brumes. Mais une dernière
                présence se dresse entre vous et la liberté : la convergence de tous les Gardiens
                que vous avez vaincus, fusionnés en une seule et unique entité.
            </p>

            {modeHardcore && onQuitterLaTour ? (
                <>
                    <p className="texte-fin c-rose">
                        La brèche est encore ouverte derrière vous. Partir maintenant, c'est renoncer
                        à la victoire totale — mais garder tout ce que vous portez.
                    </p>
                    <div className="menu-vertical">
                        <button className="btn-menu btn-danger" onClick={onContinuer}>⚔️ Affronter le Gardien Absolu</button>
                        <button className="btn-menu btn-jouer" onClick={onQuitterLaTour}>🚪 Repartir avec son butin</button>
                    </div>
                </>
            ) : (
                <button className="btn-menu btn-jouer" onClick={onContinuer}>⚔️ Affronter le Gardien Absolu</button>
            )}
        </div>
    );
}
