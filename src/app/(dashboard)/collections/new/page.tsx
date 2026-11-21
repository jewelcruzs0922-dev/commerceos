import type { Metadata } from "next";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { CollectionForm } from "@/features/collections/components/collection-form";
import { createCollection } from "@/features/collections/actions";
import { listProductOptions } from "@/features/collections/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "New collection",
};

export default async function NewCollectionPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="New collection"
        description="Create a curated group and assign products."
      />
    );
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "collections:manage")) {
    return <PermissionDenied />;
  }

  const products = await listProductOptions(context.membership.storeId);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="New collection"
        description="Create a collection and choose the products it contains."
      />
      <CollectionForm
        action={createCollection}
        selectedProductIds={[]}
        products={products}
        initial={{
          title: "",
          slug: "",
          description: "",
          status: "draft",
          imageUrl: "",
        }}
      />
    </div>
  );
}
