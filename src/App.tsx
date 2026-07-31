import { useEffect, useState } from 'react';
import init, { get_donnees_etages } from 'moteur_wasm';
import type { Ecran, Entite, StructureEtage } from './types';
import { appliquerPactesSurJoueur, calculerSoinRepos, calculerGainPvMaxRepos, peutEquiperPacte } from './utils/pactes';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Hub } from './components/Hub';
import { Inventaire } from './components/Inventaire';
import { CombatArene } from './components/CombatArene';
import { Fin } from './components/fin';
import { ChoixBoss } from './components/ChoixBoss';
import { Repos } from './components/Repos';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CinematiqueBoss } from './components/CinematiqueBoss';
import './App.css';

const getImageCinematique = (idPacte: string) => {
    switch(idPacte) {
        case "Pacte de l'Armure": return "/images/boss_armure.png";
        case "Pacte de l'Esquive": return "/images/boss_esquive.png";
        case "Pacte du Combo": return "/images/boss_combo.png";
        case "Pacte de la Vie": return "/images/boss_vie.png";
        case "Pacte de l'Ombre": return "/images/boss_ombre.png";
        case "Pacte du Temps": return "/images/boss_temps.png";
        default: return "/images/boss_default.png";
    }
};

function App() {
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
  const [typeCombatPacte, setTypeCombatPacte] = useLocalStorage<'lvl1'|'lvl2'>('tdp_type_pacte', 'lvl1');

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

    const nomPacteCourant = etageActuel?.idPacte || "Pacte Inconnu";
    const aLvl1Equipe = pactesEquipes.includes(nomPacteCourant);
    const aLvl2Equipe = pactesEquipes.includes(nomPacteCourant + " II");
    const aLvl1Possede = pactesDebloques.includes(nomPacteCourant);
    const aLvl2Possede = pactesDebloques.includes(nomPacteCourant + " II");

    if (enCombatPacte) {
        setEnCombatPacte(false);
        const nomFinal = typeCombatPacte === 'lvl2' ? nomPacteCourant + " II" : nomPacteCourant;
        if (!pactesDebloques.includes(nomFinal)) setPactesDebloques([...pactesDebloques, nomFinal]);
        
        setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ VOUS AVEZ ARRACHÉ LE ${nomFinal.toUpperCase()} !</span>`]);
        setTimeout(() => { gererPassageEtageSuivant(); }, 2000);
        return;
    }

    if (indexSalle === (etageActuel?.monstres?.length || 0)) {
        if (aLvl2Equipe) {
            setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Puissance maximale confirmée. Le Gardien s'incline. Progression automatique !</span>`]);
            setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
        } else if (aLvl1Equipe) {
            if (aLvl2Possede) {
                setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Vous possédez déjà la Forme Finale de ce pacte. Progression automatique !</span>`]);
                setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
            } else {
                setEcran('ecran-choix-boss'); 
            }
        } else {
            if (aLvl1Possede || aLvl2Possede) {
                setHistoriqueLogs(prev => [...prev, `<br><span class="log-tour">✨ Vous possédez déjà ce pacte. Le Gardien vous laisse passer. Progression automatique !</span>`]);
                setTimeout(() => { gererPassageEtageSuivant(); }, 1500);
            } else {
                setEcran('ecran-choix-boss'); 
            }
        }
        return;
    }

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

  if (erreurMoteur) {
      return (
          <div className="jeu-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h1 style={{ color: '#f38ba8' }}>Erreur du Moteur Rust</h1>
              <p style={{ color: '#cdd6f4' }}>Impossible de charger la logique du jeu.</p>
              <div style={{ background: '#11111b', border: '1px solid #313244', padding: '15px', borderRadius: '8px', marginTop: '20px', color: '#f38ba8', fontFamily: 'monospace' }}>
                  {erreurMoteur}
              </div>
          </div>
      );
  }

  if (!moteurPret) return <div className="chargement">Chargement du Moteur WebAssembly...</div>;

  let monstreActuel = null; 
  const etageActuel = listeEtages[indexEtageActuel];
  const nomPacteCourant = etageActuel?.idPacte || "Pacte Inconnu";
  const aLvl1Equipe = pactesEquipes.includes(nomPacteCourant);
  const aLvl2Equipe = pactesEquipes.includes(nomPacteCourant + " II");

  if (etageActuel) {
      if (enCombatPacte) {
          monstreActuel = typeCombatPacte === 'lvl2' ? etageActuel.bossHeroiqueLvl2 : etageActuel.bossHeroique;
      } 
      else if (indexSalle < etageActuel.monstres.length) {
          monstreActuel = etageActuel.monstres[indexSalle];
      } 
      else {
          if (aLvl2Equipe) monstreActuel = etageActuel.bossHeroiqueLvl2;
          else if (aLvl1Equipe) monstreActuel = etageActuel.bossHeroique;
          else monstreActuel = etageActuel.bossNormal;
      }
  }

  return (
    <ErrorBoundary>
        <div className="jeu-container">
          {ecran === 'ecran-hub' && <Hub onLancerRun={gererLancerRun} onChangeEcran={setEcran} />}
          {ecran === 'ecran-inventaire' && <Inventaire pactesDebloques={pactesDebloques} pactesEquipes={pactesEquipes} onBasculerPacte={gererBasculerPacte} onChangeEcran={setEcran} />}
          {ecran === 'ecran-fin' && <Fin victoire={victoireTotale} onRetourHub={() => setEcran('ecran-hub')} />}
          {ecran === 'ecran-repos' && joueur && <Repos soin={calculerSoinRepos(joueur.pvMax, pactesEquipes)} gainPv={calculerGainPvMaxRepos(pactesEquipes)} onChoix={gererChoixRepos} />}
          
          {ecran === 'ecran-choix-boss' && (
            <ChoixBoss 
                aLvl1Equipe={aLvl1Equipe} 
                estDernierEtage={indexEtageActuel >= listeEtages.length - 1} 
                onFuir={gererPassageEtageSuivant}
                onCombattreLvl1={() => { setHistoriqueLogs(prev => [...prev, `<br><b style="color: #f38ba8;">🔥 LE GARDIEN SE RELÈVE DANS SA FORME HÉROÏQUE !</b>`]); setTypeCombatPacte('lvl1'); setEnCombatPacte(true); setEcran('ecran-cinematique'); }}
                onCombattreLvl2={() => { setHistoriqueLogs(prev => [...prev, `<br><b style="color: #f38ba8;">🔥 LE GARDIEN SE RELÈVE DANS SA FORME SUBMÉDITÉE !</b>`]); setTypeCombatPacte('lvl2'); setEnCombatPacte(true); setEcran('ecran-cinematique'); }}
            />
          )}

          {ecran === 'ecran-cinematique' && monstreActuel && (
              <CinematiqueBoss 
                  titre={monstreActuel.nom} 
                  imageSrc={getImageCinematique(nomPacteCourant)}
                  onContinuer={() => setEcran('ecran-combat')}
              />
          )}
          
          {ecran === 'ecran-combat' && monstreActuel && joueur && (
            <div id="ecran-combat" className="ecran" style={{ justifyContent: 'flex-start' }}>
              <CombatArene 
                key={`${indexEtageActuel}-${indexSalle}-${enCombatPacte}`}
                joueurInitial={joueur} 
                monstreInitial={monstreActuel} 
                nomEtage={etageActuel.nom}
                numeroEtage={indexEtageActuel + 1}
                totalEtages={listeEtages.length}
                numeroSalle={indexSalle} 
                totalSalles={etageActuel.monstres.length + 1}
                pactesEquipes={pactesEquipes} 
                logsGlobaux={historiqueLogs} 
                ajouterLogGlobal={(l) => setHistoriqueLogs(prev => [...prev, l])}
                onFinDeCombat={handleFinDeCombat}
                onAbandon={gererAbandon}
                enCombatPacte={enCombatPacte}
              />
            </div>
          )}
        </div>
    </ErrorBoundary>
  );
}

export default App;