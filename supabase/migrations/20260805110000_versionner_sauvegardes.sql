-- Version des structures de données ayant produit la sauvegarde (miroir d'APP_VERSION, voir
-- src/utils/versionApp.ts). Le client refuse de restaurer une ligne dont la version ne correspond
-- pas à la sienne : sans ça, la purge locale déclenchée par un changement de version serait
-- aussitôt annulée par la restauration cloud, qui réinjecterait les données obsolètes.
--
-- La valeur par défaut '' marque les lignes antérieures à cette colonne : ne correspondant à
-- aucune version connue, elles seront ignorées à la restauration puis réécrites au prochain envoi.
alter table public.sauvegardes
    add column if not exists version text not null default '';
