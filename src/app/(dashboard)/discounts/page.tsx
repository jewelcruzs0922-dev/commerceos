import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { RecordCount } from "@/components/app/record-count";
import { Pagination } from "@/components/app/pagination";
import { StatusPill, toneForStatus } from "@/components/app/status-pill";
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
import { formatMoney } from "@/lib/format";
import { parsePage, sanitizeSearch } from "@/lib/list-params";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  listDiscounts,
  type DiscountStatus,
} from "@/features/discounts/queries";

export const metadata: Metadata = {
  title: "Discounts",
};

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z
    .enum(["active", "scheduled", "expired", "disabled"])
    .optional()
    .catch(undefined),
  sort: z
    .enum(["newest", "code", "usage"])
    .default("newest")
    .catch("newest"),
  page: z.string().optional().catch(undefined),
});

function discountValue(
  type: "percentage" | "fixed_amount",
  value: number
): string {
  return type === "percentage" ? `${value}%` : formatMoney(value);
}

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Discounts"
        description="Store-scoped codes with limits, minimums, and usage history."
      />
    );
  }

  const params = await searchParams;
  const parsed = querySchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    sort: typeof params.sort === "string" ? params.sort : "newest",
    page: params.page,
  });

  const context = await requireMemberContext();
  const search = sanitizeSearch(parsed.q);
  const page = parsePage(parsed.page);
  const pageSize = 25;

  const { rows, total } = await listDiscounts({
    storeId: context.membership.storeId,
    search,
    status: (parsed.status as DiscountStatus | undefined) ?? null,
    sort: parsed.sort,
    page,
    pageSize,
  });

  const canManage = can(context.membership.role, "discounts:manage");
  const filtered = Boolean(search || parsed.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Discounts"
        description="Activation, dates, minimums, and usage limits are validated on redemption."
        status={
          <RecordCount value={total} label="discounts" />
        }
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href="/discounts/new">
                <PlusIcon aria-hidden="true" />
                New discount
              </Link>
            </Button>
          ) : null
        }
      />

      <ListToolbar
        searchPlaceholder="Search codes"
        searchValue={search}
        filters={[
          {
            name: "status",
            label: "Filter by discount status",
            value: parsed.status ?? "",
            options: [
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "scheduled", label: "Scheduled" },
              { value: "expired", label: "Expired" },
              { value: "disabled", label: "Disabled" },
            ],
          },
        ]}
        sort={{
          name: "sort",
          label: "Sort discounts",
          value: parsed.sort,
          options: [
            { value: "newest", label: "Newest" },
            { value: "code", label: "Code" },
            { value: "usage", label: "Most used" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={filtered ? "No discounts match those filters" : "No discounts yet"}
          description={
            filtered
              ? "Clear the filters or search a different code."
              : "Create a code to offer a percentage or fixed-amount discount."
          }
          action={
            canManage ? (
              <Button asChild size="sm">
                <Link href="/discounts/new">
                  <PlusIcon aria-hidden="true" />
                  New discount
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="ledger-table">
            <Table className="min-w-0 sm:min-w-[32rem] lg:min-w-[48rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Code</TableHead>
                  <TableHead scope="col">Value</TableHead>
                  <TableHead scope="col" className="hidden lg:table-cell">Window</TableHead>
                  <TableHead scope="col" className="hidden text-right md:table-cell">
                    Minimum
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Usage
                  </TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((discount) => (
                  <TableRow key={discount.id} className="h-12">
                    <TableCell>
                      <Link
                        href={`/discounts/${discount.id}`}
                        className="font-mono text-xs font-medium uppercase underline-offset-4 hover:underline"
                      >
                        {discount.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {discountValue(discount.type, discount.value)}
                      <span className="ml-1 text-muted-foreground">off</span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                      {discount.starts_at
                        ? format(new Date(discount.starts_at), "MMM d, yyyy")
                        : "Always"}
                      {" – "}
                      {discount.ends_at
                        ? format(new Date(discount.ends_at), "MMM d, yyyy")
                        : "No end"}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">
                      {formatMoney(discount.minimum_subtotal_cents)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                      {discount.usage_count}
                      {discount.usage_limit ? ` / ${discount.usage_limit}` : ""}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={discount.status}
                        tone={toneForStatus(discount.status)}
                      />
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
            path="/discounts"
            params={{ q: search || undefined, status: parsed.status, sort: parsed.sort }}
          />
        </>
      )}
    </div>
  );
}
