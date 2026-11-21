import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { StatusPill, toneForStatus } from "@/components/app/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DiscountForm } from "@/features/discounts/components/discount-form";
import {
  setDiscountActive,
  updateDiscount,
} from "@/features/discounts/actions";
import { getDiscount } from "@/features/discounts/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { centsToDollars } from "@/lib/money";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/validation/id";

export const metadata: Metadata = {
  title: "Discount",
};

export default async function DiscountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "discounts:manage")) {
    return <PermissionDenied />;
  }

  const record = await getDiscount(context.membership.storeId, id);

  if (!record) {
    notFound();
  }

  const { discount, usages } = record;
  const timeZone = context.membership.storeTimezone;
  const local = (value: string | null) =>
    value
      ? formatInTimeZone(new Date(value), timeZone, "yyyy-MM-dd'T'HH:mm")
      : "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={discount.code}
        description={
          discount.type === "percentage"
            ? `${discount.value}% off · minimum ${formatMoney(
                discount.minimum_subtotal_cents
              )}`
            : `${formatMoney(discount.value)} off · minimum ${formatMoney(
                discount.minimum_subtotal_cents
              )}`
        }
        status={
          <StatusPill
            label={discount.status}
            tone={toneForStatus(discount.status)}
          />
        }
        actions={
          <ActionButton
            action={setDiscountActive}
            payload={{
              discountId: discount.id,
              isActive: discount.is_active ? "false" : "true",
            }}
            label={discount.is_active ? "Disable" : "Activate"}
            pendingLabel={discount.is_active ? "Disabling" : "Activating"}
          />
        }
      />

      <DiscountForm
        action={updateDiscount}
        discountId={discount.id}
        initial={{
          code: discount.code,
          description: discount.description,
          type: discount.type,
          value:
            discount.type === "percentage"
              ? String(discount.value)
              : centsToDollars(discount.value),
          startsAt: local(discount.starts_at),
          endsAt: local(discount.ends_at),
          minimumSubtotal: centsToDollars(discount.minimum_subtotal_cents),
          usageLimit: discount.usage_limit ? String(discount.usage_limit) : "",
          isActive: discount.is_active,
        }}
      />

      <section aria-labelledby="usage-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="usage-title" className="text-sm font-semibold">
            Usage history
          </h2>
          <p className="text-xs text-muted-foreground">
            {discount.usage_count} redemption
            {discount.usage_count === 1 ? "" : "s"}
            {discount.usage_limit ? ` of ${discount.usage_limit}` : ""}. Latest
            100 shown.
          </p>
        </div>

        {usages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No redemptions yet. Usage is recorded atomically when an order
            applies this code.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[38rem]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Order</TableHead>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col" className="text-right">
                    Applied
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    When
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.map((usage) => (
                  <TableRow key={usage.id} className="h-11">
                    <TableCell>
                      {usage.orderNumber ? (
                        <Link
                          href={`/orders/${usage.order_id}`}
                          className="font-mono text-xs underline-offset-4 hover:underline"
                        >
                          {usage.orderNumber}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {usage.customerName || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(usage.amount_cents)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDateTime(usage.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
