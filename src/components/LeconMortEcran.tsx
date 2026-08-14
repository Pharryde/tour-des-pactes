// src/components/LeconMortEcran.tsx
// Le Chat revient sur la mort du joueur quand celle-ci vient d'un pouvoir de Gardien qu'on peut
// traverser sans jamais le voir (tic de fin de tour, esquive neutralisée, régénération). Le texte
// vient du registre : ce composant n'est que la mise en scène.
import type { LeconMort } from '../types';
import { LECONS_MORT_REGISTRY } from '../utils/leconsMort';
import { ScenetteChat } from './ScenetteChat';

interface Props {
    lecon: LeconMort;
    onContinuer: () => void;
}

export function LeconMortEcran({ lecon, onContinuer }: Props) {
    const def = LECONS_MORT_REGISTRY[lecon];

    return (
        <ScenetteChat
            identifiant="ecran-lecon-mort"
            titre={def.titre}
            libelleBouton={def.libelleBouton}
            onContinuer={onContinuer}
        >
            {/* Les répliques portent un peu de mise en forme (gras sur la mécanique en cause) : le
                registre reste la source unique du texte, y compris de son emphase. */}
            <p className="scenette-texte" dangerouslySetInnerHTML={{ __html: def.replique }} />
        </ScenetteChat>
    );
}
