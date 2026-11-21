import { ArrowRightIcon, CircleDashedIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { findNavItem } from "@/config/navigation";

export function ModulePlaceholder({ href }: { href: string }) {
  const item = findNavItem(href);

  if (!item) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={item.label}
        description={item.summary}
        status={
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <ClockIcon aria-hidden="true" />
            Planned
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Empty className="items-start justify-start border border-dashed bg-card px-6 py-8 text-left">
          <EmptyHeader className="items-start text-left">
            <EmptyMedia variant="icon">
              <CircleDashedIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-base">
              {item.label} is not connected yet
            </EmptyTitle>
            <EmptyDescription className="max-w-md">
              This route is part of the application shell. The module itself is
              not built and no store records exist yet, so there is nothing
              real to list here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="items-start">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                Back to overview
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </EmptyContent>
        </Empty>

        <section
          aria-labelledby="planned-capabilities"
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5"
        >
          <div className="flex flex-col gap-1">
            <h2 id="planned-capabilities" className="text-sm font-semibold">
              Planned capabilities
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              Future scope, not current behavior.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {item.capabilities.map((capability) => (
              <li
                key={capability}
                className="flex items-start gap-2.5 text-sm leading-5 text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1 shrink-0 rounded-full bg-primary/60"
                />
                {capability}
              </li>
            ))}
          </ul>
          <p className="mt-auto border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
            Nothing on this route is live. Data appears only after the database
            schema and seed are added in a later phase.
          </p>
        </section>
      </div>
    </div>
  );
}
