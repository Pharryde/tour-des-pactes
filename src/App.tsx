import { useEffect, useState } from 'react';
import init, { get_donnees_etages } from 'moteur_wasm';
import type { Ecran, Entite } from './types';
import { appliquerPactesSurJoueur, calculerSoinRepos, calculerGainPvMaxRepos, determinerNomPacte, peutEquiperPacte } from './utils/pactes';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Hub } from './components/Hub';
import { Inventaire } from './components/Inventaire';
import { CombatArene } from './components/CombatArene';
import { Fin } from './components/fin';
import { ChoixBoss } from './components/ChoixBoss';
import { Repos } from './components/Repos';
import './App.css';

function App() {
  const [moteurPret, setMoteurPret] = useState(false);
  const [donneesBaseEtages, setDonneesBaseEtages] = useState<any[]>([]);
  
  const [pactesDebloques, setPactesDebloques] = useLocalStorage<string[]>('tdp_pactes_debloques', []);
  const [pactesEquipes, setPactesEquipes] = useLocalStorage<string[]>('tdp_pactes_equipes', []);

  const [ecran, setEcran] = useLocalStorage<Ecran>('tdp_ecran', 'ecran-hub');
  const [listeEtages, setListeEtages] = useLocalStorage<any[]>('tdp_liste_etages', []);
  const [joueur, setJoueur] = useLocalStorage<Entite | null>('tdp_joueur', null);
  const [indexEtageActuel, setIndexEtageActuel] = useLocalStorage<number>('tdp_index_etage', 0);
  const [indexSalle, setIndexSalle] = useLocalStorage<number>('tdp_index_salle', 0);
  const [historiqueLogs, setHistoriqueLogs] = useLocalStorage<string[]>('tdp_historique_logs', []);
  const [victoireTotale, setVictoireTotale] = useLocalStorage<boolean>('tdp_victoire', false);
  const [enCombatPacte, setEnCombatPacte] = useLocalStorage<boolean>('tdp_combat_pacte', false);
  const [typeCombatPacte, setTypeCombatPacte] = useLocalStorage<'lvl1'|'lvl2'>('tdp_type_pacte', 'lvl1');

  useEffect(() => {
    const demarrer = async () => { await init(); setDonneesBaseEtages(get_donnees_etages()); setMoteurPret(true); };
    demarrer();
  }, []);

  const effacerRun = () => {
      setListeEtages([]); setJoueur(null); setHistoriqueLogs([]);
      setIndexEtageActuel(0); setIndexSalle(0); setEnCombatPacte(false);
      // NOUVEAU : On purge la sauvegarde du combat en cours pour les prochaines Runs
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
    const herosBase: Entite = { nom: "Héros", pv: 100, pvMax: 100, armure: 0, nivEsquive: 0, baseA: 10, baseP: 4, baseD: 10, paliersEsquive: [0, 50, 75, 100], actionsPossibles: ['A', 'P', 'D', 'E'] };
    setJoueur(appliquerPactesSurJoueur(herosBase, pactesEquipes));
    const melange = [...donneesBaseEtages].sort(() => Math.random() - 0.5);
    setListeEtages(melange);
    setIndexEtageActuel(0); setIndexSalle(0); setEnCombatPacte(false);
    setHistoriqueLogs([`<b>🎲 Nouvelle Ascension ! Vous entrez dans l'Étage 1.</b>`, `<br><b>⚔️ Combat : ${melange[0].monstres[0].nom} approche !</b>`]);
    setEcran('ecran-combat');
  };

  const gererPassageEtageSuivant = () => {
    if (indexEtageActuel >= listeEtages.length - 1) { setVictoireTotale(true); setEcran('ecran-fin'); effacerRun(); } 
    else { setEcran('ecran-repos'); }
  };

  const gererChoixRepos = (choix: 'soin'|'atk'|'pre'|'def'|'pv') => {
      if (!joueur) return;
      const j = { ...joueur };
      if (choix === 'soin') { j.pv = Math.min(j.pvMax, j.pv + calculerSoinRepos(j.pvMax, pactesEquipes)); }
      if (choix === 'pv') { const gain = calculerGainPvMaxRepos(pactesEquipes); j.pvMax += gain; j.pv += gain; }
      if (choix === 'atk') j.baseA += 2; if (choix === 'pre') j.baseP += 1; if (choix === 'def') j.baseD += 2;
      
      setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">🚪 DIRECTION L'ÉTAGE SUIVANT...</span>`, `<br><b>⚔️ Combat : ${listeEtages[indexEtageActuel + 1].monstres[0].nom} approche !</b>`]);
      setJoueur(j); setIndexEtageActuel(i => i + 1); setIndexSalle(0); setEcran('ecran-combat');
  };

  const handleFinDeCombat = async (victoire: boolean, joueurRestant: Entite) => {
    if (!victoire) { setVictoireTotale(false); setEcran('ecran-fin'); effacerRun(); return; }

    const joueurNettoye = { ...joueurRestant, armure: 0, nivEsquive: 0 };
    setJoueur(joueurNettoye);
    const etageActuel = listeEtages[indexEtageActuel];

    if (enCombatPacte) {
        setEnCombatPacte(false);
        const nomFinal = typeCombatPacte === 'lvl2' ? determinerNomPacte(etageActuel.nom) + " II" : determinerNomPacte(etageActuel.nom);
        if (!pactesDebloques.includes(nomFinal)) setPactesDebloques([...pactesDebloques, nomFinal]);
        
        setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ VOUS AVEZ ARRACHÉ LE ${nomFinal.toUpperCase()} !</span>`]);
        setTimeout(() => { gererPassageEtageSuivant(); }, 2000);
        return;
    }

    if (indexSalle === etageActuel.monstres.length) {
        const nomPacte = determinerNomPacte(etageActuel.nom);
        const aLvl1Equipe = pactesEquipes.includes(nomPacte);
        const aLvl2Possede = pactesDebloques.includes(nomPacte + " II");
        const aLvl1Possede = pactesDebloques.includes(nomPacte);

        // Si le niveau 2 est déjà débloqué, on passe directement à la suite
        if (aLvl2Possede) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Puissance maximale déjà acquise pour ce pacte. Progression automatique !</span>`]);
            setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
        } 
        // Si le niveau 1 est équipé sur le héros, le Gardien se réveille DIRECTEMENT en version sous-méditée (Niveau II) !
        else if (aLvl1Equipe) {
            setHistoriqueLogs(prev => [...prev, `<b style="color: #f38ba8;">🔥 Le Gardien sent votre maîtrise du Niveau I et se relève directement dans sa forme Subméditée (Niveau II) !</b>`]);
            setTypeCombatPacte('lvl2'); 
            setEnCombatPacte(true); 
            setEcran('ecran-combat');
        } 
        // Si le niveau 1 est possédé mais non équipé
        else if (aLvl1Possede) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Pacte déjà possédé, mais non équipé. Progression automatique !</span>`]);
            setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
        } 
        // Sinon, premier run sur cet étage : choix classique
        else {
            setEcran('ecran-choix-boss'); 
        }
        return;
    }

    const prochainMonstre = etageActuel.monstres[indexSalle + 1] || etageActuel.bossNormal;
    setHistoriqueLogs(prev => [...prev, `<br><b>⚔️ Combat : ${prochainMonstre.nom} approche !</b>`]);
    setIndexSalle(s => s + 1);
  };

  if (!moteurPret) return <div className="chargement">Chargement du Moteur WebAssembly...</div>;

  let monstreActuel = null; const etageActuel = listeEtages[indexEtageActuel];
  if (etageActuel) {
      if (enCombatPacte) monstreActuel = typeCombatPacte === 'lvl2' ? etageActuel.bossHeroiqueLvl2 : etageActuel.bossHeroique;
      else if (indexSalle < etageActuel.monstres.length) monstreActuel = etageActuel.monstres[indexSalle];
      else monstreActuel = etageActuel.bossNormal;
  }
  const nomPacteCourant = etageActuel ? determinerNomPacte(etageActuel.nom) : "";

  return (
    <div className="jeu-container">
      {ecran === 'ecran-hub' && <Hub onLancerRun={gererLancerRun} onChangeEcran={setEcran} />}
      {ecran === 'ecran-inventaire' && <Inventaire pactesDebloques={pactesDebloques} pactesEquipes={pactesEquipes} onBasculerPacte={gererBasculerPacte} onChangeEcran={setEcran} />}
      {ecran === 'ecran-fin' && <Fin victoire={victoireTotale} onRetourHub={() => setEcran('ecran-hub')} />}
      {ecran === 'ecran-repos' && joueur && <Repos soin={calculerSoinRepos(joueur.pvMax, pactesEquipes)} gainPv={calculerGainPvMaxRepos(pactesEquipes)} onChoix={gererChoixRepos} />}
      {ecran === 'ecran-choix-boss' && (
        <ChoixBoss 
            aLvl1Equipe={pactesEquipes.includes(nomPacteCourant)} estDernierEtage={indexEtageActuel >= listeEtages.length - 1} onFuir={gererPassageEtageSuivant}
            onCombattreLvl1={() => { setHistoriqueLogs(prev => [...prev, `<b style="color: #f38ba8;">🔥 LE GARDIEN SE RELÈVE DANS SA FORME HÉROÏQUE !</b>`]); setTypeCombatPacte('lvl1'); setEnCombatPacte(true); setEcran('ecran-combat'); }}
            onCombattreLvl2={() => { setHistoriqueLogs(prev => [...prev, `<b style="color: #f38ba8;">🔥 LE GARDIEN SE RELÈVE DANS SA FORME SUBMÉDITÉE !</b>`]); setTypeCombatPacte('lvl2'); setEnCombatPacte(true); setEcran('ecran-combat'); }}
        />
      )}
      {ecran === 'ecran-combat' && monstreActuel && joueur && (
        <div id="ecran-combat" className="ecran" style={{ justifyContent: 'flex-start' }}>
          <CombatArene 
            key={`${indexEtageActuel}-${indexSalle}-${enCombatPacte}`}
            joueurInitial={joueur} monstreInitial={monstreActuel} nomEtage={enCombatPacte ? "⚠️ COMBAT POUR LE PACTE ⚠️" : etageActuel.nom}
            numeroSalle={indexSalle} totalSalles={etageActuel.monstres.length + 1}
            pactesEquipes={pactesEquipes} logsGlobaux={historiqueLogs} ajouterLogGlobal={(l) => setHistoriqueLogs(prev => [...prev, l])}
            onFinDeCombat={handleFinDeCombat}
            onAbandon={gererAbandon} // NOUVEAU
          />
        </div>
      )}
    </div>
  );
}

export default App;