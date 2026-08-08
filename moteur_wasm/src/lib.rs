pub mod entite;
pub mod boss_data;
pub mod combat;

use wasm_bindgen::prelude::*;
use serde::Serialize;
use crate::entite::{Entite, ActionType, Synergie};
use crate::combat::{gerer_combo, get_valeur_action, calculer_degats, tenter_critique, MULTIPLICATEUR_CRITIQUE};
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

    // --- NOUVEAU : stats cumulables côté run (écran de fin) ---
    pub degats_infliges: i32,  // PV retirés au monstre par le joueur sur ce step
    pub degats_bloques: i32,   // dégâts absorbés par l'armure du joueur sur ce step
    pub degats_esquives: i32,  // dégâts évités par l'esquive du joueur sur ce step
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
pub fn get_donnees_etages() -> Result<JsValue, JsValue> {
    let etages = get_tous_les_etages();
    serde_wasm_bindgen::to_value(&etages).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn jouer_tour(joueur_js: JsValue, monstre_js: JsValue, actions_joueur_js: JsValue, actions_monstre_js: JsValue, tour_actuel: i32) -> Result<JsValue, JsValue> {
    let mut joueur: Entite = serde_wasm_bindgen::from_value(joueur_js)
        .map_err(|e| JsValue::from_str(&format!("Données joueur invalides : {e}")))?;
    let mut monstre: Entite = serde_wasm_bindgen::from_value(monstre_js)
        .map_err(|e| JsValue::from_str(&format!("Données monstre invalides : {e}")))?;
    let actions_joueur: Vec<ActionType> = serde_wasm_bindgen::from_value(actions_joueur_js)
        .map_err(|e| JsValue::from_str(&format!("Actions joueur invalides : {e}")))?;
    let actions_monstre: Vec<ActionType> = serde_wasm_bindgen::from_value(actions_monstre_js)
        .map_err(|e| JsValue::from_str(&format!("Actions monstre invalides : {e}")))?;

    if actions_joueur.len() != 5 || actions_monstre.len() != 5 {
        return Err(JsValue::from_str("Chaque combattant doit avoir exactement 5 actions programmées."));
    }

    let mut etapes = Vec::new();
    let mut combo_j_type: Option<ActionType> = None; let mut combo_j_count = 0;
    let mut combo_m_type: Option<ActionType> = None; let mut combo_m_count = 0;

    // --- Synergies cachées (joueur uniquement) : état local au tour, remis à zéro à chaque appel. ---
    let synergie_j = joueur.synergie_active.clone();
    // Guerrier : chaque Défense programmée augmente les dégâts de base pour le RESTE du tour
    // (jamais rétroactif sur elle-même) — pas de mutation permanente de joueur.base_a.
    let mut guerrier_bonus_base_a = 0;
    // Ninja : une Esquive réussie arme un Coup Critique pour la PROCHAINE Précise du même tour.
    let mut ninja_crit_pret = false;

    // Même champ que le passif d'armure des boss, côté joueur : c'est la Bénédiction "Pelage
    // d'Acier" qui le lui accorde (l'armure retombant à 0 en fin de tour, il est bien re-crédité
    // à chaque tour).
    if let Some(regen) = joueur.regen_armure_tour {
        joueur.armure += regen;
        etapes.push(EtapeCombat {
            est_action: false,
            log: format!("<span class=\"log-tour\">🐈 Pelage d'Acier : +{} Armure pour ce tour !</span>", regen),
            joueur_pv: joueur.pv,
            joueur_armure: joueur.armure,
            joueur_niv_esquive: joueur.niv_esquive as i32,
            monstre_pv: monstre.pv,
            monstre_armure: monstre.armure,
            monstre_niv_esquive: monstre.niv_esquive as i32,
            degats_infliges: 0,
            degats_bloques: 0,
            degats_esquives: 0,
        });
    }

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
            monstre_niv_esquive: monstre.niv_esquive as i32,
            degats_infliges: 0,
            degats_bloques: 0,
            degats_esquives: 0,
        });
    }

    for i in 0..5 {
        if joueur.pv <= 0 || monstre.pv <= 0 { break; }
        
        let act_j = &actions_joueur[i]; let act_m = &actions_monstre[i];
        // Synergie Assassin ("Danse des Lames") : A et P comptent comme la même action pour la
        // jauge de combo du joueur — jamais pour le monstre.
        let fusion_ap_j = synergie_j == Some(Synergie::Assassin);
        gerer_combo(&mut combo_j_type, &mut combo_j_count, act_j, fusion_ap_j);
        gerer_combo(&mut combo_m_type, &mut combo_m_count, act_m, false);

        // Synergie Guerrier ("Posture du Seigneur de Guerre") : les dégâts de base accumulés par
        // les Défenses précédentes de ce tour s'appliquent à ce calcul (jamais une mutation
        // permanente de joueur.base_a, qui doit retomber à sa vraie valeur en fin de tour).
        let mut joueur_pour_calc = joueur.clone();
        if guerrier_bonus_base_a != 0 { joueur_pour_calc.base_a += guerrier_bonus_base_a; }

        let mut val_j = get_valeur_action(act_j, combo_j_count, &joueur_pour_calc);
        let mut val_m = get_valeur_action(act_m, combo_m_count, &monstre);

        // --- NOUVEAU : CASSAGE DE COMBO ---
        let mut log_annulation_j = "";
        if monstre.annule_bonus_combo && combo_j_count > 1 {
            val_j = get_valeur_action(act_j, 1, &joueur_pour_calc); // Override
            log_annulation_j = " <span class=\"log-mort\">(Votre combo est brisé)</span>";
        }

        let mut log_annulation_m = "";
        if joueur.annule_bonus_combo && combo_m_count > 1 {
            val_m = get_valeur_action(act_m, 1, &monstre); // Override
            log_annulation_m = " <span class=\"log-mort\">(Le combo ennemi est brisé)</span>";
        }

        // Synergie Ninja ("Frappe Insaisissable") : consomme le Coup Critique en attente (armé par
        // une Esquive réussie plus tôt ce tour) sur la prochaine Précise, quel que soit le combo.
        let ninja_critique = synergie_j == Some(Synergie::Ninja) && *act_j == ActionType::P && ninja_crit_pret;
        if ninja_critique {
            val_j *= 2;
            ninja_crit_pret = false;
        }

        // Le niveau d'esquive reste un décompte fidèle du nombre d'actions Esquive enchaînées
        // (jamais de palier sauté) : c'est paliers_esquive_effectifs() qui amplifie le % associé
        // à chaque palier via le Pacte du Combo, pas ce compteur. Voir combat.rs.
        let mut mult_esquive_j = 1;
        if i == 4 && joueur.action_fin_tour_doublee { if *act_j == ActionType::E { mult_esquive_j = 2; } else { val_j *= 2; } }
        if i == 2 && joueur.action_troisieme_triplee { if *act_j == ActionType::E { mult_esquive_j = 3; } else { val_j *= 3; } }

        // Bénédiction "Griffe Acérée" : jet de critique en tout dernier, pour amplifier la valeur
        // réellement portée par le coup (combos et multiplicateurs du Pacte du Temps compris).
        let (val_critique, critique_benediction) = tenter_critique(val_j, act_j, &joueur);
        val_j = val_critique;

        if *act_j == ActionType::D { joueur.armure += val_j; }
        if *act_j == ActionType::E { joueur.niv_esquive = std::cmp::min(3, joueur.niv_esquive + mult_esquive_j); }
        else { joueur.niv_esquive = joueur.niv_esquive.saturating_sub(1); }

        // Synergie Guerrier ("Posture du Seigneur de Guerre") : +2 Armure par Attaque programmée,
        // +2 Dégâts de base pour le reste du tour par Défense programmée (voir joueur_pour_calc
        // plus haut — n'affecte que ce tour, jamais joueur.base_a lui-même).
        if synergie_j == Some(Synergie::Guerrier) {
            if *act_j == ActionType::A { joueur.armure += 2; }
            if *act_j == ActionType::D { guerrier_bonus_base_a += 2; }
        }

        if *act_m == ActionType::D { monstre.armure += val_m; }
        if *act_m == ActionType::E { monstre.niv_esquive = std::cmp::min(3, monstre.niv_esquive + 1); }
        else { monstre.niv_esquive = monstre.niv_esquive.saturating_sub(1); }

        let d_joueur = calculer_degats(act_m, val_m, &monstre, &joueur);
        let d_monstre = calculer_degats(act_j, val_j, &joueur, &monstre);

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
        
        // Explique pourquoi une Esquive jouée ne sert à rien face à un adversaire qui neutralise
        // l'esquive (ex: Le Vent Mortel forme finale, ou le joueur avec le Pacte de l'Ombre II).
        if *act_j == ActionType::E && monstre.bloque_esquive_opposant {
            log_action.push_str(" <span class=\"log-mort\">(Votre esquive est neutralisée !)</span>");
        }
        if *act_m == ActionType::E && joueur.bloque_esquive_opposant {
            log_action.push_str(" <span class=\"log-mort\">(L'esquive ennemie est neutralisée !)</span>");
        }

        if synergie_j == Some(Synergie::Guerrier) {
            if *act_j == ActionType::A { log_action.push_str(" <span class=\"log-combo\">(Posture : +2 Armure)</span>"); }
            if *act_j == ActionType::D { log_action.push_str(" <span class=\"log-combo\">(Posture : +2 Dégâts jusqu'à la fin du tour)</span>"); }
        }
        if ninja_critique {
            log_action.push_str(" <span class=\"log-mort\">💥 Coup Critique !</span>");
        }
        // Pas de valeur répétée ici : le log de combo affiche déjà le total final, crit inclus.
        if critique_benediction {
            log_action.push_str(&format!(" <span class=\"log-mort\">🐾 Griffe Acérée : Coup Critique (x{}) !</span>", MULTIPLICATEUR_CRITIQUE));
        }

        // Dégâts additionnels infligés au monstre par une riposte (Synergie Tank), ajoutés aux
        // stats "dégâts infligés" de ce step comme une attaque normale.
        let mut riposte_degats_infliges = 0;

        if d_joueur.esquive {
            log_action.push_str(" <br>💨 Vous esquivez !");

            // Synergie Ninja ("Frappe Insaisissable") : n'arme le Critique que sur une Esquive
            // choisie et réussie (pas une esquive résiduelle d'une action différente).
            if synergie_j == Some(Synergie::Ninja) && *act_j == ActionType::E {
                ninja_crit_pret = true;
                log_action.push_str(" <span class=\"log-combo\">(Prochaine Précise = Critique !)</span>");
            }

            // Synergie Tank ("Riposte Fluide") : renvoie l'Armure actuelle (avant toute déduction)
            // en dégâts, absorbés par l'armure du monstre comme une Attaque normale, puis soigne
            // le joueur de 10% de cette même valeur d'Armure.
            if synergie_j == Some(Synergie::Tank) && *act_j == ActionType::E && joueur.armure > 0 {
                let degats_riposte = joueur.armure;
                let absorbe = degats_riposte.min(monstre.armure);
                monstre.armure -= absorbe;
                let pv_perdus = degats_riposte - absorbe;
                monstre.pv -= pv_perdus;
                riposte_degats_infliges = pv_perdus;

                let soin = (degats_riposte as f32 * 0.10).round() as i32;
                joueur.pv = std::cmp::min(joueur.pv_max, joueur.pv + soin);

                log_action.push_str(&format!(" <span class=\"log-tour\">⚡ Riposte Fluide : L'ennemi subit {} dégâts, vous récupérez {} PV !</span>", pv_perdus, soin));
            }
        }
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
            monstre_niv_esquive: monstre.niv_esquive as i32,
            degats_infliges: d_monstre.dmg_pv + riposte_degats_infliges,
            degats_bloques: d_joueur.dmg_arm,
            degats_esquives: d_joueur.degats_evites,
        });
    }

    let mut logs_fin_tour = Vec::new();
    if joueur.pv > 0 && monstre.pv > 0 {
        // Ces dégâts de fin de tour ("Pointes d'Acier" / Pacte de l'Armure II) doivent, comme
        // une Attaque normale, être d'abord absorbés par l'armure ACTUELLE de la cible avant de
        // toucher ses PV — auparavant ils ignoraient totalement l'armure de la cible.
        if monstre.degats_armure_restante_fin_tour && monstre.armure > 0 {
            let degats = monstre.armure;
            let absorbe = degats.min(joueur.armure);
            joueur.armure -= absorbe;
            let pv_perdus = degats - absorbe;
            joueur.pv -= pv_perdus;

            if pv_perdus > 0 {
                let detail_absorption = if absorbe > 0 { format!(", {} absorbés par votre armure", absorbe) } else { String::new() };
                logs_fin_tour.push(format!("<span class=\"log-mort\">⚔️ Pointes d'Acier : Le Gardien vous inflige des dégâts égaux à son armure restante (-{} PV{}).</span>", pv_perdus, detail_absorption));
            } else {
                logs_fin_tour.push(format!("<span class=\"log-tour\">🛡️ Pointes d'Acier : Votre armure absorbe entièrement l'assaut du Gardien (-{} armure).</span>", absorbe));
            }
        }
        if joueur.degats_armure_restante_fin_tour && joueur.armure > 0 {
            let degats = joueur.armure;
            let absorbe = degats.min(monstre.armure);
            monstre.armure -= absorbe;
            let pv_perdus = degats - absorbe;
            monstre.pv -= pv_perdus;

            if pv_perdus > 0 {
                let detail_absorption = if absorbe > 0 { format!(", {} absorbés par son armure", absorbe) } else { String::new() };
                logs_fin_tour.push(format!("<span class=\"log-mort\">⚔️ Pacte de l'Armure II : Vous infligez des dégâts égaux à votre armure restante (-{} PV{}).</span>", pv_perdus, detail_absorption));
            } else {
                logs_fin_tour.push(format!("<span class=\"log-tour\">🛡️ Pacte de l'Armure II : Son armure absorbe entièrement votre assaut (-{} armure).</span>", absorbe));
            }
        }
        if let Some(x) = monstre.regen_pv_chaque_x_tours {
            if tour_actuel % x == 0 {
                let heal = (monstre.pv_max as f64 * (monstre.regen_pv_pourcentage.unwrap_or(10) as f64 / 100.0)).round() as i32;
                monstre.pv = std::cmp::min(monstre.pv_max, monstre.pv + heal);
                logs_fin_tour.push(format!("<span class=\"log-tour\">⏳ Restauration Temporelle : Le Gardien récupère une partie de ses PV (+{} PV).</span>", heal));
            }
        }
        if let Some(x) = monstre.perte_pv_chaque_x_tours {
            if tour_actuel % x == 0 {
                let pct = monstre.perte_pv_pourcentage.unwrap_or(10) as f64 / 100.0;
                let perte = if monstre.perte_pv_base_max { (joueur.pv_max as f64 * pct).round() as i32 } else { (joueur.pv as f64 * pct).round() as i32 };
                joueur.pv -= perte;
                logs_fin_tour.push(format!("<span class=\"log-mort\">⏳ Altération Temporelle (-{} PV).</span>", perte));
            }
        }
        joueur.armure = 0; monstre.armure = 0; joueur.niv_esquive = 0; monstre.niv_esquive = 0;
    }

    let resultat = ResultatTour { joueur, monstre, actions_monstre, etapes, logs_fin_tour };
    serde_wasm_bindgen::to_value(&resultat).map_err(|e| JsValue::from_str(&e.to_string()))
}