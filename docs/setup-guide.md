# Setup guide

This guide takes a new developer from a clone to a working local CommerceOS workspace with a seeded read-only demo.

## Prerequisites

- Node.js 22 or newer (local verification used Node 26)
- npm 10 or newer
- A Supabase project
- Optional: Docker for the local Supabase CLI stack, `supabase start`, and `db reset`
- Optional: Playwright Chromium for E2E

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Start the app:

```bash
npm run dev
```

Open <http://localhost:3000>. Without Supabase credentials, the app shows the `/setup` screen instead of failing with an opaque error.

## 2. Configure environment

Fill `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEMO_MODE=true
```

`NEXT_PUBLIC_*` values are public and inlined at build time. Do not add a `NEXT_PUBLIC_` prefix to server-only variables. `SUPABASE_SERVICE_ROLE_KEY` is reserved and not used by app code; leave it empty unless a future admin tool needs it.

## 3. Configure Supabase Auth

In the Supabase dashboard:

1. **Authentication → Providers → Email:** enable email confirmation for staff accounts.
2. **Authentication → Providers → Anonymous:** enable anonymous sign-ins for the guest demo.
3. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000`
   - Additional redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000/reset-password`
   - Add the same paths for `http://127.0.0.1:3000` if needed.
4. Configure outbound email so confirmation and password-reset messages can be delivered. The built-in Supabase sender is rate-limited; use a real SMTP provider for reliable staff registration.

For production, replace the origin with the Vercel domain and keep the same callback paths. See [`deployment.md`](deployment.md).

## 4. Apply migrations

Preferred:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

If the CLI or Docker is unavailable, apply the files in `supabase/migrations` through the Supabase SQL editor in filename order. The schema is additive and idempotent where practical.

Then seed the demo store:

```sql
select private.seed_demo_store(id)
from public.stores
where slug = 'urban-goods';
```

The store must already exist. Create it by registering, confirming the email, signing in, and completing onboarding. The first membership is the owner.

Do not run the seed against a store that is not `is_demo=true`.

## 5. Verify the workspace

1. Sign in as the owner and confirm `/dashboard` shows seeded metrics.
2. Open `/products`, `/orders`, `/customers`, `/inventory`, and `/analytics`.
3. Sign out and use **Try the read-only demo** when `DEMO_MODE=true`.
4. Confirm the demo banner and that write controls are absent.
5. Use the Settings reset control only as the owner of a demo store.

Expected demo volumes: 50 products, 150 variants, 8 collections, 150 customers, 350 orders, 40 returns, 6 discounts, 13 low-stock variants, and zero reconciliation issues.

## 6. Run checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

E2E:

```bash
npx playwright install chromium
npm run test:e2e
```

The E2E suite expects the app at `http://localhost:3000`, `DEMO_MODE=true`, a seeded demo store, and anonymous sign-ins. To test another origin:

```bash
$env:PLAYWRIGHT_BASE_URL="https://your-preview.example"
npm run test:e2e
```

`playwright.config.ts` reuses an existing server when the URL responds. E2E creates anonymous guest users and is not safe to run against a production store with real data.

## 7. Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation and `tsc --noEmit` |
| `npm test` | Vitest unit, component, and PGlite suites |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright |
| `npm run db:types` | Regenerate `src/types/database.ts` from migrations via PGlite |

## Troubleshooting

**The app shows `/setup`**
Supabase URL/key are missing or invalid. Check `.env.local` and restart the dev server.

**The demo button is missing**
`DEMO_MODE` is not `true`, no demo store exists, or anonymous sign-ins are disabled.

**Guest entry fails**
Verify anonymous sign-ins in Auth, the demo store's `is_demo=true`, and Supabase rate limits.

**Confirmation or reset emails do not arrive**
Configure SMTP or use the Supabase test inbox in local development. Check the Auth logs and redirect allowlist.

**Seeded detail pages 404**
Regenerate database types only after migrations are applied. UUID-shaped seed IDs are validated with a shape check, not a version-specific UUID parser.

**No Docker**
Docker is only required for the local Supabase CLI stack. The hosted project works with `supabase link` + `db push` or SQL-editor migration application. The PGlite suites run without Docker.

**Images do not render**
The demo uses external HTTPS images. `next.config.ts` allowlists the supported hosts. If you add a host, update the image configuration.

**Reset is not visible**
Reset requires `DEMO_MODE=true`, an owner/admin role, and a store with `is_demo=true`. It is intentionally hidden from guests and normal stores.
