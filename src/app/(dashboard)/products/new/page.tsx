import type { Metadata } from "next";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { ProductForm } from "@/features/products/components/product-form";
import { createProduct } from "@/features/products/actions";
import { requireMemberContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "New product",
};

export default async function NewProductPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="New product"
        description="Create a product with its variants, pricing, and initial stock."
      />
    );
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return <PermissionDenied />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="New product"
        description="Create the product, its variants, pricing, and initial stock in one atomic operation."
      />
      <ProductForm
        action={createProduct}
        mode="create"
        initial={{
          title: "",
          slug: "",
          description: "",
          status: "draft",
          vendor: "",
          productType: "",
          imageUrl: "",
          variants: [
            {
              title: "Default",
              sku: "",
              barcode: "",
              price: "0.00",
              cost: "",
              onHand: "0",
              lowStockThreshold: "5",
            },
          ],
        }}
      />
    </div>
  );
}
