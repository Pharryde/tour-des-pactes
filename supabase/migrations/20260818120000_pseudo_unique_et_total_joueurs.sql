-- 1. UN PSEUDO NE PEUT PLUS ÊTRE PRIS DEUX FOIS.
--
-- Index unique sur `lower(nom)` et non sur `nom` : sans ça « Pharryde » et « pharryde » cohabitent
-- et le classement devient indéchiffrable — deux lignes qui se lisent comme le même joueur.
-- Contrainte posée en base et pas seulement côté client : la clé publique permet d'écrire
-- directement dans la table, une vérification client serait contournable en une requête.
create unique index if not exists classement_nom_unique_idx
    on public.classement (lower(nom));

-- 2. LE TOP % SE CALCULE SUR TOUS LES JOUEURS, PAS SUR CEUX QUI ONT PUBLIÉ DES SUCCÈS.
--
-- `public.sauvegardes` porte une ligne par joueur ayant jamais synchronisé : c'est la meilleure
-- approximation de « tout le monde ». Elle est cloisonnée par RLS, donc un simple `count(*)` depuis
-- le client renverrait 1 — d'où cette fonction en SECURITY DEFINER, qui contourne la RLS mais
-- n'expose QUE le total. Aucune ligne, aucun identifiant, aucune donnée de joueur n'en sort.
create or replace function public.total_joueurs()
returns integer
language sql
security definer
stable
set search_path = ''
as $$
    select count(*)::integer from public.sauvegardes;
$$;

revoke all on function public.total_joueurs() from public;
grant execute on function public.total_joueurs() to anon, authenticated;

-- La vue reprend ce total au lieu de compter les lignes de `public.succes`. Sans ce changement, un
-- succès détenu par les 3 seuls joueurs ayant publié s'affichait « top 100 % » alors que la base
-- compte peut-être 300 joueurs : le dénominateur mesurait la publication, pas la population.
create or replace view public.succes_stats
with (security_invoker = true) as
select
    deplie.id             as succes_id,
    count(*)::int         as detenteurs,
    public.total_joueurs() as total_joueurs
from public.succes, unnest(ids) as deplie(id)
group by deplie.id;
