interface Props {
    icone: string;
    valeur: number;
    detail: string[];
}

// Stat combinée à une bulle affichant le détail de son calcul au survol (pactes, arbre de
// compétence, synergies...) — sans ça le joueur ne voit qu'un total et ne sait pas ce qui le compose.
export function StatDetail({ icone, valeur, detail }: Props) {
    return (
        <span className="stat-detail">
            {icone} {valeur}
            <span className="stat-detail-bulle">
                {detail.map((ligne, i) => <div key={i}>{ligne}</div>)}
            </span>
        </span>
    );
}
