# Final security verification

Date: 2026-11-24
Scope: CommerceOS public staging, `https://commerceos-staging.vercel.app`
Verdict: **Approved for public staging. Not approved for production or real customer data.**

## Method

- `tests/actions/viewer-authorization.test.ts` invokes 26 privileged Server Actions with a mocked read-only viewer membership. The mocked database client throws if any action reaches data access.
- `tests/rls/tenant-matrix.test.ts` applies the real migrations to PGlite, seeds Store A, creates a minimal Store B, and tests reads, direct-id lookups, writes, deletes, and forged tenant identifiers.
- Existing RLS suites exercise schema policies, workflow functions, demo viewer behavior, direct-write denial, and catalog security invariants.
- The live deployment was checked for auth cookie flags, CSP, HSTS, frame denial, permissions policy, noindex, source maps, client-bundle secret names, and dependency vulnerabilities.
- `npm test`: **166/166 passing across 23 files**.
- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- `npx playwright test e2e/security.spec.ts`: **4/4 passing**.

## Server Action authorization matrix

Each action was called with a viewer role and an empty form payload. Expected result: a permission error before any database call. Actual result: all 26 returned the expected permission error; the throwing database mock was never reached.

| Module | Actions tested | Expected | Actual |
| --- | --- | --- | --- |
| Collections | `createCollection`, `updateCollection`, `deleteCollection` | Permission error | Pass |
| Customers | `updateCustomer` | Permission error | Pass |
| Discounts | `createDiscount`, `updateDiscount`, `setDiscountActive` | Permission error | Pass |
| Inventory | `adjustStock` | Permission error | Pass |
| Orders | `createOrder`, `fulfillOrder`, `cancelOrder`, `refundOrder` | Permission error | Pass |
| Products | `createProduct`, `updateProduct`, `setProductStatus`, `deleteProduct`, `duplicateProduct` | Permission error | Pass |
| Returns | `requestReturn`, `decideReturn`, `refundReturn` | Permission error | Pass |
| Settings | `updateStoreSettings`, `resetDemoData` | Permission error | Pass |
| Team | `inviteMember`, `revokeInvitation`, `changeMemberRole`, `removeMember` | Permission error | Pass |

## Tenant isolation and forged identifiers

| Case | Expected | Actual |
| --- | --- | --- |
| Store A reads every tenant table | Only Store A rows | Pass, 14 tables with rows |
| Store A reads a Store B row by direct UUID | Zero rows | Pass |
| Store A updates Store B rows | Zero rows | Pass |
| Store A deletes Store B rows | Zero rows | Pass |
| Store A inserts into Store B | Rejected | Pass |
| Store A calls `create_product` with Store B id | `Not authorized` | Pass |
| Store A calls `create_order` with Store B id | `Not authorized` | Pass |
| Store A adjusts a Store B variant | `Not authorized` | Pass |

The application derives the active store from the session membership. The tested actions do not accept a client-supplied store id. Database functions re-check membership and role.

## Live deployment checks

| Check | Expected | Actual |
| --- | --- | --- |
| Auth cookie | HttpOnly, Secure, SameSite=Lax, path=/ | Pass on fresh live demo session |
| `X-Powered-By` | Absent | Pass |
| CSP | Nonce-based, `frame-ancestors 'none'` | Pass |
| HSTS | `max-age=63072000; includeSubDomains` | Pass |
| Frame and MIME protection | `DENY`, `nosniff` | Pass |
| Permissions policy | Camera, microphone, geolocation, payment disabled | Pass |
| Indexing | `noindex` metadata and `X-Robots-Tag` | Pass |
| Client source maps | None in `.next/static` | Pass |
| Service-role names | None in `.next/static` | Pass |
| Dependency audit | Zero vulnerabilities | Pass |

## Not verified in this pass

- RLS was exercised on PGlite with the real migrations, not through separate authenticated HTTP sessions against hosted Supabase.
- Server Actions were invoked as functions with a mocked viewer context, not by replaying a captured HTTP action id.
- Staff email confirmation and password-reset delivery require a staff mailbox and were not exercised.
- Concurrent demo load above 10 visitors was not run; Supabase anonymous sign-in remains limited to 30/hour/IP.
- Real-PostgreSQL two-connection concurrency tests require `TEST_DATABASE_URL` and were not rerun in this pass.
- Free-plan hosted Supabase has no backups or point-in-time recovery.
- Public production environment separation, custom domain, and production deployment were not created.

## Residual risk

| Risk | Severity | State |
| --- | --- | --- |
| Anonymous demo accounts are rate-limited and accumulate | Medium operations | Clear retry copy and session reuse implemented |
| Dashboard can cold-load for 20–30 seconds | Medium experience | Supabase requests now abort after 30 seconds; remaining slowness is external |
| No hosted backups or PITR | Medium operations | Fictional data; reconstruct from migrations and seed |
| No branch protection on the private free GitHub plan | Low delivery | CI runs remotely; protection unavailable |
| Staff auth lifecycle not completed | Medium release | Requires mailbox and staff test account |
| No sustained load test | Medium assurance | Not required for the read-only staging demo |
