import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon;
    create role authenticated;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);

  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
});

afterAll(async () => {
  await db.close();
});

describe("database security audit", () => {
  it("keeps every public function definer-owned with an empty search path", async () => {
    const result = await db.query<{
      name: string;
      definer: boolean;
      search_path: string | null;
    }>(
      `select p.proname as name, p.prosecdef as definer,
              array_to_string(p.proconfig, ',') as search_path
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
       order by p.proname`
    );

    expect(result.rows).toHaveLength(19);
    for (const row of result.rows) {
      expect(row.definer, row.name).toBe(true);
      expect(row.search_path, row.name).toContain("search_path=");
    }
  });

  it("grants function execution to authenticated and not anon", async () => {
    const result = await db.query<{
      name: string;
      authenticated: boolean;
      anon: boolean;
    }>(
      `select p.proname as name,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
              has_function_privilege('anon', p.oid, 'EXECUTE') as anon
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'`
    );

    expect(result.rows).toHaveLength(19);
    for (const row of result.rows) {
      expect(row.authenticated, row.name).toBe(true);
      expect(row.anon, row.name).toBe(false);
    }
  });

  it("keeps RLS enabled and write access closed on workflow tables", async () => {
    const rls = await db.query<{ count: number }>(
      `select count(*)::int as count
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity`
    );
    expect(rls.rows[0]?.count).toBe(23);

    const grants = await db.query<{ count: number }>(
      `select count(*)::int as count
       from information_schema.role_table_grants
       where grantee = 'authenticated'
         and table_name in ('orders','order_items','payments','refunds','returns',
           'return_items','inventory','inventory_movements','discount_usages')
         and privilege_type in ('INSERT','UPDATE','DELETE')`
    );
    expect(grants.rows[0]?.count).toBe(0);

    const policies = await db.query<{ count: number }>(
      `select count(*)::int as count
       from pg_policies
       where schemaname = 'public'
         and tablename in ('orders','order_items','payments','refunds','returns',
           'return_items','inventory','inventory_movements','discount_usages')
         and cmd in ('INSERT','UPDATE','DELETE','ALL')`
    );
    expect(policies.rows[0]?.count).toBe(0);

    const totalPolicies = await db.query<{ count: number }>(
      `select count(*)::int as count from pg_policies where schemaname = 'public'`
    );
    expect(totalPolicies.rows[0]?.count).toBe(39);
  });

  it("uses security-invoker views", async () => {
    const views = await db.query<{
      name: string;
      options: string | null;
    }>(
      `select c.relname as name, array_to_string(c.reloptions, ',') as options
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'v'
       order by c.relname`
    );

    expect(views.rows).toHaveLength(4);
    for (const view of views.rows) {
      expect(view.options, view.name).toContain("security_invoker=true");
    }
  });
});
