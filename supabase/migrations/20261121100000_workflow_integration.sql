-- Phase 7: transactional order creation/fulfillment, reservations, idempotency,
-- legal transition guards, notifications, and reconciliation views.

alter table public.orders
  add column idempotency_key text;

create unique index orders_store_idempotency_key
  on public.orders (store_id, idempotency_key)
  where idempotency_key is not null;

alter table public.order_items
  add column reserved_quantity integer not null default 0
    check (reserved_quantity >= 0),
  add column fulfilled_quantity integer not null default 0
    check (fulfilled_quantity >= 0),
  add constraint order_items_fulfilled_within_quantity
    check (fulfilled_quantity <= quantity),
  add constraint order_items_reserved_within_remaining
    check (reserved_quantity <= quantity - fulfilled_quantity);

update public.order_items oi
set fulfilled_quantity = oi.quantity
from public.orders o
where o.id = oi.order_id and o.status = 'fulfilled';

alter table public.refunds
  add column idempotency_key text;

create unique index refunds_store_idempotency_key
  on public.refunds (store_id, idempotency_key)
  where idempotency_key is not null;

create or replace function private.guard_order_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status and not (
    (old.status = 'pending' and new.status in ('processing', 'fulfilled', 'cancelled'))
    or (old.status = 'processing' and new.status in ('fulfilled', 'cancelled'))
  ) then
    raise exception 'Invalid order status transition from % to %', old.status, new.status;
  end if;

  if new.fulfillment_status <> old.fulfillment_status and not (
    (old.fulfillment_status = 'unfulfilled' and new.fulfillment_status in ('partially_fulfilled', 'fulfilled', 'cancelled'))
    or (old.fulfillment_status = 'partially_fulfilled' and new.fulfillment_status in ('partially_fulfilled', 'fulfilled', 'cancelled'))
  ) then
    raise exception 'Invalid fulfillment transition from % to %', old.fulfillment_status, new.fulfillment_status;
  end if;

  if new.payment_status <> old.payment_status and not (
    (old.payment_status = 'pending' and new.payment_status in ('authorized', 'paid', 'voided'))
    or (old.payment_status = 'authorized' and new.payment_status in ('paid', 'voided'))
    or (old.payment_status = 'paid' and new.payment_status in ('partially_refunded', 'refunded', 'voided'))
    or (old.payment_status = 'partially_refunded' and new.payment_status in ('partially_refunded', 'refunded'))
  ) then
    raise exception 'Invalid payment transition from % to %', old.payment_status, new.payment_status;
  end if;

  return new;
end;
$$;

create trigger orders_guard_transition
  before update on public.orders
  for each row execute function private.guard_order_transition();

create or replace function private.guard_order_item_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Order items cannot be deleted';
  end if;

  if new.order_id <> old.order_id
    or new.store_id <> old.store_id
    or new.product_title <> old.product_title
    or new.variant_title <> old.variant_title
    or new.sku <> old.sku
    or new.product_type <> old.product_type
    or new.quantity <> old.quantity
    or new.unit_price_cents <> old.unit_price_cents
    or new.discount_cents <> old.discount_cents
    or new.tax_cents <> old.tax_cents
    or new.total_cents <> old.total_cents
    or (new.variant_id is distinct from old.variant_id and new.variant_id is not null)
  then
    raise exception 'Order item snapshots are immutable';
  end if;

  return new;
end;
$$;

create trigger order_items_guard_snapshot
  before update or delete on public.order_items
  for each row execute function private.guard_order_item_snapshot();

