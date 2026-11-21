---
name: CommerceOS Database
description: Postgres and Supabase schema conventions for CommerceOS — multi-tenant tables, IDs, money, timestamps, RLS, indexes, migrations, and seed data. Load before writing any migration, table, policy, query, or seed change.
---

# CommerceOS Database

Postgres on Supabase. Multi-tenant by store. RLS is mandatory, not optional.

Load `supabase-postgres-best-practices` for rule depth and `supabase` for CLI/auth specifics. This skill holds the project decisions those rules must follow.

## Model

Core tables:

```text
stores(id, name, slug, currency, timezone, created_at)
profiles(id → auth.users, full_name, avatar_url, created_at)
store_members(store_id, user_id, role, status, created_at)   -- role: owner|admin|manager|staff
customers(id, store_id, email, name, phone, created_at, accepts_marketing)
products(id, store_id, title, slug, description, status, created_at, updated_at)
product_variants(id, product_id, store_id, sku, title, price_cents, cost_cents, weight_g, barcode)
collections(id, store_id, title, slug, description)
collection_products(collection_id, product_id)
orders(id, store_id, customer_id, order_number, status, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, placed_at, cancelled_at)
order_items(id, order_id, store_id, variant_id, quantity, unit_price_cents, total_cents)
inventory_locations(id, store_id, name)
inventory_movements(id, store_id, variant_id, location_id, delta, reason, reference_id, created_at)
discounts(id, store_id, code, type, value, starts_at, ends_at, usage_limit, status)
discount_redemptions(id, store_id, discount_id, order_id, amount_cents, created_at)
returns(id, store_id, order_id, status, reason, created_at, resolved_at)
return_items(id, return_id, order_item_id, quantity, refund_cents)
```

Rules:
- Every tenant-owned table carries `store_id uuid not null references stores(id)`. No exceptions; it makes RLS and filtering uniform.
- Do not denormalize `store_id` in child tables that already reach it through a parent — but do it for `order_items` and `inventory_movements` because they are queried cross-table and RLS checks them directly.
- `profiles` is global (one per auth user). Role lives in `store_members`, never in `user_metadata`.

## Column conventions

| Concern | Rule |
|---------|------|
| Primary keys | `id uuid primary key default gen_random_uuid()` |
| Human identifiers | Separate column: `order_number text`, unique per store |
| Money | `integer` minor units, suffixed `_cents`. Never `float`, never `numeric` for currency math |
| Currency | Inherited from `stores.currency`. Do not store per row unless multi-currency is added |
| Timestamps | `timestamptz not null default now()`. Domain times (`placed_at`) are separate from `created_at` |
| Updates | `updated_at timestamptz not null default now()` with a shared trigger |
| Booleans | `is_` / `has_` prefix, `not null default false` |
| Enums | Postgres `enum` type for fixed state machines (`order_status`, `member_role`, `discount_type`) |
| Soft delete | `deleted_at timestamptz` only where recovery is a real requirement; filter in queries and policies |
| Text | `not null` with explicit `check (length(trim(x)) > 0)` for required strings |

Naming: `snake_case`, plural table names, singular column names, indexes `<table>_<columns>_idx`, policies `<table>_<action>_<scope>`.

## Integrity constraints

Always add:

```sql
alter table orders
  add constraint orders_total_non_negative check (total_cents >= 0),
  add constraint orders_number_per_store unique (store_id, order_number);

alter table store_members
  add constraint store_members_pkey_unique unique (store_id, user_id);

alter table order_items
  add constraint order_items_qty_positive check (quantity > 0);

alter table inventory_movements
  add constraint inventory_movements_delta_nonzero check (delta <> 0);
```

- FKs default to `on delete restrict`. Use `cascade` only for pure join tables (`collection_products`) and child records that cannot exist alone (`order_items` when the order is deleted — which should not happen in production; prefer restrict and status transitions).
- State changes go through explicit transitions, not free-form status writes. Encode allowed transitions in one module (`features/orders/lib/status.ts`) and validate server-side.

## Inventory

Stock is derived, never stored as a mutable counter.

```sql
create view inventory_levels with (security_invoker = true) as
select store_id, variant_id, location_id, coalesce(sum(delta), 0) as on_hand
from inventory_movements
group by store_id, variant_id, location_id;
```

- Every change is an `inventory_movements` row with a `reason` (`sale`, `return`, `adjustment`, `restock`, `damage`) and `reference_id`.
- Low-stock thresholds live on `product_variants` (`low_stock_threshold int not null default 5`).
- Views must use `security_invoker = true` or they bypass RLS.

