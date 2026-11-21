"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberContext } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";
import { toActionError } from "@/lib/action-error";
import type { FormActionState } from "@/lib/form-state";
import { slugify } from "@/lib/format";
import { dollarsToCents } from "@/lib/money";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  parseVariantsJson,
  productFormSchema,
  productIdSchema,
  productStatusSchema,
  type ProductVariantInput,
} from "@/features/products/schemas";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "The data layer is not configured for this deployment.",
  };
}

function forbidden(): FormActionState {
  return {
    status: "error",
    message: "You do not have permission to manage products.",
  };
}

function variantPayload(variants: ProductVariantInput[]) {
  return variants.map((variant, index) => ({
    title: variant.title,
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    price_cents: dollarsToCents(variant.price) ?? 0,
    cost_cents: variant.cost ? dollarsToCents(variant.cost) : null,
    on_hand: variant.onHand,
    low_stock_threshold: variant.lowStockThreshold,
    position: index,
  }));
}

export async function createProduct(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return forbidden();
  }

  const parsed = productFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    vendor: formData.get("vendor") ?? "",
    productType: formData.get("productType") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    variants: parseVariantsJson(formData.get("variantsJson")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.title);
  const supabase = await createClient();

  const { data: created, error } = await supabase.rpc("create_product", {
    p_store_id: context.membership.storeId,
    p_title: data.title,
    p_slug: slug,
    p_description: data.description ?? "",
    p_status: data.status,
    p_vendor: data.vendor || null,
    p_product_type: data.productType || null,
    p_image_url: data.imageUrl || null,
    p_variants: variantPayload(data.variants),
  });

  if (error) {
    return toActionError(error, "Could not create the product.");
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  redirect(`/products/${created}`);
}

export async function updateProduct(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return forbidden();
  }

  const id = productIdSchema.safeParse(formData.get("productId"));

  if (!id.success) {
    return { status: "error", message: "Invalid product." };
  }

  const parsed = productFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    vendor: formData.get("vendor") ?? "",
    productType: formData.get("productType") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    variants: parseVariantsJson(formData.get("variantsJson")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.title);
  const supabase = await createClient();
  const storeId = context.membership.storeId;

  const { error: updateError } = await supabase
    .from("products")
    .update({
      title: data.title,
      slug,
      description: data.description ?? "",
      status: data.status,
      vendor: data.vendor || null,
      product_type: data.productType || null,
      archived_at: data.status === "archived" ? new Date().toISOString() : null,
    })
    .eq("store_id", storeId)
    .eq("id", id.data);

  if (updateError) {
    return toActionError(updateError, "Could not update the product.");
  }

  for (const variant of data.variants) {
    if (variant.id) {
      const { error } = await supabase
        .from("product_variants")
        .update({
          title: variant.title,
          sku: variant.sku,
          barcode: variant.barcode || null,
          price_cents: dollarsToCents(variant.price) ?? 0,
          cost_cents: variant.cost ? dollarsToCents(variant.cost) : null,
          low_stock_threshold: variant.lowStockThreshold,
        })
        .eq("store_id", storeId)
        .eq("product_id", id.data)
        .eq("id", variant.id);

      if (error) {
        return toActionError(error, "Could not update a variant.");
      }
    } else {
      const { error } = await supabase.rpc("add_product_variant", {
        p_store_id: storeId,
        p_product_id: id.data,
        p_title: variant.title,
        p_sku: variant.sku,
        p_barcode: variant.barcode || null,
        p_price_cents: dollarsToCents(variant.price) ?? 0,
        p_cost_cents: variant.cost ? dollarsToCents(variant.cost) : null,
        p_on_hand: variant.onHand,
        p_low_stock_threshold: variant.lowStockThreshold,
      });

      if (error) {
        return toActionError(error, "Could not add a variant.");
      }
    }
  }

  await supabase
    .from("product_images")
    .delete()
    .eq("store_id", storeId)
    .eq("product_id", id.data);

  if (data.imageUrl) {
    await supabase.from("product_images").insert({
      store_id: storeId,
      product_id: id.data,
      storage_path: data.imageUrl,
      alt_text: data.title,
      position: 0,
    });
  }

  await logActivity(supabase, {
    storeId,
    actorId: context.userId,
    action: "product.updated",
    entityType: "product",
    entityId: id.data,
    metadata: { title: data.title, status: data.status },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id.data}`);
  revalidatePath("/inventory");
  redirect(`/products/${id.data}`);
}

export async function setProductStatus(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return forbidden();
  }

  const id = productIdSchema.safeParse(formData.get("productId"));
  const status = productStatusSchema.safeParse(formData.get("status"));

  if (!id.success || !status.success) {
    return { status: "error", message: "Invalid product change." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      status: status.data,
      archived_at: status.data === "archived" ? new Date().toISOString() : null,
    })
    .eq("store_id", context.membership.storeId)
    .eq("id", id.data);

  if (error) {
    return toActionError(error, "Could not change the product status.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: `product.${status.data}`,
    entityType: "product",
    entityId: id.data,
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id.data}`);

  return {
    status: "success",
    message: status.data === "archived" ? "Product archived." : "Product restored.",
  };
}

export async function deleteProduct(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return forbidden();
  }

  const id = productIdSchema.safeParse(formData.get("productId"));

  if (!id.success) {
    return { status: "error", message: "Invalid product." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("store_id", context.membership.storeId)
    .eq("id", id.data);

  if (error) {
    return toActionError(error, "Could not delete the product.");
  }

  await logActivity(supabase, {
    storeId: context.membership.storeId,
    actorId: context.userId,
    action: "product.deleted",
    entityType: "product",
    entityId: id.data,
  });

  revalidatePath("/products");
  revalidatePath("/inventory");
  redirect("/products");
}

export async function duplicateProduct(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "products:manage")) {
    return forbidden();
  }

  const id = productIdSchema.safeParse(formData.get("productId"));

  if (!id.success) {
    return { status: "error", message: "Invalid product." };
  }

  const supabase = await createClient();
  const { data: copyId, error } = await supabase.rpc("duplicate_product", {
    p_store_id: context.membership.storeId,
    p_product_id: id.data,
  });

  if (error) {
    return toActionError(error, "Could not duplicate the product.");
  }

  revalidatePath("/products");
  redirect(`/products/${copyId}`);
}
