-- Create bureau_documents table
create table if not exists public.bureau_documents (
  id uuid default gen_random_uuid() primary key,
  association_id uuid not null references public.associations(id) on delete cascade,
  titre text not null,
  description text,
  type text not null check (type in ('pv', 'statuts', 'reglement', 'procedure', 'autre')),
  date_document date not null,
  url text not null,
  icone text default '📄',
  "order" integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster queries
create index if not exists bureau_documents_association_id_idx on public.bureau_documents(association_id);
create index if not exists bureau_documents_type_idx on public.bureau_documents(type);
create index if not exists bureau_documents_date_idx on public.bureau_documents(date_document);

-- Enable RLS
alter table public.bureau_documents enable row level security;

-- Create policies
create policy "Users can view documents of their association"
  on public.bureau_documents for select
  using (
    association_id in (
      select association_id from public.association_members where user_id = auth.uid()
    )
  );

create policy "Users can insert documents for their association"
  on public.bureau_documents for insert
  with check (
    association_id in (
      select association_id from public.association_members where user_id = auth.uid()
    )
  );

create policy "Users can update documents of their association"
  on public.bureau_documents for update
  using (
    association_id in (
      select association_id from public.association_members where user_id = auth.uid()
    )
  );

create policy "Users can delete documents of their association"
  on public.bureau_documents for delete
  using (
    association_id in (
      select association_id from public.association_members where user_id = auth.uid()
    )
  );
