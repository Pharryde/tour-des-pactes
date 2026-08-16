pub mod entite;
pub mod boss_data;
pub mod combat;

use wasm_bindgen::prelude::*;
use serde::Serialize;
use crate::entite::{Entite, ActionType, Synergie};
use crate::combat::{gerer_combo, get_valeur_action, calculer_degats, tenter_critique, appliquer_foudre, ResultatDegats, MULTIPLICATEUR_CRITIQUE};
use crate::boss_data::get_tous_les_etages;

// Créneaux touchés par l'Étage du Froid. ⚠️ Ils ne sont PAS tirés ici : le joueur doit les voir
// pendant qu'il programme ses actions, donc le tirage a lieu côté TS au début du tour
// (`tirerCreneauxFroid`) et le moteur ne fait que les appliquer. Les tirer ici les rendrait
// impossibles à afficher avant la résolution.
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CreneauxFroid {
    #[serde(default)] pub geles_joueur: Vec<usize>,
    #[serde(default)] pub geles_monstre: Vec<usize>,
    #[serde(default)] pub joueur_dabord: Vec<usize>,
    #[serde(default)] pub monstre_dabord: Vec<usize>,
}

// Dose de poison qui frappera en fin de tour : celle déjà installée PLUS celle accumulée depuis le
// début du tour (les deux s'additionnent, voir convertir_en_poison). Exposée à chaque étape pour que
// la jauge monte action par action au lieu de n'apparaître qu'une fois le tour résolu.
fn poison_affiche(entite: &Entite, dose_du_tour: i32) -> i32 {
    entite.poison_actif.unwrap_or(0) + dose_du_tour
}

// Rappel de la chance d'esquive qui s'appliquait au coup. Muette à 0% (rien à dire quand personne
// ne pouvait esquiver) : ailleurs, c'est ce qui distingue un palier d'esquive atteint d'un simple
// coup de chance, et permet de vérifier que le dérèglement du Froid a bien joué avant la garde.
fn mention_esquive(chance: i32, reussie: bool) -> String {
    if chance <= 0 { return String::new(); }
    let detail = if reussie { format!("{}% d'esquive", chance) } else { format!("{}% d'esquive déjouée", chance) };
    format!(" <span class=\"log-esquive\">({})</span>", detail)
}

// Variation de PV d'un camp sur le tour, formulée du point de vue du lecteur. Un Gardien qui se
// régénère plus qu'il n'encaisse doit se lire comme un GAIN, pas comme une perte négative.
fn variation_pv(depart: i32, arrivee: i32) -> String {
    let delta = arrivee - depart;
    match delta {
        0 => "aucun dégât".to_string(),
        d if d < 0 => format!("-{} PV", -d),
        d => format!("+{} PV", d),
    }
}

fn aucun_degat() -> ResultatDegats {
    ResultatDegats { dmg_arm: 0, dmg_pv: 0, esquive: false, degats_evites: 0, chance_esquive: 0, brulure_posee: 0, poison_pose: 0, foudre_appliquee: false, valeur_appliquee: 0 }
}

// Monte la garde d'une entité d'après l'action qu'elle vient de jouer : armure gagnée par une
// Défense, jauge d'esquive qui monte d'un palier ou redescend.
fn monter_garde(entite: &mut Entite, action: &ActionType, valeur: i32, mult_esquive: usize) {
    if *action == ActionType::D { entite.armure += valeur; }
    if *action == ActionType::E { entite.niv_esquive = std::cmp::min(3, entite.niv_esquive + mult_esquive); }
    else { entite.niv_esquive = entite.niv_esquive.saturating_sub(1); }
}

// Action gelée (Étage du Froid) : elle n'a pas lieu, donc aucune garde ne se monte — mais la jauge
// d'esquive redescend quand même, exactement comme après n'importe quelle action qui n'est pas une
// Esquive. Sans ça, se faire geler PROTÉGERAIT son palier d'esquive au lieu de le coûter : trois
// Esquives puis un gel laissaient le joueur à 100% alors qu'il devrait être retombé à 75%.
fn subir_gel(entite: &mut Entite) {
    entite.niv_esquive = entite.niv_esquive.saturating_sub(1);
}

