// src/hooks/useGameState.ts
import { useEffect, useMemo, useState } from 'react';
import init, { get_donnees_etages } from 'moteur_wasm';
import type { Ecran, Entite, StructureEtage, Competences, Bestiaire, StatsRun, ChoixRepos, Synergie, BenedictionChat, LeconMort, IssueAscension } from '../types';
import { appliquerPactesSurJoueur, calculerSoinRepos, calculerGainPvMaxRepos, peutEquiperPacte } from '../utils/pactes';
import { cleProfil, type CleProfil } from '../utils/hardcore';
import {
    compterPactes, publierSucces, succesDebloques, themeMerite, type ProgressionSucces,
} from '../utils/succes';
import { BENEDICTIONS_REGISTRY, appliquerBenedictionSurJoueur, appliquerBonusXp, tirerBenediction } from '../utils/benedictions';
import { melangerEtages, genererCycleInfini, genererMessageBuff, melangerAleatoirement, palierFinDeTour } from '../utils/etages';
import { construireMegaBoss } from '../utils/megaboss';
import { detecterSynergie, SYNERGIES_REGISTRY } from '../utils/synergies';
import { detecterLeconMort, leconAAfficher, type CirconstancesMort } from '../utils/leconsMort';
import { construireChatMysterieux, construireHerosTuto, DIALOGUE_CHAT_TUTO } from '../utils/tutoCombat';
import { calculerRecompenseCombat } from '../utils/recompenses';
import { calculerPointsDisponibles } from '../utils/competences';
import { lireHistoriqueLogsPersistant, extraireLogsDuDernierTour, lireValeurPersistante } from '../utils/logs';
import {
    COMBO_VIDE, COMPTEURS_ACTIONS_VIDES, COMPTEURS_REPOS_VIDES, construireEvenementRun,
    fusionnerCombo, incrementerCompteurs, journaliserRun,
    type CompteursActions, type CompteursRepos, type StatCombo, type StatsTour,
} from '../utils/telemetrieRuns';
import { publierRecordEtage } from '../utils/classement';
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

    // --- MODE HARDCORE (voir utils/hardcore.ts) ---
    // Le setter n'est volontairement PAS récupéré : changer de mode change la clé de stockage de
    // toute la progression, ce qui impose un rechargement de page (cf. basculerProfil). Passer par
    // un setState laisserait les états sur l'ancien profil — l'omission rend l'erreur impossible.
    const [modeHardcore] = useLocalStorage<boolean>('tdp_mode_hardcore', false);
    // Déblocage à vie du mode, partagé par les deux profils. Distinct de `victoireTotale`, qui ne
    // décrit que l'issue de la DERNIÈRE run et repasse à false à la mort suivante.
    const [aVaincuLaTour, setAVaincuLaTour] = useLocalStorage<boolean>('tdp_tour_vaincue', false);

    const [pactesDebloques, setPactesDebloques] = useLocalStorage<string[]>(cleProfil('tdp_pactes_debloques', modeHardcore), []);
    const [pactesEquipes, setPactesEquipes] = useLocalStorage<string[]>(cleProfil('tdp_pactes_equipes', modeHardcore), []);

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
    // --- MODE INFINI ---
    // Nombre de cycles de 12 étages acceptés dans CETTE run, au-delà du premier Gardien Absolu.
    // 0 = Tour normale. C'est un état de run : remis à zéro à chaque lancement.
    const [cyclesInfini, setCyclesInfini] = useLocalStorage<number>('tdp_cycles_infini', 0);
    // L'offre de s'enfoncer est ouverte : un Gardien Absolu vient de tomber et la run est encore
    // en vol. Drapeau explicite plutôt que déduit de `victoireTotale` — ce dernier reste vrai
    // jusqu'à la mort suivante, il autoriserait donc à « reprendre » une run déjà effacée.
    const [offreInfiniDispo, setOffreInfiniDispo] = useLocalStorage<boolean>('tdp_offre_infini', false);
    const [choixReposActifs, setChoixReposActifs] = useLocalStorage<ChoixRepos[] | null>('tdp_choix_repos_actifs', null);
    const [synergiesDecouvertes, setSynergiesDecouvertes] = useLocalStorage<Synergie[]>('tdp_synergies_decouvertes', []);
    const [tutoIntroFait, setTutoIntroFait] = useLocalStorage<boolean>('tdp_tuto_intro_fait', false);
    const [monstreTuto, setMonstreTuto] = useLocalStorage<Entite | null>('tdp_monstre_tuto', null);
    const [aPacteChat, setAPacteChat] = useLocalStorage<boolean>('tdp_a_pacte_chat', false);
    // Pactes avec lesquels le joueur a déjà terrassé la Tour entière : trophée à vie, jamais remis
    // à zéro d'une run à l'autre (contrairement aux stats de run).
    const [pactesVictorieux, setPactesVictorieux] = useLocalStorage<string[]>(cleProfil('tdp_pactes_victorieux', modeHardcore), []);
    const [aBenedictionChat, setABenedictionChat] = useLocalStorage<boolean>('tdp_benediction_chat', false);
    // Apparitions successives du Chat entre deux runs (voir gererQuitterFin) : chacune ne se joue
    // qu'une fois, dans l'ordre, et `runsTerminees` sert de minimum d'ancienneté.
    const [runsTerminees, setRunsTerminees] = useLocalStorage<number>('tdp_runs_terminees', 0);
    // Numéro de run pour le journal cloud (voir utils/telemetrieRuns.ts). Distinct de
    // `runsTerminees`, qui ne compte QUE les runs achevées : un abandon consommerait sinon le même
    // numéro que la run suivante, et la clé primaire (user_id, numero_run) en rejetterait une des
    // deux en silence. La valeur de départ est `runsTerminees` et non 0 : chez un joueur déjà
    // installé, les runs déjà journalisées portent des numéros jusqu'à ce total, on repart donc
    // juste au-dessus au lieu de réutiliser des numéros pris.
    const [, setRunsLancees] = useLocalStorage<number>('tdp_runs_lancees', runsTerminees);
    // Score du classement hardcore (voir utils/classement.ts). Compteur DÉDIÉ : `runsLancees` et
    // `runsTerminees` sont partagés entre les deux profils, ils incluraient donc toutes les runs
    // normales jouées avant même que le mode ne soit débloqué. Celui-ci est remis à zéro par
    // effacerProfilHardcore() — la mort effaçant toute la puissance, un petit nombre veut dire
    // « fini presque en partant de rien ». `runsHcTotales` garde la trace des tentatives à vie :
    // il n'entre pas dans le classement mais permet de le relire autrement plus tard.
    const [runsHc, setRunsHc] = useLocalStorage<number>('tdp_hc_runs', 0);
    const [runsHcTotales, setRunsHcTotales] = useLocalStorage<number>('tdp_hc_runs_totales', 0);
    // Monstres terrassés sur la même période que `runsHc` (donc remis à zéro avec lui). Ni
    // `monstresTues`, partagé avec le mode normal, ni `tdp_monstres_tues_run`, qui ne couvre que
    // la run victorieuse — cette dernière traversant forcément les 48 salles de la Tour, elle
    // donnerait à peu près le même chiffre à tout le monde.
    const [monstresHc, setMonstresHc] = useLocalStorage<number>('tdp_hc_monstres', 0);
    // Identité publique du joueur, PARTAGÉE par les deux profils et par les trois classements —
    // sans elle, le même joueur apparaîtrait sous deux pseudos selon la liste consultée. Gardée en
    // local pour savoir, sans aller au réseau, si ses records ont le droit d'être publiés : un
    // joueur qui n'a jamais choisi de nom n'a pas demandé à figurer dans une liste publique.
    const [nomJoueur, setNomJoueur] = useLocalStorage<string>('tdp_nom_joueur', '');
    const [forgeronPresente, setForgeronPresente] = useLocalStorage<boolean>('tdp_forgeron_presente', false);
    const [leconComboFaite, setLeconComboFaite] = useLocalStorage<boolean>('tdp_lecon_combo_faite', false);
    const [leconsMortVues, setLeconsMortVues] = useLocalStorage<LeconMort[]>('tdp_lecons_mort_vues', []);
    const [leconMortEnAttente, setLeconMortEnAttente] = useLocalStorage<LeconMort | null>('tdp_lecon_mort_attente', null);
    const [pacteObtenu, setPacteObtenu] = useLocalStorage<string | null>('tdp_pacte_obtenu', null);
    const [benedictionActive, setBenedictionActive] = useLocalStorage<BenedictionChat | null>('tdp_benediction_active', null);
    const [vieChatDispo, setVieChatDispo] = useLocalStorage<boolean>('tdp_vie_chat_dispo', false);

    const [monstresTues, setMonstresTues] = useLocalStorage<number>(cleProfil('tdp_monstres_tues', modeHardcore), 0);
    // --- Compteurs des succès (voir utils/succes.ts), tous propres au profil actif ---
    const [runsAchevees, setRunsAchevees] = useLocalStorage<number>(cleProfil('tdp_runs_achevees', modeHardcore), 0);
    const [bossLvl0, setBossLvl0] = useLocalStorage<string[]>(cleProfil('tdp_boss_lvl0', modeHardcore), []);
    const [bossLvl1, setBossLvl1] = useLocalStorage<string[]>(cleProfil('tdp_boss_lvl1', modeHardcore), []);
    const [bossLvl2, setBossLvl2] = useLocalStorage<string[]>(cleProfil('tdp_boss_lvl2', modeHardcore), []);
    const [synergiesActivees, setSynergiesActivees] = useLocalStorage<Synergie[]>(cleProfil('tdp_synergies_activees', modeHardcore), []);
    // Boss terrassés par leur PROPRE mécanique (brûlure, poison, assaut d'armure). Partagé entre
    // les profils : c'est un fait d'armes, pas une progression — d'où son absence de CLES_PROFIL.
    const [succesTheme, setSuccesTheme] = useLocalStorage<string[]>('tdp_succes_theme', []);
    const [degatsEsquivesTotal, setDegatsEsquivesTotal] = useLocalStorage<number>(cleProfil('tdp_degats_esquives_total', modeHardcore), 0);
    const [degatsBloquesTotal, setDegatsBloquesTotal] = useLocalStorage<number>(cleProfil('tdp_degats_bloques_total', modeHardcore), 0);
    const [degatsAttaqueTotal, setDegatsAttaqueTotal] = useLocalStorage<number>(cleProfil('tdp_degats_attaque_total', modeHardcore), 0);
    const [degatsPreciseTotal, setDegatsPreciseTotal] = useLocalStorage<number>(cleProfil('tdp_degats_precise_total', modeHardcore), 0);
    const [soinsTotal, setSoinsTotal] = useLocalStorage<number>(cleProfil('tdp_soins_total', modeHardcore), 0);
    const [competences, setCompetences] = useLocalStorage<Competences>(cleProfil('tdp_competences', modeHardcore), { pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
    const [xpTotal, setXpTotal] = useLocalStorage<number>(cleProfil('tdp_xp_total', modeHardcore), 0);
    const [bestiaire, setBestiaire] = useLocalStorage<Bestiaire>('tdp_bestiaire', { normal: 0, boss: 0, evolue: 0, final: 0 });

    const [aConnuBuff, setAConnuBuff] = useLocalStorage<boolean>('tdp_a_connu_buff', false);
    const [connaissancesVues, setConnaissancesVues] = useLocalStorage<number>('tdp_tuto_vues', 0);
    const [pactesVus, setPactesVus] = useLocalStorage<number>(cleProfil('tdp_pactes_vus', modeHardcore), 0);
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
    // Zones de Repos : ce qui a été PROPOSÉ et ce qui a été PRIS. Les deux, parce qu'au-delà de la
    // 1re visite d'une run seules 3 des 5 options sont tirées — un choix peu pris peut donc n'avoir
    // été que peu proposé, et le taux d'utilisation serait faux sans son dénominateur.
    const [, setReposProposesRun] = useLocalStorage<CompteursRepos>('tdp_repos_proposes_run', COMPTEURS_REPOS_VIDES);
    const [, setReposPrisRun] = useLocalStorage<CompteursRepos>('tdp_repos_pris_run', COMPTEURS_REPOS_VIDES);
    // Comment le joueur JOUE, par opposition à ce qu'il équipe : actions programmées et efficacité
    // au combo, la sienne comme celle des monstres — ces derniers tirant au hasard, leur combo
    // moyen est l'étalon de ce qu'on obtient sans chercher à enchaîner.
    const [, setActionsRun] = useLocalStorage<CompteursActions>('tdp_actions_run', COMPTEURS_ACTIONS_VIDES);
    const [, setComboJoueurRun] = useLocalStorage<StatCombo>('tdp_combo_joueur_run', COMBO_VIDE);
    const [, setComboMonstresRun] = useLocalStorage<StatCombo>('tdp_combo_monstres_run', COMBO_VIDE);
    const [etageRecord, setEtageRecord] = useLocalStorage<number>(cleProfil('tdp_etage_record', modeHardcore), 0);
    // Records irrévocables des compteurs de succès (voir CLES_PROFIL) : `effacerProfilHardcore`
    // n'y touche pas, un succès obtenu ne se reprend donc jamais.
    const [succesEtageMax, setSuccesEtageMax] = useLocalStorage<number>(cleProfil('tdp_succes_etage_max', modeHardcore), 0);
    const [succesPactes1Max, setSuccesPactes1Max] = useLocalStorage<number>(cleProfil('tdp_succes_pactes1_max', modeHardcore), 0);
    const [succesPactes2Max, setSuccesPactes2Max] = useLocalStorage<number>(cleProfil('tdp_succes_pactes2_max', modeHardcore), 0);
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
    // Les Pactes arrachés depuis la dernière visite de l'Inventaire. `pactesDebloques` étant
    // toujours complété par la fin, la coupure au compteur suffit — inutile de stocker une 2e liste.
    const pactesNonVus = pactesDebloques.slice(pactesVus);
    const aPointsCompetenceDispo = calculerPointsDisponibles(xpTotal, competences) > 0;

    // En hardcore, le Forgeron et la Roue de la Chance sont acquis d'emblée : le mode ne s'ouvre
    // qu'à un joueur qui a déjà terrassé la Tour, lui refaire attendre deux runs pour rouvrir la
    // forge n'aurait aucun sens. Ces deux valeurs remplacent partout les drapeaux bruts côté jeu ;
    // les drapeaux eux-mêmes (partagés entre les profils) ne sont posés que par les scènes du Chat.
    const forgeronDisponible = forgeronPresente || modeHardcore;
    const benedictionDisponible = aBenedictionChat || modeHardcore;

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

                // Sauvegardes antérieures au journal de runs : le compteur doit être POSÉ, pas
                // seulement initialisé en mémoire, sinon la run en cours serait journalisée avec le
                // numéro 0. Une run déjà en vol a été lancée sans compteur : on lui attribue
                // `runsTerminees + 1`, exactement le numéro qu'utilisait la version précédente —
                // donc au-dessus des runs déjà journalisées, et libéré pour la suivante.
                if (window.localStorage.getItem('tdp_runs_lancees') === null) {
                    setRunsLancees(runsTerminees + (listeEtages.length > 0 ? 1 : 0));
                }

                // Sauvegardes antérieures au mode hardcore : le joueur a peut-être déjà terrassé
                // la Tour, il ne doit pas avoir à recommencer pour rouvrir le mode. `tdp_victoire`
                // ne dit que l'issue de la DERNIÈRE run (il repasse à false à la mort suivante),
                // d'où le repli sur les Pactes victorieux, eux cumulés à vie.
                if (window.localStorage.getItem('tdp_tour_vaincue') === null && (victoireTotale || pactesVictorieux.length > 0)) {
                    setAVaincuLaTour(true);
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
            runsTerminees, forgeronPresente, leconComboFaite, leconsMortVues, leconMortEnAttente, pacteObtenu,
            modeHardcore, aVaincuLaTour, cyclesInfini, offreInfiniDispo,
        ],
    );

    // --- SUCCÈS (voir utils/succes.ts) ---
    // Le profil ACTIF vient de l'état React ; le profil DORMANT est relu directement dans
    // localStorage, `useLocalStorage` n'ouvrant que la clé du mode courant. Les succès doivent
    // pourtant refléter les deux versants à tout moment, y compris celui auquel on ne joue pas.
    const lireDormant = <T,>(cle: CleProfil, defaut: T): T =>
        lireValeurPersistante(cleProfil(cle, !modeHardcore), defaut);

    const pactesComptes = compterPactes(pactesDebloques);
    const moitieActive = useMemo(() => ({
        monstresTues,
        // `max` du record figé et de la valeur courante : le record n'est écrit qu'à l'instant de
        // l'effacement (voir `effacerProfilHardcore`), il vaut donc 0 partout ailleurs — y compris
        // sur une sauvegarde antérieure à ces clés, où la valeur courante fait seule foi.
        etageRecord: Math.max(succesEtageMax, etageRecord),
        runs: runsAchevees,
        pactesLvl1: Math.max(succesPactes1Max, pactesComptes.lvl1),
        pactesLvl2: Math.max(succesPactes2Max, pactesComptes.lvl2),
        synergies: synergiesActivees.length,
        bossLvl0: bossLvl0.length,
        bossLvl1: bossLvl1.length,
        bossLvl2: bossLvl2.length,
        degatsEsquives: degatsEsquivesTotal,
        degatsBloques: degatsBloquesTotal,
        degatsAttaque: degatsAttaqueTotal,
        degatsPrecise: degatsPreciseTotal,
        soins: soinsTotal,
    }), [monstresTues, succesEtageMax, etageRecord, runsAchevees, succesPactes1Max, succesPactes2Max,
        pactesComptes.lvl1, pactesComptes.lvl2, synergiesActivees.length, bossLvl0.length,
        bossLvl1.length, bossLvl2.length, degatsEsquivesTotal, degatsBloquesTotal, degatsAttaqueTotal,
        degatsPreciseTotal, soinsTotal]);
    // ⚠️ Lu UNE SEULE FOIS pour la session : seul le profil actif est écrit, et en basculer impose un
    // rechargement de page (voir `basculerProfil`). Recalculé à chaque rendu, ce bloc coûtait 14
    // `JSON.parse` de localStorage par rendu, une quinzaine de fois par tour de combat — en pleine
    // animation.
    const [moitieDormante] = useState(() => {
        const pactesDormants = lireDormant<string[]>('tdp_pactes_debloques', []);
        const comptes = compterPactes(pactesDormants);
        return {
            monstresTues: lireDormant('tdp_monstres_tues', 0),
            etageRecord: Math.max(lireDormant('tdp_succes_etage_max', 0), lireDormant('tdp_etage_record', 0)),
            runs: lireDormant('tdp_runs_achevees', 0),
            pactesLvl1: Math.max(lireDormant('tdp_succes_pactes1_max', 0), comptes.lvl1),
            pactesLvl2: Math.max(lireDormant('tdp_succes_pactes2_max', 0), comptes.lvl2),
            synergies: lireDormant<Synergie[]>('tdp_synergies_activees', []).length,
            bossLvl0: lireDormant<string[]>('tdp_boss_lvl0', []).length,
            bossLvl1: lireDormant<string[]>('tdp_boss_lvl1', []).length,
            bossLvl2: lireDormant<string[]>('tdp_boss_lvl2', []).length,
            degatsEsquives: lireDormant('tdp_degats_esquives_total', 0),
            degatsBloques: lireDormant('tdp_degats_bloques_total', 0),
            degatsAttaque: lireDormant('tdp_degats_attaque_total', 0),
            degatsPrecise: lireDormant('tdp_degats_precise_total', 0),
            soins: lireDormant('tdp_soins_total', 0),
        };
    });
    const [moitieNormale, moitieHc] = modeHardcore
        ? [moitieDormante, moitieActive]
        : [moitieActive, moitieDormante];

    // `succesDebloques` parcourt les 96 définitions en cherchant leur série ou leur thème : sans
    // mémorisation, c'est ~1600 parcours de tableau à chaque rendu.
    const progressionSucces: ProgressionSucces = useMemo(() => ({
        ...moitieNormale,
        monstresTuesHc: moitieHc.monstresTues,
        etageRecordHc: moitieHc.etageRecord,
        runsHc: moitieHc.runs,
        pactesLvl1Hc: moitieHc.pactesLvl1,
        pactesLvl2Hc: moitieHc.pactesLvl2,
        synergiesHc: moitieHc.synergies,
        bossLvl0Hc: moitieHc.bossLvl0,
        bossLvl1Hc: moitieHc.bossLvl1,
        bossLvl2Hc: moitieHc.bossLvl2,
        degatsEsquivesHc: moitieHc.degatsEsquives,
        degatsBloquesHc: moitieHc.degatsBloques,
        degatsAttaqueHc: moitieHc.degatsAttaque,
        degatsPreciseHc: moitieHc.degatsPrecise,
        soinsHc: moitieHc.soins,
        themes: succesTheme,
    }), [moitieNormale, moitieHc, succesTheme]);

    const succesObtenus = useMemo(() => succesDebloques(progressionSucces), [progressionSucces]);
    // Pastille "nouveau succès". ⚠️ On mémorise les IDENTIFIANTS vus, pas leur nombre — contrairement
    // aux Pactes, la liste n'est pas monotone : `succesDebloques` la recalcule intégralement depuis
    // la progression, et une mort en hardcore en retire. Un compteur se retrouverait au-dessus du
    // total et éteindrait la pastille alors que d'autres succès ont été gagnés entre-temps.
    // Clé partagée : `succesObtenus` couvre déjà les deux profils.
    const [succesVus, setSuccesVus] = useLocalStorage<string[]>('tdp_succes_vus', []);
    const aNouveauSucces = succesObtenus.some(id => !succesVus.includes(id));
    const marquerSuccesVus = () => setSuccesVus(succesObtenus);
    // Signature plutôt que le tableau : ce dernier est reconstruit à chaque rendu, il déclencherait
    // un envoi par frappe de clavier. La liste étant issue d'un ordre stable (le registre), la
    // comparaison de chaînes suffit à détecter un vrai changement.
    const signatureSucces = succesObtenus.join(',');
    useEffect(() => {
        if (signatureSucces) void publierSucces(signatureSucces.split(','));
    }, [signatureSucces]);

    const effacerRun = () => {
        setListeEtages([]); setJoueur(null); setHistoriqueLogs([]);
        setIndexEtageActuel(0); setIndexSalle(0); setEnCombatPacte(false);
        setEnCombatMegaBoss(false); setMonstreMegaBoss(null);
        setCyclesInfini(0); setOffreInfiniDispo(false);
        // La bénédiction ne vaut que pour la run écoulée : la Roue est retournée à chaque entrée.
        setBenedictionActive(null); setVieChatDispo(false);
        effacerEtatCombat();
    };

    // Fige les stats de la run qui vient de se terminer (mort ou victoire totale) AVANT que
    // effacerRun() ne remette indexEtageActuel et les compteurs à zéro — sinon l'écran de fin
    // n'aurait plus rien à afficher.
    // Charge utile du journal cloud, commune aux trois issues. Toutes les valeurs de run sont
    // relues dans le localStorage plutôt que prises dans la closure : ce code part d'un callback de
    // fin de combat, dont l'état capturé peut dater d'avant le tour fatal (cf. utils/logs.ts).
    const construireEvenementDeLaRun = (issue: IssueAscension) => construireEvenementRun({
        numeroRun: lireValeurPersistante('tdp_runs_lancees', 0),
        issue,
        // Sans ce drapeau, les runs hardcore se mélangeraient aux normales dans toutes les
        // analyses — alors qu'elles se jouent sur un profil reparti de zéro, avec des Pactes et
        // un arbre bien plus faibles à étage égal.
        hardcore: modeHardcore,
        etage: indexEtageActuel + 1,
        salle: indexSalle,
        // La Tour est mélangée à chaque run : sans la séquence tirée, `etage` ne dit pas quels
        // Gardiens ont réellement été rencontrés.
        etages: listeEtages.map(e => e.idPacte),
        pactesEquipes,
        competences,
        benediction: benedictionActive,
        monstresTues: lireValeurPersistante('tdp_monstres_tues_run', 0),
        pactesArraches: lireValeurPersistante<string[]>('tdp_pactes_debloques_run', []),
        degatsInfliges: lireValeurPersistante('tdp_degats_infliges_run', 0),
        degatsBloques: lireValeurPersistante('tdp_degats_bloques_run', 0),
        degatsEsquives: lireValeurPersistante('tdp_degats_esquives_run', 0),
        reposProposes: lireValeurPersistante('tdp_repos_proposes_run', COMPTEURS_REPOS_VIDES),
        reposPris: lireValeurPersistante('tdp_repos_pris_run', COMPTEURS_REPOS_VIDES),
        actions: lireValeurPersistante('tdp_actions_run', COMPTEURS_ACTIONS_VIDES),
        comboJoueur: lireValeurPersistante('tdp_combo_joueur_run', COMBO_VIDE),
        comboMonstres: lireValeurPersistante('tdp_combo_monstres_run', COMBO_VIDE),
    });

    const capturerStatsFinRun = (issue: IssueAscension) => {
        // Appelée exactement une fois par run ACHEVÉE — mort, victoire totale, extraction, et en
        // hardcore l'abandon (qui y coûte le profil, donc achève bel et bien la run). Un abandon
        // hors hardcore, lui, ne passe pas par ici. C'est donc le bon endroit pour compter les
        // runs qui cadencent les apparitions du Chat, et pour journaliser la run côté cloud.
        setRunsTerminees(n => n + 1);
        // Compteur propre au profil : `runsTerminees` est partagé (il cadence les apparitions du
        // Chat) et mélangerait donc les ascensions des deux modes.
        setRunsAchevees(n => n + 1);

        const etageAtteint = indexEtageActuel + 1;
        const estNouveauRecord = etageAtteint > etageRecord;
        if (estNouveauRecord) {
            setEtageRecord(etageAtteint);
            // Publié sous le mode courant : les deux profils sont des progressions séparées, les
            // mélanger comparerait un héros accumulé à un héros reparti de zéro. Jamais attendu,
            // et sans effet si le joueur n'a pas choisi de nom.
            if (nomJoueur) void publierRecordEtage(nomJoueur, modeHardcore, etageAtteint);
        }

        setStatsDerniereRun({
            issue,
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
        // échec d'envoi n'a aucune conséquence pour le joueur. `benedictionActive`, `listeEtages`
        // et `pactesEquipes` sont encore intacts ici — effacerRun() ne les vide qu'après.
        void journaliserRun(construireEvenementDeLaRun(issue));
    };

    // Bénédiction "Vie de Chat" consommée : CombatArene a relevé le joueur au lieu de le laisser
    // mourir, il ne reste plus rien à dépenser pour le reste de la run.
    const gererVieDeChatConsommee = () => setVieChatDispo(false);

    // --- MODE HARDCORE (voir utils/hardcore.ts) ---

    // Bascule d'un profil à l'autre. Deux contraintes imposent le rechargement de page :
    //  1. `useLocalStorage` ne lit sa clé qu'à l'initialisation (useState) — changer la clé en
    //     cours de session laisserait toute la progression sur les valeurs de l'ancien profil tout
    //     en écrivant dans les clés du nouveau. Même remède que la restauration cloud, pour la
    //     même raison (voir useSauvegardeCloud.ts).
    //  2. L'écriture passe DIRECTEMENT par localStorage et non par les setters : l'updater de
    //     `useLocalStorage` n'est exécuté que lors du rendu suivant, qui n'aura jamais lieu
    //     puisque le rechargement part immédiatement après.
    // Le bouton n'existe qu'au Hub, où aucune ascension n'est en cours (toutes les routes vers le
    // Hub passent par effacerRun) : il n'y a donc pas d'état de run à nettoyer ici.
    const basculerProfil = (versHardcore: boolean) => {
        window.localStorage.setItem('tdp_mode_hardcore', JSON.stringify(versHardcore));
        window.localStorage.setItem('tdp_ecran', JSON.stringify('ecran-hub' satisfies Ecran));
        window.location.reload();
    };

    const gererEntrerHardcore = () => basculerProfil(true);
    const gererQuitterHardcore = () => basculerProfil(false);

    // La règle du mode : mourir efface le profil hardcore. Seule la PUISSANCE accumulée disparaît —
    // le savoir (Synergies découvertes, bestiaire, Archives, progrès du Chat) vit dans des clés
    // partagées que ce nettoyage ne touche pas, et le profil normal dort dans les siennes.
    const effacerProfilHardcore = () => {
        // ⚠️ Figer AVANT d'effacer les compteurs de succès que ce nettoyage remet à zéro. Sans cela,
        // une mort hardcore RETIRE des succès déjà obtenus — et `publierSucces` poussant la liste
        // entière, ils disparaissent aussi du registre public. « Finisseur » exigeant les 95 autres
        // simultanément, il aurait fallu ne plus jamais mourir une fois la collection complète.
        const comptes = compterPactes(pactesDebloques);
        setSuccesEtageMax(m => Math.max(m, etageRecord));
        setSuccesPactes1Max(m => Math.max(m, comptes.lvl1));
        setSuccesPactes2Max(m => Math.max(m, comptes.lvl2));

        setPactesDebloques([]);
        setPactesEquipes([]);
        setPactesVus(0);
        setPactesVictorieux([]);
        setXpTotal(0);
        setCompetences({ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
        setEtageRecord(0);
        // Le score du classement repart avec le reste : c'est ce qui lui donne son sens (« fini en
        // N runs en partant de rien »). `tdp_hc_runs_totales`, lui, n'est jamais remis à zéro.
        setRunsHc(0);
        setMonstresHc(0);
    };

    const gererAbandon = () => {
        // En hardcore, renoncer en pleine Tour revient à y mourir. Sans cette règle, il suffirait
        // d'abandonner au premier coup dur pour repartir avec un butin que la porte de sortie est
        // justement censée faire payer : la décision de fin d'étage n'aurait plus aucun enjeu, et
        // tout le mode avec elle. La run compte donc comme achevée (record, statistiques, écran de
        // fin) et le profil est effacé, score du classement compris.
        // Seule l'issue JOURNALISÉE reste `abandon` : en analyse, un joueur qui renonce et un
        // joueur que la Tour a tué ne se confondent pas, quelles qu'en soient les conséquences.
        if (modeHardcore && listeEtages.length > 0) {
            setVictoireTotale(false);
            // Personne n'a porté de coup fatal : afficher le dernier tour sous le titre
            // « Coup de Grâce » raconterait une mort qui n'a pas eu lieu.
            setLogsMort([]);
            setLeconMortEnAttente(null);
            capturerStatsFinRun('abandon');
            effacerProfilHardcore();
            setEcran('ecran-fin');
            effacerRun();
            return;
        }

        // Hors hardcore, un abandon ne passe PAS par capturerStatsFinRun : il ne compte ni pour
        // `runsTerminees` (qui cadence les apparitions du Chat) ni pour le record. Il est en
        // revanche journalisé, parce que c'est le signal de frustration le plus fort du jeu — et le
        // seul qui disparaissait entièrement. La garde protège d'un appel sans run en cours, qui
        // enregistrerait une run fantôme à l'étage 1.
        if (listeEtages.length > 0) void journaliserRun(construireEvenementDeLaRun('abandon'));
        effacerRun();
        setEcran('ecran-hub');
    };

    // Sortie de l'écran de fin : le Chat s'y invite à intervalles scénarisés, une apparition par
    // run achevée au maximum et toujours dans cet ordre.
    //  1. 1re run  → il commente la performance et offre sa Bénédiction.
    //  2. 2e run   → il présente le Forgeron (qui reste invisible au Hub jusque-là, même si le
    //                joueur a déjà l'XP nécessaire : c'est le Chat qui « ouvre » la forge).
    //  3. run suivante → il refait la leçon sur les Combos.
    // `runsTerminees` a été incrémentée par capturerStatsFinRun avant l'affichage de l'écran de fin :
    // au moment de ce clic, elle vaut donc bien le nombre de runs achevées, celle-ci comprise.
    const gererQuitterFin = () => {
        // Décliner l'infini est le moment où la run s'arrête vraiment : la victoire contre le
        // Gardien Absolu la laisse volontairement en vol pour que l'offre reste jouable (voir
        // gererFinMegaBoss). Idempotent — les autres issues (mort, extraction) ont déjà nettoyé.
        effacerRun();

        // En hardcore, les trois scènes scénarisées sont sautées : elles cadencent la DÉCOUVERTE
        // du mode normal (Bénédiction, Forgeron, Combo), et les deux premières y sont de toute
        // façon acquises d'emblée (cf. forgeronDisponible / benedictionDisponible).
        if (!modeHardcore) {
            if (!aBenedictionChat) { setEcran('ecran-benediction'); return; }
            if (!forgeronPresente && runsTerminees >= 2) { setEcran('ecran-forgeron'); return; }
            if (forgeronPresente && !leconComboFaite) { setEcran('ecran-lecon-combo'); return; }
        }
        // Les leçons de mort passent APRÈS toutes les apparitions scénarisées : elles sont
        // circonstancielles, elles ne doivent pas doubler une scène qui, elle, a un ordre imposé.
        if (leconMortEnAttente) { setEcran('ecran-lecon-mort'); return; }
        setEcran('ecran-hub');
    };

    const gererLeconMortVue = () => {
        if (leconMortEnAttente) setLeconsMortVues(prev => [...new Set([...prev, leconMortEnAttente])]);
        setLeconMortEnAttente(null);
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

    const gererDesequiperTout = () => setPactesEquipes([]);

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
        setCyclesInfini(0);
        setOffreInfiniDispo(false);
        setReposProposesRun(COMPTEURS_REPOS_VIDES);
        setReposPrisRun(COMPTEURS_REPOS_VIDES);
        setActionsRun(COMPTEURS_ACTIONS_VIDES);
        setComboJoueurRun(COMBO_VIDE);
        setComboMonstresRun(COMBO_VIDE);
        // Incrémenté au LANCEMENT et non à la fin : c'est ce qui donne un numéro unique à chaque
        // run du journal cloud, abandons compris (voir la déclaration de tdp_runs_lancees).
        setRunsLancees(n => n + 1);
        if (modeHardcore) { setRunsHc(n => n + 1); setRunsHcTotales(n => n + 1); }

        const messageBuff = genererMessageBuff(melange[0], pactesEquipes);
        if (messageBuff) setAConnuBuff(true);

        let messagesSynergie: string[] = [];
        if (synergieActive) {
            // Activation dans CE profil, distincte de la découverte (partagée, elle : un secret
            // compris ne s'oublie pas en changeant de mode). C'est elle que comptent les succès.
            setSynergiesActivees(prev => (prev.includes(synergieActive) ? prev : [...prev, synergieActive]));
            const def = SYNERGIES_REGISTRY[synergieActive];
            if (!synergiesDecouvertes.includes(synergieActive)) {
                setSynergiesDecouvertes(prev => [...prev, synergieActive]);
                messagesSynergie = [
                    `<br><b style="color: #f9e2af;">🔮✨ SECRET DÉCOUVERT : Synergie ${def.nom} — ${def.titre} !</b>`,
                    `<span class="log-tour">${def.description}</span>`,
                ];
            } else {
                messagesSynergie = [`<br><b style="color: #f9e2af;">🔮 Synergie ${def.nom} active : ${def.titre}.</b>`];
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
    // Entrée dans la Tour, en trois filtres successifs : le rappel d'Inventaire (partir sans Pacte
    // alors qu'on en possède est l'erreur la plus coûteuse du jeu), puis la Roue de la Chance, puis
    // le lancement réel. `forcer` court-circuite le premier quand le joueur a choisi de passer outre.
    // ⚠️ `forcer === true` et non `!forcer` : cette fonction est branchée directement sur un
    // `onClick`, qui lui passe son évènement en 1er argument — toujours truthy, ce qui suffirait à
    // court-circuiter le rappel sans que rien ne le signale.
    const gererDemarrerAscension = (forcer?: unknown) => {
        if (forcer !== true && pactesEquipes.length === 0 && pactesDebloques.length > 0) {
            setEcran('ecran-rappel-inventaire');
            return;
        }
        if (!benedictionDisponible) {
            gererLancerRun(null);
            return;
        }
        setBenedictionActive(tirerBenediction());
        setEcran('ecran-roue');
    };

    // Extraite de gererPassageEtageSuivant : en hardcore la porte de sortie s'intercale avant, et
    // « Continuer l'ascension » doit retomber exactement ici.
    const ouvrirZoneDeRepos = () => {
        // 1ère zone de repos de la run : les 5 choix sont disponibles. Ensuite, seuls 3
        // (tirés aléatoirement à chaque visite) restent utilisables, les 2 autres sont grisés.
        const toutesLesOptions: ChoixRepos[] = ['soin', 'pv', 'atk', 'pre', 'def'];
        const actifs = reposVisites === 0 ? null : melangerAleatoirement(toutesLesOptions).slice(0, 3);
        setChoixReposActifs(actifs);
        setReposVisites(v => v + 1);
        // `null` signifie « les 5 options », d'où le repli sur la liste complète : c'est le
        // dénominateur du taux d'utilisation de chaque choix.
        setReposProposesRun(c => incrementerCompteurs(c, actifs ?? toutesLesOptions));
        setEcran('ecran-repos');
    };

    const gererPassageEtageSuivant = () => {
        if (indexEtageActuel >= listeEtages.length - 1) {
            setEcran('ecran-sortie-tour');
            return;
        }
        // Hardcore : une porte de sortie est offerte à la fin de CHAQUE étage, juste avant la Zone
        // de Repos. C'est la seule façon de mettre son butin à l'abri de la remise à zéro ; la
        // refuser, c'est le remettre en jeu jusqu'au prochain Gardien.
        if (modeHardcore) {
            setEcran('ecran-extraction');
            return;
        }
        ouvrirZoneDeRepos();
    };

    // Sortie volontaire par la porte hardcore : l'ascension s'arrête ici et TOUT ce qui a été
    // arraché reste acquis. Rien n'est à « verser » au profil — Pactes et XP y sont déjà écrits au
    // fil de la run ; sortir, c'est simplement échapper à l'effacement qu'aurait causé la mort.
    const gererQuitterLaTour = () => {
        setVictoireTotale(false);
        // Sans ce nettoyage, l'écran de fin afficherait le « Coup de Grâce » d'une mort
        // précédente : `tdp_logs_mort` n'est écrit qu'à la mort et survit d'une run à l'autre.
        setLogsMort([]);
        setLeconMortEnAttente(null);
        capturerStatsFinRun('extraction');
        setEcran('ecran-fin');
        effacerRun();
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
            // Le Gardien Absolu n'appartient à aucun étage : aucune leçon de mort ne s'y rattache.
            gererDefaite();
            return;
        }
        // Brûlure et poison ont déjà été encaissés par le tic de fin de tour, qui s'applique même
        // quand l'ennemi meurt (voir jouer_tour) : il ne reste qu'à nettoyer avant la salle suivante.
        setJoueur({ ...joueurRestant, armure: 0, nivEsquive: 0, brulureActive: undefined, poisonActif: undefined });
        setXpTotal(prev => prev + appliquerBonusXp(10, benedictionActive));
        setVictoireTotale(true);
        // Déblocage à vie du mode hardcore : « avoir vaincu la Tour et en être sorti ».
        setAVaincuLaTour(true);
        // Les Pactes portés jusqu'au bout gagnent leur trophée (cumulé sans doublon d'une victoire
        // à l'autre : chaque composition victorieuse s'ajoute au palmarès).
        setPactesVictorieux(prev => [...new Set([...prev, ...pactesEquipes])]);
        capturerStatsFinRun('victoire');
        // L'écran de félicitations propose de s'enfoncer dans l'infinité de la Tour au lieu de
        // rentrer. La run n'est donc PAS effacée ici — c'est `gererQuitterFin` qui s'en charge, à
        // l'instant où le joueur décline. Tout ce qui précède est en revanche définitivement
        // acquis : mourir plus tard dans l'infini ne retire ni trophées, ni classement, ni XP.
        setOffreInfiniDispo(true);
        // En hardcore, la victoire passe d'abord par la saisie du nom pour le classement public :
        // c'est le seul exploit du jeu qui se compare entre joueurs, et l'occasion ne se
        // représentera pas (l'écran de fin, lui, reste accessible juste après).
        setEcran(modeHardcore ? 'ecran-classement-saisie' : 'ecran-fin');
    };

    // « Parcourir l'infinité de la Tour » : un nouveau cycle de 12 étages s'ajoute à la suite, dont
    // le palier de puissance monte à CHAQUE étage au lieu d'un sur deux, et la run reprend là où
    // elle en était — mêmes PV, mêmes bonus de Repos, mêmes Pactes.
    const gererContinuerInfini = () => {
        const cycle = genererCycleInfini(
            donneesBaseEtages,
            pactesEquipes,
            // Le palier repart de celui atteint au bout du segment précédent : la Tour normale
            // s'arrête à `palierFinDeTour`, puis chaque cycle en ajoute autant que d'étages.
            palierFinDeTour(donneesBaseEtages.length) + cyclesInfini * donneesBaseEtages.length,
        );
        setListeEtages(prev => [...prev, ...cycle]);
        setCyclesInfini(c => c + 1);
        setOffreInfiniDispo(false);
        setEnCombatMegaBoss(false);
        setMonstreMegaBoss(null);
        setVictoireTotale(false);

        // Le segment qui commence est journalisé comme une run à part entière : la victoire vient
        // d'être enregistrée sous le numéro courant, et réutiliser le même ferait rejeter la
        // suivante par la clé primaire (user_id, numero_run) — en silence. Les compteurs de
        // segment repartent donc de zéro avec lui.
        setRunsLancees(n => n + 1);
        setMonstresTuesRun(0);
        setPactesDebloquesRun([]);
        setDegatsInfligesRun(0);
        setDegatsBloquesRun(0);
        setDegatsEsquivesRun(0);
        setReposProposesRun(COMPTEURS_REPOS_VIDES);
        setReposPrisRun(COMPTEURS_REPOS_VIDES);
        setActionsRun(COMPTEURS_ACTIONS_VIDES);
        setComboJoueurRun(COMBO_VIDE);
        setComboMonstresRun(COMBO_VIDE);

        setHistoriqueLogs(prev => [
            ...prev,
            `<br><b style="color: #cba6f7;">♾️ Vous tournez le dos à la sortie. La Tour se déplie au-delà de son sommet — et cette fois, chaque étage vous dépassera un peu plus.</b>`,
        ]);

        // Zone de Repos avant de replonger : on sort du combat le plus dur du jeu, souvent à
        // quelques PV. C'est aussi elle qui fait avancer `indexEtageActuel` (voir gererChoixRepos).
        ouvrirZoneDeRepos();
    };

    const gererClassementSaisi = () => setEcran('ecran-fin');

    const gererChoixRepos = (choix: ChoixRepos) => {
        if (!joueur) return;
        const j = { ...joueur };
        // Bilan chiffré de la Zone de Repos. La valeur annoncée sur le bouton n'est pas toujours celle
        // qu'on obtient (un soin sur un héros presque intact est en partie perdu) : on journalise donc
        // l'effet RÉEL, mesuré après coup, sinon le récapitulatif répéterait simplement le menu.
        let effet: string;
        if (choix === 'soin') {
            const avant = j.pv;
            j.pv = Math.min(j.pvMax, j.pv + calculerSoinRepos(j.pvMax, pactesEquipes));
            const rendu = j.pv - avant;
            effet = rendu > 0
                ? `❤️ Repos : soins. <b>+${rendu} PV</b> (${j.pv} / ${j.pvMax}).`
                : `❤️ Repos : soins. <b>Aucun effet</b>, vous étiez déjà au maximum (${j.pv} / ${j.pvMax}).`;
        } else if (choix === 'pv') {
            const gain = calculerGainPvMaxRepos(pactesEquipes);
            j.pvMax += gain; j.pv += gain;
            effet = `💖 Repos : renforcement. <b>+${gain} PV Max</b> (${j.pv} / ${j.pvMax}).`;
        } else if (choix === 'atk') {
            j.baseA += 2;
            effet = `⚔️ Repos : arme aiguisée. <b>Attaque ${j.baseA - 2} → ${j.baseA}</b>.`;
        } else if (choix === 'pre') {
            j.baseP += 1;
            effet = `🎯 Repos : mire ajustée. <b>Précise ${j.baseP - 1} → ${j.baseP}</b>.`;
        } else {
            j.baseD += 2;
            effet = `🛡️ Repos : armure renforcée. <b>Défense ${j.baseD - 2} → ${j.baseD}</b>.`;
        }

        setReposPrisRun(c => incrementerCompteurs(c, [choix]));

        const prochainEtage = listeEtages[indexEtageActuel + 1];

        const messageBuff = genererMessageBuff(prochainEtage, pactesEquipes);
        if (messageBuff) setAConnuBuff(true);

        setHistoriqueLogs(prev => [
            ...prev,
            `<span class="log-soin">${effet}</span>`,
            `<br><span class="log-tour">🚪 DIRECTION L'ÉTAGE SUIVANT...</span>`,
            ...(messageBuff ? [messageBuff] : []),
            `<br><b>⚔️ Combat : ${prochainEtage.monstres[0].nom} approche !</b>`
        ]);
        setJoueur(j);
        setIndexEtageActuel(i => i + 1);
        setIndexSalle(0);

        // Un étage PAIR marque un nouveau palier de puissance des monstres (voir buffProgressionEtage) :
        // on prévient le joueur via un écran dédié, sans détailler les stats concrètes.
        // Dans l'infini, chaque étage est un palier : l'avertissement tomberait avant CHAQUE combat
        // d'étage pour redire une règle que le joueur vient d'accepter explicitement. On le retire.
        const numeroProchainEtage = indexEtageActuel + 2;
        const annoncerPalier = cyclesInfini === 0 && numeroProchainEtage % 2 === 0;
        setEcran(annoncerPalier ? 'ecran-etage-pair' : 'ecran-combat');
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

    const ajouterStatsTour = (stats: StatsTour) => {
        setDegatsInfligesRun(prev => prev + stats.degatsInfliges);
        setDegatsBloquesRun(prev => prev + stats.degatsBloques);
        setDegatsEsquivesRun(prev => prev + stats.degatsEsquives);
        setActionsRun(prev => ({
            A: prev.A + stats.actions.A, P: prev.P + stats.actions.P,
            D: prev.D + stats.actions.D, E: prev.E + stats.actions.E,
        }));
        setDegatsEsquivesTotal(prev => prev + stats.degatsEsquives);
        setDegatsBloquesTotal(prev => prev + stats.degatsBloques);
        setDegatsAttaqueTotal(prev => prev + stats.degatsAttaque);
        setDegatsPreciseTotal(prev => prev + stats.degatsPrecise);
        setSoinsTotal(prev => prev + stats.soins);
        setComboJoueurRun(prev => fusionnerCombo(prev, stats.comboJoueur));
        setComboMonstresRun(prev => fusionnerCombo(prev, stats.comboMonstre));
    };

    const gererRecompenseCombat = (causesMortMonstre: string[] = []) => {
        const recompense = calculerRecompenseCombat(listeEtages[indexEtageActuel], indexSalle, enCombatPacte, typeCombatPacte, pactesEquipes);
        const gainXp = appliquerBonusXp(recompense.gainXp, benedictionActive);

        setMonstresTues(prev => prev + 1);
        setMonstresTuesRun(prev => prev + 1);
        if (modeHardcore) setMonstresHc(prev => prev + 1);
        setBestiaire(prev => ({ ...prev, [recompense.typeMonstre]: prev[recompense.typeMonstre] + 1 }));

        // Gardiens vaincus, mémorisés par IDENTIFIANT D'ÉTAGE et non comptés : les succès portent
        // sur des Gardiens différents (« 12 » = tous), donc douze victoires sur le même ne valent
        // qu'une entrée. `bestiaire` ne sait compter que des occurrences, d'où ces trois listes.
        const idEtage = listeEtages[indexEtageActuel]?.idPacte;
        if (idEtage) {
            const ajouter = (prev: string[]) => (prev.includes(idEtage) ? prev : [...prev, idEtage]);
            if (recompense.typeMonstre === 'boss') setBossLvl0(ajouter);
            if (recompense.typeMonstre === 'evolue') setBossLvl1(ajouter);
            if (recompense.typeMonstre === 'final') setBossLvl2(ajouter);

            // Succès à thème : le Gardien doit tomber sous SA propre mécanique. Réservé aux boss —
            // terrasser un monstre ordinaire par la brûlure ne prouve rien sur le Gardien du Feu.
            if (recompense.typeMonstre !== 'normal') {
                const theme = themeMerite(idEtage, causesMortMonstre);
                if (theme) setSuccesTheme(prev => (prev.includes(theme) ? prev : [...prev, theme]));
            }
        }
        setXpTotal(prev => prev + gainXp);
        setHistoriqueLogs(prev => [...prev, `<div class="log-soin">🌟 Vous gagnez ${gainXp} point(s) d'XP ${benedictionActive === 'apprentissage' ? '(Leçon du Maître : XP doublée) ' : ''}!</div>`]);
    };

    const gererDefaite = (circonstances?: CirconstancesMort) => {
        setLogsMort(extraireLogsDuDernierTour(lireHistoriqueLogsPersistant()));
        setVictoireTotale(false);

        // Le Chat ne revient sur une mort que si elle vient d'un pouvoir qu'on peut rater, et une
        // seule fois par cause. La leçon est retenue ici mais ne s'affichera qu'à la sortie de
        // l'écran de fin, derrière les apparitions déjà programmées (voir gererQuitterFin).
        const etageActuel = listeEtages[indexEtageActuel];
        if (circonstances && etageActuel) {
            const lecon = detecterLeconMort({
                ...circonstances,
                idPacteEtage: etageActuel.idPacte,
                estCombatDeGardien: indexSalle === etageActuel.monstres.length,
            });
            setLeconMortEnAttente(leconAAfficher(lecon, leconsMortVues));
        } else {
            setLeconMortEnAttente(null);
        }

        capturerStatsFinRun('mort');
        // APRÈS la capture des stats : l'écran de fin doit encore pouvoir montrer ce que cette
        // ascension avait accompli, y compris le record qu'elle vient de battre.
        if (modeHardcore) effacerProfilHardcore();
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
        // Écran de félicitations plutôt qu'une transition automatique : c'est la récompense d'un
        // combat que le joueur a choisi de livrer, elle mérite un temps d'arrêt.
        setPacteObtenu(nomFinal);
        setEcran('ecran-pacte-obtenu');
    };

    const gererPacteObtenuVu = () => {
        setPacteObtenu(null);
        gererPassageEtageSuivant();
    };

    const gererFinDeGardien = (aLvl1Equipe: boolean, aLvl2Equipe: boolean, aLvl1Possede: boolean, aLvl2Possede: boolean) => {
        // Mode infini : aucun Pacte ne s'y arrache. Les Gardiens y apparaissent déjà dans leur
        // Forme Finale (voir genererCycleInfini), il n'y a donc plus de forme supérieure à
        // réveiller — l'écran de choix n'aurait rien à proposer.
        if (cyclesInfini > 0) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Le Gardien s'incline. Plus rien à lui arracher : la Tour ne fait plus que vous mettre à l'épreuve.</span>`]);
            programmerTransition(gererPassageEtageSuivant);
            return;
        }
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

    const handleFinDeCombat = (victoire: boolean, joueurRestant: Entite, doubleKO: boolean = false, circonstances?: CirconstancesMort, causesMortMonstre?: string[]) => {
        if (enCombatMegaBoss) {
            gererFinMegaBoss(victoire, joueurRestant);
            return;
        }

        if (victoire || doubleKO) {
            gererRecompenseCombat(causesMortMonstre ?? []);
        }

        if (!victoire) {
            gererDefaite(circonstances);
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
        forgeronDisponible,

        // Mode hardcore
        modeHardcore,
        aVaincuLaTour,

        // Mode infini
        cyclesInfini,
        offreInfiniDispo,
        runsHc,
        runsHcTotales,
        monstresHc,
        nomJoueur, setNomJoueur,
        progressionSucces,
        succesObtenus,
        aNouveauSucces,
        marquerSuccesVus,
        gererClassementSaisi,

        // Progression méta (hors-run)
        monstresTues,
        competences, setCompetences,
        xpTotal,
        bestiaire,
        aConnuBuff,
        synergiesDecouvertes,
        aNouveauteTuto,
        aNouveauPacte,
        // Aucune run encore achevée : le joueur découvre encore les règles.
        estPremiereRun: runsTerminees === 0,
        pactesNonVus,
        aPointsCompetenceDispo,

        // Actions
        ajouterLogGlobal,
        ajouterStatsTour,
        marquerTutoLu,
        marquerPactesVus,
        gererAbandon,
        gererBasculerPacte,
        gererEquiperSynergie,
        gererDesequiperTout,
        gererDemarrerAscension,
        gererLancerRun,
        gererVieDeChatConsommee,
        gererQuitterFin,
        gererLeconMortVue,
        leconMortEnAttente,
        pacteObtenu,
        gererPacteObtenuVu,
        gererRecevoirBenediction,
        gererForgeronPresente,
        gererLeconComboFaite,
        gererPassageEtageSuivant,
        gererEntrerHardcore,
        gererQuitterHardcore,
        gererResterDansLaTour: ouvrirZoneDeRepos,
        gererQuitterLaTour,
        gererChoixRepos,
        declencherCombatPacte,
        gererDeclenchementMegaBoss,
        gererContinuerInfini,
        gererFinTutoriel,
        gererConclusionTuto,
        gererAbandonTuto,
        handleFinDeCombat,
    };
}
