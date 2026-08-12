-- Comment le joueur JOUE, par opposition à ce qu'il équipe. Tout le reste du journal décrit sa
-- préparation (Pactes, arbre, bénédiction) ; rien ne disait ce qu'il fait une fois en combat.
--
-- `actions` : répartition des 4 actions programmées sur toute la run ({"A":n,"P":n,"D":n,"E":n}).
--   Les créneaux gelés par l'Étage du Froid y sont comptés — le joueur les a bien choisis, c'est le
--   moteur qui les annule ensuite.
--
-- Combo : on stocke la SOMME des paliers atteints et le NOMBRE d'actions, jamais la moyenne déjà
--   calculée. Une moyenne de moyennes est fausse dès qu'on agrège des runs de longueurs
--   différentes, alors que `sum(somme) / sum(actions)` reste exact quel que soit le découpage.
--   Les deux camps sont mesurés : les monstres tirant leurs actions au hasard, leur combo moyen est
--   l'étalon de ce qu'on obtient SANS chercher à enchaîner. Un joueur qui ne le dépasse pas n'a pas
--   compris la mécanique — ou elle est trop coûteuse à exploiter.
--   Les créneaux gelés en sont exclus des deux côtés : le moteur y saute le calcul de combo, donc
--   ils ne représentent aucun palier.
alter table public.runs
    add column if not exists actions                jsonb   not null default '{}'::jsonb,
    add column if not exists combo_somme_joueur     integer not null default 0,
    add column if not exists combo_actions_joueur   integer not null default 0,
    add column if not exists combo_max_joueur       integer not null default 0,
    add column if not exists combo_somme_monstres   integer not null default 0,
    add column if not exists combo_actions_monstres integer not null default 0,
    add column if not exists combo_max_monstres     integer not null default 0;

-- Même esprit que les bornes déjà posées sur les autres colonnes : rien de ce qui vient du client
-- ne doit pouvoir grossir sans limite.
alter table public.runs
    add constraint runs_actions_taille check (pg_column_size(actions) <= 500);
