import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const users = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  c: "33333333-3333-4333-8333-333333333333",
  staff: "44444444-4444-4444-8444-444444444444",
  suspended: "55555555-5555-4555-8555-555555555555",
} as const;

const stores = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;

const orderId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }

  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${users.a}', 'a@example.com', '{"full_name":"User A"}'),
      ('${users.b}', 'b@example.com', '{"full_name":"User B"}'),
      ('${users.c}', 'c@example.com', '{"full_name":"User C"}'),
      ('${users.staff}', 'staff@example.com', '{"full_name":"Staff User"}'),
      ('${users.suspended}', 'suspended@example.com', '{"full_name":"Suspended User"}');

    insert into public.stores (id, name, slug) values
      ('${stores.a}', 'Store A', 'store-a'),
      ('${stores.b}', 'Store B', 'store-b');

    insert into public.store_members (store_id, user_id, role, status) values
      ('${stores.a}', '${users.a}', 'owner', 'active'),
      ('${stores.b}', '${users.b}', 'owner', 'active'),
      ('${stores.a}', '${users.staff}', 'staff', 'active'),
      ('${stores.a}', '${users.suspended}', 'manager', 'suspended');

    insert into public.products (id, store_id, title, slug, status) values
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${stores.a}', 'A product', 'a-product', 'active');

    insert into public.customers (id, store_id, email, name) values
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '${stores.a}', 'buyer@example.com', 'Customer');

    insert into public.orders (id, store_id, customer_id, order_number, email, payment_status, total_cents, subtotal_cents) values
      ('${orderId}', '${stores.a}', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'ORD-1', 'buyer@example.com', 'paid', 1000, 1000);
  `);
});

afterAll(async () => {
  await db.close();
});

describe("tenant isolation", () => {
  it("lets a member read only their own store", async () => {
    const result = await asUser(users.a, () =>
      db.query<{ id: string }>("select id from public.stores")
    );

    expect(result.rows).toEqual([{ id: stores.a }]);
  });

  it("returns no stores to a non-member", async () => {
    const result = await asUser(users.c, () =>
      db.query("select id from public.stores")
    );

    expect(result.rows).toHaveLength(0);
  });

  it("blocks a cross-store product insert", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `insert into public.products (store_id, title, slug, status)
           values ('${stores.b}', 'Cross', 'cross', 'active')`
        )
      )
    ).rejects.toThrow();
  });

  it("hides another store's profiles", async () => {
    const result = await asUser(users.a, () =>
      db.query<{ id: string }>("select id from public.profiles order by id")
    );

    const visible = result.rows.map((row) => row.id);
    expect(visible).toContain(users.a);
    expect(visible).toContain(users.staff);
    expect(visible).not.toContain(users.b);
  });

  it("ignores suspended memberships", async () => {
    const result = await asUser(users.suspended, () =>
      db.query("select id from public.stores")
    );

    expect(result.rows).toHaveLength(0);
  });

  it("denies anonymous table access", async () => {
    await db.exec("set role anon;");
    try {
      await expect(db.query("select id from public.stores")).rejects.toThrow();
    } finally {
      await db.exec("reset role;");
    }
  });
});

describe("role enforcement", () => {
  it("lets staff read but not create products", async () => {
    const read = await asUser(users.staff, () =>
      db.query("select id from public.products")
    );
    expect(read.rows).toHaveLength(1);

    await expect(
      asUser(users.staff, () =>
        db.query(
          `insert into public.products (store_id, title, slug, status)
           values ('${stores.a}', 'Staff product', 'staff-product', 'active')`
        )
      )
    ).rejects.toThrow();
  });

  it("silently denies staff store updates", async () => {
    const before = await db.query<{ name: string }>(
      `select name from public.stores where id = '${stores.a}'`
    );

    await asUser(users.staff, () =>
      db.query(`update public.stores set name = 'Hacked' where id = '${stores.a}'`)
    );

    const after = await db.query<{ name: string }>(
      `select name from public.stores where id = '${stores.a}'`
    );
    expect(after.rows[0]?.name).toBe(before.rows[0]?.name);
  });

  it("lets an owner update the store", async () => {
    const result = await asUser(users.a, () =>
      db.query<{ name: string }>(
        `update public.stores set name = 'Store A Renamed' where id = '${stores.a}' returning name`
      )
    );

    expect(result.rows[0]?.name).toBe("Store A Renamed");
  });

  it("prevents demoting the last owner", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `update public.store_members set role = 'manager'
           where store_id = '${stores.a}' and user_id = '${users.a}'`
        )
      )
    ).rejects.toThrow(/own role|last owner/i);
  });

  it("prevents removing the last owner", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `delete from public.store_members
           where store_id = '${stores.a}' and user_id = '${users.a}'`
        )
      )
    ).rejects.toThrow(/own membership|last owner/i);
  });

  it("keeps activity logs to owners and admins", async () => {
    await asUser(users.staff, () =>
      db.query(
        `insert into public.activity_logs (store_id, actor_id, action, entity_type)
         values ('${stores.a}', '${users.staff}', 'test.viewed', 'test')`
      )
    );

    const staffView = await asUser(users.staff, () =>
      db.query("select id from public.activity_logs")
    );
    expect(staffView.rows).toHaveLength(0);

    const ownerView = await asUser(users.a, () =>
      db.query("select id from public.activity_logs")
    );
    expect(ownerView.rows).toHaveLength(1);
  });
});

describe("store bootstrap", () => {
  it("creates a store and owner membership for the caller", async () => {
    const result = await asUser(users.c, () =>
      db.query<{ id: string; name: string; slug: string }>(
        "select * from public.create_store('User C Store')"
      )
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.slug).toBe("user-c-store");

    const membership = await db.query<{ role: string }>(
      `select role from public.store_members
       where store_id = '${result.rows[0]?.id}' and user_id = '${users.c}'`
    );
    expect(membership.rows[0]?.role).toBe("owner");
  });
});

describe("direct write protection", () => {
  const sensitiveTables = [
    "orders",
    "order_items",
    "payments",
    "refunds",
    "returns",
    "return_items",
    "inventory",
    "inventory_movements",
    "discount_usages",
  ] as const;

  it("denies direct inserts, updates, and deletes to workflow-owned tables", async () => {
    for (const table of sensitiveTables) {
      await expect(
        asUser(users.a, () => db.query(`insert into public.${table} default values`))
      ).rejects.toThrow(/permission denied/i);

      await expect(
        asUser(users.a, () =>
          db.query(`update public.${table} set store_id = store_id where false`)
        )
      ).rejects.toThrow(/permission denied/i);

      await expect(
        asUser(users.a, () =>
          db.query(`delete from public.${table} where false`)
        )
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it("keeps read access for members", async () => {
    const result = await asUser(users.a, () =>
      db.query<{ count: number }>(
        `select count(*)::int as count from public.order_items`
      )
    );
    expect(result.rows[0]?.count).toBe(0);
  });

  it("scopes security-invoker views to the caller's store", async () => {
    for (const view of [
      "inventory_levels",
      "inventory_overview",
      "inventory_reconciliation",
      "order_reconciliation",
    ]) {
      const other = await asUser(users.b, () =>
        db.query(`select 1 from public.${view}`)
      );
      expect(other.rows).toHaveLength(0);
    }

    const ownOrder = await asUser(users.a, () =>
      db.query(`select 1 from public.order_reconciliation`)
    );
    expect(ownOrder.rows).toHaveLength(1);
  });
});

describe("refund safety", () => {
  it("rejects direct refund writes even for an owner", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(
          `insert into public.refunds (store_id, order_id, amount_cents, status)
           values ('${stores.a}', '${orderId}', 1500, 'completed')`
        )
      )
    ).rejects.toThrow(/permission denied/i);
  });

  it("caps refunds through the workflow function", async () => {
    await expect(
      asUser(users.a, () =>
        db.query(`select public.record_refund($1::uuid, 1500, 'too much')`, [
          orderId,
        ])
      )
    ).rejects.toThrow(/refundable/i);
  });

  it("records a valid refund through the workflow function", async () => {
    const result = await asUser(users.a, () =>
      db.query<{ id: string }>(
        `select public.record_refund($1::uuid, 400, 'damaged') as id`,
        [orderId]
      )
    );
    expect(result.rows[0]?.id).toBeTruthy();

    const refund = await db.query<{ amount_cents: number }>(
      `select amount_cents from public.refunds where order_id = $1`,
      [orderId]
    );
    expect(refund.rows[0]?.amount_cents).toBe(400);
  });

  it("blocks a cross-store refund through the workflow function", async () => {
    await db.exec(`
      insert into public.orders
        (id, store_id, customer_id, order_number, email, payment_status, total_cents, subtotal_cents)
      values
        ('abababab-abab-4bab-8bab-abababababab', '${stores.b}', null,
         'ORD-B', 'buyer@example.com', 'paid', 100, 100);
    `);

    await expect(
      asUser(users.a, () =>
        db.query(
          `select public.record_refund('abababab-abab-4bab-8bab-abababababab'::uuid, 10, 'cross')`
        )
      )
    ).rejects.toThrow(/not authorized/i);
  });
});
