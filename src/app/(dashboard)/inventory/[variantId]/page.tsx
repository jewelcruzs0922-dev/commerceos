import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdjustmentForm } from "@/features/inventory/components/adjustment-form";
import { getInventoryItem } from "@/features/inventory/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDateTime, formatNumber } from "@/lib/format";
import { humanizeStatus } from "@/components/app/status-pill";
import { isUuid } from "@/lib/validation/id";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Inventory detail",
};

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;
  if (!isUuid(variantId)) {
    notFound();
  }
  const context = await requireMemberContext();
  const record = await getInventoryItem(context.membership.storeId, variantId);

  if (!record) {
    notFound();
  }

  const { item, movements } = record;
  const canAdjust = can(context.membership.role, "inventory:adjust");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={item.productTitle}
        description={`${item.variantTitle} · ${item.sku}`}
        status={
          <StatusPill
            label={
              item.available <= 0
                ? "Out of stock"
                : item.isLowStock
                  ? "Low stock"
                  : "In stock"
            }
            tone={
              item.available <= 0
                ? "danger"
                : item.isLowStock
                  ? "warning"
                  : "success"
            }
          />
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/products/${item.productId}`}>
              <ArrowLeftIcon aria-hidden="true" />
              Open product
            </Link>
          </Button>
        }
      />

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "On hand", value: item.onHand },
          { label: "Reserved", value: item.reserved },
          { label: "Available", value: item.available },
          { label: "Low-stock threshold", value: item.threshold },
        ].map((metric) => (
          <div key={metric.label} className="bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 font-mono text-[28px] leading-[34px] font-semibold tabular-nums">
              {formatNumber(metric.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-labelledby="movements-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="movements-title" className="text-sm font-semibold">
              Movement history
            </h2>
            <p className="text-xs text-muted-foreground">
              Latest 100 changes. Rows are immutable.
            </p>
          </div>

          {movements.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No stock movements have been recorded for this variant yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table className="min-w-[36rem]">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col" className="text-right">
                      Change
                    </TableHead>
                    <TableHead scope="col">Reason</TableHead>
                    <TableHead scope="col">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} className="h-12">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(movement.created_at)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs tabular-nums ${
                          movement.delta > 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {movement.delta > 0 ? "+" : ""}
                        {movement.delta}
                      </TableCell>
                      <TableCell className="text-xs">
                        {humanizeStatus(movement.reason)}
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">
                        {movement.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {canAdjust ? (
          <section
            aria-labelledby="adjust-title"
            className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-0.5">
              <h2 id="adjust-title" className="text-sm font-semibold">
                Adjust stock
              </h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Every adjustment writes a movement. Corrections create a new
                movement instead of editing history.
              </p>
            </div>
            <AdjustmentForm variantId={item.variantId} />
          </section>
        ) : (
          <p className="rounded-lg border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
            Demo viewer sessions are read-only. Inventory adjustments are
            disabled.
          </p>
        )}
      </div>
    </div>
  );
}
