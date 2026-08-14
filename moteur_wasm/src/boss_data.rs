use crate::entite::{ActionType, Entite, StructureEtage};

// --- Paliers d'esquive standards, réutilisés par la majorité des monstres/boss ---
fn esquive_std() -> Vec<i32> { vec![0, 50, 75, 100] }

// --- Panoplies d'actions réutilisées par plusieurs monstres/boss ---
fn kit_complet() -> Vec<ActionType> { vec![ActionType::A, ActionType::P, ActionType::D, ActionType::E] }
fn kit_sans_esquive() -> Vec<ActionType> { vec![ActionType::A, ActionType::P, ActionType::D] }
fn kit_sans_defense() -> Vec<ActionType> { vec![ActionType::A, ActionType::P, ActionType::E] }
fn kit_sans_precise() -> Vec<ActionType> { vec![ActionType::A, ActionType::D, ActionType::E] }
fn kit_sans_attaque() -> Vec<ActionType> { vec![ActionType::P, ActionType::D, ActionType::E] }

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
        actions_visibles: None,
        regen_armure_tour: None,
        chance_combo: None,
        chance_suite_defense: None,
        combo_multiplicateur: None,
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
        synergie_active: None,
        // Réservées au joueur (Bénédictions du Chat) : aucun monstre n'en porte.
        bonus_esquive_flat: None,
        chance_critique: None,
        reduction_esquive_opposant: None,
        // Étages du Froid / de la Foudre / du Feu / du Poison.
        actions_resolution_inversee: None,
        actions_gelees: None,
        multiplicateur_degats_si_armure: None,
        multiplicateur_brulure: None,
        multiplicateur_poison: None,
        peut_temporiser_si_poison_depasse: None,
        brulure_active: None,
        poison_actif: None,
    }
}

