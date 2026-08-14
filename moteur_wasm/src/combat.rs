use crate::entite::{Entite, ActionType, Synergie};
use rand::Rng;

pub struct ResultatDegats {
    pub dmg_arm: i32,
    pub dmg_pv: i32,
    pub esquive: bool,
    // Puissance brute de l'attaque quand elle est esquivée (0 sinon) — sert à afficher les
    // statistiques "dégâts esquivés" en fin de run.
    pub degats_evites: i32,
    // Chance d'esquive qui s'appliquait à ce coup, réussie ou non. Affichée dans le journal : sans
    // elle, un enchaînement d'esquives ressemble à de la malchance pure au lieu d'un palier atteint.
    pub chance_esquive: i32,
    // Dose de brûlure / de poison réellement posée par ce coup (voir convertir_en_* dans lib.rs).
    // Une action convertie n'inflige aucun dégât direct : sans ces deux champs, le journal n'aurait
    // strictement rien à dire d'un coup qui a pourtant porté.
    pub brulure_posee: i32,
    pub poison_pose: i32,
    // Le multiplicateur de la Foudre a bien joué sur ce coup (la cible portait de l'armure au moment
    // précis de la frappe). Impossible à recalculer depuis le journal : l'armure de la cible bouge
    // à l'intérieur même du créneau, selon l'ordre de résolution.
    pub foudre_appliquee: bool,
    // Valeur RÉELLEMENT portée par le coup, une fois tout appliqué (Foudre, doublage de la Précise,
    // conversion en brûlure/poison). Le journal affiche ça et non la valeur brute du combo : sur
    // l'Étage de la Foudre, la seconde ment d'un facteur 1,5 à 3.
    pub valeur_appliquee: i32,
}

// `fusion_ap` : Synergie Assassin ("Danse des Lames") — Attaque et Précise comptent comme la même
// action pour la jauge de combo (A-A-P-P-P = Combo x5), sans quoi alterner les deux briserait le
// combo comme n'importe quel changement d'action.
pub fn gerer_combo(combo_type: &mut Option<ActionType>, combo_count: &mut i32, action: &ActionType, fusion_ap: bool) {
    if *action == ActionType::E {
        *combo_type = None;
        *combo_count = 0;
        return;
    }
    let normalise = if fusion_ap && (*action == ActionType::A || *action == ActionType::P) { ActionType::A } else { action.clone() };
    if Some(normalise.clone()) == *combo_type {
        *combo_count += 1;
    } else {
        *combo_type = Some(normalise);
        *combo_count = 1;
    }
}

// Pacte du Combo appliqué à l'Esquive : NE fait PAS sauter un palier supplémentaire (le niveau
// d'esquive doit rester un décompte fidèle du nombre d'actions Esquive enchaînées, pour que la
// décroissance après une action différente retombe au bon palier). À la place, le multiplicateur
// amplifie l'écart entre paliers consécutifs (à partir du 2e palier, le 1er n'étant jamais un
// combo) : ex. paliers [0,50,75,100] avec x1.5 -> [0,50,88,100] (50 + round(25*1.5) = 88, capé à 100).
fn paliers_esquive_effectifs(entite: &Entite) -> [i32; 4] {
    let base = &entite.paliers_esquive;
    let mult = entite.combo_multiplicateur.unwrap_or(1.0);
    let mut effectifs = [0i32; 4];
    effectifs[0] = base.first().copied().unwrap_or(0);
    for i in 1..4 {
        let precedent = base.get(i - 1).copied().unwrap_or(0);
        let actuel = base.get(i).copied().unwrap_or(precedent);
        let delta = (actuel - precedent) as f32;
        let delta_ajuste = if i > 1 { (delta * mult).round() as i32 } else { delta as i32 };
        effectifs[i] = std::cmp::min(100, effectifs[i - 1] + delta_ajuste);
    }
    effectifs
}

pub fn get_valeur_action(action: &ActionType, count: i32, entite: &Entite) -> i32 {
    let mut multiplier = 1.0;

    // Lecture propre du multiplicateur si on est en situation de combo
    if count > 1 {
        multiplier = entite.combo_multiplicateur.unwrap_or(1.0);
    }

    // Synergie Assassin ("Danse des Lames") : la Précise bénéficie aussi des bonus du Pacte de la
    // Puissance Brute, normalement réservés à l'Attaque.
    let synergie_assassin = entite.synergie_active == Some(Synergie::Assassin);

    // Le match affecte directement la valeur de base, sans variable inutile
    let base_val = match action {
        ActionType::A => {
            // Pacte de la Puissance Brute II : +N dégâts supplémentaires par palier de combo,
            // en plus du bonus de combo standard (+5/palier).
            let bonus_combo_pacte = entite.bonus_combo_attaque_palier.unwrap_or(0) * (count - 1);
            entite.base_a + (count - 1) * 5 + bonus_combo_pacte
        },
        ActionType::P => {
            let bonus_combo_pacte = if synergie_assassin { entite.bonus_combo_attaque_palier.unwrap_or(0) * (count - 1) } else { 0 };
            entite.base_p + (count - 1) * 2 + bonus_combo_pacte
        },
        ActionType::D => entite.base_d + (count - 1) * 5,
        ActionType::E => 0,
    };

    // .round() plutôt qu'un simple `as i32` : un cast tronque toujours vers zéro (16.5 -> 16),
    // alors qu'un bonus de dégâts doit arrondir normalement (16.5 -> 17).
    let valeur = (base_val as f32 * multiplier).round() as i32;

    // Pacte de la Puissance Brute (I/II) : +10%/+20% dégâts sur l'Attaque, appliqué après le combo.
    // (et aussi sur la Précise avec la Synergie Assassin, voir plus haut)
    if *action == ActionType::A || (*action == ActionType::P && synergie_assassin) {
        if let Some(pct) = entite.bonus_degats_attaque_pourcentage {
            return (valeur as f32 * (1.0 + pct as f32 / 100.0)).round() as i32;
        }
    }

    valeur
}

