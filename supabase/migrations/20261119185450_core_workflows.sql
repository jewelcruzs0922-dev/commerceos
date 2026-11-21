-- Transactional commerce operations used by the core modules.

create or replace function public.create_product(
  p_store_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_status public.product_status,
  p_vendor text,
  p_product_type text,
  p_image_url text,
  p_variants jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_product_id uuid;
  variant jsonb;
  new_variant_id uuid;
  initial_stock integer;
begin
  if not (select private.has_store_role(
    p_store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if jsonb_typeof(p_variants) <> 'array'
    or jsonb_array_length(p_variants) = 0
  then
    raise exception 'At least one variant is required';
  end if;

  insert into public.products
    (store_id, title, slug, description, status, vendor, product_type)
  values
    (p_store_id, p_title, p_slug, coalesce(p_description, ''), p_status,
     nullif(btrim(p_vendor), ''), nullif(btrim(p_product_type), ''))
  returning id into new_product_id;

  if p_image_url is not null and btrim(p_image_url) <> '' then
    insert into public.product_images
      (store_id, product_id, storage_path, alt_text, position)
    values
      (p_store_id, new_product_id, btrim(p_image_url), p_title, 0);
  end if;

  for variant in select value from jsonb_array_elements(p_variants)
  loop
    initial_stock := coalesce((variant ->> 'on_hand')::integer, 0);

    if initial_stock < 0 then
      raise exception 'Stock cannot be negative';
    end if;

    insert into public.product_variants
      (store_id, product_id, title, sku, barcode, price_cents, cost_cents,
       position, low_stock_threshold)
    values
      (p_store_id, new_product_id,
       coalesce(nullif(btrim(variant ->> 'title'), ''), 'Default'),
       variant ->> 'sku',
       nullif(btrim(variant ->> 'barcode'), ''),
       (variant ->> 'price_cents')::integer,
       nullif(variant ->> 'cost_cents', '')::integer,
       coalesce((variant ->> 'position')::integer, 0),
       coalesce((variant ->> 'low_stock_threshold')::integer, 5))
    returning id into new_variant_id;

    insert into public.inventory (variant_id, store_id, on_hand, reserved)
    values (new_variant_id, p_store_id, initial_stock, 0);

    if initial_stock > 0 then
      insert into public.inventory_movements
        (store_id, variant_id, delta, reason, note, actor_id)
      values
        (p_store_id, new_variant_id, initial_stock, 'restock', 'Initial stock',
         (select auth.uid()));
    end if;
  end loop;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (p_store_id, (select auth.uid()), 'product.created', 'product',
     new_product_id, jsonb_build_object('title', p_title));

  return new_product_id;
end;
$$;

revoke all on function public.create_product(
  uuid, text, text, text, public.product_status, text, text, text, jsonb
) from public, anon;
grant execute on function public.create_product(
  uuid, text, text, text, public.product_status, text, text, text, jsonb
) to authenticated;

create or replace function public.add_product_variant(
  p_store_id uuid,
  p_product_id uuid,
  p_title text,
  p_sku text,
  p_barcode text,
  p_price_cents integer,
  p_cost_cents integer,
  p_on_hand integer,
  p_low_stock_threshold integer
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_variant_id uuid;
begin
  if not (select private.has_store_role(
    p_store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if coalesce(p_on_hand, 0) < 0 then
    raise exception 'Stock cannot be negative';
  end if;

  insert into public.product_variants
    (store_id, product_id, title, sku, barcode, price_cents, cost_cents,
     position, low_stock_threshold)
  values
    (p_store_id, p_product_id, coalesce(nullif(btrim(p_title), ''), 'Default'),
     p_sku, nullif(btrim(p_barcode), ''), p_price_cents, p_cost_cents,
     (select coalesce(max(position) + 1, 0) from public.product_variants
      where product_id = p_product_id),
     coalesce(p_low_stock_threshold, 5))
  returning id into new_variant_id;

  insert into public.inventory (variant_id, store_id, on_hand, reserved)
  values (new_variant_id, p_store_id, coalesce(p_on_hand, 0), 0);

  if coalesce(p_on_hand, 0) > 0 then
    insert into public.inventory_movements
      (store_id, variant_id, delta, reason, note, actor_id)
    values
      (p_store_id, new_variant_id, p_on_hand, 'restock', 'Initial stock',
       (select auth.uid()));
  end if;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (p_store_id, (select auth.uid()), 'variant.created', 'product',
     p_product_id, jsonb_build_object('sku', p_sku));

  return new_variant_id;
end;
$$;

revoke all on function public.add_product_variant(
  uuid, uuid, text, text, text, integer, integer, integer, integer
) from public, anon;
grant execute on function public.add_product_variant(
  uuid, uuid, text, text, text, integer, integer, integer, integer
) to authenticated;

create or replace function public.adjust_inventory(
  p_variant_id uuid,
  p_delta integer,
  p_reason public.inventory_reason,
  p_note text
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  target_store uuid;
  current_on_hand integer;
  next_on_hand integer;
begin
  select store_id, on_hand into target_store, current_on_hand
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if target_store is null then
    raise exception 'Inventory not found';
  end if;

  if not (select private.is_store_member(target_store)) then
    raise exception 'Not authorized';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'Adjustment must be non-zero';
  end if;

  next_on_hand := current_on_hand + p_delta;

  update public.inventory
  set on_hand = next_on_hand
  where variant_id = p_variant_id;

  insert into public.inventory_movements
    (store_id, variant_id, delta, reason, note, actor_id)
  values
    (target_store, p_variant_id, p_delta, p_reason,
     coalesce(btrim(p_note), ''), (select auth.uid()));

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target_store, (select auth.uid()), 'inventory.adjusted', 'variant',
     p_variant_id,
     jsonb_build_object('delta', p_delta, 'reason', p_reason, 'note', p_note));

  return next_on_hand;
end;
$$;

revoke all on function public.adjust_inventory(
  uuid, integer, public.inventory_reason, text
) from public, anon;
grant execute on function public.adjust_inventory(
  uuid, integer, public.inventory_reason, text
) to authenticated;

create or replace function public.cancel_order(
  p_order_id uuid,
  p_restock boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_store uuid;
  current_status public.order_status;
  item record;
begin
  select store_id, status into target_store, current_status
  from public.orders
  where id = p_order_id
  for update;

  if target_store is null then
    raise exception 'Order not found';
  end if;

  if not (select private.has_store_role(
    target_store, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if current_status = 'cancelled' then
    return;
  end if;

  if current_status = 'fulfilled' then
    raise exception 'Fulfilled orders cannot be cancelled';
  end if;

  if coalesce(p_restock, false) then
    for item in
      select variant_id, quantity
      from public.order_items
      where order_id = p_order_id and variant_id is not null
    loop
      update public.inventory
      set on_hand = on_hand + item.quantity
      where variant_id = item.variant_id;

      insert into public.inventory_movements
        (store_id, variant_id, delta, reason, reference_type, reference_id,
         note, actor_id)
      values
        (target_store, item.variant_id, item.quantity, 'cancellation',
         'order', p_order_id, 'Order cancelled', (select auth.uid()));
    end loop;
  end if;

  update public.orders
  set
    status = 'cancelled',
    cancelled_at = now(),
    payment_status = case
      when payment_status in ('paid', 'authorized') then 'voided'
      else payment_status
    end
  where id = p_order_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target_store, (select auth.uid()), 'order.cancelled', 'order', p_order_id,
     jsonb_build_object('restocked', coalesce(p_restock, false)));
end;
$$;

revoke all on function public.cancel_order(uuid, boolean) from public, anon;
grant execute on function public.cancel_order(uuid, boolean) to authenticated;

create or replace function public.record_refund(
  p_order_id uuid,
  p_amount_cents integer,
  p_reason text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  target_store uuid;
  order_total integer;
  new_refund_id uuid;
  refunded_total integer;
  next_status public.payment_status;
begin
  select store_id, total_cents into target_store, order_total
  from public.orders
  where id = p_order_id
  for update;

  if target_store is null then
    raise exception 'Order not found';
  end if;

  if not (select private.has_store_role(
    target_store, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Refund amount must be positive';
  end if;

  if p_amount_cents > order_total then
    raise exception 'Refund exceeds the refundable order total';
  end if;

  insert into public.refunds
    (store_id, order_id, amount_cents, reason, status, processed_by)
  values
    (target_store, p_order_id, p_amount_cents,
     coalesce(btrim(p_reason), ''), 'completed', (select auth.uid()))
  returning id into new_refund_id;

  select coalesce(sum(amount_cents), 0) into refunded_total
  from public.refunds
  where order_id = p_order_id and status = 'completed';

  next_status := case
    when refunded_total >= order_total then 'refunded'
    else 'partially_refunded'
  end;

  update public.orders
  set payment_status = next_status
  where id = p_order_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target_store, (select auth.uid()), 'order.refunded', 'order', p_order_id,
     jsonb_build_object('amount_cents', p_amount_cents, 'reason', p_reason));

  return new_refund_id;
end;
$$;

revoke all on function public.record_refund(uuid, integer, text) from public, anon;
grant execute on function public.record_refund(uuid, integer, text) to authenticated;

create or replace function public.duplicate_product(
  p_store_id uuid,
  p_product_id uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  source public.products%rowtype;
  new_product_id uuid;
  variant record;
  new_variant_id uuid;
  suffix text;
begin
  if not (select private.has_store_role(
    p_store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  select * into source
  from public.products
  where id = p_product_id and store_id = p_store_id;

  if source.id is null then
    raise exception 'Product not found';
  end if;

  suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.products
    (store_id, title, slug, description, status, vendor, product_type, tags)
  values
    (p_store_id, source.title || ' (copy)', source.slug || '-' || suffix,
     source.description, 'draft', source.vendor, source.product_type, source.tags)
  returning id into new_product_id;

  insert into public.product_images
    (store_id, product_id, variant_id, storage_path, alt_text, position)
  select p_store_id, new_product_id, null, storage_path, alt_text, position
  from public.product_images
  where product_id = p_product_id;

  for variant in
    select * from public.product_variants
    where product_id = p_product_id and store_id = p_store_id
  loop
    insert into public.product_variants
      (store_id, product_id, title, sku, barcode, price_cents, cost_cents,
       weight_grams, position, low_stock_threshold)
    values
      (p_store_id, new_product_id, variant.title,
       left(variant.sku, 48) || '-' || suffix, variant.barcode,
       variant.price_cents, variant.cost_cents, variant.weight_grams,
       variant.position, variant.low_stock_threshold)
    returning id into new_variant_id;

    insert into public.inventory (variant_id, store_id, on_hand, reserved)
    values (new_variant_id, p_store_id, 0, 0);
  end loop;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (p_store_id, (select auth.uid()), 'product.duplicated', 'product',
     new_product_id, jsonb_build_object('source_id', p_product_id));

  return new_product_id;
end;
$$;

revoke all on function public.duplicate_product(uuid, uuid) from public, anon;
grant execute on function public.duplicate_product(uuid, uuid) to authenticated;

create or replace view public.inventory_overview
with (security_invoker = true)
as
select
  i.variant_id,
  i.store_id,
  v.product_id,
  v.sku,
  v.title as variant_title,
  p.title as product_title,
  v.low_stock_threshold,
  i.on_hand,
  i.reserved,
  i.on_hand - i.reserved as available,
  (i.on_hand - i.reserved) <= v.low_stock_threshold as is_low_stock,
  i.updated_at
from public.inventory i
join public.product_variants v
  on v.id = i.variant_id and v.store_id = i.store_id
join public.products p
  on p.id = v.product_id and p.store_id = i.store_id;

grant select on public.inventory_overview to authenticated;

create or replace function public.set_collection_products(
  p_collection_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_store uuid;
begin
  select store_id into target_store
  from public.collections
  where id = p_collection_id;

  if target_store is null then
    raise exception 'Collection not found';
  end if;

  if not (select private.has_store_role(
    target_store, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  delete from public.collection_products
  where collection_id = p_collection_id;

  if coalesce(array_length(p_product_ids, 1), 0) > 0 then
    insert into public.collection_products
      (collection_id, product_id, store_id, position)
    select
      p_collection_id,
      product_id,
      target_store,
      (ordinality - 1)::integer
    from unnest(p_product_ids) with ordinality
      as product_input(product_id, ordinality);
  end if;
end;
$$;

revoke all on function public.set_collection_products(uuid, uuid[])
  from public, anon;
grant execute on function public.set_collection_products(uuid, uuid[])
  to authenticated;