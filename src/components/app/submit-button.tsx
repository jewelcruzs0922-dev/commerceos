"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
