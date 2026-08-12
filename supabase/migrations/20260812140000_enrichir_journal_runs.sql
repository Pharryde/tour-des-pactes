-- Enrichissement de public.runs, créée par 20260812120000_journaliser_runs.sql.
-- Migration séparée plutôt que modification de la précédente : celle-ci est déjà appliquée en
-- production, la retoucher ne rejouerait rien.
--
-- Ce que la v1 ne pouvait pas dire :
--  * `etage` seul est ININTERPRÉTABLE — la Tour est mélangée à chaque run (melangerEtages), donc
--    deux runs « mortes à l'étage 5 » n'ont pas rencontré les mêmes Gardiens. D'où `etages`, la
--    séquence réellement tirée, et `salle`, la position dans l'étage (4 salles, le boss est la
--    dernière : « étage 5 » ne disait pas si le joueur butait sur le 1er monstre ou sur le boss).
--  * Le STYLE de jeu : les dégâts infligés / bloqués / esquivés séparent un joueur agressif d'un
--    tank ou d'un esquiveur, et disent lequel survit.
--  * Les ABANDONS, qui n'étaient pas journalisés du tout alors que c'est le signal de frustration
--    le plus fort du jeu — et le plus fréquent.
--  * Les Zones de Repos : un choix rarement pris peut simplement être rarement PROPOSÉ (seules 3
--    des 5 options sont tirées au-delà de la 1re visite d'une run). Sans le dénominateur, le
--    ratio est faux ; d'où deux compteurs, proposés et pris.
alter table public.runs
    add column if not exists salle           integer not null default 0,
    add column if not exists etages          text[]  not null default '{}',
    add column if not exists monstres_tues   integer not null default 0,
    add column if not exists pactes_arraches text[]  not null default '{}',
    add column if not exists degats_infliges integer not null default 0,
    add column if not exists degats_bloques  integer not null default 0,
    add column if not exists degats_esquives integer not null default 0,
    add column if not exists repos_proposes  jsonb   not null default '{}'::jsonb,
    add column if not exists repos_pris      jsonb   not null default '{}'::jsonb;

-- `issue` accepte désormais l'abandon. La contrainte d'origine était anonyme, donc nommée
-- runs_issue_check par Postgres (table_colonne_check).
alter table public.runs drop constraint if exists runs_issue_check;
alter table public.runs add constraint runs_issue_check
    check (issue in ('mort', 'victoire', 'abandon'));

-- Mêmes bornes de taille que sur les colonnes existantes : sans elles, un porteur de la clé
-- publique peut pousser des tableaux et du JSON arbitrairement gros. 12 étages et 5 options de
-- repos aujourd'hui, ces plafonds laissent une marge très large.
alter table public.runs
    add constraint runs_etages_taille          check (cardinality(etages) <= 32),
    add constraint runs_pactes_arraches_taille check (cardinality(pactes_arraches) <= 32),
    add constraint runs_repos_taille           check (pg_column_size(repos_proposes) <= 500
                                                  and pg_column_size(repos_pris) <= 500);

-- `numero_run` change de sens : il comptait les runs ACHEVÉES, il compte désormais les runs
-- LANCÉES (tdp_runs_lancees côté client). Sans ça, un abandon et la run suivante porteraient le
-- même numéro et, la clé primaire étant (user_id, numero_run), l'une des deux serait rejetée en
-- silence. Le compteur client démarre à la valeur de tdp_runs_terminees pour les joueurs déjà
-- installés, donc au-dessus des numéros déjà journalisés : aucune collision avec l'existant.
comment on column public.runs.numero_run is
    'Rang de la run pour ce joueur, abandons compris (runs lancées, pas seulement achevées).';
