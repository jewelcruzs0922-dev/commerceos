"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getSiteUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/validation/redirect";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/features/auth/schemas";
import type { FormActionState } from "@/lib/form-state";

function notConfigured(): FormActionState {
  return {
    status: "error",
    message: "Authentication is not configured for this deployment.",
  };
}

function invalid(
  error: z.ZodError,
  message = "Check the highlighted fields."
): FormActionState {
  return {
    status: "error",
    message,
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

export async function signIn(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const parsed = signInSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return invalid(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "Email or password is incorrect.",
    };
  }

  redirect(safeInternalPath(parsed.data.next));
}

export async function signUp(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return invalid(parsed.error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        "Could not create the account. Check the details and try again.",
    };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  return {
    status: "success",
    message:
      "Check your email to confirm the account, then sign in to create your store.",
  };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

export async function requestPasswordReset(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return invalid(parsed.error);
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  return {
    status: "success",
    message:
      "If an account exists for that email, a reset link is on the way.",
  };
}

export async function updatePassword(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return invalid(parsed.error);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    return {
      status: "error",
      message:
        "This reset link is invalid or has expired. Request a new link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "Could not update the password. Request a new reset link.",
    };
  }

  redirect("/dashboard");
}

export async function startDemo(): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return notConfigured();
  }

  if (process.env.DEMO_MODE !== "true") {
    return {
      status: "error",
      message: "The demo entry is disabled for this deployment.",
    };
  }

  const supabase = await createClient();
  const { data: existingUser } = await supabase.auth.getUser();

  if (existingUser.user && !existingUser.user.is_anonymous) {
    return {
      status: "error",
      message: "Sign out of the staff account before opening the demo.",
    };
  }

  const createdSession = !existingUser.user;

  if (createdSession) {
    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      return {
        status: "error",
        message:
          "The demo session could not start. Anonymous sign-ins may be rate-limited; wait a minute and try again.",
      };
    }
  }

  const { error: joinError } = await supabase.rpc("join_demo_store");

  if (joinError) {
    if (createdSession) {
      await supabase.auth.signOut();
    }
    return {
      status: "error",
      message: "The demo workspace is busy. Wait a moment and try again.",
    };
  }

  redirect("/dashboard");
}