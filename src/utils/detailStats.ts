// src/utils/detailStats.ts
// Détail du calcul des stats de combat affichées au joueur (⚔️/🎯/🛡️), pour le tooltip au survol.
// Reconstruit chaque contribution (base, arbre de compétence, repos, pactes, synergies) plutôt que
// de se contenter d'afficher le total : baseA/baseP/baseD n'accumulent qu'une seule valeur finale,
// sans garder la trace de qui a ajouté quoi. Comme aucun Pacte ne modifie baseA/baseP directement
// (seuls Puissance Brute et l'Ombre passent par un multiplicateur, calculé au moment du combat),
// tout ce qui dépasse (base + arbre) sur ces deux stats vient forcément de la Zone de Repos.
import type { ActionType, Competences, Entite } from '../types';
import { calculerAttaqueAffichee, calculerPreciseAffichee, cibleSeraArmee } from './combat';

const BASE_ATTAQUE = 10;
const BASE_PRECISE = 4;
const BASE_DEFENSE = 10;

function aLePacte(pactesEquipes: string[], nomBase: string): boolean {
    return pactesEquipes.includes(nomBase) || pactesEquipes.includes(nomBase + " II");
}

// Part convertie en brûlure/poison, en pourcentage lisible (0.5 -> « 50% », 1 -> « 100% »).
function pourcentage(multiplicateur: number): string {
    return `${Math.round(multiplicateur * 100)}%`;
}

// Pacte de la Foudre : la seule contribution qui dépend de la CIBLE. On l'annonce dans les deux
// cas — actif, pour justifier le chiffre ; en veille, pour que le joueur sache quoi provoquer.
function ligneFoudre(entite: Entite, cible?: Entite): string[] {
    if (!entite.multiplicateurDegatsSiArmure) return [];
    return cibleSeraArmee(cible)
        ? [`Pacte de la Foudre (cible armée) : x${entite.multiplicateurDegatsSiArmure}`]
        : [`Pacte de la Foudre : x${entite.multiplicateurDegatsSiArmure} dès que la cible porte de l'Armure`];
}

// Sans cette ligne, le détail enchaînait « Pacte du Feu : 50% » puis « = 3 de brûlure » à partir
// d'une base de 10 : la reconstruction ne tombait plus juste, et rien n'expliquait pourquoi.
function ligneResistance(part: number | undefined, element: 'feu' | 'poison'): string[] {
    if (part === undefined) return [];
    if (part === 0) return [`Cible insensible au ${element} : dose absorbée`];
    return [`Cible résistante au ${element} : ${pourcentage(part)}`];
}

export function detailAttaque(entite: Entite, competences: Competences, actionsEnAttente: ActionType[], cible?: Entite): string[] {
    const lignes = [`Base : ${BASE_ATTAQUE}`];
    if (competences.atk) lignes.push(`Arbre de compétence (Force Brute) : +${competences.atk}`);

    const bonusRepos = entite.baseA - BASE_ATTAQUE - (competences.atk || 0);
    if (bonusRepos > 0) lignes.push(`Zone de Repos : +${bonusRepos}`);

    if (entite.synergieActive === 'Guerrier') {
        const nbDefenses = actionsEnAttente.filter(a => a === 'D').length;
        if (nbDefenses > 0) lignes.push(`Synergie Guerrier (Défense en attente) : +${2 * nbDefenses}`);
    }

    if (entite.bonusDegatsAttaquePourcentage) {
        lignes.push(`Pacte de la Puissance Brute : x${(1 + entite.bonusDegatsAttaquePourcentage / 100).toFixed(2).replace(/\.?0+$/, '')}`);
    }

    // La Foudre n'entre dans la brûlure que via la Synergie Élémentaire — sinon elle ne concerne
    // que les dégâts directs, et ne doit donc pas apparaître sous un Pacte du Feu.
    const foudreCompte = !entite.multiplicateurBrulure || entite.synergieActive === 'Elementaire';
    if (foudreCompte) lignes.push(...ligneFoudre(entite, cible));

    if (entite.multiplicateurBrulure) {
        lignes.push(`Pacte du Feu (converti en Brûlure) : ${pourcentage(entite.multiplicateurBrulure)}`);
        lignes.push(...ligneResistance(cible?.partBrulureSubie, 'feu'));
    }

    lignes.push(`= ${calculerAttaqueAffichee(entite, actionsEnAttente, cible)}${entite.multiplicateurBrulure ? ' de brûlure' : ''}`);
    return lignes;
}

export function detailPrecise(entite: Entite, competences: Competences, cible?: Entite): string[] {
    const lignes = [`Base : ${BASE_PRECISE}`];
    if (competences.pre) lignes.push(`Arbre de compétence (Œil de Faucon) : +${competences.pre}`);

    const bonusRepos = entite.baseP - BASE_PRECISE - (competences.pre || 0);
    if (bonusRepos > 0) lignes.push(`Zone de Repos : +${bonusRepos}`);

    if (entite.synergieActive === 'Assassin' && entite.bonusDegatsAttaquePourcentage) {
        lignes.push(`Synergie Assassin (Pacte de la Puissance Brute) : x${(1 + entite.bonusDegatsAttaquePourcentage / 100).toFixed(2).replace(/\.?0+$/, '')}`);
    }
    // Une Précise convertie en poison ignore la Foudre (elle vit dans le calcul de dégâts, dont
    // l'action convertie ressort à zéro) mais garde bien le doublage de l'Ombre.
    if (entite.multiplicateurPoison) {
        lignes.push(`Pacte du Poison (converti en Poison) : ${pourcentage(entite.multiplicateurPoison)}`);
        if (entite.degatsPrecisDoubles) lignes.push(`Pacte de l'Ombre (Dégâts Précis) : x2`);
        lignes.push(...ligneResistance(cible?.partPoisonSubi, 'poison'));
        lignes.push(`= ${calculerPreciseAffichee(entite, cible)} de poison`);
        return lignes;
    }

    lignes.push(...ligneFoudre(entite, cible));
    if (entite.degatsPrecisDoubles) lignes.push(`Pacte de l'Ombre (Dégâts Précis) : x2`);

    lignes.push(`= ${calculerPreciseAffichee(entite, cible)}`);
    return lignes;
}

export function detailDefense(entite: Entite, competences: Competences, pactesEquipes: string[]): string[] {
    const lignes = [`Base : ${BASE_DEFENSE}`];
    if (competences.def) lignes.push(`Arbre de compétence (Peau de Fer) : +${competences.def}`);

    const bonusArmure = aLePacte(pactesEquipes, "Pacte de l'Armure") ? 5 : 0;
    if (bonusArmure) lignes.push(`Pacte de l'Armure : +${bonusArmure}`);

    const bonusRepos = entite.baseD - BASE_DEFENSE - (competences.def || 0) - bonusArmure;
    if (bonusRepos > 0) lignes.push(`Zone de Repos : +${bonusRepos}`);

    lignes.push(`= ${entite.baseD}`);
    return lignes;
}
