"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberContext } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { slugify } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  collectionFormSchema,
  collectionIdSchema,
  parseProductIds,
} from "@/features/collections/schemas";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

function forbidden(): FormActionState {
  return {
    status: "error",
    message: "You do not have permission to manage collections.",
  };
}

function parseForm(formData: FormData) {
  return collectionFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    imageUrl: formData.get("imageUrl") ?? "",
    productIds: parseProductIds(formData.get("productIdsJson")),
  });
}

export async function createCollection(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "collections:manage")) {
    return forbidden();
  }

  const parsed = parseForm(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const storeId = context.membership.storeId;

  const { data: created, error } = await supabase
    .from("collections")
    .insert({
      store_id: storeId,
      title: data.title,
      slug: data.slug || slugify(data.title),
      description: data.description ?? "",
      status: data.status,
      image_path: data.imageUrl || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return toActionError(error, "Could not create the collection.");
  }

  if (data.productIds.length > 0) {
    const { error: linkError } = await supabase.rpc("set_collection_products", {
      p_collection_id: created.id,
      p_product_ids: data.productIds,
    });

    if (linkError) {
      await supabase.from("collections").delete().eq("id", created.id);
      return toActionError(linkError, "Could not assign products.");
    }
  }

  await logActivity(supabase, {
    storeId,
    actorId: context.userId,
    action: "collection.created",
    entityType: "collection",
    entityId: created.id,
    metadata: { title: data.title, products: data.productIds.length },
  });

  revalidatePath("/collections");
  redirect("/collections");
}

export async function updateCollection(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "collections:manage")) {
    return forbidden();
  }

  const id = collectionIdSchema.safeParse(formData.get("collectionId"));
  const parsed = parseForm(formData);

  if (!id.success || !parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: parsed.success
        ? undefined
        : z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const storeId = context.membership.storeId;

  const { error } = await supabase
    .from("collections")
    .update({
      title: data.title,
      slug: data.slug || slugify(data.title),
      description: data.description ?? "",
      status: data.status,
      image_path: data.imageUrl || null,
    })
    .eq("store_id", storeId)
    .eq("id", id.data);

  if (error) {
    return toActionError(error, "Could not update the collection.");
  }

  const { error: linkError } = await supabase.rpc("set_collection_products", {
    p_collection_id: id.data,
    p_product_ids: data.productIds,
  });

  if (linkError) {
    return toActionError(linkError, "Could not update the product assignment.");
  }

  await logActivity(supabase, {
    storeId,
    actorId: context.userId,
    action: "collection.updated",
    entityType: "collection",
    entityId: id.data,
    metadata: { title: data.title, products: data.productIds.length },
  });

  revalidatePath("/collections");
  redirect("/collections");
}

export async function deleteCollection(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "collections:manage")) {
    return forbidden();
  }

  const id = collectionIdSchema.safeParse(formData.get("collectionId"));

  if (!id.success) {
    return { status: "error", message: "Invalid collection." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("store_id", context.membership.storeId)
    .eq("id", id.data);

  if (error) {
    return toActionError(error, "Could not delete the collection.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: "collection.deleted",
    entityType: "collection",
    entityId: id.data,
  });

  revalidatePath("/collections");
  redirect("/collections");
}
