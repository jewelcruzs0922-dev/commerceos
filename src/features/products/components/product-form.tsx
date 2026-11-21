"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

export type VariantDraft = {
  id?: string;
  title: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  onHand: string;
  lowStockThreshold: string;
  existingStock?: number;
};

export type ProductFormInitial = {
  title: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  vendor: string;
  productType: string;
  imageUrl: string;
  variants: VariantDraft[];
};

const blankVariant = (): VariantDraft => ({
  title: "Default",
  sku: "",
  barcode: "",
  price: "0.00",
  cost: "",
  onHand: "0",
  lowStockThreshold: "5",
});

export function ProductForm({
  action,
  mode,
  productId,
  initial,
}: {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  mode: "create" | "edit";
  productId?: string;
  initial: ProductFormInitial;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [variants, setVariants] = useState<VariantDraft[]>(initial.variants);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((current) =>
      current.map((variant, i) => (i === index ? { ...variant, ...patch } : variant))
    );
  }

  const titleError = fieldError(state, "title");
  const slugError = fieldError(state, "slug");
  const statusError = fieldError(state, "status");
  const imageError = fieldError(state, "imageUrl");
  const variantError = fieldError(state, "variants");

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {productId ? (
        <input type="hidden" name="productId" value={productId} />
      ) : null}
      <input
        type="hidden"
        name="variantsJson"
        value={JSON.stringify(variants)}
      />
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(titleError) || undefined}>
            <FieldLabel htmlFor="product-title">Title</FieldLabel>
            <Input
              id="product-title"
              name="title"
              defaultValue={initial.title}
              required
              aria-invalid={Boolean(titleError) || undefined}
            />
            {titleError ? <FieldError errors={[{ message: titleError }]} /> : null}
          </Field>

          <Field data-invalid={Boolean(slugError) || undefined}>
            <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
            <Input
              id="product-slug"
              name="slug"
              defaultValue={initial.slug}
              placeholder="Generated from the title"
              aria-invalid={Boolean(slugError) || undefined}
            />
            {slugError ? <FieldError errors={[{ message: slugError }]} /> : null}
          </Field>

          <Field data-invalid={Boolean(statusError) || undefined}>
            <FieldLabel htmlFor="product-status">Status</FieldLabel>
            <Select name="status" defaultValue={initial.status}>
              <SelectTrigger id="product-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            {statusError ? (
              <FieldError errors={[{ message: statusError }]} />
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="product-vendor">Vendor</FieldLabel>
            <Input
              id="product-vendor"
              name="vendor"
              defaultValue={initial.vendor}
              placeholder="Urban Goods"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="product-type">Product type</FieldLabel>
            <Input
              id="product-type"
              name="productType"
              defaultValue={initial.productType}
              placeholder="Bags"
            />
          </Field>

          <Field data-invalid={Boolean(imageError) || undefined}>
            <FieldLabel htmlFor="product-image">Image URL</FieldLabel>
            <Input
              id="product-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(imageError) || undefined}
            />
            <FieldDescription>
              Temporary until Supabase Storage is configured; https only.
            </FieldDescription>
            {imageError ? (
              <FieldError errors={[{ message: imageError }]} />
            ) : null}
          </Field>
        </div>

        {imageUrl && /^https:\/\//.test(imageUrl) ? (
          <Image
            src={imageUrl}
            alt="Product preview"
            width={96}
            height={96}
            unoptimized
            className="size-24 rounded-lg border border-border object-cover"
          />
        ) : null}

        <Field>
          <FieldLabel htmlFor="product-description">Description</FieldLabel>
          <Textarea
            id="product-description"
            name="description"
            defaultValue={initial.description}
            rows={4}
            placeholder="Materials, dimensions, care."
          />
        </Field>
      </FieldGroup>

      <section aria-labelledby="variants-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 id="variants-title" className="text-sm font-semibold">
              Variants
            </h2>
            <p className="text-xs text-muted-foreground">
              SKU is unique per store. Stock for existing variants is adjusted
              from Inventory. Existing variants are kept for order history.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((current) => [...current, blankVariant()])}
          >
            <PlusIcon aria-hidden="true" />
            Add variant
          </Button>
        </div>

        {variantError ? (
          <p role="alert" className="text-sm text-danger">
            {variantError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? `new-${index}`}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {variant.id ? "Variant" : "New variant"} {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove variant ${index + 1}`}
                  title={
                    variant.id
                      ? "Existing variants cannot be removed here"
                      : undefined
                  }
                  disabled={variants.length === 1 || Boolean(variant.id)}
                  onClick={() =>
                    setVariants((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`variant-title-${index}`}>
                    Title
                  </FieldLabel>
                  <Input
                    id={`variant-title-${index}`}
                    value={variant.title}
                    onChange={(event) =>
                      updateVariant(index, { title: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`variant-sku-${index}`}>SKU</FieldLabel>
                  <Input
                    id={`variant-sku-${index}`}
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariant(index, { sku: event.target.value })
                    }
                    className="font-mono"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`variant-barcode-${index}`}>
                    Barcode
                  </FieldLabel>
                  <Input
                    id={`variant-barcode-${index}`}
                    value={variant.barcode}
                    onChange={(event) =>
                      updateVariant(index, { barcode: event.target.value })
                    }
                    className="font-mono"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`variant-price-${index}`}>
                    Price (USD)
                  </FieldLabel>
                  <Input
                    id={`variant-price-${index}`}
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(event) =>
                      updateVariant(index, { price: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`variant-cost-${index}`}>
                    Cost (USD)
                  </FieldLabel>
                  <Input
                    id={`variant-cost-${index}`}
                    inputMode="decimal"
                    value={variant.cost}
                    onChange={(event) =>
                      updateVariant(index, { cost: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`variant-threshold-${index}`}>
                    Low-stock threshold
                  </FieldLabel>
                  <Input
                    id={`variant-threshold-${index}`}
                    inputMode="numeric"
                    value={variant.lowStockThreshold}
                    onChange={(event) =>
                      updateVariant(index, {
                        lowStockThreshold: event.target.value,
                      })
                    }
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`variant-stock-${index}`}>
                    {variant.id ? "On hand" : "Initial stock"}
                  </FieldLabel>
                  <Input
                    id={`variant-stock-${index}`}
                    inputMode="numeric"
                    value={
                      variant.id
                        ? String(variant.existingStock ?? 0)
                        : variant.onHand
                    }
                    disabled={Boolean(variant.id)}
                    onChange={(event) =>
                      updateVariant(index, { onHand: event.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <SubmitButton
          pendingLabel={mode === "create" ? "Creating product" : "Saving changes"}
        >
          {mode === "create" ? "Create product" : "Save changes"}
        </SubmitButton>
        <Button asChild variant="ghost" size="sm">
          <Link href={productId ? `/products/${productId}` : "/products"}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
