// src/hooks/useGameState.ts
import { useEffect, useState } from 'react';
import init, { get_donnees_etages } from 'moteur_wasm';
import type { Ecran, Entite, StructureEtage, Competences, Bestiaire, StatsRun, ChoixRepos, Synergie, BenedictionChat } from '../types';
import { appliquerPactesSurJoueur, calculerSoinRepos, calculerGainPvMaxRepos, peutEquiperPacte } from '../utils/pactes';
import { BENEDICTIONS_REGISTRY, appliquerBenedictionSurJoueur, appliquerBonusXp, tirerBenediction } from '../utils/benedictions';
import { melangerEtages, genererMessageBuff, melangerAleatoirement } from '../utils/etages';
import { construireMegaBoss } from '../utils/megaboss';
import { detecterSynergie, SYNERGIES_REGISTRY } from '../utils/synergies';
import { construireChatMysterieux, construireHerosTuto, DIALOGUE_CHAT_TUTO } from '../utils/tutoCombat';
import { calculerRecompenseCombat } from '../utils/recompenses';
import { calculerPointsDisponibles } from '../utils/competences';
import { lireHistoriqueLogsPersistant, extraireLogsDuDernierTour, lireValeurPersistante } from '../utils/logs';
import { construireEvenementRun, journaliserRun, type IssueRun } from '../utils/telemetrieRuns';
import { DELAI_TRANSITION_MS, calculerDelai } from '../utils/rythme';
import { effacerEtatCombat } from './useCombatResume';
import { useLocalStorage } from './useLocalStorage';
import { useSauvegardeCloud } from './useSauvegardeCloud';

// Plafond du journal de combat. Sans lui, l'historique grossit sans fin sur toute une run, et le
// coût devient quadratique : chaque ligne ajoutée re-sérialise le tableau ENTIER dans localStorage,
// ajoute un nœud DOM de plus au journal rendu, et regonfle l'instantané poussé vers Supabase.
// Aucun consommateur n'a besoin de l'historique complet — `extraireLogsDuDernierTour` (écran de
// mort) ne lit que le dernier tour, très largement contenu dans cette fenêtre.
const LIMITE_LOGS = 300;

// Le réglage de Vitesse (⚡) appartient à CombatArene : on le relit dans le localStorage plutôt que
// de le faire descendre en prop, pour la même raison que les autres lectures persistantes (voir
// utils/logs.ts) — ce code tourne depuis un callback de fin de combat, hors du cycle de rendu.
function programmerTransition(action: () => void) {
    const vitesse = lireValeurPersistante('tdp_vitesse_reso', 1);
    setTimeout(action, calculerDelai(DELAI_TRANSITION_MS, vitesse));
}

