# CommerceOS

E-commerce operations admin for the fictional store **Urban Goods** (US, USD). Internal staff tool: no public storefront, no checkout, no payment processing, no customer email. Portfolio project built to look and behave like commercial SaaS.

Modules: Overview, Products & Variants, Collections, Orders, Customers, Inventory, Analytics, Discounts, Returns & Refunds, Team & Permissions, Store Settings.

## Status

**Phase 1 complete: scaffolded, not yet designed or connected.** Next.js 16 App Router, React 19, Tailwind CSS v4, strict TypeScript, and ESLint are installed and building. There is no Supabase project, auth, database, or dashboard module yet. `npm test` and `npm run test:e2e` do not exist until the testing phase; do not invent them. Keep `PROJECT_STATUS.md` current.

## Stack (target)

Next.js App Router · React · TypeScript strict · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth via `@supabase/ssr`) · Recharts · TanStack Table · React Hook Form · Zod · Lucide React · Sonner · Vitest · React Testing Library · Playwright · Vercel.

Confirm installed versions from `package.json` before relying on any framework API. Major versions change the surface (async `params`, Tailwind v4 CSS-first config, React 19 refs).

## Commands

Use only scripts declared in `package.json`. Current scripts:

```bash
npm run dev
npm run build      # must pass before work is reported done
npm run lint
npm run typecheck   # next typegen && tsc --noEmit
```

## Conventions

- Server Components by default; `'use client'` only at the leaf that needs interactivity.
- Routing and composition in `src/app`; business logic, queries, and actions live in `src/features/<module>/`.
- Data reads go through `features/*/queries.ts` (server only). Mutations go through `features/*/actions.ts` (Server Actions).
- Never query Supabase from a Client Component and never edit `components/ui` by hand.
- Money is integer cents. Format only at the render boundary. Timestamps are `timestamptz`, UTC.
- Every list view has loading, empty, error, and filtered-empty states. Every mutation has pending, success (Sonner), and failure handling.
- No `any`, no unsafe casts, no non-null assertions without a proven invariant. No comments that restate code.
- No new dependency without checking `package.json` first and stating why it is needed.
- Fictional data belongs in the database seed, never hardcoded in components to improve a screenshot.

## Security baseline

- Authorization is enforced server-side and in RLS — never only in the UI.
- Every mutation: parse input (Zod) → authenticate → authorize by role → act → revalidate.
- Tenant id comes from the session, never from the client payload.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be public. The service-role key is server-only.
- `.env.local` stays untracked; keep `.env.example` current.

## Definition of done

`npm run build` passes; lint and typecheck pass; works at 375/768/1440; states covered; authorization enforced on the server; keyboard reachable with visible focus.

## Skills

Load the project skills before relevant work: `commerceos-project`, `commerceos-design`, `commerceos-architecture`, `commerceos-database`, `commerceos-security`, `commerceos-testing`, `commerceos-code-review`. Third-party: `supabase`, `supabase-postgres-best-practices`, `shadcn`, `vercel-react-best-practices`, `vercel-composition-patterns`, `frontend-design`, `web-design-guidelines`, `playwright-cli`.
