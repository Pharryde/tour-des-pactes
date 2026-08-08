import type { ChoixRepos, Entite } from '../types';
import { calculerAttaqueAffichee, calculerPreciseAffichee, calculerPaliersEsquiveAffiches } from '../utils/combat';

interface ReposProps {
    joueur: Entite;
    soin: number;
    gainPv: number;
    choixActifs: ChoixRepos[] | null;
    onChoix: (choix: ChoixRepos) => void;
}

export function Repos({ joueur, soin, gainPv, choixActifs, onChoix }: ReposProps) {
    // `null` = tous les choix sont actifs (1ère visite de la run). Ensuite, seuls 3 des 5 tirés
    // aléatoirement sont utilisables : les 2 autres restent visibles mais grisés.
    const estActif = (choix: ChoixRepos) => choixActifs === null || choixActifs.includes(choix);

    // Mêmes fonctions d'affichage que l'arène : les bonus qui n'agissent qu'au moment du calcul
    // (Puissance Brute, Ombre, Bénédictions...) seraient invisibles si on lisait baseA/baseP bruts.
    const paliers = calculerPaliersEsquiveAffiches(joueur);

    return (
        <div id="ecran-repos" className="ecran">
            <h1>Zone de Repos</h1>
            <p className="repos-intro">Le chemin est dégagé pour l'instant. Choisissez une amélioration avant le prochain étage :</p>

            <div className="repos-stats">
                <h2 className="repos-stats-titre">Votre état actuel</h2>
                <div className="repos-stats-grille">
                    <div className="repos-stat">
                        <span className="repos-stat-valeur pv">❤️ {joueur.pv} / {joueur.pvMax}</span>
                        <span className="repos-stat-label">Points de Vie</span>
                    </div>
                    <div className="repos-stat">
                        <span className="repos-stat-valeur">⚔️ {calculerAttaqueAffichee(joueur)}</span>
                        <span className="repos-stat-label">Attaque</span>
                    </div>
                    <div className="repos-stat">
                        <span className="repos-stat-valeur">🎯 {calculerPreciseAffichee(joueur)}</span>
                        <span className="repos-stat-label">Précise</span>
                    </div>
                    <div className="repos-stat">
                        <span className="repos-stat-valeur armure">🛡️ {joueur.baseD}</span>
                        <span className="repos-stat-label">Défense</span>
                    </div>
                </div>
                <p className="repos-stat-esquive">
                    <span className="esquive">💨 Esquive</span> — {paliers[0] > 0 && <>Nv.0 : {paliers[0]}% · </>}
                    Nv.1 : {paliers[1]}% · Nv.2 : {paliers[2]}% · Nv.3 : {paliers[3]}% <b>(palier maximum)</b>
                </p>
            </div>

            <div className="repos-container">
                <div className="repos-col">
                    <button className="btn-action bg-vert" onClick={() => onChoix('soin')} disabled={!estActif('soin')}>❤️ Se soigner (+{soin} PV)</button>
                    <button className="btn-action bg-violet" onClick={() => onChoix('pv')} disabled={!estActif('pv')}>💖 Renforcement (+{gainPv} PV Max)</button>
                </div>
                <div className="repos-col">
                    <button className="btn-action bg-rose" onClick={() => onChoix('atk')} disabled={!estActif('atk')}>⚔️ Aiguiser l'Arme (+2 Attaque Base)</button>
                    <button className="btn-action bg-orange" onClick={() => onChoix('pre')} disabled={!estActif('pre')}>🎯 Ajuster la Mire (+1 Précision Base)</button>
                    <button className="btn-action bg-bleu" onClick={() => onChoix('def')} disabled={!estActif('def')}>🛡️ Renforcer l'Armure (+2 Défense Base)</button>
                </div>
            </div>
        </div>
    );
}
