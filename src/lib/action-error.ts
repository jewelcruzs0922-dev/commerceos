import type { FormActionState } from "@/lib/form-state";

export function toActionError(
  error: unknown,
  fallback: string
): FormActionState {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "");

  if (
    message.includes("not authorized") ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return {
      status: "error",
      message: "You do not have permission to perform this action.",
    };
  }

  if (message.includes("duplicate key") || message.includes("unique")) {
    return {
      status: "error",
      message: "That value is already in use in this store.",
    };
  }

  if (message.includes("stock cannot be negative")) {
    return { status: "error", message: "Stock cannot be negative." };
  }

  if (message.includes("refund") || message.includes("refundable")) {
    return {
      status: "error",
      message: "That refund exceeds the refundable total.",
    };
  }

  if (message.includes("fulfilled orders cannot")) {
    return {
      status: "error",
      message: "Fulfilled orders cannot be cancelled.",
    };
  }

  return { status: "error", message: fallback };
}
