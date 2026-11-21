import { z } from "zod";
import { dollarsToCents } from "@/lib/money";

export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  restock: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? dollarsToCents(value) : 0))
  .refine((value) => value !== null, "Use a valid amount.")
  .transform((value) => value ?? 0);

export const refundOrderSchema = z.object({
  orderId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(100),
  amount: z
    .string()
    .trim()
    .min(1, "Enter a refund amount.")
    .refine((value) => dollarsToCents(value) !== null, "Use a valid amount.")
    .transform((value) => dollarsToCents(value) ?? 0)
    .refine((value) => value > 0, "Refund must be greater than zero."),
  reason: z.string().trim().max(200, "Reason is too long.").optional(),
});

export const orderItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Quantity must be at least 1.")
    .max(1000, "Quantity is too large."),
});

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid().nullable(),
    email: z.string().trim().email("Enter a valid email.").max(320),
    items: z
      .array(orderItemInputSchema)
      .min(1, "Add at least one line item.")
      .max(100, "Too many line items.")
      .refine(
        (items) =>
          new Set(items.map((item) => item.variantId)).size === items.length,
        "Each variant can appear only once."
      ),
    discountCode: z.string().trim().max(64).optional(),
    shipping: optionalMoney,
    tax: optionalMoney,
    markPaid: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
      .optional()
      .transform((value) => value === "on" || value === "true"),
    address: z.object({
      name: z.string().trim().max(120).optional(),
      line1: z.string().trim().max(200).optional(),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().max(120).optional(),
      region: z.string().trim().max(120).optional(),
      postal_code: z.string().trim().max(24).optional(),
      country: z.string().trim().max(2).optional(),
    }),
    idempotencyKey: z.string().trim().min(8).max(100),
  })
  .refine((value) => value.shipping >= 0 && value.tax >= 0, {
    message: "Shipping and tax cannot be negative.",
    path: ["shipping"],
  });

export const fulfillOrderSchema = z.object({
  orderId: z.string().uuid(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1).max(10000),
      })
    )
    .min(1, "Choose at least one item to fulfill."),
});
