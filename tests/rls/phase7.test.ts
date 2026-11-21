import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const users = {
  owner: "11111111-1111-4111-8111-111111111111",
  staff: "44444444-4444-4444-8444-444444444444",
  other: "22222222-2222-4222-8222-222222222222",
} as const;

const stores = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;

const customerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const variantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

let db: PGlite;
let orderId = "";
let cancelOrderId = "";

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

async function createOrder(
  userId: string,
  input: {
    items: Array<{ variantId: string; quantity: number }>;
    code?: string;
    key?: string;
    customerId?: string | null;
    markPaid?: boolean;
  }
) {
  return asUser(userId, () =>
    db.query<{ id: string }>(
      `select public.create_order(
        $1::uuid, $2::uuid, 'buyer@example.com', $3::jsonb, $4,
        500, 400, $5, '{"city":"Austin","region":"TX","country":"US"}'::jsonb, $6
      ) as id`,
      [
        stores.a,
        input.customerId === undefined ? customerId : input.customerId,
        JSON.stringify(
          input.items.map((item) => ({
            variant_id: item.variantId,
            quantity: item.quantity,
          }))
        ),
        input.code ?? null,
        input.markPaid ?? true,
        input.key ?? null,
      ]
    )
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
      ('${users.owner}', 'owner@example.com', '{"full_name":"Owner"}'),
      ('${users.staff}', 'staff@example.com', '{"full_name":"Staff"}'),
      ('${users.other}', 'other@example.com', '{"full_name":"Other"}');

    insert into public.stores (id, name, slug) values
      ('${stores.a}', 'Store A', 'store-a'),
      ('${stores.b}', 'Store B', 'store-b');

    insert into public.store_members (store_id, user_id, role) values
      ('${stores.a}', '${users.owner}', 'owner'),
      ('${stores.a}', '${users.staff}', 'staff'),
      ('${stores.b}', '${users.other}', 'owner');

    insert into public.customers (id, store_id, email, name) values
      ('${customerId}', '${stores.a}', 'buyer@example.com', 'Buyer');

    insert into public.products (id, store_id, title, slug, status, product_type)
    values ('${productId}', '${stores.a}', 'Canvas Tote', 'canvas-tote', 'active', 'Bags');

    insert into public.product_variants
      (id, store_id, product_id, title, sku, price_cents, cost_cents)
    values ('${variantId}', '${stores.a}', '${productId}', 'Natural', 'TOTE-NAT', 5000, 2000);

    insert into public.inventory (variant_id, store_id, on_hand, reserved)
    values ('${variantId}', '${stores.a}', 10, 0);

    insert into public.discounts
      (store_id, code, type, value, minimum_subtotal_cents, is_active)
    values ('${stores.a}', 'SAVE10', 'percentage', 10, 5000, true);
  `);
});

afterAll(async () => {
  await db.close();
});

describe("order creation", () => {
  it("reserves stock, snapshots prices, applies a discount, and records payment", async () => {
    const result = await createOrder(users.owner, {
      items: [{ variantId, quantity: 2 }],
      code: "SAVE10",
      key: "order-key-1",
    });
    orderId = result.rows[0]?.id ?? "";
    expect(orderId).toBeTruthy();

    const order = await db.query<{
      status: string;
      payment_status: string;
      subtotal_cents: number;
      discount_cents: number;
      total_cents: number;
    }>(
      `select status, payment_status, subtotal_cents, discount_cents, total_cents
       from public.orders where id = $1`,
      [orderId]
    );
    expect(order.rows[0]).toEqual({
      status: "processing",
      payment_status: "paid",
      subtotal_cents: 10000,
      discount_cents: 1000,
      total_cents: 9900,
    });

    const item = await db.query<{
      sku: string;
      unit_price_cents: number;
      reserved_quantity: number;
      fulfilled_quantity: number;
      product_type: string;
    }>(
      `select sku, unit_price_cents, reserved_quantity, fulfilled_quantity, product_type
       from public.order_items where order_id = $1`,
      [orderId]
    );
    expect(item.rows[0]).toEqual({
      sku: "TOTE-NAT",
      unit_price_cents: 5000,
      reserved_quantity: 2,
      fulfilled_quantity: 0,
      product_type: "Bags",
    });

    const inventory = await db.query<{ on_hand: number; reserved: number }>(
      `select on_hand, reserved from public.inventory where variant_id = $1`,
      [variantId]
    );
    expect(inventory.rows[0]).toEqual({ on_hand: 10, reserved: 2 });

    const payment = await db.query<{ amount_cents: number; status: string }>(
      `select amount_cents, status from public.payments where order_id = $1`,
      [orderId]
    );
    expect(payment.rows[0]).toEqual({ amount_cents: 9900, status: "paid" });

    const notification = await db.query<{ title: string }>(
      `select title from public.notifications where store_id = $1
       order by created_at desc limit 1`,
      [stores.a]
    );
    expect(notification.rows[0]?.title).toBe("New order");
  });

  it("returns the existing order for a repeated idempotency key", async () => {
    const repeat = await createOrder(users.owner, {
      items: [{ variantId, quantity: 2 }],
      code: "SAVE10",
      key: "order-key-1",
    });
    expect(repeat.rows[0]?.id).toBe(orderId);

    const count = await db.query<{ orders: number; reserved: number }>(
      `select
         (select count(*)::int from public.orders where store_id = $1) as orders,
         (select reserved from public.inventory where variant_id = $2) as reserved`,
      [stores.a, variantId]
    );
    expect(count.rows[0]).toEqual({ orders: 1, reserved: 2 });
  });

  it("rejects insufficient stock and unauthorized roles", async () => {
    await expect(
      createOrder(users.owner, {
        items: [{ variantId, quantity: 9 }],
        key: "order-key-too-many",
      })
    ).rejects.toThrow(/insufficient stock/i);

    await expect(
      createOrder(users.staff, {
        items: [{ variantId, quantity: 1 }],
        key: "order-key-staff",
      })
    ).rejects.toThrow(/not authorized/i);

    await expect(
      createOrder(users.other, {
        items: [{ variantId, quantity: 1 }],
        key: "order-key-other",
      })
    ).rejects.toThrow(/not authorized/i);
  });
});

describe("fulfillment", () => {
  it("fulfills partially, then completely, without duplicating movements", async () => {
    const itemRow = await db.query<{ id: string }>(
      `select id from public.order_items where order_id = $1`,
      [orderId]
    );
    const orderItemId = itemRow.rows[0]?.id ?? "";

    await asUser(users.staff, () =>
      db.query(`select public.fulfill_order($1::uuid, $2::jsonb)`, [
        orderId,
        JSON.stringify([{ order_item_id: orderItemId, quantity: 1 }]),
      ])
    );

    const partial = await db.query<{
      status: string;
      fulfillment_status: string;
      fulfilled_quantity: number;
      reserved_quantity: number;
      on_hand: number;
      reserved: number;
    }>(
      `select o.status, o.fulfillment_status, oi.fulfilled_quantity,
              oi.reserved_quantity, i.on_hand, i.reserved
       from public.orders o
       join public.order_items oi on oi.order_id = o.id
       join public.inventory i on i.variant_id = oi.variant_id
       where o.id = $1`,
      [orderId]
    );
    expect(partial.rows[0]).toEqual({
      status: "processing",
      fulfillment_status: "partially_fulfilled",
      fulfilled_quantity: 1,
      reserved_quantity: 1,
      on_hand: 9,
      reserved: 1,
    });

    await asUser(users.owner, () =>
      db.query(`select public.fulfill_order($1::uuid, null)`, [orderId])
    );

    const complete = await db.query<{
      status: string;
      fulfillment_status: string;
      fulfilled_quantity: number;
      reserved_quantity: number;
      on_hand: number;
      reserved: number;
      movements: number;
    }>(
      `select o.status, o.fulfillment_status, oi.fulfilled_quantity,
              oi.reserved_quantity, i.on_hand, i.reserved,
              (select count(*)::int from public.inventory_movements
               where reference_type = 'order' and reference_id = o.id
                 and reason = 'fulfillment') as movements
       from public.orders o
       join public.order_items oi on oi.order_id = o.id
       join public.inventory i on i.variant_id = oi.variant_id
       where o.id = $1`,
      [orderId]
    );
    expect(complete.rows[0]).toEqual({
      status: "fulfilled",
      fulfillment_status: "fulfilled",
      fulfilled_quantity: 2,
      reserved_quantity: 0,
      on_hand: 8,
      reserved: 0,
      movements: 2,
    });

    await asUser(users.owner, () =>
      db.query(`select public.fulfill_order($1::uuid, null)`, [orderId])
    );

    const retried = await db.query<{ movements: number; on_hand: number }>(
      `select
         (select count(*)::int from public.inventory_movements
          where reference_type = 'order' and reference_id = $1
            and reason = 'fulfillment') as movements,
         (select on_hand from public.inventory where variant_id = $2) as on_hand`,
      [orderId, variantId]
    );
    expect(retried.rows[0]).toEqual({ movements: 2, on_hand: 8 });
  });

  it("blocks cancellation after fulfillment and snapshot edits", async () => {
    await expect(
      asUser(users.owner, () =>
        db.query(`select public.cancel_order($1::uuid, true)`, [orderId])
      )
    ).rejects.toThrow(/fulfilled/i);

    await expect(
      db.query(
        `update public.order_items set unit_price_cents = 1 where order_id = $1`,
        [orderId]
      )
    ).rejects.toThrow(/immutable/i);
  });
});

describe("cancellation and refunds", () => {
  it("releases reservations, stays idempotent, and does not change on-hand stock", async () => {
    const created = await createOrder(users.owner, {
      items: [{ variantId, quantity: 1 }],
      key: "order-key-cancel",
      markPaid: false,
    });
    cancelOrderId = created.rows[0]?.id ?? "";

    await asUser(users.owner, () =>
      db.query(`select public.cancel_order($1::uuid, true)`, [cancelOrderId])
    );

    const cancelled = await db.query<{
      status: string;
      reserved: number;
      on_hand: number;
      reserved_quantity: number;
    }>(
      `select o.status, i.reserved, i.on_hand, oi.reserved_quantity
       from public.orders o
       join public.order_items oi on oi.order_id = o.id
       join public.inventory i on i.variant_id = oi.variant_id
       where o.id = $1`,
      [cancelOrderId]
    );
    expect(cancelled.rows[0]).toEqual({
      status: "cancelled",
      reserved: 0,
      on_hand: 8,
      reserved_quantity: 0,
    });

    await asUser(users.owner, () =>
      db.query(`select public.cancel_order($1::uuid, true)`, [cancelOrderId])
    );

    const after = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );
    expect(after.rows[0]?.on_hand).toBe(8);
  });

  it("deduplicates refunds by idempotency key and enforces the cap", async () => {
    const first = await asUser(users.owner, () =>
      db.query<{ id: string }>(
        `select public.record_refund_once($1::uuid, 1000, 'Damaged', 'refund-key-1') as id`,
        [orderId]
      )
    );

    const second = await asUser(users.owner, () =>
      db.query<{ id: string }>(
        `select public.record_refund_once($1::uuid, 1000, 'Damaged', 'refund-key-1') as id`,
        [orderId]
      )
    );
    expect(second.rows[0]?.id).toBe(first.rows[0]?.id);

    const refunds = await db.query<{ count: number }>(
      `select count(*)::int from public.refunds where order_id = $1`,
      [orderId]
    );
    expect(refunds.rows[0]?.count).toBe(1);

    await expect(
      asUser(users.owner, () =>
        db.query(
          `select public.record_refund_once($1::uuid, 9000, 'Too much', 'refund-key-2')`,
          [orderId]
        )
      )
    ).rejects.toThrow(/refundable|exceeds/i);
  });
});

describe("integrity and notifications", () => {
  it("reports clean reconciliation views", async () => {
    const orders = await db.query<{
      subtotal_matches: boolean;
      refunds_within_total: boolean;
      fulfillment_matches: boolean;
    }>(
      `select subtotal_matches, refunds_within_total, fulfillment_matches
       from public.order_reconciliation where store_id = $1`,
      [stores.a]
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
      [stores.a]
    );
    expect(inventory.rows.every((row) => row.matches)).toBe(true);
  });

  it("marks store notifications read for a member", async () => {
    const updated = await asUser(users.staff, () =>
      db.query<{ count: number }>(
        `select public.mark_notifications_read($1::uuid) as count`,
        [stores.a]
      )
    );
    expect(updated.rows[0]?.count ?? 0).toBeGreaterThan(0);

    const unread = await db.query<{ count: number }>(
      `select count(*)::int from public.notifications
       where store_id = $1 and read_at is null`,
      [stores.a]
    );
    expect(unread.rows[0]?.count).toBe(0);
  });

  it("blocks a direct illegal transition", async () => {
    await expect(
      db.query(
        `update public.orders set status = 'processing' where id = $1`,
        [orderId]
      )
    ).rejects.toThrow(/invalid order status transition/i);
  });
});
