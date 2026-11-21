-- Phase 8: read-only demo viewer role and demo-store marker.
-- Kept separate so the new enum value is committed before later migrations use it.

alter type public.member_role add value if not exists 'viewer';

alter table public.stores
  add column is_demo boolean not null default false;
