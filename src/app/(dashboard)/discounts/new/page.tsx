import type { Metadata } from "next";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { PermissionDenied } from "@/components/app/permission-denied";
import { DiscountForm } from "@/features/discounts/components/discount-form";
import { createDiscount } from "@/features/discounts/actions";
import { requireMemberContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "New discount",
};

export default async function NewDiscountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="New discount"
        description="Create a percentage or fixed-amount code with limits."
      />
    );
  }

  const context = await requireMemberContext();

  if (!can(context.membership.role, "discounts:manage")) {
    return <PermissionDenied />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="New discount"
        description="Codes are unique per store. Usage and limits are enforced when an order redeems the code."
      />
      <DiscountForm
        action={createDiscount}
        initial={{
          code: "",
          description: "",
          type: "percentage",
          value: "",
          startsAt: "",
          endsAt: "",
          minimumSubtotal: "",
          usageLimit: "",
          isActive: true,
        }}
      />
    </div>
  );
}
