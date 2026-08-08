import { useEffect, useState, useRef } from 'react';
import type { Entite, ActionType, Competences, BenedictionChat } from '../types';
import { BENEDICTIONS_REGISTRY, POURCENTAGE_VIE_CHAT } from '../utils/benedictions';
import { genererActionsMonstre, corrigerActionsPourLimiteCombo, genererIndicesVisibles, calculerAttaqueAffichee, calculerPreciseAffichee, calculerPaliersEsquiveAffiches, SYMBOLES } from '../utils/combat';
import { detailAttaque, detailPrecise, detailDefense } from '../utils/detailStats';
import { tirerNouvelleForme, appliquerFormeMegaBoss } from '../utils/megaboss';
import { genererBadgesPactes } from '../utils/pactes';
import { jouer_tour } from 'moteur_wasm';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { chargerEtatCombat, usePersisterCombat } from '../hooks/useCombatResume';
import { ANIMATIONS, animationPourAction, animationResolution, type NomAnimation } from '../utils/animationsJoueur';
import { ANIMATIONS_MONSTRE, animationMonstrePourAction, animationResolutionMonstre, type NomAnimationMonstre } from '../utils/animationsMonstre';
import { ANIMATIONS_CHAT } from '../utils/animationsChat';
import { SpriteAnime } from './SpriteAnime';
import { StatDetail } from './StatDetail';

interface CombatAreneProps {
    joueurInitial: Entite;
    monstreInitial: Entite;
    nomEtage: string;
    numeroEtage: number;
    totalEtages: number;
    numeroSalle: number;
    totalSalles: number;
    pactesEquipes: string[];
    competences: Competences;
    logsGlobaux: string[];
    ajouterLogGlobal: (log: string) => void;
    ajouterStatsTour: (degatsInfliges: number, degatsBloques: number, degatsEsquives: number) => void;
    onFinDeCombat: (victoire: boolean, joueurRestant: Entite, doubleKO?: boolean) => void;
    onAbandon: () => void;
    enCombatPacte: boolean;
    formesMegaBoss?: Entite[];
    // Bénédiction du Chat tirée pour cette run : affichée en entête, et pour "Vie de Chat",
    // consommée ici même — le joueur se relève au lieu de mourir (voir utils/benedictions.ts).
    benedictionActive?: BenedictionChat | null;
    peutRessusciter?: boolean;
    onRessusciter?: () => void;
    // Tutoriel d'introduction (Chat Mystérieux) : actions du monstre scriptées tour par tour au
    // lieu d'être tirées aléatoirement, dialogue injecté dans le log avant chaque tour, et fin de
    // combat déclenchée après un nombre de tours fixe plutôt que par les PV (le PNJ est intuable).
    estTutoriel?: boolean;
    actionsMonstreScriptees?: ActionType[][];
    actionsAutoriseesTuto?: ActionType[][];
    dialogueTuto?: Record<number, string[]>;
    onFinTutoriel?: (joueurRestant: Entite) => void;
}