// Multiplicateur d'un Coup Critique de la Bénédiction "Griffe Acérée" (150% des dégâts).
pub const MULTIPLICATEUR_CRITIQUE: f32 = 1.5;

// Chance d'esquive réellement appliquée au défenseur, tous modificateurs compris : le palier
// courant (déjà amplifié par le Pacte du Combo), le bonus plat de la Bénédiction "Grâce Féline"
// (actif même au palier 0, là où les paliers exigent d'avoir joué Esquive) et la réduction imposée
// par l'attaquant ("Regard Hypnotique"). Neutraliser l'esquive (Pacte de l'Ombre II, Le Vent
// Mortel) court-circuite tout le reste.
pub fn chance_esquive(attaquant: &Entite, defenseur: &Entite) -> i32 {
    if attaquant.bloque_esquive_opposant { return 0; }

    let palier = paliers_esquive_effectifs(defenseur)[defenseur.niv_esquive.min(3)];
    let brut = palier
        + defenseur.bonus_esquive_flat.unwrap_or(0)
        - attaquant.reduction_esquive_opposant.unwrap_or(0);
    brut.clamp(0, 100)
}

// Bénédiction "Griffe Acérée" : chance fixe qu'une action offensive frappe en critique. Renvoie la
// valeur éventuellement amplifiée et un drapeau, pour que l'appelant puisse l'annoncer dans le log.
pub fn tenter_critique(valeur: i32, action: &ActionType, attaquant: &Entite) -> (i32, bool) {
    if *action != ActionType::A && *action != ActionType::P { return (valeur, false); }

    let chance = attaquant.chance_critique.unwrap_or(0);
    if chance <= 0 || rand::thread_rng().gen_range(1..=100) > chance { return (valeur, false); }

    ((valeur as f32 * MULTIPLICATEUR_CRITIQUE).round() as i32, true)
}

// Étage de la Foudre : tant que la cible porte de l'armure, le coup entier est amplifié — Précise
// comprise, qui conserve par ailleurs son contournement d'armure. Se défendre contre un porteur de
// ce pouvoir est donc un piège.
// Exposé à part de `calculer_degats` : la Synergie Élémentaire en fait aussi profiter la brûlure,
// qui ne passe pas par le calcul de dégâts normal (voir convertir_en_brulure dans lib.rs).
pub fn appliquer_foudre(val_atk: i32, attaquant: &Entite, defenseur: &Entite) -> i32 {
    match attaquant.multiplicateur_degats_si_armure {
        Some(mult) if defenseur.armure > 0 => (val_atk as f32 * mult).round() as i32,
        _ => val_atk,
    }
}

// L'attaquant est passé en entier (plutôt que ses drapeaux un par un) : c'est lui qui porte à la
// fois le doublage de la Précise, la neutralisation de l'esquive et la réduction d'esquive adverse.
pub fn calculer_degats(action_atk: &ActionType, val_atk: i32, attaquant: &Entite, defenseur: &Entite) -> ResultatDegats {
    let neutre = ResultatDegats { dmg_arm: 0, dmg_pv: 0, esquive: false, degats_evites: 0, chance_esquive: 0, brulure_posee: 0, poison_pose: 0, foudre_appliquee: false, valeur_appliquee: 0 };
    if *action_atk != ActionType::A && *action_atk != ActionType::P {
        return neutre;
    }

    let degats_precis_doubles = attaquant.degats_precis_doubles;

    let val_amplifiee = appliquer_foudre(val_atk, attaquant, defenseur);
    let neutre = ResultatDegats { foudre_appliquee: val_amplifiee != val_atk, ..neutre };
    let val_atk = val_amplifiee;

    // Valeur finale du coup : la Précise double APRÈS l'amplification de la Foudre.
    let porte = if *action_atk == ActionType::P && degats_precis_doubles { val_atk * 2 } else { val_atk };
    let neutre = ResultatDegats { valeur_appliquee: porte, ..neutre };

    let chance = chance_esquive(attaquant, defenseur);
    let jet = rand::thread_rng().gen_range(1..=100);
    if jet <= chance {
        return ResultatDegats { esquive: true, degats_evites: porte, chance_esquive: chance, ..neutre };
    }

    if *action_atk == ActionType::A {
        if defenseur.armure >= porte { return ResultatDegats { dmg_arm: porte, chance_esquive: chance, ..neutre }; }
        return ResultatDegats { dmg_arm: defenseur.armure, dmg_pv: porte - defenseur.armure, chance_esquive: chance, ..neutre };
    }

    ResultatDegats { dmg_pv: porte, chance_esquive: chance, ..neutre }
}