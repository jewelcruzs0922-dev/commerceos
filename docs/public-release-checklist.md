# Public release checklist

Status: protected staging release candidate approved by external review. **Public access is not approved.** Do not execute the removal steps below until the user explicitly approves the public demo.

## Preserve staging

- Keep https://commerceos-staging.vercel.app and its staging Supabase project.
- Do not delete or reset the staging database.
- Do not remove Basic Auth yet.
- Keep all data fictional; no payments, checkout, customer email, or real transactions.

## Current optional protection

Server-only variables:

| Variable | Purpose |
| --- | --- |
| `STAGING_BASIC_USER` | HTTP Basic username |
| `STAGING_BASIC_PASSWORD` | HTTP Basic password |

They are set only in Vercel Production for the staging project. Client code never reads them; they are not `NEXT_PUBLIC_`. Unauthenticated document requests and matched route handlers return 401.

## Exact Basic Auth removal (only after approval)

Preconditions: user has explicitly approved public demo access; an anonymous abuse decision is recorded; staging smoke test is green.

```powershell
vercel env rm STAGING_BASIC_USER production --scope azurite2 --yes
vercel env rm STAGING_BASIC_PASSWORD production --scope azurite2 --yes
vercel deploy --prod --yes --scope azurite2
```

Then verify:

```powershell
# Should return 200 without credentials
Invoke-WebRequest https://commerceos-staging.vercel.app/login -UseBasicParsing

# Full suite without credentials
$env:PLAYWRIGHT_BASE_URL="https://commerceos-staging.vercel.app"
Remove-Item Env:PLAYWRIGHT_HTTP_USER -ErrorAction SilentlyContinue
Remove-Item Env:PLAYWRIGHT_HTTP_PASSWORD -ErrorAction SilentlyContinue
npx playwright test
```

## Rollback to protected staging

If public access must be withdrawn:

```powershell
# Reuse the credentials from the secure local store; do not commit them.
$env:STAGING_BASIC_USER | vercel env add STAGING_BASIC_USER production --scope azurite2 --yes
$env:STAGING_BASIC_PASSWORD | vercel env add STAGING_BASIC_PASSWORD production --scope azurite2 --yes
vercel deploy --prod --yes --scope azurite2
```

Confirm unauthenticated `/login` returns 401 and authenticated Playwright passes.

## Required environment variables

| Variable | Exposure | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes |
| `NEXT_PUBLIC_SITE_URL` | Public | Yes |
| `DEMO_MODE` | Server-only | Yes for demo |
| `STAGING_BASIC_USER` | Server-only | Protected staging only |
| `STAGING_BASIC_PASSWORD` | Server-only | Protected staging only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Not used by app code |

## Anonymous Auth decision

- Current hosted limit: 30 anonymous sign-ins/hour/IP.
- No CAPTCHA or edge abuse control is enabled.
- Accepted for a read-only fictional demo only if monitored and cleaned up.
- Do not delete Auth users without approval.

Monitoring query: `scripts/anonymous-auth-audit.sql` (read-only).
Cleanup is documented in `docs/staging-readiness.md` and must not run automatically.

## Public demo smoke test

1. Open the public URL in a clean browser context; confirm no Basic auth prompt.
2. Guest demo opens; sidebar says Viewer; demo banner is visible.
3. Overview, products, orders, customers, inventory, analytics, returns, discounts, settings load.
4. Order detail has no fulfill/refund/cancel/return controls.
5. Direct REST update/insert against a workflow table returns 403/42501.
6. Unauthenticated `/orders/export` and `/analytics/export` return a redirect or 401.
7. CSP, HSTS, frame, referrer, opener, permissions, and content-type headers are present.
8. No CSP console violations; no 5xx runtime logs.
9. 375/768/1440 layouts do not overflow the document.
10. Keyboard entry lands on the skip link; axe has no serious/critical issues.
11. Staging Supabase still has 350 orders and 0 viewer memberships after test cleanup.
12. Anonymous count/rate limits reviewed; no unexpected spike.

## Repository publication (not done)

- Private GitHub remote exists at https://github.com/jewelcruzs0922-dev/commerceos; CI run 44845899537 passed lint/typecheck/tests/audit/build and real PostgreSQL. Branch protection is blocked by the GitHub private-repo plan requirement.
- Before pushing: re-run secret scan, confirm `.env.local` absent, confirm screenshots contain fictional data, and review README claims.
- Required checks before merge: lint, typecheck, Vitest, PostgreSQL integration, audit, build.
- Recommended branch protection: require PR review, require checks, disallow force pushes, require linear history.
- Do not expose E2E Supabase secrets to untrusted pull requests.

## Known limitations to keep documented

- Viewer-only public demo; staff email/password flows are not exercised.
- No custom domain.
- No Supabase backups/PITR; reconstruction from migrations + seed is verified, logical restore is not.
- 22 anonymous staging users currently remain.
- No CAPTCHA/edge abuse protection.
- No Storage uploads or multi-store switching.
- Tests cover the defined suite, not every workflow or sustained load.
- Private GitHub remote and remote CI exist; branch protection is blocked by GitHub's private-repo plan requirement.

## Approval boundary

Do not remove Basic Auth, publish the demo, change DNS, add a custom domain, upgrade paid services, or delete users/data without explicit user approval.
