"use client";

import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-border bg-card p-6"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-danger-surface text-danger">
        <TriangleAlertIcon aria-hidden="true" className="size-4" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">
        This screen could not load
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        The workspace hit an unexpected error. Try again. If it keeps failing,
        the route is likely mid-change rather than serving real data.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
