-- CommerceOS demo seed.
--
-- Run after the Urban Goods store exists (create it through /setup or the
-- onboarding flow). The seed function is deterministic and replaces this
-- store's demo records on every run; it never runs against a store unless the
-- caller passes that store id. Only stores marked is_demo are used by the
-- read-only demo entry and reset action.

select private.seed_demo_store(id)
from public.stores
where slug = 'urban-goods';
