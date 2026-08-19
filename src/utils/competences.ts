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

// Rendement DÉGRESSIF de la compétence Réflexes : les premiers points valent plus que les suivants.
// [nombre de points de la tranche, gain par point]. Au-delà de la dernière tranche, un point de plus
// n'apporte rien — le total y vaut déjà +50%, ce qui sature les trois paliers d'esquive (50/75/100).
const TRANCHES_ESQUIVE: [number, number][] = [[2, 5], [4, 4], [8, 3]];

// Nombre de points au-delà duquel Réflexes ne rapporte plus rien.
export const POINTS_ESQUIVE_MAX = TRANCHES_ESQUIVE.reduce((n, [taille]) => n + taille, 0);

/** Bonus d'esquive total (en points de %) accordé par N points investis dans Réflexes. */
export function bonusEsquive(points: number): number {
    let restants = Math.max(0, points);
    let total = 0;
    for (const [taille, gain] of TRANCHES_ESQUIVE) {
        const pris = Math.min(restants, taille);
        total += pris * gain;
        restants -= pris;
        if (restants <= 0) break;
    }
    return total;
}

/** Ce que rapporterait le PROCHAIN point investi. 0 une fois la dernière tranche épuisée. */
export function gainProchainPointEsquive(points: number): number {
    return bonusEsquive(points + 1) - bonusEsquive(points);
}
