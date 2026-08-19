import { useEffect, useState } from 'react';
import {
    SUCCES_REGISTRY, lireRaretes, topPourcent, valeurAtteinte,
    type GroupeSucces, type ProgressionSucces, type RareteSucces,
} from '../utils/succes';

interface SuccesListeProps {
    progression: ProgressionSucces;
    obtenus: string[];
    // Succès décrochés depuis la dernière consultation de cet onglet. ⚠️ Calculé AVANT que la visite
    // ne les marque comme vus, sinon la liste serait déjà vide au premier rendu (même piège que le
    // marqueur « Nouveau » de l'Inventaire).
    nonVus: string[];
}

const ORDRE_GROUPES: GroupeSucces[] = ['normal', 'hardcore', 'theme', 'final'];
const TITRES_GROUPES: Record<GroupeSucces, string> = {
    normal: '🛡️ Mode Normal',
    hardcore: '☠️ Mode Hardcore',
    theme: '🎭 Retournements',
    final: '👑 Consécration',
};

// Le seuil visé se lit dans l'identifiant, qui l'y encode déjà — le redéclarer ailleurs créerait
// deux sources de vérité pour la même valeur.
function seuilDe(id: string): number | null {
    const brut = Number(id.replace('_hc', '').split('_').pop());
    return Number.isFinite(brut) ? brut : null;
}

export function SuccesListe({ progression, obtenus, nonVus }: SuccesListeProps) {
    const [raretes, setRaretes] = useState<Record<string, RareteSucces> | null>(null);

    useEffect(() => {
        let annule = false;
        lireRaretes().then(r => { if (!annule) setRaretes(r); });
        return () => { annule = true; };
    }, []);

    const acquis = new Set(obtenus);
    const neufs = new Set(nonVus);

    return (
        <div className="succes-bloc">
            <p className="texte-description succes-total">
                {acquis.size} / {SUCCES_REGISTRY.length} succès débloqués
            </p>

            {ORDRE_GROUPES.map(groupe => (
                <div key={groupe} className="succes-groupe">
                    <h2 className="succes-groupe-titre">{TITRES_GROUPES[groupe]}</h2>
                    <div className="succes-grille">
                        {SUCCES_REGISTRY.filter(s => s.groupe === groupe).map(def => {
                            const obtenu = acquis.has(def.id);
                            const estNeuf = neufs.has(def.id);
                            const seuil = seuilDe(def.id);
                            const valeur = valeurAtteinte(def.id, progression);
                            const pourcent = topPourcent(raretes?.[def.id]);
                            return (
                                <div key={def.id} className={`succes-carte${obtenu ? ' succes-carte--obtenu' : ''}${estNeuf ? ' succes-carte--nouveau' : ''}`}>
                                    <div className="succes-carte-tete">
                                        <span className="succes-icone">{obtenu ? '🏅' : '🔒'}</span>
                                        <span className="succes-titre">{def.titre}</span>
                                        {estNeuf && <span className="succes-pastille">Nouveau</span>}
                                    </div>
                                    <p className="succes-description">{def.description}</p>

                                    {/* Progression chiffrée, seulement quand elle veut dire quelque
                                        chose : un succès à thème ou le Finisseur n'ont pas de jauge. */}
                                    {!obtenu && seuil !== null && valeur !== null && (
                                        <div className="succes-jauge">
                                            <div className="succes-jauge-remplie" style={{ width: `${Math.min(100, (valeur / seuil) * 100)}%` }} />
                                            <span className="succes-jauge-texte">{Math.min(valeur, seuil)} / {seuil}</span>
                                        </div>
                                    )}

                                    {/* La rareté n'a de sens qu'une fois le succès obtenu : sinon
                                        elle annoncerait au joueur ce qu'il n'a pas encore fait. */}
                                    {obtenu && (
                                        <p className="succes-rarete">
                                            {pourcent !== null
                                                ? `Top ${pourcent} % des joueurs`
                                                : 'Rareté indisponible'}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
