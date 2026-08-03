// src/utils/synergies.ts
import type { Synergie } from '../types';

interface SynergieDef {
    titre: string;
    description: string;
    // Noms de base des 4 Pactes requis (peu importe leur niveau I/II) pour révéler la synergie.
    pactesRequis: string[];
}

// ============================================================================
// SOURCE DE VÉRITÉ UNIQUE POUR LES SYNERGIES CACHÉES
// Equiper les 4 Pactes requis (à n'importe quel niveau) au lancement d'une run révèle le secret.
// Chaque Pacte n'intervient que dans 2 synergies, et le nombre d'emplacements d'équipement (3
// Niveau I + 1 Niveau II = 4 max) garantit qu'une seule synergie peut être active à la fois.
// ============================================================================
export const SYNERGIES_REGISTRY: Record<Synergie, SynergieDef> = {
    Guerrier: {
        titre: "Posture du Seigneur de Guerre",
        description: "Chaque Attaque octroie +2 Armure. Chaque Défense augmente vos dégâts de base de +2 pour le reste du tour.",
        pactesRequis: ["Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute", "Pacte du Temps"],
    },
    Ninja: {
        titre: "Frappe Insaisissable",
        description: "Chaque Esquive réussie, la prochaine Attaque Précise du même tour est un Coup Critique (ajout multiplicateur x2).",
        pactesRequis: ["Pacte de l'Esquive", "Pacte de l'Ombre", "Pacte du Combo", "Pacte de la Fluidité"],
    },
    Tank: {
        titre: "Riposte Fluide",
        description: "Chaque fois que vous réussissez une Esquive (E), l'ennemi subit des dégâts égaux à votre Armure actuelle et vous récupérez 10% de cette Armure en PV.",
        pactesRequis: ["Pacte de la Vie", "Pacte de l'Armure", "Pacte de l'Esquive", "Pacte de la Fluidité"],
    },
    Assassin: {
        titre: "Danse des Lames",
        description: "Attaque (A) et Précise (P) fusionnent dans la même jauge de Combo (A-A-P-P-P compte comme un Combo x5), et la Précise bénéficie aussi des bonus de dégâts du Pacte de la Puissance Brute.",
        pactesRequis: ["Pacte de la Puissance Brute", "Pacte du Temps", "Pacte de l'Ombre", "Pacte du Combo"],
    },
};

function aLePacte(pactesEquipes: string[], nomBase: string): boolean {
    return pactesEquipes.includes(nomBase) || pactesEquipes.includes(nomBase + " II");
}

export function detecterSynergie(pactesEquipes: string[]): Synergie | null {
    const synergies = Object.keys(SYNERGIES_REGISTRY) as Synergie[];
    return synergies.find(s => SYNERGIES_REGISTRY[s].pactesRequis.every(p => aLePacte(pactesEquipes, p))) ?? null;
}
