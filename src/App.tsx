import { getImageCinematique } from './utils/etages';
import { calculerSoinRepos, calculerGainPvMaxRepos } from './utils/pactes';
import { useGameState } from './hooks/useGameState';
import { LIMITE_COMBO_PREMIERE_RUN } from './utils/combat';
import { Hub } from './components/Hub';
import { Inventaire } from './components/Inventaire';
import { CombatArene } from './components/CombatArene';
import { Fin } from './components/Fin';
import { ChoixBoss } from './components/ChoixBoss';
import { Repos } from './components/Repos';
import { SortieTour } from './components/SortieTour';
import { ChoixExtraction } from './components/ChoixExtraction';
import { HardcoreIntro } from './components/HardcoreIntro';
import { ClassementSaisie } from './components/ClassementSaisie';
import { Classement } from './components/Classement';
import { EtagePair } from './components/EtagePair';
import { TutoConclusion } from './components/TutoConclusion';
import { BenedictionChat } from './components/BenedictionChat';
import { PresentationForgeron } from './components/PresentationForgeron';
import { LeconCombo } from './components/LeconCombo';
import { LeconMortEcran } from './components/LeconMortEcran';
import { PacteObtenu } from './components/PacteObtenu';
import { RappelInventaire } from './components/RappelInventaire';
import { RoueChance } from './components/RoueChance';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CinematiqueBoss } from './components/CinematiqueBoss';
import { Tuto } from './components/Tuto';
import { ArbreCompetences } from './components/ArbreCompetences';
import { ACTIONS_CHAT_TUTO, ACTIONS_AUTORISEES_TUTO, DIALOGUE_CHAT_TUTO, LECONS_TUTO } from './utils/tutoCombat';
import './App.css';

