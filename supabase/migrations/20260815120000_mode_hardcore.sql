-- Mode hardcore dans le journal des runs (public.runs, créée par 20260812120000_journaliser_runs.sql).
--
-- Le mode hardcore rejoue exactement les mêmes règles de combat, mais sur un profil de progression
-- SÉPARÉ que la mort remet à zéro (voir src/utils/hardcore.ts). Deux conséquences pour l'analyse :
--
--  * À étage égal, une run hardcore est jouée avec bien moins de Pactes et de points de compétence
--    qu'une run normale — les agréger ensemble écraserait deux populations qui n'ont rien à voir,
--    et rendrait par exemple le taux de mort par étage ininterprétable. D'où `hardcore`, un simple
--    drapeau : la run reste par ailleurs décrite exactement comme les autres.
--
--  * Une nouvelle issue existe, l'EXTRACTION : la sortie volontaire par la porte offerte à la fin
--    de chaque étage, seule façon de mettre son butin à l'abri. C'est la décision centrale du mode,
--    et la comparer à `mort` (poussé un étage trop loin) est tout l'intérêt de la mesure. Elle est
--    donc bien une issue à part entière, et non un drapeau de plus : le joueur a choisi de s'arrêter.
--    `abandon` reste distinct — c'est un départ par le menu, sans contrepartie ni décision offerte.
alter table public.runs
    add column if not exists hardcore boolean not null default false;

-- La contrainte d'origine était anonyme, donc nommée runs_issue_check par Postgres
-- (table_colonne_check) ; celle de 20260812140000 porte déjà ce nom explicitement.
alter table public.runs drop constraint if exists runs_issue_check;
alter table public.runs add constraint runs_issue_check
    check (issue in ('mort', 'victoire', 'abandon', 'extraction'));

-- Les analyses d'équilibrage comparent d'abord les deux modes, puis les versions entre elles.
create index if not exists runs_hardcore_version_idx on public.runs (hardcore, version, fini_le desc);
