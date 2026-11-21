# Public release candidate review

Date: 2026-11-21
Status: protected staging approved; public portfolio demo pending.

## Basic Auth bypass results

`npm run verify:staging-protection` against https://commerceos-staging.vercel.app:

- 12 unauthenticated requests across document routes, trailing/encoded paths, exports, auth callbacks, docs, `/.env.local`, and a POST server-action-shaped request returned **401**.
- `/login/` returned a CDN normalization **308**, and following it returned **401**.
- Authenticated `/login` returned **200**; authenticated `/dashboard` and exports returned expected **307** redirects.
- The public brand SVG is intentionally reachable without Basic Auth and contains no sensitive data.
- The Basic Auth password was not found in `.next/static` or repository files; the `STAGING_BASIC` env name was not present in client bundles.
- No credentials are logged by the application.

Basic Auth applies in the proxy before routing, so route handlers, exports, callbacks, and Server Action POSTs require credentials. Static assets under the matcher exclusions remain public by design.

## Anonymous Auth operational review

- Staging: 22 anonymous users, 0 viewer memberships after cleanup.
- Hosted Auth rate limit: **30 anonymous sign-ins per hour per IP**.
- The app reuses an existing anonymous session; new browser contexts create new Auth rows.
- No CAPTCHA or edge-level abuse control is enabled. Basic Auth currently limits staging exposure.
- Cleanup query is documented but not executed. Before public release, remove viewer memberships and stale anonymous users with no memberships only after approval, or schedule a logged maintenance job.
- Recommendation before public: add edge rate limiting or Turnstile to the demo entry and review Supabase Auth limits.

## Backup and recovery

- Supabase Free plan has **no scheduled or point-in-time backups**.
- The staging environment was reconstructed successfully from all 14 migrations plus the deterministic seed: 50 products / 350 orders.
- Logical export procedure: use the Supabase CLI with a server-only database URL, e.g. `npx supabase db dump --db-url <database-url> -f staging.sql`, or `pg_dump` if available. Do not commit the dump or database URL.
- A logical restore into a separate database has **not** been performed. Reconstruction is verified; backup restoration is not.
- Do not upgrade to a paid plan without approval. For fictional data, reconstruction is accepted; for preserved data, a tested export/restore is required.

## GitHub and CI

- Private GitHub remote exists at https://github.com/jewelcruzs0922-dev/commerceos. Local code was committed/pushed after explicit "go" authorization. CI run 44845899537 passed `verify` and `database`; `e2e` stayed skipped as manual.
- `.gitignore` excludes `.env*`, `.vercel`, Playwright artifacts, instruction ZIP, and the local agent folder.
- CI workflow ran remotely: lint, typecheck, 128 Vitest, audit, build, and real PostgreSQL passed. The `e2e` job is manual/gated.
- Recommended branch protection: require `verify` and `database` checks, require PR review, disallow force pushes, require linear history, and keep secrets out of pull-request workflows.
- Branch protection could not be enabled: GitHub requires Pro or a public repository. Public visibility requires approval.

## Final regression

- `npm run lint` � pass
- `npm run typecheck` � pass
- `npm test` � 128/128 across 19 files
- `npm run test:integration` � 5/5 on PostgreSQL 18.7
- `npm run build` � pass, 31 routes
- Hosted Playwright � 10/10 with credentials
- `npm audit` � 0 vulnerabilities
- Secret scan � clean

## Classification

**Blockers before public demo**

- Explicit public-demo approval.
- Decide and document anonymous abuse protection/rate limits.
- Remove Basic Auth only as part of the approved public release.

**Recommended before public demo**

- Create/push a repository, run remote CI, and enable branch protection.
- Perform a logical export and restore test if demo data changes must be preserved.
- Add deployment protection at the platform level or keep Basic Auth.

**Accepted limitations**

- Staff email/password flows are not exercised; the public demo is viewer-only.
- No custom domain.
- No point-in-time backups; fictional data is reproducible.
- 22 anonymous Auth rows remain; cleanup requires approval.
- Tests cover the defined suite, not every workflow or sustained load.

## Recommendation

Protected staging is approved for continued release-candidate testing. Public portfolio release is **not yet approved**; the main outstanding portfolio gap is GitHub/remote CI, followed by anonymous abuse controls and backup/export acceptance.
