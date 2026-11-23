import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
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
import { formatMoney, formatNumber } from "@/lib/format";
import { parsePage, sanitizeSearch } from "@/lib/list-params";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isSafeImageUrl } from "@/lib/validation/url";
import { listProducts } from "@/features/products/queries";

export const metadata: Metadata = {
  title: "Products",
};

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z.enum(["draft", "active", "archived"]).optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "name", "status"]).default("newest").catch("newest"),
  page: z.string().optional().catch(undefined),
});

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Products"
        description="The catalog record for every product, with variants, media, pricing, and inventory."
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

  const { rows, total } = await listProducts({
    storeId: context.membership.storeId,
    search,
    status: parsed.status ?? null,
    sort: parsed.sort,
    page,
    pageSize,
  });

  const canManage = can(context.membership.role, "products:manage");
  const filtered = Boolean(search || parsed.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        status={
          <RecordCount value={total} label="products" />
        }
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href="/products/new">
                <PlusIcon aria-hidden="true" />
                New product
              </Link>
            </Button>
          ) : null
        }
      />

      <ListToolbar
        searchPlaceholder="Search products or SKU"
        searchValue={search}
        filters={[
          {
            name: "status",
            label: "Filter by status",
            value: parsed.status ?? "",
            options: [
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
        sort={{
          name: "sort",
          label: "Sort products",
          value: parsed.sort,
          options: [
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "name", label: "Name" },
            { value: "status", label: "Status" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={filtered ? "No products match those filters" : "No products yet"}
          description={
            filtered
              ? "Try a different search or clear the filters. Search covers product titles, vendors, and SKUs."
              : "Create the first product to start building the Urban Goods catalog."
          }
          action={
            canManage ? (
              <Button asChild size="sm">
                <Link href="/products/new">
                  <PlusIcon aria-hidden="true" />
                  New product
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="ledger-table">
            <Table className="min-w-0 sm:min-w-[34rem] lg:min-w-[46rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Product</TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">Status</TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Variants
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    From
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right md:table-cell">
                    On hand
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((product) => (
                  <TableRow key={product.id} className="h-14">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {isSafeImageUrl(product.imageUrl) ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="size-9 shrink-0 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs text-muted-foreground"
                          >
                            {product.title.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/products/${product.id}`}
                            className="truncate font-medium underline-offset-4 hover:underline"
                          >
                            {product.title}
                          </Link>
                          <span className="truncate text-xs text-muted-foreground">
                            {product.vendor || product.slug}
                          </span>
                          <span className="mt-1 sm:hidden">
                            <StatusPill
                              label={product.status}
                              tone={toneForStatus(product.status)}
                            />
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill
                        label={product.status}
                        tone={toneForStatus(product.status)}
                      />
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                      {product.variantCount}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(product.minPriceCents)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">
                      {formatNumber(product.totalOnHand)}
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
            path="/products"
            params={{ q: search || undefined, status: parsed.status, sort: parsed.sort }}
          />
        </>
      )}
    </div>
  );
}
