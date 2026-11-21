"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/app/submit-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { initialFormState, type FormActionState } from "@/lib/form-state";

type Action = (
  state: FormActionState,
  formData: FormData
) => Promise<FormActionState>;

export function ActionButton({
  action,
  payload,
  label,
  pendingLabel,
  variant = "outline",
  destructive = false,
  confirm,
}: {
  action: Action;
  payload: Record<string, string>;
  label: string;
  pendingLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  destructive?: boolean;
  confirm?: { title: string; description: string; confirmLabel: string };
}) {
  const [open, setOpen] = useState(false);
  const [, formAction] = useActionState(
    async (previous: FormActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === "error") {
        toast.error(result.message ?? "Action failed.");
      }
      if (result.status === "success") {
        toast.success(result.message ?? "Saved.");
        setOpen(false);
      }
      return result;
    },
    initialFormState
  );

  const fields = Object.entries(payload).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

  const submit = (
    <SubmitButton
      pendingLabel={pendingLabel ?? label}
      variant={destructive ? "destructive" : variant}
      size="sm"
    >
      {label}
    </SubmitButton>
  );

  if (!confirm) {
    return (
      <form action={formAction}>
        {fields}
        {submit}
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirm.title}</DialogTitle>
          <DialogDescription>{confirm.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <form action={formAction}>
            {fields}
            <SubmitButton
              pendingLabel={pendingLabel ?? label}
              variant={destructive ? "destructive" : variant}
              size="sm"
            >
              {confirm.confirmLabel}
            </SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
