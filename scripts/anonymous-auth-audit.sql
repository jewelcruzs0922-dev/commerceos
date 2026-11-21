-- Read-only anonymous Auth audit. Safe to run; does not delete accounts.
select
  count(*) filter (where u.is_anonymous) as anonymous_users,
  count(*) as total_users,
  count(*) filter (
    where u.is_anonymous
      and u.created_at < now() - interval '24 hours'
  ) as anonymous_older_than_24h,
  (
    select count(*)
    from public.store_members m
    where m.role = 'viewer'
  ) as viewer_memberships,
  (
    select count(*)
    from auth.users au
    where au.is_anonymous
      and au.created_at < now() - interval '24 hours'
      and not exists (
        select 1 from public.store_members m where m.user_id = au.id
      )
  ) as cleanup_candidates
from auth.users u;

-- Inspect candidates before any approved cleanup. Do not delete by default.
select u.id, u.created_at
from auth.users u
where u.is_anonymous
  and u.created_at < now() - interval '24 hours'
  and not exists (
    select 1 from public.store_members m where m.user_id = u.id
  )
order by u.created_at asc
limit 100;