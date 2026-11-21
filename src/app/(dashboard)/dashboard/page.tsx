import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  DatabaseZapIcon,
  StoreIcon,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import {
  StatusPill,
  humanizeStatus,
  toneForStatus,
} from "@/components/app/status-pill";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { percentDelta, resolveRange } from "@/features/analytics/lib";
import { getAnalytics } from "@/features/analytics/queries";
import { listInventory } from "@/features/inventory/queries";
import { listOrders } from "@/features/orders/queries";
import { listReturns } from "@/features/returns/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Overview",
};

function deltaLabel(delta: number | null): string {
  if (delta === null) {
    return "No prior-period data";
  }
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}% vs prior 30 days`;
}

export default async function OverviewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Overview"
          description="The operating picture for Urban Goods. Connect Supabase to load live records."
          status={
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <StoreIcon aria-hidden="true" />
              Demo workspace
            </Badge>
          }
        />
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Supabase credentials are missing, so authentication and store data are
          disabled.
        </p>
      </div>
    );
  }

  const context = await requireMemberContext();
  const timeZone = context.membership.storeTimezone;
  const range = resolveRange({}, timeZone);

  const [analytics, recentOrders, lowStock, openReturns, pendingOrders] =
    await Promise.all([
      getAnalytics({
        storeId: context.membership.storeId,
        timeZone,
        range,
      }),
      listOrders({
        storeId: context.membership.storeId,
        filters: { search: "", status: null, payment: null, fulfillment: null },
        sort: "newest",
        page: 1,
        pageSize: 5,
      }),
      listInventory({
        storeId: context.membership.storeId,
        search: "",
        lowOnly: true,
        sort: "available_asc",
        page: 1,
        pageSize: 5,
      }),
      listReturns({
        storeId: context.membership.storeId,
        search: "",
        status: "requested",
        sort: "newest",
        page: 1,
        pageSize: 1,
      }),
      listOrders({
        storeId: context.membership.storeId,
        filters: {
          search: "",
          status: "pending",
          payment: null,
          fulfillment: null,
        },
        sort: "newest",
        page: 1,
        pageSize: 1,
      }),
    ]);

  const metrics = [
    {
      label: "Net sales",
      value: formatMoney(analytics.current.netCents),
      delta: percentDelta(
        analytics.current.netCents,
        analytics.previous.netCents
      ),
    },
    {
      label: "Orders",
      value: formatNumber(analytics.current.orders),
      delta: percentDelta(analytics.current.orders, analytics.previous.orders),
    },
    {
      label: "Customers",
      value: formatNumber(analytics.current.customers),
      delta: percentDelta(
        analytics.current.customers,
        analytics.previous.customers
      ),
    },
    {
      label: "Average order value",
      value: formatMoney(analytics.current.averageOrderCents),
      delta: percentDelta(
        analytics.current.averageOrderCents,
        analytics.previous.averageOrderCents
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description={`The operating picture for ${context.membership.storeName}: the last 30 days (${range.label}), then the records that need attention.`}
        status={
          <>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <StoreIcon aria-hidden="true" />
              Demo workspace
            </Badge>
            {analytics.hasOrders ? (
              <Badge variant="outline" className="text-muted-foreground">
                Seeded dataset
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
        <DatabaseZapIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">
            {analytics.hasOrders
              ? "Fictional Urban Goods data, reconciled against seeded records"
              : "No order records in the last 30 days"}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {analytics.hasOrders
              ? "All figures are derived from the demo database. No real customers, payments, email, or business performance are represented."
              : "Create a product and an order, or reset the demo data from Settings, to populate this view."}
          </p>
        </div>
      </div>

      <section aria-labelledby="performance-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="performance-title" className="text-sm font-semibold">
            Performance · last 30 days
          </h2>
          <Link
            href={`/analytics?from=${range.from}&to=${range.to}`}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Open analytics
          </Link>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-1.5 font-mono text-[28px] leading-[34px] font-semibold tabular-nums">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {deltaLabel(metric.delta)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-labelledby="recent-orders-title"
          className="flex min-w-0 flex-col gap-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="recent-orders-title" className="text-sm font-semibold">
              Recent orders
            </h2>
            <Link
              href="/orders"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              All orders
            </Link>
          </div>
          {recentOrders.rows.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[40rem]">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead scope="col">Order</TableHead>
                    <TableHead scope="col">Payment</TableHead>
                    <TableHead scope="col" className="text-right">
                      Total
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Placed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.rows.map((order) => (
                    <TableRow key={order.id} className="h-12">
                      <TableCell>
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-mono text-xs font-medium underline-offset-4 hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <span className="truncate text-xs text-muted-foreground">
                            {order.customerName || order.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          label={humanizeStatus(order.paymentStatus)}
                          tone={toneForStatus(order.paymentStatus)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatMoney(order.totalCents)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDateTime(order.placedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-labelledby="attention-title"
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-0.5">
              <h2 id="attention-title" className="text-sm font-semibold">
                Needs attention
              </h2>
              <p className="text-xs text-muted-foreground">
                Counts from the current store.
              </p>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              <li className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href="/inventory?low=1"
                  className="text-sm underline-offset-4 hover:underline"
                >
                  Low-stock variants
                </Link>
                <span className="font-mono text-sm tabular-nums">
                  {formatNumber(lowStock.total)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href="/returns?status=requested"
                  className="text-sm underline-offset-4 hover:underline"
                >
                  Requested returns
                </Link>
                <span className="font-mono text-sm tabular-nums">
                  {formatNumber(openReturns.total)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href="/orders?status=pending"
                  className="text-sm underline-offset-4 hover:underline"
                >
                  Pending orders
                </Link>
                <span className="font-mono text-sm tabular-nums">
                  {formatNumber(pendingOrders.total)}
                </span>
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="low-stock-title"
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="low-stock-title" className="text-sm font-semibold">
                Low stock
              </h2>
              <Link
                href="/inventory?low=1"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                View
              </Link>
            </div>
            {lowStock.rows.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                No variants are below threshold.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {lowStock.rows.map((item) => (
                  <li key={item.variantId}>
                    <Link
                      href={`/inventory/${item.variantId}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.productTitle}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {item.variantTitle} ·{" "}
                          <span className="font-mono">{item.sku}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        {formatNumber(item.available)} left
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="environment-title"
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            <h2 id="environment-title" className="text-sm font-semibold">
              Environment
            </h2>
            <dl className="flex flex-col gap-2 text-xs">
              {[
                { label: "Store", value: context.membership.storeName },
                { label: "Timezone", value: context.membership.storeTimezone },
                { label: "Currency", value: context.membership.storeCurrency },
                { label: "Data", value: "Fictional demo" },
                { label: "Payments", value: "Not enabled" },
              ].map((entry) => (
                <div
                  key={entry.label}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="text-muted-foreground">{entry.label}</dt>
                  <dd className="text-right font-medium">{entry.value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/reports"
              className="mt-1 inline-flex items-center gap-1 border-t border-border pt-3 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Integrity and reports
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </Link>
          </section>
        </div>
      </div>

      <nav
        aria-label="Module shortcuts"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground"
      >
        {[
          { href: "/products", label: "Products" },
          { href: "/orders", label: "Orders" },
          { href: "/customers", label: "Customers" },
          { href: "/inventory", label: "Inventory" },
          { href: "/analytics", label: "Analytics" },
          { href: "/discounts", label: "Discounts" },
          { href: "/returns", label: "Returns" },
          { href: "/team", label: "Team" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-0.5 underline-offset-4 hover:text-foreground hover:underline"
          >
            {item.label}
            <ChevronRightIcon aria-hidden="true" className="size-3" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
