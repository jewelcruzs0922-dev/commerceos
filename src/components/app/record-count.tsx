import { formatNumber } from "@/lib/format";

export function RecordCount({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
      {formatNumber(value)} {label}
    </span>
  );
}
