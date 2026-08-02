import { getImageCinematique } from './utils/etages';
import { calculerSoinRepos, calculerGainPvMaxRepos } from './utils/pactes';
import { useGameState } from './hooks/useGameState';
import { Hub } from './components/Hub';
import { Inventaire } from './components/Inventaire';
import { CombatArene } from './components/CombatArene';
import { Fin } from './components/Fin';
import { ChoixBoss } from './components/ChoixBoss';
import { Repos } from './components/Repos';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CinematiqueBoss } from './components/CinematiqueBoss';
import { Tuto } from './components/Tuto';
import { ArbreCompetences } from './components/ArbreCompetences';
import './App.css';

function App() {
  const {
      moteurPret, erreurMoteur,
      ecran, setEcran,
      listeEtages, indexEtageActuel, indexSalle,
      joueur, historiqueLogs, victoireTotale, enCombatPacte, typeCombatPacte, logsMort, statsDerniereRun,
      pactesDebloques, pactesEquipes,
      monstresTues, competences, setCompetences, xpTotal, bestiaire, aConnuBuff, aNouveauteTuto,
      aNouveauPacte, aPointsCompetenceDispo,
      ajouterLogGlobal, ajouterStatsTour, marquerTutoLu, marquerPactesVus, gererAbandon, gererBasculerPacte, gererLancerRun,
      gererPassageEtageSuivant, gererChoixRepos, declencherCombatPacte, handleFinDeCombat,
  } = useGameState();

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
          {ecran === 'ecran-hub' && (
              <Hub
                  onLancerRun={gererLancerRun}
                  onChangeEcran={setEcran}
                  xpTotal={xpTotal}
                  aNouveauteTuto={aNouveauteTuto}
                  marquerTutoLu={marquerTutoLu}
                  aNouveauPacte={aNouveauPacte}
                  marquerPactesVus={marquerPactesVus}
                  aPointsCompetenceDispo={aPointsCompetenceDispo}
              />
          )}

          {ecran === 'ecran-tuto' && (
              <Tuto
                  pactesDebloques={pactesDebloques}
                  xpTotal={xpTotal}
                  bestiaire={bestiaire}
                  aConnuBuff={aConnuBuff}
                  onRetour={() => setEcran('ecran-hub')}
              />
          )}

          {ecran === 'ecran-arbre' && (
              <ArbreCompetences
                  xpTotal={xpTotal}
                  competences={competences}
                  setCompetences={setCompetences}
                  monstresTues={monstresTues}
                  onRetour={() => setEcran('ecran-hub')}
              />
          )}

          {ecran === 'ecran-inventaire' && <Inventaire pactesDebloques={pactesDebloques} pactesEquipes={pactesEquipes} onBasculerPacte={gererBasculerPacte} onChangeEcran={setEcran} />}
          {ecran === 'ecran-fin' && <Fin victoire={victoireTotale} onRetourHub={() => setEcran('ecran-hub')} logsMort={logsMort} stats={statsDerniereRun} />}
          {ecran === 'ecran-repos' && joueur && <Repos soin={calculerSoinRepos(joueur.pvMax, pactesEquipes)} gainPv={calculerGainPvMaxRepos(pactesEquipes)} onChoix={gererChoixRepos} />}

          {ecran === 'ecran-choix-boss' && (
            <ChoixBoss
                aLvl1Equipe={aLvl1Equipe}
                estDernierEtage={indexEtageActuel >= listeEtages.length - 1}
                onFuir={gererPassageEtageSuivant}
                onCombattreLvl1={() => declencherCombatPacte('lvl1')}
                onCombattreLvl2={() => declencherCombatPacte('lvl2')}
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
                ajouterLogGlobal={ajouterLogGlobal}
                ajouterStatsTour={ajouterStatsTour}
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
