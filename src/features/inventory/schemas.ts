import { z } from "zod";

export const adjustStockSchema = z.object({
  variantId: z.string().uuid(),
  delta: z
    .string()
    .trim()
    .refine((value) => /^-?\d+$/.test(value), "Enter a whole number.")
    .transform((value) => Number(value))
    .refine((value) => value !== 0, "Enter a non-zero adjustment.")
    .refine(
      (value) => Math.abs(value) <= 100_000,
      "Adjustment is too large."
    ),
  reason: z.enum(["restock", "adjustment", "damage", "return"]),
  note: z.string().trim().max(200).optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
