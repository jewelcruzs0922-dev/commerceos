# Security-definer function audit

All 19 public functions are `SECURITY DEFINER`, use `SET search_path = ''`, and are executable by `authenticated` but not `anon`. Caller identity is always read from `(select auth.uid())`; tenant access is resolved from `store_members` rather than a client-supplied role. This audit is manual plus catalog tests in `tests/rls/security-audit.test.ts`.

| Function | Caller / tenant check | Role check | Writes | Notes |
| --- | --- | --- | --- | --- |
| `create_store(text)` | `auth.uid()` required | None needed (bootstrap); anonymous sessions rejected | `stores`, `store_members`, `activity_logs` | First membership is owner; slug collision loop bounded |
| `create_product(...)` | `p_store_id` must be caller's store via `has_store_role` | owner/admin/manager | products, variants, images, inventory, movements, activity | `auth.uid()` recorded in movement/log |
| `add_product_variant(...)` | store membership by role | owner/admin/manager | variant, inventory, movement, activity | Negative stock rejected |
| `adjust_inventory(...)` | latest definition resolves variant's store | owner/admin/manager/staff | inventory, movement, activity | Non-zero delta, negative-on-hand guard |
| `create_order(...)` | store role check from `p_store_id` | owner/admin/manager | orders, items, inventory, payments, logs, notifications | Validates variant ownership, active product, stock; advisory lock for same idempotency key |
| `fulfill_order(...)` | re-reads order and its `store_id` | owner/admin/manager/staff | order, items, inventory, movements, logs, notifications | Row lock; partial/full; no duplicate movement |
| `cancel_order(...)` | re-reads order and its `store_id` | owner/admin/manager | order, items, inventory, movements, logs | Rejects fulfilled orders; releases stock once |
| `record_refund_once(...)` | re-reads order and its `store_id` | owner/admin/manager | refunds, order payment status, logs, notifications | Refund cap, idempotency key advisory lock + unique index |
| `record_refund(...)` | delegates to `record_refund_once` | Inner function enforces | Same as above | Definer wrapper; no extra trust |
| `duplicate_product(...)` | store role check | owner/admin/manager | products, images, variants, inventory, activity | Zero-stock draft |
| `set_collection_products(...)` | collection store + role | owner/admin/manager | collection_products | Atomic replace |
| `redeem_discount(...)` | store role check | owner/admin/manager | discount_usages, discounts, activity | Row-locks discount; checks active/window/minimum/limit/duplicate order |
| `create_return(...)` | re-reads order's store | owner/admin/manager | returns, return_items, activity | Quantity checks against ordered and prior returns |
| `decide_return(...)` | re-reads return's store | owner/admin/manager | returns, activity | Only requested → approved/rejected |
| `refund_return(...)` | re-reads return's store | owner/admin/manager | refunds, orders, inventory, movements, returns, activity | Only approved returns; optional restock; refund cap |
| `accept_invitation(text)` | `auth.uid()` required; token hash and email binding | Invitation role applied | store_members, invitations, activity, profile | Cannot accept another email's invitation; owner invitation blocked at creation |
| `join_demo_store()` | anonymous JWT required; demo store lookup | Inserts viewer | store_members | Rejects non-anonymous and non-demo stores |
| `reset_demo_store()` | `auth.uid()` + active owner/admin of `is_demo` store | owner/admin | all demo records through `private.seed_demo_store` | App-level `DEMO_MODE` gate is separate; DB check protects normal stores |
| `mark_notifications_read(uuid)` | store membership | any active member | notifications | Only store-wide or own user rows |

## Checks applied

- No function uses a client-supplied role or membership.
- All functions are schema-qualified because the search path is empty.
- All functions have explicit `REVOKE … FROM public, anon` and `GRANT EXECUTE … TO authenticated` (catalog-tested).
- Sensitive table writes are reachable only through these functions.
- Row locks are used for order, inventory, discount, and refund state races.
- Same-key order and refund retries use `pg_advisory_xact_lock` plus a unique partial index.
- `reset_demo_store` is intentionally callable by an owner/admin even if the app hides it when `DEMO_MODE` is false; it cannot target a non-demo store.
