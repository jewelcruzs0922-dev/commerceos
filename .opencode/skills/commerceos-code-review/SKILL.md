---
name: CommerceOS Code Review
description: Review protocol, severity rubric, and domain-specific checks for CommerceOS changes. Load when asked to review a diff, PR, file, or feature, or before declaring your own multi-file change complete.
---

# CommerceOS Code Review

Review evidence, not intent. Read the code; do not infer behavior from names.

## Protocol

1. Read the diff, then the full files it touches for context. Do not review fragments in isolation.
2. Identify what the change claims to do, in one sentence.
3. Run the checks that exist: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`. Report failures first.
4. Walk the checklist below. For each finding, record `file:line`, the problem, the consequence, and the fix.
5. Assign severity. Order findings by severity, not by file.
6. Say what you verified and what you did not. Never claim runtime behavior you did not observe.

## Severity

| Level | Meaning | Examples |
|-------|---------|----------|
| Blocker | Data loss, security hole, broken build, wrong money | Cross-tenant read, service key in client, failing typecheck |
| Major | Incorrect behavior in a real path, missing authz, unhandled failure | Action without role check, total doesn't reconcile, no error state |
| Minor | Correct but fragile or inconsistent | Missing index on a hot filter, duplicated formatter, `any` leak |
| Nit | Style, naming, wording | Only if a project rule exists; otherwise skip |

Do not pad a review with nits. A review with three real findings is better than twenty cosmetic ones.

## Checklist

**Correctness**
- [ ] Money uses integer cents and rounds once, at the boundary.
- [ ] Totals reconcile with line items and discounts.
- [ ] Status transitions match the allowed set; no unreachable or illegal states.
- [ ] Dates are stored UTC and rendered consistently.
- [ ] Boundary values: zero, negative, max length, empty list, null optional fields.

**Authorization**
- [ ] Every mutation calls `requireSession()` and `requireCapability()`.
- [ ] Tenant id comes from the session, not the payload.
- [ ] Query filters on `store_id` in addition to RLS.
- [ ] UI hiding is backed by a server check.
- [ ] RLS policy exists and matches the capability table.
- [ ] No `user_metadata` used for authorization.

**Data**
- [ ] No `select('*')` in list queries.
- [ ] Independent reads parallelized; no request waterfalls.
- [ ] Indexes exist for new filters/sorts on large tables.
- [ ] Migrations are additive and never edit an applied migration.
- [ ] Types regenerated after schema change.

**Next.js and React**
- [ ] `'use client'` is at the leaf, not the page.
- [ ] No non-serializable props crossing the server/client boundary.
- [ ] `params`, `searchParams`, `cookies()`, `headers()` are awaited.
- [ ] Server Actions revalidate affected paths.
- [ ] `useEffect` is not used for derived state or data that could be read on the server.

**Failure handling**
- [ ] Loading, empty, error, and filtered-empty states exist.
- [ ] Errors are user-readable and do not leak internals.
- [ ] Optimistic updates reconcile or roll back.

**UI**
- [ ] Matches the design system tokens; no one-off colors or sizes.
- [ ] No banned design tells (see `commerceos-design`).
- [ ] Keyboard reachable with visible focus; labels and `aria-label` present.
- [ ] Contrast sufficient; status not conveyed by color alone.
- [ ] Works at 375 / 768 / 1440.

**Maintainability**
- [ ] No duplicated logic that already exists in `lib/` or the same feature.
- [ ] No new dependency without justification.
- [ ] No `any`, unsafe casts, or non-null assertions without a proven invariant.
- [ ] Naming matches conventions; file placement matches the architecture.

## Domain traps to look for

- A discount applied twice (once at line level, once at order level).
- Refund exceeding captured amount, or refunded quantity exceeding ordered quantity.
- Inventory decremented on order creation instead of on fulfilment, or decremented twice.
- Cancelling an order that is already refunded.
- Pagination offset computed from page before filters change, producing missing rows.
- Filters that silently drop `store_id` when combined.
- Charts summing pre-tax values but labeled as revenue.
- Toasts claiming success when the action returned `{ ok: false }`.

## Output format

```md
## Summary
<one sentence: what the change does and whether it is safe to merge>

## Verification
- build: pass | fail | not run
- lint / typecheck: …
- tests: …

## Findings

### [Blocker] Cross-tenant write in cancelOrder — features/orders/actions.ts:24
The action updates by `id` only. A member of store B can cancel store A's order by guessing an id.
Fix: add `.eq('store_id', storeId)` from the session and assert the row count is 1.

### [Major] Missing error state on the orders table — app/(dashboard)/orders/page.tsx:41
A failed query renders an empty table, which reads as "no orders".
Fix: render the error state with a retry action.

## Not verified
- RLS behavior for `refunds` was not exercised against the local database.
```

## Rules

- Never approve with a blocker open, or with failing build/typecheck.
- Do not rewrite scope: if the change is correct but the surrounding area has problems, list them separately as follow-ups.
- If you cannot verify a claim, mark it unknown instead of guessing.
- When reviewing your own work, wait at least until the build passes, then review the diff as if someone else wrote it.
