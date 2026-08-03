// src/utils/combat.ts
import type { ActionType, Entite } from '../types';

export const SYMBOLES: Record<ActionType, string> = { 'A': '⚔️', 'P': '🎯', 'D': '🛡️', 'E': '💨' };

// Valeur d'Attaque affichée dans les stats : contrairement aux pactes à bonus plat (ex: Pacte de
// la Vie qui augmente directement pvMax), le Pacte de la Puissance Brute n'agit qu'au moment du
// calcul de dégâts côté moteur Rust — sans ceci, le joueur ne verrait jamais son ⚔️ bouger à
// l'écran alors que le bonus est bien actif. Même formule d'arrondi que le moteur (get_valeur_action).
//
// `actionsEnAttente` (optionnel) permet en plus un aperçu LIVE du bonus temporaire de la Synergie
// Guerrier pendant que le joueur programme son tour : chaque Défense déjà posée dans la file
// ajoute +2 aux dégâts de base affichés, avant même de valider le tour — pour que le bonus
// "temporaire" (remis à zéro chaque tour côté moteur) reste visible plutôt qu'invisible.
export function calculerAttaqueAffichee(entite: Entite, actionsEnAttente: ActionType[] = []): number {
    let base = entite.baseA;
    if (entite.synergieActive === 'Guerrier') {
        const nbDefenses = actionsEnAttente.filter(a => a === 'D').length;
        base += 2 * nbDefenses;
    }
    if (!entite.bonusDegatsAttaquePourcentage) return base;
    return Math.round(base * (1 + entite.bonusDegatsAttaquePourcentage / 100));
}

// Même principe pour la Précise : le Pacte de l'Ombre (I/II) double ses dégâts (degatsPrecisDoubles)
// et, avec la Synergie Assassin, elle hérite aussi du bonus % du Pacte de la Puissance Brute —
// deux effets "toujours actifs" (contrairement au Pacte du Combo ou du Temps, conditionnés au
// combo/à la position dans le tour) qui doivent donc être visibles directement sur 🎯.
// Même ordre d'opérations que le moteur : bonus % (get_valeur_action) puis doublage (calculer_degats).
export function calculerPreciseAffichee(entite: Entite): number {
    let valeur = entite.baseP;
    if (entite.synergieActive === 'Assassin' && entite.bonusDegatsAttaquePourcentage) {
        valeur = Math.round(valeur * (1 + entite.bonusDegatsAttaquePourcentage / 100));
    }
    if (entite.degatsPrecisDoubles) valeur *= 2;
    return valeur;
}

// Miroir de paliers_esquive_effectifs() côté moteur (combat.rs) : le Pacte du Combo amplifie
// l'écart entre paliers consécutifs à partir du 2e (jamais le 1er, qui n'est jamais un combo) —
// sans ceci l'affichage du % d'esquive resterait figé sur les paliers de base, comme pour ⚔️
// avant calculerAttaqueAffichee.
export function calculerPaliersEsquiveAffiches(entite: Entite): number[] {
    const base = entite.paliersEsquive;
    const mult = entite.comboMultiplicateur ?? 1;
    const effectifs = [base[0] ?? 0, 0, 0, 0];
    for (let i = 1; i < 4; i++) {
        const precedent = base[i - 1] ?? 0;
        const actuel = base[i] ?? precedent;
        const delta = actuel - precedent;
        const deltaAjuste = i > 1 ? Math.round(delta * mult) : delta;
        effectifs[i] = Math.min(100, effectifs[i - 1] + deltaAjuste);
    }
    return effectifs;
}

export function genererActionsMonstre(monstre: Entite): ActionType[] {
    const possibilites = monstre.actionsPossibles;
    const actions: ActionType[] = [];
    const chancePoursuiteCombo = monstre.chanceCombo !== undefined ? monstre.chanceCombo : 20;

    for (let i = 0; i < 5; i++) {
        let choix: ActionType;
        if (i === 0) {
            choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        } else {
            // Bonus spécifique : après une Défense, certains boss (Pacte de l'Armure) ont une
            // chance accrue d'enchaîner une nouvelle Défense, pour finir le tour avec plus
            // d'armure et déclencher plus souvent leurs dégâts de fin de tour.
            let chanceContinuer = chancePoursuiteCombo;
            if (actions[i - 1] === 'D' && monstre.chanceSuiteDefense) {
                chanceContinuer += monstre.chanceSuiteDefense;
            }

            const jetCombo = Math.random() * 100;
            if (jetCombo < chanceContinuer) choix = actions[i - 1];
            else choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        }
        actions.push(choix);
    }
    return actions;
}

// Tire, parmi les 5 emplacements d'actions du monstre, les indices qui seront révélés au joueur
// (les autres restent masqués derrière un '❓'). `undefined` ou >= 5 signifie "tout est visible".
export function genererIndicesVisibles(nombreVisible?: number): number[] {
    const tous = [0, 1, 2, 3, 4];
    if (nombreVisible === undefined || nombreVisible >= 5) return tous;

    const melange = [...tous];
    for (let i = melange.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    return melange.slice(0, Math.max(0, nombreVisible));
}

// Remplace toute action qui prolongerait un combo au-delà de `limiteCombo` par une alternative
// aléatoire, pour respecter le Pacte de la Fluidité imposé par l'adversaire.
export function corrigerActionsPourLimiteCombo(actions: ActionType[], limiteCombo: number): ActionType[] {
    if (limiteCombo >= 5) return actions;

    const corrigees: ActionType[] = [];
    for (const action of actions) {
        let choix = action;
        let actionsSuite = 0;
        for (let j = corrigees.length - 1; j >= 0; j--) {
            if (corrigees[j] === choix) actionsSuite++; else break;
        }

        if (actionsSuite >= limiteCombo) {
            const alternatives = (['A', 'P', 'D', 'E'] as ActionType[]).filter(a => a !== choix);
            choix = alternatives[Math.floor(Math.random() * alternatives.length)];
        }
        corrigees.push(choix);
    }
    return corrigees;
}