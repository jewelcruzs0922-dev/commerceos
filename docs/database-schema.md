# Database schema

CommerceOS uses a single Supabase Postgres database. The schema is multi-tenant even though the demo experience currently uses one store. Fourteen additive migrations under `supabase/migrations` create the schema, constraints, indexes, RLS, workflow functions, demo access, seed support, and the hardening pass.

Verified hosted shape: **23 public tables**, **39 RLS policies**, **19 public functions**, and **4 public views**. RLS is enabled on every public table. After hardening, all 19 public functions are `SECURITY DEFINER` with an empty `search_path`; the nine workflow-owned tables have no direct write grants or write policies for `authenticated`.

## Tenancy model

```text
profiles (auth user)
  └─ store_members (role, status) ── stores
                                        ├─ products ── product_variants ── inventory
                                        │                 ├─ product_images
                                        │                 └─ inventory_movements
                                        ├─ collections ── collection_products
                                        ├─ customers ── customer_addresses
                                        ├─ orders ── order_items
                                        │    ├─ payments
                                        │    ├─ refunds
                                        │    └─ returns ── return_items
                                        ├─ discounts ── discount_usages
                                        ├─ invitations
                                        ├─ notifications
                                        └─ activity_logs
```

- `profiles.id` is the auth user id.
- `store_members` joins a profile to a store and stores the role and status.
- Every store-owned table carries `store_id` directly, or reaches it through a rigorously constrained parent such as `order_items → orders` and `return_items → returns`.
- Store scope in the application is derived from the active membership, not from a client payload.

## Roles

| Role | Intent |
| --- | --- |
| `owner` | Full control, ownership-sensitive actions, demo reset |
| `admin` | Store administration, team management, settings |
| `manager` | Catalog, orders, customers, inventory, discounts, returns, analytics |
| `staff` | Operational reads, order fulfillment, inventory adjustments |
| `viewer` | Read-only demo guest; no writes |

Capabilities are centralized in `src/lib/permissions.ts`. RLS policies mirror the write boundaries; UI hiding is never the only control.

## Tables

### Identity and tenancy

| Table | Purpose / key invariants |
| --- | --- |
| `profiles` | Auth-linked staff profile, display name, avatar, notification preferences |
| `stores` | Store name, slug, currency, timezone, logo, `is_demo` flag |
| `store_members` | Role/status membership; one active membership resolved per session |
| `invitations` | Hashed one-time token, email, role, expiry, status; no email delivery |

### Catalog and stock

| Table | Purpose / key invariants |
| --- | --- |
| `products` | Store-scoped product, status, vendor, product type, description, image path |
| `product_variants` | SKU/barcode, option values, price and cost in cents, store-scoped SKU uniqueness |
| `product_images` | Ordered image URLs for a product |
| `collections` | Store-scoped collection with status and image |
| `collection_products` | Explicit product membership/order |
| `inventory` | Per-variant `on_hand` and `reserved`; available is derived, never stored |
| `inventory_movements` | Immutable adjustment/sale/reservation/release/return ledger |

Inventory invariants:

- `available = on_hand - reserved`.
- Negative on-hand is rejected by the adjustment function.
- Stock changes create movements in the same transaction.
- Reconciliation views compare persisted reservations against order items.

### Sales

| Table | Purpose / key invariants |
| --- | --- |
| `customers` | Store-scoped customer profile, tags, notes, spend aggregates |
| `customer_addresses` | Shipping/billing addresses |
| `orders` | Order number, statuses, totals in cents, shipping address snapshot, customer link |
| `order_items` | Historical snapshots: title, variant, SKU, quantity, unit price, discount, totals |
| `payments` | Demo payment records; no provider is contacted |
| `refunds` | Demo refund records, idempotency key, status, reason |
| `discounts` | Code, type, value, minimum, usage limit, window, active flag |
| `discount_usages` | Redemption ledger linked to orders/customers |
| `returns` | Request state machine, reason, decision metadata |
| `return_items` | Returned quantities linked to order items |

Order/payment/fulfillment enums:

- `order_status`: `pending`, `processing`, `fulfilled`, `cancelled`
- `payment_status`: `pending`, `authorized`, `paid`, `partially_refunded`, `refunded`, `voided`
- `fulfillment_status`: `unfulfilled`, `partially_fulfilled`, `fulfilled`, `cancelled`
- `return_status`: `requested`, `approved`, `rejected`, `received`, `refunded`, `closed`
- `refund_status`: `pending`, `completed`, `failed`, `cancelled`

Money is always integer cents. Order item snapshots are not rewritten by later product edits. Refunds cannot exceed the captured amount, and idempotency keys prevent duplicate retry effects.

### Operations

| Table | Purpose |
| --- | --- |
| `notifications` | Store-wide order, fulfillment, cancellation, refund, and return events |
| `activity_logs` | Actor, action, entity, and metadata for sensitive mutations |

## Views

| View | Purpose |
| --- | --- |
| `inventory_levels` | Variant-level on-hand, reserved, and derived available |
| `inventory_overview` | Inventory joined to product/variant labels and low-stock flags |
| `inventory_reconciliation` | Compares recorded reserved quantity with order-item expectations |
| `order_reconciliation` | Compares line totals, order totals, refund caps, and fulfillment counts |

