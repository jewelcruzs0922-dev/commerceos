import { cn } from "@/lib/utils";

const toneClasses = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-muted-foreground",
  brand: "text-primary",
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
    <span
      className={cn(
        "inline-flex items-center text-[13px] font-semibold",
        toneClasses[tone],
        className
      )}
    >
      <span className="first-letter:uppercase">{label}</span>
    </span>
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
