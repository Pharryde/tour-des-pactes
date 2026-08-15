import { InfoBulle } from './InfoBulle';

interface Props {
    icone: string;
    valeur: number;
    detail: string[];
}

// Stat combinée à une bulle affichant le détail de son calcul (pactes, arbre de compétence,
// synergies...) — sans ça le joueur ne voit qu'un total et ne sait pas ce qui le compose.
// La bulle s'ouvre vers le HAUT et s'aligne à gauche : la carte du joueur est toujours la plus à
// gauche de l'arène, c'est donc de ce côté qu'elle a de la place.
export function StatDetail({ icone, valeur, detail }: Props) {
    return (
        <InfoBulle
            className="stat-detail"
            contenu={detail.map((ligne, i) => <div key={i}>{ligne}</div>)}
        >
            {icone} {valeur}
        </InfoBulle>
    );
}
