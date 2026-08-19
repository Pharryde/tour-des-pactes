// src/components/ChatHub.tsx
// Le Chat Mystérieux (déjà rencontré au tutoriel) somnole sur le Hub. Si on le TOUCHE — au clic,
// jamais au survol — il traverse l'écran en courant et bondit sur le bouton d'ascension, ce qui
// lance la run : c'est un vrai second chemin vers le départ, pas une décoration.
import { useEffect, useRef, useState } from 'react';
import { SpriteAnime } from './SpriteAnime';
import { ANIMATIONS_CHAT, ANIMATION_CHAT_COURSE } from '../utils/animationsChat';

// Doit rester alignée sur la durée de l'animation CSS `chat-hub-bond`.
const DUREE_BOND_MS = 1400;
// Temps de pose après l'atterrissage, avant que l'écran ne change. Sans lui, la run se lançait à
// l'instant EXACT où le chat touchait le bouton : la réception ne se voyait jamais, et le bond
// donnait l'impression de se terminer en coupure.
const DUREE_RECEPTION_MS = 320;

type EtatChat = 'repos' | 'bond' | 'arrive';

interface Props {
    // Bouton visé par le bond. On mesure sa position à l'exécution plutôt que de coder des
    // décalages en dur : elle dépend de la largeur de l'écran et du nombre d'entrées du menu.
    refCible: React.RefObject<HTMLElement | null>;
    // Déclenché quand le chat retombe sur le bouton — exactement comme si le joueur l'avait pressé.
    onLancer: () => void;
}

export function ChatHub({ refCible, onLancer }: Props) {
    const refChat = useRef<HTMLButtonElement>(null);
    const refMinuteurs = useRef<number[]>([]);
    const [etat, setEtat] = useState<EtatChat>('repos');
    const [cible, setCible] = useState({ x: 0, y: 0 });

    // Le bond survit à un changement d'écran déclenché autrement (clic direct sur le bouton
    // pendant la course) : sans ce nettoyage, les minuteurs lanceraient la run une seconde fois.
    useEffect(() => () => { refMinuteurs.current.forEach(clearTimeout); }, []);

    const auClic = () => {
        if (etat !== 'repos') return;

        const chat = refChat.current?.getBoundingClientRect();
        const bouton = refCible.current?.getBoundingClientRect();
        if (!chat || !bouton) return;

        // Le chat se pose SUR le bord haut du bouton (et non dessus) : il ne masque donc ni le
        // libellé ni la zone cliquable. Mesure fiable car prise depuis l'état 'repos', où aucune
        // transformation n'est encore appliquée.
        setCible({
            x: bouton.right - chat.width * 0.85 - chat.left,
            y: bouton.top - chat.bottom + 4,
        });
        setEtat('bond');

        refMinuteurs.current = [
            window.setTimeout(() => setEtat('arrive'), DUREE_BOND_MS),
            window.setTimeout(onLancer, DUREE_BOND_MS + DUREE_RECEPTION_MS),
        ];
    };

    // Les feuilles de sprites du Chat sont dessinées tournées vers la GAUCHE : elles servent
    // d'abord au monstre de l'arène, placé à droite et donc face au héros. Ici le chat part du bord
    // gauche vers le bouton, il faut donc les retourner — au repos comprises, pour qu'il regarde
    // déjà dans la direction où il va s'élancer.
    const regardeADroite = cible.x >= 0;

    return (
        <button
            ref={refChat}
            type="button"
            className={`chat-hub chat-hub--${etat}`}
            onClick={auClic}
            title="Un chat vous observe..."
            aria-label="Réveiller le chat mystérieux, qui lancera l'ascension"
            style={{ '--chat-x': `${cible.x}px`, '--chat-y': `${cible.y}px` } as React.CSSProperties}
        >
            {/* `key` force le remontage à chaque changement d'animation, pour que la course
                reprenne à sa première frame plutôt qu'à celle où l'idle s'était arrêtée. */}
            {/* Enveloppe dédiée à la réception : le `transform` de `.chat-hub` porte déjà la
                trajectoire, il ne peut pas porter en plus l'écrasement à l'impact. */}
            <span className="chat-hub-corps">
                <SpriteAnime
                    key={etat === 'bond' ? 'course' : 'idle'}
                    definition={etat === 'bond' ? ANIMATION_CHAT_COURSE : ANIMATIONS_CHAT.idle}
                    miroir={regardeADroite}
                />
            </span>
        </button>
    );
}
