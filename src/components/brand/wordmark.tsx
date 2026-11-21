import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <path
        d="M22.3 9.3A9.5 9.5 0 1 0 22.3 22.7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M19.5 16h7.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className="size-6" />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">
        CommerceOS
      </span>
    </span>
  );
}
