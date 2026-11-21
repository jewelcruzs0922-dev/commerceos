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
        className="top-0 left-0 flex h-svh w-[min(18rem,calc(100vw-3rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-r border-border p-0"
      >
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <DialogDescription className="sr-only">
          CommerceOS modules.
        </DialogDescription>

        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Link
            href="/dashboard"
            onClick={() => onOpenChange(false)}
            aria-label="CommerceOS overview"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close navigation">
              <XIcon aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks onNavigate={() => onOpenChange(false)} />
        </div>

        <p className="shrink-0 border-t border-border px-4 py-3 text-[11px] leading-4 text-muted-foreground">
          Shell preview. Store data and authentication are not connected yet.
        </p>
      </DialogContent>
    </Dialog>
  );
}
