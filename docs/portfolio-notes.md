# Portfolio presentation notes

## One-line summary

CommerceOS is a multi-tenant e-commerce operations admin for a fictional US store, built to demonstrate server-first Next.js, Postgres row-level security, and transactional commerce workflows rather than a storefront.

## Problem

Small merchants often run their business from disconnected spreadsheets and admin screens. An operations workspace has to keep catalog, stock, orders, refunds, returns, permissions, and reporting consistent while remaining fast and legible for daily use. CommerceOS models that problem end to end for one fictional store, with data that reconciles rather than decorative numbers.

The product intentionally excludes checkout, payment processing, customer email, and a public storefront. It is an internal staff tool.

## What is complete

- All eleven planned modules: Overview, Products, Collections, Orders, Customers, Inventory, Analytics, Reports, Discounts, Returns, Team, Settings, and Notifications.
- Multi-tenant schema with RLS on every public table and role-based server authorization.
- Transactional workflows for order creation, reservations, partial/full fulfillment, cancellation, refunds, returns, discount redemption, and inventory adjustment.
- Deterministic 12-month demo dataset with a one-click read-only guest experience and guarded owner reset.
- 125 Vitest tests, 5 real-PostgreSQL concurrency tests, 10 Playwright tests, axe accessibility checks, responsive checks at 375/768/1440, a nonce-based CSP, CI, and a hosted direct-write denial check.
- Direct writes to workflow-owned tables removed; all 19 public functions are security-definer with role checks; reporting views use security-invoker.
- Prepared Vercel configuration and handoff documentation.

## What is not complete

- No production deployment, domain, or live demo URL.
- No Supabase Storage uploads; imagery is external URL-based.
- No multi-store switching; the active store is the first membership.
- No per-user notification read state or saved report definitions.
- CI is defined but has not run on a remote repository.
- No multi-connection Postgres load test or screen-reader matrix.
- No real payment provider or customer messaging, by design.

## Architecture talking points

```text
Next.js App Router → server queries/actions → Supabase Auth + Postgres RLS
                                      └→ transactional SQL functions
```

- **Server-first:** Server Components and URL-driven lists. Client Components are limited to dialogs, charts, menus, theme, and forms.
- **Two-layer authorization:** capability checks in Server Actions plus RLS in Postgres. Middleware only refreshes the session and performs an optimistic redirect.
- **Session-derived tenancy:** store scope comes from membership, never from a client-supplied store id.
- **Transactional commerce:** order creation, fulfillment, refunds, returns, and inventory adjustments run in database functions so retries cannot split stock and financial state.
- **Historical snapshots:** order items preserve product/variant/SKU/price at purchase time.
- **Integer cents and timezone-aware reporting:** no float money; analytics day boundaries use the store timezone.
- **Demo isolation:** anonymous guest sessions receive a read-only `viewer` membership; reset is restricted to demo stores and demo mode.
- **Honest data:** analytics derive from persisted orders/refunds/items, and reconciliation views are tested.

## Technical decisions and tradeoffs

| Decision | Why | Cost |
| --- | --- | --- |
| No TanStack Table | Server-rendered, URL-driven lists keep tenant filtering on the server and reduce client state | Advanced client-side column features are absent |
| No React Hook Form | Native form actions + `useActionState` make server validation authoritative | Less client-side field-level ergonomics |
| No service-role client | The app never needs privileged bypass; RLS plus user sessions is safer | Some admin/test tasks require the dashboard |
| Postgres functions for workflows | Atomicity and legal transition guards across multiple tables | More SQL to test and maintain |
| PGlite for schema/RLS tests | Docker was unavailable; migrations still run in Postgres-compatible WASM | Not identical to a live Supabase instance |
| External deterministic images | Keeps the demo portable without a Storage setup | No upload or transformation pipeline |
| Viewer role for demo | A real session and RLS policy are stronger than a shared admin credential | Anonymous auth rows accumulate |

## Security walkthrough

1. `src/proxy.ts` refreshes the session and redirects unauthenticated dashboard requests.
2. Dashboard pages re-check the user and membership.
3. Server Actions parse with Zod, authenticate, and check a capability from `src/lib/permissions.ts`.
4. Queries include the session store predicate.
5. RLS on 23 tables blocks cross-tenant access and lower-role writes.
6. Direct DML is revoked on the nine workflow tables; all 19 public functions are security-definer and re-check ownership, caps, and transitions.
7. Exports require a session and are store-scoped.
8. A nonce-based CSP plus nosniff, frame denial, referrer policy, opener policy, permissions policy, and HSTS protect the browser.
9. Demo entry is anonymous-only, demo-store-only, and read-only; reset requires owner/admin + `is_demo` + `DEMO_MODE`.
10. Hosted API checks confirmed a viewer can read but receives 403 on direct order writes.

Evidence is in `tests/rls`, `e2e/security.spec.ts`, `docs/security.md`, and `PROJECT_STATUS.md`.

## Demo script

1. Open `/login` and choose **Try the read-only demo**.
2. Point out the compact demo disclosure in the Overview header and footer, plus the viewer status in the sidebar.
3. Show the Overview metric hierarchy, ledger table, and consolidated attention panel.
4. Open Orders, filter/search, and open an order. Point out historical line-item snapshots and totals.
5. Show that fulfillment/refund controls are absent for the viewer.
6. Open Analytics and explain that net sales exclude completed refunds and use the store timezone.
7. Open Products and Inventory to show variants, reservations, and movement history.
8. As the owner, show Settings reset and explain its three guards. Do not reset during a live walkthrough unless intended.

## Reviewer checklist

- Does the UI read as an operations tool rather than a generic template?
- Are table density, hierarchy, and empty/loading/error states coherent?
- Can you trace a write from a form to a Server Action to a database function to RLS?
- Do the numbers reconcile with the seeded records?
- Does the demo stay read-only when inspected with the API?
- Are limitations stated without overclaiming?

## Future work

- Production deployment and live demo after approval.
- Run CI remotely and add scheduled dependency/secret scanning.
- Supabase Storage with MIME/size/path validation and bucket policies.
- Multi-store switching and per-user notifications.
- Saved reports and export scheduling.
- A multi-connection Postgres load test for reservation and idempotency races.

## Links

- [README](../README.md)
- [Architecture](architecture.md)
- [Database schema](database-schema.md)
- [Security](security.md)
- [Setup](setup-guide.md)
- [Deployment](deployment.md)
- [Changelog](../CHANGELOG.md)
