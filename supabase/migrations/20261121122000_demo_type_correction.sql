-- Phase 8 correction: align seeded product types with product groups.
-- Replaces the seed function so fresh resets produce coherent categories.

create or replace function private.seed_demo_store(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titles text[] := array[
    'Everyday Canvas Tote','Weekender Duffel','Meridian Backpack','Field Notes Pouch',
    'Harbor Zip Wallet','Northline Card Case','Atlas Weekender','Studio Apron',
    'Heavyweight Pocket Tee','Sunwashed Oxford Shirt','Merino Crew Sweater','Flannel Overshirt',
    'Relaxed Chino','Canvas Work Pant','Everyday Short','Quilted Vest',
    'Stoneware Mug','Ribbed Glass Tumbler','Oak Serving Board','Linen Table Runner',
    'Wool Throw Blanket','Ceramic Planter','Brass Desk Lamp','Canvas Storage Bin',
    'Leather Notebook Cover','Grid Notebook Set','Machined Pen','Brass Ruler',
    'Waxed Canvas Dopp Kit','Travel Shoe Bag','Packing Cube Set','Luggage Tag',
    'Trail Cap','Wool Beanie','Canvas Belt','Merino Socks',
    'Leather Key Clip','Enamel Pin Set','Compass Keyring','Utility Lanyard',
    'Cedar Incense Set','Botanical Candle','Hand Salve Tin','Bath Soak Jar',
    'Insulated Bottle','Camp Mug','Picnic Blanket','Trail Snack Tin',
    'Market Tote','Weekend Cap'
  ];
  v_types text[] := array[
    'Bags','Apparel','Home','Accessories','Footwear','Outdoor','Stationery','Wellness'
  ];
  v_first text[] := array[
    'Avery','Jordan','Riley','Morgan','Casey','Taylor','Cameron','Drew',
    'Emerson','Finley','Harper','Hayden','Jamie','Kendall','Logan','Parker',
    'Peyton','Quinn','Reese','Rowan','Sage','Sasha','Skyler','Tatum'
  ];
  v_last text[] := array[
    'Bennett','Carter','Dawson','Ellis','Foster','Grant','Hayes','Ingram',
    'Jensen','Keller','Lawson','Mercer','Nolan','Osborne','Parker','Quinn',
    'Reed','Sutton','Turner','Underwood','Vance','Walker','Wells','Young'
  ];
  v_vendors text[] := array[
    'Urban Goods','Northline Supply','Field & Form','Atlas Studio'
  ];
  v_collection_titles text[] := array[
    'New Arrivals','Everyday Carry','Home & Table','Studio Essentials',
    'Weekend Layers','Gifts Under $50','Limited Runs','Archive'
  ];
  v_streets text[] := array[
    'Oak Street','Maple Avenue','Cedar Lane','Pine Court','Willow Drive',
    'Birch Way','Aspen Road','Juniper Street','Hickory Place','Sycamore Lane'
  ];
  v_cities text[] := array[
    'Austin','Portland','Denver','Brooklyn','Chicago','Seattle','Nashville',
    'Minneapolis','Philadelphia','San Diego'
  ];
  v_states text[] := array[
    'TX','OR','CO','NY','IL','WA','TN','MN','PA','CA'
  ];
  v_reasons text[] := array[
    'Changed mind','Damaged in transit','Wrong size','Late delivery','Quality issue'
  ];
  v_codes text[] := array[
    'WELCOME10','SAVE15','WEEKEND20','VIP25','TAKE5','BUNDLE10'
  ];
  v_i integer;
  v_j integer;
  v_k integer;
  v_bucket integer;
  v_status public.order_status;
  v_payment public.payment_status;
  v_fulfillment public.fulfillment_status;
  v_placed timestamptz;
  v_product_id uuid;
  v_variant_id uuid;
  v_customer_id uuid;
  v_order_id uuid;
  v_return_id uuid;
  v_collection_id uuid;
  v_title text;
  v_type text;
  v_slug text;
  v_price integer;
  v_on_hand integer;
  v_variant_title text;
  v_product_title text;
  v_product_type text;
  v_sku text;
  v_unit_price integer;
  v_variant_count integer;
  v_subtotal bigint;
  v_discount integer;
  v_shipping integer;
  v_tax integer;
  v_total integer;
  v_code text;
  v_discount_id uuid;
  v_discount_type public.discount_type;
  v_discount_value integer;
  v_item record;
  v_return record;
  v_refund integer;
  v_customer_name text;
  v_customer_email text;
  v_line1 text;
begin
  if not exists (select 1 from public.stores where id = p_store_id) then
    raise exception 'Store not found';
  end if;

  update public.stores
  set name = 'Urban Goods',
      timezone = 'America/New_York',
      currency = 'USD',
      logo_url = 'https://picsum.photos/seed/urban-goods-logo/200/200',
      is_demo = true
  where id = p_store_id;

  perform private.clear_demo_store(p_store_id);

  for v_i in 1..50 loop
    v_product_id := md5('commerceos-demo-product-' || v_i)::uuid;
    v_title := v_titles[((v_i - 1) % array_length(v_titles, 1)) + 1];
    v_type := case
      when v_i <= 8 then 'Bags'
      when v_i <= 16 then 'Apparel'
      when v_i <= 24 then 'Home'
      when v_i <= 28 then 'Stationery'
      when v_i <= 32 then 'Accessories'
      when v_i <= 36 then case when v_i = 35 then 'Accessories' else 'Apparel' end
      when v_i <= 40 then 'Accessories'
      when v_i <= 44 then 'Wellness'
      when v_i <= 48 then 'Outdoor'
      when v_i = 49 then 'Bags'
      else 'Apparel'
    end;
    v_slug := lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || v_i::text;
    v_price := 1800 + ((v_i * 731) % 12000);

    insert into public.products
      (id, store_id, title, slug, description, status, vendor, product_type,
       tags, created_at, updated_at)
    values
      (v_product_id, p_store_id, v_title, v_slug,
       'A considered ' || lower(v_type) || ' piece for everyday Urban Goods use.',
       case
         when v_i % 13 = 0 then 'draft'::public.product_status
         when v_i % 17 = 0 then 'archived'::public.product_status
         else 'active'::public.product_status
       end,
       v_vendors[((v_i - 1) % array_length(v_vendors, 1)) + 1],
       v_type,
       array[v_type, case when v_i % 5 = 0 then 'new' else 'core' end],
       now() - ((v_i * 3) % 300) * interval '1 day',
       now() - ((v_i * 3) % 300) * interval '1 day')
    on conflict (id) do nothing;

    insert into public.product_images
      (store_id, product_id, storage_path, alt_text, position)
    values
      (p_store_id, v_product_id,
       'https://picsum.photos/seed/urbangoods-' || v_i::text || '/900/900',
       v_title, 0)
    on conflict do nothing;

    for v_j in 1..3 loop
      v_variant_id := md5('commerceos-demo-variant-' || v_i || '-' || v_j)::uuid;
      v_on_hand := 80 + ((v_i * 17 + v_j * 23) % 120);

      insert into public.product_variants
        (id, store_id, product_id, title, sku, price_cents, cost_cents,
         weight_grams, position, low_stock_threshold)
      values
        (v_variant_id, p_store_id, v_product_id,
         (array['Small','Medium','Large'])[v_j],
         'UG-' || lpad(v_i::text, 3, '0') || '-' || substr('SML', v_j, 1),
         v_price + (v_j - 1) * 500,
         round((v_price + (v_j - 1) * 500) * 0.45)::integer,
         300 + v_j * 80, v_j - 1, 8)
      on conflict (id) do nothing;

      insert into public.inventory (variant_id, store_id, on_hand, reserved)
      values (v_variant_id, p_store_id, v_on_hand, 0)
      on conflict (variant_id) do nothing;

      insert into public.inventory_movements
        (store_id, variant_id, delta, reason, note, created_at)
      values
        (p_store_id, v_variant_id, v_on_hand, 'restock', 'Opening stock',
         now() - interval '320 days');
    end loop;

    insert into public.activity_logs
      (store_id, actor_id, action, entity_type, entity_id, metadata, created_at)
    values
      (p_store_id, null, 'product.created', 'product', v_product_id,
       jsonb_build_object('title', v_title), now() - interval '300 days');
  end loop;

  for v_i in 1..150 loop
    v_customer_id := md5('commerceos-demo-customer-' || v_i)::uuid;
    v_customer_name :=
      v_first[((v_i - 1) % array_length(v_first, 1)) + 1] || ' ' ||
      v_last[((v_i * 7) % array_length(v_last, 1)) + 1];
    v_customer_email :=
      lower(replace(v_customer_name, ' ', '.')) || v_i::text ||
      '@urbangoods.example';

    insert into public.customers
      (id, store_id, email, name, phone, notes, tags, accepts_marketing,
       created_at, updated_at)
    values
      (v_customer_id, p_store_id, v_customer_email, v_customer_name,
       '+1-512-555-' || lpad((1000 + v_i)::text, 4, '0'),
       case when v_i % 9 = 0 then 'Prefers pickup when available.' else '' end,
       case
         when v_i % 11 = 0 then array['vip']
         when v_i % 7 = 0 then array['wholesale']
         else array['retail']
       end,
       v_i % 3 = 0,
       now() - ((v_i * 2) % 340) * interval '1 day',
       now() - ((v_i * 2) % 340) * interval '1 day')
    on conflict (id) do nothing;

    v_line1 := (100 + v_i)::text || ' ' ||
      v_streets[((v_i - 1) % array_length(v_streets, 1)) + 1];

    insert into public.customer_addresses
      (store_id, customer_id, name, line1, city, region, postal_code, country,
       is_default_shipping, is_default_billing, created_at)
    values
      (p_store_id, v_customer_id, v_customer_name, v_line1,
       v_cities[((v_i - 1) % array_length(v_cities, 1)) + 1],
       v_states[((v_i - 1) % array_length(v_states, 1)) + 1],
       lpad(((v_i * 37) % 90000 + 10000)::text, 5, '0'),
       'US', true, true,
       now() - ((v_i * 2) % 340) * interval '1 day')
    on conflict do nothing;
  end loop;

  for v_i in 1..8 loop
    v_collection_id := md5('commerceos-demo-collection-' || v_i)::uuid;

    insert into public.collections
      (id, store_id, title, slug, description, status, image_path,
       created_at, updated_at)
    values
      (v_collection_id, p_store_id, v_collection_titles[v_i],
       lower(regexp_replace(v_collection_titles[v_i], '[^a-zA-Z0-9]+', '-', 'g')),
       'A seeded edit of Urban Goods pieces for ' || lower(v_collection_titles[v_i]) || '.',
       'active',
       'https://picsum.photos/seed/urbangoods-collection-' || v_i::text || '/1200/800',
       now() - interval '240 days', now() - interval '240 days')
    on conflict (id) do nothing;

    insert into public.collection_products
      (collection_id, product_id, store_id, position)
    select
      v_collection_id, p.id, p_store_id,
      (row_number() over (order by p.id))::integer - 1
    from public.products p
    where p.store_id = p_store_id
    order by p.id
    offset ((v_i - 1) * 6)
    limit 6
    on conflict do nothing;
  end loop;

  insert into public.discounts
    (id, store_id, code, description, type, value, starts_at, ends_at,
     minimum_subtotal_cents, usage_limit, is_active, created_at, updated_at)
  values
    (md5('commerceos-demo-discount-1')::uuid, p_store_id, 'WELCOME10',
     '10% off a first order', 'percentage', 10, now() - interval '90 days', null,
     0, 500, true, now() - interval '90 days', now() - interval '90 days'),
    (md5('commerceos-demo-discount-2')::uuid, p_store_id, 'SAVE15',
     '15% seasonal saving', 'percentage', 15, now() - interval '60 days', null,
     0, 500, true, now() - interval '60 days', now() - interval '60 days'),
    (md5('commerceos-demo-discount-3')::uuid, p_store_id, 'WEEKEND20',
     '20% weekend promotion', 'percentage', 20, now() - interval '45 days', null,
     0, 500, true, now() - interval '45 days', now() - interval '45 days'),
    (md5('commerceos-demo-discount-4')::uuid, p_store_id, 'VIP25',
     '25% VIP appreciation', 'percentage', 25, now() - interval '30 days', null,
     0, 500, true, now() - interval '30 days', now() - interval '30 days'),
    (md5('commerceos-demo-discount-5')::uuid, p_store_id, 'TAKE5',
     '$5 off any order', 'fixed_amount', 500, now() - interval '20 days', null,
     0, 500, true, now() - interval '20 days', now() - interval '20 days'),
    (md5('commerceos-demo-discount-6')::uuid, p_store_id, 'BUNDLE10',
     '10% bundle saving', 'percentage', 10, now() - interval '10 days', null,
     0, 500, true, now() - interval '10 days', now() - interval '10 days')
  on conflict (id) do nothing;

  select count(*) into v_variant_count
  from public.product_variants v
  join public.products p on p.id = v.product_id and p.store_id = v.store_id
  where p.store_id = p_store_id and p.status = 'active';

  for v_i in 1..350 loop
    v_bucket := v_i % 20;
    v_placed := now() - ((350 - v_i) * interval '1 day')
      - ((v_i % 7) * interval '2 hours');

    if v_bucket <= 1 then
      v_status := 'cancelled';
      v_payment := 'voided';
      v_fulfillment := 'cancelled';
    elsif v_bucket <= 4 then
      v_status := 'pending';
      v_payment := 'pending';
      v_fulfillment := 'unfulfilled';
    elsif v_bucket <= 7 then
      v_status := 'processing';
      v_payment := 'paid';
      v_fulfillment := 'unfulfilled';
    else
      v_status := 'fulfilled';
      v_payment := 'paid';
      v_fulfillment := 'fulfilled';
    end if;

    select id, name, email into v_customer_id, v_customer_name, v_customer_email
    from public.customers
    where store_id = p_store_id
    order by id
    offset ((v_i * 11) % 150)
    limit 1;

    v_order_id := md5('commerceos-demo-order-' || v_i)::uuid;
    v_shipping := case v_i % 3 when 0 then 0 when 1 then 500 else 900 end;

    insert into public.orders
      (id, store_id, customer_id, order_number, email, status, payment_status,
       fulfillment_status, subtotal_cents, discount_cents, shipping_cents,
       tax_cents, total_cents, shipping_address, placed_at, cancelled_at,
       created_at, updated_at)
    values
      (v_order_id, p_store_id, v_customer_id,
       'UG-SEED-' || lpad(v_i::text, 4, '0'), v_customer_email, v_status,
       v_payment, v_fulfillment, 0, 0, v_shipping, 0, v_shipping,
       jsonb_build_object(
         'name', v_customer_name,
         'line1', (100 + (v_i % 150))::text || ' Market Street',
         'city', v_cities[((v_i - 1) % array_length(v_cities, 1)) + 1],
         'region', v_states[((v_i - 1) % array_length(v_states, 1)) + 1],
         'postal_code', lpad(((v_i * 41) % 90000 + 10000)::text, 5, '0'),
         'country', 'US'
       ),
       v_placed,
       case when v_status = 'cancelled' then v_placed + interval '1 day' end,
       v_placed, v_placed);

    v_subtotal := 0;

    for v_k in 1..(1 + (v_i % 3)) loop
      select v.id, v.title, v.sku, v.price_cents, p.title, p.product_type
      into v_variant_id, v_variant_title, v_sku, v_unit_price,
           v_product_title, v_product_type
      from public.product_variants v
      join public.products p on p.id = v.product_id and p.store_id = v.store_id
      where p.store_id = p_store_id and p.status = 'active'
      order by v.sku
      offset ((v_i * 13 + v_k * 7) % greatest(v_variant_count, 1))
      limit 1;

      if v_variant_id is null then
        continue;
      end if;

      insert into public.order_items
        (store_id, order_id, variant_id, product_title, variant_title, sku,
         product_type, quantity, unit_price_cents, discount_cents, tax_cents,
         total_cents, reserved_quantity, fulfilled_quantity, created_at)
      values
        (p_store_id, v_order_id, v_variant_id, v_product_title, v_variant_title,
         v_sku, coalesce(v_product_type, ''),
         1 + ((v_i + v_k) % 3), v_unit_price, 0, 0,
         v_unit_price * (1 + ((v_i + v_k) % 3)),
         case
           when v_status in ('pending', 'processing') then 1 + ((v_i + v_k) % 3)
           else 0
         end,
         case when v_status = 'fulfilled' then 1 + ((v_i + v_k) % 3) else 0 end,
         v_placed);

      v_subtotal := v_subtotal + v_unit_price * (1 + ((v_i + v_k) % 3));
    end loop;

    v_discount := 0;

    if v_i % 4 = 0 then
      v_code := v_codes[((v_i / 4) % array_length(v_codes, 1)) + 1];

      select id, type, value into v_discount_id, v_discount_type, v_discount_value
      from public.discounts
      where store_id = p_store_id and code = v_code;

      if v_discount_type = 'percentage' then
        v_discount := floor(v_subtotal::numeric * v_discount_value / 100)::integer;
      else
        v_discount := least(v_discount_value, v_subtotal::integer);
      end if;

      insert into public.discount_usages
        (store_id, discount_id, order_id, customer_id, amount_cents, created_at)
      values
        (p_store_id, v_discount_id, v_order_id, v_customer_id, v_discount, v_placed);
    end if;

    v_tax := round((v_subtotal - v_discount) * 0.08)::integer;
    v_total := v_subtotal::integer - v_discount + v_shipping + v_tax;

    update public.orders
    set subtotal_cents = v_subtotal::integer,
        discount_cents = v_discount,
        tax_cents = v_tax,
        total_cents = v_total
    where id = v_order_id;

    if v_status in ('processing', 'fulfilled') then
      insert into public.payments
        (store_id, order_id, amount_cents, status, created_at, updated_at)
      values
        (p_store_id, v_order_id, v_total, 'paid', v_placed, v_placed);
    end if;

    for v_item in
      select * from public.order_items where order_id = v_order_id
    loop
      if v_status = 'fulfilled' then
        update public.inventory
        set on_hand = on_hand - v_item.quantity
        where variant_id = v_item.variant_id;

        insert into public.inventory_movements
          (store_id, variant_id, delta, reason, reference_type, reference_id,
           note, created_at)
        values
          (p_store_id, v_item.variant_id, -v_item.quantity, 'fulfillment',
           'order', v_order_id, 'Seeded order fulfilled', v_placed);
      elsif v_status in ('pending', 'processing') then
        update public.inventory
        set reserved = reserved + v_item.quantity
        where variant_id = v_item.variant_id;
      end if;
    end loop;

    insert into public.activity_logs
      (store_id, actor_id, action, entity_type, entity_id, metadata, created_at)
    values
      (p_store_id, null, 'order.created', 'order', v_order_id,
       jsonb_build_object('order_number', 'UG-SEED-' || lpad(v_i::text, 4, '0'),
                          'total_cents', v_total),
       v_placed);

    if v_status = 'fulfilled' then
      insert into public.activity_logs
        (store_id, actor_id, action, entity_type, entity_id, metadata, created_at)
      values
        (p_store_id, null, 'order.fulfilled', 'order', v_order_id,
         jsonb_build_object('seed', true), v_placed + interval '1 day');
    elsif v_status = 'cancelled' then
      insert into public.activity_logs
        (store_id, actor_id, action, entity_type, entity_id, metadata, created_at)
      values
        (p_store_id, null, 'order.cancelled', 'order', v_order_id,
         jsonb_build_object('seed', true), v_placed + interval '1 day');
    end if;

    if v_i > 342 then
      insert into public.notifications
        (store_id, title, body, href, created_at)
      values
        (p_store_id,
         case when v_status = 'cancelled' then 'Order cancelled' else 'New order' end,
         'UG-SEED-' || lpad(v_i::text, 4, '0') || ' · ' || v_customer_email,
         '/orders/' || v_order_id::text, v_placed);
    end if;
  end loop;

  for v_i in 1..40 loop
    select * into v_return
    from (
      select distinct on (o.id)
        o.id as order_id,
        o.store_id,
        o.total_cents as order_total,
        oi.id as item_id,
        oi.variant_id,
        oi.quantity as ordered_quantity,
        oi.total_cents as item_total,
        oi.product_title
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.store_id = p_store_id
        and o.status = 'fulfilled'
        and o.order_number like 'UG-SEED-%'
      order by o.id, oi.id
    ) candidates
    order by candidates.order_id
    offset (v_i - 1)
    limit 1;

    if v_return.order_id is null then
      continue;
    end if;

    v_return_id := md5('commerceos-demo-return-' || v_i)::uuid;
    v_refund := round(
      v_return.item_total::numeric / v_return.ordered_quantity
    )::integer;

    insert into public.returns
      (id, store_id, order_id, status, reason, decision_note, restock,
       resolved_at, created_at, updated_at)
    values
      (v_return_id, p_store_id, v_return.order_id,
       case
         when v_i % 5 in (0, 1) then 'requested'::public.return_status
         when v_i % 5 = 2 then 'approved'::public.return_status
         when v_i % 5 = 3 then 'rejected'::public.return_status
         else 'refunded'::public.return_status
       end,
       v_reasons[((v_i - 1) % array_length(v_reasons, 1)) + 1],
       case when v_i % 5 = 2 then 'Approved for refund.' else '' end,
       true,
       case when v_i % 5 >= 3 then now() - ((40 - v_i) * interval '2 days') end,
       now() - ((40 - v_i) * interval '2 days'),
       now() - ((40 - v_i) * interval '2 days'));

    insert into public.return_items
      (store_id, return_id, order_item_id, quantity, refund_cents, restock)
    values
      (p_store_id, v_return_id, v_return.item_id, 1, v_refund, true);

    if v_i % 5 = 4 then
      insert into public.refunds
        (store_id, order_id, amount_cents, reason, status, created_at, updated_at)
      values
        (p_store_id, v_return.order_id, v_refund,
         v_reasons[((v_i - 1) % array_length(v_reasons, 1)) + 1],
         'completed', now() - ((40 - v_i) * interval '2 days'),
         now() - ((40 - v_i) * interval '2 days'));

      update public.orders
      set payment_status = case
        when (
          select coalesce(sum(amount_cents), 0) from public.refunds
          where order_id = v_return.order_id and status = 'completed'
        ) >= total_cents then 'refunded'::public.payment_status
        else 'partially_refunded'::public.payment_status
      end
      where id = v_return.order_id;

      if v_return.variant_id is not null then
        update public.inventory
        set on_hand = on_hand + 1
        where variant_id = v_return.variant_id;

        insert into public.inventory_movements
          (store_id, variant_id, delta, reason, reference_type, reference_id,
           note, created_at)
        values
          (p_store_id, v_return.variant_id, 1, 'return', 'return', v_return_id,
           'Seeded return restocked', now() - ((40 - v_i) * interval '2 days'));
      end if;
    end if;

    insert into public.activity_logs
      (store_id, actor_id, action, entity_type, entity_id, metadata, created_at)
    values
      (p_store_id, null, 'return.requested', 'return', v_return_id,
       jsonb_build_object('order_id', v_return.order_id),
       now() - ((40 - v_i) * interval '2 days'));
  end loop;

  update public.discounts d
  set usage_count = (
    select count(*)::integer from public.discount_usages du
    where du.discount_id = d.id and du.store_id = p_store_id
  )
  where d.store_id = p_store_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata, created_at)
  values
    (p_store_id, null, 'demo.seeded', 'store', p_store_id,
     jsonb_build_object('orders', 350, 'products', 50, 'customers', 150),
     now());
end;
$$;

revoke all on function private.seed_demo_store(uuid) from public, anon;
