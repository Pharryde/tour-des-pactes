// src/components/PresentationForgeron.tsx
// 2e apparition du Chat Mystérieux (fin de la 2e run au plus tôt) : il présente le forgeron. Tant
// que cette scène n'a pas été jouée, l'Arbre de Compétences reste absent du Hub — même si le joueur
// a déjà de l'XP à dépenser (voir useGameState).
import { ANIMATION_FORGE } from '../utils/animationsForge';
import { ScenetteChat } from './ScenetteChat';

interface Props {
    onContinuer: () => void;
}

export function PresentationForgeron({ onContinuer }: Props) {
    return (
        <ScenetteChat
            identifiant="ecran-forgeron"
            titre="🔨 Le Forgeron"
            spriteInvite={ANIMATION_FORGE}
            libelleBouton="Aller voir le Forgeron"
            onContinuer={onContinuer}
        >
            <p className="scenette-texte">
                Le chat vous attend, assis sur une enclume. Derrière lui, un vieux nain frappe le métal
                sans lever les yeux une seule fois.
                <br /><br />
                "Je te présente le Forgeron. Ne perds pas ta salive : il est <b>sourd comme cette enclume</b>.
                Ça fait trois siècles qu'il tape là-dessus, et je crois qu'il ne m'a jamais entendu une seule
                fois. Mais il sait ce qu'il fait." Il désigne les éclats lumineux qui flottent autour de la forge.
                <br /><br />
                "Ces <b>Éclats d'Âme</b> que tu arraches aux créatures — ton XP —, il sait les refondre. À
                certains paliers (5, 10, 25, 50, 100, puis toutes les centaines), tu gagnes un <b>Point de
                Compétence</b> à répartir entre Vitalité, Peau de Fer, Force Brute, Œil de Faucon et Réflexes.
                Tant que tu n'as pas <b>validé</b>, rien n'est gravé : tu peux tout réarranger, ou tout remettre
                à zéro."
                <br /><br />
                "Et ce qu'il forge est <b>définitif d'une ascension à l'autre</b> : tu repars de plus en plus
                fort, même quand tu meurs. C'est tout l'intérêt de mourir souvent."
            </p>
        </ScenetteChat>
    );
}
