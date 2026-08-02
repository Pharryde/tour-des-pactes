import { useEffect } from 'react';
import type { Competences } from '../types';
import { calculerPointsCompetence, calculerProchainPalier, getPalierPrecedent, calculerPointsDepenses } from '../utils/competences';

interface Props {
    xpTotal: number;
    competences: Competences;
    setCompetences: (c: Competences) => void;
    monstresTues: number;
    onRetour: () => void;
}

interface LigneCompProps {
    nom: string;
    icone: string;
    cout: number;
    effet: string;
    niveau: number;
    ptsDispo: number;
    onModifier: (direction: 1 | -1) => void;
}

function LigneComp({ nom, icone, cout, effet, niveau, ptsDispo, onModifier }: LigneCompProps) {
    return (
        <div className="ligne-comp">
            <div className="ligne-comp-info">
                <strong className="ligne-comp-nom">{icone} {nom} <span className="ligne-comp-niveau">(Nv. {niveau})</span></strong>
                <span className="ligne-comp-effet">{effet} <span className="ligne-comp-cout">(Coût: {cout} Point{cout > 1 ? 's' : ''})</span></span>
            </div>
            <div className="ligne-comp-actions">
                <button className="ligne-comp-btn" onClick={() => onModifier(-1)} disabled={niveau === 0}>-</button>
                <button className="ligne-comp-btn ligne-comp-btn--plus" onClick={() => onModifier(1)} disabled={ptsDispo < cout}>+</button>
            </div>
        </div>
    );
}

export function ArbreCompetences({ xpTotal, competences, setCompetences, monstresTues, onRetour }: Props) {

    const ptsTotal = calculerPointsCompetence(xpTotal);
    const ptsDepenses = calculerPointsDepenses(competences);
    const ptsDispo = ptsTotal - ptsDepenses;

    // Logique pour la barre de progression d'XP
    const prochainPalier = calculerProchainPalier(xpTotal);
    const palierPrecedent = getPalierPrecedent(xpTotal);
    const xpRequisePourPalier = prochainPalier - palierPrecedent;
    const xpAcquiseDansPalier = xpTotal - palierPrecedent;
    const pourcentageProgress = (xpAcquiseDansPalier / xpRequisePourPalier) * 100;

    useEffect(() => {
        if (ptsDispo < 0) setCompetences({ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
    }, [ptsDispo, setCompetences]);

    const modifier = (stat: keyof Competences, cout: number, direction: 1 | -1) => {
        if (direction === 1 && ptsDispo >= cout) {
            setCompetences({ ...competences, [stat]: (competences[stat] || 0) + 1 });
        } else if (direction === -1 && (competences[stat] || 0) > 0) {
            setCompetences({ ...competences, [stat]: (competences[stat] || 0) - 1 });
        }
    };

    return (
        <div className="ecran arbre-ecran">
            <h1 className="arbre-titre">✨ Éclats d'Âme</h1>
            <p className="arbre-soustitre">Vous avez vaincu {monstresTues} monstre(s). Utilisez leur essence pour vous renforcer.</p>

            {/* BARRE DE PROGRESSION XP */}
            <div className="xp-barre-box">
                <div className="xp-barre-header">
                    <span>Progression (XP)</span>
                    <span>{xpTotal} / {prochainPalier} XP</span>
                </div>
                <div className="xp-barre-piste">
                    <div className="xp-barre-remplissage" style={{ width: `${pourcentageProgress}%` }}></div>
                </div>
                <div className="xp-barre-footer">
                    Prochain Point de Compétence débloqué à {prochainPalier} XP
                </div>
            </div>

            {/* COMPTEUR DE POINTS DE COMPÉTENCE */}
            <div className="points-dispo-box">
                <span className="points-dispo-valeur">Points Disponibles : <strong>{ptsDispo}</strong> / {ptsTotal}</span>
            </div>

            <div className="arbre-competences-liste">
                <LigneComp icone="❤️" nom="Vitalité" cout={1} effet="+10 PV Max par niveau" niveau={competences.pv || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('pv', 1, dir)} />
                <LigneComp icone="🛡️" nom="Peau de Fer" cout={1} effet="+1 Défense de base" niveau={competences.def || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('def', 1, dir)} />
                <LigneComp icone="⚔️" nom="Force Brute" cout={1} effet="+1 Attaque de base" niveau={competences.atk || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('atk', 1, dir)} />
                <LigneComp icone="🎯" nom="Œil de Faucon" cout={2} effet="+1 Précision de base" niveau={competences.pre || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('pre', 2, dir)} />
                <LigneComp icone="💨" nom="Réflexes" cout={1} effet="+5% d'Esquive max (si action utilisée)" niveau={competences.esq || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('esq', 1, dir)} />
            </div>

            <div className="arbre-footer">
                <button onClick={() => setCompetences({ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 })} className="btn-reset-arbre">
                    🔄 Réinitialiser l'Arbre
                </button>
                <button onClick={onRetour} className="btn-retour">
                    🔙 Retour au Hub
                </button>
            </div>
        </div>
    );
}
