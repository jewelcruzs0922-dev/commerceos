import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { RecordCount } from "@/components/app/record-count";
import { Pagination } from "@/components/app/pagination";
import { StatusPill, humanizeStatus, toneForStatus } from "@/components/app/status-pill";
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
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listReturns } from "@/features/returns/queries";
import type { Database } from "@/types/database";

export const metadata: Metadata = {
  title: "Returns",
};

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z
    .enum(["requested", "approved", "rejected", "received", "refunded", "closed"])
    .optional()
    .catch(undefined),
  sort: z.enum(["newest", "oldest"]).default("newest").catch("newest"),
  page: z.string().optional().catch(undefined),
});

type ReturnStatus = Database["public"]["Enums"]["return_status"];

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Returns"
        description="Return requests, decisions, restock eligibility, and refund bookkeeping."
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

  const { rows, total } = await listReturns({
    storeId: context.membership.storeId,
    search,
    status: (parsed.status as ReturnStatus | undefined) ?? null,
    sort: parsed.sort,
    page,
    pageSize,
  });

  const filtered = Boolean(search || parsed.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Returns"
        description="Request, review, refund. Restocking happens once, on refund."
        status={
          <RecordCount value={total} label="returns" />
        }
      />

      <ListToolbar
        searchPlaceholder="Search order or customer"
        searchValue={search}
        filters={[
          {
            name: "status",
            label: "Filter by return status",
            value: parsed.status ?? "",
            options: [
              { value: "", label: "All statuses" },
              { value: "requested", label: "Requested" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "refunded", label: "Refunded" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
        sort={{
          name: "sort",
          label: "Sort returns",
          value: parsed.sort,
          options: [
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={filtered ? "No returns match those filters" : "No returns yet"}
          description={
            filtered
              ? "Clear the filters or search a different order or customer."
              : "Request a return from an order to start the workflow."
          }
        />
      ) : (
        <>
          <div className="ledger-table">
            <Table className="min-w-0 sm:min-w-[32rem] lg:min-w-[48rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Return</TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">Order</TableHead>
                  <TableHead scope="col" className="hidden lg:table-cell">Customer</TableHead>
                  <TableHead scope="col" className="hidden text-right md:table-cell">
                    Items
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Refund value
                  </TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Requested
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((ret) => (
                  <TableRow key={ret.id} className="h-12">
                    <TableCell>
                      <Link
                        href={`/returns/${ret.id}`}
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        RET-{ret.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">
                      {ret.orderNumber}
                    </TableCell>
                    <TableCell className="hidden text-xs lg:table-cell">
                      {ret.customerName || "—"}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">
                      {ret.itemCount}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(ret.refundCents)}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={humanizeStatus(ret.status)}
                        tone={toneForStatus(ret.status)}
                      />
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                      {formatDateTime(ret.createdAt)}
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
            path="/returns"
            params={{ q: search || undefined, status: parsed.status, sort: parsed.sort }}
          />
        </>
      )}
    </div>
  );
}
