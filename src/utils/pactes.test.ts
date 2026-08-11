import { describe, expect, it } from 'vitest';
import type { Entite } from '../types';
import {
    PACTES_REGISTRY,
    appliquerPactesSurJoueur,
    calculerGainPvMaxRepos,
    calculerSoinRepos,
    peutEquiperPacte,
} from './pactes';

function creerHeros(surcharges: Partial<Entite> = {}): Entite {
    return {
        nom: 'Héros',
        pv: 100,
        pvMax: 100,
        armure: 0,
        nivEsquive: 0,
        baseA: 10,
        baseP: 4,
        baseD: 10,
        paliersEsquive: [0, 50, 75, 100],
        actionsPossibles: ['A', 'P', 'D', 'E'],
        ...surcharges,
    };
}

// Un étage sans entrée correspondante dans le registre donnerait un Pacte « (Effet inconnu) » qui
// ne fait rien : le bug ne casse rien de visible, d'où ce garde-fou. Les noms doivent rester alignés
// sur les `id_pacte` de boss_data.rs (et leur variante « II »).
describe('PACTES_REGISTRY', () => {
    const etagesAttendus = [
        'Pacte de la Vie', "Pacte de l'Armure", "Pacte de l'Esquive", 'Pacte du Combo',
        "Pacte de l'Ombre", 'Pacte du Temps', 'Pacte de la Fluidité', 'Pacte de la Puissance Brute',
        'Pacte du Froid', 'Pacte de la Foudre', 'Pacte du Feu', 'Pacte du Poison',
    ];

    it('couvre les deux niveaux de chaque étage de la Tour', () => {
        for (const nom of etagesAttendus) {
            expect(PACTES_REGISTRY[nom], nom).toBeDefined();
            expect(PACTES_REGISTRY[`${nom} II`], `${nom} II`).toBeDefined();
        }
    });

    it('donne une description et un effet à chaque entrée', () => {
        for (const [nom, def] of Object.entries(PACTES_REGISTRY)) {
            expect(def.desc, nom).toBeTruthy();
            expect(typeof def.appliquer, nom).toBe('function');
        }
    });
});

// Les 4 Pactes des nouveaux étages posent des champs miroirs du moteur Rust : une faute de frappe
// passerait la compilation et le bonus serait simplement ignoré en jeu.
describe('Pactes du Froid / Foudre / Feu / Poison', () => {
    it('retourne contre les monstres la mécanique de chaque Gardien', () => {
        const froid = appliquerPactesSurJoueur(creerHeros(), ['Pacte du Froid II']);
        expect(froid.actionsResolutionInversee).toBe(2);
        expect(froid.actionsGelees).toBe(1);

        expect(appliquerPactesSurJoueur(creerHeros(), ['Pacte de la Foudre']).multiplicateurDegatsSiArmure).toBe(1.5);
        expect(appliquerPactesSurJoueur(creerHeros(), ['Pacte de la Foudre II']).multiplicateurDegatsSiArmure).toBe(2);
        expect(appliquerPactesSurJoueur(creerHeros(), ['Pacte du Feu']).degatsBrulure).toBe(12);
        // Le poison vaut les dégâts Précis : le Pacte porte le multiplicateur, pas un montant fixe.
        expect(appliquerPactesSurJoueur(creerHeros(), ['Pacte du Poison']).multiplicateurPoison).toBe(1);
        expect(appliquerPactesSurJoueur(creerHeros(), ['Pacte du Poison II']).multiplicateurPoison).toBe(2);
    });

    // Le Niveau I du Froid ne gèle rien : c'est la marche de progression vers le Niveau II.
    it('ne gèle aucune action au Niveau I du Froid', () => {
        expect(appliquerPactesSurJoueur(creerHeros(), ['Pacte du Froid']).actionsGelees).toBeUndefined();
    });
});

describe('appliquerPactesSurJoueur', () => {
    it('applique le bonus de PV du Pacte de la Vie et remet les PV au maximum', () => {
        const resultat = appliquerPactesSurJoueur(creerHeros({ pv: 40 }), ['Pacte de la Vie']);
        expect(resultat.pvMax).toBe(110);
        expect(resultat.pv).toBe(110);
    });

    it("ajoute la Défense du Pacte de l'Armure", () => {
        expect(appliquerPactesSurJoueur(creerHeros(), ["Pacte de l'Armure"]).baseD).toBe(15);
    });

    // Le palier 0 ne doit jamais bouger (aucune Esquive enchaînée = aucune chance d'esquiver),
    // et un palier ne peut pas dépasser 100 %.
    it("relève les paliers d'Esquive sans toucher le palier 0 ni dépasser 100", () => {
        const resultat = appliquerPactesSurJoueur(creerHeros(), ["Pacte de l'Esquive"]);
        expect(resultat.paliersEsquive).toEqual([0, 60, 85, 100]);
    });

    it('cumule plusieurs Pactes équipés', () => {
        const resultat = appliquerPactesSurJoueur(creerHeros(), ['Pacte de la Vie', "Pacte de l'Armure"]);
        expect(resultat.pvMax).toBe(110);
        expect(resultat.baseD).toBe(15);
    });

    it("ne modifie pas l'entité d'origine", () => {
        const original = creerHeros();
        appliquerPactesSurJoueur(original, ['Pacte de la Vie', "Pacte de l'Esquive"]);
        expect(original.pvMax).toBe(100);
        expect(original.paliersEsquive).toEqual([0, 50, 75, 100]);
    });
});

describe('peutEquiperPacte', () => {
    it('autorise un Pacte déjà équipé (déséquipement)', () => {
        expect(peutEquiperPacte('Pacte de la Vie', ['Pacte de la Vie']).valide).toBe(true);
    });

    it('refuse de cumuler le Niveau I et le Niveau II du même Pacte', () => {
        expect(peutEquiperPacte('Pacte de la Vie II', ['Pacte de la Vie']).valide).toBe(false);
        expect(peutEquiperPacte('Pacte de la Vie', ['Pacte de la Vie II']).valide).toBe(false);
    });

    it('plafonne à 3 Pactes de Niveau I', () => {
        const trois = ['Pacte de la Vie', "Pacte de l'Armure", "Pacte de l'Esquive"];
        expect(peutEquiperPacte('Pacte du Temps', trois).valide).toBe(false);
    });

    it('plafonne à 1 Pacte de Niveau II', () => {
        expect(peutEquiperPacte('Pacte du Temps II', ['Pacte de la Vie II']).valide).toBe(false);
    });

    it('laisse équiper un Niveau II même avec 3 Niveaux I déjà équipés', () => {
        const trois = ['Pacte de la Vie', "Pacte de l'Armure", "Pacte de l'Esquive"];
        expect(peutEquiperPacte('Pacte du Temps II', trois).valide).toBe(true);
    });
});

describe('bonus de la Zone de Repos', () => {
    it('soigne la moitié des PV max, majorés par le Pacte de la Vie', () => {
        expect(calculerSoinRepos(100, [])).toBe(50);
        expect(calculerSoinRepos(100, ['Pacte de la Vie'])).toBe(55);
    });

    it('applique le même multiplicateur au gain de PV max', () => {
        expect(calculerGainPvMaxRepos([])).toBe(10);
        expect(calculerGainPvMaxRepos(['Pacte de la Vie'])).toBe(11);
    });

    // Deux Pactes porteurs d'un bonus de repos ne doivent pas empiler leurs multiplicateurs.
    it('ne cumule pas les multiplicateurs de repos', () => {
        expect(calculerSoinRepos(100, ['Pacte de la Vie', 'Pacte de la Vie II'])).toBe(55);
    });
});
