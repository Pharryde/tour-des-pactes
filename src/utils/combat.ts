// src/utils/combat.ts
import type { ActionType, Entite } from '../types';

export const SYMBOLES: Record<ActionType, string> = { 'A': '⚔️', 'P': '🎯', 'D': '🛡️', 'E': '💨' };

export function genererActionsMonstre(monstre: Entite): ActionType[] {
    const possibilites = monstre.actionsPossibles;
    const actions: ActionType[] = [];
    const chancePoursuiteCombo = monstre.chanceCombo !== undefined ? monstre.chanceCombo : 20;

    for (let i = 0; i < 5; i++) {
        let choix: ActionType;
        if (i === 0) {
            choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        } else {
            const jetCombo = Math.random() * 100;
            if (jetCombo < chancePoursuiteCombo) choix = actions[i - 1];
            else choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        }
        actions.push(choix);
    }
    return actions;
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