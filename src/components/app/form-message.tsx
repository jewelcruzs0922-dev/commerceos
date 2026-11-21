import { cn } from "@/lib/utils";
import type { FormActionState } from "@/lib/form-state";

export function FormMessage({ state }: { state: FormActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm leading-5",
        state.status === "error"
          ? "border-danger/30 bg-danger-surface text-danger"
          : "border-success/30 bg-success-surface text-success"
      )}
    >
      {state.message}
    </div>
  );
}
