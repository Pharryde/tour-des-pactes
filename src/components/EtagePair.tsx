interface EtagePairProps {
    onContinuer: () => void;
}

export function EtagePair({ onContinuer }: EtagePairProps) {
    return (
        <div id="ecran-etage-pair" className="ecran">
            <h1 className="titre-geant c-orange">⚠️ UNE PRÉSENCE GRANDIT...</h1>
            <p className="texte-fin">
                Vous sentez la Tour se resserrer autour de vous. Les créatures de cet étage sont
                plus puissantes qu'auparavant. Restez sur vos gardes.
            </p>
            <button className="btn-menu btn-jouer" onClick={onContinuer}>Continuer</button>
        </div>
    );
}
