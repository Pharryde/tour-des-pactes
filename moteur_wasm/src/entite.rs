use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ActionType {
    A,
    P,
    D,
    E,
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

    pub regen_armure_tour: Option<i32>,
    pub chance_combo: Option<i32>,
    
    #[serde(default)] pub combo_multiplicateur: Option<f32>,
    #[serde(default)] pub actions_cachees: bool,
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