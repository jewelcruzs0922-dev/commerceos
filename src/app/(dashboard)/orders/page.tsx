import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon, PlusIcon } from "lucide-react";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { RecordCount } from "@/components/app/record-count";
import { Pagination } from "@/components/app/pagination";
import {
  StatusPill,
  humanizeStatus,
  toneForStatus,
} from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { parsePage, sanitizeSearch } from "@/lib/list-params";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  listOrders,
  type OrderSort,
} from "@/features/orders/queries";

export const metadata: Metadata = {
  title: "Orders",
};

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
  sort: z
    .enum(["newest", "oldest", "total_desc", "total_asc"])
    .default("newest").catch("newest"),
  page: z.string().optional().catch(undefined),
});

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Orders"
        description="Every order with line-item snapshots, payment and fulfillment state, and a timeline."
      />
    );
  }

  const params = await searchParams;
  const parsed = querySchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    payment: typeof params.payment === "string" ? params.payment : undefined,
    fulfillment:
      typeof params.fulfillment === "string" ? params.fulfillment : undefined,
    sort: typeof params.sort === "string" ? params.sort : "newest",
    page: params.page,
  });

  const context = await requireMemberContext();
  const search = sanitizeSearch(parsed.q);
  const page = parsePage(parsed.page);
  const pageSize = 25;

  const { rows, total } = await listOrders({
    storeId: context.membership.storeId,
    filters: {
      search,
      status: parsed.status ?? null,
      payment: parsed.payment ?? null,
      fulfillment: parsed.fulfillment ?? null,
    },
    sort: parsed.sort as OrderSort,
    page,
    pageSize,
  });

  const canManage = can(context.membership.role, "orders:manage");
  const filtered = Boolean(
    search || parsed.status || parsed.payment || parsed.fulfillment
  );

  const exportParams = new URLSearchParams();
  if (search) exportParams.set("q", search);
  if (parsed.status) exportParams.set("status", parsed.status);
  if (parsed.payment) exportParams.set("payment", parsed.payment);
  if (parsed.fulfillment) exportParams.set("fulfillment", parsed.fulfillment);
  const exportHref = `/orders/export${
    exportParams.size > 0 ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Line items are historical snapshots; refunds are demo bookkeeping."
        status={
          <RecordCount value={total} label="orders" />
        }
        actions={
          <>
            {canManage ? (
              <Button asChild size="sm">
                <Link href="/orders/new">
                  <PlusIcon aria-hidden="true" />
                  New order
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <DownloadIcon aria-hidden="true" />
                Export CSV
              </a>
            </Button>
          </>
        }
      />

      <ListToolbar
        searchPlaceholder="Search order, email, customer"
        searchValue={search}
        filters={[
          {
            name: "status",
            label: "Filter by order status",
            value: parsed.status ?? "",
            options: [
              { value: "", label: "All order statuses" },
              { value: "pending", label: "Pending" },
              { value: "processing", label: "Processing" },
              { value: "fulfilled", label: "Fulfilled" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          {
            name: "payment",
            label: "Filter by payment",
            value: parsed.payment ?? "",
            options: [
              { value: "", label: "All payments" },
              { value: "pending", label: "Pending" },
              { value: "authorized", label: "Authorized" },
              { value: "paid", label: "Paid" },
              { value: "partially_refunded", label: "Part. refunded" },
              { value: "refunded", label: "Refunded" },
              { value: "voided", label: "Voided" },
            ],
          },
          {
            name: "fulfillment",
            label: "Filter by fulfillment",
            value: parsed.fulfillment ?? "",
            options: [
              { value: "", label: "All fulfillment" },
              { value: "unfulfilled", label: "Unfulfilled" },
              { value: "partially_fulfilled", label: "Part. fulfilled" },
              { value: "fulfilled", label: "Fulfilled" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
        sort={{
          name: "sort",
          label: "Sort orders",
          value: parsed.sort,
          options: [
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "total_desc", label: "Total ↓" },
            { value: "total_asc", label: "Total ↑" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={filtered ? "No orders match those filters" : "No orders yet"}
          description={
            filtered
              ? "Clear the filters or search a different order, email, or customer."
              : "Orders appear when the demo seed runs or an order is created."
          }
        />
      ) : (
        <>
          <div className="ledger-table">
            <Table className="min-w-0 sm:min-w-[32rem] lg:min-w-[52rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Order</TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">Payment</TableHead>
                  <TableHead scope="col" className="hidden md:table-cell">Fulfillment</TableHead>
                  <TableHead scope="col" className="hidden text-right lg:table-cell">
                    Items
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Total
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Placed
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((order) => (
                  <TableRow key={order.id} className="h-13">
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
                        <span className="mt-1 sm:hidden">
                          <StatusPill
                            label={humanizeStatus(order.paymentStatus)}
                            tone={toneForStatus(order.paymentStatus)}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill
                        label={humanizeStatus(order.paymentStatus)}
                        tone={toneForStatus(order.paymentStatus)}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusPill
                        label={humanizeStatus(order.fulfillmentStatus)}
                        tone={toneForStatus(order.fulfillmentStatus)}
                      />
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums lg:table-cell">
                      {order.itemCount}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(order.totalCents)}
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                      {formatDateTime(order.placedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            path="/orders"
            params={{
              q: search || undefined,
              status: parsed.status,
              payment: parsed.payment,
              fulfillment: parsed.fulfillment,
              sort: parsed.sort,
            }}
          />

          {canManage ? (
            <p className="text-xs text-muted-foreground">
              Cancellation and demo refunds are available on an order record.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
