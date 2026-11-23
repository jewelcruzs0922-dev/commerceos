import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  DatabaseZapIcon,
} from "lucide-react";
import { PerformanceSummary } from "@/components/app/performance-summary";
import { PageHeader } from "@/components/app/page-header";
import { SectionHeading } from "@/components/app/section-heading";
import {
  StatusPill,
  humanizeStatus,
  toneForStatus,
} from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { percentDelta, resolveRange } from "@/features/analytics/lib";
import { getAnalytics } from "@/features/analytics/queries";
import { listInventory } from "@/features/inventory/queries";
import { countOrders, listOrders } from "@/features/orders/queries";
import { countReturns } from "@/features/returns/queries";
import { requireMemberContext } from "@/lib/auth/session";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
} from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function OverviewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Overview"
          description="The operating picture for Urban Goods. Connect Supabase to load live records."
        />
        <p className="border-y border-border py-4 text-sm text-muted-foreground">
          Supabase credentials are missing, so authentication and store data are
          disabled.
        </p>
      </div>
    );
  }

  const context = await requireMemberContext();
  const timeZone = context.membership.storeTimezone;
  const range = resolveRange({}, timeZone);

  const [analytics, recentOrders, lowStock, openReturnsCount, pendingOrdersCount] =
    await Promise.all([
      getAnalytics({
        storeId: context.membership.storeId,
        timeZone,
        range,
        includeProductPerformance: false,
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
      countReturns({
        storeId: context.membership.storeId,
        status: "requested",
      }),
      countOrders({
        storeId: context.membership.storeId,
        status: "pending",
      }),
    ]);

  const primaryMetric = {
    label: "Net sales",
    value: formatMoney(analytics.current.netCents),
    delta: percentDelta(
      analytics.current.netCents,
      analytics.previous.netCents
    ),
  };

  const supportMetrics = [
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
      label: "Average order",
      value: formatMoney(analytics.current.averageOrderCents),
      delta: percentDelta(
        analytics.current.averageOrderCents,
        analytics.previous.averageOrderCents
      ),
    },
  ];

  const attentionItems = [
    {
      label: "Low-stock variants",
      context: "Inventory",
      count: lowStock.total,
      href: "/inventory?low=1",
    },
    {
      label: "Requested returns",
      context: "Returns",
      count: openReturnsCount,
      href: "/returns?status=requested",
    },
    {
      label: "Pending orders",
      context: "Orders",
      count: pendingOrdersCount,
      href: "/orders?status=pending",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description={`Last ${range.days.length} days \u00b7 ${range.label} \u00b7 Demo workspace`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/analytics?from=${range.from}&to=${range.to}`}>
              Open analytics
              <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {!analytics.hasOrders ? (
        <p className="border-y border-border py-4 text-sm text-muted-foreground">
          No order records in the last 30 days. Create a product and an order,
          or reset the demo data from Settings, to populate this view.
        </p>
      ) : null}

      <section
        aria-labelledby="performance-title"
        className="flex flex-col gap-4"
      >
        <SectionHeading
          id="performance-title"
          title="Performance"
          action={
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              Compared with prior {range.days.length} days
            </span>
          }
        />
        <PerformanceSummary
          primary={{
            ...primaryMetric,
            comparison: `vs prior ${range.days.length} days`,
          }}
          support={supportMetrics.map((metric) => ({
            ...metric,
            comparison: "vs prior",
          }))}
        />
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-12">
        <section
          aria-labelledby="recent-orders-title"
          className="flex min-w-0 flex-col gap-4"
        >
          <SectionHeading
            id="recent-orders-title"
            title="Recent orders"
            action={
              <Link
                href="/orders"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                View all orders
                <ArrowRightIcon aria-hidden="true" className="size-3.5" />
              </Link>
            }
          />
          {recentOrders.rows.length === 0 ? (
            <p className="border-y border-border py-8 text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <>
              <ul className="border-y border-border sm:hidden">
                {recentOrders.rows.map((order) => (
                  <li
                    key={order.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex flex-col gap-2 py-3"
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-[13px] font-medium leading-5">
                            {order.customerName || order.email}
                          </span>
                          <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
                            {order.orderNumber}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[13px] font-medium tabular-nums">
                          {formatMoney(order.totalCents)}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-4">
                        <StatusPill
                          label={humanizeStatus(order.paymentStatus)}
                          tone={toneForStatus(order.paymentStatus)}
                        />
                        <span
                          className="text-[11px] leading-4 text-muted-foreground"
                          title={formatDateTime(order.placedAt)}
                        >
                          {formatDate(order.placedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="ledger-table hidden sm:block">
                <Table className="min-w-[32rem]">
                <TableCaption className="sr-only">
                  Five most recent orders
                </TableCaption>
                <TableHeader className="bg-secondary/55">
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow key={order.id} className="h-14">
                      <TableCell className="px-3 first:pl-0">
                        <Link
                          href={`/orders/${order.id}`}
                          className="group/order flex min-w-0 flex-col gap-0.5 outline-offset-4"
                        >
                          <span className="truncate text-[13px] font-medium leading-5 group-hover/order:text-primary">
                            {order.customerName || order.email}
                          </span>
                          <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
                            {order.orderNumber}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="px-3">
                        <StatusPill
                          label={humanizeStatus(order.paymentStatus)}
                          tone={toneForStatus(order.paymentStatus)}
                        />
                      </TableCell>
                      <TableCell className="px-3 text-right font-mono text-[13px] font-medium tabular-nums">
                        {formatMoney(order.totalCents)}
                      </TableCell>
                      <TableCell className="px-3 text-right text-xs text-muted-foreground last:pr-0">
                        {formatDate(order.placedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-8 xl:border-l xl:border-border xl:pl-8">
          <section
            aria-labelledby="attention-title"
            className="overflow-hidden rounded-xl border border-highlight-border bg-highlight-soft"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <h2 id="attention-title" className="text-sm font-semibold">
                Needs attention
              </h2>
              <span className="font-mono text-[11px] tabular-nums text-foreground/75">
                {attentionItems.length} queues
              </span>
            </div>
            <ul className="border-t border-highlight-border/70">
              {attentionItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-4 border-b border-highlight-border/70 px-4 py-3.5 last:border-0 hover:bg-highlight/25"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-medium leading-5">
                        {item.label}
                      </span>
                      <span className="text-[11px] leading-4 text-foreground/75">
                        {item.context}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-2xl font-semibold leading-8 tabular-nums">
                        {formatNumber(item.count)}
                      </span>
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-4 text-foreground/45 transition-colors group-hover:text-foreground"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="low-stock-title">
            <SectionHeading
              id="low-stock-title"
              title="Low stock"
              action={
                <Link
                  href="/inventory?low=1"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View all
                  <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </Link>
              }
            />
            {lowStock.rows.length === 0 ? (
              <p className="mt-4 border-y border-border py-5 text-xs text-muted-foreground">
                No variants are below threshold.
              </p>
            ) : (
              <ul className="mt-4 border-t border-border">
                {lowStock.rows.map((item) => (
                  <li key={item.variantId}>
                    <Link
                      href={`/inventory/${item.variantId}`}
                      className="flex items-center justify-between gap-4 border-b border-border py-2.5"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium leading-5">
                          {item.productTitle}
                        </span>
                        <span className="truncate text-[11px] leading-4 text-muted-foreground">
                          {item.variantTitle}
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">{item.sku}</span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs tabular-nums",
                          item.available === 0
                            ? "text-danger"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatNumber(item.available)} left
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <footer className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <p className="flex max-w-lg items-start gap-2 leading-5">
          <DatabaseZapIcon
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0"
          />
          Fictional demo data. No real customers, payments, or email.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {[
              { label: "Store", value: context.membership.storeName },
              { label: "Timezone", value: context.membership.storeTimezone },
              { label: "Currency", value: context.membership.storeCurrency },
              { label: "Payments", value: "Not enabled" },
            ].map((entry) => (
              <div key={entry.label} className="flex items-center gap-1">
                <dt>{entry.label}</dt>
                <dd className="font-medium text-foreground">{entry.value}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/reports"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Integrity reports
          </Link>
        </div>
      </footer>
    </div>
  );
}
