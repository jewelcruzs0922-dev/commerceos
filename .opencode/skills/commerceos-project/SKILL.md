---
name: CommerceOS Project
description: Project context, stack, conventions, commands, and definition of done for CommerceOS (Urban Goods e-commerce operations admin). Load at the start of any CommerceOS task, and whenever the stack, commands, or folder conventions matter.
---

# CommerceOS

Full-stack e-commerce operations platform. Portfolio-grade demo of a commercial admin SaaS.

## Product

| Item | Value |
|------|-------|
| Store | Urban Goods (fictional) |
| Market | United States, USD |
| Users | Shop staff: owner, admin, manager, staff |
| Scope | Internal operations only — no public storefront, no checkout, no payments, no customer email |
| Data | Fictional products, customers, orders, inventory, analytics |

Modules: Overview, Products & Variants, Collections, Orders, Customers, Inventory, Analytics, Discounts, Returns & Refunds, Team & Permissions, Store Settings.

## Stack

Next.js App Router · React · TypeScript (strict) · Tailwind CSS · shadcn/ui · Supabase (Postgres, Auth via `@supabase/ssr`) · Recharts · TanStack Table · React Hook Form · Zod · Lucide React · Sonner · Vitest · React Testing Library · Playwright · Vercel · Git/GitHub.

## First action on any task

1. Read `package.json` and confirm installed versions. Do not assume Next.js, React, Tailwind, or shadcn versions — the API surface differs between majors.
2. Check whether the module you are touching already exists. Never scaffold over existing code.
3. Read the closest existing implementation before writing a new one, and match it.

## Commands

Use the scripts actually declared in `package.json`. The expected defaults:

```bash
npm run dev          # local dev
npm run build        # production build — must pass
npm run lint
npm run typecheck    # or: npx tsc --noEmit
npm test             # vitest
npm run test:e2e     # playwright
```

If a script does not exist, say so instead of inventing one. Verify with `npm run build` before declaring work finished.

## Conventions

- Files: `kebab-case.ts(x)`. Components: `PascalCase`. Hooks: `useThing`. Server actions: verb-first (`createOrder`, `refundPayment`).
- Imports: `@/*` for `src/*`, then external packages, then relative. Keep the existing ordering.
- Prefer named exports. Default export only for Next.js pages, layouts, `error.tsx`, `not-found.tsx`, and route handlers.
- No `any`. No `as unknown as`. No `!` non-null assertion unless the invariant is proven on the previous line.
- No comments that restate the code. Comment only non-obvious invariants and why.
- No new dependency without checking `package.json` first and stating why it is needed.
- Currency is stored and computed as integer minor units (cents). Format at the render boundary only.
- All timestamps are `timestamptz`, stored UTC, rendered in a fixed display timezone.
- Every list view has: loading, empty, error, and no-results-for-filter states.
- Every mutation has: pending, success (Sonner toast), and failure handling.

## Working style

- Plan before building. For multi-file work, list the files you will add or change first.
- Change the smallest surface that solves the problem. Do not refactor unrelated files in the same change.
- Never fake data in a component to make a screenshot look better. Fictional data lives in the database seed.
- Report honestly: if something is unverified, mocked, or incomplete, say so explicitly.

## Definition of done

- `npm run build` passes, and `npm run lint` / `npm run typecheck` pass when those scripts exist.
- The feature works at 375px, 768px, and 1440px viewports.
- Loading, empty, and error states exist.
- Authorization is enforced on the server and in RLS, not only in the UI.
- New interactive elements are keyboard reachable and have visible focus.
- No secret, key, or service-role credential appears in client code or `NEXT_PUBLIC_*`.

## Related skills

Composition and performance rules live in `vercel-react-best-practices` and `vercel-composition-patterns`. Supabase and SQL rules live in `supabase` and `supabase-postgres-best-practices`. Component mechanics live in `shadcn`. Visual direction lives in `commerceos-design`.
