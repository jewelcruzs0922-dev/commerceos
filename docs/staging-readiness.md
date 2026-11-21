# Staging readiness

Date: 2026-11-21
Status: **staging deployed, password-protected, and verified at https://commerceos-staging.vercel.app; public production not approved**

Hosted Playwright: 10/10 passed. See [`operational-readiness.md`](operational-readiness.md) for staging details, backup, anonymous-user findings, and remaining blockers.

Staging was deployed at https://commerceos-staging.vercel.app. No custom domain, DNS change, public production deployment, or paid-service upgrade was made.

## What was verified

### 1. Real PostgreSQL concurrency

PostgreSQL 18.7 (Windows x64 binaries, temporary local cluster on port 55432) with two independent `pg` connections and overlapping transactions.

`npm run test:integration` → **5/5 passed**:

| Scenario | Result |
| --- | --- |
| Two buyers race for the last unit | Exactly one reservation; second gets `insufficient stock`; `reserved = 1`, one order |
| Two same-key order submissions | Both return the same order ID; one order row |
| Two 2,000-cent refunds against a 2,500-cent order | One succeeds; second gets `refundable` error; one refund, 2,000 total |
| Two same-key refund submissions | Both return the same refund ID; one refund row |
| Usage limit 1, two concurrent redemptions | One succeeds; second gets `usage limit reached`; usage_count = 1 |
| Cancellation racing fulfillment | Fulfillment wins; cancellation fails; order fulfilled, on_hand 9, reserved 0 |

The test adds `pg_advisory_xact_lock` to `create_order` and `record_refund_once` for same-key serialization. Migration: `supabase/migrations/20261121140000_idempotency_lock.sql`.

Run locally:

```powershell
$env:TEST_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/commerceos_test"
npm run test:integration
```

The test refuses to reset a database whose name does not end in `_test`, unless `ALLOW_INTEGRATION_DB_TESTS=true`.

### 2. Function and policy audits

- [`function-audit.md`](function-audit.md) — all 19 definer functions, caller identity, tenant source, role check, writes, locks.
- [`policy-audit.md`](policy-audit.md) — 48 → 39 explanation, all nine removed policies, all 39 remaining policies, read scoping.
- Catalog test: 19 definers, empty search paths, authenticated-only execute, 23 RLS tables, 39 policies, zero workflow write grants/policies, four security-invoker views.

### 3. Authentication lifecycle

Verified locally:

- Anonymous guest sign-in creates a session and viewer membership.
- Reload preserves the session.
- Sign-out returns to `/login`.
- A protected route after sign-out redirects to `/login`.
- Unauthenticated CSV export is redirected/rejected.

Not verified:

- Production/staging callback URLs and email redirects.
- Expired-session behavior against a real deployment.
- Password reset and confirmation email delivery.
- Owner/staff sign-in in staging (no staging environment or credentials).

### 4. CI

- `.github/workflows/ci.yml` parses as valid YAML with jobs `verify`, `database`, and `e2e`.
- `verify` runs `npm ci`, lint, typecheck, Vitest, audit, build.
- `database` runs the real-PostgreSQL integration suite against a `postgres:17` service.
- `e2e` is manual/gated by `E2E_ENABLED` and repository secrets.
- **Not run remotely.** No GitHub remote is configured; no actual run URL exists.
- Local equivalent passed: lint, typecheck, 125 Vitest, 5 integration, build, 10 Playwright.
- Hosted staging equivalent passed: 10 Playwright tests against https://commerceos-staging.vercel.app.

### 5. Anonymous account management

Hosted inspection:

- 57 anonymous auth users out of 58 total users.
- 0 viewer memberships currently (test memberships cleaned).
- Each new anonymous sign-in creates a new `auth.users` row. A browser that keeps its session cookie reuses the same identity; incognito/new contexts create new rows.
- Local Auth rate limit: 30 anonymous sign-ins per hour per IP (`supabase/config.toml`). Hosted limits still need review in the dashboard.
- No anonymous-user deletion was performed. Cleanup requires approval.

Candidate maintenance query (not executed):

```sql
delete from auth.users u
where u.is_anonymous
  and not exists (
    select 1 from public.store_members m where m.user_id = u.id
  )
  and u.created_at < now() - interval '24 hours';
```

Review ownership/audit implications before running. Do not delete users that still own records.

### 6. Migration and recovery

Migrations applied to the hosted demo: 14 files, including hardening and idempotency locking. They were applied through the SQL editor, so the hosted project does not have CLI migration-history rows.

Free-plan backup check: the Supabase dashboard states **“Free Plan does not include project backups.”** No point-in-time or scheduled backup exists for this project. This is a real recovery risk.

Recovery procedure for the demo:

1. If the schema is recoverable, ship a forward migration.
2. If the project is lost, create a new Supabase project.
3. Apply `supabase/migrations` in filename order.
4. Recreate the owner account and `urban-goods` store.
5. Run `select private.seed_demo_store(id) from public.stores where slug = 'urban-goods';`
6. Configure Auth Site URL/redirects and Vercel environment variables.
7. Re-run tests and smoke checks.

Do not reset the existing hosted demo without approval. The hardening migration is **not designed to be reversed**: reverting it would re-open direct workflow writes and remove the CSP enforcement path. Prefer forward fixes.

### 7. Remaining blockers before public production

- Public-demo approval (staging is already deployed).
- Decide whether app-level HTTP Basic protection is sufficient; hosted requests return 401 without credentials.
- Staff email confirmation/password reset only if staff auth is enabled; guest Auth lifecycle is verified.
- Remote GitHub Actions run and branch protection.
- Hosted anonymous sign-in rate-limit/abuse review and approved cleanup.
- Recovery plan accepted despite Free-plan lack of backups, or a tested export/upgrade.
- Real multi-connection tests rerun against the staging Supabase database; local PostgreSQL 18.7 is evidence, not a guarantee for Supabase settings.
- Sustained load testing.

## Staging deployment status

Completed:

1. Separate Supabase staging project created with fictional data.
2. All migrations applied and demo store seeded.
3. Anonymous sign-ins enabled; Site URL and redirect allowlist configured.
4. Vercel staging project and environment configured.
5. Hosted Playwright 10/10 passed at https://commerceos-staging.vercel.app.
6. CSP/headers verified on the hosted response.
7. App-level HTTP Basic protection enabled; hosted E2E 10/10 with credentials.
8. Test viewer memberships cleaned; 22 anonymous staging users remain.

Not yet completed: deployment protection, staff email/reset, remote CI, backup/recovery acceptance, public-demo approval.

## Recommendation

**Staging is deployed and verified; public production/demo remains unapproved.**
