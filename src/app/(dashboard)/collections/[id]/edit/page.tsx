import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { CollectionForm } from "@/features/collections/components/collection-form";
import {
  deleteCollection,
  updateCollection,
} from "@/features/collections/actions";
import { getCollectionDetail } from "@/features/collections/queries";
import { requireMemberContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/validation/id";

export const metadata: Metadata = {
  title: "Edit collection",
};

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const context = await requireMemberContext();

  if (!can(context.membership.role, "collections:manage")) {
    return <PermissionDenied />;
  }

  const detail = await getCollectionDetail(context.membership.storeId, id);

  if (!detail) {
    notFound();
  }

  const { collection, selectedProductIds, products } = detail;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={collection.title}
        description="Edit the collection details and product assignment."
        actions={
          <ActionButton
            action={deleteCollection}
            payload={{ collectionId: collection.id }}
            label="Delete collection"
            pendingLabel="Deleting"
            variant="destructive"
            destructive
            confirm={{
              title: "Delete this collection?",
              description:
                "The collection is removed. Products themselves are not deleted.",
              confirmLabel: "Delete collection",
            }}
          />
        }
      />
      <CollectionForm
        action={updateCollection}
        collectionId={collection.id}
        selectedProductIds={selectedProductIds}
        products={products}
        initial={{
          title: collection.title,
          slug: collection.slug,
          description: collection.description,
          status: collection.status,
          imageUrl: collection.image_path ?? "",
        }}
      />
    </div>
  );
}
