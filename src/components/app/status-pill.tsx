import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneClasses = {
  success: "border-success/30 bg-success-surface text-success",
  warning: "border-warning/30 bg-warning-surface text-warning",
  danger: "border-danger/30 bg-danger-surface text-danger",
  info: "border-info/30 bg-info-surface text-info",
  neutral:
    "border-neutral-status/30 bg-neutral-status-surface text-neutral-status",
  brand: "border-primary/30 bg-primary/10 text-primary",
} as const;

export type StatusTone = keyof typeof toneClasses;

export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", toneClasses[tone], className)}
    >
      {label}
    </Badge>
  );
}

export function humanizeStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function toneForStatus(status: string): StatusTone {
  switch (status) {
    case "active":
    case "paid":
    case "fulfilled":
    case "completed":
    case "approved":
      return "success";
    case "draft":
    case "pending":
    case "requested":
    case "unfulfilled":
    case "authorized":
      return "warning";
    case "archived":
    case "cancelled":
    case "voided":
    case "failed":
    case "rejected":
    case "expired":
      return "danger";
    case "processing":
    case "partially_fulfilled":
    case "partially_refunded":
    case "in_transit":
    case "received":
      return "info";
    case "refunded":
    case "returned":
      return "brand";
    default:
      return "neutral";
  }
}
