// src/utils/combat.ts
import type { ActionType, Entite } from '../types';

// Plafond de combo imposé aux monstres tant que le joueur n'a achevé aucune run : enchaîner cinq
// fois la même action est le pic de puissance d'une créature, et un débutant ne sait pas encore
// que ça se voit venir dans ses cases d'action. La borne saute dès la 2e ascension.
export const LIMITE_COMBO_PREMIERE_RUN = 4;

export const SYMBOLES: Record<ActionType, string> = { 'A': '⚔️', 'P': '🎯', 'D': '🛡️', 'E': '💨' };

// Le Feu et le Poison ne s'AJOUTENT pas à une action : ils la remplacent (l'Attaque cesse de blesser
// sur le coup, la Précise aussi). Garder ⚔️/🎯 laisserait croire à des dégâts immédiats qui n'ont
// plus lieu — d'où le changement d'icône partout où l'action est représentée. Miroir de `symbole()`
// côté moteur (lib.rs), qui fait de même dans le journal.
export function symbolePour(action: ActionType, entite?: Entite): string {
    if (action === 'A' && entite?.multiplicateurBrulure) return '🔥';
    if (action === 'P' && entite?.multiplicateurPoison) return '🧪';
    return SYMBOLES[action];
}

// ⚠️ L'armure regénérée en début de tour (« Pelage d'Acier », passifs de boss) n'est créditée qu'au
// lancement de la résolution : pendant que le joueur programme, `armure` vaut encore 0 alors que la
// cible en portera à coup sûr quand le coup partira. On l'anticipe, sinon la stat annonce des dégâts
// simples pour un coup qui sera amplifié.
export function cibleSeraArmee(cible?: Entite): boolean {
    if (!cible) return false;
    return cible.armure > 0 || (cible.regenArmureTour ?? 0) > 0;
}

// Pacte de la Foudre : le coup entier est amplifié tant que la CIBLE porte de l'armure. C'est la
// seule contribution qui dépende de l'adversaire, d'où le paramètre `cible` partout en aval — sans
// lui, la stat resterait muette sur l'Étage de la Foudre alors que les dégâts y sont jusqu'à
// triplés. Miroir de `appliquer_foudre()` côté moteur.
function appliquerFoudre(valeur: number, entite: Entite, cible?: Entite): number {
    if (!entite.multiplicateurDegatsSiArmure || !cibleSeraArmee(cible)) return valeur;
    return Math.round(valeur * entite.multiplicateurDegatsSiArmure);
}

// Valeur d'Attaque affichée dans les stats : contrairement aux pactes à bonus plat (ex: Pacte de
// la Vie qui augmente directement pvMax), le Pacte de la Puissance Brute n'agit qu'au moment du
// calcul de dégâts côté moteur Rust — sans ceci, le joueur ne verrait jamais son ⚔️ bouger à
// l'écran alors que le bonus est bien actif. Même formule d'arrondi que le moteur (get_valeur_action).
//
// `actionsEnAttente` (optionnel) permet en plus un aperçu LIVE du bonus temporaire de la Synergie
// Guerrier pendant que le joueur programme son tour : chaque Défense déjà posée dans la file
// ajoute +2 aux dégâts de base affichés, avant même de valider le tour — pour que le bonus
// "temporaire" (remis à zéro chaque tour côté moteur) reste visible plutôt qu'invisible.
export function calculerAttaqueAffichee(entite: Entite, actionsEnAttente: ActionType[] = [], cible?: Entite): number {
    let base = entite.baseA;
    if (entite.synergieActive === 'Guerrier') {
        const nbDefenses = actionsEnAttente.filter(a => a === 'D').length;
        base += 2 * nbDefenses;
    }
    if (entite.bonusDegatsAttaquePourcentage) {
        base = Math.round(base * (1 + entite.bonusDegatsAttaquePourcentage / 100));
    }
    // Pacte du Feu : l'Attaque ne blesse plus, elle pose une brûlure valant une PART de ses dégâts.
    // C'est cette dose que le joueur doit lire sous l'icône 🔥, pas les dégâts qu'il n'infligera pas.
    // ⚠️ La Foudre n'entre dans la brûlure QUE via la Synergie Élémentaire (cf. convertir_en_brulure).
    if (entite.multiplicateurBrulure) {
        const valeur = entite.synergieActive === 'Elementaire' ? appliquerFoudre(base, entite, cible) : base;
        return Math.round(valeur * entite.multiplicateurBrulure);
    }

    return appliquerFoudre(base, entite, cible);
}

