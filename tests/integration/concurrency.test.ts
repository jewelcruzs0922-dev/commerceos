import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const connectionString = process.env.TEST_DATABASE_URL;
const databaseName = connectionString
  ? new URL(connectionString).pathname.replace(/^\//, "")
  : "";
const enabled =
  Boolean(connectionString) &&
  (databaseName.endsWith("_test") ||
    process.env.ALLOW_INTEGRATION_DB_TESTS === "true");
const describeDatabase = enabled ? describe : describe.skip;

const ownerId = "11111111-1111-4111-8111-111111111111";
const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const variantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

let admin: Client;

function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  return promise.then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason) => ({ status: "rejected" as const, reason })
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectAs(userId: string): Promise<Client> {
  if (!connectionString) throw new Error("TEST_DATABASE_URL is required");
  const client = new Client({ connectionString });
  await client.connect();
  await client.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId,
  ]);
  await client.query("set role authenticated");
  return client;
}

async function close(...clients: Client[]) {
  await Promise.allSettled(clients.map((client) => client.end()));
}

async function createPaidOrder(id: string, totalCents = 2500) {
  await admin.query(
    `insert into public.orders
      (id, store_id, customer_id, order_number, email, payment_status,
       subtotal_cents, total_cents)
     values ($1, $2, $3, $4, 'buyer@example.com', 'paid', $5, $5)`,
    [id, storeId, customerId, `TEST-${id.replaceAll("-", "").slice(-10)}`, totalCents]
  );
}

beforeAll(async () => {
  if (!enabled || !connectionString) return;

  admin = new Client({ connectionString });
  await admin.connect();

  await admin.query(`
    drop schema if exists public cascade;
    create schema public;
    drop schema if exists private cascade;
    drop schema if exists auth cascade;
    drop role if exists authenticated;
    drop role if exists anon;
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);

  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    await admin.query(readFileSync(join(dir, file), "utf8"));
  }

  await admin.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'owner@example.com', '{"full_name":"Owner"}')`,
    [ownerId]
  );
  await admin.query(
    `insert into public.stores (id, name, slug) values ($1, 'Store A', 'store-a')`,
    [storeId]
  );
  await admin.query(
    `insert into public.store_members (store_id, user_id, role) values ($1, $2, 'owner')`,
    [storeId, ownerId]
  );
  await admin.query(
    `insert into public.customers (id, store_id, email, name) values
       ($1, $2, 'buyer@example.com', 'Buyer')`,
    [customerId, storeId]
  );
  await admin.query(
    `insert into public.products (id, store_id, title, slug, status)
     values ($1, $2, 'Concurrency Product', 'concurrency-product', 'active')`,
    [productId, storeId]
  );
  await admin.query(
    `insert into public.product_variants
       (id, store_id, product_id, title, sku, price_cents, cost_cents)
     values ($1, $2, $3, 'Default', 'CONC-1', 2500, 1000)`,
    [variantId, storeId, productId]
  );
  await admin.query(
    `insert into public.inventory (variant_id, store_id, on_hand, reserved)
     values ($1, $2, 10, 0)`,
    [variantId, storeId]
  );
});

afterAll(async () => {
  if (admin) await admin.end();
});

