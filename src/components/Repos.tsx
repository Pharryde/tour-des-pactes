interface ReposProps {
    soin: number;
    gainPv: number;
    onChoix: (choix: 'soin' | 'atk' | 'pre' | 'def' | 'pv') => void;
}

export function Repos({ soin, gainPv, onChoix }: ReposProps) {
    return (
        <div id="ecran-repos" className="ecran">
            <h1>Zone de Repos</h1>
            <p style={{ marginBottom: '20px' }}>Le chemin est dégagé pour l'instant. Choisissez une amélioration avant le prochain étage :</p>
            
            <div className="repos-container">
                <div className="repos-col">
                    <button className="btn-action bg-vert" onClick={() => onChoix('soin')}>❤️ Se soigner (+{soin} PV)</button>
                    <button className="btn-action bg-violet" onClick={() => onChoix('pv')}>💖 Renforcement (+{gainPv} PV Max)</button>
                </div>
                <div className="repos-col">
                    <button className="btn-action bg-rose" onClick={() => onChoix('atk')}>⚔️ Aiguiser l'Arme (+2 Attaque Base)</button>
                    <button className="btn-action bg-orange" onClick={() => onChoix('pre')}>🎯 Ajuster la Mire (+1 Précision Base)</button>
                    <button className="btn-action bg-bleu" onClick={() => onChoix('def')}>🛡️ Renforcer l'Armure (+2 Défense Base)</button>
                </div>
            </div>
        </div>
    );
}