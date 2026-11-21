import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const users = {
  owner: "11111111-1111-4111-8111-111111111111",
  other: "22222222-2222-4222-8222-222222222222",
  staff: "44444444-4444-4444-8444-444444444444",
} as const;

const stores = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;

const customerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const orderId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const refundOrderId = "99999999-9999-4999-8999-999999999999";

let db: PGlite;
let productId = "";
let variantId = "";

async function asUser<T>(userId: string, run: () => Promise<T>): Promise<T> {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`
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
      ('${users.owner}', 'owner@example.com', '{"full_name":"Owner"}'),
      ('${users.other}', 'other@example.com', '{"full_name":"Other"}'),
      ('${users.staff}', 'staff@example.com', '{"full_name":"Staff"}');

    insert into public.stores (id, name, slug) values
      ('${stores.a}', 'Store A', 'store-a'),
      ('${stores.b}', 'Store B', 'store-b');

    insert into public.store_members (store_id, user_id, role) values
      ('${stores.a}', '${users.owner}', 'owner'),
      ('${stores.b}', '${users.other}', 'owner'),
      ('${stores.a}', '${users.staff}', 'staff');

    insert into public.customers (id, store_id, email, name) values
      ('${customerId}', '${stores.a}', 'buyer@example.com', 'Buyer');
  `);
});

afterAll(async () => {
  await db.close();
});

