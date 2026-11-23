# Deployment and handoff

## Status

**Public unlisted staging deployed; public production not deployed.** Staging: https://commerceos-staging.vercel.app (Vercel project under Azurite, Supabase staging project, `noindex`, no custom domain, deployment protection not enabled, HTTP Basic removed). The read-only guest demo is available from `/login` and guest onboarding. Public production still requires explicit approval.

`vercel.json` prepares the build configuration only. It does not create a project or publish anything.

## Deployment target

- Application: Next.js 16 App Router
- Hosting: Vercel
- Backend: existing Supabase project (Postgres + Auth)
- Node runtime: Node 22 or newer (`package.json` engine)
- No separate worker, queue, cron, or storage service

## Environment variables

Set these in Vercel for **Production** and, if preview deployments are used, for **Preview**:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/publishable key; safe for the browser |
| `NEXT_PUBLIC_SITE_URL` | Yes | Exact production origin, e.g. `https://commerceos.example.com`; used for auth email redirects and invite links |
| `DEMO_MODE` | Recommended | `true` enables the read-only guest demo and guarded reset |
| `STAGING_BASIC_USER` / `STAGING_BASIC_PASSWORD` | Optional | HTTP Basic protection for private staging; removed from the current public unlisted demo |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Reserved and unused by app code; do not add unless a future admin tool needs it |

Rules:

- Never prefix a server-only variable with `NEXT_PUBLIC_`.
- Never commit `.env.local` or paste values into documentation.
- `NEXT_PUBLIC_*` values are baked into the build; changing them requires a redeploy.
- Use separate Supabase projects for production and preview if real data is ever introduced. The current project is demo-only.

## Pre-deployment review

- [x] Production build passes locally.
- [x] Lint, typecheck, unit/component/RLS tests, and Playwright suites pass.
- [x] RLS enabled on all 23 public tables; hosted viewer read/write path exercised.
- [x] Security headers and nonce-based CSP configured and browser-tested.
- [x] Direct writes to workflow tables revoked; functions are security-definer with role checks.
- [x] CI workflow defined for lint, typecheck, tests, and build.
- [x] Hosted anonymous viewer direct API write denied (403/42501).
- [x] Image hosts restricted.
- [x] `vercel.json` prepared.
- [x] Environment variables documented.
- [x] Supabase Auth redirect requirements documented.
- [x] No service-role key used by the app.
- [x] Secret scan run against tracked/untracked candidate files and history.
- [x] Deployment does not require a paid service change.
- [x] **User approved the public unlisted staging demo.**
- [x] CI workflow has run successfully on the remote repository.
- [x] Staging deployment performed.
- [x] Staging post-deployment smoke test completed.
- [ ] Public production approved.
- [ ] Staging database concurrency suite passed against the deployment target.
- [ ] Auth lifecycle and email delivery tested in staging.
- [ ] Recovery accepted despite Free-plan lack of scheduled backups.
- [ ] Production Supabase Auth URLs updated.
- [ ] Separate production Vercel project created and environment variables entered.
- [ ] Production post-deployment smoke test completed.

Unchecked items are intentional. Do not deploy public production until the user approves.

## 1. Prepare Supabase

1. Confirm every migration in `supabase/migrations` is applied to the production project in filename order.
2. Confirm the demo store exists and `is_demo=true` if the guest demo is intended.
3. Seed the demo store:
   ```sql
   select private.seed_demo_store(id)
   from public.stores
   where slug = 'urban-goods';
   ```
4. Confirm anonymous sign-ins only if the guest demo will be public.
5. Set **Authentication → URL Configuration**:
   - Site URL: `https://<production-domain>`
   - Redirect allowlist:
     - `https://<production-domain>/auth/callback`
     - `https://<production-domain>/auth/confirm`
     - `https://<production-domain>/reset-password`
6. Review Auth rate limits, SMTP/email delivery, and the Free-plan limits.
7. Optionally clean anonymous auth users created by E2E runs.

No destructive migration, database reset, or DNS change is part of this guide. Obtain approval before any such action.

## 2. Create the Vercel project

1. Push the repository to GitHub after the secret scan and review.
2. In Vercel, **Add New → Project → Import** the repository.
3. Framework preset: **Next.js** (also declared in `vercel.json`).
4. Root directory: repository root.
5. Build command: `npm run build`.
6. Install command: `npm ci`.
7. Node.js version: 22.x or newer.
8. Add the environment variables for Production (and Preview if used).
9. Deploy only after explicit approval.

