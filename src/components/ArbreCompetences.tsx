import { useState } from 'react';
import type { Competences } from '../types';
import { calculerPointsCompetence, calculerProchainPalier, getPalierPrecedent, calculerPointsDepenses, bonusEsquive, gainProchainPointEsquive, POINTS_ESQUIVE_MAX } from '../utils/competences';
import { SpriteAnime } from './SpriteAnime';
import { ANIMATION_FORGE } from '../utils/animationsForge';

const DUREE_ANIMATION_FORGE_MS = 2000;

interface Props {
    xpTotal: number;
    competences: Competences;
    setCompetences: (c: Competences) => void;
    monstresTues: number;
    onRetour: () => void;
}

interface LigneCompProps {
    nom: string;
    icone: string;
    cout: number;
    effet: string;
    niveau: number;
    ptsDispo: number;
    // Compétence arrivée au bout de sa progression : le bouton reste visible mais inactif, pour que
    // le plafond se voie plutôt que de laisser dépenser un point qui ne rapporterait rien.
    plusDesactive?: boolean;
    onModifier: (direction: 1 | -1) => void;
}

function LigneComp({ nom, icone, cout, effet, niveau, ptsDispo, plusDesactive, onModifier }: LigneCompProps) {
    return (
        <div className="ligne-comp">
            <div className="ligne-comp-info">
                <strong className="ligne-comp-nom">{icone} {nom} <span className="ligne-comp-niveau">(Nv. {niveau})</span></strong>
                <span className="ligne-comp-effet">{effet} <span className="ligne-comp-cout">(Coût: {cout} Point{cout > 1 ? 's' : ''})</span></span>
            </div>
            <div className="ligne-comp-actions">
                <button className="ligne-comp-btn" onClick={() => onModifier(-1)} disabled={niveau === 0}>-</button>
                <button className="ligne-comp-btn ligne-comp-btn--plus" onClick={() => onModifier(1)} disabled={ptsDispo < cout || plusDesactive}>+</button>
            </div>
        </div>
    );
}

