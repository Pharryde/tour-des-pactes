interface Props {
    pactesDebloques: string[];
    xpTotal: number;
    bestiaire: { normal: number, boss: number, evolue: number, final: number };
    aConnuBuff: boolean;
    onRetour: () => void;
}

export function Tuto({ pactesDebloques, xpTotal, bestiaire, aConnuBuff, onRetour }: Props) {
    const connaitCombo = pactesDebloques.some(p => p.includes("Pacte du Combo"));
    const connaitArmureRenvoi = pactesDebloques.includes("Pacte de l'Armure II");
    const connaitOmbre = pactesDebloques.some(p => p.includes("Pacte de l'Ombre"));
    const connaitTemps = pactesDebloques.some(p => p.includes("Pacte du Temps"));
    const connaitFluidite = pactesDebloques.some(p => p.includes("Pacte de la Fluidité"));

    return (
        <div className="ecran" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '1.5rem', backgroundColor: '#11111b', color: '#cdd6f4', overflowY: 'auto', boxSizing: 'border-box' }}>
            <h1 style={{ color: '#89b4fa', fontSize: '2rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', wordBreak: 'break-word' }}>
                📖 Les Archives de la Tour
            </h1>
            <p style={{ color: '#a6adc8', margin: '0 0 1.5rem 0', fontStyle: 'italic', textAlign: 'center', maxWidth: '100%' }}>
                Ce grimoire se remplit à mesure que vous arrachez les Pactes aux Gardiens...
            </p>

            <div style={{ width: '100%', maxWidth: '1800px', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxSizing: 'border-box' }}>
                
                <div style={{ backgroundColor: '#181825', padding: '1.2rem', borderRadius: '12px', border: '1px solid #313244', textAlign: 'left', boxSizing: 'border-box', width: '100%' }}>
                    <h2 style={{ color: '#f38ba8', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.4rem' }}>Les Bases du Combat</h2>
                    <p style={{ margin: '0.5rem 0' }}>La Tour se gravit étage par étage. Dans chaque salle, vous affrontez un ennemi. Le combat se déroule au <b>tour par tour</b>.</p>
                    <p style={{ margin: '0.5rem 0' }}>À chaque tour, vous devez programmer <b>5 actions</b> qui s'exécuteront séquentiellement en même temps que celles de votre adversaire.</p>
                    
                    <ul style={{ lineHeight: '1.6', margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                        <li>⚔️ <b>Attaque (A)</b> : Inflige des dégâts bruts équivalents à votre Force.</li>
                        <li>🎯 <b>Précise (P)</b> : Inflige des dégâts basés sur votre Précision en ignorant totalement l'armure ennemie.</li>
                        <li>🛡️ <b>Défense (D)</b> : Génère de l'Armure temporaire pour absorber les coups ce tour-ci.</li>
                        <li>💨 <b>Esquive (E)</b> : Augmente votre jauge d'esquive. Plus le niveau monte, plus vous avez de chances d'annuler complètement l'attaque adverse !</li>
                    </ul>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1.2rem', width: '100%', boxSizing: 'border-box' }}>
                    
                    {xpTotal > 0 && (
                        <div style={{ backgroundColor: '#181825', padding: '1.2rem', borderRadius: '12px', border: '1px solid #a6e3a1', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#a6e3a1', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Éclats d'Âme</span>
                            <h2 style={{ color: '#a6e3a1', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>L'Énergie des Âmes</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>En terrassant les créatures de la Tour, vous accumulez de l'XP. À certains paliers fixes (5, 10, 25, 50, 100 puis toutes les centaines), vous obtenez <b>1 Point de Compétence</b> à dépenser dans l'Arbre.</p>
                            
                            <p style={{ margin: '1rem 0 0.5rem 0' }}>Valeur des âmes libérées selon le bestiaire connu :</p>
                            <ul style={{ lineHeight: '1.6', margin: 0, paddingLeft: '1.5rem' }}>
                                <li>👹 <b>Monstre normal</b> : 1 XP</li>
                                {bestiaire.boss > 0 && <li>👑 <b>Boss (Normal)</b> : 2 XP</li>}
                                {bestiaire.evolue > 0 && <li>⚡ <b style={{ color: '#fab387' }}>Boss (Forme Évoluée)</b> : 4 XP</li>}
                                {bestiaire.final > 0 && <li>🔥 <b style={{ color: '#f38ba8' }}>Boss (Forme Finale)</b> : 8 XP</li>}
                            </ul>
                        </div>
                    )}

                    {aConnuBuff && (
                        <div style={{ backgroundColor: '#1e1e2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #f38ba8', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#f38ba8', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Résonance</span>
                            <h2 style={{ color: '#f38ba8', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>La Résonance des Pactes</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                                La Tour réagit aux pouvoirs que vous lui dérobez. Si vous pénétrez dans le domaine d'un Gardien en portant <b>son propre Pacte</b>, l'aura de ce dernier va entrer en résonance et <b>enrager les monstres de l'étage</b>, décuplant leur force et leur vitalité. Soyez prudent : la puissance a un prix.
                            </p>
                        </div>
                    )}

                    {connaitCombo && (
                        <div style={{ backgroundColor: '#1e1e2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #fab387', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#fab387', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Pacte du Combo</span>
                            <h2 style={{ color: '#fab387', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>La Mécanique de Combo</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                                Enchaîner <b>plusieurs fois la même action</b> d'affilée génère un Combo. <br/>
                                Plus le multiplicateur monte, plus vos dégâts et vos défenses sont décuplés lors des dernières actions du tour ! 
                                Faites attention, les monstres peuvent aussi l'utiliser.
                            </p>
                        </div>
                    )}

                    {connaitTemps && (
                        <div style={{ backgroundColor: '#1e1e2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #89dceb', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#89dceb', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Pacte du Temps</span>
                            <h2 style={{ color: '#89dceb', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>Fracture Temporelle</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                                La maîtrise du temps permet de dupliquer certaines de vos actions programmées. Une action dupliquée est exécutée <b>plusieurs fois instantanément</b>, brisant l'équilibre du tour par tour.
                            </p>
                        </div>
                    )}

                    {connaitOmbre && (
                        <div style={{ backgroundColor: '#1e1e2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #cba6f7', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#cba6f7', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Pacte de l'Ombre</span>
                            <h2 style={{ color: '#cba6f7', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>Frappes Vicieuses</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                                Certains monstres ont des actions cachées (❓). Le savoir de l'Ombre vous enseigne que la Frappe Précise (🎯) peut être fatalement optimisée pour infliger des dégâts critiques constants.
                            </p>
                        </div>
                    )}

                    {/* NOUVEAU : SAVOIR CACHÉ FLUIDITÉ */}
                    {connaitFluidite && (
                        <div style={{ backgroundColor: '#1e1e2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #74c7ec', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#74c7ec', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Pacte de la Fluidité</span>
                            <h2 style={{ color: '#74c7ec', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>Courant Continu</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                                L'eau ne stagne jamais. Ce pacte modifie les lois du combat en empêchant <b>physiquement</b> l'exécution de séries d'actions trop longues. Sous sa forme finale, il annule même les multiplicateurs de dégâts d'un début de combo adverse.
                            </p>
                        </div>
                    )}

                    {connaitArmureRenvoi && (
                        <div style={{ backgroundColor: '#1e1e2e', padding: '1.2rem', borderRadius: '12px', border: '1px solid #a6e3a1', position: 'relative', textAlign: 'left', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ position: 'absolute', top: '-0.6rem', right: '1rem', backgroundColor: '#a6e3a1', color: '#11111b', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>Découverte : Armure</span>
                            <h2 style={{ color: '#a6e3a1', borderBottom: '1px solid #313244', paddingBottom: '0.6rem', marginTop: 0, fontSize: '1.2rem' }}>Détonation d'Armure</h2>
                            <p style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                                L'armure n'est pas qu'un outil défensif. À la fin du tour, toute l'armure que vous n'avez pas consommée pour vous défendre <b>explose</b>, renvoyant l'intégralité de sa valeur sous forme de dégâts à l'adversaire.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <button 
                onClick={onRetour}
                className="btn-systeme"
                style={{ marginTop: '2rem', padding: '1rem 2.5rem', fontSize: '1.2rem', backgroundColor: '#313244', color: '#cdd6f4', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}
            >
                🔙 Retour au Hub
            </button>
        </div>
    );
}