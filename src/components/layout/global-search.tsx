"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { navGroups } from "@/config/navigation";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const desktopTrigger = useRef<HTMLButtonElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);

  function restoreTriggerFocus() {
    const target = desktopTrigger.current?.offsetParent
      ? desktopTrigger.current
      : mobileTrigger.current;
    target?.focus();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
    }
  }

  const normalized = query.trim().toLowerCase();
  const filteredGroups = navGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter(
        (item) =>
          normalized.length === 0 ||
          item.label.toLowerCase().includes(normalized)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const firstMatch = filteredGroups[0]?.items[0];

  function select(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  return (
    <>
      <Button
        ref={desktopTrigger}
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="hidden w-52 justify-start gap-2 text-muted-foreground md:flex"
      >
        <SearchIcon aria-hidden="true" />
        <span>Search modules</span>
        <kbd
          className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted-foreground"
        >
          Ctrl K
        </kbd>
      </Button>
      <Button
        ref={mobileTrigger}
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Search modules"
        className="md:hidden"
      >
        <SearchIcon aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreTriggerFocus();
          }}
          className="top-[12%] max-w-[calc(100%-2rem)] translate-y-0 gap-0 p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Search modules</DialogTitle>
          <DialogDescription className="sr-only">
            Jump to a CommerceOS module.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b border-border px-3">
            <SearchIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && firstMatch) {
                  event.preventDefault();
                  select(firstMatch.href);
                }
              }}
              placeholder="Search modules"
              aria-label="Search modules"
              autoFocus
              className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close search"
                className="shrink-0"
              >
                <XIcon aria-hidden="true" />
              </Button>
            </DialogClose>
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.label} className="pb-1">
                  <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => select(item.href)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="shrink-0">{item.label}</span>
                            <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:block">
                              {item.summary}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No modules match “{query.trim()}”.
              </p>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-[11px] leading-4 text-muted-foreground">
            Searches module names only. Store records become searchable once
            data is connected.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