export function ArbreCompetences({ xpTotal, competences, setCompetences, monstresTues, onRetour }: Props) {
    // Brouillon local : les changements ne sont propagés (et persistés) qu'au clic sur "Valider",
    // pour que le joueur puisse composer sa répartition avant de la confirmer.
    const [brouillon, setBrouillon] = useState<Competences>(competences);
    const [forgeActive, setForgeActive] = useState(false);
    // Suivre les manipulations, et pas seulement l'écart avec l'état validé : après une
    // réinitialisation, un joueur qui remet exactement la même répartition retombe sur un brouillon
    // identique au validé. Sans ce drapeau, "Valider" restait grisé et l'écran semblait bloqué —
    // alors que la répartition affichée était bien celle en vigueur.
    const [manipuleDepuisValidation, setManipuleDepuisValidation] = useState(false);

    const ptsTotal = calculerPointsCompetence(xpTotal);
    const ptsDepenses = calculerPointsDepenses(brouillon);
    const ptsDispo = ptsTotal - ptsDepenses;
    const aChangements = JSON.stringify(brouillon) !== JSON.stringify(competences);

    // Logique pour la barre de progression d'XP
    const prochainPalier = calculerProchainPalier(xpTotal);
    const palierPrecedent = getPalierPrecedent(xpTotal);
    const xpRequisePourPalier = prochainPalier - palierPrecedent;
    const xpAcquiseDansPalier = xpTotal - palierPrecedent;
    const pourcentageProgress = (xpAcquiseDansPalier / xpRequisePourPalier) * 100;

    // Ajustement d'état pendant le rendu plutôt qu'un setState dans un useEffect : la condition
    // redevient fausse d'elle-même dès que le brouillon est remis à zéro (ptsDepenses retombe à 0).
    if (ptsDispo < 0) {
        setBrouillon({ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
    }

    const modifier = (stat: keyof Competences, cout: number, direction: 1 | -1) => {
        if (direction === 1 && ptsDispo >= cout) {
            setBrouillon({ ...brouillon, [stat]: (brouillon[stat] || 0) + 1 });
            setManipuleDepuisValidation(true);
        } else if (direction === -1 && (brouillon[stat] || 0) > 0) {
            setBrouillon({ ...brouillon, [stat]: (brouillon[stat] || 0) - 1 });
            setManipuleDepuisValidation(true);
        }
    };

    const reinitialiser = () => {
        setBrouillon({ pv: 0, atk: 0, def: 0, pre: 0, esq: 0 });
        setManipuleDepuisValidation(true);
    };

    const valider = () => {
        setCompetences(brouillon);
        setManipuleDepuisValidation(false);
        setForgeActive(true);
        setTimeout(() => setForgeActive(false), DUREE_ANIMATION_FORGE_MS);
    };

    return (
        <div className="ecran arbre-ecran">
            {forgeActive && (
                <div className="forge-anim-cotes" aria-hidden="true">
                    <SpriteAnime definition={ANIMATION_FORGE} />
                    <SpriteAnime definition={ANIMATION_FORGE} miroir />
                </div>
            )}

            <h1 className="arbre-titre">✨ Éclats d'Âme</h1>
            <p className="arbre-soustitre">Vous avez vaincu {monstresTues} monstre(s). Utilisez leur essence pour vous renforcer.</p>

            {/* BARRE DE PROGRESSION XP */}
            <div className="xp-barre-box">
                <div className="xp-barre-header">
                    <span>Progression (XP)</span>
                    <span>{xpTotal} / {prochainPalier} XP</span>
                </div>
                <div className="xp-barre-piste">
                    <div className="xp-barre-remplissage" style={{ width: `${pourcentageProgress}%` }}></div>
                </div>
                <div className="xp-barre-footer">
                    Prochain Point de Compétence débloqué à {prochainPalier} XP
                </div>
            </div>

            {/* COMPTEUR DE POINTS DE COMPÉTENCE */}
            <div className="points-dispo-box">
                <span className="points-dispo-valeur">Points Disponibles : <strong>{ptsDispo}</strong> / {ptsTotal}</span>
            </div>

            {forgeActive && (
                <div className="forge-anim-mobile" aria-hidden="true">
                    <SpriteAnime definition={ANIMATION_FORGE} />
                </div>
            )}

            <div className="arbre-competences-liste">
                <LigneComp icone="❤️" nom="Vitalité" cout={1} effet="+10 PV Max par niveau" niveau={brouillon.pv || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('pv', 1, dir)} />
                <LigneComp icone="🛡️" nom="Peau de Fer" cout={1} effet="+1 Défense de base" niveau={brouillon.def || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('def', 1, dir)} />
                <LigneComp icone="⚔️" nom="Force Brute" cout={1} effet="+1 Attaque de base" niveau={brouillon.atk || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('atk', 1, dir)} />
                <LigneComp icone="🎯" nom="Œil de Faucon" cout={2} effet="+1 Précision de base" niveau={brouillon.pre || 0} ptsDispo={ptsDispo} onModifier={(dir) => modifier('pre', 2, dir)} />
                {/* Rendement dégressif : le libellé annonce ce que rapporte le PROCHAIN point, pas une
                    valeur fixe — sinon l'arbre promettrait +5% jusqu'au dernier point. */}
                <LigneComp
                    icone="💨" nom="Réflexes" cout={1}
                    effet={gainProchainPointEsquive(brouillon.esq || 0) > 0
                        ? `+${gainProchainPointEsquive(brouillon.esq || 0)}% d'Esquive max au prochain point (total : +${bonusEsquive(brouillon.esq || 0)}%)`
                        : `+${bonusEsquive(brouillon.esq || 0)}% d'Esquive max — maîtrise complète`}
                    niveau={brouillon.esq || 0}
                    ptsDispo={ptsDispo}
                    plusDesactive={(brouillon.esq || 0) >= POINTS_ESQUIVE_MAX}
                    onModifier={(dir) => modifier('esq', 1, dir)}
                />
            </div>

            <div className="arbre-footer">
                {/* Sur mobile, le compteur de points (et donc le forgeron du haut) est souvent hors
                    de vue au moment de valider : une seconde forge s'allume ici, juste sous le
                    pouce, pour que la confirmation reste visible sans avoir à remonter. */}
                {forgeActive && (
                    <div className="forge-anim-validation" aria-hidden="true">
                        <SpriteAnime definition={ANIMATION_FORGE} />
                    </div>
                )}

                <button onClick={reinitialiser} className="btn-menu btn-danger">
                    🔄 Réinitialiser l'Arbre
                </button>
                <button onClick={valider} disabled={!manipuleDepuisValidation && !aChangements} className="btn-menu btn-jouer">
                    ⚒️ Valider
                </button>
                <button onClick={onRetour} className="btn-menu">
                    🔙 Retour au Hub
                </button>
            </div>
        </div>
    );
}
