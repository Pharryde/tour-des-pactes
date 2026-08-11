// src/components/BenedictionChat.tsx
// Le Chat Mystérieux revient commenter la toute première ascension achevée du joueur : railleur
// s'il s'est fait broyer par la Tour, admiratif s'il l'a terrassée — mais il offre sa Bénédiction
// dans les deux cas (voir utils/benedictions.ts).
import { BENEDICTIONS_REGISTRY, LISTE_BENEDICTIONS } from '../utils/benedictions';
import { ScenetteChat } from './ScenetteChat';

interface Props {
    aVaincuLaTour: boolean;
    onContinuer: () => void;
}

export function BenedictionChat({ aVaincuLaTour, onContinuer }: Props) {
    return (
        <ScenetteChat
            identifiant="ecran-benediction"
            titre="🐈 Le Chat Mystérieux"
            libelleBouton={aVaincuLaTour ? "Merci, l'Esprit de la Tour" : "Compris. J'y retourne."}
            onContinuer={onContinuer}
        >
            {aVaincuLaTour ? (
                <p className="scenette-texte">
                    "Alors ça... je ne l'avais pas vu venir." Le chat vous observe, la queue battant
                    lentement l'air. "Tu es monté jusqu'en haut. Du premier coup. Aucun de tes
                    prédécesseurs n'a fait ça — je les ai tous regardés tomber, tu sais."
                    <br /><br />
                    Il incline la tête, et pour la première fois son sourire n'a rien de moqueur.
                    <br /><br />
                    "Un tel exploit mérite récompense. À partir de maintenant, ma <b>Bénédiction</b> t'accompagnera
                    à chaque ascension. Considère ça comme la marque de mon respect... et comme un
                    avertissement : la Tour te prendra bien plus au sérieux, désormais."
                </p>
            ) : (
                <p className="scenette-texte">
                    Le chat vous attend au pied de la Tour, assis bien droit, la queue enroulée autour
                    des pattes. "Alors ? On s'est fait surprendre ?" Il incline la tête, l'air plus
                    amusé que déçu.
                    <br /><br />
                    "Ne fais pas cette tête, tout le monde tombe la première fois. Mais entre nous...
                    tu <b>peux</b> faire beaucoup mieux que ça. Je t'ai regardé : tu enchaînes tes actions
                    sans les regarder, tu frappes quand il fallait attendre. Prends ton temps, observe
                    ce que l'adversaire prépare, et tu verras — la Tour est bien moins terrible qu'elle
                    en a l'air."
                    <br /><br />
                    Il se lève et s'étire longuement.
                    <br /><br />
                    "Allez. Puisque tu comptes recommencer — et je sais que tu vas recommencer — autant
                    te donner un coup de patte. Reçois ma <b>Bénédiction</b>."
                </p>
            )}

            <div className="benediction-roue-intro">
                <p className="texte-description">
                    À chaque entrée dans la Tour, une <b>Roue de la Chance</b> vous accordera l'un de ces
                    six bonus, valable pour toute l'ascension :
                </p>
                <div className="benediction-grille">
                    {LISTE_BENEDICTIONS.map(cle => {
                        const def = BENEDICTIONS_REGISTRY[cle];
                        return (
                            <div key={cle} className="benediction-carte" style={{ borderColor: def.couleur }}>
                                <h3 className="benediction-carte-titre" style={{ color: def.couleur }}>
                                    {def.emoji} {def.titre}
                                </h3>
                                <p className="benediction-carte-desc">{def.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ScenetteChat>
    );
}
