import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { StatusPill } from "@/components/app/status-pill";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { parsePage, sanitizeSearch } from "@/lib/list-params";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  listCustomers,
  type CustomerSort,
} from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Customers",
};

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "name"]).default("newest").catch("newest"),
  page: z.string().optional().catch(undefined),
});

const classificationTone = {
  new: "info",
  returning: "success",
  none: "neutral",
} as const;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Customers"
        description="Customer profiles with addresses, order history, lifetime value, and notes."
      />
    );
  }

  const params = await searchParams;
  const parsed = querySchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    sort: typeof params.sort === "string" ? params.sort : "newest",
    page: params.page,
  });

  const context = await requireMemberContext();
  const search = sanitizeSearch(parsed.q);
  const page = parsePage(parsed.page);
  const pageSize = 25;

  const { rows, total } = await listCustomers({
    storeId: context.membership.storeId,
    search,
    sort: parsed.sort as CustomerSort,
    page,
    pageSize,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Profiles, purchase history, and lifetime value. Spend excludes cancelled orders; new means the first order is within 30 days."
        status={
          <Badge variant="outline" className="font-mono text-[11px]">
            {formatNumber(total)}
          </Badge>
        }
      />

      <ListToolbar
        searchPlaceholder="Search name or email"
        searchValue={search}
        sort={{
          name: "sort",
          label: "Sort customers",
          value: parsed.sort,
          options: [
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "name", label: "Name" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={search ? "No customers match that search" : "No customers yet"}
          description={
            search
              ? "Search covers customer names and emails."
              : "Customers appear when orders are imported or the demo seed runs."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[48rem]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col" className="text-right">
                    Orders
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Spend
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    AOV
                  </TableHead>
                  <TableHead scope="col">Type</TableHead>
                  <TableHead scope="col" className="text-right">
                    Since
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((customer) => (
                  <TableRow key={customer.id} className="h-13">
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="truncate font-medium underline-offset-4 hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                          {customer.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {customer.orderCount}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(customer.spendCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {customer.orderCount > 0
                        ? formatMoney(customer.averageOrderCents)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={
                          customer.classification === "none"
                            ? "No orders"
                            : customer.classification
                        }
                        tone={classificationTone[customer.classification]}
                      />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(customer.createdAt)}
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
            path="/customers"
            params={{ q: search || undefined, sort: parsed.sort }}
          />
        </>
      )}
    </div>
  );
}
