import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  computeTotals,
  groupDaily,
  type AnalyticsRange,
  type AnalyticsTotals,
  type DailyPoint,
  type OrderMetricRow,
  type RefundMetricRow,
} from "@/features/analytics/lib";

export type ProductPerformance = {
  title: string;
  productType: string;
  quantity: number;
  revenueCents: number;
};

export type ReconciliationSummary = {
  ordersChecked: number;
  orderIssues: number;
  variantsChecked: number;
  inventoryIssues: number;
};

export async function getReconciliationSummary(
  storeId: string
): Promise<ReconciliationSummary> {
  const supabase = await createClient();

  const [{ data: orders, error: orderError }, { data: inventory }] =
    await Promise.all([
      supabase
        .from("order_reconciliation")
        .select(
          "order_id, subtotal_matches, refunds_within_total, fulfillment_matches"
        )
        .eq("store_id", storeId)
        .limit(5000),
      supabase
        .from("inventory_reconciliation")
        .select("variant_id, matches")
        .eq("store_id", storeId)
        .limit(5000),
    ]);

  if (orderError) {
    throw new Error("Could not load reconciliation checks");
  }

  const orderRows = orders ?? [];
  const inventoryRows = inventory ?? [];

  return {
    ordersChecked: orderRows.length,
    orderIssues: orderRows.filter(
      (row) =>
        !row.subtotal_matches ||
        !row.refunds_within_total ||
        !row.fulfillment_matches
    ).length,
    variantsChecked: inventoryRows.length,
    inventoryIssues: inventoryRows.filter((row) => !row.matches).length,
  };
}

export type AnalyticsResult = {
  range: AnalyticsRange;
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  daily: DailyPoint[];
  topProducts: ProductPerformance[];
  topCategories: Array<{
    productType: string;
    quantity: number;
    revenueCents: number;
  }>;
  hasOrders: boolean;
};

export async function getAnalytics(input: {
  storeId: string;
  timeZone: string;
  range: AnalyticsRange;
}): Promise<AnalyticsResult> {
  const supabase = await createClient();
  const { storeId, range } = input;

  const [
    { data: currentOrders, error: currentOrderError },
    { data: currentRefunds },
    { data: previousOrders },
    { data: previousRefunds },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_cents, status, placed_at, customer_id")
      .eq("store_id", storeId)
      .gte("placed_at", range.startUtc)
      .lt("placed_at", range.endUtc)
      .limit(10000),
    supabase
      .from("refunds")
      .select("amount_cents, status, created_at")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", range.startUtc)
      .lt("created_at", range.endUtc)
      .limit(10000),
    supabase
      .from("orders")
      .select("id, total_cents, status, placed_at, customer_id")
      .eq("store_id", storeId)
      .gte("placed_at", range.priorStartUtc)
      .lt("placed_at", range.priorEndUtc)
      .limit(10000),
    supabase
      .from("refunds")
      .select("amount_cents, status, created_at")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", range.priorStartUtc)
      .lt("created_at", range.priorEndUtc)
      .limit(10000),
  ]);

  if (currentOrderError) {
    throw new Error("Could not load analytics");
  }

  const orders = (currentOrders ?? []) as OrderMetricRow[];
  const refunds = (currentRefunds ?? []) as RefundMetricRow[];
  const previousOrderRows = (previousOrders ?? []) as OrderMetricRow[];
  const previousRefundRows = (previousRefunds ?? []) as RefundMetricRow[];

  const activeOrderIds = orders
    .filter((order) => order.status !== "cancelled")
    .map((order) => order.id);

  const items: Array<{
    product_title: string;
    product_type: string;
    quantity: number;
    total_cents: number;
  }> = [];

  for (let index = 0; index < activeOrderIds.length; index += 200) {
    const chunk = activeOrderIds.slice(index, index + 200);
    const { data } = await supabase
      .from("order_items")
      .select("product_title, product_type, quantity, total_cents")
      .eq("store_id", storeId)
      .in("order_id", chunk);
    items.push(...(data ?? []));
  }

  const productMap = new Map<string, ProductPerformance>();
  const categoryMap = new Map<
    string,
    { productType: string; quantity: number; revenueCents: number }
  >();

  for (const item of items) {
    const type = item.product_type?.trim() || "Uncategorized";
    const productKey = `${item.product_title}::${type}`;
    const product = productMap.get(productKey) ?? {
      title: item.product_title,
      productType: type,
      quantity: 0,
      revenueCents: 0,
    };
    product.quantity += item.quantity;
    product.revenueCents += item.total_cents;
    productMap.set(productKey, product);

    const category = categoryMap.get(type) ?? {
      productType: type,
      quantity: 0,
      revenueCents: 0,
    };
    category.quantity += item.quantity;
    category.revenueCents += item.total_cents;
    categoryMap.set(type, category);
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 8);

  const topCategories = [...categoryMap.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 6);

  return {
    range,
    current: computeTotals(orders, refunds),
    previous: computeTotals(previousOrderRows, previousRefundRows),
    daily: groupDaily(orders, refunds, range.days, input.timeZone),
    topProducts,
    topCategories,
    hasOrders: orders.some((order) => order.status !== "cancelled"),
  };
}
