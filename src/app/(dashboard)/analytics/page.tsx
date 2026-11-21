import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesChart } from "@/features/analytics/components/sales-chart";
import { percentDelta, resolveRange } from "@/features/analytics/lib";
import { getAnalytics } from "@/features/analytics/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatMoney, formatNumber } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Analytics",
};

function deltaText(delta: number | null): string {
  if (delta === null) {
    return "No prior data";
  }
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% vs prior period`;
}

function Metric({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: number | null;
}) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-mono text-[26px] leading-8 font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        {delta === null ? null : delta >= 0 ? (
          <TrendingUpIcon
            aria-hidden="true"
            className={`size-3 ${delta === 0 ? "text-muted-foreground" : "text-success"}`}
          />
        ) : (
          <TrendingDownIcon
            aria-hidden="true"
            className="size-3 text-danger"
          />
        )}
        {deltaText(delta)}
      </p>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Analytics"
        description="Revenue, orders, and product performance derived from store records."
      />
    );
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "analytics:read")) {
    return <PermissionDenied />;
  }

  const params = await searchParams;
  const range = resolveRange(
    {
      from: typeof params.from === "string" ? params.from : undefined,
      to: typeof params.to === "string" ? params.to : undefined,
    },
    context.membership.storeTimezone
  );

  const result = await getAnalytics({
    storeId: context.membership.storeId,
    timeZone: context.membership.storeTimezone,
    range,
  });

  const { current, previous } = result;
  const exportParams = new URLSearchParams({
    from: range.from,
    to: range.to,
  });

  const presets = [
    { label: "7 days", days: 6 },
    { label: "30 days", days: 29 },
    { label: "90 days", days: 89 },
  ].map((preset) => ({
    label: preset.label,
    from: format(subDays(parseISO(range.to), preset.days), "yyyy-MM-dd"),
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Analytics"
        description={`Net sales, orders, and product performance in ${context.membership.storeTimezone}. ${range.label}.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/analytics/export?${exportParams.toString()}`}>
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </a>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <form
          method="get"
          className="flex flex-wrap items-end gap-2"
          aria-label="Analytics date range"
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              name="from"
              defaultValue={range.from}
              className="h-8 w-40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              name="to"
              defaultValue={range.to}
              className="h-8 w-40"
            />
          </label>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
          <div className="flex flex-wrap items-center gap-1 pl-1">
            {presets.map((preset) => (
              <Button key={preset.label} asChild variant="ghost" size="sm">
                <Link
                  href={`/analytics?from=${preset.from}&to=${range.to}`}
                >
                  {preset.label}
                </Link>
              </Button>
            ))}
          </div>
        </form>
        <p className="text-xs text-muted-foreground">
          Ranges are capped at 366 days. Day boundaries follow the store
          timezone, not UTC.
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Net sales"
          value={formatMoney(current.netCents)}
          delta={percentDelta(current.netCents, previous.netCents)}
        />
        <Metric
          label="Orders"
          value={formatNumber(current.orders)}
          delta={percentDelta(current.orders, previous.orders)}
        />
        <Metric
          label="Customers"
          value={formatNumber(current.customers)}
          delta={percentDelta(current.customers, previous.customers)}
        />
        <Metric
          label="Average order value"
          value={
            current.orders > 0
              ? formatMoney(current.averageOrderCents)
              : "—"
          }
          delta={percentDelta(
            current.averageOrderCents,
            previous.averageOrderCents
          )}
        />
      </div>

      {result.hasOrders ? (
        <>
          <section
            aria-labelledby="trend-title"
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 id="trend-title" className="text-sm font-semibold">
                  Net sales and orders
                </h2>
                <p className="text-xs text-muted-foreground">
                  Daily net sales exclude completed refunds recorded that day.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Refunds: {formatMoney(current.refundsCents)}
              </p>
            </div>
            <SalesChart
              data={result.daily.map((point) => ({
                label: point.label,
                revenue: point.netCents / 100,
                orders: point.orders,
              }))}
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 rounded bg-[var(--chart-1)]"
                />
                Net sales
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 rounded bg-[var(--chart-2)]"
                />
                Orders
              </span>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section
              aria-labelledby="products-title"
              className="flex min-w-0 flex-col gap-3"
            >
              <h2 id="products-title" className="text-sm font-semibold">
                Product performance
              </h2>
              {result.topProducts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  No line items in this range.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table className="min-w-[34rem]">
                    <TableHeader className="bg-muted/60">
                      <TableRow>
                        <TableHead scope="col">Product</TableHead>
                        <TableHead scope="col">Type</TableHead>
                        <TableHead scope="col" className="text-right">
                          Units
                        </TableHead>
                        <TableHead scope="col" className="text-right">
                          Revenue
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.topProducts.map((product) => (
                        <TableRow key={`${product.title}-${product.productType}`}>
                          <TableCell className="max-w-[18rem] truncate font-medium">
                            {product.title}
                          </TableCell>
                          <TableCell>
                            <StatusPill
                              label={product.productType}
                              tone="neutral"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums">
                            {formatNumber(product.quantity)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums">
                            {formatMoney(product.revenueCents)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Grouped by the product title and product type snapshots on order
                line items, so later edits do not rewrite history.
              </p>
            </section>

            <section
              aria-labelledby="categories-title"
              className="flex h-fit flex-col gap-3 rounded-lg border border-border bg-card p-4"
            >
              <h2 id="categories-title" className="text-sm font-semibold">
                Categories
              </h2>
              {result.topCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No category snapshots in this range.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {result.topCategories.map((category) => (
                    <li
                      key={category.productType}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="truncate text-sm">
                        {category.productType}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        {formatMoney(category.revenueCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <EmptyList
          title="No orders in this range"
          description="Choose a wider range or add orders. Metrics and the chart stay empty until records exist."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">View orders</Link>
            </Button>
          }
        />
      )}

      <section
        aria-labelledby="definitions-title"
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
      >
        <h2 id="definitions-title" className="text-sm font-semibold">
          Metric definitions
        </h2>
        <dl className="grid gap-2 text-xs leading-5 sm:grid-cols-2">
          <div>
            <dt className="font-medium">Gross sales</dt>
            <dd className="text-muted-foreground">
              Sum of order totals placed in range, excluding cancelled orders.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Refunds</dt>
            <dd className="text-muted-foreground">
              Completed refunds created in range, even if the order is older.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Net sales</dt>
            <dd className="text-muted-foreground">
              Gross sales minus refunds created in range.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Average order value</dt>
            <dd className="text-muted-foreground">
              Net sales divided by non-cancelled orders in range.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Customers</dt>
            <dd className="text-muted-foreground">
              Distinct customers on non-cancelled orders in range.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Comparisons</dt>
            <dd className="text-muted-foreground">
              The immediately preceding period of equal length. No prior data
              is shown as “No prior data”, not 0%.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
