-- Une ligne = la sauvegarde complète d'un joueur (identifié par son utilisateur Supabase, anonyme
-- ou non). Le contenu est un miroir JSON de l'état persistant normalement stocké en localStorage
-- côté client (voir src/utils/sauvegardeCloud.ts).
create table if not exists public.sauvegardes (
    user_id uuid primary key references auth.users(id) on delete cascade,
    donnees jsonb not null,
    mis_a_jour_le timestamptz not null default now()
);

alter table public.sauvegardes enable row level security;

create policy "Un joueur ne voit que sa propre sauvegarde"
    on public.sauvegardes for select
    using (auth.uid() = user_id);

create policy "Un joueur ne crée que sa propre sauvegarde"
    on public.sauvegardes for insert
    with check (auth.uid() = user_id);

create policy "Un joueur ne met à jour que sa propre sauvegarde"
    on public.sauvegardes for update
    using (auth.uid() = user_id);
