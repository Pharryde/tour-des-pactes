interface SortieTourProps {
    onContinuer: () => void;
}

export function SortieTour({ onContinuer }: SortieTourProps) {
    return (
        <div id="ecran-sortie-tour" className="ecran">
            <h1 className="titre-geant c-orange">🌅 LA SORTIE DE LA TOUR...</h1>
            <p className="texte-fin">
                Au sommet, la lumière du dehors perce enfin à travers les brumes. Mais une dernière
                présence se dresse entre vous et la liberté : la convergence de tous les Gardiens
                que vous avez vaincus, fusionnés en une seule et unique entité.
            </p>
            <button className="btn-menu btn-jouer" onClick={onContinuer}>⚔️ Affronter le Gardien Absolu</button>
        </div>
    );
}
