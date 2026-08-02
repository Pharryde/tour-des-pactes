use crate::entite::{ActionType, Entite, StructureEtage};

// --- Paliers d'esquive standards, réutilisés par la majorité des monstres/boss ---
fn esquive_std() -> Vec<i32> { vec![0, 50, 75, 100] }

// --- Panoplies d'actions réutilisées par plusieurs monstres/boss ---
fn kit_complet() -> Vec<ActionType> { vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E] }
fn kit_sans_esquive() -> Vec<ActionType> { vec![ActionType::A, ActionType::P, ActionType::D] }
fn kit_sans_defense() -> Vec<ActionType> { vec![ActionType::A, ActionType::P, ActionType::E] }
fn kit_sans_precise() -> Vec<ActionType> { vec![ActionType::A, ActionType::D, ActionType::E] }

// --- Noms de boss : les 3 formes partagent toujours le même préfixe ---
fn nom_boss(base: &str) -> String { format!("👑 BOSS: {}", base) }
fn nom_boss_evolue(base: &str) -> String { format!("👑FORME EVOLUEE: {}", base) }
fn nom_boss_finale(base: &str) -> String { format!("👑FORME FINALE: {}", base) }

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
        actions_cachees: false,
        degats_precis_doubles: false,
        perte_pv_chaque_x_tours: None,
        perte_pv_pourcentage: None,
        perte_pv_base_max: false,
        action_fin_tour_doublee: false,
        action_troisieme_triplee: false,
        regen_pv_chaque_x_tours: None,
        regen_pv_pourcentage: None,
        bloque_esquive_opposant: false,
        degats_armure_restante_fin_tour: false,
        limite_combo_max: None,
        annule_bonus_combo: false,
        bonus_degats_attaque_pourcentage: None,
        bonus_combo_attaque_palier: None,
    }
}

