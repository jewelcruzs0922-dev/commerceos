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
import { formatNumber } from "@/lib/format";
import { parsePage, sanitizeSearch } from "@/lib/list-params";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  countInventory,
  listInventory,
  type InventorySort,
} from "@/features/inventory/queries";

export const metadata: Metadata = {
  title: "Inventory",
};

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  low: z.enum(["1"]).optional().catch(undefined),
  sort: z
    .enum(["product", "available_asc", "available_desc", "updated"])
    .default("product").catch("product"),
  page: z.string().optional().catch(undefined),
});

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Inventory"
        description="Stock on hand, reserved, and available at the product-variant level."
      />
    );
  }

  const params = await searchParams;
  const parsed = querySchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    low: typeof params.low === "string" ? params.low : undefined,
    sort: typeof params.sort === "string" ? params.sort : "product",
    page: params.page,
  });

  const context = await requireMemberContext();
  const search = sanitizeSearch(parsed.q);
  const page = parsePage(parsed.page);
  const pageSize = 25;
  const lowOnly = parsed.low === "1";

  const [{ rows, total }, counts] = await Promise.all([
    listInventory({
      storeId: context.membership.storeId,
      search,
      lowOnly,
      sort: parsed.sort as InventorySort,
      page,
      pageSize,
    }),
    countInventory(context.membership.storeId),
  ]);

  const filtered = Boolean(search || lowOnly);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description="Variant-level stock. Available is on hand minus reserved; every change writes an immutable movement."
        status={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              {formatNumber(counts.total)} variants
            </Badge>
            {counts.low > 0 ? (
              <StatusPill
                label={`${formatNumber(counts.low)} low stock`}
                tone="warning"
              />
            ) : null}
          </div>
        }
      />

      <ListToolbar
        searchPlaceholder="Search product or SKU"
        searchValue={search}
        filters={[
          {
            name: "low",
            label: "Filter inventory",
            value: lowOnly ? "1" : "",
            options: [
              { value: "", label: "All stock" },
              { value: "1", label: "Low stock only" },
            ],
          },
        ]}
        sort={{
          name: "sort",
          label: "Sort inventory",
          value: parsed.sort,
          options: [
            { value: "product", label: "Product" },
            { value: "available_asc", label: "Available ↑" },
            { value: "available_desc", label: "Available ↓" },
            { value: "updated", label: "Recently updated" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={
            filtered
              ? "No stock matches those filters"
              : "No inventory records"
          }
          description={
            filtered
              ? "Clear the filters or search a different SKU."
              : "Inventory rows are created with products. Add a product first."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[44rem]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead scope="col">Product</TableHead>
                  <TableHead scope="col">SKU</TableHead>
                  <TableHead scope="col" className="text-right">
                    On hand
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Reserved
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Available
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.variantId} className="h-12">
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/inventory/${item.variantId}`}
                          className="truncate font-medium underline-offset-4 hover:underline"
                        >
                          {item.productTitle}
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.variantTitle}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatNumber(item.onHand)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatNumber(item.reserved)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatNumber(item.available)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusPill
                        label={
                          item.available <= 0
                            ? "Out"
                            : item.isLowStock
                              ? "Low"
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
            path="/inventory"
            params={{
              q: search || undefined,
              low: lowOnly ? "1" : undefined,
              sort: parsed.sort,
            }}
          />
        </>
      )}
    </div>
  );
}
