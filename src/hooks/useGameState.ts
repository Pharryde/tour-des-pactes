// src/hooks/useGameState.ts
import { useEffect, useState } from 'react';
import init, { get_donnees_etages } from 'moteur_wasm';
import type { Ecran, Entite, StructureEtage, Competences, Bestiaire } from '../types';
import { appliquerPactesSurJoueur, calculerSoinRepos, calculerGainPvMaxRepos, peutEquiperPacte } from '../utils/pactes';
import { melangerEtages, genererMessageBuff } from '../utils/etages';
import { calculerRecompenseCombat } from '../utils/recompenses';
import { calculerPointsDisponibles } from '../utils/competences';
import { lireHistoriqueLogsPersistant, extraireLogsDuDernierTour } from '../utils/logs';
import { useLocalStorage } from './useLocalStorage';

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

    const [monstresTues, setMonstresTues] = useLocalStorage<number>('tdp_monstres_tues', 0);
    const [competences, setCompetences] = useLocalStorage<Competences>('tdp_competences', { pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
    const [xpTotal, setXpTotal] = useLocalStorage<number>('tdp_xp_total', 0);
    const [bestiaire, setBestiaire] = useLocalStorage<Bestiaire>('tdp_bestiaire', { normal: 0, boss: 0, evolue: 0, final: 0 });

    const [aConnuBuff, setAConnuBuff] = useLocalStorage<boolean>('tdp_a_connu_buff', false);
    const [connaissancesVues, setConnaissancesVues] = useLocalStorage<number>('tdp_tuto_vues', 0);
    const [pactesVus, setPactesVus] = useLocalStorage<number>('tdp_pactes_vus', 0);

    const nbConnaissancesActuelles =
        (xpTotal > 0 ? 1 : 0) +
        (aConnuBuff ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte du Combo")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte du Temps")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de l'Ombre")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de la Fluidité")) ? 1 : 0) +
        (pactesDebloques.some(p => p.includes("Pacte de la Puissance Brute")) ? 1 : 0) +
        (pactesDebloques.includes("Pacte de l'Armure II") ? 1 : 0);

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
            } catch (error) {
                console.error("Le module WebAssembly a crashé à l'initialisation:", error);
                setErreurMoteur(String(error));
            }
        };
        demarrer();
    }, []);

    const effacerRun = () => {
        setListeEtages([]); setJoueur(null); setHistoriqueLogs([]);
        setIndexEtageActuel(0); setIndexSalle(0); setEnCombatPacte(false);
        window.localStorage.removeItem('tdp_active_combat_key');
    };

    const gererAbandon = () => {
        effacerRun();
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

        // Application propre de tous les pactes via le registry
        setJoueur(appliquerPactesSurJoueur(herosBase, pactesEquipes));

        const melange = melangerEtages(donneesBaseEtages, pactesEquipes);

        setListeEtages(melange);
        setIndexEtageActuel(0);
        setIndexSalle(0);
        setEnCombatPacte(false);

        const messageBuff = genererMessageBuff(melange[0], pactesEquipes);
        if (messageBuff) setAConnuBuff(true);

        setHistoriqueLogs([
            `<b>🎲 Nouvelle Ascension ! Vous entrez dans l'Étage 1.</b>`,
            ...(messageBuff ? [messageBuff] : []),
            `<br><b>⚔️ Combat : ${melange[0].monstres[0].nom} approche !</b>`
        ]);
        setEcran('ecran-combat');
    };

    const gererPassageEtageSuivant = () => {
        if (indexEtageActuel >= listeEtages.length - 1) { setVictoireTotale(true); setEcran('ecran-fin'); effacerRun(); }
        else { setEcran('ecran-repos'); }
    };

    const gererChoixRepos = (choix: 'soin' | 'atk' | 'pre' | 'def' | 'pv') => {
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
        setEcran('ecran-combat');
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

    const gererRecompenseCombat = () => {
        const recompense = calculerRecompenseCombat(listeEtages[indexEtageActuel], indexSalle, enCombatPacte, typeCombatPacte, pactesEquipes);

        setMonstresTues(prev => prev + 1);
        setBestiaire(prev => ({ ...prev, [recompense.typeMonstre]: prev[recompense.typeMonstre] + 1 }));
        setXpTotal(prev => prev + recompense.gainXp);
        setHistoriqueLogs(prev => [...prev, `<div class="log-soin">🌟 Vous gagnez ${recompense.gainXp} point(s) d'XP !</div>`]);
    };

    const gererDefaite = () => {
        setLogsMort(extraireLogsDuDernierTour(lireHistoriqueLogsPersistant()));
        setVictoireTotale(false);
        setEcran('ecran-fin');
        effacerRun();
    };

    const gererDeblocagePacte = (nomPacteCourant: string) => {
        setEnCombatPacte(false);
        const nomFinal = typeCombatPacte === 'lvl2' ? nomPacteCourant + " II" : nomPacteCourant;
        if (!pactesDebloques.includes(nomFinal)) setPactesDebloques([...pactesDebloques, nomFinal]);

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

        // Pactes
        pactesDebloques,
        pactesEquipes,

        // Progression méta (hors-run)
        monstresTues,
        competences, setCompetences,
        xpTotal,
        bestiaire,
        aConnuBuff,
        aNouveauteTuto,
        aNouveauPacte,
        aPointsCompetenceDispo,

        // Actions
        ajouterLogGlobal,
        marquerTutoLu,
        marquerPactesVus,
        gererAbandon,
        gererBasculerPacte,
        gererLancerRun,
        gererPassageEtageSuivant,
        gererChoixRepos,
        declencherCombatPacte,
        handleFinDeCombat,
    };
}
