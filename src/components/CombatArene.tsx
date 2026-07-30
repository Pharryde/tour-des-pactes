// src/components/CombatArene.tsx
import { useEffect, useState, useRef } from 'react';
import type { Entite, ActionType } from '../types';
import { genererActionsMonstre, SYMBOLES } from '../utils/combat';
import { genererBadgesPactes } from '../utils/pactes';
import { jouer_tour } from 'moteur_wasm';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CombatAreneProps {
    joueurInitial: Entite;
    monstreInitial: Entite;
    nomEtage: string;
    numeroSalle: number;
    totalSalles: number;
    pactesEquipes: string[];
    logsGlobaux: string[];
    ajouterLogGlobal: (log: string) => void;
    onFinDeCombat: (victoire: boolean, joueurRestant: Entite) => void;
    onAbandon: () => void;
}

const lireCache = <T,>(cle: string, defaut: T): T => {
    try { const item = window.localStorage.getItem(cle); return item ? JSON.parse(item) : defaut; } 
    catch { return defaut; }
};

export function CombatArene({ 
    joueurInitial, monstreInitial, nomEtage, numeroSalle, totalSalles, 
    pactesEquipes, logsGlobaux, ajouterLogGlobal, onFinDeCombat, onAbandon
}: CombatAreneProps) {
    
    const combatKey = `${nomEtage}-${numeroSalle}`;
    const isResume = lireCache('tdp_active_combat_key', '') === combatKey;

    const [joueur, setJoueur] = useState<Entite>(() => isResume ? lireCache('tdp_c_joueur', joueurInitial) : joueurInitial);
    const [monstre, setMonstre] = useState<Entite>(() => isResume ? lireCache('tdp_c_monstre', monstreInitial) : monstreInitial);
    const [tourActuel, setTourActuel] = useState<number>(() => isResume ? lireCache('tdp_c_tour', 1) : 1);
    const [actionsMonstre, setActionsMonstre] = useState<ActionType[]>(() => isResume ? lireCache('tdp_c_actions_m', []) : []);
    const [actionsJoueur, setActionsJoueur] = useState<ActionType[]>(() => isResume ? lireCache('tdp_c_actions_j', []) : []);
    const [combatEnCours, setCombatEnCours] = useState(false);

    useEffect(() => {
        if (combatEnCours) return; 
        window.localStorage.setItem('tdp_active_combat_key', JSON.stringify(combatKey));
        window.localStorage.setItem('tdp_c_joueur', JSON.stringify(joueur));
        window.localStorage.setItem('tdp_c_monstre', JSON.stringify(monstre));
        window.localStorage.setItem('tdp_c_tour', JSON.stringify(tourActuel));
        window.localStorage.setItem('tdp_c_actions_m', JSON.stringify(actionsMonstre));
        window.localStorage.setItem('tdp_c_actions_j', JSON.stringify(actionsJoueur));
    }, [combatKey, joueur, monstre, tourActuel, actionsMonstre, actionsJoueur, combatEnCours]);

    const [comboAffichageJ, setComboAffichageJ] = useState<{type: ActionType|null, count: number}>({type: null, count: 0});
    const [comboAffichageM, setComboAffichageM] = useState<{type: ActionType|null, count: number}>({type: null, count: 0});

    const [modeResolution, setModeResolution] = useLocalStorage<'auto'|'manuel'>('tdp_mode_reso', 'auto');
    const [attenteManuelle, setAttenteManuelle] = useState(false);
    const resolveManualStepRef = useRef<(() => void) | null>(null);
    const modeResolutionRef = useRef<'auto'|'manuel'>(modeResolution);

    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logsGlobaux]);
    
    // CORRECTION MAJEURE ANTI-TRICHE ET ANTI-STRICT MODE : 
    // On ne génère les actions de l'ennemi QUE si sa liste est vide.
    useEffect(() => { 
        if (actionsMonstre.length === 0 && !combatEnCours) {
            setActionsMonstre(genererActionsMonstre(monstre));
        }
    }, [actionsMonstre.length, monstre, combatEnCours]);

    const formatterCombo = (comboObj: {type: ActionType|null, count: number}) => {
        if(comboObj.count <= 1 || comboObj.type === 'E' || comboObj.type === null) return "Aucun";
        return `${SYMBOLES[comboObj.type]} x${comboObj.count}`;
    };

    const effacerDerniereAction = () => {
        if (actionsJoueur.length > 0) setActionsJoueur(prev => prev.slice(0, -1));
    };

    const basculerModeResolution = () => {
        const nouveauMode = modeResolution === 'auto' ? 'manuel' : 'auto';
        setModeResolution(nouveauMode);
        modeResolutionRef.current = nouveauMode;
        
        if (nouveauMode === 'auto' && resolveManualStepRef.current) {
            resolveManualStepRef.current();
            resolveManualStepRef.current = null;
            setAttenteManuelle(false);
        }
    };

    const etapeSuivanteManuelle = () => {
        if (resolveManualStepRef.current) {
            resolveManualStepRef.current();
            resolveManualStepRef.current = null;
            setAttenteManuelle(false);
        }
    };

    const attendreEtape = async (ms: number) => {
        if (modeResolutionRef.current === 'auto') {
            await new Promise(r => setTimeout(r, ms));
        } else {
            setAttenteManuelle(true);
            await new Promise<void>(resolve => { resolveManualStepRef.current = resolve; });
        }
    };

    const validerTour = async () => {
        if (actionsJoueur.length !== 5) return;
        setCombatEnCours(true);
        ajouterLogGlobal(`<div class="log-tour">--- TOUR ${tourActuel} ---</div>`);

        const resultat = jouer_tour(joueur, monstre, actionsJoueur, actionsMonstre, tourActuel);

        let currentJoueur = { ...joueur }; let currentMonstre = { ...monstre };
        let localComboJ = { ...comboAffichageJ }; let localComboM = { ...comboAffichageM };
        
        let indexDesActionsCombats = 0;

        for (let i = 0; i < resultat.etapes.length; i++) {
            const etape = resultat.etapes[i];
            
            if (etape.log.includes("Action ")) {
                const actJ = actionsJoueur[indexDesActionsCombats];
                const actM = actionsMonstre[indexDesActionsCombats];
                
                if (localComboJ.type === actJ) localComboJ.count++; else { localComboJ.type = actJ; localComboJ.count = 1; }
                if (localComboM.type === actM) localComboM.count++; else { localComboM.type = actM; localComboM.count = 1; }
                
                indexDesActionsCombats++;
            }

            setComboAffichageJ({...localComboJ}); setComboAffichageM({...localComboM});
            ajouterLogGlobal(etape.log);
            
            currentJoueur.pv = etape.joueurPv; 
            currentJoueur.armure = etape.joueurArmure;
            currentJoueur.nivEsquive = etape.joueurNivEsquive ?? currentJoueur.nivEsquive; 
            
            currentMonstre.pv = etape.monstrePv; 
            currentMonstre.armure = etape.monstreArmure;
            currentMonstre.nivEsquive = etape.monstreNivEsquive ?? currentMonstre.nivEsquive;
            
            setJoueur({ ...currentJoueur }); setMonstre({ ...currentMonstre });
            
            await attendreEtape(600); 
        }

        if (resultat.logsFinTour.length > 0) {
            for (let logFin of resultat.logsFinTour) { ajouterLogGlobal(logFin); }
            await attendreEtape(600);
        }

        setJoueur(resultat.joueur);
        setMonstre(resultat.monstre);

        if (resultat.joueur.pv <= 0) {
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1000));
            onFinDeCombat(false, resultat.joueur);
        } else if (resultat.monstre.pv <= 0) {
            ajouterLogGlobal(`<br><span class="log-mort">🩸 ${resultat.monstre.nom} est mort !</span>`);
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1500));
            onFinDeCombat(true, resultat.joueur);
        } else {
            ajouterLogGlobal(`<div class="log-reset">(Fin du tour : Défenses et Combos réinitialisés)</div>`);
            setComboAffichageJ({type: null, count: 0}); setComboAffichageM({type: null, count: 0});
            
            // LA CORRECTION EST LÀ : En fin de tour on force les actions à vide.
            // Cela provoquera le useEffect de génération des actions, proprement.
            setActionsJoueur([]); 
            setActionsMonstre([]); 
            
            setTourActuel(t => t + 1); 
            setCombatEnCours(false);
        }
    };

    let titreEtage = `${nomEtage} - Salle ${numeroSalle + 1}/${totalSalles}`;
    if (numeroSalle === totalSalles - 1) titreEtage = `${nomEtage} - 👑 SALLE DU BOSS`;
    if (nomEtage === "⚠️ COMBAT POUR LE PACTE ⚠️") titreEtage = nomEtage;

    const badges = genererBadgesPactes(pactesEquipes);

    return (
        <div className="arene-wrapper" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <button 
                    onClick={() => { if (window.confirm("Abandonner l'ascension en cours ?")) onAbandon(); }} 
                    style={{ padding: '4px 8px', fontSize: '0.85em', background: 'transparent', border: '1px solid #f38ba8', color: '#f38ba8', borderRadius: '4px', cursor: 'pointer' }}
                    disabled={combatEnCours}
                >
                    🏳️ Abandonner
                </button>

                <div id="pactes-actifs-liste" style={{ flex: 1, textAlign: 'right' }}>
                    {badges.length === 0 ? "Aucun Pacte" : badges.map(b => (
                        <span key={b.nom} className="pacte-badge" title={b.desc}>{b.nom} {b.desc}</span>
                    ))}
                </div>
            </div>

            <div id="etage-info">{titreEtage}</div>
            
            <div className="arene">
                <div className="entite">
                    <h2>🧑 {joueur.nom}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {joueur.pv} / {joueur.pvMax}</span> | <span className="armure">🛡️ {joueur.armure}</span>
                        <br/><span className="esquive">💨 Nv.{joueur.nivEsquive} ({joueur.paliersEsquive[Math.min(joueur.nivEsquive, 3)]}%)</span>
                    </div>
                    <div className="stats-base">⚔️ {joueur.baseA} | 🎯 {joueur.baseP} | 🛡️ {joueur.baseD}</div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageJ)}</span>
                </div>

                <div className="entite">
                    <h2>😈 {monstre.nom}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {monstre.pv} / {monstre.pvMax}</span> | <span className="armure">🛡️ {monstre.armure}</span>
                        <br/><span className="esquive">💨 Nv.{monstre.nivEsquive} ({monstre.paliersEsquive[Math.min(monstre.nivEsquive, 3)]}%)</span>
                    </div>
                    <div className="stats-base">⚔️ {monstre.baseA} | 🎯 {monstre.baseP} | 🛡️ {monstre.baseD}</div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageM)}</span>
                    <div className="actions-box">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="action-slot">
                                {actionsMonstre[i] ? (monstre.actionsCachees ? '❓' : SYMBOLES[actionsMonstre[i]]) : ''}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="actions-box" style={{ marginTop: '10px' }}>
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="action-slot">{actionsJoueur[i] ? SYMBOLES[actionsJoueur[i]] : ''}</div>)}
            </div>

            <div className="controles" style={{ marginTop: '10px' }}>
                <button className="btn-action" id="btn-a" onClick={() => {if (actionsJoueur.length < 5) setActionsJoueur([...actionsJoueur, 'A'])}} disabled={combatEnCours}>⚔️ Attaque</button>
                <button className="btn-action" id="btn-p" onClick={() => {if (actionsJoueur.length < 5) setActionsJoueur([...actionsJoueur, 'P'])}} disabled={combatEnCours}>🎯 Précise</button>
                <button className="btn-action" id="btn-d" onClick={() => {if (actionsJoueur.length < 5) setActionsJoueur([...actionsJoueur, 'D'])}} disabled={combatEnCours}>🛡️ Défense</button>
                <button className="btn-action" id="btn-e" onClick={() => {if (actionsJoueur.length < 5) setActionsJoueur([...actionsJoueur, 'E'])}} disabled={combatEnCours}>💨 Esquive</button>
                <button className="btn-systeme" onClick={effacerDerniereAction} disabled={combatEnCours || actionsJoueur.length === 0}>↩️ Annuler</button>
                <button className="btn-systeme" onClick={validerTour} disabled={combatEnCours || actionsJoueur.length < 5}>▶️ Fin de Tour</button>
            </div>

            <div className="controles" style={{ marginTop: '10px', backgroundColor: '#181825', padding: '15px', borderRadius: '8px' }}>
                <span style={{ marginRight: '15px' }}>Mode Résolution : <strong>{modeResolution === 'auto' ? 'Automatique' : 'Étape par étape'}</strong></span>
                <button className="btn-systeme" onClick={basculerModeResolution} style={{ fontSize: '0.9em', padding: '8px 12px' }}>
                    🔄 Changer
                </button>
                {modeResolution === 'manuel' && combatEnCours && attenteManuelle && (
                    <button className="btn-systeme" onClick={etapeSuivanteManuelle} style={{ backgroundColor: '#89b4fa', color: '#11111b', marginLeft: '10px', fontWeight: 'bold' }}>
                        ⏩ Action Suivante
                    </button>
                )}
            </div>

            <div id="log" style={{ marginTop: '10px' }}>
                {logsGlobaux.map((log, index) => (
                    <div key={index} dangerouslySetInnerHTML={{ __html: log }} />
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}