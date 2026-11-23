import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { PerformanceSummary } from "@/components/app/performance-summary";
import { PageHeader } from "@/components/app/page-header";
import { SectionHeading } from "@/components/app/section-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
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
        description={`${range.label} · ${context.membership.storeTimezone}`}
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

      <section
        aria-labelledby="performance-title"
        className="flex flex-col gap-4"
      >
        <SectionHeading
          id="performance-title"
          title="Performance"
          action={
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              Compared with prior period
            </span>
          }
        />
        <PerformanceSummary
          primary={{
            label: "Net sales",
            value: formatMoney(current.netCents),
            delta: percentDelta(current.netCents, previous.netCents),
            comparison: "vs prior period",
          }}
          support={[
            {
              label: "Orders",
              value: formatNumber(current.orders),
              delta: percentDelta(current.orders, previous.orders),
              comparison: "vs prior",
            },
            {
              label: "Customers",
              value: formatNumber(current.customers),
              delta: percentDelta(current.customers, previous.customers),
              comparison: "vs prior",
            },
            {
              label: "Average order",
              value:
                current.orders > 0
                  ? formatMoney(current.averageOrderCents)
                  : "—",
              delta: percentDelta(
                current.averageOrderCents,
                previous.averageOrderCents
              ),
              comparison: "vs prior",
            },
          ]}
        />
      </section>

      {result.hasOrders ? (
        <>
          <section
            aria-labelledby="trend-title"
            className="flex flex-col gap-4 border-b border-border pb-6"
          >
            <SectionHeading
              id="trend-title"
              title="Net sales and orders"
              description="Daily net sales exclude completed refunds recorded that day."
              action={
                <p className="text-xs text-muted-foreground">
                  Refunds: {formatMoney(current.refundsCents)}
                </p>
              }
            />
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
              <SectionHeading
                id="products-title"
                title="Product performance"
                description="Grouped from historical order-item snapshots."
              />
              {result.topProducts.length === 0 ? (
                <p className="border-y border-border py-6 text-sm text-muted-foreground">
                  No line items in this range.
                </p>
              ) : (
                <div className="ledger-table">
                  <Table className="min-w-0 sm:min-w-[34rem]">
                    <TableHeader className="bg-secondary/55">
                      <TableRow>
                        <TableHead scope="col">Product</TableHead>
                        <TableHead scope="col" className="hidden md:table-cell">Type</TableHead>
                        <TableHead scope="col" className="hidden text-right sm:table-cell">
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
                          <TableCell className="max-w-[12rem] truncate font-medium sm:max-w-[18rem]">
                            {product.title}
                            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground sm:hidden">
                              {formatNumber(product.quantity)} units
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {product.productType}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
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
              className="flex h-fit flex-col gap-3 xl:border-l xl:border-border xl:pl-8"
            >
              <SectionHeading
                id="categories-title"
                title="Categories"
                description="Revenue by captured product type."
              />
              {result.topCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No category snapshots in this range.
                </p>
              ) : (
                <ul className="mt-1 border-t border-border">
                  {result.topCategories.map((category) => (
                    <li
                      key={category.productType}
                      className="flex items-baseline justify-between gap-3 border-b border-border py-2.5"
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

      <details className="border-y border-border py-4">
        <summary className="cursor-pointer text-[15px] font-semibold">
          Metric definitions
        </summary>
        <dl className="mt-4 grid gap-3 text-xs leading-5 sm:grid-cols-2">
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
      </details>
    </div>
  );
}
