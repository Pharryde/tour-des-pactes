use crate::entite::{ActionType, Entite, StructureEtage};

// Fonction utilitaire pour éviter de réécrire les 20 propriétés à chaque monstre
fn creer_base(nom: &str, pv: i32, base_a: i32, base_p: i32, base_d: i32, paliers: Vec<i32>, actions: Vec<ActionType>) -> Entite {
    Entite {
        nom: nom.to_string(),
        pv,
        pv_max: pv,
        armure: 0,
        niv_esquive: 0,
        base_a,
        base_p,
        base_d,
        paliers_esquive: paliers,
        actions_possibles: actions,
        regen_armure_tour: None,
        chance_combo: None,
        combo_multiplicateur: None,
        combo_multiplicateur_valeur: None,
        actions_cachees: false,
        degats_precis_doubles: false,
        perte_pv_chaque_x_tours: None,
        perte_pv_pourcentage: None,
        perte_pv_base_max: false,
        action_fin_tour_doublee: false,
        action_troisieme_triplee: false,
        regen_pv_chaque_x_tours: None,
        regen_pv_pourcentage: None,
        inflige_degats_chaque_x_tours: None,
        inflige_degats_pourcentage_pv_max_joueur: None,
        bloque_esquive_opposant: false,
        degats_armure_restante_fin_tour: false,
    }
}

pub fn get_etage_armure() -> StructureEtage {
    let mut boss_h = creer_base("👑 Le Mur de Fer (Héroïque)", 100, 12, 5, 15, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D]);
    boss_h.armure = 5;
    boss_h.regen_armure_tour = Some(5);

    let mut boss_h2 = creer_base("👑 Le Mur de Fer (Lvl 2)", 100, 12, 5, 15, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D]);
    boss_h2.armure = 5;
    boss_h2.regen_armure_tour = Some(5);
    boss_h2.degats_armure_restante_fin_tour = true;

    StructureEtage {
        nom: "Étage de l'Armure".to_string(),
        monstres: vec![
            creer_base("Garde Novice", 30, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D]),
            creer_base("Sentinelle Lourde", 40, 10, 4, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D]),
            creer_base("Chevalier d'Élite", 50, 10, 4, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D]),
        ],
        boss_normal: creer_base("👑 BOSS: Le Mur de Fer", 80, 10, 6, 15, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D]),
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_etage_esquive() -> StructureEtage {
    let mut boss_h2 = creer_base("👑 Le Vent Mortel (Lvl 2)", 90, 12, 6, 0, vec![10, 70, 95, 100], vec![ActionType::A, ActionType::P, ActionType::E]);
    boss_h2.bloque_esquive_opposant = true;

    StructureEtage {
        nom: "Étage de la Vitesse".to_string(),
        monstres: vec![
            creer_base("Voleur Rapide", 25, 8, 5, 5, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::E]),
            creer_base("Assassin de l'Ombre", 35, 12, 6, 5, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::E]),
            creer_base("Maître de l'Illusion", 45, 10, 8, 5, vec![0, 55, 80, 100], vec![ActionType::A, ActionType::P, ActionType::E]),
        ],
        boss_normal: creer_base("👑 BOSS: Le Vent Mortel", 70, 15, 8, 0, vec![0, 60, 90, 100], vec![ActionType::A, ActionType::P, ActionType::E]),
        boss_heroique: creer_base("👑 Le Vent Mortel (Héroïque)", 90, 12, 6, 0, vec![10, 70, 95, 100], vec![ActionType::A, ActionType::P, ActionType::E]),
        boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_etage_combo() -> StructureEtage {
    let mut adepte = creer_base("Adepte du Rythme", 30, 8, 4, 8, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); adepte.chance_combo = Some(50);
    let mut batteur = creer_base("Batteur Fou", 40, 10, 5, 8, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); batteur.chance_combo = Some(50);
    let mut chore = creer_base("Chorégraphe de Sang", 55, 10, 5, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); chore.chance_combo = Some(50);
    
    let mut boss = creer_base("👑 BOSS: L'Harmonie Brisée", 85, 10, 5, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); 
    boss.chance_combo = Some(50);
    
    let mut boss_h = creer_base("👑 L'Harmonie Brisée (Héroïque)", 110, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]);
    boss_h.chance_combo = Some(50); boss_h.combo_multiplicateur = Some(1.5);

    let mut boss_h2 = creer_base("👑 L'Harmonie Brisée (Lvl 2)", 110, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]);
    boss_h2.chance_combo = Some(50); boss_h2.combo_multiplicateur = Some(2.0);

    StructureEtage { nom: "Étage du Combo".to_string(), monstres: vec![adepte, batteur, chore], boss_normal: boss, boss_heroique: boss_h, boss_heroique_lvl2: boss_h2 }
}