describe("core workflow functions", () => {
  it("creates a product, variants, inventory, image, and movements", async () => {
    const result = await asUser(users.owner, () =>
      db.query<{ id: string }>(
        `select public.create_product(
          $1::uuid, $2, $3, $4, $5::public.product_status, null, null, $6, $7::jsonb
        ) as id`,
        [
          stores.a,
          "Workflow Product",
          "workflow-product",
          "Test product",
          "active",
          "https://example.com/workflow.png",
          JSON.stringify([
            {
              title: "Large",
              sku: "WF-LG",
              price_cents: 3500,
              cost_cents: 1200,
              on_hand: 4,
              low_stock_threshold: 3,
            },
            {
              title: "Small",
              sku: "WF-SM",
              price_cents: 2500,
              cost_cents: 900,
              on_hand: 10,
              low_stock_threshold: 3,
            },
          ]),
        ]
      )
    );

    productId = result.rows[0]?.id ?? "";
    expect(productId).toBeTruthy();

    const variants = await db.query<{ id: string; sku: string }>(
      `select id, sku from public.product_variants where product_id = $1 order by sku`,
      [productId]
    );
    expect(variants.rows.map((row) => row.sku)).toEqual(["WF-LG", "WF-SM"]);
    variantId = variants.rows[0]?.id ?? "";

    const stock = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );
    expect(stock.rows[0]?.on_hand).toBe(4);

    const images = await db.query(
      `select id from public.product_images where product_id = $1`,
      [productId]
    );
    expect(images.rows).toHaveLength(1);

    const movements = await db.query(
      `select id from public.inventory_movements where store_id = $1 and note = 'Initial stock'`,
      [stores.a]
    );
    expect(movements.rows).toHaveLength(2);
  });

  it("denies product creation to staff and other stores", async () => {
    const payload = JSON.stringify([
      { sku: "DENIED-1", price_cents: 100, on_hand: 0 },
    ]);

    await expect(
      asUser(users.staff, () =>
        db.query(
          `select public.create_product(
            $1::uuid, 'Nope', 'nope', '', 'draft'::public.product_status,
            null, null, null, $2::jsonb
          )`,
          [stores.a, payload]
        )
      )
    ).rejects.toThrow(/not authorized/i);

    await expect(
      asUser(users.other, () =>
        db.query(
          `select public.create_product(
            $1::uuid, 'Cross', 'cross', '', 'draft'::public.product_status,
            null, null, null, $2::jsonb
          )`,
          [stores.a, payload]
        )
      )
    ).rejects.toThrow(/not authorized/i);
  });

  it("adjusts inventory and records movements", async () => {
    const result = await asUser(users.staff, () =>
      db.query<{ next_on_hand: number }>(
        `select public.adjust_inventory($1::uuid, 6, 'restock'::public.inventory_reason, 'Received') as next_on_hand`,
        [variantId]
      )
    );

    expect(result.rows[0]?.next_on_hand).toBe(10);

    const movement = await db.query<{ delta: number; reason: string }>(
      `select delta, reason from public.inventory_movements
       where variant_id = $1 order by created_at desc limit 1`,
      [variantId]
    );
    expect(movement.rows[0]).toEqual({ delta: 6, reason: "restock" });

    await expect(
      asUser(users.staff, () =>
        db.query(
          `select public.adjust_inventory($1::uuid, -100, 'adjustment'::public.inventory_reason, 'Bad')`,
          [variantId]
        )
      )
    ).rejects.toThrow();
  });

  it("cancels an order, restocks once, and preserves snapshots", async () => {
    await db.exec(`
      insert into public.orders
        (id, store_id, customer_id, order_number, email, status, payment_status,
         subtotal_cents, total_cents)
      values
        ('${orderId}', '${stores.a}', '${customerId}', 'ORD-CANCEL',
         'buyer@example.com', 'processing', 'paid', 5000, 5000);

      insert into public.order_items
        (id, store_id, order_id, variant_id, product_title, variant_title, sku,
         quantity, unit_price_cents, total_cents)
      values
        ('abababab-abab-4bab-8bab-abababababab', '${stores.a}', '${orderId}',
         '${variantId}', 'Workflow Product', 'Large', 'WF-LG', 2, 2500, 5000);
    `);

    const before = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );

    await asUser(users.owner, () =>
      db.query(`select public.cancel_order($1::uuid, true)`, [orderId])
    );

    const after = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );
    expect(after.rows[0]?.on_hand).toBe((before.rows[0]?.on_hand ?? 0) + 2);

    const order = await db.query<{ status: string }>(
      `select status from public.orders where id = $1`,
      [orderId]
    );
    expect(order.rows[0]?.status).toBe("cancelled");

    const snapshot = await db.query<{ sku: string; unit_price_cents: number }>(
      `select sku, unit_price_cents from public.order_items
       where order_id = $1`,
      [orderId]
    );
    expect(snapshot.rows[0]).toEqual({ sku: "WF-LG", unit_price_cents: 2500 });

    await asUser(users.owner, () =>
      db.query(`select public.cancel_order($1::uuid, true)`, [orderId])
    );

    const afterAgain = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );
    expect(afterAgain.rows[0]?.on_hand).toBe(after.rows[0]?.on_hand);
  });

  it("records partial refunds and blocks over-refunds", async () => {
    await db.exec(`
      insert into public.orders
        (id, store_id, customer_id, order_number, email, status, payment_status,
         subtotal_cents, total_cents)
      values
        ('${refundOrderId}', '${stores.a}', '${customerId}', 'ORD-REFUND',
         'buyer@example.com', 'fulfilled', 'paid', 500, 500);
    `);

    await asUser(users.owner, () =>
      db.query(
        `select public.record_refund($1::uuid, 200, 'Damaged')`,
        [refundOrderId]
      )
    );

    const partial = await db.query<{ payment_status: string }>(
      `select payment_status from public.orders where id = $1`,
      [refundOrderId]
    );
    expect(partial.rows[0]?.payment_status).toBe("partially_refunded");

    await expect(
      asUser(users.owner, () =>
        db.query(
          `select public.record_refund($1::uuid, 400, 'Too much')`,
          [refundOrderId]
        )
      )
    ).rejects.toThrow(/refundable|exceeds/i);
  });

  it("duplicates a product as a draft with zero stock", async () => {
    const result = await asUser(users.owner, () =>
      db.query<{ id: string }>(
        `select public.duplicate_product($1::uuid, $2::uuid) as id`,
        [stores.a, productId]
      )
    );

    const copyId = result.rows[0]?.id ?? "";
    expect(copyId).toBeTruthy();
    expect(copyId).not.toBe(productId);

    const copy = await db.query<{ status: string; title: string }>(
      `select status, title from public.products where id = $1`,
      [copyId]
    );
    expect(copy.rows[0]?.status).toBe("draft");
    expect(copy.rows[0]?.title).toContain("(copy)");

    const stock = await db.query<{ on_hand: number }>(
      `select i.on_hand from public.inventory i
       join public.product_variants v on v.id = i.variant_id
       where v.product_id = $1`,
      [copyId]
    );
    expect(stock.rows.every((row) => row.on_hand === 0)).toBe(true);
  });

  it("replaces collection product assignment atomically", async () => {
    const collection = await db.query<{ id: string }>(
      `insert into public.collections (store_id, title, slug, status)
       values ($1::uuid, 'Workflow Collection', 'workflow-collection', 'active')
       returning id`,
      [stores.a]
    );
    const collectionId = collection.rows[0]?.id ?? "";

    await asUser(users.owner, () =>
      db.query(`select public.set_collection_products($1::uuid, $2::uuid[])`, [
        collectionId,
        [productId],
      ])
    );

    const links = await db.query<{ product_id: string; position: number }>(
      `select product_id, position from public.collection_products where collection_id = $1`,
      [collectionId]
    );
    expect(links.rows).toEqual([{ product_id: productId, position: 0 }]);

    await asUser(users.owner, () =>
      db.query(`select public.set_collection_products($1::uuid, $2::uuid[])`, [
        collectionId,
        [],
      ])
    );

    const cleared = await db.query(
      `select product_id from public.collection_products where collection_id = $1`,
      [collectionId]
    );
    expect(cleared.rows).toHaveLength(0);
  });
});