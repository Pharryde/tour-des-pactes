-- Succès débloqués par chaque joueur, et l'agrégat qui permet d'afficher « vous faites partie des
-- X % de joueurs qui l'ont ».
--
-- Table séparée de `public.classement` volontairement : ce dernier n'existe que pour les joueurs
-- qui ont CHOISI un nom public, alors que les succès concernent tout le monde et n'exposent aucune
-- identité — seul le total compte.
create table if not exists public.succes (
    user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
    -- Liste complète recalculée à chaque envoi plutôt qu'ajoutée au fil de l'eau : un succès ajouté
    -- après coup s'attribue ainsi rétroactivement aux joueurs qui remplissaient déjà sa condition,
    -- sans migration de données. Le plafond borne ce qu'un porteur de la clé publique peut pousser.
    ids     text[] not null default '{}' check (cardinality(ids) <= 200),
    maj_le  timestamptz not null default now()
);

alter table public.succes enable row level security;

-- Lecture ouverte : c'est ce qui rend le top % calculable côté client. Aucune identité n'y transite,
-- seulement des identifiants de succès rattachés à un utilisateur anonyme.
create policy "Les succès sont publics"
    on public.succes for select
    using (true);

create policy "Un joueur n'écrit que ses propres succès"
    on public.succes for insert
    with check (auth.uid() = user_id);

create policy "Un joueur ne met à jour que ses propres succès"
    on public.succes for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Un joueur ne supprime que ses propres succès"
    on public.succes for delete
    using (auth.uid() = user_id);

-- Horodatage imposé par le serveur, comme partout ailleurs : une horloge client faussée ne doit pas
-- pouvoir décider de l'ordre des choses.
create or replace function public.maj_horodatage_succes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.maj_le := now();
    return new;
end;
$$;

create trigger succes_maj_horodatage
    before insert or update on public.succes
    for each row execute function public.maj_horodatage_succes();

-- Agrégat du top %. Une VUE plutôt qu'un comptage côté client : sans elle, afficher la rareté
-- imposerait de rapatrier la ligne de chaque joueur, ce qui grossit sans fin et expose bien plus de
-- données que nécessaire. `security_invoker` fait respecter la RLS de la table sous-jacente — ici
-- lecture publique, donc la vue l'est aussi.
create or replace view public.succes_stats
with (security_invoker = true) as
select
    deplie.id                                        as succes_id,
    count(*)::int                                    as detenteurs,
    (select count(*) from public.succes)::int        as total_joueurs
from public.succes, unnest(ids) as deplie(id)
group by deplie.id;
