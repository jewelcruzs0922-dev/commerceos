import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOffset, sanitizeSearch } from "@/lib/list-params";
import type { Database } from "@/types/database";

type InventoryViewRow =
  Database["public"]["Views"]["inventory_overview"]["Row"];
type MovementRow = Database["public"]["Tables"]["inventory_movements"]["Row"];

export type InventoryItem = {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  threshold: number;
  isLowStock: boolean;
  updatedAt: string;
};

export type InventorySort = "product" | "available_asc" | "available_desc" | "updated";

const SORT_MAP = {
  product: { column: "product_title", ascending: true },
  available_asc: { column: "available", ascending: true },
  available_desc: { column: "available", ascending: false },
  updated: { column: "updated_at", ascending: false },
} as const;

function mapRow(row: InventoryViewRow): InventoryItem {
  return {
    variantId: row.variant_id ?? "",
    productId: row.product_id ?? "",
    productTitle: row.product_title ?? "Unknown product",
    variantTitle: row.variant_title ?? "Default",
    sku: row.sku ?? "",
    onHand: row.on_hand ?? 0,
    reserved: row.reserved ?? 0,
    available: row.available ?? 0,
    threshold: row.low_stock_threshold ?? 0,
    isLowStock: Boolean(row.is_low_stock),
    updatedAt: row.updated_at ?? "",
  };
}

export async function listInventory(query: {
  storeId: string;
  search: string;
  lowOnly: boolean;
  sort: InventorySort;
  page: number;
  pageSize: number;
}): Promise<{ rows: InventoryItem[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.search);

  let builder = supabase
    .from("inventory_overview")
    .select("*", { count: "exact" })
    .eq("store_id", query.storeId);

  if (query.lowOnly) {
    builder = builder.eq("is_low_stock", true);
  }

  if (search) {
    builder = builder.or(
      `product_title.ilike.%${search}%,variant_title.ilike.%${search}%,sku.ilike.%${search}%`
    );
  }

  const sort = SORT_MAP[query.sort];
  const offset = getOffset(query.page, query.pageSize);
  const { data, error, count } = await builder
    .order(sort.column, { ascending: sort.ascending })
    .range(offset, offset + query.pageSize - 1);

  if (error) {
    throw new Error("Could not load inventory");
  }

  return {
    rows: (data ?? []).map(mapRow),
    total: count ?? 0,
  };
}

export async function getInventoryItem(
  storeId: string,
  variantId: string
): Promise<{ item: InventoryItem; movements: MovementRow[] } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_overview")
    .select("*")
    .eq("store_id", storeId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the inventory record");
  }

  if (!data) {
    return null;
  }

  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("store_id", storeId)
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(100);

  return { item: mapRow(data), movements: movements ?? [] };
}

export async function countInventory(storeId: string) {
  const supabase = await createClient();
  const [{ count: total }, { count: low }] = await Promise.all([
    supabase
      .from("inventory_overview")
      .select("variant_id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("inventory_overview")
      .select("variant_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_low_stock", true),
  ]);

  return { total: total ?? 0, low: low ?? 0 };
}
