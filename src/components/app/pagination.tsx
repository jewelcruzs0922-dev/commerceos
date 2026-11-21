import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { getPageCount } from "@/lib/list-params";

type ParamValue = string | undefined;

function buildHref(
  path: string,
  params: Record<string, ParamValue>,
  page: number
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  if (page > 1) {
    search.set("page", String(page));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function Pagination({
  page,
  pageSize,
  total,
  path,
  params = {},
}: {
  page: number;
  pageSize: number;
  total: number;
  path: string;
  params?: Record<string, ParamValue>;
}) {
  const pageCount = getPageCount(total, pageSize);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground"
    >
      <p>
        {total === 0
          ? "No records"
          : `${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(total)}`}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(path, params, page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        <span className="px-1 font-mono text-[11px]">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(path, params, page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}
