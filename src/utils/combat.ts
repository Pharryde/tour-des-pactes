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
            let jetCombo = Math.random() * 100;
            if (jetCombo < chancePoursuiteCombo) choix = actions[i - 1];
            else choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        }
        actions.push(choix);
    }
    return actions;
}