describeDatabase("real PostgreSQL concurrency", () => {
  it("reserves the last unit only once", async () => {
    await admin.query(
      `update public.inventory set on_hand = 1, reserved = 0 where variant_id = $1`,
      [variantId]
    );

    const first = await connectAs(ownerId);
    const second = await connectAs(ownerId);

    try {
      await first.query("begin");
      await second.query("begin");

      const firstOrder = settle(first.query(
        `select public.create_order(
          $1::uuid, $2::uuid, 'buyer@example.com',
          jsonb_build_array(jsonb_build_object('variant_id', $3::uuid, 'quantity', 1)),
          null, 0, 0, true, '{}'::jsonb, 'last-unit-a'
        )`,
        [storeId, customerId, variantId]
      ));
      await sleep(150);
      const secondOrder = settle(second.query(
        `select public.create_order(
          $1::uuid, $2::uuid, 'buyer@example.com',
          jsonb_build_array(jsonb_build_object('variant_id', $3::uuid, 'quantity', 1)),
          null, 0, 0, true, '{}'::jsonb, 'last-unit-b'
        )`,
        [storeId, customerId, variantId]
      ));
      await sleep(250);
      await first.query("commit");

      const results = await Promise.all([firstOrder, secondOrder]);
      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(
        String(
          rejected[0] && "reason" in rejected[0] ? rejected[0].reason : ""
        )
      ).toMatch(/insufficient stock/i);
      await second.query("rollback");
    } finally {
      await close(first, second);
    }

    const state = await admin.query<{ orders: number; reserved: number }>(
      `select
        (select count(*)::int from public.orders where store_id = $1) as orders,
        (select reserved from public.inventory where variant_id = $2) as reserved`,
      [storeId, variantId]
    );
    expect(state.rows[0]).toEqual({ orders: 1, reserved: 1 });
  });

  it("returns the same order for two same-key submissions", async () => {
    await admin.query(
      `update public.inventory set on_hand = 10, reserved = 0 where variant_id = $1`,
      [variantId]
    );
    const before = await admin.query<{ count: number }>(
      `select count(*)::int as count from public.orders where store_id = $1`,
      [storeId]
    );

    const first = await connectAs(ownerId);
    const second = await connectAs(ownerId);

    try {
      await first.query("begin");
      await second.query("begin");

      const firstOrder = settle(first.query<{ create_order: string }>(
        `select public.create_order(
          $1::uuid, $2::uuid, 'buyer@example.com',
          jsonb_build_array(jsonb_build_object('variant_id', $3::uuid, 'quantity', 1)),
          null, 0, 0, true, '{}'::jsonb, 'same-key'
        )`,
        [storeId, customerId, variantId]
      ));
      await sleep(150);
      const secondOrder = settle(second.query<{ create_order: string }>(
        `select public.create_order(
          $1::uuid, $2::uuid, 'buyer@example.com',
          jsonb_build_array(jsonb_build_object('variant_id', $3::uuid, 'quantity', 1)),
          null, 0, 0, true, '{}'::jsonb, 'same-key'
        )`,
        [storeId, customerId, variantId]
      ));
      await sleep(250);
      await first.query("commit");

      const [a, b] = await Promise.all([firstOrder, secondOrder]);
      await second.query("commit");
      if (a.status !== "fulfilled" || b.status !== "fulfilled") {
        throw new Error("same-key order submission failed");
      }
      expect(a.value.rows[0]?.create_order).toBe(b.value.rows[0]?.create_order);
    } finally {
      await close(first, second);
    }

    const after = await admin.query<{ count: number }>(
      `select count(*)::int as count from public.orders where store_id = $1`,
      [storeId]
    );
    expect(after.rows[0]?.count).toBe((before.rows[0]?.count ?? 0) + 1);
  });

  it("caps two concurrent refunds and reuses a same-key refund", async () => {
    const refundOrderId = "99999999-9999-4999-8999-999999999991";
    const duplicateOrderId = "99999999-9999-4999-8999-999999999992";
    await createPaidOrder(refundOrderId);
    await createPaidOrder(duplicateOrderId);

    const first = await connectAs(ownerId);
    const second = await connectAs(ownerId);

    try {
      await first.query("begin");
      await second.query("begin");
      const firstRefund = settle(first.query(
        `select public.record_refund_once($1::uuid, 2000, 'race one', 'refund-a')`,
        [refundOrderId]
      ));
      await sleep(150);
      const secondRefund = settle(second.query(
        `select public.record_refund_once($1::uuid, 2000, 'race two', 'refund-b')`,
        [refundOrderId]
      ));
      await sleep(250);
      await first.query("commit");

      const results = await Promise.all([firstRefund, secondRefund]);
      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(
        String(
          rejected[0] && "reason" in rejected[0] ? rejected[0].reason : ""
        )
      ).toMatch(/refundable/i);
      await second.query("rollback");
    } finally {
      await close(first, second);
    }

    const capped = await admin.query<{ count: number; total: number }>(
      `select count(*)::int as count, coalesce(sum(amount_cents), 0)::int as total
       from public.refunds where order_id = $1`,
      [refundOrderId]
    );
    expect(capped.rows[0]).toEqual({ count: 1, total: 2000 });

    const third = await connectAs(ownerId);
    const fourth = await connectAs(ownerId);
    try {
      await third.query("begin");
      await fourth.query("begin");
      const a = settle(third.query<{ record_refund_once: string }>(
        `select public.record_refund_once($1::uuid, 500, 'duplicate', 'same-refund')`,
        [duplicateOrderId]
      ));
      await sleep(150);
      const b = settle(fourth.query<{ record_refund_once: string }>(
        `select public.record_refund_once($1::uuid, 500, 'duplicate', 'same-refund')`,
        [duplicateOrderId]
      ));
      await sleep(250);
      await third.query("commit");
      const [firstRow, secondRow] = await Promise.all([a, b]);
      await fourth.query("commit");
      if (firstRow.status !== "fulfilled" || secondRow.status !== "fulfilled") {
        throw new Error("same-key refund submission failed");
      }
      expect(firstRow.value.rows[0]?.record_refund_once).toBe(
        secondRow.value.rows[0]?.record_refund_once
      );
    } finally {
      await close(third, fourth);
    }

    const duplicate = await admin.query<{ count: number }>(
      `select count(*)::int as count from public.refunds where order_id = $1`,
      [duplicateOrderId]
    );
    expect(duplicate.rows[0]?.count).toBe(1);
  });

  it("enforces a usage limit under concurrent redemption", async () => {
    const firstOrder = "99999999-9999-4999-8999-999999999993";
    const secondOrder = "99999999-9999-4999-8999-999999999994";
    await createPaidOrder(firstOrder, 1000);
    await createPaidOrder(secondOrder, 1000);

    await admin.query(
      `insert into public.discounts
        (store_id, code, type, value, minimum_subtotal_cents, usage_limit, is_active)
       values ($1, 'RACE10', 'percentage', 10, 0, 1, true)`,
      [storeId]
    );

    const first = await connectAs(ownerId);
    const second = await connectAs(ownerId);

    try {
      await first.query("begin");
      await second.query("begin");
      const firstRedemption = settle(first.query(
        `select * from public.redeem_discount($1::uuid, 'RACE10', $2::uuid)`,
        [storeId, firstOrder]
      ));
      await sleep(150);
      const secondRedemption = settle(second.query(
        `select * from public.redeem_discount($1::uuid, 'RACE10', $2::uuid)`,
        [storeId, secondOrder]
      ));
      await sleep(250);
      await first.query("commit");

      const results = await Promise.all([
        firstRedemption,
        secondRedemption,
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled")
      ).toHaveLength(1);
      const rejected = results.filter(
        (result) => result.status === "rejected"
      );
      expect(rejected).toHaveLength(1);
      expect(
        String(
          rejected[0] && "reason" in rejected[0] ? rejected[0].reason : ""
        )
      ).toMatch(/usage limit/i);
      await second.query("rollback");
    } finally {
      await close(first, second);
    }

    const usage = await admin.query<{ count: number; usage_count: number }>(
      `select
        (select count(*)::int from public.discount_usages where discount_id = d.id) as count,
        d.usage_count
       from public.discounts d where d.store_id = $1 and d.code = 'RACE10'`,
      [storeId]
    );
    expect(usage.rows[0]).toEqual({ count: 1, usage_count: 1 });
  });

  it("prevents cancellation from racing a fulfillment into an invalid state", async () => {
    await admin.query(
      `update public.inventory set on_hand = 10, reserved = 0 where variant_id = $1`,
      [variantId]
    );
    const creator = await connectAs(ownerId);
    const created = await creator.query<{ create_order: string }>(
      `select public.create_order(
        $1::uuid, $2::uuid, 'buyer@example.com',
        jsonb_build_array(jsonb_build_object('variant_id', $3::uuid, 'quantity', 1)),
        null, 0, 0, true, '{}'::jsonb, 'fulfill-race'
      )`,
      [storeId, customerId, variantId]
    );
    await creator.end();
    const orderId = created.rows[0]?.create_order;
    if (!orderId) throw new Error("Order was not created");

    const first = await connectAs(ownerId);
    const second = await connectAs(ownerId);

    try {
      await first.query("begin");
      await second.query("begin");
      const fulfillment = settle(first.query(
        `select public.fulfill_order($1::uuid, null)`,
        [orderId]
      ));
      await sleep(150);
      const cancellation = settle(second.query(
        `select public.cancel_order($1::uuid, true)`,
        [orderId]
      ));
      await sleep(250);
      await first.query("commit");

      expect((await fulfillment).status).toBe("fulfilled");
      const results = await Promise.all([cancellation]);
      expect(results[0]?.status).toBe("rejected");
      await second.query("rollback");
    } finally {
      await close(first, second);
    }

    const state = await admin.query<{
      status: string;
      fulfillment_status: string;
      on_hand: number;
      reserved: number;
    }>(
      `select o.status, o.fulfillment_status, i.on_hand, i.reserved
       from public.orders o
       join public.order_items oi on oi.order_id = o.id
       join public.inventory i on i.variant_id = oi.variant_id
       where o.id = $1`,
      [orderId]
    );
    expect(state.rows[0]).toEqual({
      status: "fulfilled",
      fulfillment_status: "fulfilled",
      on_hand: 9,
      reserved: 0,
    });
  });
});
