import { z } from "zod";
import { slugify } from "@/lib/format";

export const collectionFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long."),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? slugify(value) : "")),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["draft", "active", "archived"]),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value === "" || /^https:\/\/\S+$/i.test(value),
      "Use an https image URL."
    )
    .optional(),
  productIds: z.array(z.string().uuid()).max(500),
});

export const collectionIdSchema = z.string().uuid();

export function parseProductIds(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}
