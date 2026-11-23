"use client";

import {
  DatabaseZapIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react";
import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand/wordmark";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type MemberRole } from "@/lib/permissions";

export function AppSidebar({
  collapsed,
  onToggle,
  backendConnected,
  role,
}: {
  collapsed: boolean;
  onToggle: () => void;
  backendConnected: boolean;
  role: MemberRole | null;
}) {
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link
          href="/dashboard"
          aria-label="CommerceOS overview"
          className="flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_path:last-child]:text-sidebar-ring"
        >
          {collapsed ? <BrandMark className="size-6" /> : <Wordmark />}
        </Link>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
        <NavLinks collapsed={collapsed} />
      </div>

      <div className="flex flex-col gap-2 border-t border-sidebar-border p-2">
        {!collapsed ? (
          <p className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] leading-4 text-sidebar-foreground/80">
            <DatabaseZapIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-sidebar-ring"
            />
            {backendConnected && role
              ? `Connected · ${ROLE_LABELS[role]}`
              : "Data layer not connected"}
          </p>
        ) : null}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "!bg-transparent text-sidebar-foreground/90 hover:!bg-white/10 hover:text-sidebar-foreground aria-expanded:!bg-white/10 aria-expanded:!text-sidebar-foreground",
            collapsed ? "mx-auto" : "w-full justify-start"
          )}
        >
          {collapsed ? (
            <PanelLeftOpenIcon aria-hidden="true" />
          ) : (
            <>
              <PanelLeftCloseIcon aria-hidden="true" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
