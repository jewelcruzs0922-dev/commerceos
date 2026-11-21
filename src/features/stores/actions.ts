"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import type { FormActionState } from "@/lib/form-state";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createStoreSchema } from "@/features/stores/schemas";

export async function createStore(
  _previous: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "The data layer is not configured for this deployment.",
    };
  }

  const context = await getAuthContext();

  if (!context) {
    redirect("/login?next=/onboarding");
  }

  const parsed = createStoreSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_store", {
    store_name: parsed.data.name,
  });

  if (error) {
    return {
      status: "error",
      message: "Could not create the store. Try again.",
    };
  }

  redirect("/dashboard");
}
