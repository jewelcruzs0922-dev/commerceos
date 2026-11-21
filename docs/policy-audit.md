# RLS policy audit

## Before and after

| Item | Before hardening | After hardening |
| --- | --- | --- |
| Public tables | 23 | 23 |
| RLS enabled | 23 | 23 |
| Policies | 48 | 39 |
| Direct workflow-table writes | 9 policies granted role-scoped DML | Revoked; policies removed |
| Public functions | 19 (mixed invoker/definer) | 19 definer, empty search path |
| Reporting views | definer-style | 4 security-invoker |

The nine removed policies were exactly:

1. `orders.orders_write`
2. `order_items.order_items_write`
3. `payments.payments_write`
4. `refunds.refunds_write`
5. `returns.returns_write`
6. `return_items.return_items_write`
7. `inventory.inventory_write`
8. `inventory_movements.inventory_movements_insert`
9. `discount_usages.discount_usages_write`

No read policy was removed or weakened. No other policy was modified. The 48 → 39 reduction is intentional: those nine policies only authorized direct table DML, which the security-definer workflows replace.

## Remaining policy matrix (39)

| Table | Policies | Access |
| --- | --- | --- |
| `profiles` | `profiles_select`, `profiles_update` | Own profile or shared-store profile; own update only |
| `stores` | `stores_select`, `stores_update` | Any active member read; owner/admin update |
| `store_members` | select, insert, update, delete | Active member read; owner/admin manage, guard trigger prevents self-escalation/last-owner loss |
| `invitations` | `invitations_all` | owner/admin only |
| `activity_logs` | select, insert | owner/admin read; active member insert as self |
| `products`, `product_variants`, `product_images` | select, write | active member read; owner/admin/manager write |
| `collections`, `collection_products` | select, write | active member read; owner/admin/manager write |
| `customers`, `customer_addresses` | select, write | active member read; owner/admin/manager write |
| `orders` | select | active member read only |
| `order_items` | select | active member read only |
| `payments` | select | active member read only |
| `refunds` | select | active member read only |
| `returns` | select | active member read only |
| `return_items` | select | active member read only |
| `inventory` | select | active member read only |
| `inventory_movements` | select | active member read only |
| `discounts` | select, write | active member read; owner/admin/manager write |
| `discount_usages` | select | active member read only |
| `notifications` | select, insert, update | store member; own/null user rows; update own |

All read policies on store-owned tables use `private.is_store_member(store_id)` or a role-scoped equivalent. Viewers are included in reads and excluded from writes. The `security_invoker` views inherit these read policies.

## Verification

- `tests/rls/security-audit.test.ts` asserts 23 RLS tables, 39 policies, zero workflow write grants/policies, 19 definer functions with empty search paths, and four security-invoker views.
- `tests/rls/schema.test.ts` attempts direct insert/update/delete on all nine workflow tables as an owner and expects permission denial; it also reads all four views as an outsider and expects zero rows.
- The hosted anonymous viewer read 350 orders but received `42501` for direct order update/insert.
- Hosted catalog verification confirmed zero direct write grants and zero write policies on the nine tables.

## Remaining read policy notes

- `notifications` intentionally exposes store-wide rows plus user-specific rows; unread state is store-wide.
- `activity_logs` is readable only by owner/admin, though all active members may append their own action row.
- `discounts` remains directly writable by managers because the discount management UI performs direct table updates; `discount_usages` is workflow-only.
- `orders`, `order_items`, `payments`, `refunds`, `returns`, `return_items`, `inventory`, and `inventory_movements` are read-only to authenticated clients.
