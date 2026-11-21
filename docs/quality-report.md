# Quality report

Last verified: 2026-11-21, local Node 26.8.1 and a production build on port 3100.

## Test inventory

| Layer | Files | Tests | Notes |
| --- | --- | --- | --- |
| Unit | 10 | 59 | Permissions, env parsing, redirects, routes, UUID validation, money/CSV parsers, analytics formulas, order states, CSP directives, staging Basic Auth |
| Component | 2 | 4 | Demo entry, order total recalculation |
| Database integration/RLS | 7 | 65 | Full migration replay in PGlite; RLS, workflows, advanced modules, Phase 7, demo seed, hardening, catalog audit |
| Real PostgreSQL | 1 | 5 | Two-connection concurrency: last unit, same-key order, refund cap, discount limit, cancel/fulfill race |
| Playwright E2E | 3 | 10 | Guest entry, session reload/sign-out, read-only surfaces, protected redirects, responsive overflow, keyboard, axe, headers, export rejection, CSP |
| **Total** | **19 Vitest + 1 PG + 3 E2E** | **128 + 5 + 10** | No remote CI execution yet |

Commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
$env:TEST_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/commerceos_test"
npm run test:integration
npm audit
```

## Security evidence

- Direct writes denied on nine workflow tables for `authenticated`, including owners.
- All 19 public functions are `SECURITY DEFINER` with `search_path` set; execution is granted to `authenticated` and denied to `anon`.
- Four views use `security_invoker = true`.
- 39 RLS policies remain after removing nine direct-write policies.
- Hosted anonymous viewer: 350 orders visible; direct order update/insert returned 403 (`42501`); `create_order` returned 400 (`P0001 Not authorized`).
- Real PostgreSQL 18.7 concurrency suite: 5/5 passed with two independent connections.
- Hosted anonymous users: 57 of 58 total; 0 viewer memberships after test cleanup. Free plan has no backups.
- CSP nonce present; `/login` renders with no CSP console violations in Playwright.
- Staging HTTP Basic protection returns 401 without credentials and 200 with credentials.
- `npm audit`: 0 vulnerabilities after removing the unused shadcn CLI.

## Accessibility

- axe WCAG 2A/2AA checks on Overview, Products, Orders, and Settings: no serious or critical violations.
- Dashboard keyboard entry lands on the skip link.
- Responsive overflow checks pass at 375, 768, and 1440 on 11 primary pages.
- Dialog focus, labels, and status pills were manually inspected in Phase 9.
- No full manual screen-reader pass has been recorded.

## Performance

Warm local-development navigation timing (not Lighthouse or field Core Web Vitals):

| Route | TTFB | DCL | Load |
| --- | --- | --- | --- |
| Dashboard | 814 ms | 1,349 ms | 1,440 ms |
| Products | 831 ms | 1,540 ms | 1,553 ms |
| Orders | 850 ms | 1,559 ms | 1,572 ms |
| Analytics | 741 ms | 1,157 ms | 1,341 ms |

The root layout is now dynamic to support CSP nonces. Authenticated routes were already dynamic; the login and design routes also render per request. Re-measure after deployment with real network conditions and Lighthouse.

## Not run / limitations

- GitHub Actions definition exists but has not run on a remote repository.
- No Lighthouse/WebPageTest or Core Web Vitals field data.
- No sustained multi-connection load test; the 5-test real-PostgreSQL suite covers overlapping transactions, not sustained traffic.
- Staging is deployed at https://commerceos-staging.vercel.app and hosted Playwright 10/10 passed. No custom domain, deployment protection, or staff email/reset test exists.
- No screen-reader or cross-browser matrix beyond Chromium.
- No email delivery test beyond configuration review.

## Recommendation

The application is ready for a controlled staging deployment after user review. It is not yet a public production demo until CI runs remotely, Auth redirects are configured for the deployed origin, and a production smoke test passes.
