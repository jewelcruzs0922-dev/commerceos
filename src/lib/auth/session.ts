import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  assertCapability,
  type Capability,
  type MemberRole,
} from "@/lib/permissions";

export type MembershipContext = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeTimezone: string;
  storeCurrency: string;
  role: MemberRole;
};

export type AuthContext = {
  userId: string;
  email: string;
  membership: MembershipContext | null;
};

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();

  let claims: { sub?: string; email?: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error) {
      claims = data?.claims ?? null;
    }
  } catch {
    claims = null;
  }

  if (!claims?.sub) {
    return null;
  }

  const userId = claims.sub;
  const email = typeof claims.email === "string" ? claims.email : "";

  const { data: membership, error: membershipError } = await supabase
    .from("store_members")
    .select("store_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error("Could not load store membership");
  }

  if (!membership) {
    return { userId, email, membership: null };
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("name, slug, timezone, currency")
    .eq("id", membership.store_id)
    .maybeSingle();

  if (storeError || !store) {
    throw new Error("Could not load the active store");
  }

  return {
    userId,
    email,
    membership: {
      storeId: membership.store_id,
      storeName: store.name,
      storeSlug: store.slug,
      storeTimezone: store.timezone,
      storeCurrency: store.currency,
      role: membership.role,
    },
  };
});

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requireMemberContext(): Promise<
  AuthContext & { membership: MembershipContext }
> {
  const context = await requireAuthContext();

  if (!context.membership) {
    redirect("/onboarding");
  }

  return { ...context, membership: context.membership };
}

export async function requireCapability(capability: Capability) {
  const context = await requireMemberContext();
  assertCapability(context.membership.role, capability);
  return context;
}