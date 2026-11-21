-- CommerceOS authorization: membership helpers, RLS policies, grants, store bootstrap.

create or replace function private.is_store_member(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = target_store
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function private.has_store_role(
  target_store uuid,
  allowed public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = target_store
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (allowed)
  );
$$;

create or replace function private.shares_store_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_members mine
    join public.store_members theirs on theirs.store_id = mine.store_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.status = 'active'
      and theirs.user_id = target_user
  );
$$;

revoke all on function private.is_store_member(uuid) from public, anon;
revoke all on function private.has_store_role(uuid, public.member_role[]) from public, anon;
revoke all on function private.shares_store_with(uuid) from public, anon;
grant execute on function private.is_store_member(uuid) to authenticated;
grant execute on function private.has_store_role(uuid, public.member_role[]) to authenticated;
grant execute on function private.shares_store_with(uuid) to authenticated;
grant usage on schema private to authenticated;

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

  select m.role into actor_role
  from public.store_members m
  where m.store_id = coalesce(new.store_id, old.store_id)
    and m.user_id = actor
    and m.status = 'active';

  if actor_role is null then
    if tg_op = 'INSERT'
      and new.role = 'owner'
      and new.user_id = actor
      and not exists (
        select 1 from public.store_members
        where store_id = new.store_id
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

create trigger store_members_guard
  before insert or update or delete on public.store_members
  for each row execute function private.guard_membership();

create or replace function public.create_store(store_name text)
returns table (id uuid, name text, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  base_slug text;
  candidate text;
  suffix integer := 0;
  new_store_id uuid;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  if store_name is null
    or char_length(btrim(store_name)) = 0
    or char_length(btrim(store_name)) > 80
  then
    raise exception 'Store name must be between 1 and 80 characters';
  end if;

  base_slug := lower(regexp_replace(btrim(store_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := btrim(base_slug, '-');
  if base_slug = '' then
    base_slug := 'store';
  end if;

  candidate := base_slug;
  while exists (select 1 from public.stores s where s.slug = candidate) loop
    suffix := suffix + 1;
    if suffix > 100 then
      raise exception 'Could not allocate a store slug';
    end if;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  insert into public.stores (name, slug)
  values (btrim(store_name), candidate)
  returning stores.id into new_store_id;

  insert into public.store_members (store_id, user_id, role)
  values (new_store_id, actor, 'owner');

  insert into public.activity_logs
    (store_id, actor_id, action, entity_type, entity_id, metadata)
  values
    (new_store_id, actor, 'store.created', 'store', new_store_id,
     jsonb_build_object('name', btrim(store_name)));

  return query select new_store_id, btrim(store_name), candidate;
end;
$$;

revoke all on function public.create_store(text) from public, anon;
grant execute on function public.create_store(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.invitations enable row level security;
alter table public.activity_logs enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.discounts enable row level security;
alter table public.discount_usages enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.shares_store_with(id))
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy stores_select on public.stores
  for select to authenticated
  using ((select private.is_store_member(id)));

create policy stores_update on public.stores
  for update to authenticated
  using ((select private.has_store_role(
    id, array['owner', 'admin']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    id, array['owner', 'admin']::public.member_role[]
  )));

create policy store_members_select on public.store_members
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy store_members_insert on public.store_members
  for insert to authenticated
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )));

create policy store_members_update on public.store_members
  for update to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )));

create policy store_members_delete on public.store_members
  for delete to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )));

create policy invitations_all on public.invitations
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )));

create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin']::public.member_role[]
  )));

create policy activity_logs_insert on public.activity_logs
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (select private.is_store_member(store_id))
  );

create policy products_select on public.products
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy products_write on public.products
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy product_variants_select on public.product_variants
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy product_variants_write on public.product_variants
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy product_images_select on public.product_images
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy product_images_write on public.product_images
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy collections_select on public.collections
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy collections_write on public.collections
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy collection_products_select on public.collection_products
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy collection_products_write on public.collection_products
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy customers_select on public.customers
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy customers_write on public.customers
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy customer_addresses_select on public.customer_addresses
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy customer_addresses_write on public.customer_addresses
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy orders_select on public.orders
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy orders_write on public.orders
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy order_items_select on public.order_items
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy order_items_write on public.order_items
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy payments_select on public.payments
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy payments_write on public.payments
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy refunds_select on public.refunds
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy refunds_write on public.refunds
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy inventory_select on public.inventory
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy inventory_write on public.inventory
  for all to authenticated
  using ((select private.is_store_member(store_id)))
  with check ((select private.is_store_member(store_id)));

create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy inventory_movements_insert on public.inventory_movements
  for insert to authenticated
  with check ((select private.is_store_member(store_id)));

create policy discounts_select on public.discounts
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy discounts_write on public.discounts
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy discount_usages_select on public.discount_usages
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy discount_usages_write on public.discount_usages
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy returns_select on public.returns
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy returns_write on public.returns
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy return_items_select on public.return_items
  for select to authenticated
  using ((select private.is_store_member(store_id)));

create policy return_items_write on public.return_items
  for all to authenticated
  using ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )))
  with check ((select private.has_store_role(
    store_id, array['owner', 'admin', 'manager']::public.member_role[]
  )));

create policy notifications_select on public.notifications
  for select to authenticated
  using (
    (select private.is_store_member(store_id))
    and (user_id is null or user_id = (select auth.uid()))
  );

create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (
    (select private.is_store_member(store_id))
    and (user_id is null or user_id = (select auth.uid()))
  );

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on schema public from anon;
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.inventory_levels to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.guard_membership() from public, anon, authenticated;
revoke all on function private.enforce_refund_cap() from public, anon, authenticated;
