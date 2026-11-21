-- Serialize same-key idempotent submissions so concurrent retries return the
-- existing result instead of racing the unique index.

create or replace function public.create_order(
  p_store_id uuid,
  p_customer_id uuid,
  p_email text,
  p_items jsonb,
  p_discount_code text,
  p_shipping_cents integer,
  p_tax_cents integer,
  p_mark_paid boolean,
  p_shipping_address jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_existing uuid;
  v_order_number text;
  v_attempt integer;
  v_customer_email text;
  v_item record;
  v_variant_title text;
  v_product_title text;
  v_product_type text;
  v_product_status public.product_status;
  v_sku text;
  v_unit_price integer;
  v_on_hand integer;
  v_reserved integer;
  v_subtotal bigint := 0;
  v_total integer;
  v_item_total integer;
  v_shipping integer := coalesce(p_shipping_cents, 0);
  v_tax integer := coalesce(p_tax_cents, 0);
  v_discount integer := 0;
  v_item_count integer := 0;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_address jsonb := case
    when p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object'
      then '{}'::jsonb
    else p_shipping_address
  end;
begin

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || btrim(p_idempotency_key), 0));
  end if;
  if not (select private.has_store_role(
    p_store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select id into v_existing
    from public.orders
    where store_id = p_store_id and idempotency_key = btrim(p_idempotency_key);

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_customer_id is not null then
    select lower(email) into v_customer_email
    from public.customers
    where id = p_customer_id and store_id = p_store_id;

    if v_customer_email is null then
      raise exception 'Customer not found';
    end if;

    if v_email = '' then
      v_email := v_customer_email;
    end if;
  end if;

  if v_email = '' or position('@' in v_email) <= 1 or char_length(v_email) > 320 then
    raise exception 'A valid email is required';
  end if;

  if v_shipping < 0 or v_tax < 0 then
    raise exception 'Shipping and tax cannot be negative';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'At least one line item is required';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many line items';
  end if;

  v_order_number := 'UG-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  for v_attempt in 1..5 loop
    begin
      insert into public.orders
        (store_id, customer_id, order_number, email, status, payment_status,
         subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
         shipping_address, idempotency_key)
      values
        (p_store_id, p_customer_id, v_order_number, v_email, 'pending', 'pending',
         0, 0, v_shipping, v_tax, v_shipping + v_tax, v_address,
         nullif(btrim(coalesce(p_idempotency_key, '')), ''))
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then
        raise;
      end if;
      v_order_number := 'UG-' || to_char(now(), 'YYMMDD') || '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end;
  end loop;

  for v_item in
    select item.variant_id, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items)
      as item(variant_id uuid, quantity integer)
    group by item.variant_id
    order by item.variant_id
  loop
    if v_item.variant_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Each line item needs a valid variant and quantity';
    end if;

    select v.title, p.title, p.product_type, p.status, v.sku, v.price_cents,
           i.on_hand, i.reserved
    into v_variant_title, v_product_title, v_product_type, v_product_status,
         v_sku, v_unit_price, v_on_hand, v_reserved
    from public.product_variants v
    join public.products p on p.id = v.product_id and p.store_id = v.store_id
    join public.inventory i on i.variant_id = v.id and i.store_id = v.store_id
    where v.id = v_item.variant_id and v.store_id = p_store_id
    for update of i;

    if v_sku is null then
      raise exception 'Variant not found in this store';
    end if;

    if v_product_status <> 'active' then
      raise exception 'Product is not active';
    end if;

    if v_item.quantity > v_on_hand - v_reserved then
      raise exception 'Insufficient stock for %', v_sku;
    end if;

    v_item_total := v_unit_price * v_item.quantity;
    v_subtotal := v_subtotal + v_item_total;

    if v_subtotal > 2147483647 then
      raise exception 'Order subtotal is too large';
    end if;

    insert into public.order_items
      (store_id, order_id, variant_id, product_title, variant_title, sku,
       product_type, quantity, unit_price_cents, discount_cents, tax_cents,
       total_cents, reserved_quantity, fulfilled_quantity)
    values
      (p_store_id, v_order_id, v_item.variant_id, v_product_title,
       v_variant_title, v_sku, coalesce(v_product_type, ''), v_item.quantity,
       v_unit_price, 0, 0, v_item_total, v_item.quantity, 0);

    update public.inventory
    set reserved = reserved + v_item.quantity
    where variant_id = v_item.variant_id and store_id = p_store_id;

    v_item_count := v_item_count + v_item.quantity;
  end loop;

  update public.orders
  set subtotal_cents = v_subtotal::integer,
      total_cents = v_subtotal::integer + v_shipping + v_tax
  where id = v_order_id;

  if p_discount_code is not null and btrim(p_discount_code) <> '' then
    select amount_cents into v_discount
    from public.redeem_discount(p_store_id, btrim(p_discount_code), v_order_id);

    update public.orders
    set discount_cents = v_discount,
        total_cents = subtotal_cents - v_discount + shipping_cents + tax_cents
    where id = v_order_id;
  end if;

  select total_cents into v_total from public.orders where id = v_order_id;

  if coalesce(p_mark_paid, false) then
    if v_total > 0 then
      insert into public.payments (store_id, order_id, amount_cents, status)
      values (p_store_id, v_order_id, v_total, 'paid');
    end if;

    update public.orders
    set status = 'processing', payment_status = 'paid'
    where id = v_order_id;
  end if;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (p_store_id, (select auth.uid()), 'order.created', 'order', v_order_id,
     jsonb_build_object(
       'order_number', v_order_number,
       'items', v_item_count,
       'total_cents', v_total,
       'discount_cents', v_discount,
       'paid', coalesce(p_mark_paid, false)
     ));

  perform private.notify_store(
    p_store_id,
    'New order',
    v_order_number || ' · ' || v_email || ' · ' || to_char(v_total / 100.0, 'FM$999,999,990.00'),
    '/orders/' || v_order_id::text
  );

  return v_order_id;
end;
$$;

create or replace function public.record_refund_once(
  p_order_id uuid,
  p_amount_cents integer,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_refund_id uuid;
  v_existing uuid;
  v_refunded_total integer;
  v_next_status public.payment_status;
  v_payment_id uuid;
begin

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    perform pg_advisory_xact_lock(hashtextextended(p_order_id::text || ':' || btrim(p_idempotency_key), 0));
  end if;
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if not (select private.has_store_role(
    v_order.store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select id into v_existing
    from public.refunds
    where store_id = v_order.store_id
      and idempotency_key = btrim(p_idempotency_key);

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Refund amount must be positive';
  end if;

  if p_amount_cents > v_order.total_cents then
    raise exception 'Refund exceeds the refundable order total';
  end if;

  select id into v_payment_id
  from public.payments
  where order_id = p_order_id and status = 'paid'
  order by created_at desc
  limit 1;

  insert into public.refunds
    (store_id, order_id, payment_id, amount_cents, reason, status,
     processed_by, idempotency_key)
  values
    (v_order.store_id, p_order_id, v_payment_id, p_amount_cents,
     coalesce(btrim(p_reason), ''), 'completed', (select auth.uid()),
     nullif(btrim(coalesce(p_idempotency_key, '')), ''))
  returning id into v_refund_id;

  select coalesce(sum(amount_cents), 0) into v_refunded_total
  from public.refunds
  where order_id = p_order_id and status = 'completed';

  v_next_status := case
    when v_refunded_total >= v_order.total_cents then 'refunded'
    else 'partially_refunded'
  end;

  update public.orders
  set payment_status = v_next_status
  where id = p_order_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (v_order.store_id, (select auth.uid()), 'order.refunded', 'order', p_order_id,
     jsonb_build_object('amount_cents', p_amount_cents, 'reason', p_reason));

  perform private.notify_store(
    v_order.store_id,
    'Refund recorded',
    v_order.order_number || ' · ' || to_char(p_amount_cents / 100.0, 'FM$999,999,990.00'),
    '/orders/' || p_order_id::text
  );

  return v_refund_id;
end;
$$;

revoke all on function public.create_order(
  uuid, uuid, text, jsonb, text, integer, integer, boolean, jsonb, text
) from public, anon;
grant execute on function public.create_order(
  uuid, uuid, text, jsonb, text, integer, integer, boolean, jsonb, text
) to authenticated;

revoke all on function public.record_refund_once(
  uuid, integer, text, text
) from public, anon;
grant execute on function public.record_refund_once(
  uuid, integer, text, text
) to authenticated;
