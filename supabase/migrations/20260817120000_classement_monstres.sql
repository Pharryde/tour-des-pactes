-- Nombre de monstres terrassés, en complément du nombre de runs, sur les lignes du classement
-- (table créée par 20260815160000_classement_hardcore.sql, déjà appliquée en production).
--
-- Même période que `nb_runs` : DEPUIS LE DERNIER EFFACEMENT de profil hardcore, et non sur la seule
-- run victorieuse. Une run gagnante traverse forcément les 12 étages et leurs 4 salles, donc ce
-- chiffre serait à peu près le même pour tout le monde — une colonne constante n'apprend rien.
-- Sur toute la série, il dit au contraire combien de combats il a fallu livrer pour y arriver, et
-- se lit en regard du nombre de runs.
--
-- Défaut à 0 pour les lignes déjà inscrites : leur compteur n'existait pas, on ne peut pas le
-- reconstruire après coup et l'inventer serait pire.
alter table public.classement
    add column if not exists monstres_tues integer not null default 0 check (monstres_tues >= 0);
