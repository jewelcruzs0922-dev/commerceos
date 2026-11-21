"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
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
  changePassword,
  updateNotificationSettings,
  updateProfileSettings,
  updateStoreSettings,
} from "@/features/settings/actions";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

function useSettingsAction(
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>
) {
  return useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not save.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Saved.");
      }
      return result;
    },
    initialFormState
  );
}

export function StoreSettingsForm({
  name,
  timezone,
  currency,
  logoUrl,
}: {
  name: string;
  timezone: string;
  currency: string;
  logoUrl: string;
}) {
  const [state, formAction] = useSettingsAction(updateStoreSettings);
  const nameError = fieldError(state, "name");
  const timezoneError = fieldError(state, "timezone");
  const logoError = fieldError(state, "logoUrl");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(nameError) || undefined}>
            <FieldLabel htmlFor="store-name">Store name</FieldLabel>
            <Input
              id="store-name"
              name="name"
              defaultValue={name}
              required
              aria-invalid={Boolean(nameError) || undefined}
            />
            {nameError ? <FieldError errors={[{ message: nameError }]} /> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="store-currency">Currency</FieldLabel>
            <Input id="store-currency" value={currency} readOnly disabled />
            <FieldDescription>
              Fixed to USD in this build; amounts are stored in integer cents.
            </FieldDescription>
          </Field>
          <Field data-invalid={Boolean(timezoneError) || undefined}>
            <FieldLabel htmlFor="store-timezone">Timezone</FieldLabel>
            <Input
              id="store-timezone"
              name="timezone"
              defaultValue={timezone}
              placeholder="America/New_York"
              aria-invalid={Boolean(timezoneError) || undefined}
            />
            <FieldDescription>
              IANA timezone. Used for analytics day boundaries and display.
            </FieldDescription>
            {timezoneError ? (
              <FieldError errors={[{ message: timezoneError }]} />
            ) : null}
          </Field>
          <Field data-invalid={Boolean(logoError) || undefined}>
            <FieldLabel htmlFor="store-logo">Logo URL</FieldLabel>
            <Input
              id="store-logo"
              name="logoUrl"
              defaultValue={logoUrl}
              placeholder="https://…"
              aria-invalid={Boolean(logoError) || undefined}
            />
            {logoError ? <FieldError errors={[{ message: logoError }]} /> : null}
          </Field>
        </div>
      </FieldGroup>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Saving">Save store</SubmitButton>
      </div>
    </form>
  );
}

export function ProfileSettingsForm({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  avatarUrl: string;
}) {
  const [state, formAction] = useSettingsAction(updateProfileSettings);
  const nameError = fieldError(state, "fullName");
  const avatarError = fieldError(state, "avatarUrl");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(nameError) || undefined}>
            <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
            <Input
              id="profile-name"
              name="fullName"
              defaultValue={fullName}
              required
              aria-invalid={Boolean(nameError) || undefined}
            />
            {nameError ? (
              <FieldError errors={[{ message: nameError }]} />
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-email">Email</FieldLabel>
            <Input id="profile-email" value={email} readOnly disabled />
            <FieldDescription>
              Managed by Supabase Auth; change it through the auth flow.
            </FieldDescription>
          </Field>
          <Field data-invalid={Boolean(avatarError) || undefined}>
            <FieldLabel htmlFor="profile-avatar">Avatar URL</FieldLabel>
            <Input
              id="profile-avatar"
              name="avatarUrl"
              defaultValue={avatarUrl}
              placeholder="https://…"
              aria-invalid={Boolean(avatarError) || undefined}
            />
            {avatarError ? (
              <FieldError errors={[{ message: avatarError }]} />
            ) : null}
          </Field>
        </div>
      </FieldGroup>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Saving">Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function NotificationSettingsForm({
  lowStock,
  newReturns,
  weeklySummary,
}: {
  lowStock: boolean;
  newReturns: boolean;
  weeklySummary: boolean;
}) {
  const [state, formAction] = useSettingsAction(updateNotificationSettings);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <Checkbox id="notify-low" name="lowStock" defaultChecked={lowStock} />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="notify-low" className="text-sm font-medium">
              Low-stock alerts
            </label>
            <p className="text-xs text-muted-foreground">
              Show inventory below its variant threshold in the workspace.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="notify-returns"
            name="newReturns"
            defaultChecked={newReturns}
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="notify-returns" className="text-sm font-medium">
              New return requests
            </label>
            <p className="text-xs text-muted-foreground">
              Alert when a return enters the requested state.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="notify-weekly"
            name="weeklySummary"
            defaultChecked={weeklySummary}
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="notify-weekly" className="text-sm font-medium">
              Weekly summary
            </label>
            <p className="text-xs text-muted-foreground">
              Email summaries are not sent by this build; the preference is
              stored for a future notification worker.
            </p>
          </div>
        </div>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Saving">
          Save notifications
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordSettingsForm() {
  const [state, formAction] = useSettingsAction(changePassword);
  const passwordError = fieldError(state, "password");
  const confirmError = fieldError(state, "confirmPassword");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(passwordError) || undefined}>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(passwordError) || undefined}
            />
            {passwordError ? (
              <FieldError errors={[{ message: passwordError }]} />
            ) : null}
          </Field>
          <Field data-invalid={Boolean(confirmError) || undefined}>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(confirmError) || undefined}
            />
            {confirmError ? (
              <FieldError errors={[{ message: confirmError }]} />
            ) : null}
          </Field>
        </div>
      </FieldGroup>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Updating">Update password</SubmitButton>
      </div>
    </form>
  );
}
