-- Ajouter le champ is_default à la table comptes
alter table public.comptes
  add column if not exists is_default boolean not null default false;

-- Index pour retrouver rapidement le compte par défaut
create index if not exists comptes_is_default_idx on public.comptes(association_id, is_default);
