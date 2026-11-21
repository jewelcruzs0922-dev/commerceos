-- CommerceOS foundation: extensions, roles, stores, members, invitations, audit.

create schema if not exists private;

create type public.member_role as enum ('owner', 'admin', 'manager', 'staff');

create type public.member_status as enum ('active', 'suspended');

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Global user profile metadata keyed to auth.users. Roles never live here.';

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  currency char(3) not null default 'USD' check (currency = upper(currency)),
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_key unique (slug),
  constraint stores_id_key unique (id)
);

comment on table public.stores is
  'Tenant root. Every store-owned record is scoped to a store.';

create table public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_members_store_user_key unique (store_id, user_id),
  constraint store_members_id_store_key unique (id, store_id)
);

comment on table public.store_members is
  'Store-scoped role assignment. Authorization always reads this table, never JWT metadata.';

create index store_members_user_idx on public.store_members (user_id);
create index store_members_store_role_idx on public.store_members (store_id, role);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.member_role not null default 'staff',
  token_hash text not null,
  status public.invitation_status not null default 'pending',
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_token_hash_key unique (token_hash)
);

create index invitations_store_status_idx
  on public.invitations (store_id, status);
create index invitations_email_idx on public.invitations (lower(email));

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(btrim(action)) > 0),
  entity_type text not null check (char_length(btrim(entity_type)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.activity_logs is
  'Append-only record of sensitive actions. Never stores secrets or full PII.';

create index activity_logs_store_created_idx
  on public.activity_logs (store_id, created_at desc);
create index activity_logs_actor_idx on public.activity_logs (actor_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function private.set_updated_at();

create trigger store_members_set_updated_at
  before update on public.store_members
  for each row execute function private.set_updated_at();

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
