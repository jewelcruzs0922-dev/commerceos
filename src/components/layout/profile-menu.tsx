"use client";

import { CircleUserIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { ROLE_LABELS, type MemberRole } from "@/lib/permissions";

export function ProfileMenu({
  account,
  backendConnected,
}: {
  account: { email: string; role: MemberRole } | null;
  backendConnected: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account">
          <CircleUserIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Account</DropdownMenuLabel>

        {account ? (
          <>
            <div className="px-1.5 pb-1.5">
              <p className="truncate text-sm font-medium">{account.email}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[account.role]} · signed in
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <SettingsIcon aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOutIcon aria-hidden="true" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </>
        ) : (
          <>
            <p className="px-1.5 pb-1.5 text-xs leading-5 text-muted-foreground">
              {backendConnected
                ? "No active session."
                : "Authentication is not configured for this deployment."}
            </p>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <SettingsIcon aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <LogOutIcon aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
