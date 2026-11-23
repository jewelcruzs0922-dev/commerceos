import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOffset, sanitizeSearch } from "@/lib/list-params";
import type { Database } from "@/types/database";

type ReturnRow = Database["public"]["Tables"]["returns"]["Row"];
type ReturnStatus = Database["public"]["Enums"]["return_status"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type RefundRow = Database["public"]["Tables"]["refunds"]["Row"];

export type ReturnListRow = {
  id: string;
  status: ReturnStatus;
  reason: string;
  createdAt: string;
  orderNumber: string;
  customerName: string | null;
  itemCount: number;
  refundCents: number;
};

export type ReturnDetail = {
  ret: ReturnRow;
  order: {
    id: string;
    orderNumber: string;
    email: string;
    status: Database["public"]["Tables"]["orders"]["Row"]["status"];
    totalCents: number;
  };
  customerName: string | null;
  items: Array<{
    id: string;
    quantity: number;
    refundCents: number;
    restock: boolean;
    orderItem: OrderItemRow;
  }>;
  refunds: RefundRow[];
};

export async function listReturns(query: {
  storeId: string;
  search: string;
  status: ReturnStatus | null;
  sort: "newest" | "oldest";
  page: number;
  pageSize: number;
}): Promise<{ rows: ReturnListRow[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.search);

  let orderIds: string[] | null = null;
  if (search) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("store_id", query.storeId)
      .or(`order_number.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(100);

    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", query.storeId)
      .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(100);

    const customerIds = (customers ?? []).map((customer) => customer.id);
    let customerOrderIds: string[] = [];
    if (customerIds.length > 0) {
      const { data: customerOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("store_id", query.storeId)
        .in("customer_id", customerIds)
        .limit(100);
      customerOrderIds = (customerOrders ?? []).map((order) => order.id);
    }

    orderIds = [
      ...new Set([
        ...(orders ?? []).map((order) => order.id),
        ...customerOrderIds,
      ]),
    ];

    if (orderIds.length === 0) {
      return { rows: [], total: 0 };
    }
  }

  let builder = supabase
    .from("returns")
    .select("*", { count: "exact" })
    .eq("store_id", query.storeId);

  if (query.status) {
    builder = builder.eq("status", query.status);
  }
  if (orderIds) {
    builder = builder.in("order_id", orderIds);
  }

  const offset = getOffset(query.page, query.pageSize);
  const { data, error, count } = await builder
    .order("created_at", {
      ascending: query.sort === "oldest",
    })
    .range(offset, offset + query.pageSize - 1);

  if (error) {
    throw new Error("Could not load returns");
  }

  const returns = data ?? [];
  if (returns.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const [{ data: orders }, { data: items }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_id")
      .eq("store_id", query.storeId)
      .in(
        "id",
        returns.map((ret) => ret.order_id)
      ),
    supabase
      .from("return_items")
      .select("return_id, quantity, refund_cents")
      .eq("store_id", query.storeId)
      .in(
        "return_id",
        returns.map((ret) => ret.id)
      ),
  ]);

  const orderMap = new Map((orders ?? []).map((order) => [order.id, order]));
  const customerIds = [
    ...new Set(
      (orders ?? [])
        .map((order) => order.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const { data: customers } =
    customerIds.length > 0
      ? await supabase
          .from("customers")
          .select("id, name")
          .eq("store_id", query.storeId)
          .in("id", customerIds)
      : { data: [] as Array<{ id: string; name: string }> };
  const customerNames = new Map(
    (customers ?? []).map((customer) => [customer.id, customer.name])
  );

  const itemStats = new Map<string, { count: number; refund: number }>();
  for (const item of items ?? []) {
    const current = itemStats.get(item.return_id) ?? { count: 0, refund: 0 };
    current.count += item.quantity;
    current.refund += item.refund_cents;
    itemStats.set(item.return_id, current);
  }

  return {
    total: count ?? returns.length,
    rows: returns.map((ret) => {
      const order = orderMap.get(ret.order_id);
      const customerId = order?.customer_id;
      const stats = itemStats.get(ret.id) ?? { count: 0, refund: 0 };
      return {
        id: ret.id,
        status: ret.status,
        reason: ret.reason,
        createdAt: ret.created_at,
        orderNumber: order?.order_number ?? "—",
        customerName: customerId ? customerNames.get(customerId) ?? null : null,
        itemCount: stats.count,
        refundCents: stats.refund,
      };
    }),
  };
}

export async function countReturns(query: {
  storeId: string;
  status: ReturnStatus;
}): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("returns")
    .select("id", { count: "exact", head: true })
    .eq("store_id", query.storeId)
    .eq("status", query.status);

  if (error) {
    throw new Error("Could not count returns");
  }

  return count ?? 0;
}

export async function getReturnDetail(
  storeId: string,
  returnId: string
): Promise<ReturnDetail | null> {
  const supabase = await createClient();

  const { data: ret, error } = await supabase
    .from("returns")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", returnId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the return");
  }

  if (!ret) {
    return null;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, email, status, total_cents, customer_id")
    .eq("store_id", storeId)
    .eq("id", ret.order_id)
    .maybeSingle();

  if (!order) {
    throw new Error("Could not load the return order");
  }

  const { data: returnItems } = await supabase
    .from("return_items")
    .select("*")
    .eq("store_id", storeId)
    .eq("return_id", returnId);

  const orderItemIds = (returnItems ?? []).map((item) => item.order_item_id);
  const { data: orderItems } =
    orderItemIds.length > 0
      ? await supabase
          .from("order_items")
          .select("*")
          .eq("store_id", storeId)
          .in("id", orderItemIds)
      : { data: [] as OrderItemRow[] };

  const { data: refunds } = await supabase
    .from("refunds")
    .select("*")
    .eq("store_id", storeId)
    .eq("order_id", ret.order_id)
    .order("created_at", { ascending: false });

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

  const orderItemMap = new Map(
    (orderItems ?? []).map((item) => [item.id, item])
  );

  return {
    ret,
    order: {
      id: order.id,
      orderNumber: order.order_number,
      email: order.email,
      status: order.status,
      totalCents: order.total_cents,
    },
    customerName,
    items: (returnItems ?? []).flatMap((item) => {
      const orderItem = orderItemMap.get(item.order_item_id);
      return orderItem
        ? [
            {
              id: item.id,
              quantity: item.quantity,
              refundCents: item.refund_cents,
              restock: item.restock,
              orderItem,
            },
          ]
        : [];
    }),
    refunds: refunds ?? [],
  };
}
