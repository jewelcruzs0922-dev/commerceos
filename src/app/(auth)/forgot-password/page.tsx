import type { Metadata } from "next";
import { SetupNotice } from "@/components/app/setup-notice";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="Enter the email on your staff account. If it exists, a reset link is sent."
      />
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <SetupNotice />}
    </>
  );
}