// Regroupe tout l'état persistant de la partie (localStorage) et les règles qui le font évoluer.
// App.tsx n'a plus qu'à lire ce que ce hook expose pour choisir quel écran afficher.
export function useGameState() {
    const [moteurPret, setMoteurPret] = useState(false);
    const [erreurMoteur, setErreurMoteur] = useState<string | null>(null);
    const [donneesBaseEtages, setDonneesBaseEtages] = useState<StructureEtage[]>([]);

    const [pactesDebloques, setPactesDebloques] = useLocalStorage<string[]>('tdp_pactes_debloques', []);
    const [pactesEquipes, setPactesEquipes] = useLocalStorage<string[]>('tdp_pactes_equipes', []);

    const [ecran, setEcran] = useLocalStorage<Ecran>('tdp_ecran', 'ecran-hub');
    const [listeEtages, setListeEtages] = useLocalStorage<StructureEtage[]>('tdp_liste_etages', []);
    const [joueur, setJoueur] = useLocalStorage<Entite | null>('tdp_joueur', null);
    const [indexEtageActuel, setIndexEtageActuel] = useLocalStorage<number>('tdp_index_etage', 0);
    const [indexSalle, setIndexSalle] = useLocalStorage<number>('tdp_index_salle', 0);
    const [historiqueLogs, setHistoriqueLogsBrut] = useLocalStorage<string[]>('tdp_historique_logs', []);
    const [victoireTotale, setVictoireTotale] = useLocalStorage<boolean>('tdp_victoire', false);
    const [enCombatPacte, setEnCombatPacte] = useLocalStorage<boolean>('tdp_combat_pacte', false);
    const [typeCombatPacte, setTypeCombatPacte] = useLocalStorage<'lvl1' | 'lvl2'>('tdp_type_pacte', 'lvl1');
    const [logsMort, setLogsMort] = useLocalStorage<string[]>('tdp_logs_mort', []);
    const [enCombatMegaBoss, setEnCombatMegaBoss] = useLocalStorage<boolean>('tdp_combat_megaboss', false);
    const [monstreMegaBoss, setMonstreMegaBoss] = useLocalStorage<Entite | null>('tdp_monstre_megaboss', null);
    const [reposVisites, setReposVisites] = useLocalStorage<number>('tdp_repos_visites', 0);
    const [choixReposActifs, setChoixReposActifs] = useLocalStorage<ChoixRepos[] | null>('tdp_choix_repos_actifs', null);
    const [synergiesDecouvertes, setSynergiesDecouvertes] = useLocalStorage<Synergie[]>('tdp_synergies_decouvertes', []);
    const [tutoIntroFait, setTutoIntroFait] = useLocalStorage<boolean>('tdp_tuto_intro_fait', false);
    const [monstreTuto, setMonstreTuto] = useLocalStorage<Entite | null>('tdp_monstre_tuto', null);
    const [aPacteChat, setAPacteChat] = useLocalStorage<boolean>('tdp_a_pacte_chat', false);
    // Pactes avec lesquels le joueur a déjà terrassé la Tour entière : trophée à vie, jamais remis
    // à zéro d'une run à l'autre (contrairement aux stats de run).
    const [pactesVictorieux, setPactesVictorieux] = useLocalStorage<string[]>('tdp_pactes_victorieux', []);
    const [aBenedictionChat, setABenedictionChat] = useLocalStorage<boolean>('tdp_benediction_chat', false);
    // Apparitions successives du Chat entre deux runs (voir gererQuitterFin) : chacune ne se joue
    // qu'une fois, dans l'ordre, et `runsTerminees` sert de minimum d'ancienneté.
    const [runsTerminees, setRunsTerminees] = useLocalStorage<number>('tdp_runs_terminees', 0);
    const [forgeronPresente, setForgeronPresente] = useLocalStorage<boolean>('tdp_forgeron_presente', false);
    const [leconComboFaite, setLeconComboFaite] = useLocalStorage<boolean>('tdp_lecon_combo_faite', false);
    const [benedictionActive, setBenedictionActive] = useLocalStorage<BenedictionChat | null>('tdp_benediction_active', null);
    const [vieChatDispo, setVieChatDispo] = useLocalStorage<boolean>('tdp_vie_chat_dispo', false);

    const [monstresTues, setMonstresTues] = useLocalStorage<number>('tdp_monstres_tues', 0);
    const [competences, setCompetences] = useLocalStorage<Competences>('tdp_competences', { pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
    const [xpTotal, setXpTotal] = useLocalStorage<number>('tdp_xp_total', 0);
    const [bestiaire, setBestiaire] = useLocalStorage<Bestiaire>('tdp_bestiaire', { normal: 0, boss: 0, evolue: 0, final: 0 });

    const [aConnuBuff, setAConnuBuff] = useLocalStorage<boolean>('tdp_a_connu_buff', false);
    const [connaissancesVues, setConnaissancesVues] = useLocalStorage<number>('tdp_tuto_vues', 0);
    const [pactesVus, setPactesVus] = useLocalStorage<number>('tdp_pactes_vus', 0);
    const [premierePartieFaite, setPremierePartieFaite] = useLocalStorage<boolean>('tdp_premiere_partie_faite', false);

    // --- Statistiques de la run en cours (remises à zéro à chaque lancement), pour l'écran de fin ---
    // Seuls les setters sont utilisés ici : capturerStatsFinRun() relit ces valeurs directement
    // depuis localStorage (voir lireValeurPersistante) pour éviter le piège de la closure
    // obsolète (même souci que lireHistoriqueLogsPersistant, voir utils/logs.ts).
    const [, setMonstresTuesRun] = useLocalStorage<number>('tdp_monstres_tues_run', 0);
    const [, setPactesDebloquesRun] = useLocalStorage<string[]>('tdp_pactes_debloques_run', []);
    const [, setDegatsInfligesRun] = useLocalStorage<number>('tdp_degats_infliges_run', 0);
    const [, setDegatsBloquesRun] = useLocalStorage<number>('tdp_degats_bloques_run', 0);
    const [, setDegatsEsquivesRun] = useLocalStorage<number>('tdp_degats_esquives_run', 0);
    const [etageRecord, setEtageRecord] = useLocalStorage<number>('tdp_etage_record', 0);
    const [statsDerniereRun, setStatsDerniereRun] = useLocalStorage<StatsRun | null>('tdp_stats_derniere_run', null);

    // Toutes les écritures du journal passent par ici (une douzaine d'appelants) : c'est le seul
    // endroit qui garantit le plafond, quel que soit le point d'ajout.
    const setHistoriqueLogs = (valeur: string[] | ((precedent: string[]) => string[])) => {
        setHistoriqueLogsBrut(precedent => {
            const suivant = valeur instanceof Function ? valeur(precedent) : valeur;
            return suivant.length > LIMITE_LOGS ? suivant.slice(-LIMITE_LOGS) : suivant;
        });
    };

    const nbConnaissancesActuelles =
        (xpTotal > 0 ? 1 : 0) +
        (aConnuBuff ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte du Combo")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte du Temps")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de l'Ombre")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de la Fluidité")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de la Puissance Brute")) ? 1 : 0) +
        (pactesDebloques.includes("Pacte de l'Armure II") ? 1 : 0) +
        (aBenedictionChat ? 1 : 0) +
        synergiesDecouvertes.length;

    const aNouveauteTuto = nbConnaissancesActuelles > connaissancesVues;
    const marquerTutoLu = () => setConnaissancesVues(nbConnaissancesActuelles);

    // Pastille "nouveau pacte" : reste allumée tant que l'inventaire n'a pas été rouvert depuis
    // le dernier déblocage. Pastille "point de compétence" : au contraire, reste allumée tant
    // qu'un point n'a pas été dépensé, même si l'écran a déjà été visité.
    const aNouveauPacte = pactesDebloques.length > pactesVus;
    const marquerPactesVus = () => setPactesVus(pactesDebloques.length);
    const aPointsCompetenceDispo = calculerPointsDisponibles(xpTotal, competences) > 0;

    useEffect(() => {
        const demarrer = async () => {
            try {
                await init();
                setDonneesBaseEtages(get_donnees_etages());
                setMoteurPret(true);

                // Tutoriel d'introduction (Chat Mystérieux) : avant même le Hub, une seule fois
                // dans la vie du joueur. Le drapeau se pose ICI (pas à la fin) pour ne jamais se
                // redéclencher, même si le joueur l'abandonne en cours. Garde-fou pour les
                // sauvegardes antérieures à cette fonctionnalité (drapeau absent) : ne se
                // déclenche que si le joueur n'a strictement aucune progression, pour ne jamais
                // interrompre une partie déjà en cours.
                // Sauvegardes antérieures à la scène du forgeron : le joueur utilise sans doute déjà
                // l'Arbre, on ne va pas lui retirer le bouton en attendant une scène qu'il n'a
                // jamais eu l'occasion de voir. Clé ABSENTE (et non `false`) = save d'avant.
                if (window.localStorage.getItem('tdp_forgeron_presente') === null && (xpTotal > 0 || monstresTues > 0)) {
                    setForgeronPresente(true);
                }

                if (!tutoIntroFait && ecran === 'ecran-hub' && monstresTues === 0 && pactesDebloques.length === 0) {
                    setTutoIntroFait(true);
                    setJoueur(construireHerosTuto());
                    setMonstreTuto(construireChatMysterieux());
                    setHistoriqueLogs(DIALOGUE_CHAT_TUTO[1] ?? []);
                    setEcran('ecran-tuto-intro');
                }
            } catch (error) {
                console.error("Le module WebAssembly a crashé à l'initialisation:", error);
                setErreurMoteur(String(error));
            }
        };
        demarrer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sauvegarde cloud (Supabase). La condition "vierge" est la même que celle qui déclenche le
    // tutoriel : elle garantit qu'on ne restaure jamais par-dessus une partie locale en cours.
    useSauvegardeCloud(
        !tutoIntroFait && monstresTues === 0 && pactesDebloques.length === 0,
        [
            pactesDebloques, pactesEquipes, ecran, listeEtages, joueur, indexEtageActuel,
            indexSalle, historiqueLogs, victoireTotale, enCombatPacte, typeCombatPacte, logsMort,
            enCombatMegaBoss, monstreMegaBoss, reposVisites, choixReposActifs, synergiesDecouvertes,
            tutoIntroFait, monstreTuto, aPacteChat, monstresTues, competences, xpTotal, bestiaire,
            aConnuBuff, connaissancesVues, pactesVus, premierePartieFaite, etageRecord, statsDerniereRun,
            aBenedictionChat, benedictionActive, vieChatDispo, pactesVictorieux,
            runsTerminees, forgeronPresente, leconComboFaite,
        ],
    );

    const effacerRun = () => {
        setListeEtages([]); setJoueur(null); setHistoriqueLogs([]);
        setIndexEtageActuel(0); setIndexSalle(0); setEnCombatPacte(false);
        setEnCombatMegaBoss(false); setMonstreMegaBoss(null);
        // La bénédiction ne vaut que pour la run écoulée : la Roue est retournée à chaque entrée.
        setBenedictionActive(null); setVieChatDispo(false);
        effacerEtatCombat();
    };

    // Fige les stats de la run qui vient de se terminer (mort ou victoire totale) AVANT que
    // effacerRun() ne remette indexEtageActuel et les compteurs à zéro — sinon l'écran de fin
    // n'aurait plus rien à afficher.
    const capturerStatsFinRun = (issue: IssueRun) => {
        // Appelée exactement une fois par run ACHEVÉE (mort ou victoire totale) — un abandon ne
        // passe pas par ici. C'est donc le bon endroit pour compter les runs qui cadencent les
        // apparitions du Chat, et pour journaliser la run côté cloud.
        // Le numéro est relu dans le localStorage plutôt que pris dans la closure : `setRunsTerminees`
        // ci-dessous n'écrit qu'au moment où React applique la mise à jour, donc l'ancienne valeur
        // est encore la bonne base ici, et elle est fiable même si ce callback vient d'un tour de
        // combat déjà obsolète (même raison que les autres lectures persistantes, voir utils/logs.ts).
        const numeroRun = lireValeurPersistante('tdp_runs_terminees', 0) + 1;
        setRunsTerminees(n => n + 1);

        const etageAtteint = indexEtageActuel + 1;
        const estNouveauRecord = etageAtteint > etageRecord;
        if (estNouveauRecord) setEtageRecord(etageAtteint);

        setStatsDerniereRun({
            etageAtteint,
            etageRecord: estNouveauRecord ? etageAtteint : etageRecord,
            estNouveauRecord,
            monstresTues: lireValeurPersistante('tdp_monstres_tues_run', 0),
            nouveauxPactes: lireValeurPersistante<string[]>('tdp_pactes_debloques_run', []),
            degatsInfliges: lireValeurPersistante('tdp_degats_infliges_run', 0),
            degatsBloques: lireValeurPersistante('tdp_degats_bloques_run', 0),
            degatsEsquives: lireValeurPersistante('tdp_degats_esquives_run', 0),
        });

        // Volontairement pas attendu : l'écran de fin ne doit jamais dépendre du réseau, et un
        // échec d'envoi n'a aucune conséquence pour le joueur. `benedictionActive` et
        // `pactesEquipes` sont encore intacts ici — effacerRun() ne les remet à zéro qu'après.
        void journaliserRun(construireEvenementRun({
            numeroRun,
            issue,
            etage: etageAtteint,
            pactesEquipes,
            competences,
            benediction: benedictionActive,
        }));
    };

    const gererAbandon = () => {
        effacerRun();
        setEcran('ecran-hub');
    };

    // Bénédiction "Vie de Chat" consommée : CombatArene a relevé le joueur au lieu de le laisser
    // mourir, il ne reste plus rien à dépenser pour le reste de la run.
    const gererVieDeChatConsommee = () => setVieChatDispo(false);

    // Sortie de l'écran de fin : le Chat s'y invite à intervalles scénarisés, une apparition par
    // run achevée au maximum et toujours dans cet ordre.
    //  1. 1re run  → il commente la performance et offre sa Bénédiction.
    //  2. 2e run   → il présente le Forgeron (qui reste invisible au Hub jusque-là, même si le
    //                joueur a déjà l'XP nécessaire : c'est le Chat qui « ouvre » la forge).
    //  3. run suivante → il refait la leçon sur les Combos.
    // `runsTerminees` a été incrémentée par capturerStatsFinRun avant l'affichage de l'écran de fin :
    // au moment de ce clic, elle vaut donc bien le nombre de runs achevées, celle-ci comprise.
    const gererQuitterFin = () => {
        if (!aBenedictionChat) { setEcran('ecran-benediction'); return; }
        if (!forgeronPresente && runsTerminees >= 2) { setEcran('ecran-forgeron'); return; }
        if (forgeronPresente && !leconComboFaite) { setEcran('ecran-lecon-combo'); return; }
        setEcran('ecran-hub');
    };

    const gererRecevoirBenediction = () => {
        setABenedictionChat(true);
        setEcran('ecran-hub');
    };

    const gererForgeronPresente = () => {
        setForgeronPresente(true);
        setEcran('ecran-arbre');
    };

    const gererLeconComboFaite = () => {
        setLeconComboFaite(true);
        setEcran('ecran-hub');
    };

    // Déclenché par CombatArene (onFinTutoriel) une fois les 4 tours scriptés du tutoriel
    // d'introduction écoulés : on passe à l'écran de révélation plutôt qu'au flux victoire/défaite
    // habituel, le Chat Mystérieux étant intuable par conception.
    const gererFinTutoriel = (joueurRestant: Entite) => {
        setJoueur(joueurRestant);
        setMonstreTuto(null);
        effacerEtatCombat();
        setEcran('ecran-tuto-conclusion');
    };

    // Clic sur "Commencer l'ascension" à l'écran de révélation : octroie le Pacte Niveau 0 (encart
    // cosmétique dans l'Inventaire, cf. Inventaire.tsx) et retourne au Hub.
    const gererConclusionTuto = () => {
        setAPacteChat(true);
        setJoueur(null);
        setEcran('ecran-hub');
    };

    // "Abandonner" pendant le tutoriel : le drapeau tutoIntroFait est déjà posé au lancement, donc
    // il ne se relancera pas — on saute simplement la suite (et le Pacte Niveau 0, purement cosmétique).
    const gererAbandonTuto = () => {
        setJoueur(null);
        setMonstreTuto(null);
        effacerEtatCombat();
        setEcran('ecran-hub');
    };

    const gererBasculerPacte = (nomPacte: string) => {
        const check = peutEquiperPacte(nomPacte, pactesEquipes);
        if (!check.valide) { alert(check.messageErreur); return; }

        if (pactesEquipes.includes(nomPacte)) {
            setPactesEquipes(pactesEquipes.filter(p => p !== nomPacte));
        } else {
            setPactesEquipes([...pactesEquipes, nomPacte]);
        }
    };

    // Équipement en un clic d'une synergie découverte : la composition est validée en amont par
    // composerEquipementSynergie, on remplace donc l'équipement entier sans repasser par les
    // contrôles de peutEquiperPacte (qui refuseraient les étapes intermédiaires).
    const gererEquiperSynergie = (pactes: string[]) => setPactesEquipes(pactes);

    const gererLancerRun = (benediction: BenedictionChat | null) => {
        const bonusEsq = (competences.esq || 0) * 5;

        const herosBase: Entite = {
            nom: "Héros",
            pv: 100 + ((competences.pv || 0) * 10),
            pvMax: 100 + ((competences.pv || 0) * 10),
            armure: 0,
            nivEsquive: 0,
            baseA: 10 + (competences.atk || 0),
            baseP: 4 + (competences.pre || 0),
            baseD: 10 + (competences.def || 0),
            paliersEsquive: [
                0,
                Math.min(100, 50 + bonusEsq),
                Math.min(100, 75 + bonusEsq),
                Math.min(100, 100 + bonusEsq)
            ],
            actionsPossibles: ['A', 'P', 'D', 'E']
        };

        // Synergies cachées : 4 Pactes précis équipés (peu importe leur niveau) au lancement
        // révèlent un bonus de combat secret pour toute la run (voir utils/synergies.ts).
        const synergieActive = detecterSynergie(pactesEquipes);
        if (synergieActive) herosBase.synergieActive = synergieActive;

        // Application propre de tous les pactes via le registry, puis de la Bénédiction du Chat
        // tirée à la Roue (celles qui ne touchent pas aux stats sont gérées plus bas / en combat).
        setJoueur(appliquerBenedictionSurJoueur(appliquerPactesSurJoueur(herosBase, pactesEquipes), benediction));
        setVieChatDispo(benediction === 'vieDeChat');

        // Onboarding : les 2 premiers étages de la toute première partie sont toujours parmi
        // Armure/Vie/Puissance Brute (mécaniques simples). Le drapeau se pose au lancement, pas
        // à la fin, pour ne pas re-déclencher la règle si cette première run est abandonnée.
        const estPremierePartie = !premierePartieFaite;
        const melange = melangerEtages(donneesBaseEtages, pactesEquipes, estPremierePartie);
        if (estPremierePartie) setPremierePartieFaite(true);

        setListeEtages(melange);
        setIndexEtageActuel(0);
        setIndexSalle(0);
        setEnCombatPacte(false);

        // Remise à zéro des stats de la nouvelle run.
        setMonstresTuesRun(0);
        setPactesDebloquesRun([]);
        setDegatsInfligesRun(0);
        setDegatsBloquesRun(0);
        setDegatsEsquivesRun(0);
        setReposVisites(0);
        setChoixReposActifs(null);

        const messageBuff = genererMessageBuff(melange[0], pactesEquipes);
        if (messageBuff) setAConnuBuff(true);

        let messagesSynergie: string[] = [];
        if (synergieActive) {
            const def = SYNERGIES_REGISTRY[synergieActive];
            if (!synergiesDecouvertes.includes(synergieActive)) {
                setSynergiesDecouvertes(prev => [...prev, synergieActive]);
                messagesSynergie = [
                    `<br><b style="color: #f9e2af;">🔮✨ SECRET DÉCOUVERT : Synergie ${synergieActive} — ${def.titre} !</b>`,
                    `<span class="log-tour">${def.description}</span>`,
                ];
            } else {
                messagesSynergie = [`<br><b style="color: #f9e2af;">🔮 Synergie ${synergieActive} active : ${def.titre}.</b>`];
            }
        }

        const messageBenediction = benediction
            ? [`<br><b style="color: #f9e2af;">🐈 Bénédiction du Chat : ${BENEDICTIONS_REGISTRY[benediction].titre} — ${BENEDICTIONS_REGISTRY[benediction].description}</b>`]
            : [];

        setHistoriqueLogs([
            `<b>🎲 Nouvelle Ascension ! Vous entrez dans l'Étage 1.</b>`,
            ...(messageBuff ? [messageBuff] : []),
            ...messagesSynergie,
            ...messageBenediction,
            `<br><b>⚔️ Combat : ${melange[0].monstres[0].nom} approche !</b>`
        ]);
        setEcran('ecran-combat');
    };

    // Entrée dans la Tour : une fois la Bénédiction du Chat obtenue, on passe systématiquement par
    // la Roue de la Chance. Le tirage doit être connu AVANT de construire le héros (il modifie ses
    // stats), d'où ce passage en deux temps — la Roue rend la main à gererLancerRun.
    const gererDemarrerAscension = () => {
        if (!aBenedictionChat) {
            gererLancerRun(null);
            return;
        }
        setBenedictionActive(tirerBenediction());
        setEcran('ecran-roue');
    };

    const gererPassageEtageSuivant = () => {
        if (indexEtageActuel >= listeEtages.length - 1) {
            setEcran('ecran-sortie-tour');
        }
        else {
            // 1ère zone de repos de la run : les 5 choix sont disponibles. Ensuite, seuls 3
            // (tirés aléatoirement à chaque visite) restent utilisables, les 2 autres sont grisés.
            const toutesLesOptions: ChoixRepos[] = ['soin', 'pv', 'atk', 'pre', 'def'];
            setChoixReposActifs(reposVisites === 0 ? null : melangerAleatoirement(toutesLesOptions).slice(0, 3));
            setReposVisites(v => v + 1);
            setEcran('ecran-repos');
        }
    };

    // Déclenché depuis l'écran "Sortie de la Tour" : fait apparaître le Gardien Absolu, agglomérat
    // de tous les Gardiens de Niveau II de la run, avant la victoire totale.
    const gererDeclenchementMegaBoss = () => {
        setMonstreMegaBoss(construireMegaBoss(listeEtages));
        setHistoriqueLogs(prev => [
            ...prev,
            `<br><b style="color: #f38ba8;">🌪️ Les Gardiens vaincus convergent en une seule et unique entité !</b>`
        ]);
        setEnCombatMegaBoss(true);
        setEcran('ecran-combat');
    };

    const gererFinMegaBoss = (victoire: boolean, joueurRestant: Entite) => {
        if (!victoire) {
            gererDefaite();
            return;
        }
        // Brûlure et poison ont déjà été encaissés par le tic de fin de tour, qui s'applique même
        // quand l'ennemi meurt (voir jouer_tour) : il ne reste qu'à nettoyer avant la salle suivante.
        setJoueur({ ...joueurRestant, armure: 0, nivEsquive: 0, brulureActive: undefined, poisonActif: undefined });
        setXpTotal(prev => prev + appliquerBonusXp(10, benedictionActive));
        setVictoireTotale(true);
        // Les Pactes portés jusqu'au bout gagnent leur trophée (cumulé sans doublon d'une victoire
        // à l'autre : chaque composition victorieuse s'ajoute au palmarès).
        setPactesVictorieux(prev => [...new Set([...prev, ...pactesEquipes])]);
        capturerStatsFinRun('victoire');
        setEcran('ecran-fin');
        effacerRun();
    };

    const gererChoixRepos = (choix: ChoixRepos) => {
        if (!joueur) return;
        const j = { ...joueur };
        if (choix === 'soin') { j.pv = Math.min(j.pvMax, j.pv + calculerSoinRepos(j.pvMax, pactesEquipes)); }
        if (choix === 'pv') { const gain = calculerGainPvMaxRepos(pactesEquipes); j.pvMax += gain; j.pv += gain; }
        if (choix === 'atk') j.baseA += 2; if (choix === 'pre') j.baseP += 1; if (choix === 'def') j.baseD += 2;

        const prochainEtage = listeEtages[indexEtageActuel + 1];

        const messageBuff = genererMessageBuff(prochainEtage, pactesEquipes);
        if (messageBuff) setAConnuBuff(true);

        setHistoriqueLogs(prev => [
            ...prev,
            `<br><span class="log-tour">🚪 DIRECTION L'ÉTAGE SUIVANT...</span>`,
            ...(messageBuff ? [messageBuff] : []),
            `<br><b>⚔️ Combat : ${prochainEtage.monstres[0].nom} approche !</b>`
        ]);
        setJoueur(j);
        setIndexEtageActuel(i => i + 1);
        setIndexSalle(0);

        // Un étage PAIR marque un nouveau palier de puissance des monstres (voir buffProgressionEtage) :
        // on prévient le joueur via un écran dédié, sans détailler les stats concrètes.
        const numeroProchainEtage = indexEtageActuel + 2;
        setEcran(numeroProchainEtage % 2 === 0 ? 'ecran-etage-pair' : 'ecran-combat');
    };

    // Remplace les deux handlers onCombattreLvl1/onCombattreLvl2 (auparavant dupliqués dans App.tsx).
    const declencherCombatPacte = (type: 'lvl1' | 'lvl2') => {
        const message = type === 'lvl2'
            ? `<br><b style="color: #f38ba8;">🔥 LE GARDIEN SE RELÈVE DANS SA FORME SUBMÉDITÉE !</b>`
            : `<br><b style="color: #f38ba8;">🔥 LE GARDIEN SE RELÈVE DANS SA FORME HÉROÏQUE !</b>`;
        setHistoriqueLogs(prev => [...prev, message]);
        setTypeCombatPacte(type);
        setEnCombatPacte(true);
        setEcran('ecran-cinematique');
    };

    const ajouterLogGlobal = (log: string) => setHistoriqueLogs(prev => [...prev, log]);

    const ajouterStatsTour = (degatsInfliges: number, degatsBloques: number, degatsEsquives: number) => {
        setDegatsInfligesRun(prev => prev + degatsInfliges);
        setDegatsBloquesRun(prev => prev + degatsBloques);
        setDegatsEsquivesRun(prev => prev + degatsEsquives);
    };

    const gererRecompenseCombat = () => {
        const recompense = calculerRecompenseCombat(listeEtages[indexEtageActuel], indexSalle, enCombatPacte, typeCombatPacte, pactesEquipes);
        const gainXp = appliquerBonusXp(recompense.gainXp, benedictionActive);

        setMonstresTues(prev => prev + 1);
        setMonstresTuesRun(prev => prev + 1);
        setBestiaire(prev => ({ ...prev, [recompense.typeMonstre]: prev[recompense.typeMonstre] + 1 }));
        setXpTotal(prev => prev + gainXp);
        setHistoriqueLogs(prev => [...prev, `<div class="log-soin">🌟 Vous gagnez ${gainXp} point(s) d'XP ${benedictionActive === 'apprentissage' ? '(Leçon du Maître : XP doublée) ' : ''}!</div>`]);
    };

    const gererDefaite = () => {
        setLogsMort(extraireLogsDuDernierTour(lireHistoriqueLogsPersistant()));
        setVictoireTotale(false);
        capturerStatsFinRun('mort');
        setEcran('ecran-fin');
        effacerRun();
    };

    const gererDeblocagePacte = (nomPacteCourant: string) => {
        setEnCombatPacte(false);
        const nomFinal = typeCombatPacte === 'lvl2' ? nomPacteCourant + " II" : nomPacteCourant;
        if (!pactesDebloques.includes(nomFinal)) {
            setPactesDebloques([...pactesDebloques, nomFinal]);
            setPactesDebloquesRun(prev => [...prev, nomFinal]);
        }

        setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ VOUS AVEZ ARRACHÉ LE ${nomFinal.toUpperCase()} !</span>`]);
        programmerTransition(gererPassageEtageSuivant);
    };

    const gererFinDeGardien = (aLvl1Equipe: boolean, aLvl2Equipe: boolean, aLvl1Possede: boolean, aLvl2Possede: boolean) => {
        if (aLvl2Equipe) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Puissance maximale confirmée. Le Gardien s'incline. Progression automatique !</span>`]);
            programmerTransition(gererPassageEtageSuivant);
            return;
        }
        if (aLvl1Equipe) {
            if (aLvl2Possede) {
                setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Vous possédez déjà la Forme Finale de ce pacte. Progression automatique !</span>`]);
                programmerTransition(gererPassageEtageSuivant);
            } else {
                setEcran('ecran-choix-boss');
            }
            return;
        }
        if (aLvl1Possede || aLvl2Possede) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Vous possédez déjà ce pacte. Le Gardien vous laisse passer. Progression automatique !</span>`]);
            programmerTransition(gererPassageEtageSuivant);
        } else {
            setEcran('ecran-choix-boss');
        }
    };

    const gererProgressionSalle = (etageActuel: StructureEtage, aLvl1Equipe: boolean, aLvl2Equipe: boolean) => {
        const prochaineSalle = indexSalle + 1;
        setIndexSalle(prochaineSalle);

        if (prochaineSalle === (etageActuel?.monstres?.length || 0)) {
            if (aLvl2Equipe) {
                setHistoriqueLogs(prev => [...prev, `<br><b style="color: #f38ba8;">🔥 Le Gardien résonne avec votre Pacte de Niveau II et libère d'emblée sa FORME FINALE !</b>`]);
            } else if (aLvl1Equipe) {
                setHistoriqueLogs(prev => [...prev, `<br><b style="color: #fab387;">⚡ Le Gardien sent votre maîtrise du Niveau I et engage directement le combat dans sa FORME ÉVOLUÉE !</b>`]);
            } else {
                setHistoriqueLogs(prev => [...prev, `<br><b>👑 Combat : Le Gardien approche !</b>`]);
            }
            setEcran('ecran-cinematique');
            return;
        }

        const prochainMonstre = etageActuel?.monstres[prochaineSalle];
        if (prochainMonstre) {
            setHistoriqueLogs(prev => [...prev, `<br><b>⚔️ Combat : ${prochainMonstre.nom} approche !</b>`]);
        }
    };

    const handleFinDeCombat = (victoire: boolean, joueurRestant: Entite, doubleKO: boolean = false) => {
        if (enCombatMegaBoss) {
            gererFinMegaBoss(victoire, joueurRestant);
            return;
        }

        if (victoire || doubleKO) {
            gererRecompenseCombat();
        }

        if (!victoire) {
            gererDefaite();
            return;
        }

        // Brûlure et poison ont déjà été encaissés par le tic de fin de tour, qui s'applique même
        // quand l'ennemi meurt (voir jouer_tour) : il ne reste qu'à nettoyer avant la salle suivante.
        setJoueur({ ...joueurRestant, armure: 0, nivEsquive: 0, brulureActive: undefined, poisonActif: undefined });

        const etageActuel = listeEtages[indexEtageActuel];
        const nomPacteCourant = etageActuel?.idPacte || "Pacte Inconnu";
        const aLvl1Equipe = pactesEquipes.includes(nomPacteCourant);
        const aLvl2Equipe = pactesEquipes.includes(nomPacteCourant + " II");
        const aLvl1Possede = pactesDebloques.includes(nomPacteCourant);
        const aLvl2Possede = pactesDebloques.includes(nomPacteCourant + " II");

        if (enCombatPacte) {
            gererDeblocagePacte(nomPacteCourant);
            return;
        }

        if (indexSalle === (etageActuel?.monstres?.length || 0)) {
            gererFinDeGardien(aLvl1Equipe, aLvl2Equipe, aLvl1Possede, aLvl2Possede);
            return;
        }

        gererProgressionSalle(etageActuel, aLvl1Equipe, aLvl2Equipe);
    };

    return {
        // Moteur WASM
        moteurPret,
        erreurMoteur,

        // Progression de la run en cours
        ecran, setEcran,
        listeEtages,
        indexEtageActuel,
        indexSalle,
        joueur,
        historiqueLogs,
        victoireTotale,
        enCombatPacte,
        typeCombatPacte,
        logsMort,
        statsDerniereRun,
        enCombatMegaBoss,
        monstreMegaBoss,
        choixReposActifs,
        monstreTuto,

        // Pactes
        pactesDebloques,
        pactesEquipes,
        pactesVictorieux,
        aPacteChat,

        // Bénédiction du Chat et ses apparitions scénarisées
        aBenedictionChat,
        benedictionActive,
        vieChatDispo,
        forgeronPresente,

        // Progression méta (hors-run)
        monstresTues,
        competences, setCompetences,
        xpTotal,
        bestiaire,
        aConnuBuff,
        synergiesDecouvertes,
        aNouveauteTuto,
        aNouveauPacte,
        aPointsCompetenceDispo,

        // Actions
        ajouterLogGlobal,
        ajouterStatsTour,
        marquerTutoLu,
        marquerPactesVus,
        gererAbandon,
        gererBasculerPacte,
        gererEquiperSynergie,
        gererDemarrerAscension,
        gererLancerRun,
        gererVieDeChatConsommee,
        gererQuitterFin,
        gererRecevoirBenediction,
        gererForgeronPresente,
        gererLeconComboFaite,
        gererPassageEtageSuivant,
        gererChoixRepos,
        declencherCombatPacte,
        gererDeclenchementMegaBoss,
        gererFinTutoriel,
        gererConclusionTuto,
        gererAbandonTuto,
        handleFinDeCombat,
    };
}
