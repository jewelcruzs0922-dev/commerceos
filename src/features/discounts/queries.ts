import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/list-params";
import type { Database } from "@/types/database";

type DiscountRow = Database["public"]["Tables"]["discounts"]["Row"];
type UsageRow = Database["public"]["Tables"]["discount_usages"]["Row"];

export type DiscountStatus = "active" | "scheduled" | "expired" | "disabled";

export type DiscountSummary = DiscountRow & { status: DiscountStatus };

export type DiscountUsage = UsageRow & {
  orderNumber: string | null;
  customerName: string | null;
};

export function discountStatus(
  discount: Pick<DiscountRow, "is_active" | "starts_at" | "ends_at">,
  now = new Date()
): DiscountStatus {
  if (!discount.is_active) {
    return "disabled";
  }
  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return "scheduled";
  }
  if (discount.ends_at && new Date(discount.ends_at) <= now) {
    return "expired";
  }
  return "active";
}

export async function listDiscounts(query: {
  storeId: string;
  search: string;
  status: DiscountStatus | null;
  sort: "newest" | "code" | "usage";
  page: number;
  pageSize: number;
}): Promise<{ rows: DiscountSummary[]; total: number }> {
  const supabase = await createClient();
  const search = sanitizeSearch(query.search);

  let builder = supabase
    .from("discounts")
    .select("*")
    .eq("store_id", query.storeId);

  if (search) {
    builder = builder.ilike("code", `%${search}%`);
  }

  const { data, error } = await builder.limit(500);

  if (error) {
    throw new Error("Could not load discounts");
  }

  const now = new Date();
  let rows = (data ?? []).map((discount) => ({
    ...discount,
    status: discountStatus(discount, now),
  }));

  if (query.status) {
    rows = rows.filter((discount) => discount.status === query.status);
  }

  rows.sort((a, b) => {
    if (query.sort === "code") {
      return a.code.localeCompare(b.code);
    }
    if (query.sort === "usage") {
      return b.usage_count - a.usage_count;
    }
    return b.created_at.localeCompare(a.created_at);
  });

  const total = rows.length;
  const offset = (query.page - 1) * query.pageSize;

  return {
    total,
    rows: rows.slice(offset, offset + query.pageSize),
  };
}

export async function getDiscount(
  storeId: string,
  discountId: string
): Promise<{ discount: DiscountSummary; usages: DiscountUsage[] } | null> {
  const supabase = await createClient();

  const { data: discount, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", discountId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the discount");
  }

  if (!discount) {
    return null;
  }

  const { data: usages } = await supabase
    .from("discount_usages")
    .select("*")
    .eq("store_id", storeId)
    .eq("discount_id", discountId)
    .order("created_at", { ascending: false })
    .limit(100);

  const orderIds = [...new Set((usages ?? []).map((usage) => usage.order_id))];
  const customerIds = [
    ...new Set(
      (usages ?? [])
        .map((usage) => usage.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [{ data: orders }, { data: customers }] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from("orders")
          .select("id, order_number")
          .eq("store_id", storeId)
          .in("id", orderIds)
      : Promise.resolve({ data: [] as Array<{ id: string; order_number: string }> }),
    customerIds.length > 0
      ? supabase
          .from("customers")
          .select("id, name")
          .eq("store_id", storeId)
          .in("id", customerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const orderNumbers = new Map(
    (orders ?? []).map((order) => [order.id, order.order_number])
  );
  const customerNames = new Map(
    (customers ?? []).map((customer) => [customer.id, customer.name])
  );

  return {
    discount: { ...discount, status: discountStatus(discount) },
    usages: (usages ?? []).map((usage) => ({
      ...usage,
      orderNumber: orderNumbers.get(usage.order_id) ?? null,
      customerName: usage.customer_id
        ? customerNames.get(usage.customer_id) ?? null
        : null,
    })),
  };
}
