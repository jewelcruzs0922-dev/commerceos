# Production readiness and security hardening report

Date: 2026-11-21
Scope: post-Phase-10 hardening requested after an external review. No new product features, no deployment, no domain, no credential request.

## Verdict

**Ready for a controlled staging deployment after user approval.** Not yet a public production demo until the CI workflow runs remotely, production Auth redirects and email delivery are tested, a staging smoke test passes, and recovery is accepted despite the Free-plan lack of backups.

## Findings and resolutions

| ID | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| H1 | Managers could write `orders` and `order_items` directly, bypassing workflow validation | Medium integrity | Revoked authenticated DML on nine workflow tables; removed their write policies; made workflow functions definer-owned with role checks |
| H2 | Reporting views were not security-invoker and could bypass caller RLS | Medium authorization | Set `security_invoker = true` on all four views; added cross-store view tests |
| H3 | Most workflow functions were security-invoker and depended on direct table grants | Medium hardening | Converted all 19 public functions to `SECURITY DEFINER`; verified empty `search_path` and execution grants in a catalog test |
| H4 | No Content-Security-Policy | Medium hardening | Added per-request nonce CSP in `src/proxy.ts`; passed nonce to the theme script; verified in Playwright |
| H5 | Four moderate dev-only advisories in the shadcn CLI chain | Low dev | Removed the unused CLI and vendored its 16 KB Tailwind companion stylesheet; `npm audit` now 0 |
| H6 | No CI | Low delivery | Added GitHub Actions for install, lint, typecheck, Vitest, and build; optional manual E2E job |
| H7 | No direct-write or catalog security tests | Low assurance | Added direct-write denial, view isolation, duplicate-submission, and catalog audit suites |
| H8 | Refund/order idempotency not exercised under duplicate submission | Low assurance | Added last-unit reservation and refund-cap serialization tests; documented single-connection limits |

## Database changes

Applied as `supabase/migrations/20261121130000_security_hardening.sql` and to the hosted demo project:

- `ALTER FUNCTION … SECURITY DEFINER` for all 19 public functions.
- `REVOKE INSERT, UPDATE, DELETE` from `anon` and `authenticated` on `orders`, `order_items`, `payments`, `refunds`, `returns`, `return_items`, `inventory`, `inventory_movements`, `discount_usages`.
- Dropped the nine corresponding write policies.
- Set all four views to `security_invoker = true`.
- Granted `SELECT` on the views to `authenticated`.

No rows were deleted, no table was dropped, and no production deployment occurred. Policy count changed from 48 to 39 by removing direct-write policies.

## Application changes

- `src/proxy.ts` — CSP nonce generation, request/response headers, session response preservation.
- `src/lib/security/csp.ts` — policy builder and unit tests.
- `src/app/layout.tsx` — async layout reads the nonce and passes it to the theme provider.
- `src/app/globals.css` — imports the vendored shadcn Tailwind companion.
- `src/app/shadcn-tailwind.css` — vendored MIT-licensed companion stylesheet.
- `.github/workflows/ci.yml` — core CI plus optional E2E job.
- `package.json`/lockfile — removed the `shadcn` dev dependency.
- `tests/rls/schema.test.ts` — direct-write and view-isolation coverage; refund tests now use the workflow function.
- `tests/rls/hardening.test.ts` — last-unit duplicate submission, refund cap serialization, idempotency key.
- `tests/rls/security-audit.test.ts` — catalog invariants.
- `tests/rls/demo.test.ts` — anonymous direct order write denial.
- `tests/unit/csp.test.ts` — nonce and directive tests.
- `e2e/security.spec.ts` — CSP header and browser-violation check.
- Documentation updated across README, security, schema, architecture, deployment, portfolio notes, changelog, and status.

## Verification

- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm test` - 125 tests / 18 files; `npm run test:integration` - 5 real-PostgreSQL tests
- `npm run build` — pass, 31 routes
- `npm run test:e2e` against the production build - 10 tests pass
- `npm audit` — 0 vulnerabilities
- Hosted catalog check — 13 newly altered + 6 existing definers = 19; 0 direct write grants; 4 security-invoker views; 0 write policies on workflow tables
- Hosted viewer direct API — read 350 orders; update/insert 403 `42501`; `create_order` 400 `P0001 Not authorized`
- Secret scan — no credentials or private identifier in candidate files or Git history; actual project reference absent from public docs

## Remaining risks

- Anonymous auth users accumulate; reset clears memberships, not auth rows.
- CI has not run remotely; workflow syntax is reviewed but unexecuted.
- Concurrency tests use one PGlite connection; not a multi-connection load test.
- Same-key idempotency races rely on unique indexes and serialized row locks; no sustained load test.
- No deployed staging environment, production Auth redirect test, or backup restore drill.
- No Storage uploads or multi-store switching; intentional scope.
- No CSP report-only/telemetry endpoint.

## Deployment blockers

1. User review and explicit approval.
2. Configure Supabase production Site URL and redirect allowlist.
3. Create the Vercel project and production environment variables.
4. Run the CI workflow remotely.
5. Run the post-deployment smoke test, including Auth email and demo reset.

## Staging-readiness follow-up

Additional work after the external review:

- Added a real PostgreSQL 18.7 two-connection concurrency suite: last-unit reservation, same-key order, capped refunds, same-key refund, discount usage limit, and fulfillment/cancel race. `npm run test:integration` passed 5/5.
- Added `supabase/migrations/20261121140000_idempotency_lock.sql`, which adds advisory transaction locks to `create_order` and `record_refund_once`; applied to the hosted demo and verified by catalog SQL.
- Added function-by-function and RLS policy audits (`docs/function-audit.md`, `docs/policy-audit.md`).
- Added a guest session reload/sign-out Playwright test (10 E2E total).
- Inspected hosted anonymous users: 57 anonymous / 58 total, 0 viewer memberships. No deletion performed.
- Confirmed Supabase Free plan has no scheduled backups; recovery must recreate and reseed the fictional demo.
- CI YAML parsed locally; remote run is still blocked by the absence of a GitHub remote.

See [`staging-readiness.md`](staging-readiness.md) for the full evidence, staging plan, recovery procedure, and remaining blockers.

## Final recommendation

**Staging deployed and verified; not ready for public production.** The prior medium-integrity and missing-CSP findings are closed, direct-write bypasses are blocked, and the database catalog invariants are tested. Staging passed 10/10 hosted Playwright tests. Complete remote CI, backup/recovery acceptance, and public-demo approval before publishing.
