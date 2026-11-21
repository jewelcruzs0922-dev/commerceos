"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/app/form-message";
import { SubmitButton } from "@/components/app/submit-button";
import { acceptInvitation } from "@/features/team/actions";
import { initialFormState, type FormActionState } from "@/lib/form-state";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await acceptInvitation(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not accept the invitation.");
      }
      return result;
    },
    initialFormState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Joining">Join store</SubmitButton>
    </form>
  );
}
