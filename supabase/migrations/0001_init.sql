-- RelanceFacile / PayNudge — schéma initial
-- Chaque ligne appartient à un utilisateur (owner_id = auth.uid()).
-- Les colonnes sensibles (Stripe, numérotation, jeton public, paiement)
-- ne sont modifiables que par le serveur (service role) ou des triggers.

-- ---------------------------------------------------------------------------
-- Entreprises (une par utilisateur)
-- ---------------------------------------------------------------------------
create table public.businesses (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (length(name) <= 200),
  email text check (email is null or length(email) <= 254),
  phone text check (phone is null or length(phone) <= 50),
  address text check (address is null or length(address) <= 500),
  country text not null default 'CA' check (country ~ '^[A-Z]{2}$'),
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  default_tax_rate numeric(5, 2) not null default 0 check (default_tax_rate between 0 and 100),
  language text not null default 'fr' check (language in ('fr', 'en')),
  -- jours de retard après l'échéance où une relance part
  reminder_days int[] not null default '{3,7,14}'
    check (cardinality(reminder_days) <= 10 and 0 < all (reminder_days) and 366 > all (reminder_days)),
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  next_quote_number int not null default 1,
  next_invoice_number int not null default 1,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses (owner_id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  email text check (email is null or length(email) <= 254),
  phone text check (phone is null or length(phone) <= 50),
  address text check (address is null or length(address) <= 500),
  language text not null default 'fr' check (language in ('fr', 'en')),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index clients_owner_idx on public.clients (owner_id);

-- ---------------------------------------------------------------------------
-- Devis et factures
-- ---------------------------------------------------------------------------
create type public.doc_kind as enum ('quote', 'invoice');
create type public.doc_status as enum ('draft', 'sent', 'accepted', 'declined', 'paid', 'void');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses (owner_id) on delete cascade,
  client_id uuid not null,
  kind public.doc_kind not null,
  number text not null,
  status public.doc_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  notes text check (notes is null or length(notes) <= 5000),
  public_token uuid not null default gen_random_uuid() unique,
  source_quote_id uuid,
  reminders_paused boolean not null default false,
  sent_at timestamptz,
  paid_at timestamptz,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, kind, number),
  -- le client doit appartenir au même utilisateur
  foreign key (client_id, owner_id) references public.clients (id, owner_id) on delete restrict,
  foreign key (source_quote_id, owner_id) references public.documents (id, owner_id) on delete set null (source_quote_id),
  check (kind = 'quote' or status not in ('accepted', 'declined')),
  check (kind = 'invoice' or status <> 'paid')
);
create index documents_owner_idx on public.documents (owner_id, kind, created_at desc);
create index documents_due_idx on public.documents (due_date) where kind = 'invoice' and status = 'sent';

create table public.document_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  document_id uuid not null,
  position int not null default 0,
  description text not null check (length(description) between 1 and 500),
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0 and unit_price_cents < 100000000000),
  foreign key (document_id, owner_id) references public.documents (id, owner_id) on delete cascade
);
create index document_items_doc_idx on public.document_items (document_id, position);

-- ---------------------------------------------------------------------------
-- Journal des relances (écrit uniquement par le serveur)
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.businesses (owner_id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  step int not null,
  status text not null check (status in ('sending', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now(),
  unique (document_id, step)
);
create index reminders_owner_idx on public.reminders (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Numérotation : DEV-0001 / FAC-0001 (fr) ou QUO-0001 / INV-0001 (en)
create function public.assign_document_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
  lang text;
begin
  if new.kind = 'quote' then
    update businesses set next_quote_number = next_quote_number + 1
      where owner_id = new.owner_id
      returning next_quote_number - 1, language into n, lang;
  else
    update businesses set next_invoice_number = next_invoice_number + 1
      where owner_id = new.owner_id
      returning next_invoice_number - 1, language into n, lang;
  end if;
  if n is null then
    raise exception 'business not found for owner %', new.owner_id;
  end if;
  new.number := case
    when new.kind = 'quote' and lang = 'fr' then 'DEV-'
    when new.kind = 'quote' then 'QUO-'
    when lang = 'fr' then 'FAC-'
    else 'INV-' end || lpad(n::text, 4, '0');
  return new;
end $$;

create trigger documents_number before insert on public.documents
  for each row execute function public.assign_document_number();

-- Horodatage des changements de statut
create function public.touch_document() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'paid' and old.status is distinct from 'paid' and new.paid_at is null then
    new.paid_at := now();
  elsif new.status <> 'paid' then
    new.paid_at := null;
  end if;
  if new.status = 'sent' and new.sent_at is null then
    new.sent_at := now();
  end if;
  return new;
end $$;

create trigger documents_touch before update on public.documents
  for each row execute function public.touch_document();

-- ---------------------------------------------------------------------------
-- Sécurité : RLS + droits par colonne
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.clients enable row level security;
alter table public.documents enable row level security;
alter table public.document_items enable row level security;
alter table public.reminders enable row level security;

create policy own_business on public.businesses for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_clients on public.clients for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_documents on public.documents for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_items on public.document_items for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy read_own_reminders on public.reminders for select to authenticated
  using (owner_id = auth.uid());

revoke all on public.businesses, public.clients, public.documents,
  public.document_items, public.reminders from anon;

revoke insert, update on public.businesses from authenticated;
grant insert (name, email, phone, address, country, currency, default_tax_rate, language, reminder_days)
  on public.businesses to authenticated;
grant update (name, email, phone, address, country, currency, default_tax_rate, language, reminder_days)
  on public.businesses to authenticated;

revoke insert, update on public.documents from authenticated;
grant insert (client_id, kind, status, issue_date, due_date, tax_rate, notes, source_quote_id, reminders_paused)
  on public.documents to authenticated;
grant update (client_id, status, issue_date, due_date, tax_rate, notes, reminders_paused)
  on public.documents to authenticated;

revoke insert, update, delete on public.reminders from authenticated;

revoke execute on function public.assign_document_number() from public, anon, authenticated;
