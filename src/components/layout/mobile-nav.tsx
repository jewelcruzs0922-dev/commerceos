"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function MobileNav({
  open,
  onOpenChange,
  onClosedAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosedAutoFocus: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosedAutoFocus();
        }}
        className="top-0 left-0 flex h-svh w-[min(18rem,calc(100vw-3rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <DialogDescription className="sr-only">
          CommerceOS modules.
        </DialogDescription>

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <Link
            href="/dashboard"
            onClick={() => onOpenChange(false)}
            aria-label="CommerceOS overview"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_path:last-child]:text-sidebar-ring"
          >
            <Wordmark />
          </Link>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close navigation" className="text-sidebar-foreground/90 hover:bg-white/10 hover:text-sidebar-foreground">
              <XIcon aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
          <NavLinks onNavigate={() => onOpenChange(false)} />
        </div>

        <p className="shrink-0 border-t border-sidebar-border px-4 py-3 text-[11px] leading-4 text-sidebar-foreground/80">
          CommerceOS · Urban Goods operations
        </p>
      </DialogContent>
    </Dialog>
  );
}
