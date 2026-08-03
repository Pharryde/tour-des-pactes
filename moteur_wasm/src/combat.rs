use crate::entite::{Entite, ActionType, Synergie};
use rand::Rng;

pub struct ResultatDegats {
    pub dmg_arm: i32,
    pub dmg_pv: i32,
    pub esquive: bool,
    // Puissance brute de l'attaque quand elle est esquivée (0 sinon) — sert à afficher les
    // statistiques "dégâts esquivés" en fin de run.
    pub degats_evites: i32,
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

pub fn calculer_degats(action_atk: &ActionType, val_atk: i32, defenseur: &Entite, bloque_esquive: bool, degats_precis_doubles: bool) -> ResultatDegats {
    if *action_atk != ActionType::A && *action_atk != ActionType::P {
        return ResultatDegats { dmg_arm: 0, dmg_pv: 0, esquive: false, degats_evites: 0 };
    }

    let chance_esquive = if bloque_esquive { 0 } else { paliers_esquive_effectifs(defenseur)[defenseur.niv_esquive as usize] };

    let jet = rand::thread_rng().gen_range(1..=100);
    if jet <= chance_esquive {
        let degats_potentiels = if *action_atk == ActionType::P && degats_precis_doubles { val_atk * 2 } else { val_atk };
        return ResultatDegats { dmg_arm: 0, dmg_pv: 0, esquive: true, degats_evites: degats_potentiels };
    }

    if *action_atk == ActionType::A {
        if defenseur.armure >= val_atk { return ResultatDegats { dmg_arm: val_atk, dmg_pv: 0, esquive: false, degats_evites: 0 }; }
        return ResultatDegats { dmg_arm: defenseur.armure, dmg_pv: val_atk - defenseur.armure, esquive: false, degats_evites: 0 };
    }

    if *action_atk == ActionType::P {
        let mut degats = val_atk;
        if degats_precis_doubles { degats *= 2; }
        return ResultatDegats { dmg_arm: 0, dmg_pv: degats, esquive: false, degats_evites: 0 };
    }

    ResultatDegats { dmg_arm: 0, dmg_pv: 0, esquive: false, degats_evites: 0 }
}