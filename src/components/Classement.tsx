import { useEffect, useState } from 'react';
import { SuccesListe } from './SuccesListe';
import type { ProgressionSucces } from '../utils/succes';
import {
    CATEGORIES, LONGUEUR_MAX_NOM, enregistrerNom, lireClassement, lireMonEntree, lireMonRang,
    nettoyerNomJoueur, nettoyerSaisieNom, nomJoueurValide, valeurCategorie,
    type Categorie, type EntreeClassement,
} from '../utils/classement';

interface ClassementProps {
    // Le classement se CONSULTE toujours ; seule l'inscription de son nom exige d'avoir vaincu la
    // Tour, puisque c'est elle qui rend une progression comparable aux autres.
    peutSInscrire: boolean;
    progressionSucces: ProgressionSucces;
    succesObtenus: string[];
    nomJoueur: string;
    onNomChange: (nom: string) => void;
    onRetour: () => void;
    // Éteint la pastille du Hub. Appelée à la SORTIE de l'écran, et seulement si l'onglet 🏅 a été
    // ouvert : plus tôt, les pastilles de nouveauté disparaîtraient avant d'avoir été vues ; sans la
    // condition, un joueur venu consulter le classement se ferait escamoter ses succès.
    onSuccesVus: () => void;
    // Succès décrochés depuis la dernière consultation de l'onglet 🏅, pour les marquer d'une
    // pastille. Ils restent signalés pendant toute la visite : le marquage n'a lieu qu'à la sortie.
    succesNonVus: string[];
}

const MEDAILLES = ['🥇', '🥈', '🥉'];
const ONGLETS: Categorie[] = ['hardcore', 'etageNormal', 'etageHardcore'];
// Les succès partagent la page du classement, comme un onglet de plus.
type Onglet = Categorie | 'succes';
const LIBELLES_ONGLET: Record<Categorie, string> = {
    hardcore: '☠️ Hardcore',
    etageNormal: '🛡️ Étages',
    etageHardcore: '☠️ Étages HC',
};

// Un même joueur peut figurer dans plusieurs catégories avec des chiffres différents : le libellé
// doit donc suivre la catégorie affichée, pas la ligne.
function libelleValeur(categorie: Categorie, valeur: number): string {
    if (categorie === 'hardcore') return `${valeur} ${valeur > 1 ? 'ascensions' : 'ascension'}`;
    return `Étage ${valeur}`;
}