export function CombatArene({
    joueurInitial, monstreInitial, nomEtage, numeroEtage, totalEtages, numeroSalle, totalSalles,
    pactesEquipes, competences, logsGlobaux, ajouterLogGlobal, ajouterStatsTour, onFinDeCombat, onAbandon,
    enCombatPacte, formesMegaBoss, benedictionActive, peutRessusciter, onRessusciter,
    estTutoriel, actionsMonstreScriptees, actionsAutoriseesTuto, dialogueTuto, onFinTutoriel
}: CombatAreneProps) {

    const combatKey = `${nomEtage}-${numeroSalle}-${enCombatPacte}`;

    const [etatInitial] = useState(() => chargerEtatCombat(combatKey, {
        joueur: joueurInitial, monstre: monstreInitial, tourActuel: 1, actionsMonstre: [], actionsJoueur: [], indicesVisiblesMonstre: [0, 1, 2, 3, 4]
    }));

    const [joueur, setJoueur] = useState<Entite>(etatInitial.joueur);
    const [monstre, setMonstre] = useState<Entite>(etatInitial.monstre);
    const [tourActuel, setTourActuel] = useState<number>(etatInitial.tourActuel);
    const [actionsMonstre, setActionsMonstre] = useState<ActionType[]>(etatInitial.actionsMonstre);
    const [actionsJoueur, setActionsJoueur] = useState<ActionType[]>(etatInitial.actionsJoueur);
    const [indicesVisiblesMonstre, setIndicesVisiblesMonstre] = useState<number[]>(etatInitial.indicesVisiblesMonstre);
    const [combatEnCours, setCombatEnCours] = useState(false);

    usePersisterCombat(combatKey, joueur, monstre, tourActuel, actionsMonstre, actionsJoueur, indicesVisiblesMonstre, combatEnCours);

    const [comboAffichageJ, setComboAffichageJ] = useState<{type: ActionType|null, count: number}>({type: null, count: 0});
    const [comboAffichageM, setComboAffichageM] = useState<{type: ActionType|null, count: number}>({type: null, count: 0});
    const [spriteJoueur, setSpriteJoueur] = useState<NomAnimation>('idle');
    const [spriteMonstre, setSpriteMonstre] = useState<NomAnimationMonstre>('idle');

    const [modeResolution, setModeResolution] = useLocalStorage<'auto'|'manuel'>('tdp_mode_reso', 'auto');
    const [vitesseResolution, setVitesseResolution] = useLocalStorage<number>('tdp_vitesse_reso', 1);
    
    const [attenteManuelle, setAttenteManuelle] = useState(false);
    const resolveManualStepRef = useRef<(() => void) | null>(null);

    // Écran de résurrection de la Vie de Chat : suspend la résolution du tour jusqu'à ce que le
    // joueur l'acquitte (même principe que le pas-à-pas manuel juste au-dessus).
    const [attenteVieDeChat, setAttenteVieDeChat] = useState(false);
    const resolveVieDeChatRef = useRef<(() => void) | null>(null);
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
    // actions du monstre (et, pour le Gardien Absolu, sa nouvelle forme). La condition redevient
    // fausse dès que l'état est mis à jour, donc pas de boucle de rendu infinie.
    if (actionsMonstre.length === 0 && !combatEnCours) {
        let monstreDuTour = monstre;
        if (formesMegaBoss && formesMegaBoss.length > 0) {
            const nouvelleForme = tirerNouvelleForme(formesMegaBoss, monstre.nom);
            monstreDuTour = appliquerFormeMegaBoss(monstre, nouvelleForme);
            setMonstre(monstreDuTour);
        }
        const generated = actionsMonstreScriptees ? actionsMonstreScriptees[tourActuel - 1] : genererActionsMonstre(monstreDuTour);
        // Le joueur applique son Pacte Lvl 1/2 sur le monstre
        setActionsMonstre(corrigerActionsPourLimiteCombo(generated, joueur.limiteComboMax ?? 5));
        setIndicesVisiblesMonstre(genererIndicesVisibles(monstreDuTour.actionsVisibles));
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

    const reprendreApresVieDeChat = () => {
        setAttenteVieDeChat(false);
        resolveVieDeChatRef.current?.();
        resolveVieDeChatRef.current = null;
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

    // Transition brève TOUJOURS automatique (même en mode manuel) entre le beat 1 (action du
    // joueur) et le beat 2 (résolution) d'une même action : un seul "Suivant" doit suffire pour
    // faire avancer une action entière, pas un par sprite affiché.
    const attendreBeat = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms / vitesseRef.current));

    const peutAjouterAction = (action: ActionType) => {
        if (combatEnCours || actionsJoueur.length >= 5) return false;
        if (actionsAutoriseesTuto && !actionsAutoriseesTuto[tourActuel - 1]?.includes(action)) return false;

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
            setSpriteJoueur('idle');
            setSpriteMonstre('idle');
            return;
        }

        const currentJoueur = { ...joueur }; const currentMonstre = { ...monstre };
        const localComboJ = { ...comboAffichageJ }; const localComboM = { ...comboAffichageM };

        let indexDesActionsCombats = 0;
        let degatsInfligesTour = 0; let degatsBloquesTour = 0; let degatsEsquivesTour = 0;

        for (let i = 0; i < resultat.etapes.length; i++) {
            const etape = resultat.etapes[i];
            degatsInfligesTour += etape.degatsInfliges;
            degatsBloquesTour += etape.degatsBloques;
            degatsEsquivesTour += etape.degatsEsquives;

            if (etape.estAction) {
                const actJ = actionsJoueur[indexDesActionsCombats];
                const actM = actionsMonstre[indexDesActionsCombats];

                if (localComboJ.type === actJ) localComboJ.count++; else { localComboJ.type = actJ; localComboJ.count = 1; }
                if (localComboM.type === actM) localComboM.count++; else { localComboM.type = actM; localComboM.count = 1; }

                indexDesActionsCombats++;

                // Beat 1 : chacun exécute sa propre action programmée.
                setSpriteJoueur(animationPourAction(actJ));
                setSpriteMonstre(animationMonstrePourAction(actM));
                await attendreBeat(300);
            }

            setComboAffichageJ({...localComboJ}); setComboAffichageM({...localComboM});
            ajouterLogGlobal(etape.log);

            const pvJoueurAvant = currentJoueur.pv;
            const pvMonstreAvant = currentMonstre.pv;
            currentJoueur.pv = etape.joueurPv;
            currentJoueur.armure = etape.joueurArmure;
            currentJoueur.nivEsquive = etape.joueurNivEsquive ?? currentJoueur.nivEsquive;

            currentMonstre.pv = etape.monstrePv;
            currentMonstre.armure = etape.monstreArmure;
            currentMonstre.nivEsquive = etape.monstreNivEsquive ?? currentMonstre.nivEsquive;

            setJoueur({ ...currentJoueur }); setMonstre({ ...currentMonstre });

            // Beat 2 : résolution de l'action adverse sur chacun (encaissé ou défendu/neutre).
            if (etape.estAction) {
                setSpriteJoueur(animationResolution(pvJoueurAvant, etape.joueurPv));
                setSpriteMonstre(animationResolutionMonstre(pvMonstreAvant, etape.monstrePv));
            }

            await attendreEtape(etape.estAction ? 300 : 600);
        }

        ajouterStatsTour(degatsInfligesTour, degatsBloquesTour, degatsEsquivesTour);

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

        // Bénédiction "Vie de Chat" : le joueur retombe sur ses pattes au lieu de mourir, une seule
        // fois par ascension. Consommée AVANT les branches de fin de combat pour qu'un double KO se
        // règle lui aussi en sa faveur (il se relève, l'adversaire reste mort).
        if (!estTutoriel && resultat.joueur.pv <= 0 && peutRessusciter) {
            resultat.joueur.pv = Math.max(1, Math.round(resultat.joueur.pvMax * POURCENTAGE_VIE_CHAT));
            onRessusciter?.();
            ajouterLogGlobal(`<div class="log-soin">🐈 Vie de Chat : vous retombez sur vos pattes et vous relevez avec ${resultat.joueur.pv} PV !</div>`);

            // Une ligne de journal passerait inaperçue pour un évènement aussi lourd : on impose
            // un écran de résurrection que le joueur doit acquitter, quel que soit le mode/vitesse
            // de résolution — c'est le seul moment où il apprend que la bénédiction est épuisée.
            setJoueur(resultat.joueur);
            setSpriteJoueur('idle');
            setAttenteVieDeChat(true);
            await new Promise<void>(resolve => { resolveVieDeChatRef.current = resolve; });
        }

        setJoueur(resultat.joueur);
        setMonstre(resultat.monstre);

        // Le PNJ du tutoriel ne peut jamais tuer ni être tué : il n'existe que pour dérouler son
        // script sur un nombre de tours fixe, indépendamment des PV.
        if (!estTutoriel && resultat.joueur.pv <= 0 && resultat.monstre.pv <= 0) {
            setSpriteJoueur('mort');
            setSpriteMonstre('mort');
            ajouterLogGlobal(`<br><span class="log-mort">🩸 DOUBLE KO ! Vous avez emporté ${resultat.monstre.nom} avec vous !</span>`);
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1500 / vitesseRef.current));
            onFinDeCombat(false, resultat.joueur, true);
        } else if (!estTutoriel && resultat.joueur.pv <= 0) {
            setSpriteJoueur('mort');
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1000 / vitesseRef.current));
            onFinDeCombat(false, resultat.joueur, false);
        } else if (!estTutoriel && resultat.monstre.pv <= 0) {
            setSpriteJoueur('idle');
            setSpriteMonstre('mort');
            ajouterLogGlobal(`<br><span class="log-mort">🩸 ${resultat.monstre.nom} est mort !</span>`);
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1500 / vitesseRef.current));
            onFinDeCombat(true, resultat.joueur, false);
        } else {
            setSpriteJoueur('idle');
            setSpriteMonstre('idle');
            ajouterLogGlobal(`<div class="log-reset">(Fin du tour : Défenses et Combos réinitialisés)</div>`);
            setComboAffichageJ({type: null, count: 0}); setComboAffichageM({type: null, count: 0});
            setActionsJoueur([]); setActionsMonstre([]);

            const prochainTour = tourActuel + 1;
            if (estTutoriel && actionsMonstreScriptees && prochainTour > actionsMonstreScriptees.length) {
                onFinTutoriel?.(resultat.joueur);
                return;
            }

            if (dialogueTuto?.[prochainTour]) {
                for (const ligne of dialogueTuto[prochainTour]) ajouterLogGlobal(ligne);
            }

            setTourActuel(prochainTour); setCombatEnCours(false);
        }
    };

    let titreEtage = `Étage ${numeroEtage}/${totalEtages} : ${nomEtage} - Salle ${numeroSalle + 1}/${totalSalles}`;
    if (numeroSalle === totalSalles - 1) {
        titreEtage = `Étage ${numeroEtage}/${totalEtages} : ${nomEtage} - 👑 SALLE DU BOSS`;
    }
    if (estTutoriel) titreEtage = "🐈 Une rencontre inattendue...";

    const titreMonstreFinal = estTutoriel ? monstre.nom : (numeroSalle === totalSalles - 1 ? monstre.nom : `👿 ${monstre.nom}`);
    const animationsMonstreActives = estTutoriel ? ANIMATIONS_CHAT : ANIMATIONS_MONSTRE;
    const badges = genererBadgesPactes(pactesEquipes);

    return (
        <div className="arene-wrapper">

            {attenteVieDeChat && (
                <div className="vie-chat-ecran" role="dialog" aria-modal="true">
                    <div className="vie-chat-carte">
                        <div className="vie-chat-sprite">
                            <SpriteAnime definition={ANIMATIONS_CHAT.idle} />
                        </div>
                        <h2 className="vie-chat-titre">🐈 Vie de Chat</h2>
                        <p className="vie-chat-texte">
                            Vous êtes tombé. Le sol se rapproche... et vous retombez sur vos pattes,
                            comme si une patte invisible vous avait rattrapé au vol.
                        </p>
                        <p className="vie-chat-pv">❤️ {joueur.pv} / {joueur.pvMax} PV</p>
                        <p className="vie-chat-consommee">
                            ⚠️ La bénédiction est <b>consommée</b> pour cette ascension. La prochaine chute sera définitive.
                        </p>
                        <button className="btn-menu btn-jouer" onClick={reprendreApresVieDeChat}>
                            Reprendre le combat
                        </button>
                    </div>
                </div>
            )}

            <div className="combat-header">
                <div className="combat-header-actions">
                    <button
                        onClick={() => { if (window.confirm(estTutoriel ? "Passer le tutoriel ?" : "Abandonner l'ascension en cours ?")) onAbandon(); }}
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
                    {benedictionActive && (
                        <span
                            className="pacte-badge benediction-badge"
                            title={BENEDICTIONS_REGISTRY[benedictionActive].description}
                            style={{ backgroundColor: BENEDICTIONS_REGISTRY[benedictionActive].couleur }}
                        >
                            {BENEDICTIONS_REGISTRY[benedictionActive].emoji} {BENEDICTIONS_REGISTRY[benedictionActive].titre}
                            {benedictionActive === 'vieDeChat' && !peutRessusciter && ' (utilisée)'}
                        </span>
                    )}
                </div>
            </div>

            <div id="etage-info">{titreEtage}</div>

            <div className="arene">
                <div className="entite">
                    <div className="sprite-cadre">
                        <SpriteAnime key={spriteJoueur} definition={ANIMATIONS[spriteJoueur]} />
                    </div>
                    <h2>{joueur.nom}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {joueur.pv} / {joueur.pvMax}</span> | <span className="armure">🛡️ {joueur.armure}</span> | <span className="esquive">💨 Nv.{joueur.nivEsquive} ({calculerPaliersEsquiveAffiches(joueur, monstre.reductionEsquiveOpposant)[Math.min(joueur.nivEsquive, 3)]}%)</span>
                    </div>
                    <div className="stats-base">
                        <StatDetail icone="⚔️" valeur={calculerAttaqueAffichee(joueur, actionsJoueur)} detail={detailAttaque(joueur, competences, actionsJoueur)} />
                        {' | '}
                        <StatDetail icone="🎯" valeur={calculerPreciseAffichee(joueur)} detail={detailPrecise(joueur, competences)} />
                        {' | '}
                        <StatDetail icone="🛡️" valeur={joueur.baseD} detail={detailDefense(joueur, competences, pactesEquipes)} />
                    </div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageJ)}</span>
                    <div className="actions-box">
                        {[0, 1, 2, 3, 4].map(i => <div key={i} className="action-slot">{actionsJoueur[i] ? SYMBOLES[actionsJoueur[i]] : ''}</div>)}
                    </div>
                </div>

                <div className="entite">
                    <div className="sprite-cadre">
                        <SpriteAnime key={spriteMonstre} definition={animationsMonstreActives[spriteMonstre]} />
                    </div>
                    <h2>{titreMonstreFinal}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {monstre.pv} / {monstre.pvMax}</span> | <span className="armure">🛡️ {monstre.armure}</span> | <span className="esquive">💨 Nv.{monstre.nivEsquive} ({calculerPaliersEsquiveAffiches(monstre, joueur.reductionEsquiveOpposant)[Math.min(monstre.nivEsquive, 3)]}%)</span>
                    </div>
                    <div className="stats-base">⚔️ {calculerAttaqueAffichee(monstre)} | 🎯 {calculerPreciseAffichee(monstre)} | 🛡️ {monstre.baseD}</div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageM)}</span>
                    <div className="actions-box">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="action-slot">
                                {actionsMonstre[i] ? (indicesVisiblesMonstre.includes(i) ? SYMBOLES[actionsMonstre[i]] : '❓') : ''}
                            </div>
                        ))}
                    </div>
                </div>
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