import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const users = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
} as const;

const stores = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;

const TENANT_TABLES = [
  "customers",
  "products",
  "product_variants",
  "product_images",
  "orders",
  "order_items",
  "payments",
  "refunds",
  "inventory",
  "discounts",
  "discount_usages",
  "returns",
  "return_items",
  "store_members",
] as const;

const storeB = {
  customer: "b0000000-0000-4000-8000-000000000001",
  product: "b0000000-0000-4000-8000-000000000002",
  variant: "b0000000-0000-4000-8000-000000000003",
  image: "b0000000-0000-4000-8000-000000000004",
  order: "b0000000-0000-4000-8000-000000000005",
  orderItem: "b0000000-0000-4000-8000-000000000006",
  payment: "b0000000-0000-4000-8000-000000000007",
  refund: "b0000000-0000-4000-8000-000000000008",
  discount: "b0000000-0000-4000-8000-000000000009",
  discountUsage: "b0000000-0000-4000-8000-000000000010",
  ret: "b0000000-0000-4000-8000-000000000011",
  returnItem: "b0000000-0000-4000-8000-000000000012",
} as const;

let db: PGlite;

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
      ('${users.a}', 'owner-a@example.com', '{"full_name":"Owner A"}'),
      ('${users.b}', 'owner-b@example.com', '{"full_name":"Owner B"}');

    insert into public.stores (id, name, slug) values
      ('${stores.a}', 'Store A', 'store-a'),
      ('${stores.b}', 'Store B', 'store-b');

    insert into public.store_members (store_id, user_id, role) values
      ('${stores.a}', '${users.a}', 'owner'),
      ('${stores.b}', '${users.b}', 'owner');
  `);

  await db.query(`select private.seed_demo_store($1::uuid)`, [stores.a]);

  await db.exec(`
    insert into public.customers (id, store_id, email, name) values
      ('${storeB.customer}', '${stores.b}', 'buyer-b@example.com', 'Buyer B');

    insert into public.products (id, store_id, title, slug, status) values
      ('${storeB.product}', '${stores.b}', 'Store B Product', 'store-b-product', 'active');

    insert into public.product_variants
      (id, store_id, product_id, title, sku, price_cents)
    values
      ('${storeB.variant}', '${stores.b}', '${storeB.product}', 'Default', 'B-SKU-1', 2500);

    insert into public.product_images
      (id, store_id, product_id, storage_path, position)
    values
      ('${storeB.image}', '${stores.b}', '${storeB.product}', 'https://example.com/b.png', 0);

    insert into public.orders
      (id, store_id, customer_id, order_number, email, status, payment_status,
       fulfillment_status, subtotal_cents, total_cents)
    values
      ('${storeB.order}', '${stores.b}', '${storeB.customer}', 'B-ORDER-1',
       'buyer-b@example.com', 'processing', 'paid', 'unfulfilled', 2500, 2500);

    insert into public.order_items
      (id, store_id, order_id, variant_id, product_title, variant_title, sku,
       quantity, unit_price_cents, total_cents)
    values
      ('${storeB.orderItem}', '${stores.b}', '${storeB.order}', '${storeB.variant}',
       'Store B Product', 'Default', 'B-SKU-1', 1, 2500, 2500);

    insert into public.payments
      (id, store_id, order_id, amount_cents, status)
    values
      ('${storeB.payment}', '${stores.b}', '${storeB.order}', 2500, 'paid');

    insert into public.refunds
      (id, store_id, order_id, amount_cents, reason, status)
    values
      ('${storeB.refund}', '${stores.b}', '${storeB.order}', 100, 'Tenant check', 'completed');

    insert into public.inventory (variant_id, store_id, on_hand, reserved)
    values ('${storeB.variant}', '${stores.b}', 10, 0);

    insert into public.discounts
      (id, store_id, code, type, value, minimum_subtotal_cents, is_active)
    values
      ('${storeB.discount}', '${stores.b}', 'BCODE', 'percentage', 10, 0, true);

    insert into public.discount_usages
      (id, store_id, discount_id, order_id, customer_id, amount_cents)
    values
      ('${storeB.discountUsage}', '${stores.b}', '${storeB.discount}', '${storeB.order}',
       '${storeB.customer}', 100);

    insert into public.returns
      (id, store_id, order_id, status, reason)
    values
      ('${storeB.ret}', '${stores.b}', '${storeB.order}', 'requested', 'Tenant check');

    insert into public.return_items
      (id, store_id, return_id, order_item_id, quantity, refund_cents, restock)
    values
      ('${storeB.returnItem}', '${stores.b}', '${storeB.ret}', '${storeB.orderItem}',
       1, 100, false);
  `);
});

afterAll(async () => {
  await db.close();
});

describe("tenant isolation matrix", () => {
  it("returns only the signed-in store from every tenant table", async () => {
    let tablesWithRows = 0;

    for (const table of TENANT_TABLES) {
      const asA = await asUser(users.a, () =>
        db.query<{ store_id: string }>(
          `select distinct store_id from public.${table}`
        )
      );
      const asB = await asUser(users.b, () =>
        db.query<{ store_id: string }>(
          `select distinct store_id from public.${table}`
        )
      );

      expect(
        asA.rows.every((row) => row.store_id === stores.a),
        `${table} leaked Store B to Store A`
      ).toBe(true);
      expect(
        asB.rows.every((row) => row.store_id === stores.b),
        `${table} leaked Store A to Store B`
      ).toBe(true);

      if (asA.rows.length > 0) {
        tablesWithRows += 1;
      }
    }

    expect(tablesWithRows).toBeGreaterThanOrEqual(14);
  });

  it("hides another store's row by direct id lookup", async () => {
    const foreignProduct = await db.query<{ id: string }>(
      `select id from public.products where store_id = $1 limit 1`,
      [stores.b]
    );
    const productId = foreignProduct.rows[0]?.id;

    expect(productId).toBeTruthy();

    const visible = await asUser(users.a, () =>
      db.query(`select id from public.products where id = $1`, [productId])
    );

    expect(visible.rows).toHaveLength(0);
  });

  it("cannot update or delete another store's rows", async () => {
    const updated = await asUser(users.a, () =>
      db.query(
        `update public.products set title = 'Cross-tenant write'
         where store_id = $1 returning id`,
        [stores.b]
      )
    );
    expect(updated.rows).toHaveLength(0);

    const deleted = await asUser(users.a, () =>
      db.query(
        `delete from public.products where store_id = $1 returning id`,
        [stores.b]
      )
    );
    expect(deleted.rows).toHaveLength(0);
  });

  it("cannot insert a row into another store", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `insert into public.products (store_id, title, slug, status)
           values ($1, 'Cross-tenant insert', 'cross-tenant-insert', 'active')`,
          [stores.b]
        )
      )
    ).rejects.toThrow();
  });
});

describe("forged tenant identifiers", () => {
  it("rejects a product create with another store id", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `select public.create_product(
             $1::uuid, 'Forged product', 'forged-product', null,
             'active'::public.product_status, null, null, null, '[]'::jsonb
           )`,
          [stores.b]
        )
      )
    ).rejects.toThrow(/not authorized/i);
  });

  it("rejects an order create with another store id", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `select public.create_order(
             $1::uuid, null, 'forged@example.com', '[]'::jsonb, null,
             0, 0, false, '{}'::jsonb, 'forged-tenant-key'
           )`,
          [stores.b]
        )
      )
    ).rejects.toThrow(/not authorized/i);
  });

  it("rejects an inventory adjustment on another store's variant", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `select public.adjust_inventory(
             $1::uuid, 1, 'adjustment'::public.inventory_reason, 'forged tenant'
           )`,
          [storeB.variant]
        )
      )
    ).rejects.toThrow(/not authorized/i);
  });
});