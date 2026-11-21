# Changelog

All notable changes to CommerceOS are recorded here. The project is a portfolio/demo application and has not been deployed.

## [Unreleased] — Phase 10, deployment and handoff

### Added

- GitHub Actions CI for lint, typecheck, Vitest, and production build, plus an optional manual E2E job.
- `docs/hardening-report.md` and `docs/quality-report.md`.
- Comprehensive README with screenshots, architecture, setup, demo, testing, and limitations.
- `docs/architecture.md`, `docs/database-schema.md`, `docs/security.md`, `docs/setup-guide.md`, `docs/deployment.md`, and `docs/portfolio-notes.md`.
- `docs/screenshots` with production-build captures of the seeded demo.
- Vercel build configuration (`vercel.json`) and `.vercelignore`.
- GitHub/public-repository handoff and secret-scan guidance.
- HSTS header.

### Changed

- Redacted the private Supabase project reference from public handoff status.
- Order detail header de-duplicates repeated status labels.
- `.gitignore` now excludes local agent artifacts and the instruction ZIP.

### Added � staging readiness

- Real PostgreSQL two-connection concurrency suite (`npm run test:integration`) for last-unit reservation, same-key orders/refunds, refund caps, discount limits, and fulfillment/cancellation races.
- Advisory-lock idempotency migration for `create_order` and `record_refund_once`.
- Function-by-function and RLS policy audits, staging-readiness plan, anonymous-user and backup findings.
- Guest session reload/sign-out Playwright coverage and a CI PostgreSQL job.
- Separate staging Supabase project with all migrations, demo seed, anonymous Auth, and redirect configuration.
- Vercel staging deployment at https://commerceos-staging.vercel.app; hosted Playwright 10/10; no custom domain or public-demo approval.
- App-level HTTP Basic protection for staging, reusing an existing anonymous demo session, and staging-auth unit tests (128 tests total).
- Public release-candidate review: Basic Auth bypass checks, anonymous rate-limit/cleanup review, backup/reconstruction distinction, GitHub/CI readiness, and final regression evidence.
- Public release preparation: exact Basic Auth removal/rollback steps, final smoke checklist, feature walkthrough, and read-only anonymous Auth audit SQL.
- Private GitHub repository, first CI run (verify + real PostgreSQL passed), and branch-protection limitation documented.
- Operational-readiness report covering the Vercel 2FA deployment blocker, Free-plan backup gap, and anonymous-user lifecycle.

### Security

- Revoked direct writes on nine workflow-owned tables and removed their write policies.
- Converted all 19 public functions to security-definer with an empty search path and role checks.
- Converted all four reporting views to security-invoker.
- Added a per-request nonce-based Content-Security-Policy and browser-violation test.
- Removed the unused shadcn CLI, vendored its Tailwind companion stylesheet, and reached 0 npm audit vulnerabilities.
- Added direct-write, view-isolation, duplicate-submission, and catalog security-audit tests.
- Workspace and Git-history secret scans found no JWT, service-role value, or private account identifier.
- No deployment or production configuration change was made.

## [0.1.0] — 2026-11-21 — Phases 1–9

### Added

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui, Geist, and an emerald light/dark design system.
- Responsive application shell with grouped navigation, breadcrumbs, command search, notifications, profile menu, and theme control.
- Supabase Auth via `@supabase/ssr`, onboarding, store creation, invitations, password flows, and route protection.
- Multi-tenant Postgres schema: 23 tables, 48 RLS policies, 19 functions, 4 views, indexes, constraints, and deterministic demo seed.
- Core modules: products/variants, collections, orders, customers, inventory.
- Advanced modules: analytics, reports, discounts, returns/refunds, team, settings, notifications.
- Transactional workflows: order creation, reservations, partial/full fulfillment, cancellation, refund idempotency, return state machine, discount redemption, inventory adjustments.
- Demo environment: 50 products, 150 variants, 8 collections, 150 customers, 350 orders across 12 months, read-only guest viewer, guarded reset, reconciled overview.
- QA: 111 Vitest tests across 15 files, 8 Playwright tests, axe checks, responsive checks, security headers, and documented performance measurements.
- Fixed seeded UUID routing and the search button accessible name.

### Security

- RLS verified for cross-tenant denial, suspended memberships, staff restrictions, last-owner protection, refund caps, and viewer writes.
- Exports require authentication and remain store-scoped.
- Service-role key is not used by application code.

### Known limitations at 0.1.0 (superseded by hardening)

- Not deployed.
- No CSP.
- Direct manager order-header writes remain possible within a store.
- No Storage uploads, multi-store switching, CI, or per-user notification state.

## [0.0.0] — 2026-11-19 — Scaffold

- Initial Next.js scaffold, lint/typecheck/build scripts, and repository foundation.
