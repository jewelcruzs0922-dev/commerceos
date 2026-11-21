import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/format";
import { sanitizeSearch } from "@/lib/list-params";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listOrdersForExport } from "@/features/orders/queries";

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z.enum(["pending", "processing", "fulfilled", "cancelled"]).optional().catch(undefined),
  payment: z
    .enum([
      "pending",
      "authorized",
      "paid",
      "partially_refunded",
      "refunded",
      "voided",
    ])
    .optional().catch(undefined),
  fulfillment: z
    .enum(["unfulfilled", "partially_fulfilled", "fulfilled", "cancelled"])
    .optional().catch(undefined),
});

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "The data layer is not configured." },
      { status: 503 }
    );
  }

  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!context.membership) {
    return NextResponse.json({ error: "No active store." }, { status: 403 });
  }

  if (!can(context.membership.role, "orders:read")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsed = querySchema.parse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    payment: request.nextUrl.searchParams.get("payment") ?? undefined,
    fulfillment:
      request.nextUrl.searchParams.get("fulfillment") ?? undefined,
  });

  const rows = await listOrdersForExport({
    storeId: context.membership.storeId,
    filters: {
      search: sanitizeSearch(parsed.q),
      status: parsed.status ?? null,
      payment: parsed.payment ?? null,
      fulfillment: parsed.fulfillment ?? null,
    },
  });

  const csv = toCsv(
    [
      "Order",
      "Placed at",
      "Order status",
      "Payment",
      "Fulfillment",
      "Customer",
      "Email",
      "Items",
      "Total (USD)",
    ],
    rows.map((order) => [
      order.orderNumber,
      order.placedAt,
      order.status,
      order.paymentStatus,
      order.fulfillmentStatus,
      order.customerName ?? "",
      order.email,
      order.itemCount,
      formatMoney(order.totalCents).replace(/[$,]/g, ""),
    ])
  );

  const filename = `commerceos-orders-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
