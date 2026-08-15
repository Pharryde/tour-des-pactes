import { useEffect, useState, useRef } from 'react';
import type { Entite, ActionType, Competences, BenedictionChat } from '../types';
import { BENEDICTIONS_REGISTRY, POURCENTAGE_VIE_CHAT } from '../utils/benedictions';
import { genererActionsMonstre, corrigerActionsPourLimiteCombo, genererIndicesVisibles, calculerAttaqueAffichee, calculerPreciseAffichee, calculerPaliersEsquiveAffiches, tirerCreneauxFroid, AUCUN_CRENEAU_FROID, symbolePour, type CreneauxFroid } from '../utils/combat';
import { detailAttaque, detailPrecise, detailDefense } from '../utils/detailStats';
import { tirerNouvelleForme, appliquerFormeMegaBoss } from '../utils/megaboss';
import { genererBadgesPactes } from '../utils/pactes';
import { COMPTEURS_ACTIONS_VIDES, incrementerCompteurs, type StatCombo, type StatsTour } from '../utils/telemetrieRuns';
import type { CirconstancesMort } from '../utils/leconsMort';
import { jouer_tour } from 'moteur_wasm';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { chargerEtatCombat, usePersisterCombat } from '../hooks/useCombatResume';
import { ANIMATIONS, animationPourAction, animationResolution, type NomAnimation } from '../utils/animationsJoueur';
import { ANIMATIONS_MONSTRE, animationMonstrePourAction, animationResolutionMonstre, type NomAnimationMonstre } from '../utils/animationsMonstre';
import { ANIMATIONS_CHAT } from '../utils/animationsChat';
import { SpriteAnime } from './SpriteAnime';
import { StatDetail } from './StatDetail';
import { InfoBulle } from './InfoBulle';

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
    ajouterStatsTour: (stats: StatsTour) => void;
    onFinDeCombat: (victoire: boolean, joueurRestant: Entite, doubleKO?: boolean, circonstances?: CirconstancesMort) => void;
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

