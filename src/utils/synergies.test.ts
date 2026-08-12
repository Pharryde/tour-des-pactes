import { describe, expect, it } from 'vitest';
import type { Synergie } from '../types';
import { PACTES_REGISTRY } from './pactes';
import { composerEquipementSynergie, detecterSynergie, pactesManquantsPourSynergie, SYNERGIES_REGISTRY } from './synergies';

// Deux règles de conception qu'aucun code ne fait respecter tout seul : un nom de Pacte mal
// orthographié rendrait la synergie indéclenchable, et un Pacte présent dans 3 synergies casserait
// la promesse « chaque Pacte n'ouvre que deux voies ».
describe('SYNERGIES_REGISTRY — invariants de conception', () => {
    it('ne référence que des Pactes qui existent réellement', () => {
        for (const [nom, def] of Object.entries(SYNERGIES_REGISTRY)) {
            for (const pacte of def.pactesRequis) {
                expect(PACTES_REGISTRY[pacte], `${nom} → ${pacte}`).toBeDefined();
            }
        }
    });

    it('exige exactement 4 Pactes distincts par synergie', () => {
        for (const [nom, def] of Object.entries(SYNERGIES_REGISTRY)) {
            expect(def.pactesRequis, nom).toHaveLength(4);
            expect(new Set(def.pactesRequis).size, nom).toBe(4);
        }
    });

    it("n'engage jamais un même Pacte dans plus de 2 synergies", () => {
        const compte = new Map<string, number>();
        for (const def of Object.values(SYNERGIES_REGISTRY)) {
            for (const pacte of def.pactesRequis) compte.set(pacte, (compte.get(pacte) ?? 0) + 1);
        }
        for (const [pacte, n] of compte) expect(n, pacte).toBeLessThanOrEqual(2);
    });
});

// Synergie Élémentaire : elle réunit les 4 Gardiens élémentaires, qui s'ignorent complètement sans
// elle (la Brûlure sort du calcul de dégâts avant la Foudre, le Froid ne touche que l'ordre).
describe('Synergie Élémentaire', () => {
    it('se déclenche avec Foudre, Feu, Poison et Froid', () => {
        expect(detecterSynergie([
            "Pacte de la Foudre", "Pacte du Feu", "Pacte du Poison", "Pacte du Froid II",
        ])).toBe<Synergie>('Elementaire');
    });

    it("ne se déclenche pas s'il manque un élément", () => {
        expect(detecterSynergie(["Pacte de la Foudre", "Pacte du Feu", "Pacte du Poison"])).toBeNull();
    });
});

// Le bouton d'équipement rapide s'appuie entièrement là-dessus : une composition fausse
// équiperait une combinaison qui NE déclenche pas la synergie, sans rien signaler au joueur.
describe('composerEquipementSynergie', () => {
    const requisGuerrier = SYNERGIES_REGISTRY.Guerrier.pactesRequis;

    it("refuse si un des 4 Pactes n'est pas possédé", () => {
        expect(composerEquipementSynergie('Guerrier', requisGuerrier.slice(0, 3))).toBeNull();
    });

    it("refuse si aucun des 4 n'est possédé en Niveau II (l'emplacement II doit être rempli)", () => {
        expect(composerEquipementSynergie('Guerrier', [...requisGuerrier])).toBeNull();
    });

    // Les 3 emplacements de Niveau I + l'unique emplacement de Niveau II : la composition doit
    // toujours sortir exactement 3 Pactes de base et 1 en « II ».
    it('compose 3 Niveau I et 1 Niveau II', () => {
        const composition = composerEquipementSynergie('Guerrier', [...requisGuerrier, `${requisGuerrier[0]} II`]);
        expect(composition).not.toBeNull();
        expect(composition!.filter(p => p.endsWith(' II'))).toHaveLength(1);
        expect(composition!).toHaveLength(4);
        expect(detecterSynergie(composition!)).toBe('Guerrier');
    });

    // Un Pacte possédé UNIQUEMENT en Niveau II doit prendre l'emplacement II, sinon il ne rentre
    // nulle part et la composition serait invalide.
    it("réserve l'emplacement II au Pacte qui n'existe qu'à ce niveau", () => {
        const debloques = [requisGuerrier[0], requisGuerrier[1], requisGuerrier[2], `${requisGuerrier[3]} II`, `${requisGuerrier[0]} II`];
        const composition = composerEquipementSynergie('Guerrier', debloques);
        expect(composition).toContain(`${requisGuerrier[3]} II`);
        expect(detecterSynergie(composition!)).toBe('Guerrier');
    });

    it('refuse si deux Pactes exigeraient tous deux l\'unique emplacement II', () => {
        const debloques = [requisGuerrier[0], requisGuerrier[1], `${requisGuerrier[2]} II`, `${requisGuerrier[3]} II`];
        expect(composerEquipementSynergie('Guerrier', debloques)).toBeNull();
    });
});

describe('detecterSynergie', () => {
    it('ne détecte rien tant que les 4 Pactes requis ne sont pas tous équipés', () => {
        expect(detecterSynergie([])).toBeNull();
        expect(detecterSynergie([
            "Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute",
        ])).toBeNull();
    });

    it('détecte la synergie Guerrier avec ses 4 Pactes de Niveau I', () => {
        expect(detecterSynergie([
            "Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute", "Pacte du Temps",
        ])).toBe('Guerrier');
    });

    it("accepte indifféremment le Niveau I ou le Niveau II d'un Pacte requis", () => {
        expect(detecterSynergie([
            "Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute", "Pacte du Temps II",
        ])).toBe('Guerrier');
    });

    // Garde-fou contre l'ajout d'une 5e synergie dont les Pactes chevaucheraient une existante :
    // chaque combinaison doit rester non ambiguë, sinon `find()` renverrait la mauvaise.
    it('identifie sans ambiguïté chacune des synergies du registre', () => {
        for (const [nom, def] of Object.entries(SYNERGIES_REGISTRY)) {
            expect(detecterSynergie(def.pactesRequis)).toBe(nom);
        }
    });
});

describe('pactesManquantsPourSynergie', () => {
    it('désigne le 4e Pacte quand 3 des 4 sont équipés', () => {
        expect(pactesManquantsPourSynergie([
            "Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute",
        ])).toEqual(["Pacte du Temps"]);
    });

    it('ne suggère plus rien une fois la synergie complète', () => {
        expect(pactesManquantsPourSynergie([
            "Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute", "Pacte du Temps",
        ])).toEqual([]);
    });

    it('ne suggère rien en dessous de 3 Pactes équipés', () => {
        expect(pactesManquantsPourSynergie(["Pacte de la Vie", "Pacte de l'Armure"])).toEqual([]);
    });

    it('tient compte du Niveau II pour juger un Pacte déjà équipé', () => {
        expect(pactesManquantsPourSynergie([
            "Pacte de la Vie", "Pacte de l'Armure", "Pacte de la Puissance Brute II",
        ])).toEqual(["Pacte du Temps"]);
    });
});
