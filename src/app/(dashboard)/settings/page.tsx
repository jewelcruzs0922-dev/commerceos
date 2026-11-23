import type { Metadata } from "next";
import Image from "next/image";
import { ActionButton } from "@/components/app/action-button";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { requireMemberContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  NotificationSettingsForm,
  PasswordSettingsForm,
  ProfileSettingsForm,
  StoreSettingsForm,
} from "@/features/settings/components/settings-forms";
import { resetDemoData } from "@/features/settings/actions";
import { getSettings } from "@/features/settings/queries";
import { readNotificationPreferences } from "@/features/settings/schemas";
import { isSafeImageUrl } from "@/lib/validation/url";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Settings"
        description="Store profile, personal preferences, and security."
      />
    );
  }

  const context = await requireMemberContext();
  const settings = await getSettings(
    context.membership.storeId,
    context.userId
  );

  if (!settings) {
    throw new Error("Could not load settings");
  }

  const canManageStore = can(context.membership.role, "settings:manage");
  const readOnlyDemo = context.membership.role === "viewer";
  const notifications = readNotificationPreferences(
    settings.profile.notificationPreferences
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description={`${settings.store.name} · owner and admin controls`}
      />

      <div className="grid gap-8 xl:grid-cols-[12rem_minmax(0,1fr)] xl:gap-12">
        <nav aria-label="Settings sections" className="hidden xl:block">
          <ul className="sticky top-28 flex flex-col gap-0.5 border-l border-border">
            {[
              ["store", "Store profile"],
              ["demo", "Demo data"],
              ["profile", "Your profile"],
              ["notifications", "Notifications"],
              ["security", "Security"],
            ].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block border-l-2 border-transparent py-1.5 pl-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-10">
          {canManageStore ? (
            <section
              id="store"
              aria-labelledby="store-settings-title"
              className="scroll-mt-24 border-t border-border pt-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 id="store-settings-title" className="text-base font-semibold">
                    Store profile
                  </h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Name, timezone, and logo. Slug is permanent in this build:{" "}
                    <span className="font-mono">{settings.store.slug}</span>.
                  </p>
                </div>
                {isSafeImageUrl(settings.store.logoUrl) ? (
                  <Image
                    src={settings.store.logoUrl}
                    alt={`${settings.store.name} logo`}
                    width={44}
                    height={44}
                    unoptimized
                    className="size-11 rounded-lg border border-border object-cover"
                  />
                ) : null}
              </div>
              <div className="mt-5">
                <StoreSettingsForm
                  name={settings.store.name}
                  timezone={settings.store.timezone}
                  currency={settings.store.currency}
                  logoUrl={settings.store.logoUrl ?? ""}
                />
              </div>
            </section>
          ) : (
            <p className="border-y border-border py-4 text-sm text-muted-foreground">
              {readOnlyDemo
                ? "This is a read-only demo session. Store, profile, and security changes are disabled."
                : "Your role can use personal settings but cannot change the store profile."}
            </p>
          )}

          {canManageStore &&
          settings.store.isDemo &&
          process.env.DEMO_MODE === "true" ? (
            <section
              id="demo"
              aria-labelledby="demo-reset-title"
              className="flex scroll-mt-24 flex-wrap items-center justify-between gap-5 rounded-xl border border-highlight-border bg-highlight-soft p-5"
            >
              <div className="flex max-w-xl flex-col gap-1">
                <h2 id="demo-reset-title" className="text-base font-semibold">
                  Demo data
                </h2>
                <p className="text-xs leading-5 text-foreground/70">
                  Regenerates products, customers, orders, returns, refunds, and
                  activity. Viewer sessions are cleared. Demo mode and the demo
                  store flag must both be enabled.
                </p>
              </div>
              <ActionButton
                action={resetDemoData}
                payload={{}}
                label="Reset demo data"
                pendingLabel="Regenerating"
                variant="outline"
                destructive
                confirm={{
                  title: "Reset the Urban Goods demo?",
                  description:
                    "All seeded records in this demo store are replaced with a fresh deterministic dataset. Existing viewer sessions lose access.",
                  confirmLabel: "Reset demo data",
                }}
              />
            </section>
          ) : null}

          {readOnlyDemo ? null : (
            <>
              <section
                id="profile"
                aria-labelledby="profile-settings-title"
                className="scroll-mt-24 border-t border-border pt-6"
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id="profile-settings-title"
                    className="text-base font-semibold"
                  >
                    Your profile
                  </h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Profile metadata is global to your account and visible to
                    members of your stores.
                  </p>
                </div>
                <div className="mt-5">
                  <ProfileSettingsForm
                    fullName={settings.profile.fullName}
                    email={settings.profile.email}
                    avatarUrl={settings.profile.avatarUrl ?? ""}
                  />
                </div>
              </section>

              <section
                id="notifications"
                aria-labelledby="notification-settings-title"
                className="scroll-mt-24 border-t border-border pt-6"
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id="notification-settings-title"
                    className="text-base font-semibold"
                  >
                    Notifications
                  </h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Preferences are stored on your profile. No email or SMS is
                    sent by this build.
                  </p>
                </div>
                <div className="mt-5">
                  <NotificationSettingsForm
                    lowStock={notifications.lowStock}
                    newReturns={notifications.newReturns}
                    weeklySummary={notifications.weeklySummary}
                  />
                </div>
              </section>

              <section
                id="security"
                aria-labelledby="security-settings-title"
                className="scroll-mt-24 border-t border-border pt-6"
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id="security-settings-title"
                    className="text-base font-semibold"
                  >
                    Security
                  </h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Password updates go through Supabase Auth. Existing sessions
                    stay valid until they expire.
                  </p>
                </div>
                <div className="mt-5">
                  <PasswordSettingsForm />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
