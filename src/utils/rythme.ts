// src/utils/rythme.ts
// Cadence des temporisations de combat. Toute attente doit passer par ici pour respecter le réglage
// de Vitesse (⚡) choisi par le joueur : une durée codée en dur reste PLEINE en x4, donc
// proportionnellement quatre fois plus longue que tout le reste du tour. C'était exactement le
// défaut des transitions de fin de combat de Gardien, d'où l'impression d'écran figé après un boss.

// Temporisation entre la mort d'un Gardien et le basculement d'écran (Zone de Repos, Sortie de la
// Tour...) : juste le temps de lire la ligne de log qui vient d'être ajoutée (Pacte arraché,
// progression automatique...). Elle s'AJOUTE à la pause que CombatArene sert déjà sur le cadavre du
// boss, d'où une valeur volontairement courte.
export const DELAI_TRANSITION_MS = 900;

export function calculerDelai(baseMs: number, vitesse: number): number {
    // Une vitesse absente ou absurde (0, négative, NaN — valeur persistée corrompue) ne doit jamais
    // produire une attente infinie : on retombe sur la cadence normale.
    const facteur = Number.isFinite(vitesse) && vitesse > 0 ? vitesse : 1;
    return Math.round(baseMs / facteur);
}
