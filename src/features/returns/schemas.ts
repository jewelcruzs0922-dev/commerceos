import { z } from "zod";

export const returnItemSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), "Quantity must be a whole number.")
    .transform((value) => Number(value))
    .refine((value) => value > 0, "Quantity must be positive."),
  restock: z.boolean().optional().default(true),
});

export const createReturnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(300, "Reason is too long.").optional(),
  items: z.array(returnItemSchema).min(1, "Select at least one item."),
});

export const decideReturnSchema = z.object({
  returnId: z.string().uuid(),
  approve: z
    .union([z.literal("true"), z.literal("false"), z.literal("on"), z.null()])
    .optional()
    .transform((value) => value === "true" || value === "on"),
  note: z.string().trim().max(500, "Note is too long.").optional(),
});

export const refundReturnSchema = z.object({
  returnId: z.string().uuid(),
  restock: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export type ReturnItemInput = z.infer<typeof returnItemSchema>;
