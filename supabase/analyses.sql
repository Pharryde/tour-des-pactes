-- Requêtes d'analyse à coller dans le SQL Editor du dashboard Supabase.
-- Ce fichier n'est PAS une migration : il n'est jamais exécuté automatiquement, il ne modifie rien.
-- Le SQL Editor tourne en service role, donc la RLS des deux tables ne s'applique pas ici.
--
-- Deux sources, complémentaires :
--   * public.sauvegardes → l'ÉTAT COURANT de chaque joueur (une ligne, écrasée à chaque envoi).
--     Gratuit, disponible depuis toujours, mais sans historique et remis à zéro par un incrément
--     d'APP_VERSION.
--   * public.runs → une ligne par run ACHEVÉE, en ajout seul et estampillée de la version.
--     C'est la seule source qui permette de comparer un équilibrage d'avant et d'après.


-- ============================================================================
-- SUR L'ÉTAT COURANT (public.sauvegardes)
-- ============================================================================

-- Pactes actuellement équipés, du plus au moins porté.
select pacte, count(*) as joueurs
from public.sauvegardes,
     lateral jsonb_array_elements_text(donnees->'tdp_pactes_equipes') as pacte
group by pacte
order by joueurs desc;

-- Compositions complètes les plus portées. Le tri à l'intérieur du string_agg est indispensable :
-- sans lui, une même composition équipée dans deux ordres différents compte pour deux lignes.
select
    (select string_agg(p, ' + ' order by p)
     from jsonb_array_elements_text(donnees->'tdp_pactes_equipes') as p) as composition,
    count(*) as joueurs
from public.sauvegardes
group by composition
having (select count(*) from jsonb_array_elements_text(donnees->'tdp_pactes_equipes')) > 0
order by joueurs desc;

-- Où vont les points de l'arbre de compétences (pv / atk / def / pre / esq).
select
    stat,
    sum(valeur::int)              as points_investis,
    round(avg(valeur::int), 2)    as moyenne_par_joueur,
    max(valeur::int)              as maximum_observe
from public.sauvegardes,
     lateral jsonb_each_text(donnees->'tdp_competences') as e(stat, valeur)
group by stat
order by points_investis desc;

-- Part de chaque stat dans les points RÉELLEMENT dépensés : neutralise l'effet « les joueurs
-- avancés ont plus de points », qui écrase les moyennes brutes ci-dessus.
select
    stat,
    round(100.0 * sum(valeur::int) / nullif(sum(sum(valeur::int)) over (), 0), 1) as pourcentage
from public.sauvegardes,
     lateral jsonb_each_text(donnees->'tdp_competences') as e(stat, valeur)
group by stat
order by pourcentage desc;

-- Pactes qui ont déjà vaincu la Tour, rapportés au nombre de joueurs qui les possèdent.
-- Un Pacte très débloqué mais jamais victorieux est un candidat au rééquilibrage.
with debloques as (
    select pacte, count(*) as possesseurs
    from public.sauvegardes, lateral jsonb_array_elements_text(donnees->'tdp_pactes_debloques') as pacte
    group by pacte
), victorieux as (
    select pacte, count(*) as vainqueurs
    from public.sauvegardes, lateral jsonb_array_elements_text(donnees->'tdp_pactes_victorieux') as pacte
    group by pacte
)
select d.pacte, d.possesseurs, coalesce(v.vainqueurs, 0) as vainqueurs,
       round(100.0 * coalesce(v.vainqueurs, 0) / d.possesseurs, 1) as taux_victoire_pct
from debloques d left join victorieux v using (pacte)
order by taux_victoire_pct desc, d.possesseurs desc;

-- Courbe d'abandon : jusqu'où montent les joueurs, et combien de runs ils enchaînent.
select
    (donnees->>'tdp_etage_record')::int   as etage_record,
    count(*)                              as joueurs,
    round(avg((donnees->>'tdp_runs_terminees')::int), 1) as runs_moyennes
from public.sauvegardes
where donnees ? 'tdp_etage_record'
group by etage_record
order by etage_record;


-- ============================================================================
-- SUR L'HISTORIQUE DES RUNS (public.runs)
-- ============================================================================

-- Compositions les plus jouées et leur taux de victoire réel, version par version.
-- `pactes` est déjà trié à la construction (construireEvenementRun), donc groupable tel quel.
select
    version,
    array_to_string(pactes, ' + ')                                        as composition,
    count(*)                                                              as runs,
    count(*) filter (where issue = 'victoire')                            as victoires,
    round(100.0 * count(*) filter (where issue = 'victoire') / count(*), 1) as taux_victoire_pct,
    round(avg(etage), 1)                                                  as etage_moyen
from public.runs
group by version, pactes
having count(*) >= 5   -- sous ce seuil, le taux n'est que du bruit
order by version desc, runs desc;

-- Chaque Pacte pris isolément, sur des runs réellement terminées (et non sur ce qui est équipé
-- au moment de la sauvegarde) : c'est la mesure qui compte pour l'équilibrage.
select
    pacte,
    count(*)                                                              as runs,
    round(100.0 * count(*) filter (where issue = 'victoire') / count(*), 1) as taux_victoire_pct,
    round(avg(etage), 1)                                                  as etage_moyen
from public.runs, lateral unnest(pactes) as pacte
where version = (select max(version) from public.runs)
group by pacte
order by taux_victoire_pct desc;

-- Répartition de l'arbre chez ceux qui gagnent vs ceux qui meurent : l'écart désigne les stats
-- réellement décisives, par opposition à celles que les joueurs croient décisives.
select
    issue,
    stat,
    round(avg(valeur::int), 2) as moyenne
from public.runs,
     lateral jsonb_each_text(competences) as e(stat, valeur)
group by issue, stat
order by stat, issue;

-- Bénédictions et synergies : leur effet mesuré sur l'issue. `benediction` et `synergie` peuvent
-- être null (roue non jouée, aucune synergie active), d'où le coalesce pour les garder visibles.
select
    coalesce(benediction, '(aucune)') as benediction,
    coalesce(synergie, '(aucune)')    as synergie,
    count(*)                          as runs,
    round(100.0 * count(*) filter (where issue = 'victoire') / count(*), 1) as taux_victoire_pct
from public.runs
group by benediction, synergie
order by runs desc;

-- Progression d'un joueur run après run : est-ce qu'on apprend à jouer, et à quel rythme ?
select numero_run, count(*) as joueurs, round(avg(etage), 2) as etage_moyen
from public.runs
group by numero_run
order by numero_run;
