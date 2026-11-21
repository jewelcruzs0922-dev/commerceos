"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
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
import { adjustStock } from "@/features/inventory/actions";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

export function AdjustmentForm({ variantId }: { variantId: string }) {
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await adjustStock(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Adjustment failed.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Inventory updated.");
      }
      return result;
    },
    initialFormState
  );

  const deltaError = fieldError(state, "delta");
  const reasonError = fieldError(state, "reason");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="variantId" value={variantId} />
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(deltaError) || undefined}>
            <FieldLabel htmlFor="adjust-delta">Adjustment</FieldLabel>
            <Input
              id="adjust-delta"
              name="delta"
              inputMode="numeric"
              placeholder="e.g. 12 or -3"
              required
              aria-invalid={Boolean(deltaError) || undefined}
            />
            <FieldDescription>
              Positive adds stock; negative removes it. Zero is rejected.
            </FieldDescription>
            {deltaError ? (
              <FieldError errors={[{ message: deltaError }]} />
            ) : null}
          </Field>

          <Field data-invalid={Boolean(reasonError) || undefined}>
            <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
            <Select name="reason" defaultValue="restock">
              <SelectTrigger id="adjust-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="adjustment">Correction</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
            {reasonError ? (
              <FieldError errors={[{ message: reasonError }]} />
            ) : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="adjust-note">Note</FieldLabel>
          <Input
            id="adjust-note"
            name="note"
            maxLength={200}
            placeholder="Purchase order, count correction, damage report."
          />
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <div>
        <SubmitButton pendingLabel="Applying">Apply adjustment</SubmitButton>
      </div>
    </form>
  );
}
