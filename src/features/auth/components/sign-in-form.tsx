"use client";

import Link from "next/link";
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
import { signIn } from "@/features/auth/actions";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signIn, initialFormState);
  const emailError = fieldError(state, "email");
  const passwordError = fieldError(state, "password");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <FieldGroup>
        <Field data-invalid={Boolean(emailError) || undefined}>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? "sign-in-email-error" : undefined}
          />
          {emailError ? (
            <FieldError
              id="sign-in-email-error"
              errors={[{ message: emailError }]}
            />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(passwordError) || undefined}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={
              passwordError ? "sign-in-password-error" : undefined
            }
          />
          {passwordError ? (
            <FieldError
              id="sign-in-password-error"
              errors={[{ message: passwordError }]}
            />
          ) : null}
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Signing in" className="w-full">
        Sign in
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        New to CommerceOS?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
