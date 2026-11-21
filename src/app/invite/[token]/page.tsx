import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { AcceptInvitationForm } from "@/features/team/components/accept-invitation-form";
import { getAuthContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const { token } = await params;
  const context = await getAuthContext();

  if (!context) {
    const next = `/invite/${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Wordmark />
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">
            Join the store
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            You are signed in as {context.email || "your account"}. The
            invitation only works for the email it was issued to.
          </p>
        </div>
        <AcceptInvitationForm token={token} />
        <p className="text-[11px] leading-4 text-muted-foreground">
          If this is the wrong account, sign out and sign in with the invited
          email. Invitations expire after 7 days.
        </p>
      </div>
    </main>
  );
}
