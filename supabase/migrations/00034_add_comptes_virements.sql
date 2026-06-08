-- ─── Table comptes ───────────────────────────────────────────────────────────
create table if not exists public.comptes (
  id              uuid default gen_random_uuid() primary key,
  association_id  uuid not null references public.associations(id) on delete cascade,
  nom             text not null,
  type            text not null default 'courant'
                    check (type in ('courant', 'caisse', 'epargne', 'autre')),
  solde_initial   numeric(12, 2) not null default 0,
  couleur         text not null default '#6366f1',
  icone           text not null default '🏦',
  actif           boolean not null default true,
  ordre           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists comptes_association_id_idx on public.comptes(association_id);

alter table public.comptes enable row level security;

create policy "Comptes — select" on public.comptes for select
  using (association_id in (select association_id from public.association_members where user_id = auth.uid()));

create policy "Comptes — insert" on public.comptes for insert
  with check (association_id in (select association_id from public.association_members where user_id = auth.uid()));

create policy "Comptes — update" on public.comptes for update
  using (association_id in (select association_id from public.association_members where user_id = auth.uid()));

create policy "Comptes — delete" on public.comptes for delete
  using (association_id in (select association_id from public.association_members where user_id = auth.uid()));

-- ─── Table virements ──────────────────────────────────────────────────────────
create table if not exists public.virements (
  id                    uuid default gen_random_uuid() primary key,
  association_id        uuid not null references public.associations(id) on delete cascade,
  compte_source_id      uuid not null references public.comptes(id) on delete restrict,
  compte_destination_id uuid not null references public.comptes(id) on delete restrict,
  montant               numeric(12, 2) not null check (montant > 0),
  date                  date not null,
  description           text not null,
  notes                 text,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists virements_association_id_idx on public.virements(association_id);
create index if not exists virements_date_idx on public.virements(date desc);

alter table public.virements enable row level security;

create policy "Virements — select" on public.virements for select
  using (association_id in (select association_id from public.association_members where user_id = auth.uid()));

create policy "Virements — insert" on public.virements for insert
  with check (association_id in (select association_id from public.association_members where user_id = auth.uid()));

create policy "Virements — update" on public.virements for update
  using (association_id in (select association_id from public.association_members where user_id = auth.uid()));

create policy "Virements — delete" on public.virements for delete
  using (association_id in (select association_id from public.association_members where user_id = auth.uid()));

-- ─── Lier les transactions aux comptes (rétrocompat nullable) ─────────────────
alter table public.transactions
  add column if not exists compte_id uuid references public.comptes(id) on delete set null;

create index if not exists transactions_compte_id_idx on public.transactions(compte_id);
