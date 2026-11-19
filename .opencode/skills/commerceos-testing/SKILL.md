---
name: CommerceOS Testing
description: Testing strategy and conventions for CommerceOS — Vitest, React Testing Library, Playwright, RLS tests, and visual checks. Load when writing or fixing tests, adding a feature that needs coverage, or verifying a change before reporting it done.
---

# CommerceOS Testing

Test the things that break money, permissions, and state. Do not test markup.

## Pyramid

| Layer | Tool | Covers | Speed |
|-------|------|--------|-------|
| Unit | Vitest | Pure logic: money math, discount rules, status transitions, zod schemas, formatters | ms |
| Integration | Vitest + Supabase (local) | Queries, Server Actions, RLS policies | seconds |
| Component | Vitest + RTL | Forms, table interactions, permission-gated UI | seconds |
| E2E | Playwright | Login → perform a real workflow → verify persisted result | tens of seconds |

Do not push logic tests up to E2E, and do not mock Supabase in integration tests that exist to prove RLS.

## Placement and naming

- Colocate: `features/orders/lib/status.ts` → `features/orders/lib/status.test.ts`.
- Component tests next to the component: `components/app/status-chip.test.tsx`.
- RLS tests in `tests/db/*.test.ts` (requires local Supabase).
- E2E in `e2e/*.spec.ts`.
- Test names read as behavior: `it('rejects a refund larger than the captured amount')`.

## What must have tests

Always:

- Money: line totals, discount application, tax, refund amounts, rounding. Cents in, cents out.
- Status machines: every allowed transition and at least one rejected transition.
- Permissions: each capability for each role, plus the "last owner" guard.
- RLS: store A member cannot read/write store B rows; anon reads nothing; support cannot write.
- Server Actions: invalid input, unauthorized caller, and the happy path.

Never required:

- Snapshot tests of whole pages.
- Tests that assert Tailwind classes or exact DOM structure.
- Tests for shadcn primitives themselves.

## Unit and component conventions

- Vitest with `jsdom` for components; `environment: 'node'` for pure logic.
- RTL queries in order of preference: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last resort).
- Use `userEvent`, not `fireEvent`.
- Assert on what the user sees and what the server received, not on internal state.
- No arbitrary `setTimeout`. Use `findBy*` / `waitFor` on a specific condition.
- Mock network at the boundary (the Server Action module or `fetch`), never deep inside components.

```ts
// features/orders/lib/totals.test.ts
import { describe, expect, it } from 'vitest'
import { computeOrderTotals } from './totals'

describe('computeOrderTotals', () => {
  it('applies a percentage discount before tax and rounds to cents', () => {
    const result = computeOrderTotals({
      items: [{ unitPriceCents: 1999, quantity: 3 }],
      discount: { type: 'percentage', value: 15 },
      taxRate: 0.0825,
      shippingCents: 0,
    })
    expect(result.subtotalCents).toBe(5997)
    expect(result.discountCents).toBe(900)
    expect(result.taxCents).toBe(420)
    expect(result.totalCents).toBe(5517)
  })
})
```

## RLS tests

Run against a local Supabase instance with seeded stores A and B.

- Sign in as a store A user, select from each table, assert only A rows return and B counts are zero.
- Attempt a cross-tenant write; assert it fails or affects zero rows.
- Attempt a role-forbidden write as `support`; assert rejection.
- If a test needs the service role to set up data, that is acceptable — but the assertion runs as the normal user.

## Playwright conventions

- Config: `testDir: './e2e'`, baseURL from env, `trace: 'on-first-retry'`, `retries: 1` in CI.
- Authentication: a setup project logs in once and writes `storageState`; feature specs reuse it.
- Seed deterministically before the run, and reset between specs. Tests must not depend on order.
- Selectors: `getByRole` with accessible names; stable `data-testid` only for non-semantic containers.
- No `page.waitForTimeout()`. Wait for a visible assertion or a network response.
- Assert persisted effects: after submitting, reload and confirm the new value is stored.

Critical E2E flows (each one spec):

1. Sign in, land on Overview, see seeded metrics.
2. Create a product with two variants, edit price, confirm on the list.
3. Filter and sort orders, open one, fulfil it, status persists.
4. Process a partial return and verify the refund amount matches line math.
5. Adjust inventory and see the derived on-hand change.
6. As `support`, verify write actions are absent and direct navigation to a restricted page is rejected.

## Accessibility checks

- Component tests assert accessible names on icon-only buttons and error association on fields.
- One Playwright spec runs axe on the five main pages and fails on serious/critical violations.
- Manual keyboard pass on any new dialog, menu, or table with row actions.

## Commands

```bash
npm test                 # unit + component
npm run test:watch
npm run test:e2e
npx vitest run --coverage
supabase db start        # local Postgres for RLS tests
```

If a script is missing, report the actual command instead of assuming.

## Reporting

State explicitly: what you ran, what passed, what you could not run and why. A green unit suite does not prove RLS works — say which layers were actually exercised.
