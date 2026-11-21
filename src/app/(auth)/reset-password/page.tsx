import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getAuthContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <AuthHeading
          title="Choose a new password"
          description="Password reset requires a configured Supabase project."
        />
        <SetupNotice />
      </>
    );
  }

  const context = await getAuthContext();

  if (!context) {
    return (
      <>
        <AuthHeading
          title="Reset link required"
          description="Open the reset link from your email, or request a new one."
        />
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Choose a new password"
        description={`Signed in as ${context.email || "your account"}.`}
      />
      <ResetPasswordForm />
    </>
  );
}
