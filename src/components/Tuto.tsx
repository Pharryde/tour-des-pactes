interface Props {
    pactesDebloques: string[];
    xpTotal: number;
    bestiaire: { normal: number, boss: number, evolue: number, final: number };
    aConnuBuff: boolean; // NOUVEAU
    onRetour: () => void;
}

export function Tuto({ pactesDebloques, xpTotal, bestiaire, aConnuBuff, onRetour }: Props) {
    const connaitCombo = pactesDebloques.some(p => p.includes("Pacte du Combo"));
    const connaitArmureRenvoi = pactesDebloques.includes("Pacte de l'Armure II");
    const connaitOmbre = pactesDebloques.some(p => p.includes("Pacte de l'Ombre"));
    const connaitTemps = pactesDebloques.some(p => p.includes("Pacte du Temps"));

    return (
        <div className="ecran" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '20px', backgroundColor: '#11111b', color: '#cdd6f4', overflowY: 'auto' }}>
            <h1 style={{ color: '#89b4fa', fontSize: '2.5em', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>
                📖 Les Archives de la Tour
            </h1>
            <p style={{ color: '#a6adc8', marginBottom: '30px', fontStyle: 'italic', textAlign: 'center' }}>
                Ce grimoire se remplit à mesure que vous arrachez les Pactes aux Gardiens...
            </p>

            <div style={{ maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* --- LES BASES (Toujours visible) --- */}
                <div style={{ backgroundColor: '#181825', padding: '20px', borderRadius: '12px', border: '1px solid #313244' }}>
                    <h2 style={{ color: '#f38ba8', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>Les Bases du Combat</h2>
                    <p>La Tour se gravit étage par étage. Dans chaque salle, vous affrontez un ennemi. Le combat se déroule au <b>tour par tour</b>.</p>
                    <p>À chaque tour, vous devez programmer <b>5 actions</b> qui s'exécuteront séquentiellement en même temps que celles de votre adversaire.</p>
                    
                    <ul style={{ lineHeight: '1.8', marginTop: '10px' }}>
                        <li>⚔️ <b>Attaque (A)</b> : Inflige des dégâts bruts équivalents à votre Force.</li>
                        <li>🎯 <b>Précise (P)</b> : Inflige des dégâts basés sur votre Précision en ignorant totalement l'armure ennemie.</li>
                        <li>🛡️ <b>Défense (D)</b> : Génère de l'Armure temporaire pour absorber les coups ce tour-ci.</li>
                        <li>💨 <b>Esquive (E)</b> : Augmente votre jauge d'esquive. Plus le niveau monte, plus vous avez de chances d'annuler complètement l'attaque adverse !</li>
                    </ul>
                </div>

                {/* --- L'XP ET L'ARBRE --- */}
                {xpTotal > 0 && (
                    <div style={{ backgroundColor: '#181825', padding: '20px', borderRadius: '12px', border: '1px solid #a6e3a1', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: '#a6e3a1', color: '#11111b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em', fontWeight: 'bold' }}>Découverte : Éclats d'Âme</span>
                        <h2 style={{ color: '#a6e3a1', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>L'Énergie des Âmes (Expérience)</h2>
                        <p>En terrassant les créatures de la Tour, vous accumulez de l'XP. À certains paliers fixes (5, 10, 25, 50, 100 puis toutes les centaines), vous obtenez <b>1 Point de Compétence</b> à dépenser dans l'Arbre.</p>
                        
                        <p style={{ marginTop: '15px' }}>Valeur des âmes libérées selon le bestiaire connu :</p>
                        <ul style={{ lineHeight: '1.8', marginTop: '5px' }}>
                            <li>👹 <b>Monstre normal</b> : 1 XP</li>
                            
                            {bestiaire.boss > 0 && (
                                <li>👑 <b>Boss (Normal)</b> : 2 XP</li>
                            )}
                            {bestiaire.evolue > 0 && (
                                <li>⚡ <b style={{ color: '#fab387' }}>Boss (Forme Évoluée)</b> : 4 XP</li>
                            )}
                            {bestiaire.final > 0 && (
                                <li>🔥 <b style={{ color: '#f38ba8' }}>Boss (Forme Finale)</b> : 8 XP</li>
                            )}
                        </ul>
                    </div>
                )}

                {/* --- SAVOIR CACHÉ : LA RÉSONANCE DES PACTES --- */}
                {aConnuBuff && (
                    <div style={{ backgroundColor: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #f38ba8', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: '#f38ba8', color: '#11111b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em', fontWeight: 'bold' }}>Découverte : Résonance</span>
                        <h2 style={{ color: '#f38ba8', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>La Résonance des Pactes</h2>
                        <p>
                            La Tour réagit aux pouvoirs que vous lui dérobez. Si vous pénétrez dans le domaine d'un Gardien en portant <b>son propre Pacte</b>, l'aura de ce dernier va entrer en résonance et <b>enrager les monstres de l'étage</b>, décuplant leur force et leur vitalité. Soyez prudent : la puissance a un prix.
                        </p>
                    </div>
                )}

                {/* --- SAVOIR CACHÉ : LE COMBO --- */}
                {connaitCombo && (
                    <div style={{ backgroundColor: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #fab387', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: '#fab387', color: '#11111b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em', fontWeight: 'bold' }}>Découverte : Pacte du Combo</span>
                        <h2 style={{ color: '#fab387', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>La Mécanique de Combo</h2>
                        <p>
                            Enchaîner <b>plusieurs fois la même action</b> d'affilée génère un Combo. <br/>
                            Plus le multiplicateur monte, plus vos dégâts et vos défenses sont décuplés lors des dernières actions du tour ! 
                            Faites attention, les monstres peuvent aussi l'utiliser.
                        </p>
                    </div>
                )}

                {/* --- SAVOIR CACHÉ : LE TEMPS --- */}
                {connaitTemps && (
                    <div style={{ backgroundColor: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #89dceb', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: '#89dceb', color: '#11111b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em', fontWeight: 'bold' }}>Découverte : Pacte du Temps</span>
                        <h2 style={{ color: '#89dceb', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>Fracture Temporelle</h2>
                        <p>
                            La maîtrise du temps permet de dupliquer certaines de vos actions programmées. Une action dupliquée est exécutée <b>plusieurs fois instantanément</b>, brisant l'équilibre du tour par tour.
                        </p>
                    </div>
                )}

                {/* --- SAVOIR CACHÉ : L'OMBRE --- */}
                {connaitOmbre && (
                    <div style={{ backgroundColor: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #cba6f7', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: '#cba6f7', color: '#11111b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em', fontWeight: 'bold' }}>Découverte : Pacte de l'Ombre</span>
                        <h2 style={{ color: '#cba6f7', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>Frappes Vicieuses</h2>
                        <p>
                            Certains monstres ont des actions cachées (❓). Le savoir de l'Ombre vous enseigne que la Frappe Précise (🎯) peut être fatalement optimisée pour infliger des dégâts critiques constants.
                        </p>
                    </div>
                )}

                {/* --- SAVOIR CACHÉ : LE RENVOI D'ARMURE --- */}
                {connaitArmureRenvoi && (
                    <div style={{ backgroundColor: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #a6e3a1', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: '#a6e3a1', color: '#11111b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em', fontWeight: 'bold' }}>Découverte : Forme Finale de l'Armure</span>
                        <h2 style={{ color: '#a6e3a1', borderBottom: '1px solid #313244', paddingBottom: '10px', marginTop: 0 }}>Détonation d'Armure</h2>
                        <p>
                            L'armure n'est pas qu'un outil défensif. À la fin du tour, toute l'armure que vous n'avez pas consommée pour vous défendre <b>explose</b>, renvoyant l'intégralité de sa valeur sous forme de dégâts à l'adversaire.
                        </p>
                    </div>
                )}

            </div>

            <button 
                onClick={onRetour}
                className="btn-systeme"
                style={{ marginTop: '40px', padding: '15px 40px', fontSize: '1.2em', backgroundColor: '#313244', color: '#cdd6f4', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                🔙 Retour au Hub
            </button>
        </div>
    );
}