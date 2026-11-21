import { z } from "zod";
import { dollarsToCents } from "@/lib/money";

export function parseLocalDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const discountFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Use at least 3 characters.")
      .max(32, "Use 32 characters or fewer.")
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores.")
      .transform((value) => value.toUpperCase()),
    description: z.string().trim().max(500).optional(),
    type: z.enum(["percentage", "fixed_amount"]),
    value: z.string().trim().min(1, "Enter a value."),
    startsAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
    minimumSubtotal: z.string().trim().optional(),
    usageLimit: z.string().trim().optional(),
    isActive: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
      .optional()
      .transform((value) => value === "on" || value === "true"),
  })
  .superRefine((data, context) => {
    if (data.type === "percentage") {
      if (!/^\d+$/.test(data.value)) {
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "Percentage must be a whole number.",
        });
      } else {
        const amount = Number(data.value);
        if (amount < 1 || amount > 100) {
          context.addIssue({
            code: "custom",
            path: ["value"],
            message: "Percentage must be between 1 and 100.",
          });
        }
      }
    } else if (dollarsToCents(data.value) === null) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Enter a valid amount.",
      });
    }

    if (data.minimumSubtotal && dollarsToCents(data.minimumSubtotal) === null) {
      context.addIssue({
        code: "custom",
        path: ["minimumSubtotal"],
        message: "Enter a valid amount.",
      });
    }

    if (data.usageLimit && !/^\d+$/.test(data.usageLimit)) {
      context.addIssue({
        code: "custom",
        path: ["usageLimit"],
        message: "Usage limit must be a whole number.",
      });
    }

    const starts = parseLocalDate(data.startsAt);
    const ends = parseLocalDate(data.endsAt);

    if (data.startsAt && !starts) {
      context.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Enter a valid start.",
      });
    }
    if (data.endsAt && !ends) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Enter a valid end.",
      });
    }
    if (starts && ends && ends <= starts) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be after the start.",
      });
    }
  });

export const discountIdSchema = z.string().uuid();

export type DiscountFormInput = z.infer<typeof discountFormSchema>;
