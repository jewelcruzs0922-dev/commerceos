-- Production hardening: sensitive mutations only through workflow functions,
-- security-invoker views, and explicit denial of direct table writes.

alter function public.create_product(
  uuid, text, text, text, public.product_status, text, text, text, jsonb
) security definer;
alter function public.add_product_variant(
  uuid, uuid, text, text, text, integer, integer, integer, integer
) security definer;
alter function public.adjust_inventory(
  uuid, integer, public.inventory_reason, text
) security definer;
alter function public.cancel_order(uuid, boolean) security definer;
alter function public.record_refund_once(
  uuid, integer, text, text
) security definer;
alter function public.duplicate_product(uuid, uuid) security definer;
alter function public.set_collection_products(uuid, uuid[]) security definer;
alter function public.redeem_discount(uuid, text, uuid) security definer;
alter function public.create_return(uuid, text, jsonb) security definer;
alter function public.decide_return(uuid, boolean, text) security definer;
alter function public.refund_return(uuid, boolean) security definer;
alter function public.create_order(
  uuid, uuid, text, jsonb, text, integer, integer, boolean, jsonb, text
) security definer;
alter function public.record_refund(uuid, integer, text) security definer;

revoke insert, update, delete on table public.orders from anon, authenticated;
revoke insert, update, delete on table public.order_items from anon, authenticated;
revoke insert, update, delete on table public.payments from anon, authenticated;
revoke insert, update, delete on table public.refunds from anon, authenticated;
revoke insert, update, delete on table public.returns from anon, authenticated;
revoke insert, update, delete on table public.return_items from anon, authenticated;
revoke insert, update, delete on table public.inventory from anon, authenticated;
revoke insert, update, delete on table public.inventory_movements from anon, authenticated;
revoke insert, update, delete on table public.discount_usages from anon, authenticated;

drop policy if exists orders_write on public.orders;
drop policy if exists order_items_write on public.order_items;
drop policy if exists payments_write on public.payments;
drop policy if exists refunds_write on public.refunds;
drop policy if exists returns_write on public.returns;
drop policy if exists return_items_write on public.return_items;
drop policy if exists inventory_write on public.inventory;
drop policy if exists inventory_movements_insert on public.inventory_movements;
drop policy if exists discount_usages_write on public.discount_usages;

alter view public.inventory_levels set (security_invoker = true);
alter view public.inventory_overview set (security_invoker = true);
alter view public.inventory_reconciliation set (security_invoker = true);
alter view public.order_reconciliation set (security_invoker = true);

grant select on public.inventory_levels to authenticated;
grant select on public.inventory_overview to authenticated;
grant select on public.inventory_reconciliation to authenticated;
grant select on public.order_reconciliation to authenticated;
