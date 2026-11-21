import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

await db.exec(`
create schema if not exists auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon;
create role authenticated;
`);
for (const file of files) {
  await db.exec(readFileSync(join(dir, file), "utf8"));
}

const enums = await db.query(`
  select t.typname as name, e.enumlabel as value
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder
`);

const cols = await db.query(`
  select table_name, column_name, data_type, udt_name, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position
`);

const views = await db.query(`
  select table_name from information_schema.views where table_schema = 'public' order by table_name
`);

const enumMap = new Map();
for (const row of enums.rows) {
  if (!enumMap.has(row.name)) enumMap.set(row.name, []);
  enumMap.get(row.name).push(row.value);
}

const tables = new Map();
for (const col of cols.rows) {
  if (!tables.has(col.table_name)) tables.set(col.table_name, []);
  tables.get(col.table_name).push(col);
}

const viewNames = new Set(views.rows.map((r) => r.table_name));
for (const name of viewNames) tables.delete(name);

const scalar = {
  uuid: "string",
  text: "string",
  "character varying": "string",
  character: "string",
  integer: "number",
  bigint: "number",
  smallint: "number",
  boolean: "boolean",
  timestamptz: "string",
  timestamp: "string",
  date: "string",
  jsonb: "Json",
  json: "Json",
};

function tsType(col) {
  if (col.data_type === "ARRAY") {
    const inner = col.udt_name.replace(/^_/, "");
    if (enumMap.has(inner)) {
      return `Database["public"]["Enums"]["${inner}"][]`;
    }
    return `${scalar[inner] ?? "string"}[]`;
  }
  if (col.data_type === "USER-DEFINED") {
    return enumMap.has(col.udt_name)
      ? `Database["public"]["Enums"]["${col.udt_name}"]`
      : "string";
  }
  return scalar[col.data_type] ?? "string";
}

const field = (c) => `          ${c.column_name}`;

function rowType(columns) {
  return columns
    .map((c) => `${field(c)}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""}`)
    .join("\n");
}

function insertType(columns) {
  return columns
    .map((c) => {
      const optional = c.is_nullable === "YES" || c.column_default !== null;
      return `${field(c)}${optional ? "?" : ""}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""}`;
    })
    .join("\n");
}

function updateType(columns) {
  return columns
    .map((c) => `${field(c)}?: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""}`)
    .join("\n");
}

let out = `// Generated from supabase/migrations by scripts/generate-database-types.mjs.
// Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
// after a local Supabase database is available, or run npm run db:types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
`;

for (const [name, columns] of [...tables.entries()].sort()) {
  out += `      ${name}: {\n        Row: {\n${rowType(columns)}\n        }\n        Insert: {\n${insertType(columns)}\n        }\n        Update: {\n${updateType(columns)}\n        }\n        Relationships: []\n      }\n`;
}

out += `    }\n    Views: {\n`;
for (const view of views.rows.sort((a, b) => a.table_name.localeCompare(b.table_name))) {
  const columns = (await db.query(
    `select column_name, data_type, udt_name, is_nullable from information_schema.columns where table_schema='public' and table_name='${view.table_name}' order by ordinal_position`
  )).rows;
  out += `      ${view.table_name}: {\n        Row: {\n${rowType(columns)}\n        }\n        Relationships: []\n      }\n`;
}

const functionSignatures = {
  create_store: {
    args: "{ store_name: string }",
    returns: "{ id: string; name: string; slug: string }[]",
  },
  create_product: {
    args: `{
          p_store_id: string
          p_title: string
          p_slug: string
          p_description: string
          p_status: "draft" | "active" | "archived"
          p_vendor: string | null
          p_product_type: string | null
          p_image_url: string | null
          p_variants: Json
        }`,
    returns: "string",
  },
  add_product_variant: {
    args: `{
          p_store_id: string
          p_product_id: string
          p_title: string
          p_sku: string
          p_barcode: string | null
          p_price_cents: number
          p_cost_cents: number | null
          p_on_hand: number
          p_low_stock_threshold: number
        }`,
    returns: "string",
  },
  adjust_inventory: {
    args: `{
          p_variant_id: string
          p_delta: number
          p_reason:
            | "sale"
            | "reservation"
            | "release"
            | "fulfillment"
            | "return"
            | "restock"
            | "adjustment"
            | "damage"
            | "cancellation"
          p_note: string
        }`,
    returns: "number",
  },
  cancel_order: {
    args: "{ p_order_id: string; p_restock: boolean }",
    returns: "undefined",
  },
  record_refund: {
    args: `{
          p_order_id: string
          p_amount_cents: number
          p_reason: string
        }`,
    returns: "string",
  },
  record_refund_once: {
    args: `{
          p_order_id: string
          p_amount_cents: number
          p_reason: string
          p_idempotency_key: string | null
        }`,
    returns: "string",
  },
  create_order: {
    args: `{
          p_store_id: string
          p_customer_id: string | null
          p_email: string
          p_items: Json
          p_discount_code: string | null
          p_shipping_cents: number
          p_tax_cents: number
          p_mark_paid: boolean
          p_shipping_address: Json
          p_idempotency_key: string | null
        }`,
    returns: "string",
  },
  fulfill_order: {
    args: "{ p_order_id: string; p_items: Json | null }",
    returns: "undefined",
  },
  mark_notifications_read: {
    args: "{ p_store_id: string }",
    returns: "number",
  },
  join_demo_store: {
    args: "Record<string, never>",
    returns: "string",
  },
  reset_demo_store: {
    args: "Record<string, never>",
    returns: "string",
  },
  duplicate_product: {
    args: "{ p_store_id: string; p_product_id: string }",
    returns: "string",
  },
  set_collection_products: {
    args: "{ p_collection_id: string; p_product_ids: string[] }",
    returns: "undefined",
  },
  redeem_discount: {
    args: "{ p_store_id: string; p_code: string; p_order_id: string }",
    returns: "{ discount_id: string; amount_cents: number }[]",
  },
  create_return: {
    args: "{ p_order_id: string; p_reason: string; p_items: Json }",
    returns: "string",
  },
  decide_return: {
    args: "{ p_return_id: string; p_approve: boolean; p_note: string }",
    returns: "undefined",
  },
  refund_return: {
    args: "{ p_return_id: string; p_restock: boolean }",
    returns: "string",
  },
  accept_invitation: {
    args: "{ p_token_hash: string }",
    returns: "string",
  },
};

out += `    }\n    Functions: {\n`;
for (const [name, signature] of Object.entries(functionSignatures).sort()) {
  out += `      ${name}: {\n        Args: ${signature.args}\n        Returns: ${signature.returns}\n      }\n`;
}
out += `    }\n    Enums: {\n`;
for (const [name, values] of [...enumMap.entries()].sort()) {
  out += `      ${name}: ${values.map((v) => JSON.stringify(v)).join(" | ")}\n`;
}
out += `    }\n    CompositeTypes: Record<string, never>\n  }\n}\n`;

writeFileSync(join(process.cwd(), "src", "types", "database.ts"), out);
console.log("wrote src/types/database.ts with", tables.size, "tables,", views.rows.length, "views,", enumMap.size, "enums");
await db.close();