// Idem, plus le +2 Armure par Attaque de la Synergie Guerrier — indissociable de la garde du joueur.
fn monter_garde_joueur(joueur: &mut Entite, action: &ActionType, valeur: i32, mult_esquive: usize, guerrier: bool) {
    monter_garde(joueur, action, valeur, mult_esquive);
    if guerrier && *action == ActionType::A { joueur.armure += 2; }
}

fn encaisser(cible: &mut Entite, degats: &ResultatDegats) {
    cible.armure -= degats.dmg_arm;
    cible.pv -= degats.dmg_pv;
}

// Calcule le coup puis, selon l'action, le convertit en brûlure (Attaque) ou en poison (Précise).
// NE retire encore rien aux PV/armure : c'est `encaisser` qui le fait, au moment voulu par l'ordre
// de résolution du créneau. `poison_du_tour` accumule les doses du tour (voir convertir_en_poison).
// `sur_creneau_froid` : ce créneau a été touché par le Froid en faveur de l'attaquant (il agit avant
// l'autre, ou l'action adverse y est gelée). Seule la Synergie Élémentaire s'en sert.
fn calculer_et_appliquer_etats(attaquant: &Entite, cible: &mut Entite, action: &ActionType, valeur: i32, sur_creneau_froid: bool, poison_du_tour: &mut i32) -> ResultatDegats {
    let degats = calculer_degats(action, valeur, attaquant, cible);
    let degats = convertir_en_brulure(attaquant, cible, action, valeur, degats);
    convertir_en_poison(attaquant, action, valeur, sur_creneau_froid, poison_du_tour, degats)
}

// Part de l'action convertie en brûlure (Attaque) ou en poison (Précise), arrondie ICI et pas plus
// tard. ⚠️ L'arrondi doit tomber sur la valeur de base, AVANT les multiplicateurs de tour (Pacte du
// Temps, critique) : c'est la seule façon que la dose annoncée au joueur reste la dose de référence.
// Avec 7 de Précise et un Pacte du Poison I, on affiche « 🧪 4 » — une 5e action doublée doit alors
// en poser 8, pas 7 (soit round(7*0.5)*2 et non round(7*2*0.5)).
fn convertir_valeur(valeur: i32, action: &ActionType, entite: &Entite) -> i32 {
    let multiplicateur = match action {
        ActionType::A => entite.multiplicateur_brulure,
        ActionType::P => entite.multiplicateur_poison,
        _ => None,
    };
    match multiplicateur {
        Some(m) => (valeur as f32 * m).round() as i32,
        None => valeur,
    }
}

// Étage du Feu : l'ATTAQUE (et elle seule) cesse de blesser directement — elle devient une brûlure
// qui s'AJOUTE à celle en cours. Une Attaque à 12 puis une à 34 posent donc 46 de brûlure, pas deux
// fois une valeur forfaitaire. Elle se résout en fin de tour, jusqu'à extinction, même après la mort
// de celui qui l'a allumée. Une esquive coupe la conversion : la brûlure reste esquivable.
// `dose` arrive DÉJÀ convertie (voir convertir_valeur) : ici on ne fait plus que la poser.
// Renvoie les dégâts à appliquer réellement : nuls dès qu'il y a conversion.
fn convertir_en_brulure(attaquant: &Entite, cible: &mut Entite, action: &ActionType, dose: i32, degats: ResultatDegats) -> ResultatDegats {
    if attaquant.multiplicateur_brulure.is_none() { return degats; }
    if *action != ActionType::A || degats.esquive { return degats; }

    // Synergie Élémentaire : la brûlure profite du Pacte de la Foudre. Sans ça elle passe à côté,
    // le multiplicateur vivant dans `calculer_degats` — dont une action convertie sort à zéro.
    let amplifiee = if attaquant.synergie_active == Some(Synergie::Elementaire) {
        appliquer_foudre(dose, attaquant, cible)
    } else { dose };

    cible.brulure_active = Some(cible.brulure_active.unwrap_or(0) + amplifiee);
    ResultatDegats {
        brulure_posee: amplifiee,
        valeur_appliquee: amplifiee,
        chance_esquive: degats.chance_esquive,
        foudre_appliquee: amplifiee != dose,
        ..aucun_degat()
    }
}

