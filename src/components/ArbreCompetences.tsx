import { useEffect } from 'react';
import type { Competences } from '../types';

interface Props {
    xpTotal: number;
    competences: Competences;
    setCompetences: (c: Competences) => void;
    monstresTues: number;
    onRetour: () => void;
}

const calculerPointsCompetence = (xp: number) => {
    let pts = 0;
    if (xp >= 5) pts++;
    if (xp >= 10) pts++;
    if (xp >= 25) pts++;
    if (xp >= 50) pts++;
    if (xp >= 100) {
        pts++;
        pts += Math.floor((xp - 100) / 100);
    }
    return pts;
};

const calculerProchainPalier = (xp: number) => {
    if (xp < 5) return 5;
    if (xp < 10) return 10;
    if (xp < 25) return 25;
    if (xp < 50) return 50;
    if (xp < 100) return 100;
    return Math.floor(xp / 100) * 100 + 100;
};

const getPalierPrecedent = (xp: number) => {
    if (xp < 5) return 0;
    if (xp < 10) return 5;
    if (xp < 25) return 10;
    if (xp < 50) return 25;
    if (xp < 100) return 50;
    return Math.floor(xp / 100) * 100;
};

export function ArbreCompetences({ xpTotal, competences, setCompetences, monstresTues, onRetour }: Props) {
    
    const ptsTotal = calculerPointsCompetence(xpTotal);
    const ptsDepenses = (competences.pv || 0) + (competences.atk || 0) + (competences.def || 0) + ((competences.pre || 0) * 2) + (competences.esq || 0);
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

    const LigneComp = ({ nom, stat, cout, effet, icone }: { nom: string, stat: keyof Competences, cout: number, effet: string, icone: string }) => {
        const nv = competences[stat] || 0;
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#181825', padding: '15px', borderRadius: '8px', border: '1px solid #313244', marginBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <strong style={{ fontSize: '1.2em', color: '#cdd6f4' }}>{icone} {nom} <span style={{ color: '#89b4fa' }}>(Nv. {nv})</span></strong>
                    <span style={{ color: '#a6adc8', fontSize: '0.9em' }}>{effet} <span style={{ color: '#f38ba8' }}>(Coût: {cout} Point{cout > 1 ? 's' : ''})</span></span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => modifier(stat, cout, -1)} disabled={nv === 0} style={{ width: '40px', height: '40px', fontSize: '1.5em', backgroundColor: '#313244', color: nv === 0 ? '#6c7086' : '#f38ba8', border: 'none', borderRadius: '8px', cursor: nv === 0 ? 'not-allowed' : 'pointer' }}>-</button>
                    <button onClick={() => modifier(stat, cout, 1)} disabled={ptsDispo < cout} style={{ width: '40px', height: '40px', fontSize: '1.5em', backgroundColor: '#313244', color: ptsDispo < cout ? '#6c7086' : '#a6e3a1', border: 'none', borderRadius: '8px', cursor: ptsDispo < cout ? 'not-allowed' : 'pointer' }}>+</button>
                </div>
            </div>
        );
    };

    return (
        <div className="ecran" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '20px', backgroundColor: '#11111b', color: '#cdd6f4', overflowY: 'auto' }}>
            <h1 style={{ color: '#a6e3a1', fontSize: '2.5em', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>✨ Éclats d'Âme</h1>
            <p style={{ color: '#a6adc8', marginBottom: '20px', fontStyle: 'italic', textAlign: 'center' }}>Vous avez vaincu {monstresTues} monstre(s). Utilisez leur essence pour vous renforcer.</p>

            {/* BARRE DE PROGRESSION XP */}
            <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#1e1e2e', border: '1px solid #313244', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9em', color: '#cdd6f4' }}>
                    <span>Progression (XP)</span>
                    <span>{xpTotal} / {prochainPalier} XP</span>
                </div>
                <div style={{ width: '100%', height: '12px', backgroundColor: '#11111b', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pourcentageProgress}%`, height: '100%', backgroundColor: '#cba6f7', transition: 'width 0.3s ease' }}></div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8em', color: '#a6adc8', marginTop: '8px' }}>
                    Prochain Point de Compétence débloqué à {prochainPalier} XP
                </div>
            </div>

            {/* COMPTEUR DE POINTS DE COMPÉTENCE */}
            <div style={{ backgroundColor: '#181825', border: '2px solid #a6e3a1', padding: '15px 30px', borderRadius: '12px', marginBottom: '30px' }}>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold' }}>Points Disponibles : <span style={{ color: '#a6e3a1' }}>{ptsDispo}</span> / {ptsTotal}</span>
            </div>

            <div style={{ width: '100%', maxWidth: '600px' }}>
                <LigneComp icone="❤️" nom="Vitalité" stat="pv" cout={1} effet="+10 PV Max par niveau" />
                <LigneComp icone="🛡️" nom="Peau de Fer" stat="def" cout={1} effet="+1 Défense de base" />
                <LigneComp icone="⚔️" nom="Force Brute" stat="atk" cout={1} effet="+1 Attaque de base" />
                <LigneComp icone="🎯" nom="Œil de Faucon" stat="pre" cout={2} effet="+1 Précision de base" />
                <LigneComp icone="💨" nom="Réflexes" stat="esq" cout={1} effet="+5% d'Esquive max (si action utilisée)" />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                <button onClick={() => setCompetences({ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 })} style={{ padding: '15px 30px', fontSize: '1.1em', backgroundColor: 'transparent', color: '#f38ba8', border: '2px solid #f38ba8', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🔄 Réinitialiser l'Arbre
                </button>
                <button onClick={onRetour} className="btn-systeme" style={{ padding: '15px 30px', fontSize: '1.1em', backgroundColor: '#313244', color: '#cdd6f4', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🔙 Retour au Hub
                </button>
            </div>
        </div>
    );
}