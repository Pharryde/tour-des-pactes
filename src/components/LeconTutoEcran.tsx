// src/components/LeconTutoEcran.tsx
// Leçon du tutoriel présentée en plein écran avant le tour concerné. Le journal de combat garde la
// même réplique (voir DIALOGUE_CHAT_TUTO), mais noyée entre les lignes de résolution : sur un
// premier contact avec le jeu, une explication qu'on doit aller chercher est une explication ratée.
//
// ⚠️ Overlay et non `Ecran` à part : le tour est en attente à l'intérieur de CombatArene, démonter
// l'arène pour changer d'écran perdrait l'état du combat (même raison que l'écran de Vie de Chat).
import { ANIMATIONS_CHAT } from '../utils/animationsChat';
import type { LeconTuto } from '../utils/tutoCombat';
import { SpriteAnime } from './SpriteAnime';

interface Props {
    lecon: LeconTuto;
    numero: number;
    total: number;
    onContinuer: () => void;
}

export function LeconTutoEcran({ lecon, numero, total, onContinuer }: Props) {
    return (
        <div className="lecon-tuto-ecran" role="dialog" aria-modal="true">
            <div className="lecon-tuto-carte">
                <div className="lecon-tuto-sprite">
                    <SpriteAnime definition={ANIMATIONS_CHAT.idle} />
                </div>
                <span className="lecon-tuto-etape">Leçon {numero} / {total}</span>
                <h2 className="lecon-tuto-titre">{lecon.titre}</h2>
                {lecon.repliques.map((texte, i) => (
                    <p key={i} className="lecon-tuto-texte" dangerouslySetInnerHTML={{ __html: texte }} />
                ))}
                <button className="btn-menu btn-jouer" onClick={onContinuer}>J'ai compris</button>
            </div>
        </div>
    );
}
