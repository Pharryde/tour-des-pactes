-- Journal des runs achevées, en complément de public.sauvegardes.
--
-- La table des sauvegardes ne porte qu'un ÉTAT COURANT : une ligne par joueur, écrasée à chaque
-- envoi. Elle dit ce qui est équipé maintenant, jamais ce qui a été joué run après run. Pire, tout
-- incrément d'APP_VERSION purge le localStorage (useLocalStorage.ts) puis réécrit la ligne cloud
-- avec un instantané vierge — l'historique disparaît donc précisément au moment où l'on voudrait
-- comparer l'équilibrage d'avant et d'après. D'où cette table, en ajout seul et versionnée.
create table if not exists public.runs (
    -- Renseigné par le serveur depuis le JWT : le client n'envoie jamais cette colonne, ce qui la
    -- rend impossible à usurper et allège d'autant la charge utile.
    user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,

    -- Numéro de la run pour CE joueur (= tdp_runs_terminees + 1). Associé à user_id il forme la clé
    -- primaire, ce qui fait tout le travail de robustesse : un double envoi (double clic, reprise
    -- après rechargement) est absorbé par le conflit de clé au lieu de créer un doublon, et le
    -- volume qu'un joueur peut produire est borné par sa propre progression. C'est ce qui dispense
    -- d'un rate-limit contre un porteur de la clé publique.
    numero_run  integer not null check (numero_run > 0),

    version     text not null,
    issue       text not null check (issue in ('mort', 'victoire')),
    etage       integer not null check (etage > 0),

    -- Bornes de taille dans le même esprit que sauvegardes_donnees_taille : sans elles, n'importe
    -- quel porteur de la clé publique peut pousser des tableaux et du JSON arbitrairement gros.
    -- 4 Pactes au maximum peuvent être équipés, 8 laisse une marge confortable.
    pactes      text[] not null check (cardinality(pactes) <= 8),
    competences jsonb  not null check (pg_column_size(competences) <= 1000),

    benediction text,
    synergie    text,
    fini_le     timestamptz not null default now(),

    primary key (user_id, numero_run)
);

alter table public.runs enable row level security;

-- Table en AJOUT SEUL côté client : il écrit ses propres runs, ne les relit jamais et ne peut pas
-- les modifier. L'absence VOLONTAIRE de policy SELECT et UPDATE ferme les deux — une table sous RLS
-- refuse par défaut toute opération non couverte. L'analyse passe par le SQL Editor du dashboard,
-- qui n'est pas soumis à la RLS.
create policy "Un joueur n'ajoute que ses propres runs"
    on public.runs for insert
    with check (auth.uid() = user_id);

-- Même droit à l'effacement que sur public.sauvegardes (cf. 20260805100000_durcir_sauvegardes.sql) :
-- un joueur doit pouvoir faire disparaître ce qu'il a produit, même sans pouvoir le relire.
create policy "Un joueur ne supprime que ses propres runs"
    on public.runs for delete
    using (auth.uid() = user_id);

-- Les analyses agrègent par version (comparer l'équilibrage entre deux mises à jour) puis par date.
create index if not exists runs_version_fini_le_idx on public.runs (version, fini_le desc);
