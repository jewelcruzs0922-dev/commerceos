import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { DemoButton } from "@/features/auth/components/demo-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getAuthContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/validation/redirect";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeInternalPath(params.next);

  if (!isSupabaseConfigured()) {
    return (
      <>
        <AuthHeading
          title="Sign in"
          description="Staff access to the Urban Goods workspace."
        />
        <SetupNotice />
      </>
    );
  }

  const context = await getAuthContext();

  if (context) {
    redirect(context.membership ? next : "/onboarding");
  }

  return (
    <>
      <AuthHeading
        title="Sign in"
        description="Staff access to the Urban Goods workspace."
      />
      {params.error === "auth" ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          That sign-in link is invalid or has expired. Sign in again or request
          a new link.
        </p>
      ) : null}
      <SignInForm next={next} />
      {process.env.DEMO_MODE === "true" ? <DemoButton /> : null}
    </>
  );
}
