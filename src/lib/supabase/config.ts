import { z } from "zod";

const publicConfigSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("https://") ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(value),
      "Supabase URL must use https, except for localhost."
    ),
  key: z.string().min(20),
});

export type SupabasePublicConfig = z.infer<typeof publicConfigSchema>;

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !key) {
    return null;
  }

  const parsed = publicConfigSchema.safeParse({ url, key });
  return parsed.success ? parsed.data : null;
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return config;
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return "http://localhost:3000";
    }
  }
  return "http://localhost:3000";
}
