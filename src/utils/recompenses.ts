// src/utils/recompenses.ts
import type { StructureEtage, TypeMonstre } from '../types';

export interface RecompenseCombat {
    gainXp: number;
    typeMonstre: TypeMonstre;
}

export function calculerRecompenseCombat(
    etageActuel: StructureEtage | undefined,
    indexSalle: number,
    enCombatPacte: boolean,
    typeCombatPacte: 'lvl1' | 'lvl2',
    pactesEquipes: string[]
): RecompenseCombat {
    const estCombatDeGardien = indexSalle === (etageActuel?.monstres?.length || 0);
    if (!estCombatDeGardien) return { gainXp: 1, typeMonstre: 'normal' };

    if (enCombatPacte) {
        return typeCombatPacte === 'lvl2'
            ? { gainXp: 8, typeMonstre: 'final' }
            : { gainXp: 4, typeMonstre: 'evolue' };
    }

    const nomPacteCourant = etageActuel?.idPacte || "Pacte Inconnu";
    const aLvl1Equipe = pactesEquipes.includes(nomPacteCourant);
    const aLvl2Equipe = pactesEquipes.includes(nomPacteCourant + " II");

    if (aLvl2Equipe) return { gainXp: 8, typeMonstre: 'final' };
    if (aLvl1Equipe) return { gainXp: 4, typeMonstre: 'evolue' };
    return { gainXp: 2, typeMonstre: 'boss' };
}
