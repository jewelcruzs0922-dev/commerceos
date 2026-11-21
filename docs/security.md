# Security model

## Scope and threat model

CommerceOS is an internal staff tool for fictional data. The relevant threats are:

- A member of store A reading or changing store B data by editing IDs, URLs, or request payloads.
- A lower role (`staff`, `viewer`) performing a manager-only action through a crafted request.
- A guest demo session escaping read-only mode or creating a store.
- Leaking the service-role key or another privileged secret to the browser or repository.
- A retry duplicating a refund, reservation, or inventory movement.
- A public deployment accidentally exposing non-demo data or a destructive reset path.

There is no public storefront, checkout, real payment, customer email, file upload, or user-generated HTML rendering in this build.

## Enforcement layers

| Layer | Responsibility |
| --- | --- |
| `src/proxy.ts` | Refresh the Supabase cookie and redirect unauthenticated dashboard requests. This is not authorization. |
| Dashboard layout | Verify the user and load the active membership. |
| Server Action / Route Handler | Parse input, authenticate, check capability, mutate, revalidate. Authoritative gate. |
| Postgres RLS | Tenant isolation and role-aware write policies on every public table. |
| Database functions | Validate state transitions, caps, ownership, and atomic multi-row changes. |

A control that exists only in the UI is treated as absent.

## Authentication and sessions

- Supabase Auth with `@supabase/ssr`.
- Server code resolves the session with `getClaims()` / verified user data, not a decoded token from the client.
- Cookies are refreshed in `src/proxy.ts` with the Supabase response object preserved.
- Dashboard pages call `requireAuthContext()` / `requireMemberContext()` again; middleware alone is not trusted.
- Sign-out clears cookies server-side.
- Auth redirects use `safeInternalPath()` and only allow internal destinations.
- Registration uses email confirmation by default. The hosted project must have outbound email configured for end-to-end staff registration.
- Anonymous sign-ins are enabled only to support the read-only demo.

## Authorization

`src/lib/permissions.ts` is the single capability map:

| Capability | Roles |
| --- | --- |
| Read data/orders/customers | owner, admin, manager, staff, viewer |
| Read analytics | owner, admin, manager, viewer |
| Manage products/collections/orders/customers/discounts/returns | owner, admin, manager |
| Fulfill orders | owner, admin, manager, staff |
| Adjust inventory | owner, admin, manager, staff |
| Manage team/settings | owner, admin |
| Transfer ownership | owner |

Server actions call `requireCapability()` before touching data. RLS policies implement matching write boundaries. The UI uses `can()` only to hide controls.

Ownership safeguards: a member cannot change their own role, cannot grant a role above their own, and the last owner cannot be demoted or removed. Owner invitations are blocked.

## Tenant isolation

- Store scope comes from the session's active membership.
- Queries filter by `store_id` in addition to RLS.
- Inserts use `WITH CHECK` policies that require an active membership in the target store.
- Order, item, customer, inventory, return, and discount operations re-read ownership on the server.
- PGlite RLS suites prove store A cannot read/write store B rows, suspended members lose access, staff cannot perform manager writes, and viewer writes are rejected.
- The hosted guest path was exercised live: an anonymous viewer read 350 orders, then received `42501 permission denied` for a direct order update and insert; `create_order` returned `P0001 Not authorized`.

## Workflow write boundary

Direct `INSERT`, `UPDATE`, and `DELETE` are revoked from `authenticated` for `orders`, `order_items`, `payments`, `refunds`, `returns`, `return_items`, `inventory`, `inventory_movements`, and `discount_usages`. Their write policies were removed as defense in depth. The corresponding workflow functions are `SECURITY DEFINER`, use an empty search path, and perform their own membership/role checks:

`create_order`, `fulfill_order`, `cancel_order`, `record_refund`, `record_refund_once`, `create_return`, `decide_return`, `refund_return`, `adjust_inventory`, `redeem_discount`, `create_product`, `add_product_variant`, `duplicate_product`, and `set_collection_products`.

This closes the prior medium-integrity finding where a manager could bypass workflow validation with a crafted API request. A table owner/operator can still use SQL, as intended.

## Demo security

- `DEMO_MODE` is a server-only flag. Without it, the guest button and reset action do not render or run.
- Guest entry creates an anonymous Supabase session, then calls `join_demo_store`.
- `join_demo_store` accepts only anonymous users and only demo stores.
- The guest receives a `viewer` membership; every write path is blocked by capability checks and RLS.
- Anonymous users cannot create stores (`demo_guard_store_creation`).
- Reset requires `is_demo`, an owner/admin caller, and `DEMO_MODE=true`; it cannot target a normal store.
- Supabase anonymous sign-in rate limits apply (local config: 30 per hour per IP). The hosted plan's limits should be reviewed before a public launch.
- Demo auth rows accumulate. Reset clears demo memberships but not `auth.users` rows; operational cleanup is documented.

## Input validation and data safety

