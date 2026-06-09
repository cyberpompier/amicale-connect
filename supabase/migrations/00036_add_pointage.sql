-- Ajout du pointage (rapprochement bancaire) sur les transactions
alter table public.transactions
  add column if not exists pointee boolean not null default false,
  add column if not exists date_pointage timestamptz;

-- Index pour filtrer rapidement les écritures non pointées
create index if not exists transactions_pointee_idx
  on public.transactions(association_id, pointee);
