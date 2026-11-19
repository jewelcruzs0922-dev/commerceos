# CommerceOS

CommerceOS is an e-commerce operations platform for the fictional US store **Urban Goods**. It is an internal staff tool for products, orders, customers, inventory, analytics, and store administration. There is no storefront, checkout, payment processing, or customer messaging, and all data is fictional.

The project is built as a portfolio-grade demonstration of production patterns: strict TypeScript, server-first React, tenant-scoped data access, row-level security, and a deliberately restrained interface.

## Status

Phase 1 — project foundation. The Next.js application builds, lints, and typechecks, but there are no database, auth, or dashboard modules yet. See `PROJECT_STATUS.md` for the current phase and verified commands.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Data | Supabase (Postgres, Auth, Storage) via `@supabase/ssr` |
| UI data | Recharts, TanStack Table |
| Forms | React Hook Form, Zod |
| Utilities | date-fns, Sonner, Lucide React |
| Testing | Vitest, React Testing Library, Playwright |
| Hosting | Vercel (not deployed) |

Versions are pinned in `package.json`. Confirm them before relying on framework APIs.

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Environment variables are documented in `.env.example`. Copy it to `.env.local` when the Supabase work begins; the Phase 1 build does not read any environment variables.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build; must pass before work is considered done |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Structure

```text
src/
  app/        routing, layouts, and composition only
  features/   per-module components, queries, actions, schemas, and types
  components/ ui primitives and shared application components
  lib/        supabase clients, formatting, permissions, utilities
  types/      generated database types
```

Planned placement rules and server/client boundaries are documented in `AGENTS.md` and the project skills under `.opencode/skills/`.

## Principles

- Server Components by default; client components only where interaction requires them.
- Reads go through `features/*/queries.ts`; writes go through `features/*/actions.ts`.
- Every mutation validates input with Zod, authenticates, authorizes on the server, then revalidates.
- Store scope is derived from the session, never from client input.
- Money is stored as integer cents; formatting happens at the render boundary.
- Fictional data lives in database seeds, never in production components.

## Roadmap

1. Project foundation
2. Brand and design system
3. Application shell
4. Supabase and security foundation
5. Core modules — products, collections, orders, customers, inventory
6. Advanced modules — analytics, reports, discounts, returns, refunds, team, settings
7. Business workflow integration
8. Demo environment
9. Quality assurance
10. Deployment and handoff

## Disclaimer

Urban Goods, its products, customers, orders, and all figures are fictional. This project performs no real payment processing and sends no customer communications.
