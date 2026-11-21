-- CommerceOS sales and operations: orders, payments, refunds, inventory, discounts, returns.

create type public.order_status as enum (
  'pending',
  'processing',
  'fulfilled',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'authorized',
  'paid',
  'partially_refunded',
  'refunded',
  'voided'
);

create type public.fulfillment_status as enum (
  'unfulfilled',
  'partially_fulfilled',
  'fulfilled',
  'cancelled'
);

create type public.refund_status as enum (
  'pending',
  'completed',
  'failed',
  'cancelled'
);

create type public.return_status as enum (
  'requested',
  'approved',
  'rejected',
  'received',
  'refunded',
  'closed'
);

create type public.discount_type as enum ('percentage', 'fixed_amount');

create type public.inventory_reason as enum (
  'sale',
  'reservation',
  'release',
  'fulfillment',
  'return',
  'restock',
  'adjustment',
  'damage',
  'cancellation'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  customer_id uuid,
  order_number text not null check (char_length(btrim(order_number)) > 0),
  email text not null check (position('@' in email) > 1),
  currency char(3) not null default 'USD' check (currency = upper(currency)),
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  shipping_address jsonb not null default '{}'::jsonb,
  placed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_store_number_key unique (store_id, order_number),
  constraint orders_id_store_key unique (id, store_id),
  constraint orders_customer_fk
    foreign key (customer_id, store_id)
    references public.customers (id, store_id) on delete restrict,
  constraint orders_totals_match check (
    total_cents = subtotal_cents - discount_cents + shipping_cents + tax_cents
  )
);

create index orders_store_placed_idx
  on public.orders (store_id, placed_at desc);
create index orders_store_status_idx on public.orders (store_id, status);
create index orders_customer_idx on public.orders (customer_id);
create index orders_store_number_idx on public.orders (store_id, order_number);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null,
  variant_id uuid,
  product_title text not null,
  variant_title text not null default '',
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_id_store_key unique (id, store_id),
  constraint order_items_order_fk
    foreign key (order_id, store_id)
    references public.orders (id, store_id) on delete cascade,
  constraint order_items_variant_fk
    foreign key (variant_id, store_id)
    references public.product_variants (id, store_id) on delete set null (variant_id),
  constraint order_items_totals_match check (
    total_cents::bigint =
      unit_price_cents::bigint * quantity - discount_cents + tax_cents
  )
);

comment on table public.order_items is
  'Immutable line-item snapshot. Product edits must never rewrite these values.';

create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);
create index order_items_store_idx on public.order_items (store_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  status public.payment_status not null default 'pending',
  provider text not null default 'demo' check (provider = 'demo'),
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_order_fk
    foreign key (order_id, store_id)
    references public.orders (id, store_id) on delete restrict
);

comment on table public.payments is
  'Demo bookkeeping only. No real provider, charge, or transfer is performed.';

create index payments_order_idx on public.payments (order_id);
create index payments_store_status_idx on public.payments (store_id, status);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null,
  payment_id uuid references public.payments (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  reason text not null default '',
  status public.refund_status not null default 'pending',
  processed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_order_fk
    foreign key (order_id, store_id)
    references public.orders (id, store_id) on delete restrict
);

comment on table public.refunds is
  'Demo refund records only. Never connected to a payment provider.';

create index refunds_order_idx on public.refunds (order_id);
create index refunds_store_created_idx
  on public.refunds (store_id, created_at desc);

create table public.inventory (
  variant_id uuid primary key,
  store_id uuid not null references public.stores (id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  constraint inventory_variant_fk
    foreign key (variant_id, store_id)
    references public.product_variants (id, store_id) on delete cascade,
  constraint inventory_reserved_within_on_hand check (reserved <= on_hand)
);

comment on table public.inventory is
  'Available quantity is derived as on_hand - reserved; it is never stored.';

create index inventory_store_idx on public.inventory (store_id);

create view public.inventory_levels
with (security_invoker = true)
as
select
  variant_id,
  store_id,
  on_hand,
  reserved,
  on_hand - reserved as available,
  updated_at
from public.inventory;

comment on view public.inventory_levels is
  'Available stock is on_hand - reserved. The view is security_invoker so RLS still applies.';

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  variant_id uuid not null,
  delta integer not null check (delta <> 0),
  reason public.inventory_reason not null,
  reference_type text,
  reference_id uuid,
  note text not null default '',
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_variant_fk
    foreign key (variant_id, store_id)
    references public.product_variants (id, store_id) on delete restrict
);

