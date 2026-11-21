"use client";

import { useActionState, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
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
import type {
  OrderCustomerOption,
  OrderVariantOption,
} from "@/features/orders/queries";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";
import { formatMoney } from "@/lib/format";
import { dollarsToCents } from "@/lib/money";

type LineItem = {
  key: string;
  variantId: string;
  quantity: string;
};

export function OrderForm({
  action,
  customers,
  variants,
  idempotencyKey,
}: {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  customers: OrderCustomerOption[];
  variants: OrderVariantOption[];
  idempotencyKey: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [customerId, setCustomerId] = useState("none");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { key: "initial", variantId: "", quantity: "1" },
  ]);
  const [discountCode, setDiscountCode] = useState("");
  const [shipping, setShipping] = useState("0.00");
  const [tax, setTax] = useState("0.00");

  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

  function updateLine(key: string, patch: Partial<LineItem>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { key: crypto.randomUUID(), variantId: "", quantity: "1" },
    ]);
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function selectCustomer(value: string) {
    setCustomerId(value);
    const customer = customers.find((entry) => entry.id === value);
    if (customer) {
      setEmail(customer.email);
    }
  }

  const subtotalCents = lines.reduce((sum, line) => {
    const variant = variantMap.get(line.variantId);
    const quantity = Number(line.quantity);
    if (!variant || !Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }
    return sum + variant.priceCents * Math.floor(quantity);
  }, 0);

  const shippingCents = dollarsToCents(shipping) ?? 0;
  const taxCents = dollarsToCents(tax) ?? 0;
  const estimatedTotalCents = subtotalCents + shippingCents + taxCents;

  const emailError = fieldError(state, "email");
  const itemsError = fieldError(state, "items");
  const shippingError = fieldError(state, "shipping");
  const taxError = fieldError(state, "tax");

  const itemsJson = JSON.stringify(
    lines
      .filter((line) => line.variantId)
      .map((line) => ({
        variantId: line.variantId,
        quantity: Number(line.quantity),
      }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="customerId" value={customerId === "none" ? "" : customerId} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="order-customer" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="order-customer" className="text-sm font-semibold">
                Customer
              </h2>
              <p className="text-xs text-muted-foreground">
                Link a saved customer or record a guest email. The email is required
                on every order.
              </p>
            </div>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="order-customer-select">Saved customer</FieldLabel>
                  <Select value={customerId} onValueChange={selectCustomer}>
                    <SelectTrigger id="order-customer-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Guest / no saved customer</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} · {customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field data-invalid={Boolean(emailError) || undefined}>
                  <FieldLabel htmlFor="order-email">Email</FieldLabel>
                  <Input
                    id="order-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="buyer@example.com"
                    required
                    aria-invalid={Boolean(emailError) || undefined}
                  />
                  {emailError ? (
                    <FieldError errors={[{ message: emailError }]} />
                  ) : null}
                </Field>
              </div>
            </FieldGroup>
          </section>

          <section aria-labelledby="order-items" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h2 id="order-items" className="text-sm font-semibold">
                  Line items
                </h2>
                <p className="text-xs text-muted-foreground">
                  Prices and stock come from the catalog at submit time. The order
                  snapshots the product and price.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <PlusIcon aria-hidden="true" />
                Add item
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {lines.map((line) => {
                const variant = variantMap.get(line.variantId);
                return (
                  <div
                    key={line.key}
                    className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
                  >
                    <Field>
                      <FieldLabel htmlFor={`variant-${line.key}`}>Variant</FieldLabel>
                      <Select
                        value={line.variantId || undefined}
                        onValueChange={(value) => {
                          const selected = variantMap.get(value);
                          const quantity = selected
                            ? Math.min(
                                Math.max(1, Number(line.quantity) || 1),
                                selected.available
                              )
                            : 1;
                          updateLine(line.key, {
                            variantId: value,
                            quantity: String(quantity),
                          });
                        }}
                      >
                        <SelectTrigger id={`variant-${line.key}`} className="w-full">
                          <SelectValue placeholder="Choose a variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {variants.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.productTitle} — {option.variantTitle} ·{" "}
                              {formatMoney(option.priceCents)} · {option.available} left
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`quantity-${line.key}`}>Quantity</FieldLabel>
                      <Input
                        id={`quantity-${line.key}`}
                        type="number"
                        min={1}
                        max={variant?.available ?? undefined}
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.key, { quantity: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">Line total</span>
                      <span className="flex h-9 items-center font-mono text-sm tabular-nums">
                        {formatMoney(
                          (variant?.priceCents ?? 0) *
                            Math.max(1, Number(line.quantity) || 1)
                        )}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove line item"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {itemsError ? (
              <FieldError errors={[{ message: itemsError }]} />
            ) : null}
          </section>

          <section aria-labelledby="order-address" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="order-address" className="text-sm font-semibold">
                Shipping address
              </h2>
              <p className="text-xs text-muted-foreground">
                Optional in this demo. Stored as the order shipping snapshot.
              </p>
            </div>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="address-name">Name</FieldLabel>
                  <Input id="address-name" name="name" autoComplete="name" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address-line1">Address</FieldLabel>
                  <Input id="address-line1" name="line1" autoComplete="address-line1" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address-line2">Apartment or suite</FieldLabel>
                  <Input id="address-line2" name="line2" autoComplete="address-line2" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address-city">City</FieldLabel>
                  <Input id="address-city" name="city" autoComplete="address-level2" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address-region">State or region</FieldLabel>
                  <Input id="address-region" name="region" autoComplete="address-level1" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address-postal">Postal code</FieldLabel>
                  <Input
                    id="address-postal"
                    name="postal_code"
                    autoComplete="postal-code"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="address-country">Country code</FieldLabel>
                  <Input
                    id="address-country"
                    name="country"
                    defaultValue="US"
                    maxLength={2}
                    autoComplete="country"
                  />
                </Field>
              </div>
            </FieldGroup>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-5 rounded-lg border border-border bg-card p-4 xl:sticky xl:top-20">
          <h2 className="text-sm font-semibold">Order summary</h2>

          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-3 text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="font-mono tabular-nums">
                {formatMoney(subtotalCents)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="w-24">
                <Input
                  aria-label="Shipping amount"
                  name="shipping"
                  inputMode="decimal"
                  value={shipping}
                  onChange={(event) => setShipping(event.target.value)}
                  aria-invalid={Boolean(shippingError) || undefined}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="w-24">
                <Input
                  aria-label="Tax amount"
                  name="tax"
                  inputMode="decimal"
                  value={tax}
                  onChange={(event) => setTax(event.target.value)}
                  aria-invalid={Boolean(taxError) || undefined}
                />
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2 font-medium">
              <dt>Estimated total</dt>
              <dd className="font-mono tabular-nums">
                {formatMoney(estimatedTotalCents)}
              </dd>
            </div>
          </dl>
          {shippingError ? (
            <FieldError errors={[{ message: shippingError }]} />
          ) : null}
          {taxError ? <FieldError errors={[{ message: taxError }]} /> : null}

          <Field>
            <FieldLabel htmlFor="order-discount">Discount code</FieldLabel>
            <Input
              id="order-discount"
              name="discountCode"
              value={discountCode}
              onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
              placeholder="SAVE10"
              autoCapitalize="characters"
            />
            <FieldDescription>
              Validated and applied once when the order is created.
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <Checkbox id="order-paid" name="markPaid" defaultChecked />
            <FieldLabel htmlFor="order-paid">
              Record payment as received
            </FieldLabel>
          </Field>
          <p className="-mt-3 text-xs leading-5 text-muted-foreground">
            Demo bookkeeping only. No payment provider is contacted.
          </p>

          <FormMessage state={state} />
          <SubmitButton pendingLabel="Creating order">
            Create order
          </SubmitButton>
        </aside>
      </div>
    </form>
  );
}
