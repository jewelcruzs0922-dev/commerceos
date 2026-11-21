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
import { Textarea } from "@/components/ui/textarea";
import { updateCustomer } from "@/features/customers/actions";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

export function CustomerEditForm({
  customerId,
  name,
  email,
  phone,
  tags,
  notes,
}: {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  notes: string;
}) {
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await updateCustomer(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not update the customer.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Customer updated.");
      }
      return result;
    },
    initialFormState
  );

  const nameError = fieldError(state, "name");
  const phoneError = fieldError(state, "phone");
  const tagsError = fieldError(state, "tags");
  const notesError = fieldError(state, "notes");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="customerId" value={customerId} />
      <FieldGroup>
        <Field data-invalid={Boolean(nameError) || undefined}>
          <FieldLabel htmlFor="customer-name">Name</FieldLabel>
          <Input
            id="customer-name"
            name="name"
            defaultValue={name}
            aria-invalid={Boolean(nameError) || undefined}
          />
          {nameError ? <FieldError errors={[{ message: nameError }]} /> : null}
        </Field>

        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} readOnly disabled />
          <FieldDescription>
            Email is part of the customer record and cannot be edited here.
          </FieldDescription>
        </Field>

        <Field data-invalid={Boolean(phoneError) || undefined}>
          <FieldLabel htmlFor="customer-phone">Phone</FieldLabel>
          <Input
            id="customer-phone"
            name="phone"
            defaultValue={phone}
            aria-invalid={Boolean(phoneError) || undefined}
          />
          {phoneError ? (
            <FieldError errors={[{ message: phoneError }]} />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(tagsError) || undefined}>
          <FieldLabel htmlFor="customer-tags">Tags</FieldLabel>
          <Input
            id="customer-tags"
            name="tags"
            defaultValue={tags.join(", ")}
            placeholder="vip, wholesale"
            aria-invalid={Boolean(tagsError) || undefined}
          />
          <FieldDescription>Comma-separated, up to 20 tags.</FieldDescription>
          {tagsError ? (
            <FieldError errors={[{ message: tagsError }]} />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(notesError) || undefined}>
          <FieldLabel htmlFor="customer-notes">Internal notes</FieldLabel>
          <Textarea
            id="customer-notes"
            name="notes"
            defaultValue={notes}
            rows={4}
            aria-invalid={Boolean(notesError) || undefined}
          />
          {notesError ? (
            <FieldError errors={[{ message: notesError }]} />
          ) : null}
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <div>
        <SubmitButton pendingLabel="Saving">Save customer</SubmitButton>
      </div>
    </form>
  );
}
