import type { Entite } from '../types';

export function appliquerPactesSurJoueur(joueur: Entite, pactesEquipes: string[]): Entite {
    const j = { ...joueur };
    
    if (pactesEquipes.includes("Pacte de la Vie")) {
        j.pvMax = Math.floor(j.pvMax * 1.10);
        j.pv = j.pvMax;
    }
    if (pactesEquipes.includes("Pacte de la Vie II")) {
        j.pvMax = Math.floor(j.pvMax * 1.25);
        j.pv = j.pvMax;
        j.pacteSoinVieII = true; // Active le trigger de soin dans l'arène
    }
    
    if (pactesEquipes.includes("Pacte de l'Armure") || pactesEquipes.includes("Pacte de l'Armure II")) {
        j.baseD += 5;
    }
    if (pactesEquipes.includes("Pacte de l'Armure II")) {
        j.degatsArmureRestanteFinTour = true;
    }
    
    if (pactesEquipes.includes("Pacte de l'Esquive")) j.paliersEsquive = [0, 60, 85, 100];
    if (pactesEquipes.includes("Pacte de l'Esquive II")) j.paliersEsquive = [0, 80, 100, 100];

    if (pactesEquipes.includes("Pacte du Combo")) j.comboMultiplicateur = 1.5;
    if (pactesEquipes.includes("Pacte du Combo II")) j.comboMultiplicateur = 2.0;

    if (pactesEquipes.includes("Pacte de l'Ombre")) j.degatsPrecisDoubles = true;
    if (pactesEquipes.includes("Pacte de l'Ombre II")) j.bloqueEsquiveOpposant = true;

    if (pactesEquipes.includes("Pacte du Temps")) j.actionFinTourDoublee = true;
    if (pactesEquipes.includes("Pacte du Temps II")) j.actionTroisiemeTriplee = true;
    
    return j;
}

export function calculerSoinRepos(pvMax: number, pactesEquipes: string[]): number {
    let baseSoin = Math.floor(pvMax / 2);
    if (pactesEquipes.includes("Pacte de la Vie") || pactesEquipes.includes("Pacte de la Vie II")) {
        baseSoin = Math.floor(baseSoin * 1.1);
    }
    return baseSoin;
}

export function calculerGainPvMaxRepos(pactesEquipes: string[]): number {
    let gainPvMax = 10;
    if (pactesEquipes.includes("Pacte de la Vie") || pactesEquipes.includes("Pacte de la Vie II")) {
        gainPvMax = Math.floor(gainPvMax * 1.1);
    }
    return gainPvMax;
}

export function genererBadgesPactes(pactesEquipes: string[]): { nom: string, desc: string }[] {
    return pactesEquipes.map(p => { 
        let desc = "";
        if (p === "Pacte de l'Armure") desc = "(+5 Défense)";
        else if (p === "Pacte de l'Armure II") desc = "(+5 Déf, Renvoi d'Armure)";
        else if (p === "Pacte de l'Esquive") desc = "(+10% Paliers Esquive)";
        else if (p === "Pacte de l'Esquive II") desc = "(+30% Paliers Esquive)";
        else if (p === "Pacte du Combo") desc = "(*1.5 Multiplicateur Combo)";
        else if (p === "Pacte du Combo II") desc = "(*2 Multiplicateur Combo)";
        else if (p === "Pacte de la Vie") desc = "(+10% PV Max)";
        else if (p === "Pacte de la Vie II") desc = "(+25% PV Max, Heal 10% / 5 Tours)";
        else if (p === "Pacte de l'Ombre") desc = "(Dégâts Précis x2)";
        else if (p === "Pacte de l'Ombre II") desc = "(Bloque Esquive Ennemi)";
        else if (p === "Pacte du Temps") desc = "(5e Action x2)";
        else if (p === "Pacte du Temps II") desc = "(3e Action x3)";
        return { nom: p, desc: desc }; 
    });
}

export function determinerNomPacte(nomEtage: string): string {
    const nom = nomEtage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (nom.includes("armure") || nom.includes("defense") || nom.includes("bouclier")) return "Pacte de l'Armure";
    if (nom.includes("vitesse") || nom.includes("esquive") || nom.includes("agilite")) return "Pacte de l'Esquive";
    if (nom.includes("vie") || nom.includes("vitalite") || nom.includes("sang")) return "Pacte de la Vie";
    if (nom.includes("ombre") || nom.includes("tenebre") || nom.includes("assassin")) return "Pacte de l'Ombre";
    if (nom.includes("temps") || nom.includes("chronos") || nom.includes("horloge")) return "Pacte du Temps";
    
    return "Pacte du Combo"; 
}

export function peutEquiperPacte(nomPacte: string, pactesDejaEquipes: string[]): { valide: boolean, messageErreur?: string } {
    if (pactesDejaEquipes.includes(nomPacte)) return { valide: true };
    
    const estLvl2 = nomPacte.endsWith(" II");
    const nomBase = estLvl2 ? nomPacte.replace(" II", "") : nomPacte;
    const nomLvl1 = nomBase;
    const nomLvl2 = nomBase + " II";

    if (estLvl2 && pactesDejaEquipes.includes(nomLvl1)) {
        return { valide: false, messageErreur: `Vous ne pouvez pas équiper à la fois ${nomLvl1} et ${nomPacte}.` };
    }
    if (!estLvl2 && pactesDejaEquipes.includes(nomLvl2)) {
        return { valide: false, messageErreur: `Vous ne pouvez pas équiper à la fois ${nomPacte} et ${nomLvl2}.` };
    }

    if (estLvl2 && pactesDejaEquipes.filter(p => p.endsWith(" II")).length >= 1) {
        return { valide: false, messageErreur: "Vous ne pouvez équiper qu'un seul Pacte de Niveau 2." };
    } 
    if (!estLvl2 && pactesDejaEquipes.filter(p => !p.endsWith(" II")).length >= 3) {
        return { valide: false, messageErreur: "Vous ne pouvez équiper que 3 Pactes de Niveau 1." };
    }

    return { valide: true };
}