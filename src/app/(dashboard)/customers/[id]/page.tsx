import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { StatusPill, toneForStatus } from "@/components/app/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerEditForm } from "@/features/customers/components/customer-edit-form";
import { getCustomerDetail } from "@/features/customers/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { isUuid } from "@/lib/validation/id";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Customer",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const context = await requireMemberContext();
  const detail = await getCustomerDetail(context.membership.storeId, id);

  if (!detail) {
    notFound();
  }

  const { customer, addresses, orders, summary } = detail;
  const canManage = can(context.membership.role, "customers:manage");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={customer.name || "Unnamed customer"}
        description={customer.email}
        status={
          <StatusPill
            label={
              summary.classification === "none"
                ? "No orders"
                : summary.classification
            }
            tone={
              summary.classification === "new"
                ? "info"
                : summary.classification === "returning"
                  ? "success"
                  : "neutral"
            }
          />
        }
      />

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Orders", value: formatNumber(summary.orderCount) },
          { label: "Total spend", value: formatMoney(summary.spendCents) },
          {
            label: "Average order value",
            value:
              summary.orderCount > 0
                ? formatMoney(summary.averageOrderCents)
                : "—",
          },
          {
            label: "Last order",
            value: summary.lastOrderAt
              ? formatDate(summary.lastOrderAt)
              : "—",
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

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="orders-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="orders-title" className="text-sm font-semibold">
                Order history
              </h2>
              <p className="text-xs text-muted-foreground">
                Latest 50 orders. Spend excludes cancelled orders.
              </p>
            </div>

            {orders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                This customer has no orders yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table className="min-w-[38rem]">
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead scope="col">Order</TableHead>
                      <TableHead scope="col">Placed</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Payment</TableHead>
                      <TableHead scope="col" className="text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="h-11">
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-mono text-xs underline-offset-4 hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(order.placed_at)}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            label={order.status}
                            tone={toneForStatus(order.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            label={order.payment_status}
                            tone={toneForStatus(order.payment_status)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {formatMoney(order.total_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section
            aria-labelledby="addresses-title"
            className="flex flex-col gap-3"
          >
            <h2 id="addresses-title" className="text-sm font-semibold">
              Addresses
            </h2>
            {addresses.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                No addresses on file.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <address
                    key={address.id}
                    className="rounded-lg border border-border bg-card p-4 text-sm not-italic leading-6"
                  >
                    <p className="font-medium">
                      {address.name || customer.name || "Address"}
                    </p>
                    <p>{address.line1}</p>
                    {address.line2 ? <p>{address.line2}</p> : null}
                    <p>
                      {[address.city, address.region, address.postal_code]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>{address.country}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {address.is_default_shipping ? (
                        <StatusPill label="Default shipping" tone="info" />
                      ) : null}
                      {address.is_default_billing ? (
                        <StatusPill label="Default billing" tone="neutral" />
                      ) : null}
                    </div>
                  </address>
                ))}
              </div>
            )}
          </section>
        </div>

        <section
          aria-labelledby="profile-title"
          className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="profile-title" className="text-sm font-semibold">
              Profile and notes
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Personal data is scoped to this store and visible to members only.
            </p>
          </div>

          {customer.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <StatusPill key={tag} label={tag} tone="neutral" />
              ))}
            </div>
          ) : null}

          {canManage ? (
            <CustomerEditForm
              customerId={customer.id}
              name={customer.name}
              email={customer.email}
              phone={customer.phone ?? ""}
              tags={customer.tags}
              notes={customer.notes}
            />
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Your role can read this customer but not edit notes or tags.
              </p>
              <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">
                {customer.notes || "No notes."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
