"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type ProductOption = {
  id: string;
  title: string;
  status: string;
  slug: string;
};

export function CollectionForm({
  action,
  collectionId,
  initial,
  products,
  selectedProductIds,
}: {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  collectionId?: string;
  selectedProductIds: string[];
  initial: {
    title: string;
    slug: string;
    description: string;
    status: "draft" | "active" | "archived";
    imageUrl: string;
  };
  products: ProductOption[];
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [selected, setSelected] = useState<string[]>(selectedProductIds);
  const [filter, setFilter] = useState("");


  const visibleProducts = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) {
      return products;
    }
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term)
    );
  }, [filter, products]);

  const titleError = fieldError(state, "title");
  const slugError = fieldError(state, "slug");
  const statusError = fieldError(state, "status");
  const imageError = fieldError(state, "imageUrl");

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {collectionId ? (
        <input type="hidden" name="collectionId" value={collectionId} />
      ) : null}
      <input type="hidden" name="productIdsJson" value={JSON.stringify(selected)} />

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(titleError) || undefined}>
            <FieldLabel htmlFor="collection-title">Title</FieldLabel>
            <Input
              id="collection-title"
              name="title"
              defaultValue={initial.title}
              required
              aria-invalid={Boolean(titleError) || undefined}
            />
            {titleError ? (
              <FieldError errors={[{ message: titleError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(slugError) || undefined}>
            <FieldLabel htmlFor="collection-slug">Slug</FieldLabel>
            <Input
              id="collection-slug"
              name="slug"
              defaultValue={initial.slug}
              placeholder="Generated from the title"
              aria-invalid={Boolean(slugError) || undefined}
            />
            {slugError ? (
              <FieldError errors={[{ message: slugError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(statusError) || undefined}>
            <FieldLabel htmlFor="collection-status">Status</FieldLabel>
            <Select name="status" defaultValue={initial.status}>
              <SelectTrigger id="collection-status" className="w-full">
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

          <Field data-invalid={Boolean(imageError) || undefined}>
            <FieldLabel htmlFor="collection-image">Image URL</FieldLabel>
            <Input
              id="collection-image"
              name="imageUrl"
              defaultValue={initial.imageUrl}
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

        <Field>
          <FieldLabel htmlFor="collection-description">Description</FieldLabel>
          <Textarea
            id="collection-description"
            name="description"
            defaultValue={initial.description}
            rows={3}
          />
        </Field>
      </FieldGroup>

      <section aria-labelledby="products-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 id="products-title" className="text-sm font-semibold">
              Products
            </h2>
            <p className="text-xs text-muted-foreground">
              {selected.length} selected. Assigned products appear in this order.
            </p>
          </div>
          <div className="relative flex w-full items-center sm:w-64">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
            />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter products"
              aria-label="Filter products"
              className="h-8 pl-8"
            />
          </div>
        </div>

        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No products exist yet. Create a product first.
          </p>
        ) : visibleProducts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No products match that filter.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto rounded-lg border border-border bg-card">
            {visibleProducts.map((product) => {
              const checked = selected.includes(product.id);
              return (
                <li
                  key={product.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0"
                >
                  <Checkbox
                    id={`collection-product-${product.id}`}
                    checked={checked}
                    onCheckedChange={(value) => {
                      const isChecked = value === true;
                      setSelected((current) =>
                        isChecked
                          ? [...current, product.id]
                          : current.filter((id) => id !== product.id)
                      );
                    }}
                  />
                  <label
                    htmlFor={`collection-product-${product.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2"
                  >
                    <span className="truncate text-sm">{product.title}</span>
                    <StatusPill label={product.status} />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <SubmitButton pendingLabel={collectionId ? "Saving" : "Creating"}>
          {collectionId ? "Save collection" : "Create collection"}
        </SubmitButton>
        <Button asChild variant="ghost" size="sm">
          <Link href="/collections">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
