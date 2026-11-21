-- Phase 6: analytics snapshots, discounts, returns, invitations, settings.

alter table public.stores
  add column logo_url text,
  add constraint stores_logo_url_https check (
    logo_url is null or logo_url ~* '^https://\S+$'
  );

alter table public.profiles
  add column notification_preferences jsonb not null default '{}'::jsonb;

alter table public.order_items
  add column product_type text not null default '';

update public.order_items oi
set product_type = coalesce(p.product_type, '')
from public.product_variants v
join public.products p on p.id = v.product_id
where oi.variant_id = v.id;

alter table public.invitations
  add constraint invitations_no_owner check (role <> 'owner');

create index if not exists returns_store_created_idx
  on public.returns (store_id, created_at desc);
create index if not exists discount_usages_discount_idx
  on public.discount_usages (discount_id, created_at desc);

create or replace function private.has_pending_invitation(
  target_store uuid,
  target_user uuid,
  target_role public.member_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.invitations i
    join auth.users u on u.id = target_user
    where i.store_id = target_store
      and i.status = 'pending'
      and i.expires_at > now()
      and i.role = target_role
      and lower(i.email) = lower(coalesce(u.email, ''))
      and target_user = (select auth.uid())
  );
$$;

revoke all on function private.has_pending_invitation(
  uuid, uuid, public.member_role
) from public, anon, authenticated;

create or replace function private.guard_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.member_role;
begin
  if tg_op = 'UPDATE'
    and (new.store_id <> old.store_id or new.user_id <> old.user_id)
  then
    raise exception 'Membership store and user cannot be changed';
  end if;

  if actor is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.user_id = actor and new.role <> old.role then
    raise exception 'You cannot change your own role';
  end if;

  if tg_op = 'DELETE' and old.user_id = actor then
    raise exception 'You cannot remove your own membership';
  end if;

  select m.role into actor_role
  from public.store_members m
  where m.store_id = coalesce(new.store_id, old.store_id)
    and m.user_id = actor
    and m.status = 'active';

  if actor_role is null then
    if tg_op = 'INSERT'
      and new.user_id = actor
      and (
        (
          new.role = 'owner'
          and not exists (
            select 1 from public.store_members
            where store_id = new.store_id
          )
        )
        or private.has_pending_invitation(
          new.store_id, new.user_id, new.role
        )
      )
    then
      return new;
    end if;
    raise exception 'Not a store member';
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' and actor_role <> 'owner' then
      raise exception 'Only an owner can add an owner';
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.role = 'owner' and actor_role <> 'owner' then
      raise exception 'Only an owner can grant ownership';
    end if;
    if old.role = 'owner' and new.role <> 'owner' then
      if actor_role <> 'owner' then
        raise exception 'Only an owner can change ownership';
      end if;
      if (select count(*) from public.store_members
          where store_id = old.store_id and role = 'owner') <= 1 then
        raise exception 'Cannot demote the last owner';
      end if;
    end if;
    return new;
  else
    if old.role = 'owner' then
      if actor_role <> 'owner' then
        raise exception 'Only an owner can remove an owner';
      end if;
      if (select count(*) from public.store_members
          where store_id = old.store_id and role = 'owner') <= 1 then
        raise exception 'Cannot remove the last owner';
      end if;
    end if;
    return old;
  end if;
end;
$$;

create or replace function public.redeem_discount(
  p_store_id uuid,
  p_code text,
  p_order_id uuid
)
returns table (discount_id uuid, amount_cents integer)
language plpgsql
set search_path = ''
as $$
declare
  target public.discounts%rowtype;
  order_subtotal integer;
  order_status public.order_status;
  order_customer uuid;
  applied integer;
