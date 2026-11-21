-- CommerceOS catalog: products, variants, media, collections, customers.

create type public.product_status as enum ('draft', 'active', 'archived');
create type public.collection_status as enum ('draft', 'active', 'archived');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  status public.product_status not null default 'draft',
  vendor text,
  product_type text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint products_store_slug_key unique (store_id, slug),
  constraint products_id_store_key unique (id, store_id)
);

create index products_store_status_idx on public.products (store_id, status);
create index products_store_created_idx
  on public.products (store_id, created_at desc);
create index products_store_vendor_idx on public.products (store_id, vendor);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  product_id uuid not null,
  title text not null default 'Default'
    check (char_length(btrim(title)) between 1 and 120),
  sku text not null check (char_length(btrim(sku)) between 1 and 64),
  barcode text,
  price_cents integer not null default 0 check (price_cents >= 0),
  cost_cents integer check (cost_cents >= 0),
  weight_grams integer check (weight_grams >= 0),
  position integer not null default 0,
  low_stock_threshold integer not null default 5
    check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_store_sku_key unique (store_id, sku),
  constraint product_variants_id_store_key unique (id, store_id),
  constraint product_variants_id_product_store_key
    unique (id, product_id, store_id),
  constraint product_variants_product_fk
    foreign key (product_id, store_id)
    references public.products (id, store_id) on delete cascade
);

create index product_variants_product_idx
  on public.product_variants (product_id, position);
create index product_variants_store_barcode_idx
  on public.product_variants (store_id, barcode);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  product_id uuid not null,
  variant_id uuid,
  storage_path text not null check (char_length(btrim(storage_path)) > 0),
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_images_product_fk
    foreign key (product_id, store_id)
    references public.products (id, store_id) on delete cascade,
  constraint product_images_variant_fk
    foreign key (variant_id, product_id, store_id)
    references public.product_variants (id, product_id, store_id)
    on delete cascade
);

create index product_images_product_idx
  on public.product_images (product_id, position);
create index product_images_store_idx on public.product_images (store_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  status public.collection_status not null default 'draft',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_store_slug_key unique (store_id, slug),
  constraint collections_id_store_key unique (id, store_id)
);

create index collections_store_status_idx
  on public.collections (store_id, status);

create table public.collection_products (
  collection_id uuid not null,
  product_id uuid not null,
  store_id uuid not null references public.stores (id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, product_id),
  constraint collection_products_collection_fk
    foreign key (collection_id, store_id)
    references public.collections (id, store_id) on delete cascade,
  constraint collection_products_product_fk
    foreign key (product_id, store_id)
    references public.products (id, store_id) on delete cascade
);

create index collection_products_product_idx
  on public.collection_products (product_id);
create index collection_products_store_idx
  on public.collection_products (store_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  email text not null check (position('@' in email) > 1),
  name text not null default '',
  phone text,
  notes text not null default '',
  tags text[] not null default '{}'::text[],
  accepts_marketing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_id_store_key unique (id, store_id)
);

create unique index customers_store_email_key
  on public.customers (store_id, lower(email));
create index customers_store_created_idx
  on public.customers (store_id, created_at desc);
create index customers_store_name_idx on public.customers (store_id, name);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  customer_id uuid not null,
  name text not null default '',
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text,
  country char(2) not null default 'US' check (country = upper(country)),
  phone text,
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now(),
  constraint customer_addresses_customer_fk
    foreign key (customer_id, store_id)
    references public.customers (id, store_id) on delete cascade
);

create index customer_addresses_customer_idx
  on public.customer_addresses (customer_id);
create index customer_addresses_store_idx
  on public.customer_addresses (store_id);
