import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import { DownloadIcon } from "lucide-react";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { resolveRange } from "@/features/analytics/lib";
import {
  getAnalytics,
  getReconciliationSummary,
} from "@/features/analytics/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatMoney, formatNumber } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Reports"
        description="Operational report views with documented definitions and CSV export."
      />
    );
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "analytics:read")) {
    return <PermissionDenied />;
  }

  const base = resolveRange({}, context.membership.storeTimezone);
  const from = format(subDays(parseISO(base.to), 89), "yyyy-MM-dd");
  const range = resolveRange(
    { from, to: base.to },
    context.membership.storeTimezone
  );
  const result = await getAnalytics({
    storeId: context.membership.storeId,
    timeZone: context.membership.storeTimezone,
    range,
  });
  const reconciliation = await getReconciliationSummary(
    context.membership.storeId
  );
  const issueCount = reconciliation.orderIssues + reconciliation.inventoryIssues;
  const exportHref = `/analytics/export?from=${range.from}&to=${range.to}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Reports"
        description={`Live report views for the last 90 days (${range.label}). Definitions are documented and shared with Analytics.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={exportHref}>
              <DownloadIcon aria-hidden="true" />
              Export daily CSV
            </a>
          </Button>
        }
      />

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {[
          {
            label: "Net sales",
            value: formatMoney(result.current.netCents),
          },
          { label: "Orders", value: formatNumber(result.current.orders) },
          {
            label: "Refunds",
            value: formatMoney(result.current.refundsCents),
          },
        ].map((metric) => (
          <div key={metric.label} className="bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 font-mono text-[24px] leading-8 font-semibold tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Sales summary</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Gross sales, refunds, net sales, orders, customers, and average
            order value for the selected range with a prior-period comparison.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/analytics?from=${range.from}&to=${range.to}`}>
                Open analytics
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={exportHref}>CSV</a>
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Product performance</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Top products and categories by revenue using order-item snapshots.
            Grouped by product title and captured product type.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.topProducts.length === 0
              ? "No line items in this range."
              : `${result.topProducts.length} products · ${result.topCategories.length} categories`}
          </p>
          <div className="mt-auto">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/analytics?from=${range.from}&to=${range.to}`}>
                View report
              </Link>
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Refund activity</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Completed refunds created in range, regardless of the original
            order date. Refund totals cannot exceed the order total.
          </p>
          <p className="mt-1 font-mono text-sm">
            {formatMoney(result.current.refundsCents)}
          </p>
          <div className="mt-auto">
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders?payment=refunded">View refunded orders</Link>
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Report definitions</h2>
          <ul className="flex flex-col gap-1.5 text-xs leading-5 text-muted-foreground">
            <li>Net sales = non-cancelled order totals − completed refunds.</li>
            <li>Refunds are counted by refund date, not order date.</li>
            <li>Day boundaries use the store timezone.</li>
            <li>Ranges are capped at 366 days.</li>
          </ul>
        </section>
      </div>

      <section
        aria-labelledby="reconciliation-title"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="reconciliation-title" className="text-sm font-semibold">
              Data integrity
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Compares order line totals, refund caps, fulfillment counts, and
              reserved inventory against the recorded values.
            </p>
          </div>
          <StatusPill
            label={
              issueCount === 0
                ? "All checks pass"
                : `${formatNumber(issueCount)} issue${issueCount === 1 ? "" : "s"}`
            }
            tone={issueCount === 0 ? "success" : "danger"}
          />
        </div>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <dt className="text-muted-foreground">
              Orders checked · {formatNumber(reconciliation.ordersChecked)}
            </dt>
            <dd className="font-mono tabular-nums">
              {formatNumber(reconciliation.orderIssues)} flagged
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <dt className="text-muted-foreground">
              Variants checked · {formatNumber(reconciliation.variantsChecked)}
            </dt>
            <dd className="font-mono tabular-nums">
              {formatNumber(reconciliation.inventoryIssues)} flagged
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-xs leading-5 text-muted-foreground">
        These are live report views, not saved report definitions. Build a
        report from Analytics for custom ranges.
      </p>
    </div>
  );
}