begin
  if not (select private.has_store_role(
    p_store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  select * into target
  from public.discounts
  where store_id = p_store_id and code = upper(btrim(p_code))
  for update;

  if target.id is null then
    raise exception 'Discount not found';
  end if;

  if not target.is_active then
    raise exception 'Discount is not active';
  end if;

  if target.starts_at is not null and target.starts_at > now() then
    raise exception 'Discount has not started';
  end if;

  if target.ends_at is not null and target.ends_at <= now() then
    raise exception 'Discount has expired';
  end if;

  if target.usage_limit is not null and target.usage_count >= target.usage_limit then
    raise exception 'Discount usage limit reached';
  end if;

  select subtotal_cents, status, customer_id
  into order_subtotal, order_status, order_customer
  from public.orders
  where id = p_order_id and store_id = p_store_id
  for update;

  if order_subtotal is null then
    raise exception 'Order not found';
  end if;

  if order_status = 'cancelled' then
    raise exception 'Cannot discount a cancelled order';
  end if;

  if order_subtotal < target.minimum_subtotal_cents then
    raise exception 'Order does not meet the discount minimum';
  end if;

  if exists (
    select 1 from public.discount_usages du
    where du.discount_id = target.id and du.order_id = p_order_id
  ) then
    raise exception 'Discount already used on this order';
  end if;

  applied := case
    when target.type = 'percentage'
      then floor(order_subtotal::numeric * target.value / 100)::integer
    else least(target.value, order_subtotal)
  end;

  insert into public.discount_usages
    (store_id, discount_id, order_id, customer_id, amount_cents)
  values
    (p_store_id, target.id, p_order_id, order_customer, applied);

  update public.discounts
  set usage_count = usage_count + 1
  where id = target.id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (p_store_id, (select auth.uid()), 'discount.redeemed', 'order',
     p_order_id, jsonb_build_object('code', target.code, 'amount_cents', applied));

  return query select target.id, applied;
end;
$$;

revoke all on function public.redeem_discount(uuid, text, uuid)
  from public, anon;
grant execute on function public.redeem_discount(uuid, text, uuid)
  to authenticated;

create or replace function public.create_return(
  p_order_id uuid,
  p_reason text,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  new_return_id uuid;
  item jsonb;
  order_item public.order_items%rowtype;
  requested integer;
  already_returned integer;
  refund_cents integer;
  item_count integer := 0;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if target_order.id is null then
    raise exception 'Order not found';
  end if;

  if not (select private.has_store_role(
    target_order.store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if target_order.status = 'cancelled' then
    raise exception 'Cancelled orders cannot be returned';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item to return';
  end if;

  insert into public.returns
    (store_id, order_id, status, reason, restock)
  values
    (target_order.store_id, p_order_id, 'requested',
     coalesce(btrim(p_reason), ''), false)
  returning id into new_return_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    requested := coalesce((item ->> 'quantity')::integer, 0);

    if requested <= 0 then
      raise exception 'Return quantity must be positive';
    end if;

    select * into order_item
    from public.order_items
    where id = (item ->> 'order_item_id')::uuid
      and order_id = p_order_id;

    if order_item.id is null then
      raise exception 'Order item not found on this order';
    end if;

    select coalesce(sum(ri.quantity), 0) into already_returned
    from public.return_items ri
    join public.returns r on r.id = ri.return_id
    where ri.order_item_id = order_item.id
      and r.status <> 'rejected';

    if requested > order_item.quantity - already_returned then
      raise exception 'Return quantity exceeds the remaining ordered quantity';
    end if;

    refund_cents := round(
      order_item.total_cents::numeric * requested / order_item.quantity
    )::integer;

    insert into public.return_items
      (store_id, return_id, order_item_id, quantity, refund_cents, restock)
    values
      (target_order.store_id, new_return_id, order_item.id, requested,
       refund_cents, coalesce((item ->> 'restock')::boolean, true));

    item_count := item_count + 1;
  end loop;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target_order.store_id, (select auth.uid()), 'return.requested', 'return',
     new_return_id, jsonb_build_object('order_id', p_order_id, 'items', item_count));

  return new_return_id;
end;
$$;

revoke all on function public.create_return(uuid, text, jsonb)
  from public, anon;
grant execute on function public.create_return(uuid, text, jsonb)
  to authenticated;

create or replace function public.decide_return(
  p_return_id uuid,
  p_approve boolean,
  p_note text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target public.returns%rowtype;
begin
  select * into target
  from public.returns
  where id = p_return_id
  for update;

  if target.id is null then
    raise exception 'Return not found';
  end if;

  if not (select private.has_store_role(
    target.store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if target.status <> 'requested' then
    raise exception 'Only requested returns can be decided';
  end if;

  update public.returns
  set
    status = case
      when p_approve then 'approved'::public.return_status
      else 'rejected'::public.return_status
    end,
    decision_note = coalesce(btrim(p_note), ''),
    resolved_at = case when p_approve then null else now() end
  where id = p_return_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target.store_id, (select auth.uid()),
     case when p_approve then 'return.approved' else 'return.rejected' end,
     'return', p_return_id, jsonb_build_object('note', p_note));
end;
$$;

revoke all on function public.decide_return(uuid, boolean, text)
  from public, anon;
grant execute on function public.decide_return(uuid, boolean, text)
  to authenticated;

create or replace function public.refund_return(
  p_return_id uuid,
  p_restock boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  target public.returns%rowtype;
  refund_total integer;
  new_refund_id uuid;
  refunded_total integer;
  item record;
begin
  select * into target
  from public.returns
  where id = p_return_id
  for update;

  if target.id is null then
    raise exception 'Return not found';
  end if;

  if not (select private.has_store_role(
    target.store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )) then
    raise exception 'Not authorized';
  end if;

  if target.status <> 'approved' then
    raise exception 'Only approved returns can be refunded';
  end if;

  select coalesce(sum(refund_cents), 0) into refund_total
  from public.return_items
  where return_id = p_return_id;

  if refund_total <= 0 then
    raise exception 'Return has no refundable value';
  end if;

  insert into public.refunds
    (store_id, order_id, amount_cents, reason, status, processed_by)
  values
    (target.store_id, target.order_id, refund_total,
     coalesce(nullif(btrim(target.reason), ''), 'Return refund'),
     'completed', (select auth.uid()))
  returning id into new_refund_id;

  select coalesce(sum(amount_cents), 0) into refunded_total
  from public.refunds
  where order_id = target.order_id and status = 'completed';

  update public.orders
  set payment_status = case
    when refunded_total >= total_cents then 'refunded'::public.payment_status
    else 'partially_refunded'::public.payment_status
  end
  where id = target.order_id;

  if coalesce(p_restock, false) then
    for item in
      select ri.quantity, oi.variant_id
      from public.return_items ri
      join public.order_items oi on oi.id = ri.order_item_id
      where ri.return_id = p_return_id
        and ri.restock = true
        and oi.variant_id is not null
    loop
      update public.inventory
      set on_hand = on_hand + item.quantity
      where variant_id = item.variant_id;

      if found then
        insert into public.inventory_movements
          (store_id, variant_id, delta, reason, reference_type, reference_id,
           note, actor_id)
        values
          (target.store_id, item.variant_id, item.quantity, 'return', 'return',
           p_return_id, 'Return restocked', (select auth.uid()));
      end if;
    end loop;
  end if;

  update public.returns
  set
    status = 'refunded',
    restock = coalesce(p_restock, false),
    resolved_at = now()
  where id = p_return_id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (target.store_id, (select auth.uid()), 'return.refunded', 'return',
     p_return_id,
     jsonb_build_object('amount_cents', refund_total, 'restocked', coalesce(p_restock, false)));

  return new_refund_id;
end;
$$;

revoke all on function public.refund_return(uuid, boolean) from public, anon;
grant execute on function public.refund_return(uuid, boolean) to authenticated;

create or replace function public.accept_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  invitation public.invitations%rowtype;
  actor_email text;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  select * into invitation
  from public.invitations
  where token_hash = p_token_hash
  for update;

  if invitation.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;

  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'Invitation is invalid or expired';
  end if;

  select lower(email) into actor_email
  from auth.users
  where id = actor;

  if actor_email is null or actor_email <> lower(invitation.email) then
    raise exception 'This invitation belongs to a different email address';
  end if;

  if exists (
    select 1 from public.store_members
    where store_id = invitation.store_id and user_id = actor
  ) then
    raise exception 'You are already a member of this store';
  end if;

  insert into public.store_members (store_id, user_id, role, status)
  values (invitation.store_id, actor, invitation.role, 'active');

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (invitation.store_id, actor, 'membership.joined', 'membership',
     invitation.id, jsonb_build_object('role', invitation.role));

  return invitation.store_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

alter table public.profiles
  add column email text not null default '';

update public.profiles p
set email = lower(coalesce(u.email, ''))
from auth.users u
where u.id = p.id;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    lower(coalesce(new.email, ''))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;