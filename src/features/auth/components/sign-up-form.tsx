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
import { signUp } from "@/features/auth/actions";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUp, initialFormState);

  const nameError = fieldError(state, "fullName");
  const emailError = fieldError(state, "email");
  const passwordError = fieldError(state, "password");
  const confirmError = fieldError(state, "confirmPassword");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(nameError) || undefined}>
          <FieldLabel htmlFor="sign-up-name">Full name</FieldLabel>
          <Input
            id="sign-up-name"
            name="fullName"
            autoComplete="name"
            required
            aria-invalid={Boolean(nameError) || undefined}
            aria-describedby={nameError ? "sign-up-name-error" : undefined}
          />
          {nameError ? (
            <FieldError
              id="sign-up-name-error"
              errors={[{ message: nameError }]}
            />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(emailError) || undefined}>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input
            id="sign-up-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? "sign-up-email-error" : undefined}
          />
          {emailError ? (
            <FieldError
              id="sign-up-email-error"
              errors={[{ message: emailError }]}
            />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(passwordError) || undefined}>
          <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
          <Input
            id="sign-up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(passwordError) || undefined}
            aria-describedby={
              passwordError ? "sign-up-password-error" : "sign-up-password-hint"
            }
          />
          <FieldDescription id="sign-up-password-hint">
            At least 8 characters.
          </FieldDescription>
          {passwordError ? (
            <FieldError
              id="sign-up-password-error"
              errors={[{ message: passwordError }]}
            />
          ) : null}
        </Field>

        <Field data-invalid={Boolean(confirmError) || undefined}>
          <FieldLabel htmlFor="sign-up-confirm">Confirm password</FieldLabel>
          <Input
            id="sign-up-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(confirmError) || undefined}
            aria-describedby={
              confirmError ? "sign-up-confirm-error" : undefined
            }
          />
          {confirmError ? (
            <FieldError
              id="sign-up-confirm-error"
              errors={[{ message: confirmError }]}
            />
          ) : null}
        </Field>
      </FieldGroup>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Creating account" className="w-full">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
