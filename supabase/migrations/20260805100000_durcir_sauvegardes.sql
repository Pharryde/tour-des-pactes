-- Durcissement de la table créée par 20260804120000_create_sauvegardes.sql.

-- 1. Plafonne la taille d'une sauvegarde. Sans cette borne, n'importe quel porteur de la clé
--    publique peut pousser des mégaoctets de JSON arbitraire dans sa propre ligne et saturer les
--    500 Mo du plan gratuit. 1 Mo laisse une marge très large : une sauvegarde réelle pèse quelques
--    dizaines de Ko (la part variable étant `tdp_historique_logs`, qui grossit tout au long d'une run).
alter table public.sauvegardes
    add constraint sauvegardes_donnees_taille check (pg_column_size(donnees) <= 1000000);

-- 2. L'horodatage était fourni par le client (donc faussé par une horloge désynchronisée, ou
--    falsifiable). Il est désormais imposé par le serveur à chaque écriture.
create or replace function public.maj_horodatage_sauvegarde()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.mis_a_jour_le := now();
    return new;
end;
$$;

create trigger sauvegardes_maj_horodatage
    before insert or update on public.sauvegardes
    for each row execute function public.maj_horodatage_sauvegarde();

-- 3. Droit à l'effacement : sans policy DELETE, un joueur ne peut pas supprimer sa propre
--    sauvegarde, ce qui est un angle mort côté RGPD.
create policy "Un joueur ne supprime que sa propre sauvegarde"
    on public.sauvegardes for delete
    using (auth.uid() = user_id);

-- 4. Rend explicite la validation des NOUVELLES valeurs sur UPDATE. Postgres retombe déjà sur
--    l'expression USING quand WITH CHECK est absent (le comportement était donc correct), mais
--    l'implicite se relit mal sur une règle de sécurité.
drop policy if exists "Un joueur ne met à jour que sa propre sauvegarde" on public.sauvegardes;
create policy "Un joueur ne met à jour que sa propre sauvegarde"
    on public.sauvegardes for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
