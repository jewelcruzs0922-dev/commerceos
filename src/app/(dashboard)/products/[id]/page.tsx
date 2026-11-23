import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArchiveIcon,
  PencilIcon,
} from "lucide-react";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader } from "@/components/app/page-header";
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
import {
  deleteProduct,
  duplicateProduct,
  setProductStatus,
} from "@/features/products/actions";
import { getProductDetail } from "@/features/products/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { isUuid } from "@/lib/validation/id";
import { isSafeImageUrl } from "@/lib/validation/url";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Product",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const context = await requireMemberContext();
  const detail = await getProductDetail(context.membership.storeId, id);

  if (!detail) {
    notFound();
  }

  const canManage = can(context.membership.role, "products:manage");

  const { product, variants, imageUrl } = detail;
  const totalOnHand = variants.reduce((sum, variant) => sum + variant.onHand, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={product.title}
        description={
          product.description
            ? product.description.slice(0, 220)
            : "No description provided."
        }
        status={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              label={product.status}
              tone={toneForStatus(product.status)}
            />
            {product.vendor ? (
              <span className="text-xs text-muted-foreground">
                {product.vendor}
              </span>
            ) : null}
          </div>
        }
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/products/${product.id}/edit`}>
                  <PencilIcon aria-hidden="true" />
                  Edit
                </Link>
              </Button>
              <ActionButton
                action={duplicateProduct}
                payload={{ productId: product.id }}
                label="Duplicate"
                pendingLabel="Duplicating"
              />
              {product.status === "archived" ? (
                <ActionButton
                  action={setProductStatus}
                  payload={{ productId: product.id, status: "active" }}
                  label="Restore"
                  pendingLabel="Restoring"
                />
              ) : (
                <ActionButton
                  action={setProductStatus}
                  payload={{ productId: product.id, status: "archived" }}
                  label="Archive"
                  pendingLabel="Archiving"
                />
              )}
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {isSafeImageUrl(imageUrl) ? (
            <Image
              src={imageUrl}
              alt={product.title}
              width={320}
              height={320}
              unoptimized
              loading="eager"
              className="aspect-square w-full rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border bg-card font-mono text-3xl text-muted-foreground">
              {product.title.slice(0, 1).toUpperCase()}
            </div>
          )}

          <dl className="flex flex-col gap-2.5 border-y border-border py-3 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Total on hand</dt>
              <dd className="font-mono tabular-nums">
                {formatNumber(totalOnHand)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="truncate font-mono">{product.slug}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Type</dt>
              <dd>{product.product_type || "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(product.created_at)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDate(product.updated_at)}</dd>
            </div>
          </dl>
        </div>

        <section aria-labelledby="variants-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="variants-title" className="text-sm font-semibold">
              Variants
            </h2>
            {canManage ? (
              <Link
                href={`/products/${product.id}/edit`}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Add or edit variants
              </Link>
            ) : null}
          </div>

          <div className="ledger-table">
            <Table className="min-w-0 lg:min-w-[40rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Variant</TableHead>
                  <TableHead scope="col" className="text-right">
                    Price
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Cost
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right md:table-cell">
                    On hand
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right md:table-cell">
                    Reserved
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Available
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id} className="h-12">
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/inventory/${variant.id}`}
                          className="truncate font-medium underline-offset-4 hover:underline"
                        >
                          {variant.title}
                        </Link>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {variant.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatMoney(variant.price_cents)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                      {variant.cost_cents === null
                        ? "—"
                        : formatMoney(variant.cost_cents)}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">
                      {variant.onHand}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">
                      {variant.reserved}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {variant.onHand - variant.reserved}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Order line items keep their own product, SKU, and price snapshots.
            Editing or deleting this product does not rewrite order history.
          </p>
        </section>
      </div>

      {canManage ? (
        <section
          aria-labelledby="danger-title"
          className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger-surface/40 p-4"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="danger-title" className="text-sm font-semibold">
              Delete product
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Removes this product, its variants, images, and stock rows.
              Historical order items keep their snapshots.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              action={deleteProduct}
              payload={{ productId: product.id }}
              label="Delete product"
              pendingLabel="Deleting"
              variant="destructive"
              destructive
              confirm={{
                title: "Delete this product?",
                description:
                  "The product and its stock rows are removed. This cannot be undone from the interface.",
                confirmLabel: "Delete product",
              }}
            />
          </div>
        </section>
      ) : null}

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">
            <ArchiveIcon aria-hidden="true" />
            Back to products
          </Link>
        </Button>
      </div>
    </div>
  );
}
