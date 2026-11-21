import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getAuthContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <AuthHeading
          title="Create account"
          description="Start a new CommerceOS store workspace."
        />
        <SetupNotice />
      </>
    );
  }

  const context = await getAuthContext();

  if (context) {
    redirect(context.membership ? "/dashboard" : "/onboarding");
  }

  return (
    <>
      <AuthHeading
        title="Create account"
        description="Start a new CommerceOS store workspace. All records are fictional."
      />
      <SignUpForm />
    </>
  );
}
