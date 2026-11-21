"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldError, initialFormState } from "@/lib/form-state";
import { createStore } from "@/features/stores/actions";

export function CreateStoreForm() {
  const [state, formAction] = useActionState(createStore, initialFormState);
  const nameError = fieldError(state, "name");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(nameError) || undefined}>
          <FieldLabel htmlFor="store-name">Store name</FieldLabel>
          <Input
            id="store-name"
            name="name"
            autoComplete="organization"
            placeholder="Urban Goods"
            required
            aria-invalid={Boolean(nameError) || undefined}
            aria-describedby={nameError ? "store-name-error" : undefined}
          />
          {nameError ? (
            <FieldError
              id="store-name-error"
              errors={[{ message: nameError }]}
            />
          ) : null}
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Creating store" className="w-full">
        Create store
      </SubmitButton>
    </form>
  );
}
