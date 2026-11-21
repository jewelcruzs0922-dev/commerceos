import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { StatusPill, humanizeStatus, toneForStatus } from "@/components/app/status-pill";
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
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
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
        description="A requested return is reviewed, approved or rejected, then refunded separately. Restocking happens once, on refund."
        status={
          <Badge variant="outline" className="font-mono text-[11px]">
            {formatNumber(total)}
          </Badge>
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
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[48rem]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Return</TableHead>
                  <TableHead scope="col">Order</TableHead>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col" className="text-right">
                    Items
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Refund value
                  </TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
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
                    <TableCell className="font-mono text-xs">
                      {ret.orderNumber}
                    </TableCell>
                    <TableCell className="text-xs">
                      {ret.customerName || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
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
                    <TableCell className="text-right text-xs text-muted-foreground">
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
