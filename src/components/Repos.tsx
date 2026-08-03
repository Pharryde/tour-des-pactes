import type { ChoixRepos } from '../types';

interface ReposProps {
    soin: number;
    gainPv: number;
    choixActifs: ChoixRepos[] | null;
    onChoix: (choix: ChoixRepos) => void;
}

export function Repos({ soin, gainPv, choixActifs, onChoix }: ReposProps) {
    // `null` = tous les choix sont actifs (1ère visite de la run). Ensuite, seuls 3 des 5 tirés
    // aléatoirement sont utilisables : les 2 autres restent visibles mais grisés.
    const estActif = (choix: ChoixRepos) => choixActifs === null || choixActifs.includes(choix);

    return (
        <div id="ecran-repos" className="ecran">
            <h1>Zone de Repos</h1>
            <p className="repos-intro">Le chemin est dégagé pour l'instant. Choisissez une amélioration avant le prochain étage :</p>

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