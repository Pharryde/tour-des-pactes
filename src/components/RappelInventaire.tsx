// src/components/RappelInventaire.tsx
// Le Chat intercepte le joueur qui part à l'assaut de la Tour sans avoir équipé le moindre Pacte,
// alors qu'il en possède. C'est l'erreur la plus coûteuse du jeu et la plus facile à commettre :
// arracher un Pacte et l'oublier dans sa besace ne produit aucun message d'erreur.
import { ScenetteChat } from './ScenetteChat';

interface Props {
    nbPactesDisponibles: number;
    onAllerInventaire: () => void;
    onPartirQuandMeme: () => void;
}

export function RappelInventaire({ nbPactesDisponibles, onAllerInventaire, onPartirQuandMeme }: Props) {
    return (
        <ScenetteChat
            identifiant="ecran-rappel-inventaire"
            titre="🐈 Un instant, petit être"
            libelleBouton="🎒 Aller à l'Inventaire"
            onContinuer={onAllerInventaire}
            /* Sortie de secours : une run volontairement sans Pacte reste un choix légitime, et un
               écran qui bloque deviendrait vite une corvée pour qui le fait exprès. */
            actionSecondaire={
                <button className="scenette-secondaire" onClick={onPartirQuandMeme}>
                    Partir sans Pacte
                </button>
            }
        >
            <p className="scenette-texte">
                Le chat vous barre la route, l'air franchement navré. "Tu comptais monter là-haut
                <b> les mains vides</b> ? Tu as {nbPactesDisponibles === 1 ? 'arraché un Pacte' : `arraché ${nbPactesDisponibles} Pactes`} à
                {nbPactesDisponibles === 1 ? ' un Gardien' : ' des Gardiens'}, et {nbPactesDisponibles === 1 ? 'il dort' : 'ils dorment'} au fond de ta besace."
                <br /><br />
                "Un Pacte ne sert à rien tant qu'il n'est pas <b>équipé</b>. Va à l'Inventaire et
                choisis : tu peux en porter <b>trois de Niveau I</b> en même temps, plus <b>un seul
                de Niveau II</b> quand tu en auras arraché un."
                <br /><br />
                "Trois d'un coup, oui. C'est là que ça devient intéressant : ils se combinent, et
                certaines associations réveillent des choses que je te laisse découvrir."
            </p>
        </ScenetteChat>
    );
}