pub fn get_etage_armure() -> StructureEtage {
    let mut boss_h = creer_base(&nom_boss_evolue("Le Mur de Fer"), 100, 12, 5, 15, esquive_std(), kit_sans_esquive());
    boss_h.armure = 5; boss_h.regen_armure_tour = Some(5);

    let mut boss_h2 = creer_base(&nom_boss_finale("Le Mur de Fer"), 100, 12, 5, 15, esquive_std(), kit_sans_esquive());
    boss_h2.armure = 5; boss_h2.regen_armure_tour = Some(5); boss_h2.degats_armure_restante_fin_tour = true;

    StructureEtage {
        id_pacte: "Pacte de l'Armure".to_string(),
        nom: "Étage de l'Armure".to_string(),
        monstres: vec![
            creer_base("Garde Novice", 30, 10, 4, 10, esquive_std(), kit_sans_esquive()),
            creer_base("Sentinelle Lourde", 40, 10, 4, 12, esquive_std(), kit_sans_esquive()),
            creer_base("Chevalier d'Élite", 50, 10, 4, 12, esquive_std(), kit_sans_esquive()),
        ],
        boss_normal: creer_base(&nom_boss("Le Mur de Fer"), 80, 10, 6, 15, esquive_std(), kit_sans_esquive()),
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_etage_esquive() -> StructureEtage {
    let mut boss_h2 = creer_base(&nom_boss_finale("Le Vent Mortel"), 90, 12, 6, 0, vec![10, 70, 95, 100], kit_sans_defense());
    boss_h2.bloque_esquive_opposant = true;

    StructureEtage {
        id_pacte: "Pacte de l'Esquive".to_string(),
        nom: "Étage de la Vitesse".to_string(),
        monstres: vec![
            creer_base("Voleur Rapide", 25, 8, 5, 5, esquive_std(), kit_sans_defense()),
            creer_base("Assassin de l'Ombre", 35, 12, 6, 5, esquive_std(), kit_sans_defense()),
            creer_base("Maître de l'Illusion", 45, 10, 8, 5, vec![0, 55, 80, 100], kit_sans_defense()),
        ],
        boss_normal: creer_base(&nom_boss("Le Vent Mortel"), 70, 15, 8, 0, vec![0, 60, 90, 100], kit_sans_defense()),
        boss_heroique: creer_base(&nom_boss_evolue("Le Vent Mortel"), 90, 12, 6, 0, vec![10, 70, 95, 100], kit_sans_defense()),
        boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_etage_combo() -> StructureEtage {
    let mut adepte = creer_base("Adepte du Rythme", 30, 8, 4, 8, esquive_std(), kit_complet()); adepte.chance_combo = Some(50);
    let mut batteur = creer_base("Batteur Fou", 40, 10, 5, 8, esquive_std(), kit_complet()); batteur.chance_combo = Some(50);
    let mut chore = creer_base("Chorégraphe de Sang", 55, 10, 5, 10, esquive_std(), kit_complet()); chore.chance_combo = Some(50);

    let mut boss = creer_base(&nom_boss("L'Harmonie Brisée"), 85, 10, 5, 10, esquive_std(), kit_complet()); boss.chance_combo = Some(50);
    let mut boss_h = creer_base(&nom_boss_evolue("L'Harmonie Brisée"), 110, 12, 5, 12, esquive_std(), kit_complet()); boss_h.chance_combo = Some(50); boss_h.combo_multiplicateur = Some(1.5);
    let mut boss_h2 = creer_base(&nom_boss_finale("L'Harmonie Brisée"), 110, 12, 5, 12, esquive_std(), kit_complet()); boss_h2.chance_combo = Some(50); boss_h2.combo_multiplicateur = Some(2.0);

    StructureEtage {
        id_pacte: "Pacte du Combo".to_string(), nom: "Étage du Combo".to_string(),
        monstres: vec![adepte, batteur, chore], boss_normal: boss, boss_heroique: boss_h, boss_heroique_lvl2: boss_h2
    }
}

pub fn get_etage_vie() -> StructureEtage {
    StructureEtage {
        id_pacte: "Pacte de la Vie".to_string(),
        nom: "Étage de la Vie".to_string(),
        monstres: vec![
            creer_base("Adepte de Chair", 60, 10, 4, 10, esquive_std(), kit_sans_precise()),
            creer_base("Béhémoth Sanguin", 80, 10, 4, 10, esquive_std(), kit_sans_precise()),
            creer_base("Goliath Sans Visage", 100, 10, 4, 10, esquive_std(), kit_sans_precise()),
        ],
        boss_normal: creer_base(&nom_boss("L'Anomalie"), 160, 10, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique: creer_base(&nom_boss_evolue("L'Anomalie"), 200, 12, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique_lvl2: creer_base(&nom_boss_finale("L'Anomalie"), 300, 12, 5, 12, esquive_std(), kit_sans_precise()),
    }
}

pub fn get_etage_ombre() -> StructureEtage {
    let mut ombre = creer_base("Ombre Rôdeuse", 35, 10, 4, 10, esquive_std(), kit_complet()); ombre.actions_cachees = true;
    let mut traqueur = creer_base("Traqueur Invisible", 45, 10, 4, 10, esquive_std(), kit_complet()); traqueur.actions_cachees = true;
    let mut spectre = creer_base("Spectre de la Tour", 60, 10, 4, 10, esquive_std(), kit_complet()); spectre.actions_cachees = true;

    let mut boss = creer_base(&nom_boss("Le Cauchemar"), 90, 10, 4, 10, esquive_std(), kit_complet()); boss.actions_cachees = true;
    let mut boss_h = creer_base(&nom_boss_evolue("Le Cauchemar"), 120, 12, 5, 12, esquive_std(), kit_complet()); boss_h.actions_cachees = true;
    let mut boss_h2 = creer_base(&nom_boss_finale("Le Cauchemar"), 120, 12, 5, 12, vec![30, 50, 75, 100], kit_complet()); boss_h2.actions_cachees = true;

    StructureEtage {
        id_pacte: "Pacte de l'Ombre".to_string(), nom: "Étage de l'Ombre".to_string(),
        monstres: vec![ombre, traqueur, spectre], boss_normal: boss, boss_heroique: boss_h, boss_heroique_lvl2: boss_h2
    }
}

pub fn get_etage_temps() -> StructureEtage {
    let mut boss = creer_base(&nom_boss("Chronos"), 85, 10, 5, 10, esquive_std(), kit_complet());
    boss.perte_pv_chaque_x_tours = Some(5); boss.perte_pv_pourcentage = Some(10);

    let mut boss_h = creer_base(&nom_boss_evolue("Chronos"), 115, 12, 5, 12, esquive_std(), kit_complet());
    boss_h.perte_pv_chaque_x_tours = Some(5); boss_h.perte_pv_pourcentage = Some(10); boss_h.perte_pv_base_max = true;

    let mut boss_h2 = creer_base(&nom_boss_finale("Chronos"), 115, 12, 5, 12, esquive_std(), kit_complet());
    boss_h2.perte_pv_chaque_x_tours = Some(3); boss_h2.perte_pv_pourcentage = Some(10); boss_h2.perte_pv_base_max = true;
    boss_h2.regen_pv_chaque_x_tours = Some(4); boss_h2.regen_pv_pourcentage = Some(10);

    StructureEtage {
        id_pacte: "Pacte du Temps".to_string(), nom: "Étage du Temps".to_string(),
        monstres: vec![
            creer_base("Trotteuse Agile", 30, 10, 4, 10, esquive_std(), kit_sans_defense()),
            creer_base("Gardien du Sablier", 45, 10, 4, 12, esquive_std(), kit_sans_precise()),
            creer_base("Anachorète Temporel", 55, 10, 4, 10, esquive_std(), kit_complet()),
        ],
        boss_normal: boss, boss_heroique: boss_h, boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_etage_fluidite() -> StructureEtage {
    let mut m1 = creer_base("Gouttelette Agressive", 35, 8, 4, 8, esquive_std(), kit_sans_defense());
    m1.limite_combo_max = Some(4);

    let mut m2 = creer_base("Élémentaire d'Eau", 45, 10, 4, 10, esquive_std(), kit_sans_esquive());
    m2.limite_combo_max = Some(4);

    let mut m3 = creer_base("Ondin Mage", 55, 10, 5, 10, esquive_std(), kit_complet());
    m3.limite_combo_max = Some(4);

    let mut boss = creer_base(&nom_boss("Le Maître des Courants"), 80, 10, 4, 10, esquive_std(), kit_complet());
    boss.limite_combo_max = Some(4); // Bloque le 5ème

    let mut boss_h = creer_base(&nom_boss_evolue("Le Maître des Courants"), 110, 12, 5, 12, esquive_std(), kit_complet());
    boss_h.limite_combo_max = Some(3); // CORRIGÉ : Bloque le 4ème (permet 3 actions)

    let mut boss_h2 = creer_base(&nom_boss_finale("Le Maître des Courants"), 140, 12, 5, 12, esquive_std(), kit_complet());
    boss_h2.limite_combo_max = Some(2); // CORRIGÉ : Bloque le 3ème (permet 2 actions)
    boss_h2.annule_bonus_combo = true;

    StructureEtage {
        id_pacte: "Pacte de la Fluidité".to_string(),
        nom: "Étage de la Fluidité".to_string(),
        monstres: vec![m1, m2, m3],
        boss_normal: boss,
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

// --- NOUVEAU : Étage de la Puissance Brute. Ni les monstres ni le boss ne savent viser :
// aucune de leurs panoplies n'inclut ActionType::P (Précise), tout passe par l'Attaque brute. ---
pub fn get_etage_puissance_brute() -> StructureEtage {
    let mut boss_h2 = creer_base(&nom_boss_finale("Le Poing Primordial"), 150, 22, 5, 14, esquive_std(), kit_sans_precise());
    boss_h2.chance_combo = Some(35);

    StructureEtage {
        id_pacte: "Pacte de la Puissance Brute".to_string(),
        nom: "Étage de la Puissance Brute".to_string(),
        monstres: vec![
            creer_base("Brute Hargneuse", 35, 14, 4, 6, esquive_std(), kit_sans_precise()),
            creer_base("Berserker des Cavernes", 45, 16, 4, 6, esquive_std(), kit_sans_precise()),
            creer_base("Colosse Écumant", 55, 18, 4, 8, esquive_std(), kit_sans_precise()),
        ],
        boss_normal: creer_base(&nom_boss("Le Poing Primordial"), 90, 16, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique: creer_base(&nom_boss_evolue("Le Poing Primordial"), 120, 20, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_tous_les_etages() -> Vec<StructureEtage> {
    vec![
        get_etage_armure(),
        get_etage_esquive(),
        get_etage_combo(),
        get_etage_vie(),
        get_etage_ombre(),
        get_etage_temps(),
        get_etage_fluidite(),
        get_etage_puissance_brute(),
    ]
}
