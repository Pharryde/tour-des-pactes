import { useEffect, useState, useRef } from 'react';
import type { Entite, ActionType } from '../types';
import { genererActionsMonstre, corrigerActionsPourLimiteCombo, SYMBOLES } from '../utils/combat';
import { genererBadgesPactes } from '../utils/pactes';
import { jouer_tour } from 'moteur_wasm';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { chargerEtatCombat, usePersisterCombat } from '../hooks/useCombatResume';

interface CombatAreneProps {
    joueurInitial: Entite;
    monstreInitial: Entite;
    nomEtage: string;
    numeroEtage: number;
    totalEtages: number;
    numeroSalle: number;
    totalSalles: number;
    pactesEquipes: string[];
    logsGlobaux: string[];
    ajouterLogGlobal: (log: string) => void;
    onFinDeCombat: (victoire: boolean, joueurRestant: Entite, doubleKO?: boolean) => void;
    onAbandon: () => void;
    enCombatPacte: boolean;
}

export function CombatArene({
    joueurInitial, monstreInitial, nomEtage, numeroEtage, totalEtages, numeroSalle, totalSalles,
    pactesEquipes, logsGlobaux, ajouterLogGlobal, onFinDeCombat, onAbandon,
    enCombatPacte
}: CombatAreneProps) {

    const combatKey = `${nomEtage}-${numeroSalle}-${enCombatPacte}`;

    const [etatInitial] = useState(() => chargerEtatCombat(combatKey, {
        joueur: joueurInitial, monstre: monstreInitial, tourActuel: 1, actionsMonstre: [], actionsJoueur: []
    }));

    const [joueur, setJoueur] = useState<Entite>(etatInitial.joueur);
    const [monstre, setMonstre] = useState<Entite>(etatInitial.monstre);
    const [tourActuel, setTourActuel] = useState<number>(etatInitial.tourActuel);
    const [actionsMonstre, setActionsMonstre] = useState<ActionType[]>(etatInitial.actionsMonstre);
    const [actionsJoueur, setActionsJoueur] = useState<ActionType[]>(etatInitial.actionsJoueur);
    const [combatEnCours, setCombatEnCours] = useState(false);

    usePersisterCombat(combatKey, joueur, monstre, tourActuel, actionsMonstre, actionsJoueur, combatEnCours);

    const [comboAffichageJ, setComboAffichageJ] = useState<{type: ActionType|null, count: number}>({type: null, count: 0});
    const [comboAffichageM, setComboAffichageM] = useState<{type: ActionType|null, count: number}>({type: null, count: 0});

    const [modeResolution, setModeResolution] = useLocalStorage<'auto'|'manuel'>('tdp_mode_reso', 'auto');
    const [vitesseResolution, setVitesseResolution] = useLocalStorage<number>('tdp_vitesse_reso', 1);
    
    const [attenteManuelle, setAttenteManuelle] = useState(false);
    const resolveManualStepRef = useRef<(() => void) | null>(null);
    const modeResolutionRef = useRef<'auto'|'manuel'>(modeResolution);
    const vitesseRef = useRef<number>(vitesseResolution);

    const logEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => { 
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [logsGlobaux]);
    
    // Ajustement d'état pendant le rendu (pattern recommandé par React) plutôt qu'un setState
    // dans un useEffect : dès qu'un nouveau tour démarre (actionsMonstre vidées), on tire les
    // actions du monstre. La condition redevient fausse dès que l'état est mis à jour, donc pas
    // de boucle de rendu infinie.
    if (actionsMonstre.length === 0 && !combatEnCours) {
        const generated = genererActionsMonstre(monstre);
        // Le joueur applique son Pacte Lvl 1/2 sur le monstre
        setActionsMonstre(corrigerActionsPourLimiteCombo(generated, joueur.limiteComboMax ?? 5));
    }

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

    const basculerVitesse = () => {
        const nextVitesse = vitesseResolution === 1 ? 2 : vitesseResolution === 2 ? 4 : 1;
        setVitesseResolution(nextVitesse);
        vitesseRef.current = nextVitesse;
    };

    const attendreEtape = async (ms: number) => {
        if (modeResolutionRef.current === 'auto') {
            await new Promise(r => setTimeout(r, ms / vitesseRef.current));
        } else {
            setAttenteManuelle(true);
            await new Promise<void>(resolve => { resolveManualStepRef.current = resolve; });
        }
    };

    const peutAjouterAction = (action: ActionType) => {
        if (combatEnCours || actionsJoueur.length >= 5) return false;
        
        const limite = monstre.limiteComboMax ?? 5; 
        
        let actionsSuite = 0;
        for (let i = actionsJoueur.length - 1; i >= 0; i--) {
            if (actionsJoueur[i] === action) {
                actionsSuite++;
            } else {
                break;
            }
        }
        
        return actionsSuite < limite;
    };

    const validerTour = async () => {
        if (actionsJoueur.length !== 5) return;
        setCombatEnCours(true);
        ajouterLogGlobal(`<div class="log-tour">--- TOUR ${tourActuel} ---</div>`);

        let resultat;
        try {
            resultat = jouer_tour(joueur, monstre, actionsJoueur, actionsMonstre, tourActuel);
        } catch (error) {
            console.error("Panique dans le module WASM:", error);
            ajouterLogGlobal(`<div class="log-mort">❌ Une erreur critique est survenue lors de la résolution (Panique WASM). Le tour a été annulé pour éviter un blocage.</div>`);
            setActionsJoueur([]);
            setCombatEnCours(false);
            return;
        }

        const currentJoueur = { ...joueur }; const currentMonstre = { ...monstre };
        const localComboJ = { ...comboAffichageJ }; const localComboM = { ...comboAffichageM };
        
        let indexDesActionsCombats = 0;

        for (let i = 0; i < resultat.etapes.length; i++) {
            const etape = resultat.etapes[i];
            
            if (etape.estAction) {
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
            for (const logFin of resultat.logsFinTour) { ajouterLogGlobal(logFin); }
            await attendreEtape(600);
        }

        if (resultat.joueur.pv > 0 && resultat.monstre.pv > 0) {
            if (tourActuel % 5 === 0 && pactesEquipes.includes("Pacte de la Vie II")) {
                const healAmount = Math.floor(resultat.joueur.pvMax * 0.10);
                resultat.joueur.pv = Math.min(resultat.joueur.pvMax, resultat.joueur.pv + healAmount);
                ajouterLogGlobal(`<div class="log-soin">✨ Pacte de la Vie II : Vous récupérez ${healAmount} PV ! (Tour ${tourActuel})</div>`);
                await attendreEtape(600);
            }
        }

        setJoueur(resultat.joueur);
        setMonstre(resultat.monstre);

        if (resultat.joueur.pv <= 0 && resultat.monstre.pv <= 0) {
            ajouterLogGlobal(`<br><span class="log-mort">🩸 DOUBLE KO ! Vous avez emporté ${resultat.monstre.nom} avec vous !</span>`);
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1500 / vitesseRef.current));
            onFinDeCombat(false, resultat.joueur, true); 
        } else if (resultat.joueur.pv <= 0) {
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1000 / vitesseRef.current));
            onFinDeCombat(false, resultat.joueur, false);
        } else if (resultat.monstre.pv <= 0) {
            ajouterLogGlobal(`<br><span class="log-mort">🩸 ${resultat.monstre.nom} est mort !</span>`);
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1500 / vitesseRef.current));
            onFinDeCombat(true, resultat.joueur, false);
        } else {
            ajouterLogGlobal(`<div class="log-reset">(Fin du tour : Défenses et Combos réinitialisés)</div>`);
            setComboAffichageJ({type: null, count: 0}); setComboAffichageM({type: null, count: 0});
            setActionsJoueur([]); setActionsMonstre([]); 
            setTourActuel(t => t + 1); setCombatEnCours(false);
        }
    };

    let titreEtage = `Étage ${numeroEtage}/${totalEtages} : ${nomEtage} - Salle ${numeroSalle + 1}/${totalSalles}`;
    if (numeroSalle === totalSalles - 1) {
        titreEtage = `Étage ${numeroEtage}/${totalEtages} : ${nomEtage} - 👑 SALLE DU BOSS`;
    }
    
    const titreMonstreFinal = numeroSalle === totalSalles - 1 ? monstre.nom : `👿 ${monstre.nom}`;
    const badges = genererBadgesPactes(pactesEquipes);

    return (
        <div className="arene-wrapper">

            <div className="combat-header">
                <div className="combat-header-actions">
                    <button
                        onClick={() => { if (window.confirm("Abandonner l'ascension en cours ?")) onAbandon(); }}
                        className="btn-abandonner"
                        disabled={combatEnCours}
                    >
                        🏳️ Abandonner
                    </button>

                    <div className="combat-toggle-groupe">
                        <span className="combat-toggle-label">Vitesse</span>
                        <button className="btn-systeme btn-systeme--compact" onClick={basculerVitesse}>
                            x{vitesseResolution}
                        </button>
                    </div>

                    <div className="combat-toggle-groupe">
                        <span className="combat-toggle-label">Mode</span>
                        <button className="btn-systeme btn-systeme--compact" onClick={basculerModeResolution}>
                            {modeResolution === 'auto' ? 'Auto' : 'Manuel'}
                        </button>
                        {modeResolution === 'manuel' && combatEnCours && attenteManuelle && (
                            <button className="btn-systeme btn-suivant-manuel" onClick={etapeSuivanteManuelle}>
                                ⏩ Suivant
                            </button>
                        )}
                    </div>
                </div>

                <div className="combat-header-pactes">
                    {badges.length === 0 ? <span className="pacte-aucun">Aucun Pacte</span> : badges.map(b => (
                        <span key={b.nom} className="pacte-badge" title={b.desc}>{b.nom} {b.desc}</span>
                    ))}
                </div>
            </div>

            <div id="etage-info">{titreEtage}</div>

            <div className="arene">
                <div className="entite">
                    <h2>🧑 {joueur.nom}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {joueur.pv} / {joueur.pvMax}</span> | <span className="armure">🛡️ {joueur.armure}</span> | <span className="esquive">💨 Nv.{joueur.nivEsquive} ({joueur.paliersEsquive[Math.min(joueur.nivEsquive, 3)]}%)</span>
                    </div>
                    <div className="stats-base">⚔️ {joueur.baseA} | 🎯 {joueur.baseP} | 🛡️ {joueur.baseD}</div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageJ)}</span>
                </div>

                <div className="entite">
                    <h2>{titreMonstreFinal}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {monstre.pv} / {monstre.pvMax}</span> | <span className="armure">🛡️ {monstre.armure}</span> | <span className="esquive">💨 Nv.{monstre.nivEsquive} ({monstre.paliersEsquive[Math.min(monstre.nivEsquive, 3)]}%)</span>
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

            <div className="actions-box actions-box--joueur">
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="action-slot">{actionsJoueur[i] ? SYMBOLES[actionsJoueur[i]] : ''}</div>)}
            </div>

            <div className="controles">
                <button className="btn-action" id="btn-a" onClick={() => {if (peutAjouterAction('A')) setActionsJoueur([...actionsJoueur, 'A'])}} disabled={!peutAjouterAction('A')}>⚔️ Attaque</button>
                <button className="btn-action" id="btn-p" onClick={() => {if (peutAjouterAction('P')) setActionsJoueur([...actionsJoueur, 'P'])}} disabled={!peutAjouterAction('P')}>🎯 Précise</button>
                <button className="btn-action" id="btn-d" onClick={() => {if (peutAjouterAction('D')) setActionsJoueur([...actionsJoueur, 'D'])}} disabled={!peutAjouterAction('D')}>🛡️ Défense</button>
                <button className="btn-action" id="btn-e" onClick={() => {if (peutAjouterAction('E')) setActionsJoueur([...actionsJoueur, 'E'])}} disabled={!peutAjouterAction('E')}>💨 Esquive</button>
            </div>

            <div className="controles-systeme">
                <button className="btn-systeme" onClick={effacerDerniereAction} disabled={combatEnCours || actionsJoueur.length === 0}>↩️ Annuler</button>
                <button className="btn-systeme" onClick={validerTour} disabled={combatEnCours || actionsJoueur.length < 5}>▶️ Valider</button>
            </div>

            <div id="log">
                {logsGlobaux.map((log, index) => (
                    <div key={index} dangerouslySetInnerHTML={{ __html: log }} />
                ))}
                <div ref={logEndRef} className="log-anchor" />
            </div>
        </div>
    );
}