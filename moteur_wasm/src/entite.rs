use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ActionType {
    A,
    P,
    D,
    E,
}

// Synergies cachées : 4 Pactes précis équipés simultanément (peu importe leur niveau) au
// lancement d'une run révèlent un bonus de combat propre au joueur (voir combat.rs / lib.rs).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Synergie {
    Guerrier,
    Ninja,
    Tank,
    Assassin,
    Elementaire,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Entite {
    pub nom: String,
    pub pv: i32,
    pub pv_max: i32,
    pub armure: i32,
    pub niv_esquive: usize,
    pub base_a: i32,
    pub base_p: i32,
    pub base_d: i32,
    pub paliers_esquive: Vec<i32>,
    pub actions_possibles: Vec<ActionType>,
    #[serde(default)] pub actions_visibles: Option<i32>,

    pub regen_armure_tour: Option<i32>,
    pub chance_combo: Option<i32>,
    #[serde(default)] pub chance_suite_defense: Option<i32>,

    #[serde(default)] pub combo_multiplicateur: Option<f32>,
    #[serde(default)] pub degats_precis_doubles: bool,
    
    pub perte_pv_chaque_x_tours: Option<i32>,
    pub perte_pv_pourcentage: Option<i32>,
    #[serde(default)] pub perte_pv_base_max: bool,
    
    #[serde(default)] pub action_fin_tour_doublee: bool,
    #[serde(default)] pub action_troisieme_triplee: bool,
    
    pub regen_pv_chaque_x_tours: Option<i32>,
    pub regen_pv_pourcentage: Option<i32>,
    
    #[serde(default)] pub bloque_esquive_opposant: bool,
    #[serde(default)] pub degats_armure_restante_fin_tour: bool,

    // --- NOUVEAU : ANTI-COMBO ---
    #[serde(default)] pub limite_combo_max: Option<i32>,
    #[serde(default)] pub annule_bonus_combo: bool,

    // --- NOUVEAU : PUISSANCE BRUTE ---
    #[serde(default)] pub bonus_degats_attaque_pourcentage: Option<i32>,
    #[serde(default)] pub bonus_combo_attaque_palier: Option<i32>,

    // --- NOUVEAU : SYNERGIES CACHÉES ---
    #[serde(default)] pub synergie_active: Option<Synergie>,

    // --- NOUVEAU : BÉNÉDICTIONS DU CHAT (tirées à la Roue de la Chance, joueur uniquement) ---
    // Points d'esquive ajoutés à TOUS les paliers, y compris le palier 0 : contrairement aux
    // paliers, ce bonus protège même sans avoir joué Esquive (d'où "flat").
    #[serde(default)] pub bonus_esquive_flat: Option<i32>,
    // Chance en % qu'une Attaque/Précise devienne un Coup Critique (voir MULTIPLICATEUR_CRITIQUE).
    #[serde(default)] pub chance_critique: Option<i32>,
    // Points d'esquive retirés au DÉFENSEUR d'en face (l'inverse de bonus_esquive_flat).
    #[serde(default)] pub reduction_esquive_opposant: Option<i32>,

    // --- NOUVEAU : ÉTAGES DU FROID / DE LA FOUDRE / DU FEU / DU POISON ---
    // FROID. Nombre d'actions du tour (tirées au hasard) dont la résolution est déréglée : l'action
    // de CETTE entité se résout avant celle de l'adversaire, au lieu du simultané habituel.
    #[serde(default)] pub actions_resolution_inversee: Option<i32>,
    // FROID. Nombre d'actions de l'ADVERSAIRE purement et simplement annulées (gelées).
    #[serde(default)] pub actions_gelees: Option<i32>,

    // FOUDRE. Multiplicateur appliqué aux dégâts (Attaque comme Précise) quand la cible porte
    // encore de l'armure : le boss punit le fait de se défendre.
    #[serde(default)] pub multiplicateur_degats_si_armure: Option<f32>,

    // FEU. Part des dégâts de l'ATTAQUE convertie en brûlure (0.5 au Niveau I, 1.0 au Niveau II).
    // L'attaque ne blesse PLUS directement : sa valeur part dans la brûlure, qui s'accumule, se
    // fait absorber par l'armure en fin de tour, puis est divisée par deux.
    // ⚠️ Fractionnaire : à 1.0 la conversion serait sans perte, ce qui rend le Pacte trop fort.
    #[serde(default)] pub multiplicateur_brulure: Option<f32>,
    // POISON. Même chose sur les dégâts PRÉCIS. Le poison traverse l'armure, ne décroît jamais, et
    // s'additionne d'un tour à l'autre.
    #[serde(default)] pub multiplicateur_poison: Option<f32>,

    // Seule dérogation à la règle « toute créature doit attaquer à chaque tour » : une créature de
    // l'Étage du Poison peut se contenter de Défense/Esquive une fois que la dose déjà injectée
    // dépasse ce seuil — son poison travaille alors tout seul, attendre devient une vraie tactique.
    // `None` (tout le reste de la Tour) = doit toujours placer une offensive : un tour d'attente y
    // serait un tour offert au joueur.
    #[serde(default)] pub peut_temporiser_si_poison_depasse: Option<i32>,

    // Part d'une dose de brûlure / de poison que cette entité encaisse RÉELLEMENT quand on la lui
    // pose : `None` = tout (cas général), `0.5` = résistante, `0.0` = immunisée. Les Gardiens
    // maîtrisent leur propre élément — le Brasier Vorace ne se laisse pas brûler par ce qu'il est.
    // ⚠️ La réduction s'applique à la POSE, pas au tic : c'est ce qui permet au compteur 🔥/🧪
    // affiché sur la cible d'annoncer exactement ce qu'elle prendra.
    #[serde(default)] pub part_brulure_subie: Option<f32>,
    #[serde(default)] pub part_poison_subi: Option<f32>,

    // États SUBIS par cette entité. Ils doivent voyager avec elle d'un tour à l'autre (le moteur est
    // sans mémoire entre deux appels), d'où leur place sur l'entité plutôt que dans une variable
    // locale à jouer_tour.
    #[serde(default)] pub brulure_active: Option<i32>,
    #[serde(default)] pub poison_actif: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StructureEtage {
    pub id_pacte: String,
    pub nom: String,
    pub monstres: Vec<Entite>,
    pub boss_normal: Entite,
    pub boss_heroique: Entite,
    pub boss_heroique_lvl2: Entite,
}