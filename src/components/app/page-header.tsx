import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/app/breadcrumbs";

export function PageHeader({
  title,
  description,
  status,
  actions,
}: {
  title: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <Breadcrumbs />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {title}
            </h1>
            {status}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
