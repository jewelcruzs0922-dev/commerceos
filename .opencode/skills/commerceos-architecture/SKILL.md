---
name: CommerceOS Architecture
description: Application architecture, folder layout, server/client boundaries, data access, and error handling for CommerceOS. Load before adding a module, page, data query, mutation, or shared component, and when reviewing structural decisions.
---

# CommerceOS Architecture

Server-first Next.js App Router with feature slices. Predictable placement matters more than clever abstraction.

## Folder layout

```text
src/
  app/
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx              # shell: sidebar, topbar, guards
      page.tsx                # Overview
      products/…
      orders/…
      inventory/…
      analytics/…
      discounts/…
      returns/…
      customers/…
      team/…
      settings/…
  features/
    products/
      components/             # module-only UI
      queries.ts              # server reads, returns DTOs
      actions.ts              # server mutations ('use server')
      schemas.ts              # zod input/output contracts
      types.ts                # module types derived from DB
      lib/                    # pure helpers (money, status)
    orders/ …
    inventory/ …
    …
  components/
    ui/                       # shadcn primitives, generated — do not fork
    app/                      # shared app components (PageHeader, DataTable, EmptyState, StatusChip)
  lib/
    supabase/
      server.ts               # createServerClient (cookies)
      client.ts               # createBrowserClient
      admin.ts                # service-role, server-only
      middleware.ts           # session refresh helper
    utils.ts                # cn()
    format.ts                 # money, date, number formatting
    permissions.ts            # role → capability map
  types/
    database.ts               # generated Supabase types — do not hand edit
```

Rules:
- `app/` holds routing, layouts, and composition only. Business logic never lives in a page file.
- A feature owns its components, queries, actions, schemas, and types. Cross-feature imports go through `components/app` or `lib`, never `features/x → features/y/components`.
- `components/ui` is vendored shadcn. If a primitive needs different behavior, wrap it in `components/app`; do not edit the generated file.

## Server / client boundary

Default to Server Components.

| Need | Where it goes |
|------|---------------|
| Read data for initial render | Server Component → `features/*/queries.ts` |
| Mutate data | Server Action → `features/*/actions.ts` |
| Form state, validation UX | Client Component + React Hook Form + zod |
| Table sorting/filtering/pagination driven by URL | Server reads `searchParams`; client only handles interaction |
| Charts, drag/drop, combobox, dialogs | Client Component, minimal serialized props |
| Auth session | Server only |

Rules:
- `'use client'` at the leaf that needs it, not at the page.
- Never pass a Supabase client, a function, a `Date`, or a class instance from server to client.
- Pass primitives and plain objects. Convert dates to ISO strings at the boundary.
- Client Components do not query Supabase directly. They call Server Actions or read props.
- `cookies()` and `headers()` are async — await them. Same for `params` and `searchParams`.

## Data access

Two functions per table at most, not a generic repository layer.

```ts
// features/orders/queries.ts
import 'server-only'

export async function listOrders(params: OrderListParams): Promise<OrderListResult> {
  const supabase = await createServerClient()
  // .eq('store_id', storeId) is required — RLS is defense in depth, not the only filter
  const { data, error, count } = await supabase
    .from('orders')
    .select('id, order_number, status, total_cents, placed_at, customer:customers(name)', { count: 'exact' })
    .eq('store_id', storeId)
    .order('placed_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw new QueryError('listOrders', error)
  return { rows: mapOrders(data), total: count ?? 0 }
}
```

- Queries accept already-validated, typed params. They never read raw `searchParams`.
- Return DTOs shaped for the UI, not raw rows, when the UI needs a different shape.
- Select explicit columns. Never `select('*')` in list queries.
- Parallelize independent reads with `Promise.all`. Do not create request waterfalls.
- Cache per request with `React.cache` where the same read is needed twice.

## Mutations

One Server Action per user intent.

```ts
// features/orders/actions.ts
'use server'

export async function cancelOrder(input: unknown): Promise<ActionResult> {
  const parsed = cancelOrderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input', fieldErrors: flatten(parsed.error) }

  const session = await requireSession()
  await requireCapability(session, 'orders:cancel')

  const supabase = await createServerClient()
  const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', parsed.data.id)
  if (error) return { ok: false, error: 'Could not cancel order' }

  revalidatePath('/orders')
  return { ok: true }
}
```

Order inside every action: parse → authenticate → authorize → validate business rules → mutate → revalidate → return typed result.

- Return `{ ok: true, data }` or `{ ok: false, error, fieldErrors? }`. Never throw for expected failures.
- Never trust `id`, `storeId`, or role from the client. Derive them from the session.
- Revalidate every path whose data changed.

## Error handling

- `app/(dashboard)/error.tsx` for recoverable render errors; `global-error.tsx` for the shell.
- `not-found.tsx` for missing entities; call `notFound()` when a query returns nothing.
- Wrap Supabase errors in a typed `QueryError` that logs the operation name server-side and exposes a safe message.
- Never surface raw Postgres messages, stack traces, or table names to the client.
- Every async boundary in the UI has a loading state: `loading.tsx`, `<Suspense>`, or a pending state from `useTransition`.

## Types

- Generate DB types from Supabase and commit them.
- Derive domain types from generated types: `type Order = Database['public']['Tables']['orders']['Row']`.
- Zod schemas own runtime shape at boundaries; infer TS from the schema rather than duplicating.
- No duplicated hand-written interfaces that mirror tables.

## Verification

Before finishing structural work: `npm run build`, then exercise the route in the browser, including one failure path (invalid input, missing record, unauthorized role).
