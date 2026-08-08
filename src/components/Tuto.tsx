import type { Bestiaire, Synergie } from '../types';
import { SYNERGIES_REGISTRY } from '../utils/synergies';
import { BENEDICTIONS_REGISTRY, LISTE_BENEDICTIONS } from '../utils/benedictions';

interface Props {
    pactesDebloques: string[];
    xpTotal: number;
    bestiaire: Bestiaire;
    aConnuBuff: boolean;
    synergiesDecouvertes: Synergie[];
    aBenedictionChat: boolean;
    onRetour: () => void;
}

export function Tuto({ pactesDebloques, xpTotal, bestiaire, aConnuBuff, synergiesDecouvertes, aBenedictionChat, onRetour }: Props) {
    const connaitCombo = pactesDebloques.some(p => p.includes("Pacte du Combo"));
    const connaitArmureRenvoi = pactesDebloques.includes("Pacte de l'Armure II");
    const connaitOmbre = pactesDebloques.some(p => p.includes("Pacte de l'Ombre"));
    const connaitTemps = pactesDebloques.some(p => p.includes("Pacte du Temps"));
    const connaitFluidite = pactesDebloques.some(p => p.includes("Pacte de la Fluidité"));
    const connaitPuissanceBrute = pactesDebloques.some(p => p.includes("Pacte de la Puissance Brute"));

    return (
        <div className="ecran tuto-ecran">
            <h1 className="tuto-titre">
                📖 Les Archives de la Tour
            </h1>
            <p className="tuto-soustitre">
                Ce grimoire se remplit à mesure que vous arrachez les Pactes aux Gardiens...
            </p>

            <div className="tuto-contenu">

                <div className="tuto-carte-base">
                    <h2>Les Bases du Combat</h2>
                    <p>La Tour se gravit étage par étage. Dans chaque salle, vous affrontez un ennemi. Le combat se déroule au <b>tour par tour</b>.</p>
                    <p>À chaque tour, vous devez programmer <b>5 actions</b> qui s'exécuteront séquentiellement en même temps que celles de votre adversaire.</p>

                    <ul>
                        <li>⚔️ <b>Attaque (A)</b> : Inflige des dégâts bruts équivalents à votre Force.</li>
                        <li>🎯 <b>Précise (P)</b> : Inflige des dégâts basés sur votre Précision en ignorant totalement l'armure ennemie.</li>
                        <li>🛡️ <b>Défense (D)</b> : Génère de l'Armure pour absorber les coups. Elle s'accumule et vous protège pendant tout le tour, puis <b>retombe à zéro à la fin de celui-ci</b> — rien ne se reporte sur le tour suivant.</li>
                        <li>💨 <b>Esquive (E)</b> : Augmente votre jauge d'esquive d'un palier. Plus le niveau monte, plus vous avez de chances d'annuler complètement l'attaque adverse — jusqu'au <b>palier 3, le maximum</b>. Enchaîner l'Esquive au-delà n'apporte plus rien, et toute autre action fait redescendre la jauge.</li>
                    </ul>
                </div>

                <div className="tuto-grille">

                    {xpTotal > 0 && (
                        <div className="tuto-carte tuto-carte-xp">
                            <span className="tuto-badge">Découverte : Éclats d'Âme</span>
                            <h2>L'Énergie des Âmes</h2>
                            <p>En terrassant les créatures de la Tour, vous accumulez de l'XP. À certains paliers fixes (5, 10, 25, 50, 100 puis toutes les centaines), vous obtenez <b>1 Point de Compétence</b> à dépenser dans l'Arbre.</p>

                            <p>Valeur des âmes libérées selon le bestiaire connu :</p>
                            <ul>
                                <li>👹 <b>Monstre normal</b> : 1 XP</li>
                                {bestiaire.boss > 0 && <li>👑 <b>Boss (Normal)</b> : 2 XP</li>}
                                {bestiaire.evolue > 0 && <li>⚡ <b className="c-orange">Boss (Forme Évoluée)</b> : 4 XP</li>}
                                {bestiaire.final > 0 && <li>🔥 <b className="c-rose">Boss (Forme Finale)</b> : 8 XP</li>}
                            </ul>
                        </div>
                    )}

                    {aConnuBuff && (
                        <div className="tuto-carte tuto-carte-resonance">
                            <span className="tuto-badge">Découverte : Résonance</span>
                            <h2>La Résonance des Pactes</h2>
                            <p>
                                La Tour réagit aux pouvoirs que vous lui dérobez. Si vous pénétrez dans le domaine d'un Gardien en portant <b>son propre Pacte</b>, l'aura de ce dernier va entrer en résonance et <b>enrager les monstres de l'étage</b>, décuplant leur force et leur vitalité. Soyez prudent : la puissance a un prix.
                            </p>
                        </div>
                    )}

                    {connaitCombo && (
                        <div className="tuto-carte tuto-carte-combo">
                            <span className="tuto-badge">Découverte : Pacte du Combo</span>
                            <h2>La Mécanique de Combo</h2>
                            <p>
                                Enchaîner <b>plusieurs fois la même action</b> d'affilée génère un Combo. <br/>
                                Plus le multiplicateur monte, plus vos dégâts et vos défenses sont décuplés lors des dernières actions du tour !
                                Faites attention, les monstres peuvent aussi l'utiliser.
                            </p>
                        </div>
                    )}

                    {connaitTemps && (
                        <div className="tuto-carte tuto-carte-temps">
                            <span className="tuto-badge">Découverte : Pacte du Temps</span>
                            <h2>Fracture Temporelle</h2>
                            <p>
                                La maîtrise du temps permet de dupliquer certaines de vos actions programmées. Une action dupliquée est exécutée <b>plusieurs fois instantanément</b>, brisant l'équilibre du tour par tour.
                            </p>
                        </div>
                    )}

                    {connaitOmbre && (
                        <div className="tuto-carte tuto-carte-ombre">
                            <span className="tuto-badge">Découverte : Pacte de l'Ombre</span>
                            <h2>Frappes Vicieuses</h2>
                            <p>
                                Certains monstres ont des actions cachées (❓). Le savoir de l'Ombre vous enseigne que la Frappe Précise (🎯) peut être fatalement optimisée pour infliger des dégâts critiques constants.
                            </p>
                        </div>
                    )}

                    {connaitFluidite && (
                        <div className="tuto-carte tuto-carte-fluidite">
                            <span className="tuto-badge">Découverte : Pacte de la Fluidité</span>
                            <h2>Courant Continu</h2>
                            <p>
                                L'eau ne stagne jamais. Ce pacte modifie les lois du combat en empêchant <b>physiquement</b> l'exécution de séries d'actions trop longues. Sous sa forme finale, il annule même les multiplicateurs de dégâts d'un début de combo adverse.
                            </p>
                        </div>
                    )}

                    {connaitPuissanceBrute && (
                        <div className="tuto-carte tuto-carte-puissance">
                            <span className="tuto-badge">Découverte : Pacte de la Puissance Brute</span>
                            <h2>Force Écrasante</h2>
                            <p>
                                Certains Gardiens ne savent plus viser : ils frappent sans finesse, uniquement à l'Attaque brute. Ce Pacte amplifie vos propres coups d'Attaque, et sous sa forme finale, chaque palier de combo martelé au corps-à-corps devient encore plus dévastateur.
                            </p>
                        </div>
                    )}

                    {connaitArmureRenvoi && (
                        <div className="tuto-carte tuto-carte-armure">
                            <span className="tuto-badge">Découverte : Armure</span>
                            <h2>Détonation d'Armure</h2>
                            <p>
                                L'armure n'est pas qu'un outil défensif. À la fin du tour, toute l'armure que vous n'avez pas consommée pour vous défendre <b>explose</b>, renvoyant l'intégralité de sa valeur sous forme de dégâts à l'adversaire.
                            </p>
                        </div>
                    )}

                    {aBenedictionChat && (
                        <div className="tuto-carte tuto-carte-benediction">
                            <span className="tuto-badge">Don du Chat : Bénédiction</span>
                            <h2>La Roue de la Chance</h2>
                            <p>
                                L'Esprit de la Tour vous accompagne désormais. À <b>chaque entrée dans la Tour</b>, sa
                                roue vous accorde au hasard l'un de ces six bonus, valable pour toute l'ascension :
                            </p>
                            <ul>
                                {LISTE_BENEDICTIONS.map(cle => (
                                    <li key={cle}>
                                        {BENEDICTIONS_REGISTRY[cle].emoji} <b>{BENEDICTIONS_REGISTRY[cle].titre}</b> : {BENEDICTIONS_REGISTRY[cle].description}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {synergiesDecouvertes.map(synergie => (
                        <div key={synergie} className="tuto-carte tuto-carte-synergie">
                            <span className="tuto-badge">Secret découvert : Synergie {synergie}</span>
                            <h2>{SYNERGIES_REGISTRY[synergie].titre}</h2>
                            <p>{SYNERGIES_REGISTRY[synergie].description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={onRetour}
                className="btn-retour"
            >
                🔙 Retour au Hub
            </button>
        </div>
    );
}
