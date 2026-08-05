import { describe, expect, it } from 'vitest';
import { detecterSynergie, pactesManquantsPourSynergie, SYNERGIES_REGISTRY } from './synergies';

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