// Étage du Poison : miroir exact sur la PRÉCISE. Les doses s'additionnent sans jamais décroître —
// dans le tour comme d'un tour à l'autre. C'est ce qui fait du poison une course contre la montre :
// laisser traîner un combat coûte de plus en plus cher à chaque tour.
fn convertir_en_poison(attaquant: &Entite, action: &ActionType, dose: i32, sur_creneau_froid: bool, poison_du_tour: &mut i32, degats: ResultatDegats) -> ResultatDegats {
    if attaquant.multiplicateur_poison.is_none() { return degats; }
    if *action != ActionType::P || degats.esquive { return degats; }

    // Pacte de l'Ombre : il double les dégâts de la Précise, donc aussi la dose de poison qu'elle
    // devient. Son doublage vit dans `calculer_degats`, dont une action convertie ressort à zéro :
    // sans cette reprise, associer l'Ombre et le Poison désactivait purement et simplement l'Ombre.
    // La dose étant déjà entière (arrondie par `convertir_valeur`), ce ×2 reste exact.
    let dose = if attaquant.degats_precis_doubles { dose * 2 } else { dose };
    // Synergie Élémentaire : une dose injectée sur un créneau où le Froid est intervenu compte double.
    let dose = if sur_creneau_froid && attaquant.synergie_active == Some(Synergie::Elementaire) { dose * 2 } else { dose };

    *poison_du_tour += dose;
    ResultatDegats { poison_pose: dose, valeur_appliquee: dose, chance_esquive: degats.chance_esquive, ..aucun_degat() }
}

// Tics de fin de tour. La brûlure se fait absorber par l'armure restante puis est divisée par deux
// (elle s'éteint d'elle-même si on survit à l'assaut) ; le poison, lui, traverse l'armure, ne décroît
// jamais et s'alourdit à chaque tour où une dose est posée — il ne pardonne que la vitesse.
fn tics_de_fin_de_tour(entite: &mut Entite, sujet: &str) -> Vec<String> {
    let mut logs = Vec::new();

    if let Some(brulure) = entite.brulure_active {
        if brulure > 0 {
            let absorbe = brulure.min(entite.armure);
            entite.armure -= absorbe;
            let pv_perdus = brulure - absorbe;
            entite.pv -= pv_perdus;
            let detail = if absorbe > 0 { format!(", {} absorbés par l'armure", absorbe) } else { String::new() };
            logs.push(format!("<span class=\"log-mort\">🔥 Brûlure : {} {} PV{}.</span>", sujet, pv_perdus, detail));
        }
        let suivante = brulure / 2;
        entite.brulure_active = if suivante > 0 { Some(suivante) } else { None };
    }

    if let Some(poison) = entite.poison_actif {
        if poison > 0 {
            entite.pv -= poison;
            logs.push(format!("<span class=\"log-mort\">🧪 Poison : {} {} PV (l'armure n'y change rien).</span>", sujet, poison));
        }
    }

    logs
}

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

    // États différés tels qu'ils sont APRÈS cette étape : sans eux, l'interface ne peut afficher
    // la brûlure et le poison qu'une fois le tour entièrement résolu, alors que ces jauges se
    // remplissent action par action — c'est justement leur montée qu'il faut pouvoir suivre.
    pub joueur_brulure: i32,
    pub joueur_poison: i32,
    pub monstre_brulure: i32,
    pub monstre_poison: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultatTour {
    pub joueur: Entite,
    pub monstre: Entite,
    pub actions_monstre: Vec<ActionType>,
    pub etapes: Vec<EtapeCombat>,
    pub logs_fin_tour: Vec<String>,

    // Créneaux touchés par l'Étage du Froid, remontés à l'interface pour qu'elle les marque
    // directement sur les cases d'action : une ligne de journal ne suffit pas à voir QUELLE action
    // a été gelée ou jouée en premier.
    pub creneaux_geles_joueur: Vec<usize>,
    pub creneaux_geles_monstre: Vec<usize>,
    pub creneaux_joueur_dabord: Vec<usize>,
    pub creneaux_monstre_dabord: Vec<usize>,
}

