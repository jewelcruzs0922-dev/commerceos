"use client";

import { useState, useTransition } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDemo } from "@/features/auth/actions";

export function DemoButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startDemo();
      if (result.status === "error") {
        setError(result.message ?? "Could not start the demo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        or
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
        disabled={pending}
      >
        <PlayIcon aria-hidden="true" />
        {pending ? "Opening demo" : "Try the read-only demo"}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Guest session with seeded Urban Goods data. No sign-up, card, email, or
        payment.
      </p>
      {error ? (
        <p role="alert" className="text-center text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
