pub mod entite;
pub mod boss_data;
pub mod combat;

use wasm_bindgen::prelude::*;
use serde::Serialize;
use crate::entite::{Entite, ActionType};
use crate::combat::{gerer_combo, get_valeur_action, calculer_degats};
use crate::boss_data::get_tous_les_etages;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EtapeCombat {
    pub est_action: bool,
    pub log: String,
    pub joueur_pv: i32,
    pub joueur_armure: i32,
    pub joueur_niv_esquive: i32,
    pub monstre_pv: i32,
    pub monstre_armure: i32,
    pub monstre_niv_esquive: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultatTour {
    pub joueur: Entite,
    pub monstre: Entite,
    pub actions_monstre: Vec<ActionType>,
    pub etapes: Vec<EtapeCombat>,
    pub logs_fin_tour: Vec<String>,
}

fn symbole(act: &ActionType) -> &str {
    match act { ActionType::A => "⚔️", ActionType::P => "🎯", ActionType::D => "🛡️", ActionType::E => "💨" }
}

#[wasm_bindgen]
pub fn get_donnees_etages() -> JsValue {
    let etages = get_tous_les_etages();
    serde_wasm_bindgen::to_value(&etages).unwrap()
}

#[wasm_bindgen]
pub fn jouer_tour(joueur_js: JsValue, monstre_js: JsValue, actions_joueur_js: JsValue, actions_monstre_js: JsValue, tour_actuel: i32) -> JsValue {
    let mut joueur: Entite = serde_wasm_bindgen::from_value(joueur_js).unwrap();
    let mut monstre: Entite = serde_wasm_bindgen::from_value(monstre_js).unwrap();
    let actions_joueur: Vec<ActionType> = serde_wasm_bindgen::from_value(actions_joueur_js).unwrap();
    let actions_monstre: Vec<ActionType> = serde_wasm_bindgen::from_value(actions_monstre_js).unwrap();

    let mut etapes = Vec::new();
    let mut combo_j_type: Option<ActionType> = None; let mut combo_j_count = 0;
    let mut combo_m_type: Option<ActionType> = None; let mut combo_m_count = 0;

    if let Some(regen) = monstre.regen_armure_tour {
        monstre.armure += regen;
        etapes.push(EtapeCombat { 
            est_action: false,
            log: format!("<span class=\"log-mort\">🔥 Le passif du Boss s'active : +{} Armure !</span>", regen), 
            joueur_pv: joueur.pv, 
            joueur_armure: joueur.armure,
            joueur_niv_esquive: joueur.niv_esquive as i32,
            monstre_pv: monstre.pv, 
            monstre_armure: monstre.armure,
            monstre_niv_esquive: monstre.niv_esquive as i32
        });
    }

    for i in 0..5 {
        if joueur.pv <= 0 || monstre.pv <= 0 { break; }
        
        let act_j = &actions_joueur[i]; let act_m = &actions_monstre[i];
        gerer_combo(&mut combo_j_type, &mut combo_j_count, act_j);
        gerer_combo(&mut combo_m_type, &mut combo_m_count, act_m);

        let mut val_j = get_valeur_action(act_j, combo_j_count, &joueur);
        let mut val_m = get_valeur_action(act_m, combo_m_count, &monstre);

        // --- NOUVEAU : CASSAGE DE COMBO ---
        let mut log_annulation_j = "";
        if monstre.annule_bonus_combo && combo_j_count > 1 {
            val_j = get_valeur_action(act_j, 1, &joueur); // Override
            log_annulation_j = " <span class=\"log-mort\">(Votre combo est brisé)</span>";
        }

        let mut log_annulation_m = "";
        if joueur.annule_bonus_combo && combo_m_count > 1 {
            val_m = get_valeur_action(act_m, 1, &monstre); // Override
            log_annulation_m = " <span class=\"log-mort\">(Le combo ennemi est brisé)</span>";
        }

        let mut mult_esquive_j = 1;
        if i == 4 && joueur.action_fin_tour_doublee { if *act_j == ActionType::E { mult_esquive_j = 2; } else { val_j *= 2; } }
        if i == 2 && joueur.action_troisieme_triplee { if *act_j == ActionType::E { mult_esquive_j = 3; } else { val_j *= 3; } }

        if *act_j == ActionType::D { joueur.armure += val_j; }
        if *act_j == ActionType::E { joueur.niv_esquive = std::cmp::min(3, joueur.niv_esquive + mult_esquive_j); }
        else { joueur.niv_esquive = joueur.niv_esquive.saturating_sub(1); }

        if *act_m == ActionType::D { monstre.armure += val_m; }
        if *act_m == ActionType::E { monstre.niv_esquive = std::cmp::min(3, monstre.niv_esquive + 1); }
        else { monstre.niv_esquive = monstre.niv_esquive.saturating_sub(1); }

        let d_joueur = calculer_degats(act_m, val_m, &joueur, monstre.bloque_esquive_opposant, monstre.degats_precis_doubles);
        let d_monstre = calculer_degats(act_j, val_j, &monstre, joueur.bloque_esquive_opposant, joueur.degats_precis_doubles);

        let mut log_action = format!("Action {} : Vous {} vs {} {}", i+1, symbole(act_j), monstre.nom, symbole(act_m));
        
        if combo_j_count > 1 && *act_j != ActionType::E {
            if monstre.annule_bonus_combo {
                log_action.push_str(log_annulation_j);
            } else {
                log_action.push_str(&format!(" <span class=\"log-combo\">(Combo x{} = {})</span>", combo_j_count, val_j));
            }
        }
        
        if combo_m_count > 1 && *act_m != ActionType::E {
            if joueur.annule_bonus_combo {
                log_action.push_str(log_annulation_m);
            } else {
                log_action.push_str(&format!(" <span class=\"log-combo\">(Combo x{} = {})</span>", combo_m_count, val_m));
            }
        }
        
        if d_joueur.esquive { log_action.push_str(" <br>💨 Vous esquivez !"); }
        else if d_joueur.dmg_arm > 0 || d_joueur.dmg_pv > 0 {
            joueur.armure -= d_joueur.dmg_arm; joueur.pv -= d_joueur.dmg_pv;
            log_action.push_str(&format!(" <br>💥 Vous perdez {} PV.", d_joueur.dmg_pv));
        }

        if d_monstre.esquive { log_action.push_str(" <br>💨 L'ennemi esquive !"); }
        else if d_monstre.dmg_arm > 0 || d_monstre.dmg_pv > 0 {
            monstre.armure -= d_monstre.dmg_arm; monstre.pv -= d_monstre.dmg_pv;
            log_action.push_str(&format!(" <br>💥 L'ennemi perd {} PV.", d_monstre.dmg_pv));
        }
        
        etapes.push(EtapeCombat { 
            est_action: true,
            log: log_action, 
            joueur_pv: joueur.pv, 
            joueur_armure: joueur.armure, 
            joueur_niv_esquive: joueur.niv_esquive as i32,
            monstre_pv: monstre.pv, 
            monstre_armure: monstre.armure,
            monstre_niv_esquive: monstre.niv_esquive as i32
        });
    }

    let mut logs_fin_tour = Vec::new();
    if joueur.pv > 0 && monstre.pv > 0 {
        if monstre.degats_armure_restante_fin_tour && monstre.armure > 0 {
            joueur.pv -= monstre.armure; logs_fin_tour.push(format!("<span class=\"log-mort\">⚔️ Pointes d'Acier : Le Gardien vous inflige des dégâts égaux à son armure restante (-{} PV).</span>", monstre.armure));
        }
        if joueur.degats_armure_restante_fin_tour && joueur.armure > 0 {
            monstre.pv -= joueur.armure; logs_fin_tour.push(format!("<span class=\"log-mort\">⚔️ Pacte de l'Armure II : Vous infligez des dégâts égaux à votre armure restante (-{} PV).</span>", joueur.armure));
        }
        if let Some(x) = monstre.regen_pv_chaque_x_tours {
            if tour_actuel % x == 0 {
                let heal = (monstre.pv_max as f64 * (monstre.regen_pv_pourcentage.unwrap_or(10) as f64 / 100.0)) as i32;
                monstre.pv = std::cmp::min(monstre.pv_max, monstre.pv + heal);
                logs_fin_tour.push(format!("<span class=\"log-tour\">⏳ Restauration Temporelle : Le Gardien récupère une partie de ses PV (+{} PV).</span>", heal));
            }
        }
        if let Some(x) = monstre.perte_pv_chaque_x_tours {
            if tour_actuel % x == 0 {
                let pct = monstre.perte_pv_pourcentage.unwrap_or(10) as f64 / 100.0;
                let perte = if monstre.perte_pv_base_max { (joueur.pv_max as f64 * pct) as i32 } else { (joueur.pv as f64 * pct) as i32 };
                joueur.pv -= perte;
                logs_fin_tour.push(format!("<span class=\"log-mort\">⏳ Altération Temporelle (-{} PV).</span>", perte));
            }
        }
        joueur.armure = 0; monstre.armure = 0; joueur.niv_esquive = 0; monstre.niv_esquive = 0;
    }

    let resultat = ResultatTour { joueur, monstre, actions_monstre, etapes, logs_fin_tour };
    serde_wasm_bindgen::to_value(&resultat).unwrap()
}