comment on table public.inventory_movements is
  'Append-only stock history. Rows are never updated or deleted.';

create index inventory_movements_variant_created_idx
  on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_store_created_idx
  on public.inventory_movements (store_id, created_at desc);

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  code text not null check (code = upper(code)),
  description text not null default '',
  type public.discount_type not null,
  value integer not null check (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  minimum_subtotal_cents integer not null default 0
    check (minimum_subtotal_cents >= 0),
  usage_limit integer check (usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_store_code_key unique (store_id, code),
  constraint discounts_id_store_key unique (id, store_id),
  constraint discounts_window_valid check (
    ends_at is null or starts_at is null or ends_at > starts_at
  ),
  constraint discounts_value_valid check (
    (type = 'percentage' and value between 1 and 100)
    or (type = 'fixed_amount' and value > 0)
  ),
  constraint discounts_usage_within_limit check (
    usage_limit is null or usage_count <= usage_limit
  )
);

create index discounts_store_active_idx
  on public.discounts (store_id, is_active);

create table public.discount_usages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  discount_id uuid not null,
  order_id uuid not null,
  customer_id uuid,
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now(),
  constraint discount_usages_discount_order_key unique (discount_id, order_id),
  constraint discount_usages_discount_fk
    foreign key (discount_id, store_id)
    references public.discounts (id, store_id) on delete restrict,
  constraint discount_usages_order_fk
    foreign key (order_id, store_id)
    references public.orders (id, store_id) on delete restrict,
  constraint discount_usages_customer_fk
    foreign key (customer_id, store_id)
    references public.customers (id, store_id) on delete set null (customer_id)
);

create index discount_usages_store_created_idx
  on public.discount_usages (store_id, created_at desc);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  order_id uuid not null,
  status public.return_status not null default 'requested',
  reason text not null default '',
  decision_note text not null default '',
  restock boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint returns_id_store_key unique (id, store_id),
  constraint returns_order_fk
    foreign key (order_id, store_id)
    references public.orders (id, store_id) on delete restrict
);

create index returns_store_status_idx on public.returns (store_id, status);
create index returns_order_idx on public.returns (order_id);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  return_id uuid not null,
  order_item_id uuid not null,
  quantity integer not null check (quantity > 0),
  refund_cents integer not null default 0 check (refund_cents >= 0),
  restock boolean not null default true,
  created_at timestamptz not null default now(),
  constraint return_items_unique unique (return_id, order_item_id),
  constraint return_items_return_fk
    foreign key (return_id, store_id)
    references public.returns (id, store_id) on delete cascade,
  constraint return_items_order_item_fk
    foreign key (order_item_id, store_id)
    references public.order_items (id, store_id) on delete restrict
);

create index return_items_return_idx on public.return_items (return_id);
create index return_items_store_idx on public.return_items (store_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_store_created_idx
  on public.notifications (store_id, created_at desc);
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

create trigger refunds_set_updated_at
  before update on public.refunds
  for each row execute function private.set_updated_at();

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function private.set_updated_at();

create trigger discounts_set_updated_at
  before update on public.discounts
  for each row execute function private.set_updated_at();

create trigger returns_set_updated_at
  before update on public.returns
  for each row execute function private.set_updated_at();

create or replace function private.enforce_refund_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_total integer;
  already_refunded integer;
begin
  select total_cents into order_total
  from public.orders
  where id = new.order_id;

  if order_total is null then
    raise exception 'Order not found';
  end if;

  select coalesce(sum(amount_cents), 0) into already_refunded
  from public.refunds
  where order_id = new.order_id
    and status in ('pending', 'completed')
    and id <> new.id;

  if already_refunded + new.amount_cents > order_total then
    raise exception 'Refund exceeds the refundable order total';
  end if;

  return new;
end;
$$;

create trigger refunds_enforce_cap
  before insert or update on public.refunds
  for each row execute function private.enforce_refund_cap();
