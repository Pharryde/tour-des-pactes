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
        description: "Chaque Esquive réussie redirige la force de l'ennemi contre lui : il subit des dégâts égaux à l'Armure actuelle et vous vous soignez de 10% de cette Armure en PV.",
        pactesRequis: ["Pacte de la Vie", "Pacte de l'Armure", "Pacte de l'Esquive", "Pacte de la Fluidité"],
    },
    Assassin: {
        titre: "Danse des Lames",
        description: "Attaque et Précise fusionnent dans la même jauge de Combo (A-A-P-P-P compte comme un Combo x5), et la Précise bénéficie aussi des bonus de dégâts du Pacte de la Puissance Brute.",
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

// Noms de base des Pactes qui compléteraient une synergie si le joueur en équipe déjà 3 des 4
// requis — pour mettre en valeur le 4e dans l'Inventaire (uniquement s'il le possède déjà).
export function pactesManquantsPourSynergie(pactesEquipes: string[]): string[] {
    const manquants: string[] = [];
    for (const synergie of Object.keys(SYNERGIES_REGISTRY) as Synergie[]) {
        const { pactesRequis } = SYNERGIES_REGISTRY[synergie];
        const nbEquipes = pactesRequis.filter(p => aLePacte(pactesEquipes, p)).length;
        if (nbEquipes === 3) {
            const manquant = pactesRequis.find(p => !aLePacte(pactesEquipes, p));
            if (manquant) manquants.push(manquant);
        }
    }
    return manquants;
}