function App() {
  const {
      moteurPret, erreurMoteur,
      ecran, setEcran,
      listeEtages, indexEtageActuel, indexSalle,
      joueur, historiqueLogs, victoireTotale, enCombatPacte, typeCombatPacte, logsMort, statsDerniereRun,
      enCombatMegaBoss, monstreMegaBoss, choixReposActifs, monstreTuto,
      pactesDebloques, pactesEquipes, pactesVictorieux, aPacteChat,
      aBenedictionChat, benedictionActive, vieChatDispo, forgeronDisponible,
      modeHardcore, aVaincuLaTour, runsHc, runsHcTotales, monstresHc, gererClassementSaisi,
      monstresTues, competences, setCompetences, xpTotal, bestiaire, aConnuBuff, synergiesDecouvertes, aNouveauteTuto,
      aNouveauPacte, pactesNonVus, aPointsCompetenceDispo, estPremiereRun,
      ajouterLogGlobal, ajouterStatsTour, marquerTutoLu, marquerPactesVus, gererAbandon, gererBasculerPacte, gererEquiperSynergie,
      gererDemarrerAscension, gererLancerRun, gererVieDeChatConsommee, gererQuitterFin, gererRecevoirBenediction, gererLeconMortVue, leconMortEnAttente, pacteObtenu, gererPacteObtenuVu,
      gererForgeronPresente, gererLeconComboFaite,
      gererEntrerHardcore, gererQuitterHardcore, gererResterDansLaTour, gererQuitterLaTour,
      gererPassageEtageSuivant, gererChoixRepos, declencherCombatPacte, gererDeclenchementMegaBoss,
      gererFinTutoriel, gererConclusionTuto, gererAbandonTuto, handleFinDeCombat,
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

  if (enCombatMegaBoss) {
      monstreActuel = monstreMegaBoss;
  }
  else if (etageActuel) {
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
                  onLancerRun={gererDemarrerAscension}
                  onChangeEcran={setEcran}
                  forgeronPresente={forgeronDisponible}
                  aNouveauteTuto={aNouveauteTuto}
                  marquerTutoLu={marquerTutoLu}
                  aNouveauPacte={aNouveauPacte}
                  aPointsCompetenceDispo={aPointsCompetenceDispo}
                  modeHardcore={modeHardcore}
                  aVaincuLaTour={aVaincuLaTour}
                  onQuitterHardcore={gererQuitterHardcore}
              />
          )}

          {ecran === 'ecran-tuto' && (
              <Tuto
                  pactesDebloques={pactesDebloques}
                  xpTotal={xpTotal}
                  bestiaire={bestiaire}
                  aConnuBuff={aConnuBuff}
                  synergiesDecouvertes={synergiesDecouvertes}
                  aBenedictionChat={aBenedictionChat}
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

          {ecran === 'ecran-inventaire' && (
              <Inventaire
                  pactesDebloques={pactesDebloques}
                  pactesEquipes={pactesEquipes}
                  pactesVictorieux={pactesVictorieux}
                  pactesNonVus={pactesNonVus}
                  marquerPactesVus={marquerPactesVus}
                  synergiesDecouvertes={synergiesDecouvertes}
                  aPacteChat={aPacteChat}
                  onBasculerPacte={gererBasculerPacte}
                  onEquiperSynergie={gererEquiperSynergie}
                  onChangeEcran={setEcran}
              />
          )}
          {ecran === 'ecran-fin' && <Fin victoire={victoireTotale} onRetourHub={gererQuitterFin} logsMort={logsMort} stats={statsDerniereRun} modeHardcore={modeHardcore} />}
          {ecran === 'ecran-repos' && joueur && <Repos joueur={joueur} soin={calculerSoinRepos(joueur.pvMax, pactesEquipes)} gainPv={calculerGainPvMaxRepos(pactesEquipes)} choixActifs={choixReposActifs} onChoix={gererChoixRepos} />}
          {ecran === 'ecran-sortie-tour' && <SortieTour onContinuer={gererDeclenchementMegaBoss} modeHardcore={modeHardcore} onQuitterLaTour={gererQuitterLaTour} />}
          {ecran === 'ecran-hardcore-intro' && <HardcoreIntro onEntrer={gererEntrerHardcore} onRetour={() => setEcran('ecran-hub')} />}
          {ecran === 'ecran-classement-saisie' && <ClassementSaisie nbRuns={runsHc} runsTotales={runsHcTotales} monstresTues={monstresHc} onTermine={gererClassementSaisi} />}
          {ecran === 'ecran-classement' && <Classement onRetour={() => setEcran('ecran-hub')} />}
          {ecran === 'ecran-extraction' && (
              <ChoixExtraction
                  numeroEtage={indexEtageActuel + 1}
                  totalEtages={listeEtages.length}
                  nbPactes={pactesDebloques.length}
                  xpTotal={xpTotal}
                  onSortir={gererQuitterLaTour}
                  onContinuer={gererResterDansLaTour}
              />
          )}
          {ecran === 'ecran-etage-pair' && <EtagePair onContinuer={() => setEcran('ecran-combat')} />}
          {ecran === 'ecran-tuto-conclusion' && <TutoConclusion onContinuer={gererConclusionTuto} />}
          {ecran === 'ecran-benediction' && <BenedictionChat aVaincuLaTour={victoireTotale} onContinuer={gererRecevoirBenediction} />}
          {ecran === 'ecran-forgeron' && <PresentationForgeron onContinuer={gererForgeronPresente} />}
          {ecran === 'ecran-lecon-combo' && <LeconCombo onContinuer={gererLeconComboFaite} />}
          {ecran === 'ecran-lecon-mort' && leconMortEnAttente && <LeconMortEcran lecon={leconMortEnAttente} onContinuer={gererLeconMortVue} />}
          {ecran === 'ecran-pacte-obtenu' && pacteObtenu && (
              <PacteObtenu
                  nomPacte={pacteObtenu}
                  estPremierPacte={pactesDebloques.length <= 1}
                  onContinuer={gererPacteObtenuVu}
              />
          )}
          {ecran === 'ecran-rappel-inventaire' && (
              <RappelInventaire
                  nbPactesDisponibles={pactesDebloques.length}
                  onAllerInventaire={() => setEcran('ecran-inventaire')}
                  onPartirQuandMeme={() => gererDemarrerAscension(true)}
              />
          )}
          {ecran === 'ecran-roue' && benedictionActive && <RoueChance benediction={benedictionActive} onEntrer={() => gererLancerRun(benedictionActive)} />}

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
                key={`${indexEtageActuel}-${indexSalle}-${enCombatPacte}-${enCombatMegaBoss}`}
                joueurInitial={joueur}
                monstreInitial={monstreActuel}
                nomEtage={enCombatMegaBoss ? "La Sortie de la Tour" : etageActuel.nom}
                numeroEtage={indexEtageActuel + 1}
                totalEtages={listeEtages.length}
                numeroSalle={enCombatMegaBoss ? 0 : indexSalle}
                totalSalles={enCombatMegaBoss ? 1 : etageActuel.monstres.length + 1}
                pactesEquipes={pactesEquipes}
                competences={competences}
                logsGlobaux={historiqueLogs}
                ajouterLogGlobal={ajouterLogGlobal}
                ajouterStatsTour={ajouterStatsTour}
                formesMegaBoss={enCombatMegaBoss ? listeEtages.map(e => e.bossHeroiqueLvl2) : undefined}
                onFinDeCombat={handleFinDeCombat}
                onAbandon={gererAbandon}
                modeHardcore={modeHardcore}
                enCombatPacte={enCombatPacte}
                limiteComboMonstre={estPremiereRun ? LIMITE_COMBO_PREMIERE_RUN : undefined}
                benedictionActive={benedictionActive}
                peutRessusciter={vieChatDispo}
                onRessusciter={gererVieDeChatConsommee}
              />
            </div>
          )}

          {ecran === 'ecran-tuto-intro' && joueur && monstreTuto && (
            <div id="ecran-combat" className="ecran" style={{ justifyContent: 'flex-start' }}>
              <CombatArene
                key="tuto-intro"
                joueurInitial={joueur}
                monstreInitial={monstreTuto}
                nomEtage="Tutoriel"
                numeroEtage={0}
                totalEtages={0}
                numeroSalle={0}
                totalSalles={1}
                pactesEquipes={[]}
                competences={{ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 }}
                logsGlobaux={historiqueLogs}
                ajouterLogGlobal={ajouterLogGlobal}
                ajouterStatsTour={() => {}}
                onFinDeCombat={() => {}}
                onAbandon={gererAbandonTuto}
                enCombatPacte={false}
                estTutoriel
                actionsMonstreScriptees={ACTIONS_CHAT_TUTO}
                actionsAutoriseesTuto={ACTIONS_AUTORISEES_TUTO}
                dialogueTuto={DIALOGUE_CHAT_TUTO}
                leconsTuto={LECONS_TUTO}
                onFinTutoriel={gererFinTutoriel}
              />
            </div>
          )}
        </div>
    </ErrorBoundary>
  );
}

export default App;
