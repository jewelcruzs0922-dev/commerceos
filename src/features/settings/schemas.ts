import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || /^https:\/\/\S+$/i.test(value),
    "Use an https URL."
  )
  .optional();

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1, "Store name is required.").max(80),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(64)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid IANA timezone."),
  logoUrl: httpsUrl,
});

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(80),
  avatarUrl: httpsUrl,
});

export const notificationSettingsSchema = z.object({
  lowStock: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
  newReturns: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
  weeklySummary: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export const passwordChangeSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use 72 characters or fewer."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export function readNotificationPreferences(value: unknown) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    lowStock: record.low_stock === true,
    newReturns: record.new_returns === true,
    weeklySummary: record.weekly_summary === true,
  };
}