// Reliquat de brûlure / de poison porté par un combattant. Ces deux états se résolvent en FIN de
// tour : sans compteur visible, le joueur ne peut ni anticiper le coup à venir, ni comprendre
// pourquoi il perd des PV sans avoir été touché.
function EtatsDifferes({ entite }: { entite: Entite }) {
    return (
        <>
            {entite.brulureActive ? (
                <> | <span className="etat-brulure" title="Brûlure : encaissée en fin de tour, absorbée par l'armure restante, puis divisée par deux.">🔥 {entite.brulureActive}</span></>
            ) : null}
            {entite.poisonActif ? (
                <> | <span className="etat-poison" title="Poison : encaissé en fin de tour, traverse l'armure et ne décroît jamais. Chaque nouvelle dose s'ajoute à la précédente.">🧪 {entite.poisonActif}</span></>
            ) : null}
        </>
    );
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

    // Créneaux déréglés / gelés par l'Étage du Froid. Tirés à l'OUVERTURE du tour, en même temps
    // que les actions du monstre, pour être affichés sur les cases pendant que le joueur programme
    // — l'information n'aurait aucun intérêt tactique si elle n'arrivait qu'à la résolution.
    const [creneauxFroid, setCreneauxFroid] = useState<CreneauxFroid>(AUCUN_CRENEAU_FROID);

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

    // L'Anomalie peut s'être soignée bien avant le tour fatal : ce suivi couvre tout le combat.
    const sestSoigneRef = useRef(false);

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
        const generated = actionsMonstreScriptees ? actionsMonstreScriptees[tourActuel - 1] : genererActionsMonstre(monstreDuTour, joueur.poisonActif ?? 0);
        // Le joueur applique son Pacte Lvl 1/2 sur le monstre
        setActionsMonstre(corrigerActionsPourLimiteCombo(generated, joueur.limiteComboMax ?? 5, monstreDuTour.actionsPossibles));
        setIndicesVisiblesMonstre(genererIndicesVisibles(monstreDuTour.actionsVisibles));
        setCreneauxFroid(tirerCreneauxFroid(joueur, monstreDuTour));
    }

    const formatterCombo = (comboObj: {type: ActionType|null, count: number}, entite: Entite) => {
        if(comboObj.count <= 1 || comboObj.type === 'E' || comboObj.type === null) return "Aucun";
        return `${symbolePour(comboObj.type, entite)} x${comboObj.count}`;
    };

    // Repères de l'Étage du Froid posés sur une case d'action. Un créneau peut être à la fois gelé
    // et déréglé ; « neutralisé » (le pouvoir porté des deux côtés) s'exclut des deux autres.
    const marqueurCreneau = (i: number, gelees: number[], dabord: number[], libelleDabord: string) => {
        const estGelee = gelees.includes(i);
        const estDabord = dabord.includes(i);
        const estAnnulee = !estGelee && !estDabord && creneauxFroid.annules.includes(i);

        const titres = [
            estGelee && 'Action gelée : elle est purement annulée.',
            estDabord && libelleDabord,
            estAnnulee && "Dérèglement neutralisé : les deux camps le portent sur ce créneau, l'action se résout normalement.",
        ].filter(Boolean);

        return {
            className: `action-slot${estGelee ? ' action-slot--gelee' : ''}${estDabord ? ' action-slot--premier' : ''}${estAnnulee ? ' action-slot--annulee' : ''}`,
            title: titres.length > 0 ? titres.join(' ') : undefined,
        };
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

        // `annules` est purement informatif : le moteur ne connaît que les créneaux réellement
        // déréglés ou gelés, on ne lui transmet donc que ceux-là.
        const creneauxMoteur = {
            gelesJoueur: creneauxFroid.gelesJoueur,
            gelesMonstre: creneauxFroid.gelesMonstre,
            joueurDabord: creneauxFroid.joueurDabord,
            monstreDabord: creneauxFroid.monstreDabord,
        };

        if (creneauxFroid.annules.length > 0) {
            const cases = [...creneauxFroid.annules].sort((a, b) => a - b).map(i => `n°${i + 1}`).join(', ');
            const plusieurs = creneauxFroid.annules.length > 1;
            ajouterLogGlobal(`<div class="log-tour">❄️ Dérèglement neutralisé sur ${plusieurs ? 'les actions' : "l'action"} ${cases} : les deux camps portent le même pouvoir, ${plusieurs ? 'elles se résolvent' : 'elle se résout'} normalement.</div>`);
        }

        let resultat;
        try {
            resultat = jouer_tour(joueur, monstre, actionsJoueur, actionsMonstre, tourActuel, creneauxMoteur);
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

        // Télémétrie du tour (voir utils/telemetrieRuns.ts). On profite du suivi de combo déjà fait
        // pour l'affichage : `localComboJ/M` porte exactement le palier atteint à chaque action,
        // gel de l'Étage du Froid compris.
        let actionsTour = COMPTEURS_ACTIONS_VIDES;
        const comboTourJ: StatCombo = { somme: 0, actions: 0, max: 0 };
        const comboTourM: StatCombo = { somme: 0, actions: 0, max: 0 };
        const cumulerCombo = (cumul: StatCombo, niveau: number) => {
            cumul.somme += niveau; cumul.actions++; cumul.max = Math.max(cumul.max, niveau);
        };

        for (let i = 0; i < resultat.etapes.length; i++) {
            const etape = resultat.etapes[i];
            degatsInfligesTour += etape.degatsInfliges;
            degatsBloquesTour += etape.degatsBloques;
            degatsEsquivesTour += etape.degatsEsquives;

            if (etape.estAction) {
                const actJ = actionsJoueur[indexDesActionsCombats];
                const actM = actionsMonstre[indexDesActionsCombats];

                // Une action gelée (Étage du Froid) ne casse pas le combo mais ne le fait pas
                // avancer non plus : le moteur saute purement son `gerer_combo`, et ce compteur
                // d'affichage doit sauter avec lui, sinon il annonce un palier que les dégâts
                // ne suivront pas.
                const creneau = indexDesActionsCombats;
                if (!resultat.creneauxGelesJoueur.includes(creneau)) {
                    if (localComboJ.type === actJ) localComboJ.count++; else { localComboJ.type = actJ; localComboJ.count = 1; }
                    cumulerCombo(comboTourJ, localComboJ.count);
                }
                if (!resultat.creneauxGelesMonstre.includes(creneau)) {
                    if (localComboM.type === actM) localComboM.count++; else { localComboM.type = actM; localComboM.count = 1; }
                    cumulerCombo(comboTourM, localComboM.count);
                }
                // Comptée même si le créneau est gelé : le joueur l'a bien programmée.
                actionsTour = incrementerCompteurs(actionsTour, [actJ]);

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

            // Brûlure et poison montent action par action : c'est justement leur accumulation
            // pendant le tour qu'il faut voir, pas seulement le total une fois tout résolu.
            // `|| undefined` pour que le compteur disparaisse quand l'état retombe à zéro.
            currentJoueur.brulureActive = etape.joueurBrulure || undefined;
            currentJoueur.poisonActif = etape.joueurPoison || undefined;
            currentMonstre.brulureActive = etape.monstreBrulure || undefined;
            currentMonstre.poisonActif = etape.monstrePoison || undefined;

            setJoueur({ ...currentJoueur }); setMonstre({ ...currentMonstre });

            // Beat 2 : résolution de l'action adverse sur chacun (encaissé ou défendu/neutre).
            if (etape.estAction) {
                setSpriteJoueur(animationResolution(pvJoueurAvant, etape.joueurPv));
                setSpriteMonstre(animationResolutionMonstre(pvMonstreAvant, etape.monstrePv));
            }

            await attendreEtape(etape.estAction ? 300 : 600);
        }

        ajouterStatsTour({
            degatsInfliges: degatsInfligesTour,
            degatsBloques: degatsBloquesTour,
            degatsEsquives: degatsEsquivesTour,
            actions: actionsTour,
            comboJoueur: comboTourJ,
            comboMonstre: comboTourM,
        });

        if (resultat.logsFinTour.length > 0) {
            for (const logFin of resultat.logsFinTour) { ajouterLogGlobal(logFin); }
            await attendreEtape(600);
        }

        // Le soin ne dépend que de la survie du JOUEUR : tuer l'ennemi au tour 5 ne doit pas
        // annuler la régénération du Pacte de la Vie II.
        if (resultat.joueur.pv > 0) {
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

        // Circonstances de la mort, pour que le Chat puisse revenir dessus (voir utils/leconsMort.ts).
        // Tout est déduit de l'ÉTAT, jamais du texte du journal : la dernière étape d'action porte
        // les PV d'AVANT les effets de fin de tour, donc y être encore vivant puis mort à l'arrivée
        // signifie que c'est un tic de fin de tour qui a frappé. Même principe pour la régénération,
        // lue sur des PV qui remontent plutôt que recalculée à partir de l'intervalle du boss.
        const derniereAction = [...resultat.etapes].reverse().find(e => e.estAction);
        if (derniereAction !== undefined && resultat.monstre.pv > derniereAction.monstrePv) {
            sestSoigneRef.current = true;
        }
        const circonstances: CirconstancesMort = {
            mortEnFinDeTour: (derniereAction?.joueurPv ?? joueur.pv) > 0 && resultat.joueur.pv <= 0,
            alterationDeclenchee: monstre.pertePvChaqueXTours !== undefined
                && tourActuel % monstre.pertePvChaqueXTours === 0,
            assautArmure: monstre.degatsArmureRestanteFinTour === true,
            bloqueEsquive: monstre.bloqueEsquiveOpposant === true,
            sestSoigne: sestSoigneRef.current,
        };

        // Le PNJ du tutoriel ne peut jamais tuer ni être tué : il n'existe que pour dérouler son
        // script sur un nombre de tours fixe, indépendamment des PV.
        if (!estTutoriel && resultat.joueur.pv <= 0 && resultat.monstre.pv <= 0) {
            setSpriteJoueur('mort');
            setSpriteMonstre('mort');
            ajouterLogGlobal(`<br><span class="log-mort">🩸 DOUBLE KO ! Vous avez emporté ${resultat.monstre.nom} avec vous !</span>`);
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1500 / vitesseRef.current));
            onFinDeCombat(false, resultat.joueur, true, circonstances);
        } else if (!estTutoriel && resultat.joueur.pv <= 0) {
            setSpriteJoueur('mort');
            if (modeResolutionRef.current === 'auto') await new Promise(r => setTimeout(r, 1000 / vitesseRef.current));
            onFinDeCombat(false, resultat.joueur, false, circonstances);
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
                    {/* Nom seul : l'effet complet reste dans l'infobulle. Dans la Tour, ces badges
                        sont un rappel de ce qu'on porte, pas une fiche technique — les descriptions
                        entières poussaient l'en-tête sur plusieurs lignes.
                        Bulle vers le BAS et alignée à droite : ces badges vivent dans le coin
                        supérieur droit, où toute bulle ouverte vers le haut ou vers la gauche
                        sortirait de l'écran. */}
                    {badges.length === 0 ? <span className="pacte-aucun">Aucun Pacte</span> : badges.map(b => (
                        <InfoBulle key={b.nom} className="pacte-badge" sens="bas" alignement="fin" contenu={b.desc}>
                            {b.nom}
                        </InfoBulle>
                    ))}
                    {benedictionActive && (
                        <InfoBulle
                            className="pacte-badge benediction-badge"
                            sens="bas"
                            alignement="fin"
                            style={{ backgroundColor: BENEDICTIONS_REGISTRY[benedictionActive].couleur }}
                            contenu={BENEDICTIONS_REGISTRY[benedictionActive].description}
                        >
                            {BENEDICTIONS_REGISTRY[benedictionActive].emoji} {BENEDICTIONS_REGISTRY[benedictionActive].titre}
                            {benedictionActive === 'vieDeChat' && !peutRessusciter && ' (utilisée)'}
                        </InfoBulle>
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
                        <EtatsDifferes entite={joueur} />
                    </div>
                    <div className="stats-base">
                        <StatDetail icone={symbolePour('A', joueur)} valeur={calculerAttaqueAffichee(joueur, actionsJoueur, monstre)} detail={detailAttaque(joueur, competences, actionsJoueur, monstre)} />
                        {' | '}
                        <StatDetail icone={symbolePour('P', joueur)} valeur={calculerPreciseAffichee(joueur, monstre)} detail={detailPrecise(joueur, competences, monstre)} />
                        {' | '}
                        <StatDetail icone="🛡️" valeur={joueur.baseD} detail={detailDefense(joueur, competences, pactesEquipes)} />
                    </div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageJ, joueur)}</span>
                    <div className="actions-box">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} {...marqueurCreneau(i, creneauxFroid.gelesJoueur, creneauxFroid.joueurDabord, "Résolue avant l'ennemi.")}>
                                {actionsJoueur[i] ? symbolePour(actionsJoueur[i], joueur) : ''}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="entite">
                    <div className="sprite-cadre">
                        <SpriteAnime key={spriteMonstre} definition={animationsMonstreActives[spriteMonstre]} />
                    </div>
                    <h2>{titreMonstreFinal}</h2>
                    <div className="stats">
                        <span className="pv">❤️ {monstre.pv} / {monstre.pvMax}</span> | <span className="armure">🛡️ {monstre.armure}</span> | <span className="esquive">💨 Nv.{monstre.nivEsquive} ({calculerPaliersEsquiveAffiches(monstre, joueur.reductionEsquiveOpposant)[Math.min(monstre.nivEsquive, 3)]}%)</span>
                        <EtatsDifferes entite={monstre} />
                    </div>
                    <div className="stats-base">{symbolePour('A', monstre)} {calculerAttaqueAffichee(monstre, [], joueur)} | {symbolePour('P', monstre)} {calculerPreciseAffichee(monstre, joueur)} | 🛡️ {monstre.baseD}</div>
                    <span className="combo">Combo : {formatterCombo(comboAffichageM, monstre)}</span>
                    <div className="actions-box">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} {...marqueurCreneau(i, creneauxFroid.gelesMonstre, creneauxFroid.monstreDabord, 'Résolue avant vous.')}>
                                {actionsMonstre[i] ? (indicesVisiblesMonstre.includes(i) ? symbolePour(actionsMonstre[i], monstre) : '❓') : ''}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="controles">
                <button className="btn-action" id="btn-a" onClick={() => {if (peutAjouterAction('A')) setActionsJoueur([...actionsJoueur, 'A'])}} disabled={!peutAjouterAction('A')}>{symbolePour('A', joueur)} Attaque</button>
                <button className="btn-action" id="btn-p" onClick={() => {if (peutAjouterAction('P')) setActionsJoueur([...actionsJoueur, 'P'])}} disabled={!peutAjouterAction('P')}>{symbolePour('P', joueur)} Précise</button>
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