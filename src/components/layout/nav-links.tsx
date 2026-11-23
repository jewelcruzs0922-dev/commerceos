"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups } from "@/config/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col px-2 py-2">
      {navGroups.map((group, groupIndex) => (
        <div
          key={group.label}
          className={cn(
            "flex flex-col",
            collapsed &&
              groupIndex > 0 &&
              "mt-1 border-t border-sidebar-border pt-1"
          )}
        >
          <p
            className={cn(
              "px-2.5 pt-3 pb-1 text-[11px] leading-4 font-medium text-sidebar-foreground/80",
              collapsed && "sr-only"
            )}
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-2.5 rounded-xl text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    collapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    aria-hidden="true"
                    className="size-[18px] shrink-0"
                  />
                  <span className={cn("truncate", collapsed && "sr-only")}>
                    {item.label}
                  </span>
                </Link>
              );

              if (!collapsed) {
                return <li key={item.id}>{link}</li>;
              }

              return (
                <li key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
