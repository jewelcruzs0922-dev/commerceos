"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import type { RefObject } from "react";
import { BrandMark } from "@/components/brand/wordmark";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationMenu } from "@/components/layout/notification-menu";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { StoreSelector } from "@/components/layout/store-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { NotificationSummary } from "@/features/notifications/types";
import type { MemberRole } from "@/lib/permissions";

export function Topbar({
  onOpenMobileNav,
  menuButtonRef,
  storeName,
  account,
  backendConnected,
  notifications,
}: {
  onOpenMobileNav: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  storeName: string;
  account: { email: string; role: MemberRole } | null;
  backendConnected: boolean;
  notifications: NotificationSummary;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-6 lg:px-8">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="lg:hidden"
      >
        <MenuIcon aria-hidden="true" />
      </Button>

      <Link
        href="/dashboard"
        aria-label="CommerceOS overview"
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <BrandMark className="size-6" />
      </Link>

      <StoreSelector storeName={storeName} />

      <div className="ml-auto flex items-center gap-1">
        <GlobalSearch />
        <NotificationMenu
          items={notifications.items}
          unreadCount={notifications.unreadCount}
        />
        <ThemeToggle />
        <ProfileMenu account={account} backendConnected={backendConnected} />
      </div>
    </header>
  );
}
