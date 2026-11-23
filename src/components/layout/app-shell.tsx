"use client";

import { useRef, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import type { NotificationSummary } from "@/features/notifications/types";
import type { MemberRole } from "@/lib/permissions";

const SIDEBAR_COOKIE = "commerceos_sidebar";

export function AppShell({
  children,
  initialCollapsed,
  backendConnected,
  storeName,
  account,
  notifications,
}: {
  children: ReactNode;
  initialCollapsed: boolean;
  backendConnected: boolean;
  storeName: string;
  account: { email: string; role: MemberRole } | null;
  notifications: NotificationSummary;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax${secure}`;
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="flex min-h-svh w-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-overlay"
      >
        Skip to content
      </a>

      <AppSidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        backendConnected={backendConnected}
        role={account?.role ?? null}
      />
      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onClosedAutoFocus={() => menuButtonRef.current?.focus()}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-card">
        <Topbar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          menuButtonRef={menuButtonRef}
          storeName={storeName}
          account={account}
          backendConnected={backendConnected}
          notifications={notifications}
        />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
