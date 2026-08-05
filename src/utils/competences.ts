// src/utils/competences.ts
import type { Competences } from '../types';

// Paliers d'XP fixes en dessous de 100 ; au-delà, un point tous les 100 XP. Un seul tableau de
// référence pour éviter que les fonctions ci-dessous divergent entre elles.
const PALIERS_XP = [5, 10, 25, 50, 100];

export function calculerPointsCompetence(xp: number): number {
    let pts = PALIERS_XP.filter(palier => xp >= palier).length;
    if (xp >= 100) pts += Math.floor((xp - 100) / 100);
    return pts;
}

export function calculerProchainPalier(xp: number): number {
    const palier = PALIERS_XP.find(p => xp < p);
    return palier ?? Math.floor(xp / 100) * 100 + 100;
}

export function getPalierPrecedent(xp: number): number {
    let precedent = 0;
    for (const palier of PALIERS_XP) {
        if (xp < palier) return precedent;
        precedent = palier;
    }
    return Math.floor(xp / 100) * 100;
}

export function calculerPointsDepenses(competences: Competences): number {
    return (competences.pv || 0) + (competences.atk || 0) + (competences.def || 0) + ((competences.pre || 0) * 2) + (competences.esq || 0);
}

export function calculerPointsDisponibles(xpTotal: number, competences: Competences): number {
    return calculerPointsCompetence(xpTotal) - calculerPointsDepenses(competences);
}
