import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOffset, sanitizeSearch } from "@/lib/list-params";
import type { Database } from "@/types/database";

type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type ProductOption = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "title" | "status" | "slug"
>;

export type CollectionSummary = CollectionRow & { productCount: number };

export type CollectionDetail = {
  collection: CollectionRow;
  selectedProductIds: string[];
  products: ProductOption[];
};

export type CollectionSort = "newest" | "oldest" | "name";

export async function listCollections(query: {
  storeId: string;
  search: string;
  status: Database["public"]["Enums"]["collection_status"] | null;
  sort: CollectionSort;
  page: number;
  pageSize: number;
}): Promise<{ rows: CollectionSummary[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.search);

  let builder = supabase
    .from("collections")
    .select("*", { count: "exact" })
    .eq("store_id", query.storeId);

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  if (search) {
    builder = builder.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const order =
    query.sort === "name"
      ? { column: "title", ascending: true }
      : query.sort === "oldest"
        ? { column: "created_at", ascending: true }
        : { column: "created_at", ascending: false };

  const offset = getOffset(query.page, query.pageSize);
  const { data, error, count } = await builder
    .order(order.column, { ascending: order.ascending })
    .range(offset, offset + query.pageSize - 1);

  if (error) {
    throw new Error("Could not load collections");
  }

  const collections = data ?? [];
  if (collections.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const { data: links } = await supabase
    .from("collection_products")
    .select("collection_id")
    .eq("store_id", query.storeId)
    .in(
      "collection_id",
      collections.map((collection) => collection.id)
    );

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    counts.set(link.collection_id, (counts.get(link.collection_id) ?? 0) + 1);
  }

  return {
    total: count ?? collections.length,
    rows: collections.map((collection) => ({
      ...collection,
      productCount: counts.get(collection.id) ?? 0,
    })),
  };
}

export async function getCollectionDetail(
  storeId: string,
  collectionId: string
): Promise<CollectionDetail | null> {
  const supabase = await createClient();

  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", collectionId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the collection");
  }

  if (!collection) {
    return null;
  }

  const [{ data: links }, { data: products }] = await Promise.all([
    supabase
      .from("collection_products")
      .select("product_id")
      .eq("store_id", storeId)
      .eq("collection_id", collectionId),
    supabase
      .from("products")
      .select("id, title, status, slug")
      .eq("store_id", storeId)
      .order("title", { ascending: true })
      .limit(500),
  ]);

  return {
    collection,
    selectedProductIds: (links ?? []).map((link) => link.product_id),
    products: products ?? [],
  };
}

export async function listProductOptions(
  storeId: string
): Promise<ProductOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, status, slug")
    .eq("store_id", storeId)
    .order("title", { ascending: true })
    .limit(500);
  return data ?? [];
}
