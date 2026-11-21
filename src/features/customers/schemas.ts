import { z } from "zod";

export const customerUpdateSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().max(120, "Name is too long.").optional(),
  phone: z.string().trim().max(40, "Phone is too long.").optional(),
  notes: z.string().trim().max(5000, "Notes are too long.").optional(),
  tags: z
    .string()
    .trim()
    .max(300, "Tags are too long.")
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    ),
});

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
