import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getOffset, sanitizeSearch } from "@/lib/list-params";
import type { Database } from "@/types/database";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type AddressRow = Database["public"]["Tables"]["customer_addresses"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  spendCents: number;
  averageOrderCents: number;
  classification: "new" | "returning" | "none";
  lastOrderAt: string | null;
};

export type CustomerDetail = {
  customer: CustomerRow;
  addresses: AddressRow[];
  orders: OrderRow[];
  summary: Omit<CustomerSummary, "id" | "name" | "email" | "phone" | "createdAt">;
};

export type CustomerSort = "newest" | "name" | "oldest";

const NEW_CUSTOMER_DAYS = 30;

function summarizeOrders(orders: OrderRow[]) {
  const active = orders.filter((order) => order.status !== "cancelled");
  const spendCents = active.reduce(
    (sum, order) => sum + order.total_cents,
    0
  );
  const placed = active
    .map((order) => order.placed_at)
    .sort((a, b) => a.localeCompare(b));
  const firstOrderAt = placed[0] ?? null;
  const lastOrderAt = placed.at(-1) ?? null;

  let classification: CustomerSummary["classification"] = "none";
  if (firstOrderAt) {
    const ageDays =
      (Date.now() - new Date(firstOrderAt).getTime()) / 86_400_000;
    classification = ageDays <= NEW_CUSTOMER_DAYS ? "new" : "returning";
  }

  return {
    orderCount: active.length,
    spendCents,
    averageOrderCents: active.length > 0 ? Math.round(spendCents / active.length) : 0,
    classification,
    lastOrderAt,
  };
}

export async function listCustomers(query: {
  storeId: string;
  search: string;
  sort: CustomerSort;
  page: number;
  pageSize: number;
}): Promise<{ rows: CustomerSummary[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.search);

  let builder = supabase
    .from("customers")
    .select("id, name, email, phone, created_at", { count: "exact" })
    .eq("store_id", query.storeId);

  if (search) {
    builder = builder.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const order =
    query.sort === "name"
      ? { column: "name", ascending: true }
      : query.sort === "oldest"
        ? { column: "created_at", ascending: true }
        : { column: "created_at", ascending: false };

  const offset = getOffset(query.page, query.pageSize);
  const { data, error, count } = await builder
    .order(order.column, { ascending: order.ascending })
    .range(offset, offset + query.pageSize - 1);

  if (error) {
    throw new Error("Could not load customers");
  }

  const customers = data ?? [];
  if (customers.length === 0) {
    return { rows: [], total: count ?? 0 };
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("customer_id, status, total_cents, placed_at")
    .eq("store_id", query.storeId)
    .in(
      "customer_id",
      customers.map((customer) => customer.id)
    );

  const ordersByCustomer = new Map<string, OrderRow[]>();
  for (const order of orders ?? []) {
    if (!order.customer_id) {
      continue;
    }
    const list = ordersByCustomer.get(order.customer_id) ?? [];
    list.push(order as OrderRow);
    ordersByCustomer.set(order.customer_id, list);
  }

  return {
    total: count ?? customers.length,
    rows: customers.map((customer) => {
      const summary = summarizeOrders(
        ordersByCustomer.get(customer.id) ?? []
      );
      return {
        id: customer.id,
        name: customer.name || "Unnamed customer",
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.created_at,
        ...summary,
      };
    }),
  };
}

export async function getCustomerDetail(
  storeId: string,
  customerId: string
): Promise<CustomerDetail | null> {
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the customer");
  }

  if (!customer) {
    return null;
  }

  const [{ data: addresses }, { data: orders }] = await Promise.all([
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("placed_at", { ascending: false })
      .limit(500),
  ]);

  return {
    customer,
    addresses: addresses ?? [],
    orders: (orders ?? []).slice(0, 50),
    summary: summarizeOrders(orders ?? []),
  };
}
