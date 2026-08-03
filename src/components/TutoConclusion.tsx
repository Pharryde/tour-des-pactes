interface TutoConclusionProps {
    onContinuer: () => void;
}

export function TutoConclusion({ onContinuer }: TutoConclusionProps) {
    return (
        <div id="ecran-tuto-conclusion" className="ecran">
            <h1 className="titre-geant c-orange">🐈 ??? — La Vérité</h1>
            <p className="texte-fin">
                Le chat se redresse. Sa silhouette se dissout lentement en une brume argentée.
                <br /><br />
                "Je ne suis pas qu'un simple chat, voyageur. Je suis l'Esprit de cette Tour — son âme,
                sa mémoire, sa prison. Depuis des siècles, la corruption ronge mes Gardiens un par un.
                J'ai besoin de toi pour... nettoyer cette Tour."
                <br /><br />
                "Chacun d'eux garde jalousement un Pacte — un pouvoir passif que tu pourras équiper
                depuis ton inventaire pour te renforcer, une fois qu'il te l'aura arraché. Tiens, en
                gage de bonne foi... prends le mien."
                <br /><br />
                Une lumière chaude vous enveloppe.
                <br /><br />
                "Pour t'aider dans cette quête, je te fais don de la <b>Vie Éternelle</b>. Tu ne mourras
                plus jamais pour de bon : à chaque chute, tu te réveilleras au pied de la Tour, prêt à
                repartir à l'assaut."
            </p>
            <button className="btn-menu btn-jouer" onClick={onContinuer}>Commencer l'ascension</button>
        </div>
    );
}
