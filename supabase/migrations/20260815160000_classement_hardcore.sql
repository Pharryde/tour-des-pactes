-- Classement public des joueurs ayant terrassé la Tour en mode hardcore.
--
-- ⚠️ C'est la seule table LISIBLE PAR TOUS du projet — c'est ce qui en fait un classement.
-- `public.sauvegardes` est cloisonnée par joueur et `public.runs` n'est même pas relisible. Ici, le
-- `nom` est du contenu public choisi par le joueur : d'où la contrainte de forme ci-dessous, en
-- plus du nettoyage client (utils/classement.ts), qui peut être contourné par un porteur de la clé
-- publique.
--
-- Le score est le nombre de runs DEPUIS LE DERNIER EFFACEMENT de profil hardcore. La mort remettant
-- toute la puissance à zéro, un petit nombre veut dire « fini presque en partant de rien ».
-- `runs_totales` conserve le total des tentatives, à titre informatif : il n'entre pas dans le
-- classement mais permet de le relire autrement plus tard sans avoir perdu la donnée.
create table if not exists public.classement (
    -- Clé primaire ET identité : un joueur n'occupe qu'une ligne, sa meilleure. Renseignée depuis
    -- le JWT, donc jamais transmise par le client et impossible à usurper.
    user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
    nom          text not null,
    nb_runs      integer not null check (nb_runs > 0),
    runs_totales integer not null default 0 check (runs_totales >= 0),
    version      text not null,
    obtenu_le    timestamptz not null default now(),

    -- Volontairement indépendante de la locale (pas de [[:alnum:]], qui n'accepte les accents que
    -- selon la collation) : on borne la longueur et on interdit ce qui pourrait être interprété
    -- comme du balisage ou casser un affichage.
    constraint classement_nom_valide check (
        char_length(nom) between 1 and 20
        and nom = btrim(nom)
        and nom !~ '[[:cntrl:]<>&]'
    )
);

alter table public.classement enable row level security;

-- Lecture ouverte à tous, y compris aux visiteurs anonymes : c'est l'objet même de la table.
create policy "Le classement est public"
    on public.classement for select
    using (true);

create policy "Un joueur n'inscrit que son propre score"
    on public.classement for insert
    with check (auth.uid() = user_id);

create policy "Un joueur ne met à jour que son propre score"
    on public.classement for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Même droit à l'effacement que sur les autres tables (cf. 20260805100000_durcir_sauvegardes.sql) :
-- un nom public doit pouvoir être retiré par celui qui l'a mis.
create policy "Un joueur ne supprime que son propre score"
    on public.classement for delete
    using (auth.uid() = user_id);

-- Le record ne se dégrade jamais. Sans ce garde-fou, une victoire moins bonne écraserait la
-- meilleure — et le client pourrait le faire à volonté, puisqu'il a le droit d'UPDATE sur sa ligne.
-- Renvoyer OLD depuis un BEFORE UPDATE annule la modification sans lever d'erreur : le joueur qui
-- rejoue moins bien garde simplement son ancien score.
create or replace function public.garder_meilleur_score()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' and new.nb_runs >= old.nb_runs then
        return old;
    end if;
    -- Imposé côté serveur, comme mis_a_jour_le sur public.sauvegardes : une horloge client faussée
    -- ne doit pas pouvoir décider de l'ordre d'arrivée, qui départage les ex æquo.
    new.obtenu_le := now();
    return new;
end;
$$;

create trigger classement_garder_meilleur
    before insert or update on public.classement
    for each row execute function public.garder_meilleur_score();

-- L'écran de classement lit toujours dans cet ordre (meilleur score, puis premier arrivé).
create index if not exists classement_ordre_idx on public.classement (nb_runs, obtenu_le);
