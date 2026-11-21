import { ShieldAlertIcon } from "lucide-react";

export function PermissionDenied({
  title = "You do not have permission",
  description = "Your store role cannot perform this action. Ask an owner or admin to adjust your access.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-border bg-card p-6">
      <span className="flex size-8 items-center justify-center rounded-lg bg-warning-surface text-warning">
        <ShieldAlertIcon aria-hidden="true" className="size-4" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
