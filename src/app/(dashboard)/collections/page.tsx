import type { Metadata } from "next";
import Link from "next/link";
import { Layers, PlusIcon } from "lucide-react";
import { z } from "zod";
import { BackendRequired } from "@/components/app/backend-required";
import { EmptyList } from "@/components/app/empty-list";
import { ListToolbar } from "@/components/app/list-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { RecordCount } from "@/components/app/record-count";
import { Pagination } from "@/components/app/pagination";
import { StatusPill, toneForStatus } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireMemberContext } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { parsePage, sanitizeSearch } from "@/lib/list-params";
import { can } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  listCollections,
  type CollectionSort,
} from "@/features/collections/queries";

export const metadata: Metadata = {
  title: "Collections",
};

const querySchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z.enum(["draft", "active", "archived"]).optional().catch(undefined),
  sort: z.enum(["newest", "oldest", "name"]).default("newest").catch("newest"),
  page: z.string().optional().catch(undefined),
});

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <BackendRequired
        title="Collections"
        description="Curated groups of products used to organize the demo catalog."
      />
    );
  }

  const params = await searchParams;
  const parsed = querySchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    sort: typeof params.sort === "string" ? params.sort : "newest",
    page: params.page,
  });

  const context = await requireMemberContext();
  const search = sanitizeSearch(parsed.q);
  const page = parsePage(parsed.page);
  const pageSize = 25;

  const { rows, total } = await listCollections({
    storeId: context.membership.storeId,
    search,
    status: parsed.status ?? null,
    sort: parsed.sort as CollectionSort,
    page,
    pageSize,
  });

  const canManage = can(context.membership.role, "collections:manage");
  const filtered = Boolean(search || parsed.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Collections"
        description="Product groups used to organize the catalog."
        status={
          <RecordCount value={total} label="collections" />
        }
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href="/collections/new">
                <PlusIcon aria-hidden="true" />
                New collection
              </Link>
            </Button>
          ) : null
        }
      />

      <ListToolbar
        searchPlaceholder="Search collections"
        searchValue={search}
        filters={[
          {
            name: "status",
            label: "Filter by status",
            value: parsed.status ?? "",
            options: [
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ],
          },
        ]}
        sort={{
          name: "sort",
          label: "Sort collections",
          value: parsed.sort,
          options: [
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "name", label: "Name" },
          ],
        }}
      />

      {rows.length === 0 ? (
        <EmptyList
          title={
            filtered ? "No collections match those filters" : "No collections yet"
          }
          description={
            filtered
              ? "Clear the filters or try a different search."
              : "Group products into collections to organize how the catalog is browsed."
          }
          action={
            canManage ? (
              <Button asChild size="sm">
                <Link href="/collections/new">
                  <PlusIcon aria-hidden="true" />
                  New collection
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="ledger-table">
            <Table className="min-w-0 sm:min-w-[32rem] lg:min-w-[44rem]">
              <TableHeader className="bg-secondary/55">
                <TableRow>
                  <TableHead scope="col">Collection</TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">
                    Status
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Products
                  </TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((collection) => (
                  <TableRow key={collection.id} className="h-14">
                    <TableCell className="max-w-[13rem] sm:max-w-none">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"
                        >
                          <Layers className="size-4" />
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/collections/${collection.id}/edit`}
                            className="truncate font-medium underline-offset-4 hover:underline"
                          >
                            {collection.title}
                          </Link>
                          <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
                            {collection.slug}
                          </span>
                          <span className="mt-1 sm:hidden">
                            <StatusPill
                              label={collection.status}
                              tone={toneForStatus(collection.status)}
                            />
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill
                        label={collection.status}
                        tone={toneForStatus(collection.status)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {collection.productCount}
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                      {formatDate(collection.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            path="/collections"
            params={{ q: search || undefined, status: parsed.status, sort: parsed.sort }}
          />
        </>
      )}
    </div>
  );
}
