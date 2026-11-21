"use client";

import { useActionState } from "react";
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
import { fieldError, initialFormState } from "@/lib/form-state";
import { updatePassword } from "@/features/auth/actions";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    updatePassword,
    initialFormState
  );
  const passwordError = fieldError(state, "password");
  const confirmError = fieldError(state, "confirmPassword");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(passwordError) || undefined}>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={
              passwordError
                ? "reset-password-error"
                : "reset-password-hint"
            }
          />
          <FieldDescription id="reset-password-hint">
            At least 8 characters.
          </FieldDescription>
          {passwordError ? (
            <FieldError
              id="reset-password-error"
              errors={[{ message: passwordError }]}
            />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(confirmError) || undefined}>
          <FieldLabel htmlFor="reset-confirm">Confirm new password</FieldLabel>
          <Input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(confirmError) || undefined}
            aria-describedby={
              confirmError ? "reset-confirm-error" : undefined
            }
          />
          {confirmError ? (
            <FieldError
              id="reset-confirm-error"
              errors={[{ message: confirmError }]}
            />
          ) : null}
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Updating password" className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}