Reconciliation views are used by the reports/analytics integrity section. They do not compare payment rows with order totals. All four views use `security_invoker = true`, so underlying RLS applies to the caller; this was verified in PGlite and against the hosted catalog.

## Public functions

Functions are the transactional boundary for multi-record operations. All 19 public functions are `SECURITY DEFINER`, set `search_path = ''`, and re-check the caller's membership and role before mutating data. Execution is granted to `authenticated`, not `anon` (anonymous demo sessions use the `authenticated` role after sign-in):

| Function | Role |
| --- | --- |
| `create_store` | Bootstrap a store and owner membership |
| `create_product`, `add_product_variant`, `duplicate_product` | Consistent catalog creation |
| `set_collection_products` | Atomic collection membership replacement |
| `adjust_inventory` | Validated stock adjustment with movement |
| `create_order` | Validate, snapshot, reserve, and write an order |
| `fulfill_order` | Partial/full fulfillment and movements |
| `cancel_order` | Legal cancellation and stock release |
| `record_refund`, `record_refund_once` | Capped, idempotent refund bookkeeping with same-key advisory lock |
| `redeem_discount` | Active-window/minimum/limit validation and usage record |
| `create_return`, `decide_return`, `refund_return` | Return state machine and optional restock |
| `accept_invitation` | Hashed token acceptance and membership creation |
| `join_demo_store` | Anonymous guest joins the demo as viewer |
| `reset_demo_store` | Guarded demo-only reset |
| `mark_notifications_read` | Store-wide notification read state |

## RLS model

- RLS is enabled on all 23 public tables.
- Helper predicates live in the unexposed `private` schema and require an active membership.
- Read policies require an active membership in the row's store (viewers included for read-only demo).
- Direct `INSERT`/`UPDATE`/`DELETE` is revoked on `orders`, `order_items`, `payments`, `refunds`, `returns`, `return_items`, `inventory`, `inventory_movements`, and `discount_usages`. Their write policies were removed. Only the security-definer workflow functions write those tables.
- Product, collection, customer, staff, invitation, notification, and activity writes retain their role-scoped RLS policies where the application performs direct mutations.
- A suspended membership loses access. The last owner cannot be demoted or removed.
- Cross-store inserts/updates are rejected by `WITH CHECK` conditions and tenant predicates.
- The service-role key is not used by application code.

The PGlite suites in `tests/rls` apply every migration and exercise cross-store reads/writes, staff restrictions, suspended membership, last-owner protection, refund caps, workflows, the demo seed, direct-write denial on all nine workflow tables, view isolation, duplicate submissions, and catalog security invariants. RLS was also exercised against the hosted project with an anonymous viewer: reads succeeded; direct order update/insert and `create_order` were rejected.

## Indexes and constraints

- Tenant-scoped indexes support list filters, joins, and sorting (orders by placed date/status, products by status/title, inventory by store/variant, activity by store/time).
- Foreign keys protect references; order/payment/refund history avoids destructive cascades.
- Check constraints cover non-negative quantities, valid totals, status enums, and store-scoped uniqueness where required.
- Money columns are integer cents; timestamps are `timestamptz` in UTC.

## Migrations

| File | Scope |
| --- | --- |
| `..._foundation_and_auth.sql` | Profiles, stores, memberships, invitations, helpers |
| `..._catalog.sql` | Catalog tables, variants, images, collections, inventory |
| `..._sales_inventory_and_operations.sql` | Customers, orders, items, payments, refunds, returns, discounts, notifications, activity |
| `..._rls_and_authorization.sql` | RLS policies, membership guards, role helpers |
| `..._core_workflows.sql` | Core commerce functions |
| `..._advanced_modules.sql` | Analytics/report support, returns, team, settings |
| `..._workflow_integration.sql` | Order creation, fulfillment, refund idempotency, views |
| `..._demo_viewer_role.sql` | Read-only viewer role |
| `..._demo_seed_and_access.sql` | Deterministic seed and guest access |
| `..._demo_type_correction.sql` | Demo seed typing corrections |
| `..._demo_low_stock.sql` | Low-stock demo data |
| `..._demo_guard_store_creation.sql` | Block guest store creation |
| `..._security_hardening.sql` | Definer workflows, direct-write revocation, policy removal, security-invoker views |
| `..._idempotency_lock.sql` | Advisory locks for same-key order and refund submissions |

Migrations are additive. Applied migrations are never rewritten.

## Seed and reset

- `supabase/seed.sql` resolves the `urban-goods` store and calls `private.seed_demo_store(id)`.
- The seed is deterministic and replaces the store's demo records instead of duplicating them.
- Volumes: 50 products, 150 variants, 8 collections, 150 customers, 350 orders over 12 months, 40 returns, 6 discounts, inventory movements, activity, notifications, and 13 low-stock variants.
- Demo images are external deterministic URL strings. Storage buckets and upload policies are not configured.
- Reset requires `is_demo`, owner/admin, and `DEMO_MODE=true`. It clears demo records and viewer memberships, not anonymous auth users.

## Type generation

`src/types/database.ts` is generated from the migrations with `npm run db:types` (PGlite). Regenerate after any schema change and commit the result. Do not hand-edit it.