// Même principe pour la Précise : le Pacte de l'Ombre (I/II) double ses dégâts (degatsPrecisDoubles)
// et, avec la Synergie Assassin, elle hérite aussi du bonus % du Pacte de la Puissance Brute —
// deux effets "toujours actifs" (contrairement au Pacte du Combo ou du Temps, conditionnés au
// combo/à la position dans le tour) qui doivent donc être visibles directement sur 🎯.
// Même ordre d'opérations que le moteur : bonus % (get_valeur_action) puis doublage (calculer_degats).
export function calculerPreciseAffichee(entite: Entite, cible?: Entite): number {
    let valeur = entite.baseP;
    if (entite.synergieActive === 'Assassin' && entite.bonusDegatsAttaquePourcentage) {
        valeur = Math.round(valeur * (1 + entite.bonusDegatsAttaquePourcentage / 100));
    }

    // Pacte du Poison : la dose se calcule sur la valeur BRUTE de l'action. Ni la Foudre ni le
    // doublage de l'Ombre n'y entrent — ils vivent dans `calculer_degats`, dont une action convertie
    // ressort à zéro (cf. convertir_en_poison).
    if (entite.multiplicateurPoison) return Math.round(valeur * entite.multiplicateurPoison);

    // Ordre imposé par le moteur : la Foudre amplifie, PUIS l'Ombre double.
    valeur = appliquerFoudre(valeur, entite, cible);
    if (entite.degatsPrecisDoubles) valeur *= 2;
    return valeur;
}

// Miroir de paliers_esquive_effectifs() + chance_esquive() côté moteur (combat.rs) : le Pacte du
// Combo amplifie l'écart entre paliers consécutifs à partir du 2e (jamais le 1er, qui n'est jamais
// un combo), puis les Bénédictions du Chat décalent le tout d'un bonus plat ("Grâce Féline",
// visible dès le palier 0) ou de la réduction imposée par l'adversaire ("Regard Hypnotique").
// Sans ceci l'affichage du % d'esquive resterait figé sur les paliers de base, comme pour ⚔️
// avant calculerAttaqueAffichee.
export function calculerPaliersEsquiveAffiches(entite: Entite, reductionAdverse = 0): number[] {
    const base = entite.paliersEsquive;
    const mult = entite.comboMultiplicateur ?? 1;
    const effectifs = [base[0] ?? 0, 0, 0, 0];
    for (let i = 1; i < 4; i++) {
        const precedent = base[i - 1] ?? 0;
        const actuel = base[i] ?? precedent;
        const delta = actuel - precedent;
        const deltaAjuste = i > 1 ? Math.round(delta * mult) : delta;
        effectifs[i] = Math.min(100, effectifs[i - 1] + deltaAjuste);
    }

    const decalage = (entite.bonusEsquiveFlat ?? 0) - reductionAdverse;
    if (decalage === 0) return effectifs;
    return effectifs.map(palier => Math.min(100, Math.max(0, palier + decalage)));
}

export interface CreneauxFroid {
    gelesJoueur: number[];
    gelesMonstre: number[];
    joueurDabord: number[];
    monstreDabord: number[];
    // Créneaux où les deux camps portaient le dérèglement : il s'y neutralise. Purement informatif
    // (jamais transmis au moteur), mais indispensable — sans repère, le joueur qui porte le Pacte du
    // Froid à l'étage du Froid croit simplement que son Pacte ne fonctionne pas.
    annules: number[];
}

export const AUCUN_CRENEAU_FROID: CreneauxFroid = { gelesJoueur: [], gelesMonstre: [], joueurDabord: [], monstreDabord: [], annules: [] };

function tirerCreneaux(nombre: number): number[] {
    if (nombre <= 0) return [];
    return melangerIndices().slice(0, Math.min(nombre, 5));
}

