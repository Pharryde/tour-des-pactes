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
-- `numero_run` compte les runs LANCÉES (abandons compris), pas seulement les achevées.
select numero_run, count(*) as joueurs, round(avg(etage), 2) as etage_moyen
from public.runs
group by numero_run
order by numero_run;


-- ============================================================================
-- ZONES DE REPOS : PRIS RAPPORTÉ À PROPOSÉ
-- ============================================================================

-- LA requête du sujet. Au-delà de la 1re visite d'une run, seules 3 des 5 options sont tirées :
-- comparer les choix entre eux sans leur dénominateur donnerait un classement faux, qui refléterait
-- surtout la chance du tirage. Ici, `taux_pct` = « quand on me la propose, à quelle fréquence
-- je la prends ». Une option sous 20 % est morte ; une au-dessus de 50 % écrase les autres.
select
    choix,
    sum((repos_proposes->>choix)::int) as fois_proposee,
    sum((repos_pris->>choix)::int)     as fois_prise,
    round(100.0 * sum((repos_pris->>choix)::int)
          / nullif(sum((repos_proposes->>choix)::int), 0), 1) as taux_pct
from public.runs,
     lateral unnest(array['soin', 'pv', 'atk', 'pre', 'def']) as choix
where repos_proposes <> '{}'::jsonb
group by choix
order by taux_pct desc nulls last;

-- Le même taux, mais découpé par issue : un choix qui séduit les joueurs qui MEURENT et que les
-- vainqueurs dédaignent est un piège à débutant, pas une option équilibrée.
select
    issue,
    choix,
    round(100.0 * sum((repos_pris->>choix)::int)
          / nullif(sum((repos_proposes->>choix)::int), 0), 1) as taux_pct
from public.runs,
     lateral unnest(array['soin', 'pv', 'atk', 'pre', 'def']) as choix
where repos_proposes <> '{}'::jsonb
group by issue, choix
order by choix, issue;


-- ============================================================================
-- OÙ ET COMMENT LES RUNS S'ARRÊTENT
-- ============================================================================

-- Quel Gardien arrête réellement les joueurs. `etages` porte la séquence tirée et `etage` le rang
-- atteint : `etages[etage]` est donc l'étage où la run s'est arrêtée, quel que soit le mélange.
-- `salle` situe dans l'étage (le boss est la dernière des 4).
select
    etages[etage] as etage_fatal,
    salle,
    count(*)      as runs,
    count(*) filter (where issue = 'abandon') as abandons
from public.runs
where issue <> 'victoire' and cardinality(etages) >= etage
group by etage_fatal, salle
order by runs desc;

-- Taux d'abandon par étage : là où les gens ferment le jeu plutôt que d'y mourir. C'est un signal
-- d'ennui ou de découragement, pas de difficulté — et il ne ressemble pas à la courbe des morts.
select
    etage,
    count(*)                                                              as runs,
    count(*) filter (where issue = 'abandon')                             as abandons,
    round(100.0 * count(*) filter (where issue = 'abandon') / count(*), 1) as taux_abandon_pct
from public.runs
group by etage
order by etage;

-- Style de jeu et survie : le rapport entre dégâts infligés, bloqués et esquivés dit si le joueur
-- a joué agressif, tank ou esquive. Comparer les profils entre victoires et morts désigne la
-- stratégie qui marche vraiment — par opposition à celle que les joueurs croient bonne.
select
    issue,
    count(*)                        as runs,
    round(avg(degats_infliges))     as degats_infliges,
    round(avg(degats_bloques))      as degats_bloques,
    round(avg(degats_esquives))     as degats_esquives,
    round(avg(monstres_tues), 1)    as monstres_tues,
    round(avg(cardinality(pactes_arraches)), 2) as gardiens_heroiques_vaincus
from public.runs
group by issue
order by runs desc;

-- ============================================================================
-- COMMENT LES JOUEURS JOUENT : ACTIONS ET COMBOS
-- ============================================================================

-- Répartition des actions programmées. Une action sous 10 % est un bouton que personne n'utilise.
select
    action,
    sum((actions->>action)::int)                                              as fois_programmee,
    round(100.0 * sum((actions->>action)::int)
          / nullif(sum(sum((actions->>action)::int)) over (), 0), 1)          as pourcentage
from public.runs,
     lateral unnest(array['A', 'P', 'D', 'E']) as action
where actions <> '{}'::jsonb
group by action
order by pourcentage desc;

-- LA comparaison joueur / monstres. Les monstres tirent leurs actions au hasard : leur combo moyen
-- est donc l'étalon de ce qu'on obtient SANS chercher à enchaîner. Un `ecart` proche de 0 (ou
-- négatif) signifie que le joueur n'exploite pas le Combo — soit il ne l'a pas compris, soit la
-- mécanique coûte plus qu'elle ne rapporte.
-- On divise les SOMMES par les NOMBRES, jamais une moyenne de moyennes : sinon une run de 3 tours
-- pèserait autant qu'une run de 40.
select
    version,
    issue,
    count(*)                                                       as runs,
    round(sum(combo_somme_joueur)::numeric
          / nullif(sum(combo_actions_joueur), 0), 2)               as combo_moyen_joueur,
    round(sum(combo_somme_monstres)::numeric
          / nullif(sum(combo_actions_monstres), 0), 2)             as combo_moyen_monstres,
    round(sum(combo_somme_joueur)::numeric / nullif(sum(combo_actions_joueur), 0)
        - sum(combo_somme_monstres)::numeric / nullif(sum(combo_actions_monstres), 0), 2) as ecart,
    round(avg(combo_max_joueur), 1)                                as meilleur_combo_joueur
from public.runs
where combo_actions_joueur > 0
group by version, issue
order by version desc, issue;

-- Le Combo fait-il gagner ? Découpage du taux de victoire par combo moyen du joueur. Si la courbe
-- est plate, la mécanique centrale du jeu ne sert à rien.
select
    round(combo_somme_joueur::numeric / nullif(combo_actions_joueur, 0), 1) as combo_moyen,
    count(*)                                                                as runs,
    round(100.0 * count(*) filter (where issue = 'victoire') / count(*), 1) as taux_victoire_pct,
    round(avg(etage), 1)                                                    as etage_moyen
from public.runs
where combo_actions_joueur > 0
group by combo_moyen
order by combo_moyen;

-- Est-ce qu'on apprend à enchaîner ? Progression du combo moyen run après run, chez un même joueur.
select
    numero_run,
    count(*)                                                   as joueurs,
    round(sum(combo_somme_joueur)::numeric
          / nullif(sum(combo_actions_joueur), 0), 2)           as combo_moyen_joueur
from public.runs
where combo_actions_joueur > 0
group by numero_run
order by numero_run;


-- Prendre le risque du Gardien Héroïque, est-ce que ça paie ? `pactes_arraches` compte les Pactes
-- arrachés PENDANT la run, donc les Formes Héroïques affrontées et gagnées.
select
    cardinality(pactes_arraches) as pactes_arraches,
    count(*)                     as runs,
    round(100.0 * count(*) filter (where issue = 'victoire') / count(*), 1) as taux_victoire_pct,
    round(avg(etage), 1)         as etage_moyen
from public.runs
group by pactes_arraches
order by pactes_arraches;
