import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import {
  StatusPill,
  humanizeStatus,
  toneForStatus,
} from "@/components/app/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CancelOrderDialog,
  FulfillOrderDialog,
  RefundDialog,
} from "@/features/orders/components/order-actions";
import { canCancelOrder, canFulfillOrder } from "@/features/orders/lib/status";
import { ReturnRequestDialog } from "@/features/returns/components/return-actions";
import { getOrderDetail, readAddress } from "@/features/orders/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { isUuid } from "@/lib/validation/id";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Order",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const context = await requireMemberContext();
  const detail = await getOrderDetail(context.membership.storeId, id);

  if (!detail) {
    notFound();
  }

  const { order, customerName, items, payments, refunds, timeline } = detail;
  const canManage = can(context.membership.role, "orders:manage");
  const refundedCents = refunds
    .filter((refund) => refund.status === "completed")
    .reduce((sum, refund) => sum + refund.amount_cents, 0);
  const refundableCents = Math.max(0, order.total_cents - refundedCents);
  const remainingQuantity = items.reduce(
    (sum, item) => sum + item.reserved_quantity,
    0
  );
  const fulfilledQuantity = items.reduce(
    (sum, item) => sum + item.fulfilled_quantity,
    0
  );
  const canFulfill =
    can(context.membership.role, "orders:fulfill") &&
    canFulfillOrder({
      status: order.status,
      fulfillmentStatus: order.fulfillment_status,
      remainingQuantity,
    });
  const canCancel =
    canManage &&
    canCancelOrder({
      status: order.status,
      fulfilledQuantity,
    });
  const canRefund =
    canManage &&
    refundableCents > 0 &&
    (order.payment_status === "paid" ||
      order.payment_status === "partially_refunded");
  const fulfillItems = items
    .filter((item) => item.reserved_quantity > 0)
    .map((item) => ({
      id: item.id,
      productTitle: item.product_title,
      variantTitle: item.variant_title || "Default",
      sku: item.sku,
      remaining: item.reserved_quantity,
    }));

  const address = readAddress(order.shipping_address);
  const statusLabels = Array.from(
    new Set([order.status, order.payment_status, order.fulfillment_status])
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={order.order_number}
        description={`${formatDateTime(order.placed_at)} \u00b7 ${order.email}`}
        status={
          <div className="flex flex-wrap items-center gap-2">
            {statusLabels.map((label) => (
              <StatusPill
                key={label}
                label={humanizeStatus(label)}
                tone={toneForStatus(label)}
              />
            ))}
          </div>
        }
        actions={
          <>
            {canFulfill ? (
              <FulfillOrderDialog
                orderId={order.id}
                orderNumber={order.order_number}
                items={fulfillItems}
              />
            ) : null}
            {canRefund ? (
              <RefundDialog
                orderId={order.id}
                orderNumber={order.order_number}
                refundableCents={refundableCents}
              />
            ) : null}
            {canManage && order.status !== "cancelled" && items.length > 0 ? (
              <ReturnRequestDialog
                orderId={order.id}
                orderNumber={order.order_number}
                items={items.map((item) => ({
                  id: item.id,
                  productTitle: item.product_title,
                  variantTitle: item.variant_title || "Default",
                  sku: item.sku,
                  quantity: item.quantity,
                  totalCents: item.total_cents,
                }))}
              />
            ) : null}
            {canCancel ? (
              <CancelOrderDialog
                orderId={order.id}
                orderNumber={order.order_number}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="items-title" className="flex flex-col gap-3">
            <h2 id="items-title" className="text-sm font-semibold">
              Line items
            </h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="min-w-[40rem]">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead scope="col">Item</TableHead>
                    <TableHead scope="col" className="text-right">
                      Qty
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Unit price
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="h-14">
                      <TableCell>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {item.product_title}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {item.variant_title || "Default"} ·{" "}
                            <span className="font-mono">{item.sku}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        <span className="block">{item.quantity}</span>
                        {item.fulfilled_quantity > 0 ? (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {item.fulfilled_quantity} fulfilled
                          </span>
                        ) : item.reserved_quantity > 0 ? (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {item.reserved_quantity} reserved
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatMoney(item.unit_price_cents)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatMoney(item.total_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              These values are the historical snapshot taken with the order.
              Later product edits do not change them.
            </p>

            <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5 pt-2 text-sm">
              <div className="flex justify-between gap-4 text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="font-mono tabular-nums">
                  {formatMoney(order.subtotal_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <dt>Discount</dt>
                <dd className="font-mono tabular-nums">
                  −{formatMoney(order.discount_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <dt>Shipping</dt>
                <dd className="font-mono tabular-nums">
                  {formatMoney(order.shipping_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <dt>Tax</dt>
                <dd className="font-mono tabular-nums">
                  {formatMoney(order.tax_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-1.5 font-medium">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums">
                  {formatMoney(order.total_cents)}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="payments-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="payments-title" className="text-sm font-semibold">
                Payments and refunds
              </h2>
              <p className="text-xs text-muted-foreground">
                Demo bookkeeping. No provider is contacted.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card">
                <p className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                  Payments
                </p>
                {payments.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No payment records.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <span className="font-mono text-xs">
                          {formatMoney(payment.amount_cents)}
                        </span>
                        <StatusPill
                          label={humanizeStatus(payment.status)}
                          tone={toneForStatus(payment.status)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card">
                <p className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                  Refunds
                </p>
                {refunds.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No refunds recorded.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {refunds.map((refund) => (
                      <li
                        key={refund.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="font-mono text-xs">
                            {formatMoney(refund.amount_cents)}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {refund.reason || "No reason"}
                          </span>
                        </div>
                        <StatusPill
                          label={humanizeStatus(refund.status)}
                          tone={toneForStatus(refund.status)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Customer</h2>
            {order.customer_id ? (
              <Link
                href={`/customers/${order.customer_id}`}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {customerName || order.email}
              </Link>
            ) : (
              <p className="text-sm">{order.email}</p>
            )}
            <p className="text-xs text-muted-foreground">{order.email}</p>
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Shipping address</h2>
            {Object.keys(address).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No shipping address recorded.
              </p>
            ) : (
              <address className="text-sm not-italic leading-6">
                {address.name ? <p>{address.name}</p> : null}
                {address.line1 ? <p>{address.line1}</p> : null}
                {address.line2 ? <p>{address.line2}</p> : null}
                <p>
                  {[address.city, address.region, address.postal_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {address.country ? <p>{address.country}</p> : null}
              </address>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No recorded actions for this order.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {timeline.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">
                      {humanizeStatus(entry.action.replaceAll(".", " "))}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
