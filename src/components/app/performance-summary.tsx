import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  MinusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PerformanceMetric = {
  label: string;
  value: string;
  delta: number | null;
  comparison: string;
};

function Delta({
  delta,
  comparison,
  inverse = false,
}: PerformanceMetric & { inverse?: boolean }) {
  if (delta === null) {
    return (
      <span
        className={cn(
          "text-xs leading-5",
          inverse ? "text-sidebar-foreground/85" : "text-muted-foreground"
        )}
      >
        No prior-period data
      </span>
    );
  }

  const flat = Math.abs(delta) < 0.05;
  const Icon = flat
    ? MinusIcon
    : delta > 0
      ? ArrowUpRightIcon
      : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs leading-5",
        inverse
          ? delta < 0 && !flat
            ? "text-[#ffd7d2]"
            : "text-highlight"
          : flat
            ? "text-muted-foreground"
            : delta > 0
              ? "text-success"
              : "text-danger"
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="font-mono font-medium tabular-nums">
        {flat ? "0.0" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}%
      </span>
      <span
        className={cn(
          inverse ? "text-sidebar-foreground/85" : "text-muted-foreground"
        )}
      >
        {comparison}
      </span>
    </span>
  );
}

export function PerformanceSummary({
  primary,
  support,
}: {
  primary: PerformanceMetric;
  support: PerformanceMetric[];
}) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border bg-border gap-px lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      <div className="bg-sidebar p-5 text-sidebar-foreground sm:p-6">
        <p className="text-xs font-medium text-sidebar-foreground/85">
          {primary.label}
        </p>
        <p className="mt-2 font-mono text-[32px] leading-10 font-semibold tabular-nums sm:text-[36px]">
          {primary.value}
        </p>
        <div className="mt-2">
          <Delta {...primary} inverse />
        </div>
      </div>
      <div className="grid divide-y divide-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {support.map((metric) => (
          <div
            key={metric.label}
            className="flex min-w-0 items-baseline justify-between gap-3 p-4 sm:block sm:p-5"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </p>
            <div className="flex shrink-0 flex-col items-end sm:mt-1.5 sm:items-start">
              <p className="font-mono text-[22px] leading-7 font-semibold tabular-nums">
                {metric.value}
              </p>
              <div className="mt-0.5 sm:mt-1">
                <Delta {...metric} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
