import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DatabaseZapIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Setup",
};

const steps = [
  {
    icon: DatabaseZapIcon,
    title: "Create a Supabase project",
    body: "Add the project URL and anon (publishable) key to .env.local. Keep the service-role key out of this app; it is not used.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Apply the migrations",
    body: "Run supabase link --project-ref <ref>, then supabase db push. The migrations create the schema, RLS policies, and the store bootstrap function.",
  },
  {
    icon: KeyRoundIcon,
    title: "Create the first account",
    body: "Open /register, confirm the email, sign in, and create a store. That account becomes the store owner.",
  },
];

export default function SetupPage() {
  if (isSupabaseConfigured()) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-svh flex-col items-center gap-10 bg-background px-4 py-12 sm:px-6">
      <Wordmark />

      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect the backend
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            This deployment has no Supabase project configured, so
            authentication and data access are disabled. The interface below
            still renders, but it does not pretend to be signed in.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Required environment variables
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>NEXT_PUBLIC_SITE_URL</li>
          </ul>
          <p className="text-xs leading-5 text-muted-foreground">
            Values belong in an untracked <code>.env.local</code>. Do not paste
            keys into source files or commit them.
          </p>
        </div>

        <ol className="flex flex-col gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <Button asChild variant="outline" size="sm">
            <Link href="/design">View the design system</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
