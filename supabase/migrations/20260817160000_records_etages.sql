-- Records d'étage (mode infini compris) en plus du record de victoire hardcore, dans la table
-- créée par 20260815160000_classement_hardcore.sql — déjà appliquée et déjà peuplée.
--
-- Une SEULE ligne par joueur continue de porter toute son identité publique : le `nom` sert
-- désormais aux deux classements, ce qui évite qu'un même joueur apparaisse sous deux pseudos
-- différents selon la liste consultée.
--
-- Conséquence : un joueur peut avoir une ligne SANS avoir gagné en hardcore (il a juste un record
-- d'étage), d'où `nb_runs` qui devient nullable. `runs_totales` et `monstres_tues` décrivent cette
-- victoire hardcore : ils n'ont de sens que quand `nb_runs` est renseigné.
alter table public.classement
    alter column nb_runs drop not null,
    alter column runs_totales drop not null,
    alter column monstres_tues drop not null;

-- Un record par MODE : les deux profils sont des progressions séparées (voir utils/hardcore.ts),
-- les mélanger comparerait un héros accumulé sur des dizaines de runs à un héros reparti de zéro.
-- 0 = aucun étage atteint, ce qui exclut naturellement le joueur du classement correspondant.
alter table public.classement
    add column if not exists etage_normal      integer not null default 0 check (etage_normal >= 0),
    add column if not exists etage_hardcore    integer not null default 0 check (etage_hardcore >= 0),
    -- Horodatage propre à CHAQUE record : à égalité d'étage — très fréquent, beaucoup de joueurs
    -- s'arrêtent au même palier — c'est le premier arrivé qui passe devant. Un horodatage unique
    -- pour toute la ligne serait remis à jour par n'importe quelle autre modification et ferait
    -- reculer un joueur qui n'a pourtant rien changé à ce record-là.
    add column if not exists etage_normal_le   timestamptz,
    add column if not exists etage_hardcore_le timestamptz;

-- Le déclencheur ne se contente plus de garder le meilleur `nb_runs` : chaque record progresse
-- désormais dans son propre sens, indépendamment des autres. Renvoyer OLD ne suffit donc plus —
-- une même écriture peut améliorer un record et en dégrader un autre.
create or replace function public.garder_meilleur_score()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' then
        -- Le NOM suit toujours la dernière saisie : c'est une décision du joueur, pas un score.
        -- Victoire hardcore : le moins de runs gagne. Une écriture sans `nb_runs` (simple mise à
        -- jour d'un record d'étage) ne doit surtout pas effacer la victoire déjà enregistrée.
        if new.nb_runs is null or (old.nb_runs is not null and new.nb_runs >= old.nb_runs) then
            new.nb_runs      := old.nb_runs;
            new.runs_totales := old.runs_totales;
            new.monstres_tues := old.monstres_tues;
            new.obtenu_le    := old.obtenu_le;
        else
            new.obtenu_le := now();
        end if;

        -- Records d'étage : le plus profond gagne, et l'horodatage ne bouge que si le record bouge.
        if coalesce(new.etage_normal, 0) > coalesce(old.etage_normal, 0) then
            new.etage_normal_le := now();
        else
            new.etage_normal    := old.etage_normal;
            new.etage_normal_le := old.etage_normal_le;
        end if;

        if coalesce(new.etage_hardcore, 0) > coalesce(old.etage_hardcore, 0) then
            new.etage_hardcore_le := now();
        else
            new.etage_hardcore    := old.etage_hardcore;
            new.etage_hardcore_le := old.etage_hardcore_le;
        end if;
    else
        -- INSERT : les horodatages accompagnent les records réellement posés.
        new.obtenu_le := now();
        if coalesce(new.etage_normal, 0)   > 0 then new.etage_normal_le   := now(); end if;
        if coalesce(new.etage_hardcore, 0) > 0 then new.etage_hardcore_le := now(); end if;
    end if;
    return new;
end;
$$;

-- Chaque classement a son propre ordre de lecture.
create index if not exists classement_etage_normal_idx
    on public.classement (etage_normal desc, etage_normal_le asc) where etage_normal > 0;
create index if not exists classement_etage_hardcore_idx
    on public.classement (etage_hardcore desc, etage_hardcore_le asc) where etage_hardcore > 0;
