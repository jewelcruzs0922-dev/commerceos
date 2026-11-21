import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { CreateStoreForm } from "@/features/stores/components/create-store-form";
import { getAuthContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Create your store",
};

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const context = await getAuthContext();

  if (!context) {
    redirect("/login?next=/onboarding");
  }

  if (context.membership) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Wordmark />
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">
            Create your store
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            You are signed in as {context.email || "your account"}. A store
            scopes every product, order, and team member in CommerceOS.
          </p>
        </div>
        <CreateStoreForm />
      </div>
      <p className="max-w-sm text-center text-[11px] leading-4 text-muted-foreground">
        A store starts empty. Fictional catalog and order data arrive with the
        demo seed in a later phase.
      </p>
    </main>
  );
}