- Zod validates Server Action inputs, route handler parameters, search params, forms, and IDs.
- UUID-shaped IDs are rejected before reaching Postgres, so malformed IDs return a 404/400 rather than a database error.
- Sorting columns are allowlisted; pagination is bounded.
- Money uses integer cents; refunds are capped by a database trigger/function.
- Order item values are snapshots and are not recomputed from current products.
- Raw Postgres errors, stack traces, and table names are not shown to users.
- No `dangerouslySetInnerHTML` is used for user-controlled content.

## Secrets

- Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Server-only: `DEMO_MODE`; `SUPABASE_SERVICE_ROLE_KEY` is reserved and unused.
- `.env.local` is ignored and was never committed. `.env.example` contains empty placeholders.
- Application code never uses the service-role key.
- A workspace scan found no JWT, secret key, service-role value, or private account identifier in tracked/untracked candidate files. The real Supabase project reference was removed from public-facing status documentation during handoff.
- Git history contains only the initial scaffold commits and no credential patterns.
- If a secret is ever committed or pasted publicly, rotate it before rewriting history.

## HTTP and browser protections

`next.config.ts` sets:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`

Images are restricted to `picsum.photos`, `fastly.picsum.photos`, `images.unsplash.com`, and `*.supabase.co`.

Staging can be protected with optional server-only HTTP Basic credentials (`STAGING_BASIC_USER` / `STAGING_BASIC_PASSWORD`). The hosted staging URL returns 401 without them. The public demo removes those variables.

A nonce-based **Content-Security-Policy** is generated per request in `src/proxy.ts` and applied to document responses. It uses `script-src 'self' 'nonce-…' 'strict-dynamic'`, allows Tailwind/Recharts inline styles, restricts images/connections to the app and Supabase, and sets `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `upgrade-insecure-requests` in production. The root layout passes the nonce to the theme script. Playwright asserts the header and that `/login` renders without CSP console violations.

## Exports and route handlers

- Order and analytics CSV exports require an authenticated member.
- Unauthenticated requests are redirected by the proxy or rejected by the handler; Playwright verifies a 307 redirect/401 without following redirects.
- Exports are scoped to the active store and row/date caps, and RLS remains active.

## Audit and retry safety

- Sensitive mutations write `activity_logs`.
- Order, fulfillment, cancellation, refund, return, and inventory operations share transactional functions.
- Refund and order creation keys provide retry idempotency and use `pg_advisory_xact_lock` to serialize same-key submissions before the unique index.
- Reconciliation views flag line-total, refund-cap, fulfillment, and reservation drift.

## Verification evidence

Last verified:

- `npm test` — **128 tests across 19 files**, including catalog-level security-audit, direct-write denial, view-isolation, duplicate-submission, and workflow suites against migrated PGlite.
- `npm run test:integration` � **5 real-PostgreSQL tests** with two independent connections and overlapping transactions.
- `npm run test:e2e` — **10 Playwright tests**: guest entry, read-only writes, protected redirects, responsive overflow, keyboard entry, axe checks, headers, export rejection, and CSP nonce/browser violations.
- `npm run lint`, `npm run typecheck`, `npm run build` — pass, **31 routes**.
- `npm audit` — **0 vulnerabilities** after removing the unused shadcn CLI and vendoring its Tailwind companion stylesheet.
- Hosted checks — anonymous viewer read 350 orders; direct update/insert returned 403/42501; `create_order` returned 400/P0001; demo reset regenerated data; reconciliation views clean.
- Hosted catalog verification — 19 definer functions with empty `search_path`, 0 direct write grants on the nine workflow tables, 4 security-invoker views, 0 write policies on those tables.

## Residual risks

| Risk | Severity | Status |
| --- | --- | --- |
| Anonymous auth users accumulate (57 on the hosted demo) | Low operations | Documented; cleanup query requires approval |
| CI workflow has not executed on a remote repository | Low delivery | Definition added; first remote run pending |
| Duplicate-submission tests share one PGlite connection; not a multi-connection load test | Low assurance | Honest limitation; row locks and unique indexes still exercised |
| Same-key idempotency is serialized by advisory locks; sustained load is unmeasured | Low | Real PG two-connection test passed |
| Supabase Free plan has no project backups | Medium operations | Documented; recover by recreating and reseeding the fictional demo |
| External placeholder images rather than Storage | Low product | Intentional |
| No Storage bucket policies because uploads are disabled | N/A | No upload surface exists |
| No public production deployment; staging is unlisted and unprotected | Operational | Staging deployed; public demo awaiting approval |

No known critical, high, or medium unresolved security finding remains after the hardening pass. The prior direct-write and CSP findings are closed.

## Production checklist

Before a public deployment:

- [ ] Review the deployment checklist in [`deployment.md`](deployment.md).
- [ ] Set the Supabase Auth Site URL and redirect allowlist to the production origin.
- [ ] Set production environment variables in Vercel; never commit them.
- [ ] Confirm `DEMO_MODE=true` only if the public read-only demo is intended.
- [ ] Re-run the secret scan after staging the release.
- [ ] Review Supabase anonymous rate limits and plan limits.
- [ ] Re-run `npm audit`, tests, and the production smoke test.
- [ ] Obtain explicit user approval before deploying.
