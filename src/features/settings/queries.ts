import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StoreSettings = {
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  isDemo: boolean;
};

export type ProfileSettings = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  notificationPreferences: unknown;
};

export async function getSettings(
  storeId: string,
  userId: string
): Promise<{ store: StoreSettings; profile: ProfileSettings } | null> {
  const supabase = await createClient();

  const [{ data: store }, { data: profile }] = await Promise.all([
    supabase
      .from("stores")
      .select("name, slug, currency, timezone, logo_url, is_demo")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, email, avatar_url, notification_preferences")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (!store || !profile) {
    return null;
  }

  return {
    store: {
      name: store.name,
      slug: store.slug,
      currency: store.currency,
      timezone: store.timezone,
      logoUrl: store.logo_url,
      isDemo: store.is_demo,
    },
    profile: {
      fullName: profile.full_name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      notificationPreferences: profile.notification_preferences,
    },
  };
}
