import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { ProductForm } from "@/features/products/components/product-form";
import { updateProduct } from "@/features/products/actions";
import { getProductDetail } from "@/features/products/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { centsToDollars } from "@/lib/money";
import { isUuid } from "@/lib/validation/id";
import { can } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Edit product",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return <PermissionDenied />;
  }

  const detail = await getProductDetail(context.membership.storeId, id);

  if (!detail) {
    notFound();
  }

  const { product, variants, imageUrl } = detail;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Edit product"
        description="Update product details, pricing, and existing variants. Stock changes belong in Inventory."
      />
      <ProductForm
        action={updateProduct}
        mode="edit"
        productId={product.id}
        initial={{
          title: product.title,
          slug: product.slug,
          description: product.description,
          status: product.status,
          vendor: product.vendor ?? "",
          productType: product.product_type ?? "",
          imageUrl: imageUrl ?? "",
          variants: variants.map((variant) => ({
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            barcode: variant.barcode ?? "",
            price: centsToDollars(variant.price_cents),
            cost:
              variant.cost_cents === null
                ? ""
                : centsToDollars(variant.cost_cents),
            onHand: String(variant.onHand),
            lowStockThreshold: String(variant.low_stock_threshold),
            existingStock: variant.onHand,
          })),
        }}
      />
    </div>
  );
}