## RLS

1. Enable RLS on every table in an exposed schema, including join tables.
2. Membership helper in a private, unexposed schema:

```sql
create schema if not exists private;

create or replace function private.is_store_member(target_store uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = target_store
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_store_role(target_store uuid, allowed public.member_role[])
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = target_store
      and m.user_id = (select auth.uid())
      and m.role = any(allowed)
  );
$$;

revoke execute on function private.is_store_member(uuid) from public, anon;
revoke execute on function private.has_store_role(uuid, public.member_role[]) from public, anon;
grant  execute on function private.is_store_member(uuid) to authenticated;
grant  execute on function private.has_store_role(uuid, public.member_role[]) to authenticated;
```

`authenticated` must retain execute because policies run as the calling user. `anon` must not. Keep the functions in the unexposed `private` schema so they are not reachable through the Data API.

3. Policy shape per table:

```sql
alter table orders enable row level security;

create policy orders_select on orders
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy orders_write on orders
  for all to authenticated
  using ((select private.has_store_role(store_id, array['owner','admin','manager']::public.member_role[])))
  with check ((select private.has_store_role(store_id, array['owner','admin','manager']::public.member_role[])));
```

4. Wrap helper calls in `(select …)` so Postgres evaluates them once per query, not per row.
5. `update` needs a matching `select` policy or it silently affects zero rows.
6. Never use `auth.role()` in policies. Use `to authenticated` / `to anon`.
7. Authorize from `store_members`, not JWT claims. Claims go stale and `user_metadata` is user-editable.

Role capabilities:

| Capability | owner | admin | manager | staff |
|-----------|-------|-------|---------|---------|
| Read orders/customers/products | ✓ | ✓ | ✓ | ✓ |
| Create/edit products, discounts | ✓ | ✓ | ✓ | ✗ |
| Fulfil/cancel orders, process returns | ✓ | ✓ | ✓ | ✗ |
| Adjust inventory | ✓ | ✓ | ✓ | ✗ |
| Manage team & roles | ✓ | ✓ | ✗ | ✗ |
| Store settings, billing, delete store | ✓ | ✗ | ✗ | ✗ |

## Indexes

Create an index for:

- Every FK column used in joins or policy checks (`store_id`, `customer_id`, `variant_id`, `order_id`).
- Composite `(store_id, <sort column> desc)` for list screens: `orders (store_id, placed_at desc)`, `products (store_id, created_at desc)`.
- Filter columns used with equality inside the store: `orders (store_id, status)`, `product_variants (store_id, sku)`.
- `order_items (order_id)`, `inventory_movements (variant_id, created_at desc)`.

Partial indexes where a filter is always applied (`where deleted_at is null`). Do not index low-cardinality columns alone.

## Migrations

- One migration per logical change: `supabase migration new <snake_case_name>`.
- Never edit a migration that has been applied to a shared or remote database. Add a new one.
- Never run destructive DDL (`drop table`, `drop column`, type narrowing) without explicit approval and a backup path.
- Migration order per table: create table → constraints → indexes → enable RLS → policies → grants.
- Commit generated types after `supabase gen types typescript` runs.
- Every policy and constraint change ships with a test that proves it blocks the wrong user (see `commerceos-testing`).

## Seed data

The demo is only credible if the data looks real.

- Target volumes: 1 store, 6 team members, 240 products across 8 collections, ~1,800 variant rows, 120 customers, 900 orders spread over 12 months, ~40 open returns, 6 discounts.
- Deterministic: fixed UUIDs for anchor records, seeded RNG, so screenshots and tests are stable.
- Realistic distributions: weekday/weekend ordering, a few high-volume SKUs, some zero-stock variants, some cancelled/refunded orders, customers with 1 and with 20+ orders.
- Idempotent: `insert … on conflict do nothing` keyed on stable ids.
- Always compute `orders.total_cents` from line items and discounts so totals reconcile.
- No lorem ipsum, no "Customer 1". Use plausible US names, brands, addresses, and SKUs.
- Seed lives in `supabase/seed.sql` (or a typed TS seeder for generated volume) and is documented in the README.

## Before finishing

- Types regenerated and committed.
- `npm run build` passes.
- RLS verified with a query as a non-member (must return zero rows) and as a member.
- No `select('*')` in list queries; no unindexed filters on large tables.
