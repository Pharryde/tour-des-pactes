// src/utils/logs.ts

// NOTE : on relit ces logs directement depuis le localStorage (et non depuis l'état React
// "historiqueLogs") car la résolution d'un tour de combat est asynchrone (CombatArene attend
// entre chaque étape). La fonction qui gère la défaite peut donc s'exécuter avec une closure
// React obsolète, alors que le localStorage, lui, est toujours écrit de façon synchrone par
// useLocalStorage à chaque mise à jour.
export function lireHistoriqueLogsPersistant(): string[] {
    try {
        return JSON.parse(window.localStorage.getItem('tdp_historique_logs') || '[]');
    } catch (error) {
        console.error("Erreur lecture logs mort", error);
        return [];
    }
}

export function extraireLogsDuDernierTour(logs: string[]): string[] {
    const indexDepuisLaFin = [...logs].reverse().findIndex(l => l.includes('--- TOUR'));
    if (indexDepuisLaFin === -1) return logs;
    return logs.slice(logs.length - 1 - indexDepuisLaFin);
}
