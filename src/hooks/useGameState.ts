// src/hooks/useGameState.ts
import { useEffect, useState } from 'react';
import init, { get_donnees_etages } from 'moteur_wasm';
import type { Ecran, Entite, StructureEtage, Competences, Bestiaire, StatsRun, ChoixRepos, Synergie } from '../types';
import { appliquerPactesSurJoueur, calculerSoinRepos, calculerGainPvMaxRepos, peutEquiperPacte } from '../utils/pactes';
import { melangerEtages, genererMessageBuff, melangerAleatoirement } from '../utils/etages';
import { construireMegaBoss } from '../utils/megaboss';
import { detecterSynergie, SYNERGIES_REGISTRY } from '../utils/synergies';
import { construireChatMysterieux, construireHerosTuto, DIALOGUE_CHAT_TUTO } from '../utils/tutoCombat';
import { calculerRecompenseCombat } from '../utils/recompenses';
import { calculerPointsDisponibles } from '../utils/competences';
import { lireHistoriqueLogsPersistant, extraireLogsDuDernierTour, lireValeurPersistante } from '../utils/logs';
import { useLocalStorage } from './useLocalStorage';
import { useSauvegardeCloud } from './useSauvegardeCloud';

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
    const [historiqueLogs, setHistoriqueLogs] = useLocalStorage<string[]>('tdp_historique_logs', []);
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

    const nbConnaissancesActuelles =
        (xpTotal > 0 ? 1 : 0) +
        (aConnuBuff ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte du Combo")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte du Temps")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de l'Ombre")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de la Fluidité")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de la Puissance Brute")) ? 1 : 0) +
        (pactesDebloques.includes("Pacte de l'Armure II") ? 1 : 0) +
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
        ],
    );

    const effacerRun = () => {
        setListeEtages([]); setJoueur(null); setHistoriqueLogs([]);
        setIndexEtageActuel(0); setIndexSalle(0); setEnCombatPacte(false);
        setEnCombatMegaBoss(false); setMonstreMegaBoss(null);
        window.localStorage.removeItem('tdp_active_combat_key');
    };

    // Fige les stats de la run qui vient de se terminer (mort ou victoire totale) AVANT que
    // effacerRun() ne remette indexEtageActuel et les compteurs à zéro — sinon l'écran de fin
    // n'aurait plus rien à afficher.
    const capturerStatsFinRun = () => {
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
    };

    const gererAbandon = () => {
        effacerRun();
        setEcran('ecran-hub');
    };

    // Déclenché par CombatArene (onFinTutoriel) une fois les 4 tours scriptés du tutoriel
    // d'introduction écoulés : on passe à l'écran de révélation plutôt qu'au flux victoire/défaite
    // habituel, le Chat Mystérieux étant intuable par conception.
    const gererFinTutoriel = (joueurRestant: Entite) => {
        setJoueur(joueurRestant);
        setMonstreTuto(null);
        window.localStorage.removeItem('tdp_active_combat_key');
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
        window.localStorage.removeItem('tdp_active_combat_key');
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

    const gererLancerRun = () => {
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

        // Application propre de tous les pactes via le registry
        setJoueur(appliquerPactesSurJoueur(herosBase, pactesEquipes));

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

        setHistoriqueLogs([
            `<b>🎲 Nouvelle Ascension ! Vous entrez dans l'Étage 1.</b>`,
            ...(messageBuff ? [messageBuff] : []),
            ...messagesSynergie,
            `<br><b>⚔️ Combat : ${melange[0].monstres[0].nom} approche !</b>`
        ]);
        setEcran('ecran-combat');
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
        setJoueur({ ...joueurRestant, armure: 0, nivEsquive: 0 });
        setXpTotal(prev => prev + 10);
        setVictoireTotale(true);
        capturerStatsFinRun();
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

        setMonstresTues(prev => prev + 1);
        setMonstresTuesRun(prev => prev + 1);
        setBestiaire(prev => ({ ...prev, [recompense.typeMonstre]: prev[recompense.typeMonstre] + 1 }));
        setXpTotal(prev => prev + recompense.gainXp);
        setHistoriqueLogs(prev => [...prev, `<div class="log-soin">🌟 Vous gagnez ${recompense.gainXp} point(s) d'XP !</div>`]);
    };

    const gererDefaite = () => {
        setLogsMort(extraireLogsDuDernierTour(lireHistoriqueLogsPersistant()));
        setVictoireTotale(false);
        capturerStatsFinRun();
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
        setTimeout(() => { gererPassageEtageSuivant(); }, 2000);
    };

    const gererFinDeGardien = (aLvl1Equipe: boolean, aLvl2Equipe: boolean, aLvl1Possede: boolean, aLvl2Possede: boolean) => {
        if (aLvl2Equipe) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Puissance maximale confirmée. Le Gardien s'incline. Progression automatique !</span>`]);
            setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
            return;
        }
        if (aLvl1Equipe) {
            if (aLvl2Possede) {
                setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Vous possédez déjà la Forme Finale de ce pacte. Progression automatique !</span>`]);
                setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
            } else {
                setEcran('ecran-choix-boss');
            }
            return;
        }
        if (aLvl1Possede || aLvl2Possede) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Vous possédez déjà ce pacte. Le Gardien vous laisse passer. Progression automatique !</span>`]);
            setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
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

        setJoueur({ ...joueurRestant, armure: 0, nivEsquive: 0 });

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
        aPacteChat,

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
        gererLancerRun,
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
