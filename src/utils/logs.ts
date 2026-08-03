// src/utils/logs.ts

// NOTE : on relit ces valeurs directement depuis le localStorage (et non depuis l'état React) car
// la résolution d'un tour de combat est asynchrone (CombatArene attend entre chaque étape) : le
// callback onFinDeCombat qu'elle appelle reste lié à la closure React qui existait au moment du
// clic sur "Valider", donc potentiellement obsolète vis-à-vis des toutes dernières mises à jour
// (dégâts du tour fatal, log de mort...). Le localStorage, lui, est toujours écrit de façon
// synchrone par useLocalStorage à chaque mise à jour, donc toujours à jour au moment de la lecture.
export function lireValeurPersistante<T>(cle: string, defaut: T): T {
    try {
        const item = window.localStorage.getItem(cle);
        return item ? JSON.parse(item) : defaut;
    } catch (error) {
        console.error(`Erreur lecture localStorage (${cle})`, error);
        return defaut;
    }
}

export function lireHistoriqueLogsPersistant(): string[] {
    return lireValeurPersistante('tdp_historique_logs', []);
}

export function extraireLogsDuDernierTour(logs: string[]): string[] {
    const indexDepuisLaFin = [...logs].reverse().findIndex(l => l.includes('--- TOUR'));
    if (indexDepuisLaFin === -1) return logs;
    return logs.slice(logs.length - 1 - indexDepuisLaFin);
}
