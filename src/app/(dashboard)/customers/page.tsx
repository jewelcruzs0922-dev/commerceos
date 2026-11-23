import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { RecordCount } from "@/components/app/record-count";
import { Pagination } from "@/components/app/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";
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
        description="Spend excludes cancelled orders. New means the first order is within 30 days."
        status={
          <RecordCount value={total} label="customers" />
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
          <div className="ledger-table">
            <Table className="min-w-0 sm:min-w-[32rem] lg:min-w-[48rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Orders
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Spend
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right lg:table-cell">
                    AOV
                  </TableHead>
                  <TableHead scope="col" className="hidden md:table-cell">Type</TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Since
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((customer) => (
                  <TableRow key={customer.id} className="h-13">
                    <TableCell className="max-w-[11rem] sm:max-w-none">
                      <div className="flex min-w-0 max-w-[11rem] flex-col sm:max-w-none">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="truncate font-medium underline-offset-4 hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                          {customer.email}
                        </span>
                        <span className="mt-1 font-mono text-xs tabular-nums sm:hidden">
                          {formatMoney(customer.spendCents)} spent
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                      {customer.orderCount}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                      {formatMoney(customer.spendCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {customer.orderCount > 0
                        ? formatMoney(customer.averageOrderCents)
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">
                        {customer.classification === "none"
                          ? "No orders"
                          : customer.classification}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
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
