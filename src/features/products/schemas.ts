import { z } from "zod";
import { dollarsToCents } from "@/lib/money";
import { slugify } from "@/lib/format";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const optionalText = (max: number) =>
  z.string().trim().max(max, "Value is too long.").optional();

const money = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .refine((value) => dollarsToCents(value) !== null, "Use a valid amount.");

const optionalMoney = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || dollarsToCents(value) !== null,
    "Use a valid amount."
  );

const wholeNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), `${label} must be a whole number.`)
    .transform((value) => Number(value))
    .refine(
      (value) => value >= min && value <= max,
      `${label} must be between ${min} and ${max}.`
    );

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  title: requiredText("Variant title", 120),
  sku: requiredText("SKU", 64),
  barcode: optionalText(64),
  price: money,
  cost: optionalMoney,
  onHand: wholeNumber(0, 1_000_000, "Stock"),
  lowStockThreshold: wholeNumber(0, 100_000, "Low-stock threshold"),
});

export const productFormSchema = z.object({
  title: requiredText("Title", 200),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? slugify(value) : "")),
  description: z.string().trim().max(10_000).optional(),
  status: z.enum(["draft", "active", "archived"]),
  vendor: optionalText(120),
  productType: optionalText(120),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value === "" || /^https:\/\/\S+$/i.test(value),
      "Use an https image URL."
    )
    .optional(),
  variants: z.array(productVariantSchema).min(1, "Add at least one variant."),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const productIdSchema = z.string().uuid();
export const productStatusSchema = z.enum(["draft", "active", "archived"]);

export function parseVariantsJson(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
