import Link from "next/link";
import { DatabaseZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SetupNotice() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-card p-5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <DatabaseZapIcon aria-hidden="true" className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Authentication is not configured</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Add the Supabase project URL and publishable key, apply the migrations,
          then reload this page. No credentials are stored in the repository.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/setup">Setup instructions</Link>
      </Button>
    </div>
  );
}
