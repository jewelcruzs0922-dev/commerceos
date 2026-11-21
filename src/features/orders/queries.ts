import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOffset, sanitizeSearch } from "@/lib/list-params";
import type { Database, Json } from "@/types/database";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type RefundRow = Database["public"]["Tables"]["refunds"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

export type OrderListRow = {
  id: string;
  orderNumber: string;
  email: string;
  customerName: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalCents: number;
  placedAt: string;
  itemCount: number;
};

export type OrderDetail = {
  order: OrderRow;
  customerName: string | null;
  items: OrderItemRow[];
  payments: PaymentRow[];
  refunds: RefundRow[];
  timeline: ActivityRow[];
};

export type OrderCustomerOption = {
  id: string;
  name: string;
  email: string;
};

export type OrderVariantOption = {
  id: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  priceCents: number;
  available: number;
};

export type OrderFormOptions = {
  customers: OrderCustomerOption[];
  variants: OrderVariantOption[];
};

export type OrderSort = "newest" | "oldest" | "total_desc" | "total_asc";

export type OrderFilters = {
  search: string;
  status: OrderStatus | null;
  payment: PaymentStatus | null;
  fulfillment: FulfillmentStatus | null;
};

const SORT_MAP = {
  newest: { column: "placed_at", ascending: false },
  oldest: { column: "placed_at", ascending: true },
  total_desc: { column: "total_cents", ascending: false },
  total_asc: { column: "total_cents", ascending: true },
} as const;

async function findCustomerIds(storeId: string, search: string) {
  if (!search) {
    return [];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    .limit(100);
  return (data ?? []).map((row) => row.id);
}

export async function listOrders(query: {
  storeId: string;
  filters: OrderFilters;
  sort: OrderSort;
  page: number;
  pageSize: number;
}): Promise<{ rows: OrderListRow[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.filters.search);
  const customerIds = await findCustomerIds(query.storeId, search);

  let builder = supabase
    .from("orders")
    .select(
      "id, order_number, email, customer_id, status, payment_status, fulfillment_status, total_cents, placed_at",
      { count: "exact" }
    )
    .eq("store_id", query.storeId);

  if (query.filters.status) {
    builder = builder.eq("status", query.filters.status);
  }
  if (query.filters.payment) {
    builder = builder.eq("payment_status", query.filters.payment);
  }
  if (query.filters.fulfillment) {
    builder = builder.eq("fulfillment_status", query.filters.fulfillment);
  }
  if (search) {
    const conditions = [
      `order_number.ilike.%${search}%`,
      `email.ilike.%${search}%`,
    ];
    if (customerIds.length > 0) {
      conditions.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    builder = builder.or(conditions.join(","));
  }

  const sort = SORT_MAP[query.sort];
  const offset = getOffset(query.page, query.pageSize);
  const { data, error, count } = await builder
    .order(sort.column, { ascending: sort.ascending })
    .range(offset, offset + query.pageSize - 1);

  if (error) {
    throw new Error("Could not load orders");
  }

  const orders = data ?? [];
  if (orders.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const orderIds = orders.map((order) => order.id);
  const customerIdsForRows = [
    ...new Set(
      orders
        .map((order) => order.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [{ data: customers }, { data: items }] = await Promise.all([
    customerIdsForRows.length > 0
      ? supabase
          .from("customers")
          .select("id, name")
          .eq("store_id", query.storeId)
          .in("id", customerIdsForRows)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    supabase
      .from("order_items")
      .select("order_id, quantity")
      .eq("store_id", query.storeId)
      .in("order_id", orderIds),
  ]);

  const customerNames = new Map(
    (customers ?? []).map((customer) => [customer.id, customer.name])
  );
  const itemCounts = new Map<string, number>();
  for (const item of items ?? []) {
    itemCounts.set(
      item.order_id,
      (itemCounts.get(item.order_id) ?? 0) + item.quantity
    );
  }

  return {
    total: count ?? orders.length,
    rows: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      email: order.email,
      customerName: order.customer_id
        ? customerNames.get(order.customer_id) ?? null
        : null,
      status: order.status,
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.fulfillment_status,
      totalCents: order.total_cents,
      placedAt: order.placed_at,
      itemCount: itemCounts.get(order.id) ?? 0,
    })),
  };
}

export async function listOrdersForExport(query: {
  storeId: string;
  filters: OrderFilters;
}): Promise<OrderListRow[]> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.filters.search);
  const customerIds = await findCustomerIds(query.storeId, search);

  let builder = supabase
    .from("orders")
    .select(
      "id, order_number, email, customer_id, status, payment_status, fulfillment_status, total_cents, placed_at"
    )
    .eq("store_id", query.storeId);

  if (query.filters.status) {
    builder = builder.eq("status", query.filters.status);
  }
  if (query.filters.payment) {
    builder = builder.eq("payment_status", query.filters.payment);
  }
  if (query.filters.fulfillment) {
    builder = builder.eq("fulfillment_status", query.filters.fulfillment);
  }
  if (search) {
    const conditions = [
      `order_number.ilike.%${search}%`,
      `email.ilike.%${search}%`,
    ];
    if (customerIds.length > 0) {
      conditions.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    builder = builder.or(conditions.join(","));
  }

  const { data, error } = await builder
    .order("placed_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error("Could not export orders");
  }

  const orders = data ?? [];
  const customerIdsForRows = [
    ...new Set(
      orders
        .map((order) => order.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: customers } =
    customerIdsForRows.length > 0
      ? await supabase
          .from("customers")
          .select("id, name")
          .eq("store_id", query.storeId)
          .in("id", customerIdsForRows)
      : { data: [] as Array<{ id: string; name: string }> };

  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, quantity")
    .eq("store_id", query.storeId)
    .in(
      "order_id",
      orders.map((order) => order.id)
    );

  const customerNames = new Map(
    (customers ?? []).map((customer) => [customer.id, customer.name])
  );
  const itemCounts = new Map<string, number>();
  for (const item of items ?? []) {
    itemCounts.set(
      item.order_id,
      (itemCounts.get(item.order_id) ?? 0) + item.quantity
    );
  }

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    email: order.email,
    customerName: order.customer_id
      ? customerNames.get(order.customer_id) ?? null
      : null,
    status: order.status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    totalCents: order.total_cents,
    placedAt: order.placed_at,
    itemCount: itemCounts.get(order.id) ?? 0,
  }));
}

export async function getOrderFormOptions(
  storeId: string
): Promise<OrderFormOptions> {
  const supabase = await createClient();

  const [{ data: customers }, { data: variants }, { data: inventory }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, email")
        .eq("store_id", storeId)
        .order("name", { ascending: true })
        .limit(500),
      supabase
        .from("product_variants")
        .select("id, product_id, title, sku, price_cents")
        .eq("store_id", storeId)
        .order("sku", { ascending: true }),
      supabase
        .from("inventory")
        .select("variant_id, on_hand, reserved")
        .eq("store_id", storeId),
    ]);

  const productIds = [
    ...new Set((variants ?? []).map((variant) => variant.product_id)),
  ];
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, title, status")
          .eq("store_id", storeId)
          .eq("status", "active")
          .in("id", productIds)
      : { data: [] as Array<{ id: string; title: string; status: string }> };

  const activeProducts = new Map(
    (products ?? []).map((product) => [product.id, product.title])
  );
  const stock = new Map(
    (inventory ?? []).map((row) => [
      row.variant_id,
      row.on_hand - row.reserved,
    ])
  );

  return {
    customers: (customers ?? []).map((customer) => ({
      id: customer.id,
      name: customer.name || "Unnamed customer",
      email: customer.email,
    })),
    variants: (variants ?? [])
      .filter((variant) => activeProducts.has(variant.product_id))
      .map((variant) => ({
        id: variant.id,
        productTitle: activeProducts.get(variant.product_id) ?? "Product",
        variantTitle: variant.title || "Default",
        sku: variant.sku,
        priceCents: variant.price_cents,
        available: stock.get(variant.id) ?? 0,
      }))
      .filter((variant) => variant.available > 0),
  };
}

export async function getOrderDetail(
  storeId: string,
  orderId: string
): Promise<OrderDetail | null> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the order");
  }

  if (!order) {
    return null;
  }

  const [{ data: items }, { data: payments }, { data: refunds }, { data: timeline }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select("*")
        .eq("store_id", storeId)
        .eq("order_id", orderId),
      supabase
        .from("payments")
        .select("*")
        .eq("store_id", storeId)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("refunds")
        .select("*")
        .eq("store_id", storeId)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("store_id", storeId)
        .eq("entity_type", "order")
        .eq("entity_id", orderId)
        .order("created_at", { ascending: false }),
    ]);

  let customerName: string | null = null;
  if (order.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("store_id", storeId)
      .eq("id", order.customer_id)
      .maybeSingle();
    customerName = customer?.name ?? null;
  }

  return {
    order,
    customerName,
    items: items ?? [],
    payments: payments ?? [],
    refunds: refunds ?? [],
    timeline: timeline ?? [],
  };
}

export function readAddress(value: Json): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.trim()) {
      result[key] = entry;
    }
  }
  return result;
}
