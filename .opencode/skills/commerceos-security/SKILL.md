---
name: CommerceOS Security
description: Authorization, session, validation, and secrets rules for CommerceOS. Load before building auth, permissions, server actions, route handlers, or anything touching tenant data, and when auditing for access-control or data-leak flaws.
---

# CommerceOS Security

Threat model for this project: authenticated staff of one store attempting to read or change another store's data, or a lower role performing a higher-role action. There is no anonymous public surface except `/login`.

## Enforcement layers

All four are required. Each one is a separate chance to fail closed.

| Layer | Responsibility | Not responsible for |
|-------|----------------|---------------------|
| `middleware.ts` | Refresh the Supabase session cookie; redirect unauthenticated users off `/(dashboard)` | Authorization, data access |
| Dashboard layout | `getUser()`, redirect if null; load membership for the active store | Fine-grained capabilities |
| Server Action / Route Handler | `requireSession()` + `requireCapability()` on every mutation and private read | Nothing — this is the authoritative gate |
| Postgres RLS | Row-level tenant isolation for every table | UI decisions, friendly errors |

If a rule exists only in the UI, it does not exist.

## Session handling

- Use `@supabase/ssr` with `createServerClient` in `lib/supabase/server.ts` and `createBrowserClient` in `lib/supabase/client.ts`.
- Trust `getUser()` (server-verified). Do not authorize from `getSession()` alone, and never from a decoded JWT on the client.
- Middleware must return the `supabaseResponse` object with updated cookies. Do not create a new response after `getUser()` without copying cookies.
- Re-check auth in the layout as well as middleware. Middleware can be bypassed by direct server invocation.
- Sign-out clears cookies server-side and redirects to `/login`.

## Authorization

- Identity: `auth.uid()` → `profiles.id`.
- Authorization: `store_members.role` for the active store. Resolve the store from the session's active membership or a validated `storeSlug` param — never from a client-supplied `storeId` alone.
- One capability map, used by both UI and server:

```ts
// lib/permissions.ts
export const CAPABILITIES = {
  'products:write': ['owner', 'admin', 'manager'],
  'orders:write':   ['owner', 'admin', 'manager'],
  'team:manage':    ['owner'],
  'settings:write': ['owner'],
  'data:read':      ['owner', 'admin', 'manager', 'staff'],
} as const satisfies Record<string, readonly MemberRole[]>

export function can(role: MemberRole, capability: Capability): boolean { … }
```

- The UI uses `can()` only to hide controls. The server calls `requireCapability()` and throws/returns before touching data.
- Never trust `role`, `storeId`, `userId`, `customerId`, or `total_cents` from the client payload.
- Privilege escalation checks: a user cannot change their own role, cannot grant a role above their own, and the last `owner` cannot be demoted or removed.
- Impersonation, if built, is read-only, logged, visually obvious, and time-boxed.

## Input validation

- Zod at every boundary: Server Action input, Route Handler body/query, search params, form data.
- Validate, then derive. Never pass unvalidated input into a query builder.
- Allowlist everything that reaches SQL ordering or filtering:

```ts
const sortableColumns = ['placed_at', 'total_cents', 'order_number'] as const
const sort = z.enum(sortableColumns).catch('placed_at')
```

- Pagination is bounded: `limit` max 100, offset non-negative.
- Sanitize/validate IDs as UUIDs before use. An invalid UUID should be a 400, not a database error.

## Secrets and environment

- Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nothing else may be `NEXT_PUBLIC_`.
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, any management token. Import only inside modules marked `import 'server-only'`.
- Never log env values, cookies, tokens, or full request headers.
- `.env.local` is gitignored. Commit `.env.example` with empty placeholders and a comment describing each variable.
- If a key is ever committed or pasted into chat, rotate it and say so.

## Server Actions and route handlers

- Server Actions are public endpoints. Every one starts with parse → authenticate → authorize.
- Verify the origin for state-changing handlers when using cookies; do not add wildcard CORS.
- Route handlers: check method, parse body, authorize, then act. Return typed JSON, never raw error objects.
- File uploads (product images): validate MIME and size server-side, generate the storage path server-side, never trust the client filename.
- Redirects after auth (`?next=`) must be allowlisted to internal paths.

## Rendering

- Avoid `dangerouslySetInnerHTML`. Product descriptions are rendered as plain text or through a sanitizer with a strict allowlist.
- External links use `rel="noopener noreferrer"`.
- Do not render user-controlled strings into `href` without protocol validation (`javascript:`).
- Security headers via `next.config` or middleware: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`, and a CSP compatible with Next.js and Supabase.

## IDOR checklist

For every route, action, and query:

- [ ] The object's `store_id` is derived from the session, and the query filters on it.
- [ ] The object is re-read on the server; the client's claimed ownership is ignored.
- [ ] A member of store A cannot fetch a store B id, even by pasting it directly.
- [ ] A `staff` user cannot call a manager-only action by crafting a request.
- [ ] Deleting/updating by id includes the tenant predicate in the `where` clause.

## Audit trail

- Sensitive mutations (role change, refund, order cancel, inventory adjustment, setting change) write to `activity_log(store_id, actor_id, action, entity, entity_id, metadata, created_at)`.
- Logs include actor and before/after essentials, never secrets or full PII dumps.
- The UI surfaces recent activity for accountability.

## Before finishing

- `npm run build` passes; no service-role import in any client bundle (grep the build output).
- Run one negative test per new surface: unauthenticated, wrong store, insufficient role.
- Confirm RLS returns zero rows for a non-member.
- Confirm no new `NEXT_PUBLIC_` variable was introduced.
