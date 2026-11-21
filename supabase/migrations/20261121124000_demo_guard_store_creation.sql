-- Phase 8 guard: guest demo sessions cannot escape into a new tenant.

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

  if private.auth_is_anonymous() then
    raise exception 'Demo sessions cannot create stores';
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
