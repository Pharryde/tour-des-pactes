use crate::entite::{Entite, ActionType};
use rand::Rng;

pub struct ResultatDegats {
    pub dmg_arm: i32,
    pub dmg_pv: i32,
    pub esquive: bool,
    // Puissance brute de l'attaque quand elle est esquivée (0 sinon) — sert à afficher les
    // statistiques "dégâts esquivés" en fin de run.
    pub degats_evites: i32,
}

pub fn gerer_combo(combo_type: &mut Option<ActionType>, combo_count: &mut i32, action: &ActionType) {
    if *action == ActionType::E {
        *combo_type = None;
        *combo_count = 0;
        return;
    }
    if Some(action.clone()) == *combo_type {
        *combo_count += 1;
    } else {
        *combo_type = Some(action.clone());
        *combo_count = 1;
    }
}

pub fn get_valeur_action(action: &ActionType, count: i32, entite: &Entite) -> i32 {
    let mut multiplier = 1.0;

    // Lecture propre du multiplicateur si on est en situation de combo
    if count > 1 {
        multiplier = entite.combo_multiplicateur.unwrap_or(1.0);
    }

    // Le match affecte directement la valeur de base, sans variable inutile
    let base_val = match action {
        ActionType::A => {
            // Pacte de la Puissance Brute II : +N dégâts supplémentaires par palier de combo,
            // en plus du bonus de combo standard (+5/palier).
            let bonus_combo_pacte = entite.bonus_combo_attaque_palier.unwrap_or(0) * (count - 1);
            entite.base_a + (count - 1) * 5 + bonus_combo_pacte
        },
        ActionType::P => entite.base_p + (count - 1) * 2,
        ActionType::D => entite.base_d + (count - 1) * 5,
        ActionType::E => 0,
    };

    let valeur = (base_val as f32 * multiplier) as i32;

    // Pacte de la Puissance Brute (I/II) : +10%/+20% dégâts sur l'Attaque, appliqué après le combo.
    if *action == ActionType::A {
        if let Some(pct) = entite.bonus_degats_attaque_pourcentage {
            return (valeur as f32 * (1.0 + pct as f32 / 100.0)) as i32;
        }
    }

    valeur
}

pub fn calculer_degats(action_atk: &ActionType, val_atk: i32, defenseur: &Entite, bloque_esquive: bool, degats_precis_doubles: bool) -> ResultatDegats {
    if *action_atk != ActionType::A && *action_atk != ActionType::P {
        return ResultatDegats { dmg_arm: 0, dmg_pv: 0, esquive: false, degats_evites: 0 };
    }

    let chance_esquive = if bloque_esquive { 0 } else { defenseur.paliers_esquive[defenseur.niv_esquive as usize] };

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