// Le Feu et le Poison REMPLACENT l'action au lieu de s'y ajouter : garder ⚔️/🎯 laisserait croire
// que le coup a porté alors qu'il n'a fait qu'allumer une brûlure ou injecter une dose. Miroir de
// `symbolePour()` côté TS (utils/combat.ts), qui fait de même sur les cases d'action et les stats.
fn symbole(act: &ActionType, entite: &Entite) -> &'static str {
    match act {
        ActionType::A if entite.multiplicateur_brulure.is_some() => "🔥",
        ActionType::P if entite.multiplicateur_poison.is_some() => "🧪",
        ActionType::A => "⚔️",
        ActionType::P => "🎯",
        ActionType::D => "🛡️",
        ActionType::E => "💨",
    }
}

#[wasm_bindgen]
pub fn get_donnees_etages() -> Result<JsValue, JsValue> {
    let etages = get_tous_les_etages();
    serde_wasm_bindgen::to_value(&etages).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn jouer_tour(joueur_js: JsValue, monstre_js: JsValue, actions_joueur_js: JsValue, actions_monstre_js: JsValue, tour_actuel: i32, creneaux_js: JsValue) -> Result<JsValue, JsValue> {
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

    // PV de départ, avant la moindre résolution : ils servent au bilan chiffré de fin de tour.
    let pv_joueur_debut_tour = joueur.pv;
    let pv_monstre_debut_tour = monstre.pv;

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
    // Doses de poison posées pendant CE tour, par camp. Elles s'additionnent ici puis sont
    // comparées à la dose déjà en cours en fin de tour (voir convertir_en_poison).
    let mut poison_sur_joueur = 0;
    let mut poison_sur_monstre = 0;

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
            joueur_brulure: joueur.brulure_active.unwrap_or(0),
            joueur_poison: poison_affiche(&joueur, poison_sur_joueur),
            monstre_brulure: monstre.brulure_active.unwrap_or(0),
            monstre_poison: poison_affiche(&monstre, poison_sur_monstre),
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
            joueur_brulure: joueur.brulure_active.unwrap_or(0),
            joueur_poison: poison_affiche(&joueur, poison_sur_joueur),
            monstre_brulure: monstre.brulure_active.unwrap_or(0),
            monstre_poison: poison_affiche(&monstre, poison_sur_monstre),
        });
    }

    // Étage du Froid : créneaux déréglés / gelés, tirés côté TS AVANT le tour pour être affichés
    // pendant la phase de choix des actions (voir CreneauxFroid).
    let creneaux: CreneauxFroid = serde_wasm_bindgen::from_value(creneaux_js).unwrap_or_default();
    let creneaux_monstre_dabord = creneaux.monstre_dabord;
    let creneaux_joueur_dabord = creneaux.joueur_dabord;
    let creneaux_geles_joueur = creneaux.geles_joueur;
    let creneaux_geles_monstre = creneaux.geles_monstre;

    for i in 0..5 {
        if joueur.pv <= 0 || monstre.pv <= 0 { break; }

        let act_j = &actions_joueur[i]; let act_m = &actions_monstre[i];

        // Une action gelée est purement et simplement annulée : elle ne monte aucune garde,
        // n'inflige rien, et ne fait pas avancer la jauge de combo de son camp.
        let gele_j = creneaux_geles_joueur.contains(&i);
        let gele_m = creneaux_geles_monstre.contains(&i);

        // Synergie Assassin ("Danse des Lames") : A et P comptent comme la même action pour la
        // jauge de combo du joueur — jamais pour le monstre.
        let fusion_ap_j = synergie_j == Some(Synergie::Assassin);
        if !gele_j { gerer_combo(&mut combo_j_type, &mut combo_j_count, act_j, fusion_ap_j); }
        if !gele_m { gerer_combo(&mut combo_m_type, &mut combo_m_count, act_m, false); }

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

        // ⚠️ Conversion Feu/Poison ICI, avant tout multiplicateur de tour : à partir de ce point,
        // `val_j`/`val_m` ne sont plus des dégâts mais une DOSE, et les multiplicateurs qui suivent
        // (Ninja, Pacte du Temps, critique) portent sur cette dose entière. C'est ce qui garantit
        // que le joueur à qui l'on affiche « 🧪 4 » obtienne bien 8 sur une 5e action doublée, au
        // lieu des 7 que donnerait un arrondi effectué après coup.
        val_j = convertir_valeur(val_j, act_j, &joueur);
        val_m = convertir_valeur(val_m, act_m, &monstre);

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

        // --- Ordre de résolution du créneau (Étage du Froid) ---
        // Par défaut les deux camps agissent en SIMULTANÉ : les deux gardes se lèvent, puis les deux
        // dégâts sont calculés sur ce même état — aucun ne profite de l'action de l'autre. Sur un
        // créneau déréglé, le camp qui porte le pouvoir agit AVANT : une Défense programmée en face
        // arrive trop tard pour amortir son coup, alors que sa propre garde, elle, absorbe bien.
        let guerrier = synergie_j == Some(Synergie::Guerrier);
        let mut d_joueur = aucun_degat();
        let mut d_monstre = aucun_degat();

        // Créneaux où le Froid est intervenu en faveur d'un camp : il y agit avant l'autre, ou
        // l'action adverse y est gelée. Seule la Synergie Élémentaire s'en sert (poison doublé).
        let froid_pour_joueur = creneaux_joueur_dabord.contains(&i) || gele_m;
        let froid_pour_monstre = creneaux_monstre_dabord.contains(&i) || gele_j;

        // ⚠️ Sur un créneau déréglé, celui qui frappe en premier frappe VRAIMENT en premier : si son
        // coup est fatal, l'autre n'a plus l'occasion de riposter. Sans cette garde, le dérèglement
        // n'était qu'un ordre d'affichage — on tuait son adversaire et on encaissait quand même son
        // attaque. (En simultané, au contraire, le double KO est le comportement voulu.)
        if creneaux_monstre_dabord.contains(&i) {
            if gele_m { subir_gel(&mut monstre); }
            if gele_j { subir_gel(&mut joueur); }
            if !gele_m {
                monter_garde(&mut monstre, act_m, val_m, 1);
                d_joueur = calculer_et_appliquer_etats(&monstre, &mut joueur, act_m, val_m, froid_pour_monstre, &mut poison_sur_joueur);
                encaisser(&mut joueur, &d_joueur);
            }
            if !gele_j && joueur.pv > 0 {
                monter_garde_joueur(&mut joueur, act_j, val_j, mult_esquive_j, guerrier);
                d_monstre = calculer_et_appliquer_etats(&joueur, &mut monstre, act_j, val_j, froid_pour_joueur, &mut poison_sur_monstre);
                encaisser(&mut monstre, &d_monstre);
            }
        } else if creneaux_joueur_dabord.contains(&i) {
            if gele_j { subir_gel(&mut joueur); }
            if gele_m { subir_gel(&mut monstre); }
            if !gele_j {
                monter_garde_joueur(&mut joueur, act_j, val_j, mult_esquive_j, guerrier);
                d_monstre = calculer_et_appliquer_etats(&joueur, &mut monstre, act_j, val_j, froid_pour_joueur, &mut poison_sur_monstre);
                encaisser(&mut monstre, &d_monstre);
            }
            if !gele_m && monstre.pv > 0 {
                monter_garde(&mut monstre, act_m, val_m, 1);
                d_joueur = calculer_et_appliquer_etats(&monstre, &mut joueur, act_m, val_m, froid_pour_monstre, &mut poison_sur_joueur);
                encaisser(&mut joueur, &d_joueur);
            }
        } else {
            if gele_j { subir_gel(&mut joueur); } else { monter_garde_joueur(&mut joueur, act_j, val_j, mult_esquive_j, guerrier); }
            if gele_m { subir_gel(&mut monstre); } else { monter_garde(&mut monstre, act_m, val_m, 1); }
            if !gele_m { d_joueur = calculer_et_appliquer_etats(&monstre, &mut joueur, act_m, val_m, froid_pour_monstre, &mut poison_sur_joueur); }
            if !gele_j { d_monstre = calculer_et_appliquer_etats(&joueur, &mut monstre, act_j, val_j, froid_pour_joueur, &mut poison_sur_monstre); }
            encaisser(&mut joueur, &d_joueur);
            encaisser(&mut monstre, &d_monstre);
        }

        // Synergie Guerrier ("Posture du Seigneur de Guerre") : +2 Dégâts de base pour le RESTE du
        // tour par Défense programmée (voir joueur_pour_calc plus haut — n'affecte que ce tour,
        // jamais joueur.base_a lui-même). Le +2 Armure par Attaque, lui, part avec la garde.
        if guerrier && !gele_j && *act_j == ActionType::D { guerrier_bonus_base_a += 2; }


        let mut log_action = format!("Action {} : Vous {} vs {} {}", i+1, symbole(act_j, &joueur), monstre.nom, symbole(act_m, &monstre));
        
        // Pas de mention de combo sur un créneau gelé : l'action n'a pas eu lieu, afficher sa
        // valeur laisserait croire qu'elle a porté (et le compteur n'a de toute façon pas bougé).
        // Valeur annoncée par la jauge de combo : celle RÉELLEMENT portée par le coup, pas la valeur
        // brute. Sur l'Étage de la Foudre, la seconde ment d'un facteur 1,5 à 3 dès que la cible
        // porte de l'armure — le joueur voyait « Combo x3 = 20 » pour un coup qui en infligeait 60.
        // `valeur_appliquee` vaut 0 sur une Défense ou une Esquive : on retombe alors sur la valeur brute.
        let affichage_j = if d_monstre.valeur_appliquee > 0 { d_monstre.valeur_appliquee } else { val_j };
        let affichage_m = if d_joueur.valeur_appliquee > 0 { d_joueur.valeur_appliquee } else { val_m };

        if combo_j_count > 1 && *act_j != ActionType::E && !gele_j {
            if monstre.annule_bonus_combo {
                log_action.push_str(log_annulation_j);
            } else {
                log_action.push_str(&format!(" <span class=\"log-combo\">(Combo x{} = {})</span>", combo_j_count, affichage_j));
            }
        }

        if combo_m_count > 1 && *act_m != ActionType::E && !gele_m {
            if joueur.annule_bonus_combo {
                log_action.push_str(log_annulation_m);
            } else {
                log_action.push_str(&format!(" <span class=\"log-combo\">(Combo x{} = {})</span>", combo_m_count, affichage_m));
            }
        }
        
        // Étage du Froid : sans ces mentions, une action gelée ou déréglée passerait pour un bug
        // (rien ne se produit, ou la Défense semble n'avoir servi à rien).
        if gele_j { log_action.push_str(" <span class=\"log-mort\">❄️ Votre action est GELÉE !</span>"); }
        if gele_m { log_action.push_str(" <span class=\"log-combo\">❄️ L'action ennemie est gelée !</span>"); }
        if creneaux_monstre_dabord.contains(&i) {
            log_action.push_str(" <span class=\"log-mort\">❄️ (Résolution déréglée : l'ennemi agit avant vous)</span>");
        }
        if creneaux_joueur_dabord.contains(&i) {
            log_action.push_str(" <span class=\"log-combo\">❄️ (Résolution déréglée : vous agissez avant l'ennemi)</span>");
        }

        // Explique pourquoi une Esquive jouée ne sert à rien face à un adversaire qui neutralise
        // l'esquive (ex: Le Vent Mortel forme finale, ou le joueur avec le Pacte de l'Ombre II).
        if *act_j == ActionType::E && monstre.bloque_esquive_opposant {
            log_action.push_str(" <span class=\"log-mort\">(Votre esquive est neutralisée !)</span>");
        }
        if *act_m == ActionType::E && joueur.bloque_esquive_opposant {
            log_action.push_str(" <span class=\"log-mort\">(L'esquive ennemie est neutralisée !)</span>");
        }

        // ⚠️ `!gele_j` : une action gelée n'accorde AUCUN bonus de posture (ni l'armure, tributaire
        // de `monter_garde_joueur`, ni les dégâts, tributaires de `guerrier_bonus_base_a` — les deux
        // sont déjà sautés plus haut). Sans cette garde, seul le JOURNAL prétendait le contraire.
        if synergie_j == Some(Synergie::Guerrier) && !gele_j {
            if *act_j == ActionType::A { log_action.push_str(" <span class=\"log-combo\">(Posture : +2 Armure)</span>"); }
            if *act_j == ActionType::D { log_action.push_str(" <span class=\"log-combo\">(Posture : +2 Dégâts jusqu'à la fin du tour)</span>"); }
        }
        // Synergie Élémentaire : les deux effets sont invisibles dans le total (une brûlure amplifiée
        // ou un poison doublé ressemblent à un simple gros chiffre), d'où ces mentions explicites.
        if synergie_j == Some(Synergie::Elementaire) {
            if d_monstre.brulure_posee > 0 && d_monstre.foudre_appliquee {
                log_action.push_str(" <span class=\"log-combo\">⚡ Élémentaire : Brûlure amplifiée par la Foudre</span>");
            }
            if d_monstre.poison_pose > 0 && froid_pour_joueur {
                log_action.push_str(" <span class=\"log-combo\">❄️ Élémentaire : Poison doublé par le Froid</span>");
            }
        }
        if ninja_critique {
            log_action.push_str(" <span class=\"log-mort\">💥 Coup Critique !</span>");
        }
        // Pas de valeur répétée ici : le log de combo affiche déjà le total final, crit inclus.
        // Classe dédiée (et non log-mort) : au milieu d'une ligne d'action dense, un critique doit
        // se repérer d'un coup d'œil au lieu de se confondre avec les lignes de dégâts.
        if critique_benediction {
            log_action.push_str(&format!(" <span class=\"log-critique\">🐾 GRIFFE ACÉRÉE — COUP CRITIQUE x{} !</span>", MULTIPLICATEUR_CRITIQUE));
        }

        // Dégâts additionnels infligés au monstre par une riposte (Synergie Tank), ajoutés aux
        // stats "dégâts infligés" de ce step comme une attaque normale.
        let mut riposte_degats_infliges = 0;

        if d_joueur.esquive {
            log_action.push_str(&format!(" <br>💨 Vous esquivez !{}", mention_esquive(d_joueur.chance_esquive, true)));

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
        // Les PV/armure ont déjà été retirés plus haut par `encaisser`, dans l'ordre de résolution
        // du créneau : ici on ne fait plus que rédiger le journal.
        else if d_joueur.brulure_posee > 0 {
            log_action.push_str(&format!(" <br>🔥 Vous prenez feu : +{} de brûlure.{}", d_joueur.brulure_posee, mention_esquive(d_joueur.chance_esquive, false)));
        }
        else if d_joueur.poison_pose > 0 {
            log_action.push_str(&format!(" <br>🧪 Vous êtes empoisonné : +{} de poison.{}", d_joueur.poison_pose, mention_esquive(d_joueur.chance_esquive, false)));
        }
        else if d_joueur.dmg_arm > 0 || d_joueur.dmg_pv > 0 {
            log_action.push_str(&format!(" <br>💥 Vous perdez {} PV.{}", d_joueur.dmg_pv, mention_esquive(d_joueur.chance_esquive, false)));
        }

        if d_monstre.esquive {
            log_action.push_str(&format!(" <br>💨 L'ennemi esquive !{}", mention_esquive(d_monstre.chance_esquive, true)));
        }
        else if d_monstre.brulure_posee > 0 {
            log_action.push_str(&format!(" <br>🔥 L'ennemi s'embrase : +{} de brûlure.{}", d_monstre.brulure_posee, mention_esquive(d_monstre.chance_esquive, false)));
        }
        else if d_monstre.poison_pose > 0 {
            log_action.push_str(&format!(" <br>🧪 L'ennemi s'empoisonne : +{} de poison.{}", d_monstre.poison_pose, mention_esquive(d_monstre.chance_esquive, false)));
        }
        else if d_monstre.dmg_arm > 0 || d_monstre.dmg_pv > 0 {
            log_action.push_str(&format!(" <br>💥 L'ennemi perd {} PV.{}", d_monstre.dmg_pv, mention_esquive(d_monstre.chance_esquive, false)));
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
            joueur_brulure: joueur.brulure_active.unwrap_or(0),
            joueur_poison: poison_affiche(&joueur, poison_sur_joueur),
            monstre_brulure: monstre.brulure_active.unwrap_or(0),
            monstre_poison: poison_affiche(&monstre, poison_sur_monstre),
        });
    }

    let mut logs_fin_tour = Vec::new();
    // Photographiés AVANT les tics de fin de tour pour que le bilan les inclue : c'est justement là
    // que tombent la brûlure, le poison et les assauts d'armure, les pertes les plus faciles à rater.
    let pv_joueur_depart = pv_joueur_debut_tour;
    let pv_monstre_depart = pv_monstre_debut_tour;

    // Les doses posées ce tour-ci s'AJOUTENT au poison déjà installé : 10 au tour 1 puis 10 au
    // tour 2 font 20, et ainsi de suite. Rien ne le fait jamais redescendre.
    if poison_sur_joueur > 0 {
        joueur.poison_actif = Some(joueur.poison_actif.unwrap_or(0) + poison_sur_joueur);
    }
    if poison_sur_monstre > 0 {
        monstre.poison_actif = Some(monstre.poison_actif.unwrap_or(0) + poison_sur_monstre);
    }

    // ⚠️ Brûlure et poison se résolvent HORS de la garde « les deux sont vivants » : tuer son
    // adversaire n'annule pas ce qu'on a déjà dans les veines. Le reste des effets de fin de tour
    // (assauts d'armure, régénérations) n'a lui plus de sens si le combat est terminé.
    logs_fin_tour.extend(tics_de_fin_de_tour(&mut joueur, "vous perdez"));
    logs_fin_tour.extend(tics_de_fin_de_tour(&mut monstre, "l'ennemi perd"));

    if joueur.pv > 0 && monstre.pv > 0 {
        // Assauts d'armure de fin de tour ("Pointes d'Acier" / Pacte de l'Armure II).
        // ⚠️ Les deux camps sont résolus sur le MÊME instantané d'armure, pris avant tout échange :
        // en séquence, celui qui frappait en second n'avait plus que le reliquat de son armure,
        // déjà entamé par l'assaut adverse — le résultat dépendait donc de l'ordre du code.
        // Et l'armure lancée est DÉPENSÉE : elle ne peut pas en plus servir de bouclier contre
        // l'assaut d'en face. Deux porteurs face à face encaissent donc tout, chacun de son côté.
        let armure_j = joueur.armure;
        let armure_m = monstre.armure;
        let assaut_m = monstre.degats_armure_restante_fin_tour && armure_m > 0;
        let assaut_j = joueur.degats_armure_restante_fin_tour && armure_j > 0;
        let bouclier_j = if assaut_j { 0 } else { armure_j };
        let bouclier_m = if assaut_m { 0 } else { armure_m };

        if assaut_m {
            let absorbe = armure_m.min(bouclier_j);
            joueur.armure -= absorbe;
            let pv_perdus = armure_m - absorbe;
            joueur.pv -= pv_perdus;

            if pv_perdus > 0 {
                let detail_absorption = if absorbe > 0 { format!(", {} absorbés par votre armure", absorbe) } else { String::new() };
                logs_fin_tour.push(format!("<span class=\"log-mort\">⚔️ Pointes d'Acier : Le Gardien vous inflige des dégâts égaux à son armure restante (-{} PV{}).</span>", pv_perdus, detail_absorption));
            } else {
                logs_fin_tour.push(format!("<span class=\"log-tour\">🛡️ Pointes d'Acier : Votre armure absorbe entièrement l'assaut du Gardien (-{} armure).</span>", absorbe));
            }
        }
        if assaut_j {
            let absorbe = armure_j.min(bouclier_m);
            monstre.armure -= absorbe;
            let pv_perdus = armure_j - absorbe;
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

    // Bilan chiffré du tour. Un tour se lit sur une dizaine de lignes éparpillées (cinq actions,
    // des tics, des assauts d'armure) : sans ce total, savoir qui a pris le dessus demande de tout
    // additionner de tête.
    logs_fin_tour.push(format!(
        "<span class=\"log-bilan\">📊 Bilan du tour — Vous : {} · {} : {}</span>",
        variation_pv(pv_joueur_depart, joueur.pv),
        monstre.nom,
        variation_pv(pv_monstre_depart, monstre.pv),
    ));

    let resultat = ResultatTour {
        joueur, monstre, actions_monstre, etapes, logs_fin_tour,
        creneaux_geles_joueur, creneaux_geles_monstre, creneaux_joueur_dabord, creneaux_monstre_dabord,
    };
    serde_wasm_bindgen::to_value(&resultat).map_err(|e| JsValue::from_str(&e.to_string()))
}