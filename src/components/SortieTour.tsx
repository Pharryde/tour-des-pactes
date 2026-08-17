interface SortieTourProps {
    onContinuer: () => void;
    // Hardcore : la porte de sortie existe aussi au sommet. C'est le dernier — et le plus cher —
    // des choix offerts par le mode, le Gardien Absolu mettant en jeu tout le profil.
    modeHardcore?: boolean;
    onQuitterLaTour?: () => void;
    // Mode infini : nombre de cycles déjà traversés. Au-delà de zéro, ce n'est plus « le sommet »
    // mais un palier de plus dans une Tour qui n'en finit pas — le texte ne peut pas rester le même.
    cyclesInfini?: number;
}

export function SortieTour({ onContinuer, modeHardcore = false, onQuitterLaTour, cyclesInfini = 0 }: SortieTourProps) {
    return (
        <div id="ecran-sortie-tour" className="ecran">
            {cyclesInfini > 0 ? (
                <>
                    {/* Pas de classe de couleur : `.titre-geant` est déjà violet par défaut. */}
                    <h1 className="titre-geant">♾️ ENCORE UNE SORTIE...</h1>
                    <p className="texte-fin">
                        Une nouvelle porte, une nouvelle lumière — et la même silhouette qui s'y
                        dresse. Les Gardiens convergent de nouveau, plus lourds de tous les étages
                        que vous venez de franchir.
                    </p>
                </>
            ) : (
                <>
                    <h1 className="titre-geant c-orange">🌅 LA SORTIE DE LA TOUR...</h1>
                    <p className="texte-fin">
                        Au sommet, la lumière du dehors perce enfin à travers les brumes. Mais une dernière
                        présence se dresse entre vous et la liberté : la convergence de tous les Gardiens
                        que vous avez vaincus, fusionnés en une seule et unique entité.
                    </p>
                </>
            )}

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
