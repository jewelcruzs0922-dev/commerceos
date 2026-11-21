import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ownerId = "11111111-1111-4111-8111-111111111111";
const demoUserId = "22222222-2222-4222-8222-222222222222";
const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let db: PGlite;

async function asOwner<T>(run: () => Promise<T>): Promise<T> {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${ownerId}', false);
     select set_config('request.jwt.claims', '{"sub":"${ownerId}","is_anonymous":false}', false);
     set role authenticated;`
  );
  try {
    return await run();
  } finally {
    await db.exec("reset role;");
  }
}

async function asAnonymous<T>(run: () => Promise<T>): Promise<T> {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${demoUserId}', false);
     select set_config('request.jwt.claims', '{"sub":"${demoUserId}","is_anonymous":true}', false);
     set role authenticated;`
  );
  try {
    return await run();
  } finally {
    await db.exec("reset role;");
  }
}

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

  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ownerId}', 'owner@example.com', '{"full_name":"Owner"}'),
      ('${demoUserId}', '', '{"full_name":"Demo visitor"}');

    insert into public.stores (id, name, slug) values
      ('${storeId}', 'Urban Goods', 'urban-goods');

    insert into public.store_members (store_id, user_id, role) values
      ('${storeId}', '${ownerId}', 'owner');
  `);

  await db.query(`select private.seed_demo_store($1::uuid)`, [storeId]);
});

afterAll(async () => {
  await db.close();
});

describe("demo seed", () => {
  it("creates the target volumes without duplicates", async () => {
    const counts = await db.query<{
      products: number;
      variants: number;
      collections: number;
      customers: number;
      orders: number;
      order_items: number;
      returns: number;
      discounts: number;
      movements: number;
      notifications: number;
      low_stock: number;
    }>(
      `select
        (select count(*)::int from public.products where store_id = $1) as products,
        (select count(*)::int from public.product_variants where store_id = $1) as variants,
        (select count(*)::int from public.collections where store_id = $1) as collections,
        (select count(*)::int from public.customers where store_id = $1) as customers,
        (select count(*)::int from public.orders where store_id = $1) as orders,
        (select count(*)::int from public.order_items where store_id = $1) as order_items,
        (select count(*)::int from public.returns where store_id = $1) as returns,
        (select count(*)::int from public.discounts where store_id = $1) as discounts,
        (select count(*)::int from public.inventory_movements where store_id = $1) as movements,
        (select count(*)::int from public.notifications where store_id = $1) as notifications,
        (select count(*)::int from public.inventory_overview where store_id = $1 and is_low_stock) as low_stock`,
      [storeId]
    );

    expect(counts.rows[0]).toMatchObject({
      products: 50,
      variants: 150,
      collections: 8,
      customers: 150,
      orders: 350,
      returns: 40,
      discounts: 6,
    });
    expect(counts.rows[0]?.order_items).toBeGreaterThanOrEqual(350);
    expect(counts.rows[0]?.movements).toBeGreaterThanOrEqual(150);
    expect(counts.rows[0]?.notifications).toBeGreaterThan(0);
    expect(counts.rows[0]?.low_stock).toBeGreaterThan(0);
  });

  it("keeps totals, refunds, fulfillment, and reservations reconciled", async () => {
    const orders = await db.query<{
      subtotal_matches: boolean;
      refunds_within_total: boolean;
      fulfillment_matches: boolean;
    }>(
      `select subtotal_matches, refunds_within_total, fulfillment_matches
       from public.order_reconciliation where store_id = $1`,
      [storeId]
    );
    expect(
      orders.rows.every(
        (row) =>
          row.subtotal_matches &&
          row.refunds_within_total &&
          row.fulfillment_matches
      )
    ).toBe(true);

    const inventory = await db.query<{ matches: boolean }>(
      `select matches from public.inventory_reconciliation where store_id = $1`,
      [storeId]
    );
    expect(inventory.rows.every((row) => row.matches)).toBe(true);

    const negative = await db.query<{ count: number }>(
      `select count(*)::int from public.inventory
       where store_id = $1 and (on_hand < 0 or reserved > on_hand)`,
      [storeId]
    );
    expect(negative.rows[0]?.count).toBe(0);
  });

  it("is repeatable and replaces rather than duplicates records", async () => {
    const before = await db.query<{ orders: number; first_id: string }>(
      `select count(*)::int as orders, min(id::text) as first_id
       from public.orders where store_id = $1`,
      [storeId]
    );

    await db.query(`select private.seed_demo_store($1::uuid)`, [storeId]);

    const after = await db.query<{ orders: number; first_id: string }>(
      `select count(*)::int as orders, min(id::text) as first_id
       from public.orders where store_id = $1`,
      [storeId]
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
  });
});

describe("demo access", () => {
  it("joins an anonymous guest as a read-only viewer", async () => {
    const joined = await asAnonymous(() =>
      db.query<{ store_id: string }>(`select public.join_demo_store() as store_id`)
    );
    expect(joined.rows[0]?.store_id).toBe(storeId);

    const membership = await db.query<{ role: string }>(
      `select role from public.store_members where store_id = $1 and user_id = $2`,
      [storeId, demoUserId]
    );
    expect(membership.rows[0]?.role).toBe("viewer");
  });

  it("blocks viewer writes and demo resets", async () => {
    const visibleInventory = await asAnonymous(() =>
      db.query<{ count: number }>(
        `select count(*)::int as count from public.inventory where store_id = $1`,
        [storeId]
      )
    );
    expect(visibleInventory.rows[0]?.count).toBeGreaterThan(0);

    await expect(
      asAnonymous(() =>
        db.query(
          `insert into public.products (store_id, title, slug)
           values ($1, 'Viewer product', 'viewer-product')`,
          [storeId]
        )
      )
    ).rejects.toThrow();

    await expect(
      asAnonymous(() =>
        db.query(
          `insert into public.orders (store_id, order_number, email, total_cents, subtotal_cents)
           values ($1, 'GUEST-1', 'guest@example.com', 100, 100)`,
          [storeId]
        )
      )
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asAnonymous(() =>
        db.query(
          `update public.orders set status = 'cancelled' where store_id = $1`,
          [storeId]
        )
      )
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asAnonymous(() =>
        db.query(
          `select public.adjust_inventory(
            (select variant_id from public.inventory where store_id = $1 limit 1),
            1, 'adjustment', 'viewer'
          )`,
          [storeId]
        )
      )
    ).rejects.toThrow(/not authorized|inventory not found/i);

    await expect(
      asAnonymous(() => db.query(`select public.reset_demo_store()`))
    ).rejects.toThrow(/demo store/i);

    await expect(
      asAnonymous(() => db.query(`select public.create_store('Guest store')`))
    ).rejects.toThrow(/demo sessions cannot create stores/i);
  });

  it("blocks non-anonymous users from joining the demo store", async () => {
    await db.exec(`
      insert into auth.users (id, email) values
        ('33333333-3333-4333-8333-333333333333', 'other@example.com');
    `);

    await db.exec(
      `select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
       select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}', false);
       set role authenticated;`
    );

    try {
      await expect(db.query(`select public.join_demo_store()`)).rejects.toThrow(
        /guest session/i
      );
    } finally {
      await db.exec("reset role;");
    }
  });

  it("lets the owner reset the demo store", async () => {
    await asOwner(() => db.query(`select public.reset_demo_store()`));

    const counts = await db.query<{ orders: number; viewers: number }>(
      `select
        (select count(*)::int from public.orders where store_id = $1) as orders,
        (select count(*)::int from public.store_members where store_id = $1 and role = 'viewer') as viewers`,
      [storeId]
    );
    expect(counts.rows[0]).toEqual({ orders: 350, viewers: 0 });
  });
});
