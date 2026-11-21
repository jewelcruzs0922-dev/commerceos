import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { navGroups } from "@/config/navigation";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_30rem]">
      <aside className="hidden flex-col justify-between border-r border-sidebar-border bg-sidebar p-10 lg:flex">
        <Link
          href="/login"
          aria-label="CommerceOS sign in"
          className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>

        <div className="flex max-w-sm flex-col gap-4">
          <h1 className="text-2xl leading-8 font-semibold tracking-tight">
            Operations, without the noise.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            CommerceOS is the internal workspace for Urban Goods: catalog,
            orders, inventory, customers, and the numbers that connect them.
          </p>
          <ul className="flex flex-col gap-1.5">
            {navGroups.map((group) => (
              <li
                key={group.label}
                className="flex items-baseline justify-between gap-4 border-b border-sidebar-border py-1.5 text-xs"
              >
                <span className="font-medium text-sidebar-foreground">
                  {group.label}
                </span>
                <span className="text-right text-muted-foreground">
                  {group.items.map((item) => item.label).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] leading-4 text-muted-foreground">
          Fictional demo data. No real payments, checkout, or customer email.
        </p>
      </aside>

      <main className="flex min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 lg:hidden">
          <Link
            href="/login"
            aria-label="CommerceOS sign in"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
          <span className="text-xs text-muted-foreground">Staff access</span>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
