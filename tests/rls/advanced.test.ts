import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const users = {
  owner: "11111111-1111-4111-8111-111111111111",
  admin: "22222222-2222-4222-8222-222222222222",
  manager: "33333333-3333-4333-8333-333333333333",
  invitee: "44444444-4444-4444-8444-444444444444",
  other: "55555555-5555-4555-8555-555555555555",
} as const;

const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const productId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const variantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const orderId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const orderItemId = "abababab-abab-4bab-8bab-abababababab";

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
      ('${users.owner}', 'owner@example.com', '{"full_name":"Owner"}'),
      ('${users.admin}', 'admin@example.com', '{"full_name":"Admin"}'),
      ('${users.manager}', 'manager@example.com', '{"full_name":"Manager"}'),
      ('${users.invitee}', 'invitee@example.com', '{"full_name":"Invitee"}'),
      ('${users.other}', 'other@example.com', '{"full_name":"Other"}');

    insert into public.stores (id, name, slug) values
      ('${storeId}', 'Store A', 'store-a');

    insert into public.store_members (store_id, user_id, role) values
      ('${storeId}', '${users.owner}', 'owner'),
      ('${storeId}', '${users.admin}', 'admin'),
      ('${storeId}', '${users.manager}', 'manager');

    insert into public.customers (id, store_id, email, name) values
      ('${customerId}', '${storeId}', 'buyer@example.com', 'Buyer');

    insert into public.products (id, store_id, title, slug, status, product_type)
    values ('${productId}', '${storeId}', 'Workflow Product', 'workflow-product', 'active', 'Bags');

    insert into public.product_variants
      (id, store_id, product_id, title, sku, price_cents, cost_cents)
    values ('${variantId}', '${storeId}', '${productId}', 'Default', 'WF-1', 5000, 2000);

    insert into public.inventory (variant_id, store_id, on_hand, reserved)
    values ('${variantId}', '${storeId}', 10, 0);

    insert into public.orders
      (id, store_id, customer_id, order_number, email, status, payment_status,
       subtotal_cents, total_cents)
    values
      ('${orderId}', '${storeId}', '${customerId}', 'ORD-100',
       'buyer@example.com', 'fulfilled', 'paid', 10000, 10000);

    insert into public.order_items
      (id, store_id, order_id, variant_id, product_title, variant_title, sku,
       product_type, quantity, unit_price_cents, total_cents)
    values
      ('${orderItemId}', '${storeId}', '${orderId}', '${variantId}',
       'Workflow Product', 'Default', 'WF-1', 'Bags', 2, 5000, 10000);
  `);
});

afterAll(async () => {
  await db.close();
});

describe("discount redemption", () => {
  it("applies a percentage discount once and records usage", async () => {
    const discount = await db.query<{ id: string }>(
      `insert into public.discounts
        (store_id, code, type, value, minimum_subtotal_cents, is_active)
       values ($1::uuid, 'SAVE10', 'percentage', 10, 5000, true)
       returning id`,
      [storeId]
    );

    const result = await asUser(users.manager, () =>
      db.query<{ amount_cents: number }>(
        `select amount_cents from public.redeem_discount($1::uuid, 'SAVE10', $2::uuid)`,
        [storeId, orderId]
      )
    );
    expect(result.rows[0]?.amount_cents).toBe(1000);

    const usage = await db.query<{ usage_count: number }>(
      `select usage_count from public.discounts where id = $1`,
      [discount.rows[0]?.id]
    );
    expect(usage.rows[0]?.usage_count).toBe(1);

    await expect(
      asUser(users.manager, () =>
        db.query(
          `select public.redeem_discount($1::uuid, 'SAVE10', $2::uuid)`,
          [storeId, orderId]
        )
      )
    ).rejects.toThrow(/already used/i);
  });

  it("rejects disabled, early, exhausted, and under-minimum codes", async () => {
    await db.exec(`
      insert into public.discounts
        (store_id, code, type, value, is_active, starts_at)
      values
        ('${storeId}', 'DISABLED', 'fixed_amount', 500, false, null),
        ('${storeId}', 'FUTURE', 'fixed_amount', 500, true, now() + interval '1 day'),
        ('${storeId}', 'USEDUP', 'fixed_amount', 500, true, null),
        ('${storeId}', 'MINHIGH', 'percentage', 5, true, null);

      update public.discounts set usage_limit = 1, usage_count = 1
      where code = 'USEDUP';
      update public.discounts set minimum_subtotal_cents = 50000
      where code = 'MINHIGH';
    `);

    for (const code of ["DISABLED", "FUTURE", "USEDUP", "MINHIGH"]) {
      await expect(
        asUser(users.manager, () =>
          db.query(`select public.redeem_discount($1::uuid, $2, $3::uuid)`, [
            storeId,
            code,
            orderId,
          ])
        )
      ).rejects.toThrow();
    }
  });

  it("denies staff redemption", async () => {
    await expect(
      asUser(users.invitee, () =>
        db.query(`select public.redeem_discount($1::uuid, 'SAVE10', $2::uuid)`, [
          storeId,
          orderId,
        ])
      )
    ).rejects.toThrow();
  });
});

describe("returns workflow", () => {
  it("rejects quantities above the ordered quantity", async () => {
    await expect(
      asUser(users.manager, () =>
        db.query(`select public.create_return($1::uuid, 'Too many', $2::jsonb)`, [
          orderId,
          JSON.stringify([{ order_item_id: orderItemId, quantity: 3 }]),
        ])
      )
    ).rejects.toThrow(/exceeds/i);
  });

  it("creates, approves, refunds, and restocks exactly once", async () => {
    const created = await asUser(users.manager, () =>
      db.query<{ id: string }>(
        `select public.create_return($1::uuid, 'Damaged', $2::jsonb) as id`,
        [
          orderId,
          JSON.stringify([
            { order_item_id: orderItemId, quantity: 1, restock: true },
          ]),
        ]
      )
    );
    const returnId = created.rows[0]?.id ?? "";
    expect(returnId).toBeTruthy();

    await asUser(users.manager, () =>
      db.query(`select public.decide_return($1::uuid, true, 'Approved')`, [
        returnId,
      ])
    );

    const before = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );

    await asUser(users.manager, () =>
      db.query(`select public.refund_return($1::uuid, true)`, [returnId])
    );

    const ret = await db.query<{ status: string; restock: boolean }>(
      `select status, restock from public.returns where id = $1`,
      [returnId]
    );
    expect(ret.rows[0]).toEqual({ status: "refunded", restock: true });

    const after = await db.query<{ on_hand: number }>(
      `select on_hand from public.inventory where variant_id = $1`,
      [variantId]
    );
    expect(after.rows[0]?.on_hand).toBe((before.rows[0]?.on_hand ?? 0) + 1);

    const refund = await db.query<{ amount_cents: number }>(
      `select amount_cents from public.refunds where order_id = $1`,
      [orderId]
    );
    expect(refund.rows[0]?.amount_cents).toBe(5000);

    await expect(
      asUser(users.manager, () =>
        db.query(`select public.refund_return($1::uuid, true)`, [returnId])
      )
    ).rejects.toThrow(/approved/i);
  });

  it("blocks creating a return that exceeds the remaining quantity", async () => {
    await expect(
      asUser(users.manager, () =>
        db.query(`select public.create_return($1::uuid, 'Again', $2::jsonb)`, [
          orderId,
          JSON.stringify([{ order_item_id: orderItemId, quantity: 2 }]),
        ])
      )
    ).rejects.toThrow(/exceeds/i);
  });

  it("cannot refund a rejected return", async () => {
    const created = await asUser(users.manager, () =>
      db.query<{ id: string }>(
        `select public.create_return($1::uuid, 'Wrong size', $2::jsonb) as id`,
        [
          orderId,
          JSON.stringify([{ order_item_id: orderItemId, quantity: 1 }]),
        ]
      )
    );
    const returnId = created.rows[0]?.id ?? "";

    await asUser(users.manager, () =>
      db.query(`select public.decide_return($1::uuid, false, 'Rejected')`, [
        returnId,
      ])
    );

    await expect(
      asUser(users.manager, () =>
        db.query(`select public.refund_return($1::uuid, false)`, [returnId])
      )
    ).rejects.toThrow(/approved/i);
  });
});

describe("invitations", () => {
  it("rejects owner invitations at the database layer", async () => {
    await expect(
      db.query(
        `insert into public.invitations
          (store_id, email, role, token_hash, expires_at)
         values ($1::uuid, 'x@example.com', 'owner', 'owner-token', now() + interval '1 day')`,
        [storeId]
      )
    ).rejects.toThrow();
  });

  it("rejects expired and wrong-email invitations", async () => {
    await db.exec(`
      insert into public.invitations
        (store_id, email, role, token_hash, expires_at)
      values
        ('${storeId}', 'invitee@example.com', 'manager', 'expired-token', now() - interval '1 day'),
        ('${storeId}', 'other@example.com', 'manager', 'wrong-email-token', now() + interval '1 day');
    `);

    await expect(
      asUser(users.invitee, () =>
        db.query(`select public.accept_invitation('expired-token')`)
      )
    ).rejects.toThrow(/invalid or expired/i);

    await expect(
      asUser(users.invitee, () =>
        db.query(`select public.accept_invitation('wrong-email-token')`)
      )
    ).rejects.toThrow(/different email/i);
  });

  it("accepts a matching invitation once and creates the membership", async () => {
    await db.exec(`
      insert into public.invitations
        (store_id, email, role, token_hash, expires_at)
      values
        ('${storeId}', 'invitee@example.com', 'staff', 'good-token', now() + interval '1 day');
    `);

    const accepted = await asUser(users.invitee, () =>
      db.query<{ store_id: string }>(
        `select public.accept_invitation('good-token') as store_id`
      )
    );
    expect(accepted.rows[0]?.store_id).toBe(storeId);

    const membership = await db.query<{ role: string }>(
      `select role from public.store_members
       where store_id = $1 and user_id = $2`,
      [storeId, users.invitee]
    );
    expect(membership.rows[0]?.role).toBe("staff");

    await expect(
      asUser(users.invitee, () =>
        db.query(`select public.accept_invitation('good-token')`)
      )
    ).rejects.toThrow();
  });
});

describe("team guards", () => {
  it("blocks changing your own role", async () => {
    await expect(
      asUser(users.owner, () =>
        db.query(
          `update public.store_members set role = 'manager'
           where store_id = $1 and user_id = $2`,
          [storeId, users.owner]
        )
      )
    ).rejects.toThrow(/own role/i);
  });

  it("blocks an admin from granting ownership", async () => {
    await expect(
      asUser(users.admin, () =>
        db.query(
          `update public.store_members set role = 'owner'
           where store_id = $1 and user_id = $2`,
          [storeId, users.manager]
        )
      )
    ).rejects.toThrow(/ownership/i);
  });

  it("lets an admin change a non-owner role", async () => {
    await asUser(users.admin, () =>
      db.query(
        `update public.store_members set role = 'staff'
         where store_id = $1 and user_id = $2`,
        [storeId, users.manager]
      )
    );

    const role = await db.query<{ role: string }>(
      `select role from public.store_members where store_id = $1 and user_id = $2`,
      [storeId, users.manager]
    );
    expect(role.rows[0]?.role).toBe("staff");
  });
});

describe("profile settings", () => {
  it("lets a member edit only their own profile", async () => {
    await asUser(users.manager, () =>
      db.query(
        `update public.profiles
         set full_name = 'Manager Renamed', notification_preferences = '{"low_stock":true}'
         where id = $1`,
        [users.manager]
      )
    );

    const own = await db.query<{ full_name: string }>(
      `select full_name from public.profiles where id = $1`,
      [users.manager]
    );
    expect(own.rows[0]?.full_name).toBe("Manager Renamed");

    await asUser(users.manager, () =>
      db.query(`update public.profiles set full_name = 'Hacked' where id = $1`, [
        users.owner,
      ])
    );

    const ownerProfile = await db.query<{ full_name: string }>(
      `select full_name from public.profiles where id = $1`,
      [users.owner]
    );
    expect(ownerProfile.rows[0]?.full_name).toBe("Owner");
  });
});