export function Classement({ peutSInscrire, progressionSucces, succesObtenus, succesNonVus, nomJoueur, onNomChange, onRetour, onSuccesVus }: ClassementProps) {
    // ⚠️ Le marquage « vus » est reporté à la SORTIE : appelé à l'ouverture de l'onglet, il viderait
    // la liste des nouveautés avant le premier rendu et aucune pastille n'apparaîtrait jamais (même
    // piège que `marquerPactesVus` dans l'Inventaire). Il reste conditionné à une visite RÉELLE de
    // l'onglet 🏅 : sortir du classement sans y passer ne doit escamoter aucun succès.
    const [succesConsultes, setSuccesConsultes] = useState(false);
    const quitter = () => { if (succesConsultes) onSuccesVus(); onRetour(); };
    const [onglet, setOnglet] = useState<Onglet>('hardcore');
    // Les requêtes de classement ne concernent que les onglets de catégorie : sur l'onglet des
    // succès on garde la dernière catégorie consultée pour ne pas relancer de lecture inutile.
    const [categorie, setCategorie] = useState<Categorie>('hardcore');
    // Un seul état pour tout le résultat, ESTAMPILLÉ de la catégorie qu'il décrit : c'est lui qui
    // fait office d'indicateur de chargement (`resultat.categorie !== categorie`). Un booléen
    // séparé imposerait un `setState` synchrone dans l'effet, que la règle ESLint du projet
    // interdit — et qui afficherait de toute façon brièvement les données de l'onglet précédent.
    const [resultat, setResultat] = useState<{
        categorie: Categorie;
        liste: EntreeClassement[] | null;   // null = échec réseau, [] = personne
        mienne: EntreeClassement | null;
        rang: number | null;
    } | null>(null);

    const [editionNom, setEditionNom] = useState(false);
    const [brouillonNom, setBrouillonNom] = useState(nomJoueur);
    const [envoiNom, setEnvoiNom] = useState(false);
    const [erreurNom, setErreurNom] = useState<'deja_pris' | 'echec' | null>(null);
    const [rechargements, setRechargements] = useState(0);

    useEffect(() => {
        let annule = false;
        const charger = async () => {
            const [liste, mienne] = await Promise.all([lireClassement(categorie), lireMonEntree()]);
            if (annule) return;
            // Le rang n'a de sens que si le joueur a une valeur dans CETTE catégorie.
            const maValeur = mienne ? valeurCategorie(mienne, categorie) : null;
            const rang = maValeur !== null ? await lireMonRang(categorie, maValeur) : null;
            if (!annule) setResultat({ categorie, liste, mienne, rang });
        };
        charger();
        return () => { annule = true; };
    }, [categorie, rechargements]);

    const validerNom = async () => {
        const propre = nettoyerNomJoueur(brouillonNom);
        if (!nomJoueurValide(propre) || envoiNom) return;
        setEnvoiNom(true);
        const resultat = await enregistrerNom(propre);
        setEnvoiNom(false);
        if (resultat !== 'ok') { setErreurNom(resultat); return; }
        setErreurNom(null);
        onNomChange(propre);
        setEditionNom(false);
        // Le nom vient de changer partout : on relit pour que la liste et sa propre ligne suivent.
        setRechargements(n => n + 1);
    };

    const surSucces = onglet === 'succes';
    const chargement = resultat?.categorie !== categorie;
    const entrees = chargement ? null : resultat!.liste;
    const monEntree = chargement ? null : resultat!.mienne;
    const monRang = chargement ? null : resultat!.rang;
    const maValeur = monEntree ? valeurCategorie(monEntree, categorie) : null;
    // Inutile de répéter sa propre ligne si elle est déjà visible dans le top affiché.
    const dejaVisible = monRang !== null && monRang <= (entrees?.length ?? 0);

    return (
        <div id="ecran-classement" className="ecran">
            <h1 className="titre-geant c-or">🏆 LES SURVIVANTS</h1>

            <div className="classement-onglets">
                {ONGLETS.map(c => (
                    <button
                        key={c}
                        className={`classement-onglet${c === onglet ? ' classement-onglet--actif' : ''}`}
                        onClick={() => { setOnglet(c); setCategorie(c); }}
                    >
                        {LIBELLES_ONGLET[c]}
                    </button>
                ))}
                <button
                    className={`classement-onglet${onglet === 'succes' ? ' classement-onglet--actif' : ''}`}
                    onClick={() => { setOnglet('succes'); setSuccesConsultes(true); }}
                >
                    🏅 Succès
                </button>
            </div>

            {!surSucces && <p className="texte-description classement-intro">{CATEGORIES[categorie].titre}</p>}
            {surSucces && <SuccesListe progression={progressionSucces} obtenus={succesObtenus} nonVus={succesNonVus} />}

            {!surSucces && chargement && <p className="texte-description">Consultation des archives…</p>}

            {!surSucces && !chargement && entrees === null && (
                <p className="texte-description c-rose">Le classement est injoignable pour le moment.</p>
            )}

            {!surSucces && !chargement && entrees?.length === 0 && (
                <p className="texte-description">Personne n'en est encore revenu. La première ligne vous attend.</p>
            )}

            {!surSucces && !chargement && entrees && entrees.length > 0 && (
                <div className="classement-tableau">
                    {entrees.map((entree, index) => {
                        const valeur = valeurCategorie(entree, categorie);
                        return (
                            <div
                                key={`${entree.nom}-${index}`}
                                className={`classement-ligne${entree.nom === nomJoueur ? ' classement-ligne--moi' : ''}`}
                            >
                                <span className="classement-rang">{MEDAILLES[index] ?? `${index + 1}.`}</span>
                                <span className="classement-nom">{entree.nom}</span>
                                <span className="classement-stats">
                                    <span className="classement-runs">{valeur !== null ? libelleValeur(categorie, valeur) : '—'}</span>
                                    {categorie === 'hardcore' && entree.monstres_tues !== null && (
                                        <span className="classement-monstres">👿 {entree.monstres_tues}</span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sa propre position, même très loin dans la liste : sans ça un joueur classé 40e ne
                verrait son score nulle part. Masquée s'il est déjà visible dans le top affiché. */}
            {!surSucces && !chargement && entrees !== null && !dejaVisible && (
                <div className="classement-ma-place">
                    {maValeur !== null ? (
                        <div className="classement-ligne classement-ligne--moi">
                            <span className="classement-rang">{monRang !== null ? `${monRang}.` : '—'}</span>
                            <span className="classement-nom">{monEntree?.nom ?? 'Vous'}</span>
                            <span className="classement-stats">
                                <span className="classement-runs">{libelleValeur(categorie, maValeur)}</span>
                                {categorie === 'hardcore' && monEntree?.monstres_tues != null && (
                                    <span className="classement-monstres">👿 {monEntree.monstres_tues}</span>
                                )}
                            </span>
                        </div>
                    ) : (
                        <p className="texte-description classement-absent">
                            {/* Sans le droit de s'inscrire, « choisissez un nom » désignerait un
                                bouton qui n'existe pas encore : on dit plutôt ce qui l'ouvrira. */}
                            {!peutSInscrire
                                ? "Terrassez le Gardien Absolu pour inscrire votre nom sur ces listes."
                                : nomJoueur
                                    ? "Vous n'avez encore rien inscrit dans cette catégorie."
                                    : "Choisissez un nom pour que vos records y soient inscrits."}
                        </p>
                    )}
                </div>
            )}

            {/* On consulte librement, on ne s'inscrit qu'une fois la Tour vaincue : proposer un
                pseudo plus tôt ferait choisir une identité publique pour des records qui ne partent
                pas encore. La publication des SUCCÈS, elle, ne dépend que de la session — jamais du
                pseudo — et fonctionne donc dès le premier combat. */}
            {peutSInscrire && (editionNom ? (
                <div className="classement-champ">
                    <input
                        type="text"
                        className="classement-input"
                        value={brouillonNom}
                        onChange={e => { setBrouillonNom(nettoyerSaisieNom(e.target.value)); setErreurNom(null); }}
                        maxLength={LONGUEUR_MAX_NOM}
                        placeholder="Anonyme des profondeurs"
                        autoFocus
                    />
                    <span className="classement-compteur">{brouillonNom.length}/{LONGUEUR_MAX_NOM}</span>
                    {erreurNom === 'deja_pris' && (
                        <span className="classement-echec">Ce nom est déjà pris. Essayez-en un autre.</span>
                    )}
                    {erreurNom === 'echec' && (
                        <span className="classement-echec">Enregistrement impossible pour le moment.</span>
                    )}
                </div>
            ) : (
                nomJoueur && <p className="classement-identite">Vous jouez sous le nom de <b>{nomJoueur}</b>.</p>
            ))}

            <div className="menu-vertical">
                {peutSInscrire && editionNom ? (
                    <>
                        <button className="btn-menu btn-jouer" onClick={validerNom} disabled={!nomJoueurValide(brouillonNom) || envoiNom}>
                            {envoiNom ? 'Enregistrement…' : '✔️ Valider ce nom'}
                        </button>
                        <button className="btn-menu" onClick={() => { setEditionNom(false); setBrouillonNom(nomJoueur); }}>Annuler</button>
                    </>
                ) : (
                    <>
                        {peutSInscrire && (
                            <button className="btn-menu" onClick={() => setEditionNom(true)}>
                                {nomJoueur ? '✏️ Changer mon nom' : '🏷️ Choisir mon nom'}
                            </button>
                        )}
                        <button className="btn-menu" onClick={quitter}>Retour au Hub</button>
                    </>
                )}
            </div>
        </div>
    );
}