pub fn get_etage_armure() -> StructureEtage {
    // Plus une forme est avancée, plus elle a de chances d'enchaîner ses Défenses (ActionType::D)
    // d'une action à l'autre, pour finir le tour avec une grosse réserve d'armure — et donc
    // déclencher plus souvent Pointes d'Acier (dégâts de fin de tour égaux à l'armure restante).
    let mut boss_n = creer_base(&nom_boss("Le Mur de Fer"), 80, 10, 6, 15, esquive_std(), kit_sans_esquive());
    boss_n.chance_suite_defense = Some(25);

    let mut boss_h = creer_base(&nom_boss_evolue("Le Mur de Fer"), 100, 12, 5, 15, esquive_std(), kit_sans_esquive());
    boss_h.armure = 5; boss_h.regen_armure_tour = Some(5); boss_h.chance_suite_defense = Some(33);

    let mut boss_h2 = creer_base(&nom_boss_finale("Le Mur de Fer"), 100, 12, 5, 15, esquive_std(), kit_sans_esquive());
    boss_h2.armure = 5; boss_h2.regen_armure_tour = Some(5); boss_h2.degats_armure_restante_fin_tour = true;
    boss_h2.chance_suite_defense = Some(50);

    StructureEtage {
        id_pacte: "Pacte de l'Armure".to_string(),
        nom: "Étage de l'Armure".to_string(),
        monstres: vec![
            creer_base("Garde Novice", 30, 10, 4, 10, esquive_std(), kit_sans_esquive()),
            creer_base("Sentinelle Lourde", 40, 10, 4, 12, esquive_std(), kit_sans_esquive()),
            creer_base("Chevalier d'Élite", 50, 10, 4, 12, esquive_std(), kit_sans_esquive()),
        ],
        boss_normal: boss_n,
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
    // Régénération de L'Anomalie : 10% de ses PV max tous les 5 tours en forme évoluée (Niveau I),
    // tous les 3 tours en forme finale (Niveau II) — plus le combat s'éternise, plus elle se soigne vite.
    let mut boss_h = creer_base(&nom_boss_evolue("L'Anomalie"), 200, 12, 5, 12, esquive_std(), kit_sans_precise());
    boss_h.regen_pv_chaque_x_tours = Some(5); boss_h.regen_pv_pourcentage = Some(10);

    let mut boss_h2 = creer_base(&nom_boss_finale("L'Anomalie"), 300, 12, 5, 12, esquive_std(), kit_sans_precise());
    boss_h2.regen_pv_chaque_x_tours = Some(3); boss_h2.regen_pv_pourcentage = Some(10);

    StructureEtage {
        id_pacte: "Pacte de la Vie".to_string(),
        nom: "Étage de la Vie".to_string(),
        monstres: vec![
            creer_base("Adepte de Chair", 60, 10, 4, 10, esquive_std(), kit_sans_precise()),
            creer_base("Béhémoth Sanguin", 80, 10, 4, 10, esquive_std(), kit_sans_precise()),
            creer_base("Goliath Sans Visage", 100, 10, 4, 10, esquive_std(), kit_sans_precise()),
        ],
        boss_normal: creer_base(&nom_boss("L'Anomalie"), 160, 10, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

pub fn get_etage_ombre() -> StructureEtage {
    // Plus l'adversaire est avancé, moins il révèle de ses 5 actions à venir : 3/5 sans pacte
    // (mobs + boss normal), 2/5 face au Gardien évolué (défi Niveau I), 1/5 face à sa forme finale.
    let mut ombre = creer_base("Ombre Rôdeuse", 35, 10, 4, 10, esquive_std(), kit_complet()); ombre.actions_visibles = Some(3);
    let mut traqueur = creer_base("Traqueur Invisible", 45, 10, 4, 10, esquive_std(), kit_complet()); traqueur.actions_visibles = Some(3);
    let mut spectre = creer_base("Spectre de la Tour", 60, 10, 4, 10, esquive_std(), kit_complet()); spectre.actions_visibles = Some(3);

    let mut boss = creer_base(&nom_boss("Le Cauchemar"), 90, 10, 4, 10, esquive_std(), kit_complet()); boss.actions_visibles = Some(3);
    let mut boss_h = creer_base(&nom_boss_evolue("Le Cauchemar"), 120, 12, 5, 12, esquive_std(), kit_complet()); boss_h.actions_visibles = Some(2);
    let mut boss_h2 = creer_base(&nom_boss_finale("Le Cauchemar"), 120, 12, 5, 12, vec![30, 50, 75, 100], kit_complet()); boss_h2.actions_visibles = Some(1);

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
        // Seul le nom affiché change : `id_pacte` reste "Pacte de la Puissance Brute", car il sert
        // de clé dans les sauvegardes, PACTES_REGISTRY et SYNERGIES_REGISTRY.
        nom: "Étage de la Brute".to_string(),
        monstres: vec![
            creer_base("Brute Hargneuse", 35, 12, 4, 6, esquive_std(), kit_sans_precise()),
            creer_base("Berserker des Cavernes", 45, 12, 4, 6, esquive_std(), kit_sans_precise()),
            creer_base("Colosse Écumant", 55, 14, 4, 8, esquive_std(), kit_sans_precise()),
        ],
        boss_normal: creer_base(&nom_boss("Le Poing Primordial"), 90, 16, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique: creer_base(&nom_boss_evolue("Le Poing Primordial"), 120, 20, 5, 12, esquive_std(), kit_sans_precise()),
        boss_heroique_lvl2: boss_h2,
    }
}

// --- Étage du Froid : dérègle l'ordre de résolution du tour. Là où tout se résout normalement en
// simultané, ce Gardien fait passer ses propres actions AVANT celles du joueur sur quelques créneaux
// (une Défense programmée face à ces créneaux arrive donc trop tard), et sa forme évoluée gèle
// carrément une action. La forme finale cumule les deux. ---
pub fn get_etage_froid() -> StructureEtage {
    let mut m1 = creer_base("Éclat de Givre", 35, 8, 4, 8, esquive_std(), kit_sans_esquive());
    m1.actions_resolution_inversee = Some(1);

    let mut m2 = creer_base("Spectre Glacé", 45, 10, 4, 10, esquive_std(), kit_complet());
    m2.actions_resolution_inversee = Some(1);

    let mut m3 = creer_base("Colosse de Glace", 55, 10, 5, 12, esquive_std(), kit_sans_esquive());
    m3.actions_resolution_inversee = Some(2);

    let mut boss = creer_base(&nom_boss("Le Souffle Immobile"), 85, 12, 5, 12, esquive_std(), kit_complet());
    boss.actions_resolution_inversee = Some(2);

    let mut boss_h = creer_base(&nom_boss_evolue("Le Souffle Immobile"), 115, 14, 6, 12, esquive_std(), kit_complet());
    boss_h.actions_gelees = Some(1);

    let mut boss_h2 = creer_base(&nom_boss_finale("Le Souffle Immobile"), 145, 15, 6, 14, esquive_std(), kit_complet());
    boss_h2.actions_resolution_inversee = Some(2);
    boss_h2.actions_gelees = Some(1);

    StructureEtage {
        id_pacte: "Pacte du Froid".to_string(),
        nom: "Étage du Froid".to_string(),
        monstres: vec![m1, m2, m3],
        boss_normal: boss,
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

// --- Étage de la Foudre : punit le fait de se défendre. Tant que la cible porte de l'armure, TOUS
// ses dégâts sont multipliés — Précise comprise, qui garde par ailleurs son contournement d'armure.
// Se défendre contre ce Gardien est donc un piège ; il faut esquiver ou frapper. ---
pub fn get_etage_foudre() -> StructureEtage {
    let mut m1 = creer_base("Étincelle Vive", 35, 8, 4, 6, esquive_std(), kit_sans_defense());
    m1.multiplicateur_degats_si_armure = Some(1.5);

    let mut m2 = creer_base("Zéphyr Électrique", 45, 9, 5, 8, esquive_std(), kit_sans_defense());
    m2.multiplicateur_degats_si_armure = Some(1.5);

    let mut m3 = creer_base("Élémentaire d'Orage", 55, 10, 5, 10, esquive_std(), kit_complet());
    m3.multiplicateur_degats_si_armure = Some(1.5);

    let mut boss = creer_base(&nom_boss("La Colère du Ciel"), 85, 11, 5, 10, esquive_std(), kit_complet());
    boss.multiplicateur_degats_si_armure = Some(1.5);

    let mut boss_h = creer_base(&nom_boss_evolue("La Colère du Ciel"), 115, 12, 6, 10, esquive_std(), kit_complet());
    boss_h.multiplicateur_degats_si_armure = Some(2.0);

    let mut boss_h2 = creer_base(&nom_boss_finale("La Colère du Ciel"), 145, 13, 6, 12, esquive_std(), kit_complet());
    boss_h2.multiplicateur_degats_si_armure = Some(3.0);

    StructureEtage {
        id_pacte: "Pacte de la Foudre".to_string(),
        nom: "Étage de la Foudre".to_string(),
        monstres: vec![m1, m2, m3],
        boss_normal: boss,
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

// --- Étage du Feu : pose une brûlure dès qu'un coup porte. Elle frappe en fin de tour, se fait
// absorber par l'armure restante, puis est divisée par deux — elle punit fort à chaud et s'éteint
// d'elle-même si on survit à l'assaut initial. ---
pub fn get_etage_feu() -> StructureEtage {
    let mut m1 = creer_base("Braise Rampante", 35, 7, 4, 8, esquive_std(), kit_sans_precise());
    m1.multiplicateur_brulure = Some(1.0);

    let mut m2 = creer_base("Chien de Cendre", 45, 9, 4, 8, esquive_std(), kit_sans_precise());
    m2.multiplicateur_brulure = Some(1.0);

    let mut m3 = creer_base("Salamandre Ardente", 55, 10, 5, 10, esquive_std(), kit_sans_precise());
    m3.multiplicateur_brulure = Some(1.0);

    let mut boss = creer_base(&nom_boss("Le Brasier Vorace"), 85, 11, 5, 12, esquive_std(), kit_sans_precise());
    boss.multiplicateur_brulure = Some(1.0);

    let mut boss_h = creer_base(&nom_boss_evolue("Le Brasier Vorace"), 115, 13, 6, 12, esquive_std(), kit_sans_precise());
    boss_h.multiplicateur_brulure = Some(1.0);

    let mut boss_h2 = creer_base(&nom_boss_finale("Le Brasier Vorace"), 145, 14, 6, 14, esquive_std(), kit_sans_precise());
    boss_h2.multiplicateur_brulure = Some(1.0);

    StructureEtage {
        id_pacte: "Pacte du Feu".to_string(),
        nom: "Étage du Feu".to_string(),
        monstres: vec![m1, m2, m3],
        boss_normal: boss,
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

// --- Étage du Poison : le miroir du Feu. Le tic est bien plus faible, mais il ignore l'armure et
// ne décroît JAMAIS : plus le combat s'étire, plus il coûte cher. Il faut conclure vite. ---
pub fn get_etage_poison() -> StructureEtage {
    let mut m1 = creer_base("Crapaud Putride", 35, 7, 4, 8, esquive_std(), kit_sans_attaque());
    m1.multiplicateur_poison = Some(1.0);

    let mut m2 = creer_base("Rôdeur Bilieux", 45, 8, 4, 10, esquive_std(), kit_sans_attaque());
    m2.multiplicateur_poison = Some(1.0);

    let mut m3 = creer_base("Veuve Sépulcrale", 55, 9, 5, 10, esquive_std(), kit_sans_attaque());
    m3.multiplicateur_poison = Some(1.0);

    let mut boss = creer_base(&nom_boss("La Sève Noire"), 85, 10, 5, 12, esquive_std(), kit_sans_attaque());
    boss.multiplicateur_poison = Some(1.0);

    let mut boss_h = creer_base(&nom_boss_evolue("La Sève Noire"), 115, 12, 6, 12, esquive_std(), kit_sans_attaque());
    boss_h.multiplicateur_poison = Some(1.0);

    let mut boss_h2 = creer_base(&nom_boss_finale("La Sève Noire"), 145, 13, 6, 14, esquive_std(), kit_sans_attaque());
    boss_h2.multiplicateur_poison = Some(1.0);

    StructureEtage {
        id_pacte: "Pacte du Poison".to_string(),
        nom: "Étage du Poison".to_string(),
        monstres: vec![m1, m2, m3],
        boss_normal: boss,
        boss_heroique: boss_h,
        boss_heroique_lvl2: boss_h2,
    }
}

// Autorise une entité à passer un tour entier sans action offensive une fois que le poison qu'elle
// a injecté dépasse le seuil donné. Réservé à l'Étage du Poison : ailleurs, attendre ne rapporte
// rien à la créature et offre juste un tour au joueur.
fn autoriser_temporisation(etage: StructureEtage, seuil_poison: i32) -> StructureEtage {
    let marquer = |mut e: Entite| { e.peut_temporiser_si_poison_depasse = Some(seuil_poison); e };
    StructureEtage {
        monstres: etage.monstres.into_iter().map(marquer).collect(),
        boss_normal: marquer(etage.boss_normal),
        boss_heroique: marquer(etage.boss_heroique),
        boss_heroique_lvl2: marquer(etage.boss_heroique_lvl2),
        ..etage
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
        get_etage_froid(),
        get_etage_foudre(),
        get_etage_feu(),
        autoriser_temporisation(get_etage_poison(), 10),
    ]
}
