"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BellIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/features/notifications/actions";
import type { NotificationItem } from "@/features/notifications/types";
import { formatDateTime } from "@/lib/format";

export function NotificationMenu({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAllRead() {
    startTransition(async () => {
      const result = await markNotificationsRead();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.count === 0
          ? "Everything is already read."
          : `${result.count} notification${result.count === 1 ? "" : "s"} marked read.`
      );
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative"
        >
          <BellIcon aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          Notifications
          <span className="font-mono text-[11px] font-normal">
            {unreadCount} unread
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
            <BellIcon
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Order, return, and refund activity appears here.
            </p>
          </div>
        ) : (
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                asChild
                className="flex-col items-start gap-0.5 rounded-none px-3 py-2.5"
              >
                <Link href={item.href ?? "/dashboard"}>
                  <span className="flex w-full items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.title}
                    </span>
                    {item.readAt ? null : (
                      <span className="ml-auto shrink-0 text-[10px] font-medium text-primary">
                        Unread
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {item.body}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {unreadCount > 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={markAllRead}
                disabled={pending}
              >
                {pending ? "Marking read" : "Mark all read"}
              </Button>
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
