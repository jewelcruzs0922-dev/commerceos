import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOffset, sanitizeSearch } from "@/lib/list-params";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
type InventoryRow = Database["public"]["Tables"]["inventory"]["Row"];
type VariantPriceRow = Pick<
  VariantRow,
  "id" | "product_id" | "price_cents"
>;

export type ProductStatus = Database["public"]["Enums"]["product_status"];

export type ProductSummary = {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus;
  vendor: string | null;
  createdAt: string;
  variantCount: number;
  minPriceCents: number;
  totalOnHand: number;
  imageUrl: string | null;
};

export type ProductDetail = {
  product: ProductRow;
  variants: Array<VariantRow & { onHand: number; reserved: number }>;
  imageUrl: string | null;
  images: Array<{ id: string; storagePath: string; altText: string | null }>;
};

export type ProductListQuery = {
  storeId: string;
  search: string;
  status: ProductStatus | null;
  sort: "newest" | "oldest" | "name" | "status";
  page: number;
  pageSize: number;
};

const SORT_MAP = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  name: { column: "title", ascending: true },
  status: { column: "status", ascending: true },
} as const;

export async function listProducts(
  query: ProductListQuery
): Promise<{ rows: ProductSummary[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.search);

  let matchingProductIds: string[] = [];
  if (search) {
    const { data: skuMatches } = await supabase
      .from("product_variants")
      .select("product_id")
      .eq("store_id", query.storeId)
      .ilike("sku", `%${search}%`)
      .limit(100);

    matchingProductIds = [
      ...new Set((skuMatches ?? []).map((row) => row.product_id)),
    ];
  }

  let builder = supabase
    .from("products")
    .select("id, title, slug, status, vendor, created_at", {
      count: "exact",
    })
    .eq("store_id", query.storeId);

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  if (search) {
    const conditions = [
      `title.ilike.%${search}%`,
      `vendor.ilike.%${search}%`,
    ];
    if (matchingProductIds.length > 0) {
      conditions.push(`id.in.(${matchingProductIds.join(",")})`);
    }
    builder = builder.or(conditions.join(","));
  }

  const sort = SORT_MAP[query.sort];
  const offset = getOffset(query.page, query.pageSize);
  const { data: products, error, count } = await builder
    .order(sort.column, { ascending: sort.ascending })
    .range(offset, offset + query.pageSize - 1);

  if (error) {
    throw new Error("Could not load products");
  }

  const rows = products ?? [];
  if (rows.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const ids = rows.map((row) => row.id);

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, product_id, price_cents")
      .eq("store_id", query.storeId)
      .in("product_id", ids),
    supabase
      .from("product_images")
      .select("product_id, storage_path, position")
      .eq("store_id", query.storeId)
      .in("product_id", ids)
      .order("position", { ascending: true }),
  ]);

  const variantIds = (variants ?? []).map((variant) => variant.id);
  const { data: inventory } =
    variantIds.length > 0
      ? await supabase
          .from("inventory")
          .select("variant_id, on_hand")
          .in("variant_id", variantIds)
      : { data: [] as InventoryRow[] };

  const stockByVariant = new Map(
    (inventory ?? []).map((row) => [row.variant_id, row.on_hand])
  );
  const variantsByProduct = new Map<string, VariantPriceRow[]>();
  for (const variant of variants ?? []) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }

  const imageByProduct = new Map<string, string>();
  for (const image of images ?? []) {
    if (!imageByProduct.has(image.product_id)) {
      imageByProduct.set(image.product_id, image.storage_path);
    }
  }

  return {
    total: count ?? rows.length,
    rows: rows.map((row) => {
      const productVariants = variantsByProduct.get(row.id) ?? [];
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        vendor: row.vendor,
        createdAt: row.created_at,
        variantCount: productVariants.length,
        minPriceCents:
          productVariants.length > 0
            ? Math.min(...productVariants.map((variant) => variant.price_cents))
            : 0,
        totalOnHand: productVariants.reduce(
          (sum, variant) => sum + (stockByVariant.get(variant.id) ?? 0),
          0
        ),
        imageUrl: imageByProduct.get(row.id) ?? null,
      };
    }),
  };
}

export async function getProductDetail(
  storeId: string,
  productId: string
): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the product");
  }

  if (!product) {
    return null;
  }

  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("*")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .order("position", { ascending: true }),
    supabase
      .from("product_images")
      .select("id, storage_path, alt_text")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .order("position", { ascending: true }),
  ]);

  const variantIds = (variants ?? []).map((variant) => variant.id);
  const { data: inventory } =
    variantIds.length > 0
      ? await supabase
          .from("inventory")
          .select("variant_id, on_hand, reserved")
          .in("variant_id", variantIds)
      : {
          data: [] as Array<
            Pick<InventoryRow, "variant_id" | "on_hand" | "reserved">
          >,
        };

  const stock = new Map(
    (inventory ?? []).map((row) => [row.variant_id, row])
  );

  return {
    product,
    variants: (variants ?? []).map((variant) => ({
      ...variant,
      onHand: stock.get(variant.id)?.on_hand ?? 0,
      reserved: stock.get(variant.id)?.reserved ?? 0,
    })),
    imageUrl: images?.[0]?.storage_path ?? null,
    images: (images ?? []).map((image) => ({
      id: image.id,
      storagePath: image.storage_path,
      altText: image.alt_text,
    })),
  };
}
