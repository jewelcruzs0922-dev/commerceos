import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getNotificationSummary } from "@/features/notifications/queries";
import { getAuthContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const initialCollapsed =
    cookieStore.get("commerceos_sidebar")?.value === "1";

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      redirect("/setup");
    }

    return (
      <AppShell
        initialCollapsed={initialCollapsed}
        backendConnected={false}
        storeName="Urban Goods"
        account={null}
        notifications={{ items: [], unreadCount: 0 }}
      >
        {children}
      </AppShell>
    );
  }

  const context = await getAuthContext();

  if (!context) {
    redirect("/login?next=/dashboard");
  }

  if (!context.membership) {
    redirect("/onboarding");
  }

  const notifications = await getNotificationSummary(
    context.membership.storeId
  );

  return (
    <AppShell
      initialCollapsed={initialCollapsed}
      backendConnected
      storeName={context.membership.storeName}
      account={{ email: context.email, role: context.membership.role }}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
