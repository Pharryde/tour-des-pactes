import { determinerNomPacte } from './pactes';

export type NiveauBoss = 1 | 2 | 3;

export function evaluerNiveauBoss(nomEtage: string, pactesEquipes: string[]): NiveauBoss {
    const nomPacteBase = determinerNomPacte(nomEtage);
    const nomPacteLvl2 = nomPacteBase + " II";

    // Règle 1 : Pacte de Niveau II équipé = FORME FINALE (Lvl 3)
    if (pactesEquipes.includes(nomPacteLvl2)) return 3;
    
    // Règle 2 : Pacte de Niveau I équipé = FORME ÉVOLUÉE (Lvl 2)
    if (pactesEquipes.includes(nomPacteBase)) return 2;
    
    // Règle 3 : Pacte non équipé = BOSS CLASSIQUE (Lvl 1)
    return 1; 
}