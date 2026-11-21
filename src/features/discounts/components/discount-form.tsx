"use client";

import Link from "next/link";
import { useActionState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

export type DiscountFormInitial = {
  code: string;
  description: string;
  type: "percentage" | "fixed_amount";
  value: string;
  startsAt: string;
  endsAt: string;
  minimumSubtotal: string;
  usageLimit: string;
  isActive: boolean;
};

export function DiscountForm({
  action,
  discountId,
  initial,
}: {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  discountId?: string;
  initial: DiscountFormInitial;
}) {
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Discount change failed.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Discount saved.");
      }
      return result;
    },
    initialFormState
  );

  const codeError = fieldError(state, "code");
  const typeError = fieldError(state, "type");
  const valueError = fieldError(state, "value");
  const startsError = fieldError(state, "startsAt");
  const endsError = fieldError(state, "endsAt");
  const minimumError = fieldError(state, "minimumSubtotal");
  const limitError = fieldError(state, "usageLimit");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {discountId ? (
        <input type="hidden" name="discountId" value={discountId} />
      ) : null}

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(codeError) || undefined}>
            <FieldLabel htmlFor="discount-code">Code</FieldLabel>
            <Input
              id="discount-code"
              name="code"
              defaultValue={initial.code}
              placeholder="WELCOME10"
              className="font-mono uppercase"
              required
              aria-invalid={Boolean(codeError) || undefined}
            />
            <FieldDescription>
              Stored uppercase and unique per store.
            </FieldDescription>
            {codeError ? <FieldError errors={[{ message: codeError }]} /> : null}
          </Field>

          <Field data-invalid={Boolean(typeError) || undefined}>
            <FieldLabel htmlFor="discount-type">Type</FieldLabel>
            <Select name="type" defaultValue={initial.type}>
              <SelectTrigger id="discount-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed_amount">Fixed amount (USD)</SelectItem>
              </SelectContent>
            </Select>
            {typeError ? <FieldError errors={[{ message: typeError }]} /> : null}
          </Field>

          <Field data-invalid={Boolean(valueError) || undefined}>
            <FieldLabel htmlFor="discount-value">Value</FieldLabel>
            <Input
              id="discount-value"
              name="value"
              defaultValue={initial.value}
              placeholder="10 or 5.00"
              inputMode="decimal"
              required
              aria-invalid={Boolean(valueError) || undefined}
            />
            <FieldDescription>
              Percentage is 1–100. Fixed amount is in dollars and cannot exceed
              the order subtotal when redeemed.
            </FieldDescription>
            {valueError ? (
              <FieldError errors={[{ message: valueError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(minimumError) || undefined}>
            <FieldLabel htmlFor="discount-minimum">
              Minimum subtotal (USD)
            </FieldLabel>
            <Input
              id="discount-minimum"
              name="minimumSubtotal"
              defaultValue={initial.minimumSubtotal}
              placeholder="0.00"
              inputMode="decimal"
              aria-invalid={Boolean(minimumError) || undefined}
            />
            {minimumError ? (
              <FieldError errors={[{ message: minimumError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(startsError) || undefined}>
            <FieldLabel htmlFor="discount-starts">Starts at</FieldLabel>
            <Input
              id="discount-starts"
              name="startsAt"
              type="datetime-local"
              defaultValue={initial.startsAt}
              aria-invalid={Boolean(startsError) || undefined}
            />
            <FieldDescription>Optional. Blank starts immediately.</FieldDescription>
            {startsError ? (
              <FieldError errors={[{ message: startsError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(endsError) || undefined}>
            <FieldLabel htmlFor="discount-ends">Ends at</FieldLabel>
            <Input
              id="discount-ends"
              name="endsAt"
              type="datetime-local"
              defaultValue={initial.endsAt}
              aria-invalid={Boolean(endsError) || undefined}
            />
            <FieldDescription>Optional. Blank never expires.</FieldDescription>
            {endsError ? (
              <FieldError errors={[{ message: endsError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(limitError) || undefined}>
            <FieldLabel htmlFor="discount-limit">Usage limit</FieldLabel>
            <Input
              id="discount-limit"
              name="usageLimit"
              defaultValue={initial.usageLimit}
              placeholder="Unlimited"
              inputMode="numeric"
              aria-invalid={Boolean(limitError) || undefined}
            />
            {limitError ? (
              <FieldError errors={[{ message: limitError }]} />
            ) : null}
          </Field>

          <Field orientation="horizontal" className="items-center">
            <Checkbox
              id="discount-active"
              name="isActive"
              defaultChecked={initial.isActive}
            />
            <FieldLabel htmlFor="discount-active">Active</FieldLabel>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="discount-description">Description</FieldLabel>
          <Textarea
            id="discount-description"
            name="description"
            defaultValue={initial.description}
            rows={2}
            placeholder="Internal note shown to staff."
          />
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <SubmitButton pendingLabel={discountId ? "Saving" : "Creating"}>
          {discountId ? "Save discount" : "Create discount"}
        </SubmitButton>
        <Button asChild variant="ghost" size="sm">
          <Link href="/discounts">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
