"use client";

import Link from "next/link";
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
import { requestPasswordReset } from "@/features/auth/actions";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialFormState
  );
  const emailError = fieldError(state, "email");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(emailError) || undefined}>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? "forgot-email-error" : undefined}
          />
          <FieldDescription>
            We send a reset link through Supabase Auth. The message is the same
            whether or not an account exists.
          </FieldDescription>
          {emailError ? (
            <FieldError
              id="forgot-email-error"
              errors={[{ message: emailError }]}
            />
          ) : null}
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Sending link" className="w-full">
        Send reset link
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
