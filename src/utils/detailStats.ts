// src/utils/detailStats.ts
// Détail du calcul des stats de combat affichées au joueur (⚔️/🎯/🛡️), pour le tooltip au survol.
// Reconstruit chaque contribution (base, arbre de compétence, repos, pactes, synergies) plutôt que
// de se contenter d'afficher le total : baseA/baseP/baseD n'accumulent qu'une seule valeur finale,
// sans garder la trace de qui a ajouté quoi. Comme aucun Pacte ne modifie baseA/baseP directement
// (seuls Puissance Brute et l'Ombre passent par un multiplicateur, calculé au moment du combat),
// tout ce qui dépasse (base + arbre) sur ces deux stats vient forcément de la Zone de Repos.
import type { ActionType, Competences, Entite } from '../types';
import { calculerAttaqueAffichee, calculerPreciseAffichee } from './combat';

const BASE_ATTAQUE = 10;
const BASE_PRECISE = 4;
const BASE_DEFENSE = 10;

function aLePacte(pactesEquipes: string[], nomBase: string): boolean {
    return pactesEquipes.includes(nomBase) || pactesEquipes.includes(nomBase + " II");
}

export function detailAttaque(entite: Entite, competences: Competences, actionsEnAttente: ActionType[]): string[] {
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

    lignes.push(`= ${calculerAttaqueAffichee(entite, actionsEnAttente)}`);
    return lignes;
}

export function detailPrecise(entite: Entite, competences: Competences): string[] {
    const lignes = [`Base : ${BASE_PRECISE}`];
    if (competences.pre) lignes.push(`Arbre de compétence (Œil de Faucon) : +${competences.pre}`);

    const bonusRepos = entite.baseP - BASE_PRECISE - (competences.pre || 0);
    if (bonusRepos > 0) lignes.push(`Zone de Repos : +${bonusRepos}`);

    if (entite.synergieActive === 'Assassin' && entite.bonusDegatsAttaquePourcentage) {
        lignes.push(`Synergie Assassin (Pacte de la Puissance Brute) : x${(1 + entite.bonusDegatsAttaquePourcentage / 100).toFixed(2).replace(/\.?0+$/, '')}`);
    }
    if (entite.degatsPrecisDoubles) lignes.push(`Pacte de l'Ombre (Dégâts Précis) : x2`);

    lignes.push(`= ${calculerPreciseAffichee(entite)}`);
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