pub fn get_etage_vie() -> StructureEtage {
    StructureEtage {
        nom: "Étage de la Vie".to_string(),
        monstres: vec![
            creer_base("Adepte de Chair", 60, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
            creer_base("Béhémoth Sanguin", 80, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
            creer_base("Goliath Sans Visage", 100, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
        ],
        boss_normal: creer_base("👑 BOSS: L'Anomalie", 160, 10, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
        boss_heroique: creer_base("👑 L'Anomalie (Héroïque)", 200, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
        boss_heroique_lvl2: creer_base("👑 L'Anomalie (Lvl 2)", 300, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
    }
}

pub fn get_etage_ombre() -> StructureEtage {
    let mut ombre = creer_base("Ombre Rôdeuse", 35, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); ombre.actions_cachees = true;
    let mut traqueur = creer_base("Traqueur Invisible", 45, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); traqueur.actions_cachees = true;
    let mut spectre = creer_base("Spectre de la Tour", 60, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); spectre.actions_cachees = true;
    
    let mut boss = creer_base("👑 BOSS: Le Cauchemar", 90, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); boss.actions_cachees = true;
    let mut boss_h = creer_base("👑 Le Cauchemar (Héroïque)", 120, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); boss_h.actions_cachees = true;
    let mut boss_h2 = creer_base("👑 Le Cauchemar (Lvl 2)", 120, 12, 5, 12, vec![30, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]); boss_h2.actions_cachees = true;

    StructureEtage { nom: "Étage de l'Ombre".to_string(), monstres: vec![ombre, traqueur, spectre], boss_normal: boss, boss_heroique: boss_h, boss_heroique_lvl2: boss_h2 }
}

pub fn get_etage_temps() -> StructureEtage {
    let mut boss = creer_base("👑 BOSS: Chronos", 85, 10, 5, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]);
    boss.perte_pv_chaque_x_tours = Some(5); boss.perte_pv_pourcentage = Some(10);
    
    let mut boss_h = creer_base("👑 Chronos (Héroïque)", 115, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]);
    boss_h.perte_pv_chaque_x_tours = Some(5); boss_h.perte_pv_pourcentage = Some(10); boss_h.perte_pv_base_max = true;
    
    let mut boss_h2 = creer_base("👑 Chronos (Lvl 2)", 115, 12, 5, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]);
    boss_h2.perte_pv_chaque_x_tours = Some(3); boss_h2.perte_pv_pourcentage = Some(10); boss_h2.perte_pv_base_max = true;
    boss_h2.regen_pv_chaque_x_tours = Some(4); boss_h2.regen_pv_pourcentage = Some(10);

    StructureEtage {
        nom: "Étage du Temps".to_string(),
        monstres: vec![
            creer_base("Trotteuse Agile", 30, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::E]),
            creer_base("Gardien du Sablier", 45, 10, 4, 12, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::D, ActionType::E]),
            creer_base("Anachorète Temporel", 55, 10, 4, 10, vec![0, 50, 75, 100], vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E]),
        ],
        boss_normal: boss,
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

// Fonction globale pour récupérer tous les étages d'un coup (comme on le faisait en TS)
pub fn get_tous_les_etages() -> Vec<StructureEtage> {
    vec![
        get_etage_armure(),
        get_etage_esquive(),
        get_etage_combo(),
        get_etage_vie(),
        get_etage_ombre(),
        get_etage_temps(),
    ]
}