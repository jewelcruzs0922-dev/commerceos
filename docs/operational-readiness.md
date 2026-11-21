# Operational readiness

Date: 2026-11-21
Status: **staging deployed, password-protected, and verified** at https://commerceos-staging.vercel.app. Public production/demo not approved.

## Staging environment

- **Supabase staging project:** created as a separate project from the demo. All 14 migrations applied, 50 products / 350 orders seeded, 39 policies, 19 definer functions, 4 security-invoker views, one demo store.
- **Auth:** anonymous sign-ins enabled; site URL set to `https://commerceos-staging.vercel.app`; redirect allowlist set to `https://commerceos-staging.vercel.app/**`. Email confirmation remains enabled but no staff account has been created.
- **Staging API verification:** anonymous sign-in succeeded, `join_demo_store` returned the store, 350 orders were readable, direct order update returned 403/42501, and `create_order` returned 400/P0001.
- **Application verification:** a production build pointed at the staging Supabase project ran the full Playwright suite locally: **10/10 passed**. Test-created viewer memberships were removed afterward.
- **Vercel project:** `commerceos-staging` created; production environment variables set for Supabase URL, publishable key, site URL, and `DEMO_MODE=true`; default domain `https://commerceos-staging.vercel.app` assigned.
- **Deployment:** completed after Vercel 2FA and a CLI re-login. Production URL: https://commerceos-staging-e4h7vor4n-azurite2.vercel.app; alias: https://commerceos-staging.vercel.app. No custom domain.
- **Hosted verification:** full Playwright suite **10/10 passed** against the protected staging URL (with HTTP credentials), including guest entry, session reload/sign-out, axe, 375/768/1440 overflow, CSP/headers, and export rejection. Unauthenticated document requests return 401. Staging Supabase showed 22 anonymous users, 0 viewers after cleanup, and 350 orders, confirming the deployment targets staging.
- **Protection:** app-level HTTP Basic via `STAGING_BASIC_USER` / `STAGING_BASIC_PASSWORD`; unauth 401, auth 200. This is not Vercel platform protection and should be removed only for an approved public demo.
- **Security review:** headers checked on `/login`, `/forgot-password`, `/setup`, and `/dashboard`; all nine workflow tables rejected direct viewer update/insert with `42501`; no 5xx runtime logs found in the last hour; CSP browser violations zero.

## Backup limitations

Supabase dashboard states: **“Free Plan does not include project backups.”** No scheduled, point-in-time, or dashboard backup exists for either project.

Recommended options, in order:

1. Upgrade to a paid plan with scheduled backups after explicit cost approval; verify a restore into a separate project.
2. Use `supabase db dump` / a logical export before demos and before schema changes; test restoration into a separate database. This does not provide point-in-time recovery.
3. Treat the demo as reproducible from migrations + deterministic seed. This is acceptable for fictional staging data, not for data that must be preserved.

Do not reset or delete the hosted demo without approval. Do not reverse the security-hardening migration; use forward fixes.

## Anonymous user lifecycle

Observed on the demo project: 57 anonymous users of 58 total; 0 viewer memberships after test cleanup. Every new anonymous session creates an auth row; a browser reuses its cookie session, while new contexts create new rows. Local config limits anonymous sign-ins to 30/hour/IP; hosted limits must be reviewed.

The demo action now reuses an existing anonymous session instead of signing in again; new browser contexts still create new accounts. A cleanup query is documented in `staging-readiness.md`, but **was not executed**. Before running it:

- Confirm no anonymous user owns records that must be preserved.
- Restrict cleanup to users with no store membership and a defined age.
- Prefer a scheduled, logged maintenance job over ad-hoc deletion.
- Obtain approval for any auth-row deletion.

## CI

`.github/workflows/ci.yml` has `verify`, `database`, and `e2e` jobs. YAML parses locally and the database job uses `postgres:17`. Private remote: https://github.com/jewelcruzs0922-dev/commerceos. CI run 44844970063 passed `verify` and `database`; the manual `e2e` job remained skipped as designed. Branch protection could not be enabled because GitHub requires Pro for private-repository branch protection. The repository is private; public visibility requires user approval.

## Vercel deployment

The initial deploy failed with `Challenge required`. After enabling 2FA and refreshing the CLI login, deployment succeeded. The app is aliased at https://commerceos-staging.vercel.app and is not linked to a custom domain. App-level HTTP Basic protection is enabled through `STAGING_BASIC_USER` / `STAGING_BASIC_PASSWORD`; unauthenticated requests receive 401. Credentials are stored outside the repository. Removing those env vars is the explicit step for an approved public demo.

## Remaining before public production

- Decide whether app-level Basic protection is sufficient; the hosted URL returns 401 without credentials.
- Test staff email confirmation/reset only if staff auth is enabled; guest Auth lifecycle is already verified.
- Run remote CI and add branch protection.
- Accept or improve backup/recovery.
- Review anonymous rate limits and cleanup (22 staging anon users currently).
- Obtain separate public-demo approval.

## Current recommendation

**Staging is deployed, password-protected, and verified; public production/demo remains unapproved.**