create or replace function private.notify_store(
  p_store_id uuid,
  p_title text,
  p_body text,
  p_href text,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (store_id, user_id, title, body, href)
  values (p_store_id, p_user_id, p_title, p_body, p_href);
end;
$$;

revoke all on function private.notify_store(uuid, text, text, text, uuid)
  from public, anon;
grant execute on function private.notify_store(uuid, text, text, text, uuid)
  to authenticated;

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

revoke all on function public.create_order(
  uuid, uuid, text, jsonb, text, integer, integer, boolean, jsonb, text
) from public, anon;
grant execute on function public.create_order(
  uuid, uuid, text, jsonb, text, integer, integer, boolean, jsonb, text
) to authenticated;

create or replace function public.fulfill_order(
  p_order_id uuid,
  p_items jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_order_item public.order_items%rowtype;
  v_inventory public.inventory%rowtype;
  v_remaining integer;
  v_fulfilled integer := 0;
  v_partial boolean := false;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if not (select private.has_store_role(
    v_order.store_id,
    array['owner', 'admin', 'manager', 'staff']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Cancelled orders cannot be fulfilled';
  end if;

  if v_order.fulfillment_status = 'fulfilled' then
    return;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    for v_order_item in
      select * from public.order_items
      where order_id = p_order_id and reserved_quantity > 0
      order by id
      for update
    loop
      select * into v_inventory
      from public.inventory
      where variant_id = v_order_item.variant_id
      for update;

      if v_inventory.variant_id is null then
        raise exception 'Inventory record missing for one line item';
      end if;

      update public.inventory
      set reserved = reserved - v_order_item.reserved_quantity,
          on_hand = on_hand - v_order_item.reserved_quantity
      where variant_id = v_order_item.variant_id;

      insert into public.inventory_movements
        (store_id, variant_id, delta, reason, reference_type, reference_id,
         note, actor_id)
      values
        (v_order.store_id, v_order_item.variant_id,
         -v_order_item.reserved_quantity, 'fulfillment', 'order', p_order_id,
         'Order fulfilled', (select auth.uid()));

      update public.order_items
      set fulfilled_quantity = fulfilled_quantity + v_order_item.reserved_quantity,
          reserved_quantity = 0
      where id = v_order_item.id;

      v_fulfilled := v_fulfilled + v_order_item.reserved_quantity;
    end loop;
  else
    if jsonb_array_length(p_items) > 100 then
      raise exception 'Too many line items';
    end if;

    for v_item in
      select item.order_item_id, sum(item.quantity)::integer as quantity
      from jsonb_to_recordset(p_items)
        as item(order_item_id uuid, quantity integer)
      group by item.order_item_id
      order by item.order_item_id
    loop
      if v_item.order_item_id is null or v_item.quantity is null or v_item.quantity <= 0 then
        raise exception 'Each fulfillment line needs a valid item and quantity';
      end if;

      select * into v_order_item
      from public.order_items
      where id = v_item.order_item_id and order_id = p_order_id
      for update;

      if v_order_item.id is null then
        raise exception 'Order item not found on this order';
      end if;

      if v_item.quantity > v_order_item.reserved_quantity then
        raise exception 'Fulfillment exceeds the reserved quantity';
      end if;

      select * into v_inventory
      from public.inventory
      where variant_id = v_order_item.variant_id
      for update;

      if v_inventory.variant_id is null then
        raise exception 'Inventory record missing for one line item';
      end if;

      update public.inventory
      set reserved = reserved - v_item.quantity,
          on_hand = on_hand - v_item.quantity
      where variant_id = v_order_item.variant_id;

      insert into public.inventory_movements
        (store_id, variant_id, delta, reason, reference_type, reference_id,
         note, actor_id)
      values
        (v_order.store_id, v_order_item.variant_id, -v_item.quantity,
         'fulfillment', 'order', p_order_id, 'Order fulfilled',
         (select auth.uid()));

      update public.order_items
      set fulfilled_quantity = fulfilled_quantity + v_item.quantity,
          reserved_quantity = reserved_quantity - v_item.quantity
      where id = v_order_item.id;

      v_fulfilled := v_fulfilled + v_item.quantity;
    end loop;
  end if;

  select coalesce(sum(reserved_quantity), 0) into v_remaining
  from public.order_items
  where order_id = p_order_id;

  v_partial := v_remaining > 0;

  update public.orders
  set status = 'fulfilled',
      fulfillment_status = 'fulfilled'
  where id = p_order_id and not v_partial;

  update public.orders
  set status = case when status = 'pending' then 'processing' else status end,
      fulfillment_status = 'partially_fulfilled'
  where id = p_order_id and v_partial;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (v_order.store_id, (select auth.uid()),
     case when v_partial then 'order.partially_fulfilled' else 'order.fulfilled' end,
     'order', p_order_id,
     jsonb_build_object('quantity', v_fulfilled, 'partial', v_partial));

  perform private.notify_store(
    v_order.store_id,
    case when v_partial then 'Order partially fulfilled' else 'Order fulfilled' end,
    v_order.order_number || ' · ' || v_fulfilled::text || ' item(s)',
    '/orders/' || p_order_id::text
  );
end;
$$;

revoke all on function public.fulfill_order(uuid, jsonb) from public, anon;
grant execute on function public.fulfill_order(uuid, jsonb) to authenticated;

create or replace function public.cancel_order(
  p_order_id uuid,
  p_restock boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_released integer := 0;
  v_restocked integer := 0;
begin
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

  if v_order.status = 'cancelled' then
    return;
  end if;

  if v_order.status = 'fulfilled'
    or exists (
      select 1 from public.order_items
      where order_id = p_order_id and fulfilled_quantity > 0
    )
  then
    raise exception 'Fulfilled orders cannot be cancelled';
  end if;

  for v_item in
    select * from public.order_items
    where order_id = p_order_id
    order by id
    for update
  loop
    if v_item.reserved_quantity > 0 then
      update public.inventory
      set reserved = reserved - v_item.reserved_quantity
      where variant_id = v_item.variant_id;

      v_released := v_released + v_item.reserved_quantity;

      update public.order_items
      set reserved_quantity = 0
      where id = v_item.id;
    elsif coalesce(p_restock, false) then
      update public.inventory
      set on_hand = on_hand + v_item.quantity
      where variant_id = v_item.variant_id;

      insert into public.inventory_movements
        (store_id, variant_id, delta, reason, reference_type, reference_id,
         note, actor_id)
      values
        (v_order.store_id, v_item.variant_id, v_item.quantity, 'cancellation',
         'order', p_order_id, 'Order cancelled', (select auth.uid()));

      v_restocked := v_restocked + v_item.quantity;
    end if;
  end loop;

  update public.orders
  set status = 'cancelled',
      fulfillment_status = 'cancelled',
      cancelled_at = now(),
      payment_status = case
        when payment_status in ('pending', 'paid', 'authorized') then 'voided'
        else payment_status
      end
  where id = p_order_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (v_order.store_id, (select auth.uid()), 'order.cancelled', 'order', p_order_id,
     jsonb_build_object('released', v_released, 'restocked', v_restocked));

  perform private.notify_store(
    v_order.store_id,
    'Order cancelled',
    v_order.order_number || ' · ' || v_released::text || ' reserved item(s) released',
    '/orders/' || p_order_id::text
  );
end;
$$;

revoke all on function public.cancel_order(uuid, boolean) from public, anon;
grant execute on function public.cancel_order(uuid, boolean) to authenticated;

create or replace function public.record_refund_once(
  p_order_id uuid,
  p_amount_cents integer,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
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

revoke all on function public.record_refund_once(uuid, integer, text, text)
  from public, anon;
grant execute on function public.record_refund_once(uuid, integer, text, text)
  to authenticated;

create or replace function public.record_refund(
  p_order_id uuid,
  p_amount_cents integer,
  p_reason text
)
returns uuid
language sql
set search_path = ''
as $$
  select public.record_refund_once(
    p_order_id, p_amount_cents, p_reason, null
  );
$$;

revoke all on function public.record_refund(uuid, integer, text) from public, anon;
grant execute on function public.record_refund(uuid, integer, text) to authenticated;

create or replace function private.notify_return_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_number text;
begin
  select order_number into v_order_number
  from public.orders
  where id = new.order_id;

  if tg_op = 'INSERT' then
    perform private.notify_store(
      new.store_id,
      'Return requested',
      coalesce(v_order_number, 'Order') || ' · request opened',
      '/returns/' || new.id::text
    );
    return new;
  end if;

  if new.status <> old.status then
    if new.status = 'approved' or new.status = 'rejected' then
      perform private.notify_store(
        new.store_id,
        case when new.status = 'approved' then 'Return approved' else 'Return rejected' end,
        coalesce(v_order_number, 'Order') || ' · ' || new.status,
        '/returns/' || new.id::text
      );
    elsif new.status = 'refunded' then
      perform private.notify_store(
        new.store_id,
        'Return refunded',
        coalesce(v_order_number, 'Order') || ' · stock and refund recorded',
        '/returns/' || new.id::text
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger returns_notify_event
  after insert or update on public.returns
  for each row execute function private.notify_return_event();

create or replace function public.mark_notifications_read(p_store_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if not (select private.is_store_member(p_store_id)) then
    raise exception 'Not authorized';
  end if;

  update public.notifications
  set read_at = now()
  where store_id = p_store_id
    and read_at is null
    and (user_id is null or user_id = (select auth.uid()));

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.mark_notifications_read(uuid) from public, anon;
grant execute on function public.mark_notifications_read(uuid) to authenticated;

create or replace view public.order_reconciliation
with (security_invoker = true)
as
with item_totals as (
  select
    order_id,
    sum(
      unit_price_cents::bigint * quantity - discount_cents + tax_cents
    )::integer as items_total_cents
  from public.order_items
  group by order_id
),
refund_totals as (
  select order_id, sum(amount_cents)::integer as refunded_cents
  from public.refunds
  where status = 'completed'
  group by order_id
)
select
  o.store_id,
  o.id as order_id,
  o.order_number,
  o.status,
  o.subtotal_cents,
  coalesce(i.items_total_cents, 0) as items_total_cents,
  o.total_cents,
  coalesce(r.refunded_cents, 0) as refunded_cents,
  o.subtotal_cents = coalesce(i.items_total_cents, 0) as subtotal_matches,
  coalesce(r.refunded_cents, 0) <= o.total_cents as refunds_within_total,
  (
    o.fulfillment_status <> 'fulfilled'
    or not exists (
      select 1
      from public.order_items oi
      where oi.order_id = o.id
        and (oi.fulfilled_quantity <> oi.quantity or oi.reserved_quantity <> 0)
    )
  ) as fulfillment_matches
from public.orders o
left join item_totals i on i.order_id = o.id
left join refund_totals r on r.order_id = o.id;

create or replace view public.inventory_reconciliation
with (security_invoker = true)
as
with expected as (
  select
    oi.store_id,
    oi.variant_id,
    sum(oi.reserved_quantity)::integer as expected_reserved
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status <> 'cancelled'
  group by oi.store_id, oi.variant_id
)
select
  i.store_id,
  i.variant_id,
  i.on_hand,
  i.reserved as recorded_reserved,
  coalesce(e.expected_reserved, 0) as expected_reserved,
  i.reserved = coalesce(e.expected_reserved, 0) as matches
from public.inventory i
left join expected e
  on e.variant_id = i.variant_id and e.store_id = i.store_id;

grant select on public.order_reconciliation to authenticated;
grant select on public.inventory_reconciliation to authenticated;
