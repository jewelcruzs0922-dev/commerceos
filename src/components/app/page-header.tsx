import type { ReactNode } from "react";

export function PageHeader({
  title,
  status,
  actions,
}: {
  title: string;
  description?: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="text-[30px] leading-9 font-semibold tracking-[-0.02em] sm:text-[34px] sm:leading-10">
            {title}
          </h1>
          {status ? (
            <div className="flex flex-wrap items-center gap-2">{status}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
