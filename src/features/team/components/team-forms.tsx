"use client";

import { useActionState, useState } from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { Button } from "@/components/ui/button";
import {
  Field,
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
import {
  changeMemberRole,
  inviteMember,
  type InviteActionState,
} from "@/features/team/actions";
import { fieldError, initialFormState, type FormActionState } from "@/lib/form-state";

export function InviteMemberForm() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [state, formAction] = useActionState(
    async (previous: InviteActionState, formData: FormData): Promise<InviteActionState> => {
      const result = await inviteMember(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not create the invitation.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Invitation created.");
        setInviteUrl(result.inviteUrl ?? null);
      }
      return result;
    },
    initialFormState
  );

  const emailError = fieldError(state, "email");
  const roleError = fieldError(state, "role");

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <Field data-invalid={Boolean(emailError) || undefined}>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                name="email"
                type="email"
                autoComplete="off"
                placeholder="teammate@example.com"
                required
                aria-invalid={Boolean(emailError) || undefined}
              />
              {emailError ? (
                <FieldError errors={[{ message: emailError }]} />
              ) : null}
            </Field>
            <Field data-invalid={Boolean(roleError) || undefined}>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select name="role" defaultValue="staff">
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              {roleError ? (
                <FieldError errors={[{ message: roleError }]} />
              ) : null}
            </Field>
          </div>
        </FieldGroup>
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingLabel="Creating invite" size="sm">
            Create invitation
          </SubmitButton>
        </div>
      </form>

      {inviteUrl ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium">
            Share this one-time link. It expires in 7 days and only works for
            the invited email.
          </p>
          <div className="flex items-center gap-2">
            <Input value={inviteUrl} readOnly className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success("Invite link copied.");
                } catch {
                  toast.error("Could not copy. Select and copy the link.");
                }
              }}
            >
              <CopyIcon aria-hidden="true" />
              Copy
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            No email is sent by CommerceOS. The link is shown once; if you lose
            it, revoke the invitation and create another.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function MemberRoleForm({
  memberId,
  role,
  canGrantOwner,
}: {
  memberId: string;
  role: string;
  canGrantOwner: boolean;
}) {
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await changeMemberRole(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not change the role.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Role updated.");
      }
      return result;
    },
    initialFormState
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <Select key={role} name="role" defaultValue={role}>
        <SelectTrigger size="sm" aria-label="Member role" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {canGrantOwner ? <SelectItem value="owner">Owner</SelectItem> : null}
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
        </SelectContent>
      </Select>
      <SubmitButton pendingLabel="Saving" variant="outline" size="sm">
        Save
      </SubmitButton>
      {state.message && state.status === "error" ? (
        <span className="text-[11px] text-danger">{state.message}</span>
      ) : null}
    </form>
  );
}

