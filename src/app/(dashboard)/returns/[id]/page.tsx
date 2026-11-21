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
  RefundReturnDialog,
  ReturnDecisionDialog,
} from "@/features/returns/components/return-actions";
import { getReturnDetail } from "@/features/returns/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/validation/id";

export const metadata: Metadata = {
  title: "Return",
};

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const context = await requireMemberContext();
  const detail = await getReturnDetail(context.membership.storeId, id);

  if (!detail) {
    notFound();
  }

  const { ret, order, customerName, items, refunds } = detail;
  const canManage = can(context.membership.role, "returns:manage");
  const refundCents = items.reduce((sum, item) => sum + item.refundCents, 0);
  const canDecide = canManage && ret.status === "requested";
  const canRefund = canManage && ret.status === "approved";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Return ${ret.id.slice(0, 8)}`}
        description={`${order.orderNumber} · ${customerName || order.email} · requested ${formatDateTime(
          ret.created_at
        )}`}
        status={
          <StatusPill
            label={humanizeStatus(ret.status)}
            tone={toneForStatus(ret.status)}
          />
        }
        actions={
          <>
            {canDecide ? (
              <>
                <ReturnDecisionDialog returnId={ret.id} approve />
                <ReturnDecisionDialog returnId={ret.id} approve={false} />
              </>
            ) : null}
            {canRefund ? (
              <RefundReturnDialog returnId={ret.id} refundCents={refundCents} />
            ) : null}
          </>
        }
      />

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Refund value", value: formatMoney(refundCents) },
          {
            label: "Units",
            value: String(
              items.reduce((sum, item) => sum + item.quantity, 0)
            ),
          },
          { label: "Restocked", value: ret.restock ? "Yes" : "No" },
          {
            label: "Resolved",
            value: ret.resolved_at ? formatDateTime(ret.resolved_at) : "—",
          },
        ].map((metric) => (
          <div key={metric.label} className="bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 font-mono text-[20px] leading-7 font-semibold tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="items-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="items-title" className="text-sm font-semibold">
              Returned items
            </h2>
            <Link
              href={`/orders/${order.id}`}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Open order
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[36rem]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Item</TableHead>
                  <TableHead scope="col" className="text-right">
                    Qty
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Refund
                  </TableHead>
                  <TableHead scope="col">Restock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="h-12">
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {item.orderItem.product_title}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.orderItem.variant_title || "Default"} ·{" "}
                          <span className="font-mono">{item.orderItem.sku}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(item.refundCents)}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={item.restock ? "Eligible" : "No"}
                        tone={item.restock ? "info" : "neutral"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Reason</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {ret.reason || "No reason provided."}
            </p>
            {ret.decision_note ? (
              <>
                <h3 className="mt-2 text-xs font-medium text-muted-foreground">
                  Decision note
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {ret.decision_note}
                </p>
              </>
            ) : null}
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Order refunds</h2>
            {refunds.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No refunds recorded on this order.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {refunds.map((refund) => (
                  <li
                    key={refund.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(refund.created_at)}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(refund.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
