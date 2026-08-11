// src/components/LeconCombo.tsx
// 3e apparition du Chat Mystérieux, à la fin de la run qui suit la présentation du forgeron : il
// réexplique le Combo. C'est la mécanique du tutoriel la plus facile à oublier — elle n'apparaît
// nulle part à l'écran pendant qu'on programme son tour, seulement une fois les actions résolues.
import { ScenetteChat } from './ScenetteChat';

interface Props {
    onContinuer: () => void;
}

export function LeconCombo({ onContinuer }: Props) {
    return (
        <ScenetteChat
            identifiant="ecran-lecon-combo"
            titre="🐈 Piqûre de rappel"
            libelleBouton="C'est noté"
            onContinuer={onContinuer}
        >
            <p className="scenette-texte">
                Le chat vous barre la route, l'air de rien. "Dis-moi... tu te souviens de ce que je t'ai
                appris sur le <b>Combo</b> ? Non ? Je m'en doutais. Assieds-toi."
                <br /><br />
                "Dans un même tour, enchaîner <b>plusieurs fois la même action d'affilée</b> l'amplifie à
                chaque répétition. Une Attaque seule reste une Attaque. Cinq Attaques d'affilée, et la
                dernière frappe bien plus fort que la première — pareil pour la Précise et la Défense."
                <br /><br />
                "C'est pour ça qu'un tour de cinq actions identiques n'a rien d'un manque d'imagination :
                c'est souvent le plus gros dégât que tu puisses sortir. Mais attention, ça marche <b>dans
                les deux sens</b> : les monstres le font aussi, et un Gardien qui martèle sa Défense finit
                le tour derrière un mur."
                <br /><br />
                "Change d'action, et le compteur retombe à zéro. À toi de voir quand ça vaut le coup de
                s'entêter... et quand certains Gardiens t'<b>empêcheront</b> de le faire."
            </p>
        </ScenetteChat>
    );
}