function melangerIndices(): number[] {
    const indices = [0, 1, 2, 3, 4];
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

// Étage du Froid : quels créneaux du tour sont déréglés (résolus avant l'adversaire) et lesquels
// sont gelés. ⚠️ Tiré ICI, au début du tour, et non dans le moteur : le joueur doit voir les cases
// concernées PENDANT qu'il programme ses actions, sinon l'information arrive trop tard pour être
// jouable. Le résultat est passé tel quel à `jouer_tour`.
// Un pouvoir porté des DEUX côtés s'annule : seul l'écart compte. La part neutralisée est quand
// même tirée et rendue dans `annules`, pour pouvoir montrer au joueur OÙ son dérèglement a été
// contré — un tableau vide, lui, ressemblerait à un Pacte inopérant.
export function tirerCreneauxFroid(joueur: Entite, monstre: Entite): CreneauxFroid {
    const inversionsJ = joueur.actionsResolutionInversee ?? 0;
    const inversionsM = monstre.actionsResolutionInversee ?? 0;

    // Un seul mélange pour les deux lots : un créneau ne peut pas être à la fois déréglé et neutralisé.
    const indices = melangerIndices();
    const dabord = indices.slice(0, Math.min(Math.abs(inversionsJ - inversionsM), 5));
    const annules = indices.slice(dabord.length, Math.min(dabord.length + Math.min(inversionsJ, inversionsM), 5));

    return {
        gelesJoueur: tirerCreneaux(monstre.actionsGelees ?? 0),
        gelesMonstre: tirerCreneaux(joueur.actionsGelees ?? 0),
        joueurDabord: inversionsJ > inversionsM ? dabord : [],
        monstreDabord: inversionsM > inversionsJ ? dabord : [],
        annules,
    };
}

// `poisonSurCible` : dose de poison déjà installée sur l'adversaire de cette créature. Elle seule
// décide du droit de temporiser (voir peutTemporiserSiPoisonDepasse).
export function genererActionsMonstre(monstre: Entite, poisonSurCible: number = 0): ActionType[] {
    const possibilites = monstre.actionsPossibles;
    const actions: ActionType[] = [];
    const chancePoursuiteCombo = monstre.chanceCombo !== undefined ? monstre.chanceCombo : 20;

    for (let i = 0; i < 5; i++) {
        let choix: ActionType;
        if (i === 0) {
            choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        } else {
            // Bonus spécifique : après une Défense, certains boss (Pacte de l'Armure) ont une
            // chance accrue d'enchaîner une nouvelle Défense, pour finir le tour avec plus
            // d'armure et déclencher plus souvent leurs dégâts de fin de tour.
            let chanceContinuer = chancePoursuiteCombo;
            if (actions[i - 1] === 'D' && monstre.chanceSuiteDefense) {
                chanceContinuer += monstre.chanceSuiteDefense;
            }

            const jetCombo = Math.random() * 100;
            if (jetCombo < chanceContinuer) choix = actions[i - 1];
            else choix = possibilites[Math.floor(Math.random() * possibilites.length)];
        }
        actions.push(choix);
    }

    // Un tour entier passé à se défendre et esquiver n'a de sens que pour une créature dont le
    // poison déjà injecté fait le travail à sa place. Partout ailleurs, c'est un tour offert au
    // joueur : on force alors au moins une action offensive.
    const peutTemporiser = monstre.peutTemporiserSiPoisonDepasse !== undefined
        && poisonSurCible > monstre.peutTemporiserSiPoisonDepasse;
    const offensives = possibilites.filter(a => a === 'A' || a === 'P');
    if (!peutTemporiser && offensives.length > 0 && !actions.some(a => a === 'A' || a === 'P')) {
        actions[Math.floor(Math.random() * 5)] = offensives[Math.floor(Math.random() * offensives.length)];
    }

    return actions;
}

// Tire, parmi les 5 emplacements d'actions du monstre, les indices qui seront révélés au joueur
// (les autres restent masqués derrière un '❓'). `undefined` ou >= 5 signifie "tout est visible".
export function genererIndicesVisibles(nombreVisible?: number): number[] {
    const tous = [0, 1, 2, 3, 4];
    if (nombreVisible === undefined || nombreVisible >= 5) return tous;

    const melange = [...tous];
    for (let i = melange.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    return melange.slice(0, Math.max(0, nombreVisible));
}

// Remplace toute action qui prolongerait un combo au-delà de `limiteCombo` par une alternative
// aléatoire, pour respecter le Pacte de la Fluidité imposé par l'adversaire.
// ⚠️ L'alternative se tire dans la panoplie de la CRÉATURE (`actionsPossibles`), jamais dans la
// liste complète des 4 actions : sinon briser le combo d'un Gardien lui met dans les mains une
// action qu'il ne possède pas — une Précise chez le Brasier Vorace, une Attaque chez la Sève Noire.
export function corrigerActionsPourLimiteCombo(
    actions: ActionType[],
    limiteCombo: number,
    actionsPossibles: ActionType[],
): ActionType[] {
    if (limiteCombo >= 5) return actions;

    const corrigees: ActionType[] = [];
    for (const action of actions) {
        let choix = action;
        let actionsSuite = 0;
        for (let j = corrigees.length - 1; j >= 0; j--) {
            if (corrigees[j] === choix) actionsSuite++; else break;
        }

        if (actionsSuite >= limiteCombo) {
            const alternatives = actionsPossibles.filter(a => a !== choix);
            // Une créature réduite à une seule action ne peut pas briser son propre combo : on la
            // laisse le prolonger plutôt que de lui inventer un geste.
            if (alternatives.length > 0) {
                choix = alternatives[Math.floor(Math.random() * alternatives.length)];
            }
        }
        corrigees.push(choix);
    }
    return corrigees;
}