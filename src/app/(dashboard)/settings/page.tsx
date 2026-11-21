import type { Metadata } from "next";
import Image from "next/image";
import { ActionButton } from "@/components/app/action-button";
import { BackendRequired } from "@/components/app/backend-required";
import { PageHeader } from "@/components/app/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
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
        description={`Store and personal settings for ${settings.store.name}. Store settings are restricted to owners and admins.`}
      />

      {canManageStore ? (
        <section
          aria-labelledby="store-settings-title"
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="store-settings-title" className="text-sm font-semibold">
                Store profile
              </h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Name, timezone, and logo are store-scoped. The slug is permanent
                in this build: {settings.store.slug}.
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
          <StoreSettingsForm
            name={settings.store.name}
            timezone={settings.store.timezone}
            currency={settings.store.currency}
            logoUrl={settings.store.logoUrl ?? ""}
          />
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          {readOnlyDemo
            ? "This is a read-only demo session. Store, profile, and security changes are disabled."
            : "Your role can use personal settings but cannot change the store profile."}
        </p>
      )}

      {canManageStore &&
      settings.store.isDemo &&
      process.env.DEMO_MODE === "true" ? (
        <section
          aria-labelledby="demo-reset-title"
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning-surface/40 px-4 py-4 sm:px-6"
        >
          <div className="flex max-w-xl flex-col gap-1">
            <h2 id="demo-reset-title" className="text-sm font-semibold">
              Demo data
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Regenerates products, customers, orders, returns, refunds, and
              activity for this demo store. Viewer sessions are cleared. This
              action is disabled unless the deployment enables demo mode and the
              store is marked as a demo.
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
        aria-labelledby="profile-settings-title"
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        <div className="flex flex-col gap-0.5">
          <h2 id="profile-settings-title" className="text-sm font-semibold">
            Your profile
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Profile metadata is global to your account and visible to members of
            your stores.
          </p>
        </div>
        <ProfileSettingsForm
          fullName={settings.profile.fullName}
          email={settings.profile.email}
          avatarUrl={settings.profile.avatarUrl ?? ""}
        />
      </section>

      <section
        aria-labelledby="notification-settings-title"
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        <div className="flex flex-col gap-0.5">
          <h2
            id="notification-settings-title"
            className="text-sm font-semibold"
          >
            Notifications
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Preferences are stored on your profile. No email or SMS is sent by
            this build.
          </p>
        </div>
        <NotificationSettingsForm
          lowStock={notifications.lowStock}
          newReturns={notifications.newReturns}
          weeklySummary={notifications.weeklySummary}
        />
      </section>

      <section
        aria-labelledby="security-settings-title"
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        <div className="flex flex-col gap-0.5">
          <h2 id="security-settings-title" className="text-sm font-semibold">
            Security and appearance
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Password updates go through Supabase Auth. Existing sessions stay
            valid until they expire.
          </p>
        </div>
        <PasswordSettingsForm />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Stored in this browser; follows the system preference by default.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>
      </>
      )}
    </div>
  );
}
