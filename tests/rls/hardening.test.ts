import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ownerId = "11111111-1111-4111-8111-111111111111";
const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const variantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

let db: PGlite;

async function asOwner<T>(run: () => Promise<T>): Promise<T> {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${ownerId}', false); set role authenticated;`
  );
  try {
    return await run();
  } finally {
    await db.exec("reset role;");
  }
}

async function createOrderForLastUnit(key: string) {
  return db.query<{ id: string }>(
    `select public.create_order(
      $1::uuid, $2::uuid, 'buyer@example.com', $3::jsonb, null,
      0, 0, true, '{}'::jsonb, $4
    ) as id`,
    [
      storeId,
      customerId,
      JSON.stringify([{ variant_id: variantId, quantity: 1 }]),
      key,
    ]
  );
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
      ('${ownerId}', 'owner@example.com', '{"full_name":"Owner"}');

    insert into public.stores (id, name, slug) values
      ('${storeId}', 'Store A', 'store-a');

    insert into public.store_members (store_id, user_id, role) values
      ('${storeId}', '${ownerId}', 'owner');

    insert into public.customers (id, store_id, email, name) values
      ('${customerId}', '${storeId}', 'buyer@example.com', 'Buyer');

    insert into public.products (id, store_id, title, slug, status)
    values ('${productId}', '${storeId}', 'Last Unit', 'last-unit', 'active');

    insert into public.product_variants
      (id, store_id, product_id, title, sku, price_cents, cost_cents)
    values ('${variantId}', '${storeId}', '${productId}', 'Default', 'LAST-1', 2500, 1000);

    insert into public.inventory (variant_id, store_id, on_hand, reserved)
    values ('${variantId}', '${storeId}', 1, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe("duplicate submission safety", () => {
  it("does not reserve the last unit twice", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '" + ownerId + "', false); set role authenticated;");
    try {
      const results = await Promise.allSettled([
        createOrderForLastUnit("duplicate-unit-a"),
        createOrderForLastUnit("duplicate-unit-b"),
      ]);
      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(String(rejected[0] && "reason" in rejected[0] ? rejected[0].reason : "")).toMatch(
        /insufficient stock/i
      );
    } finally {
      await db.exec("reset role;");
    }

    const after = await db.query<{ orders: number; reserved: number }>(
      `select
        (select count(*)::int from public.orders where store_id = $1) as orders,
        (select reserved from public.inventory where variant_id = $2) as reserved`,
      [storeId, variantId]
    );
    expect(after.rows[0]).toEqual({ orders: 1, reserved: 1 });
  });

  it("serializes refunds against the order cap", async () => {
    await db.exec(`update public.inventory set on_hand = 10, reserved = 0 where variant_id = '${variantId}'`);
    const order = await asOwner(() => createOrderForLastUnit("refund-order"));
    const orderId = order.rows[0]?.id;
    if (!orderId) throw new Error("Order was not created");

    await db.exec("select set_config('request.jwt.claim.sub', '" + ownerId + "', false); set role authenticated;");
    try {
      const results = await Promise.allSettled([
        db.query(`select public.record_refund_once($1::uuid, 2000, 'one', 'refund-a')`, [orderId]),
        db.query(`select public.record_refund_once($1::uuid, 2000, 'two', 'refund-b')`, [orderId]),
      ]);
      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(String(rejected[0] && "reason" in rejected[0] ? rejected[0].reason : "")).toMatch(
        /refundable/i
      );
    } finally {
      await db.exec("reset role;");
    }

    const refunds = await db.query<{ count: number; total: number }>(
      `select count(*)::int as count, coalesce(sum(amount_cents), 0)::int as total
       from public.refunds where order_id = $1`,
      [orderId]
    );
    expect(refunds.rows[0]).toEqual({ count: 1, total: 2000 });
  });

  it("returns the existing refund for a repeated idempotency key", async () => {
    const order = await asOwner(() => createOrderForLastUnit("refund-key-order"));
    const orderId = order.rows[0]?.id;
    if (!orderId) throw new Error("Order was not created");

    const first = await asOwner(() =>
      db.query<{ id: string }>(
        `select public.record_refund_once($1::uuid, 500, 'duplicate', 'refund-key') as id`,
        [orderId]
      )
    );
    const second = await asOwner(() =>
      db.query<{ id: string }>(
        `select public.record_refund_once($1::uuid, 500, 'duplicate', 'refund-key') as id`,
        [orderId]
      )
    );

    expect(first.rows[0]?.id).toBe(second.rows[0]?.id);
    const count = await db.query<{ count: number }>(
      `select count(*)::int as count from public.refunds where order_id = $1`,
      [orderId]
    );
    expect(count.rows[0]?.count).toBe(1);
  });
});
