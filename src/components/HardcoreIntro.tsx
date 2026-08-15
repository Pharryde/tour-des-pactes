interface HardcoreIntroProps {
    onEntrer: () => void;
    onRetour: () => void;
}

// Écran de consentement éclairé, affiché AVANT la bascule (qui recharge la page, cf. basculerProfil).
// Le mode change assez de choses pour qu'un joueur ne doive jamais y entrer sans les avoir lues.
export function HardcoreIntro({ onEntrer, onRetour }: HardcoreIntroProps) {
    return (
        <div id="ecran-hardcore-intro" className="ecran">
            <h1 className="titre-geant c-rose">☠️ MODE HARDCORE</h1>
            <p className="texte-fin">
                Vous avez vaincu la Tour et vous en êtes sorti. Elle vous rouvre ses portes — mais
                cette fois, elle ne pardonnera rien.
            </p>

            <div className="hardcore-regles">
                <div className="hardcore-regle">
                    <span className="hardcore-regle-icone">💀</span>
                    <span><b>La mort efface tout.</b> Pactes, XP, points de compétence : votre profil hardcore repart de zéro. Seul le Pacte du Chat vous suit.</span>
                </div>
                <div className="hardcore-regle">
                    <span className="hardcore-regle-icone">🚪</span>
                    <span><b>Une porte à chaque étage.</b> À la fin de chaque étage, avant la Zone de Repos, la Tour vous propose de sortir. La franchir met tout votre butin à l'abri, pour de bon.</span>
                </div>
                <div className="hardcore-regle">
                    <span className="hardcore-regle-icone">⛓️</span>
                    <span><b>Refuser la porte, c'est tout miser.</b> Elle ne se rouvrira pas avant le prochain Gardien vaincu.</span>
                </div>
                <div className="hardcore-regle">
                    <span className="hardcore-regle-icone">🔨</span>
                    <span><b>Le Forgeron et la Roue de la Chance sont là dès le premier pas.</b> Plus aucune run d'attente.</span>
                </div>
                <div className="hardcore-regle">
                    <span className="hardcore-regle-icone">🛡️</span>
                    <span><b>Votre partie normale reste intacte.</b> Les deux progressions sont séparées et vous pourrez revenir à l'autre quand vous voudrez.</span>
                </div>
                <div className="hardcore-regle">
                    <span className="hardcore-regle-icone">📖</span>
                    <span><b>Ce que vous savez reste su.</b> Archives, Synergies découvertes et bestiaire ne s'oublient pas — seule la puissance se perd.</span>
                </div>
            </div>

            <div className="menu-vertical">
                <button className="btn-menu btn-danger" onClick={onEntrer}>☠️ Entrer en Mode Hardcore</button>
                <button className="btn-menu" onClick={onRetour}>Retour</button>
            </div>
        </div>
    );
}
