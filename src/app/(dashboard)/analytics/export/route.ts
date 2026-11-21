import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveRange } from "@/features/analytics/lib";
import { getAnalytics } from "@/features/analytics/queries";

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

  if (!can(context.membership.role, "analytics:read")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const range = resolveRange(
    {
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    },
    context.membership.storeTimezone
  );

  const result = await getAnalytics({
    storeId: context.membership.storeId,
    timeZone: context.membership.storeTimezone,
    range,
  });

  const dollars = (cents: number) => (cents / 100).toFixed(2);
  const csv = toCsv(
    ["Date", "Gross sales (USD)", "Refunds (USD)", "Net sales (USD)", "Orders"],
    result.daily.map((point) => [
      point.date,
      dollars(point.grossCents),
      dollars(point.refundsCents),
      dollars(point.netCents),
      point.orders,
    ])
  );

  const filename = `commerceos-analytics-${range.from}-to-${range.to}.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
