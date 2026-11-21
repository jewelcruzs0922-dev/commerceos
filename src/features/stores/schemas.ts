import { z } from "zod";

export const createStoreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a store name.")
    .max(80, "Store name is too long."),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