Optional: pin the serverless region near the Supabase project. No region is pinned in `vercel.json`; Vercel's default is used.

## 3. Post-deployment smoke test

Run in this order:

1. `/login` loads over HTTPS with a valid certificate.
2. Unauthenticated `/dashboard` redirects to `/login`.
3. **Try the read-only demo** opens the seeded overview.
4. The demo banner is visible and write actions are absent.
5. `/orders/export` without a session returns a redirect or 401, never CSV.
6. Response headers include `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and a nonce-bearing `Content-Security-Policy`.
7. Owner sign-in, email confirmation, and store access work.
8. Demo reset completes without touching a non-demo store.
9. Run the E2E suite against the deployment:
   ```bash
   $env:PLAYWRIGHT_BASE_URL="https://<production-domain>"
   npm run test:e2e
   ```
   Understand that E2E creates anonymous auth users and should not run against real data.

## 4. Backup and recovery

The current Supabase project is on the Free plan. The dashboard states: **�Free Plan does not include project backups.�** There is no scheduled or point-in-time backup for this demo.

For the fictional demo, recovery is to recreate the project, apply all migrations in order, recreate the owner/store, and reseed through `private.seed_demo_store`. Any owner-created data would be lost. Do not reset or delete the existing hosted demo without approval. Do not reverse the hardening migration; ship a forward fix instead.

Before public production, either upgrade to a plan with backups or document and accept that the demo is disposable. See [`staging-readiness.md`](staging-readiness.md).

## 5. Rollback and operations

- **Application rollback:** promote the previous Vercel deployment.
- **Database rollback:** migrations are additive. Prefer a forward fix or a reviewed compensating migration; do not reset a production database.
- **Demo corruption:** run the guarded owner reset on the demo store only.
- **Secret leak:** rotate the affected Supabase key immediately, update Vercel, redeploy, and review Auth/Postgres logs. Do not rewrite Git history without approval.
- **Anonymous auth growth:** schedule cleanup of anonymous users and viewer memberships if the demo receives sustained traffic.

## 6. GitHub handoff

The repository currently has only the early scaffold commits; most application work is still uncommitted. A first portfolio release should be staged carefully rather than with a blind `git add .`.

Recommended workflow:

```bash
git status --short
git diff --stat
git add <reviewed files>
git commit -m "feat: complete CommerceOS operations workspace"
```

Use short imperative commit subjects. Keep phase work and documentation in reviewable commits. Do not commit generated artifacts such as `.next`, `test-results`, `playwright-report`, `.env.local`, screenshots outside `docs/`, or the instruction ZIP (ignored).

Before making the repository public:

- [ ] Confirm `.env.local` is ignored and absent from history.
- [ ] Confirm no service-role key, anon key, JWT, password, private email, or real customer data is present.
- [ ] Remove project-specific references that should not be public.
- [ ] Decide whether to add a license; none is included by default.
- [ ] Confirm screenshots contain only fictional data.
- [ ] Confirm the README accurately separates shipped features from future work.
- [ ] Run `npm run build`, `npm test`, `npm run test:e2e`, and `npm audit`.
- [ ] Review the GitHub repository settings, branch protection, and secret scanning.

Suggested scan commands (PowerShell):

```powershell
$files = @(); $files += git ls-files; $files += git ls-files --others --exclude-standard
$files = $files | Where-Object { $_ -notmatch '\.(zip|png|jpg|jpeg|webp)$' -and (Test-Path -LiteralPath $_) } | Sort-Object -Unique
$files | ForEach-Object { Select-String -LiteralPath $_ -Pattern 'eyJhbGciOi|sb_secret_|service_role|SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S' }
git grep -n -I -E 'eyJhbGciOi|sb_secret_|SUPABASE_SERVICE_ROLE_KEY=.+' $(git rev-list --all)
```

Treat any hit as a blocker until reviewed. A project URL or anon key is not a privileged secret but should still be configuration, not source.

## 7. Explicit approval gate

Before running any deploy command, creating a Vercel project, adding a domain, changing DNS, or applying a destructive database action, stop and obtain explicit approval with:

- the exact action,
- affected resources,
- expected cost,
- rollback path,
- and whether the demo will be public.

Until then, this document is preparation only.
