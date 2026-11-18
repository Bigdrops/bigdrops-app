# BOURXE Product Intelligence & Observability: Independent Documentation Audit

This report was written by Saffron on 2026-11-18 via Perch Desktop.

## 1. Objective

Independently verify the accuracy, consistency, technical feasibility, and authority of the 17-document initiative in `docs/prd/product-intelligence-observability/`. Challenge the prior agent's conclusions. Distinguish observed facts, historical claims, proposals, and unknowns.

## 2. Scope

Inspected:

- All 17 documents in `docs/prd/product-intelligence-observability/`, including both roadmaps.
- Sentry implementation: `package.json`, `vite-env.d.ts`, `.env.example`, `src/main.tsx`, `src/lib/sentry.ts`, `src/components/ErrorBoundary.tsx`, `src/tests/sentry-privacy.test.js`.
- Local error registry: `src/lib/errorRegistry.ts`, `src/pages/debug/ErrorsDashboard.tsx`, `src/pages/settings/SystemLogsSettingsSection.tsx`, `src/lib/feedback.ts`.
- Consent: `src/components/compliance/CookieConsentBanner.tsx` and consumers.
- Bolu ledger: `src/lib/ai-assistant/bolu-usage-ledger.ts`, `api/bolu-chat.ts`, `api/ai-usage.ts`, related migrations.
- Business audit trail: `src/lib/audit.ts`, related migrations and consumers.
- Identity and tenancy: `src/supabase.ts`, `src/lib/tenantClient.ts`, `src/lib/tenant/contexts.tsx`, `src/App.tsx`, auth components.
- Historical reports and Git history.

Excluded by authorization: application code changes, package or environment changes, database mutations, account changes, telemetry dispatch, deployment, Git mutations, build, typecheck, lint, and test execution.

Skills used: data-quality, documents, github, wait-operator
Documentation standard: ASD-STE100 Simplified Technical English

## 3. Executive Verdict

**NOT APPROVED as an authoritative implementation baseline. APPROVED WITH CONDITIONS as a proposal package after corrections.**

The three-layer concept is sound and the package is useful as a proposal. The original documents overstated current implementation, described proposed PostHog behavior in present tense, and made unsupported claims about audit immutability, consent gating, retention, and account authority. Material defects were corrected in the unified directory during this audit. Product-owner decisions remain open.

## 4. Overall Initiative Assessment

The initiative connects three distinct objectives:

1. Application observability: does BOURXE work? Sentry and the local registry serve this layer.
2. Product intelligence: do people successfully use BOURXE? PostHog is proposed for this layer. It is not installed.
3. Business and compliance auditability: are business operations recorded? `src/lib/audit.ts` serves this layer in the tenant database.

The layers should remain connected at the initiative level but separate in storage, security, retention, and governance. The corrected package now reflects that separation more accurately.

## 5. Findings by Severity

### Critical

**C-1. Business audit records were described as immutable. They are not.**

Evidence: `src/lib/audit.ts:216-228` writes through `record_audit_log`. Migration `20260520090008_audit_activity.sql:89-93` provides a permissive SELECT policy. `20260902160000_postgrest_schema_grants.sql:64-70` grants SELECT, INSERT, UPDATE, DELETE on all tables. `20260717000000_entity_provisioning_engine.sql:327-353` installs full CRUD policies. No UPDATE or DELETE trigger, REVOKE, or append-only guard exists. No retention policy exists.

Impact: The prior documents could be read as a compliance guarantee that the database does not provide. Audit records contain sensitive fields, including `client_name`, `total`, `vat`, `po_number`, `notes`, `supplier_name`, amounts, and actor email (`src/lib/audit.ts:4-112`, `:165`, `:289-297`; `src/lib/ai-assistant/bolu-audit.ts:82-92`).

Correction: Removed unsupported immutability claims from README.md, PRD.md, CURRENT-STATE-AUDIT.md, COMPLETED-WORK.md, OBSERVABILITY-ARCHITECTURE.md. Recorded the gap in DECISIONS-AND-OPEN-QUESTIONS.md.

**C-2. Consent was presented as a telemetry gate. It gates nothing.**

Evidence: `src/components/compliance/CookieConsentBanner.tsx:5-7,26-45,66-71` stores one of two values in `localStorage['bouxre_cookie_consent']`. The banner returns `null` after a choice (`:33`). No settings UI writes or clears the key. Repo-wide search found no `posthog`, `trackEvent`, or `opt_out_capturing` references in `src/`. Sentry initializes unconditionally at `src/main.tsx:15`.

Impact: The prior state diagram and enforcement rules in CONSENT-AND-PRIVACY.md described an in-memory buffer, PostHog opt-out, and preference withdrawal that do not exist. Banner copy mentions "anonymous telemetry" while the component comment says no analytics ships.

Correction: The architecture diagram now marks PostHog consent gating as proposed. The decision register records that withdrawal is not implemented and Sentry is not consent-gated.

### High

**H-1. Proposed PostHog behavior was written in present-tense implementation voice.**

Evidence: `package.json:48` declares only `@sentry/react`. No PostHog package, initialization, capture call, environment variable, or config exists. `IDENTITY-AND-SESSION-MODEL.md:44-63,71-91` and `OBSERVABILITY-ARCHITECTURE.md:75-92,109-123` described `posthog.identify()`, `posthog.reset()`, `posthog.group()`, and `EntityContext.tsx` listeners as current behavior.

Correction: Architecture diagram nodes and edges now use `PROPOSED` markers. The decision register records PostHog groups as reporting constructs, not security boundaries.

**H-2. PostHog account ownership was marked `[USER-CONFIRMED]` without evidence.**

Evidence: POSTHOG.md:26, CURRENT-STATE-AUDIT.md:133, COMPLETED-WORK.md:115, README.md:89. No repository evidence records this confirmation.

Correction: Reclassified as `[UNVERIFIED CLAIM]`. Region, keys, plan, and retention remain unknown.

**H-3. Historical Sentry test results were presented as current verification.**

Evidence: SENTRY.md:68, CURRENT-STATE-AUDIT.md:37, COMPLETED-WORK.md:92 state "48 passed, 0 failed". `src/tests/sentry-privacy.test.js` statically contains 15 explicit tests plus two loops totaling 33 cases, which yields 48. The test script in `package.json:10` covers only `src/tests/critical/*.test.js`, so this file is outside default test scope. Tests were not run in this audit.

Correction: Sentry audit verdicts are now marked historical. The decision register states that the suite was not re-run.

**H-4. Retention and erasure claims were unsupported.**

Evidence: CONSENT-AND-PRIVACY.md:121-127 claimed 12-month PostHog retention, 90-day Sentry retention, account deletion via Supabase, and PostHog Person Deletion API use. No such configuration or implementation exists. The Bolu ledger has no retention policy and deliberately retains `user_email` after account deletion (`20261115170000_bolu_usage_ledger.sql:22,32-33`).

Correction: Retention figures are marked proposed and unverified. Erasure controls are marked proposed. The `user_email` retention issue was recorded for product-owner and legal review.

### Medium

**M-1. Architecture diagram contained stale and incorrect flows.**

Evidence: `OBSERVABILITY-ARCHITECTURE.md:15-16,83-84` showed `initPostHog()` in `src/main.tsx`. `:23` showed ErrorBoundary writing to the local registry. Actual registry writes come from `src/lib/feedback.ts:57,165`; ErrorBoundary only calls `captureReactError` (`src/components/ErrorBoundary.tsx:27-32`).

Correction: Diagram now shows the feedback path and marks PostHog flows as proposed.

**M-2. Sentry implementation details were inaccurate.**

Evidence: SENTRY.md:59 and COMPLETED-WORK.md:87 named the depth marker `'[REDACTED_NESTED_OBJECT]'`. Actual marker is `'[REDACTED_NESTED_STRUCTURE]'` (`src/lib/sentry.ts:141`). CURRENT-STATE-AUDIT.md:31 cited `src/lib/sentry.ts:87` for the duplicate guard; actual line is `:201`. SENTRY.md:53-54 described an unanchored substring regex; implementation uses normalized token and phrase matching (`:79-138`).

Correction: Marker corrected. Other mechanism differences are recorded here; no code was changed.

**M-3. RLS description was wrong.**

Evidence: CURRENT-STATE-AUDIT.md:72 claimed `auth.uid() = user_id`. Business tables use `has_entity_permission(entity_id, auth.uid(), resource, action)` (`20260717000000_entity_provisioning_engine.sql:327-353`).

Correction: Corrected in CURRENT-STATE-AUDIT.md.

**M-4. Historical consolidation claim is unverifiable.**

Evidence: No `docs/prd/product-analytics-posthog/` path exists in Git history on any branch. No PostHog-named files exist outside `node_modules` and `.git`. Both stashes were inspected read-only and contain no matching paths. The two referenced observability audit reports exist under `docs/reports/SecurityxCompliance/`, not `docs/reports/observability/`. A concurrent process purged and reorganized reports during this audit (commit `65c600e2`), then committed the unified package (HEAD moved from `8ba6950e` to `e721142e`). The unified files remained unchanged through that commit.

Assessment: The useful historical reports were not lost; they were moved. The old directory left no Git trace, so "fully consolidated" cannot be proven from repository evidence.

Correction: All seven broken report paths now point to `docs/reports/SecurityxCompliance/`.

**M-5. Roadmap phase 0 claims depend on unverifiable evidence.**

Evidence: WATERFALL-ROADMAP.md:67 and HTML:334 state "verified 48 passing privacy tests". Phase 0 is marked COMPLETED and Gate 0 PASSED & VERIFIED. No test execution evidence exists in the repository.

Correction: Recorded in the decision register. Roadmap status remains a proposal classification pending product-owner signoff.

### Low

**L-1. "Live test event delivery verified" had no evidence.** COMPLETED-WORK.md:73. Corrected.

**L-2. Capacitor native error coverage was overstated.** SENTRY.md:13 claims Capacitor Android runtime errors. Only the web SDK is installed; no native Sentry Capacitor plugin exists.

**L-3. Sample dashboard data could be mistaken for real metrics.** DASHBOARDS-AND-METRICS.md:86-88 shows retention percentages with no sample-data label. These are illustrative values.

**L-4. Roadmap HTML and Markdown are substantially consistent.** Both show eight phases, the same order, the same blocked statuses, and the same gates. Minor wording differences exist: HTML says "14 days live operation without defect"; Markdown says "14 consecutive days of production operation". No material contradiction was found.

## 6. Three-Layer Architecture Assessment

The corrected package now distinguishes the layers at the objective level. Implementation boundaries remain partly aspirational because PostHog is not implemented.

- Observability: Sentry is installed and initialized before React. The local error registry is independent and local-only. They are not product analytics.
- Product intelligence: PostHog is proposed. No package, initialization, event dispatch, or account configuration is verifiable.
- Business/compliance auditability: `src/lib/audit.ts` writes to tenant schemas. The trail is useful for business accountability but is not immutable and has no retention policy. It must not be forwarded to PostHog.

## 7. Sentry Verification

Observed: `@sentry/react@11.13.0` declared at `package.json:48`; DSN typed at `vite-env.d.ts:9` and templated at `.env.example:7-9`; `initSentry()` called at `src/main.tsx:15` before render; duplicate guard at `src/lib/sentry.ts:201-203`; `tracesSampleRate: 0` at `:208`; Console integration filtered at `:212`; no replay integration; recursive scrubbing at `:140-185`; `beforeSend` at `:214-307`; `beforeBreadcrumb` at `:309-351`; `sanitizeUrl` at `:34-54`.

Implemented: package, bootstrap, guard, DSN fallback, scrubbing, breadcrumb filters, ErrorBoundary capture call.

Tested: A 48-case static suite exists. It was not run in this audit.

Independently audited: A historical report exists at `docs/reports/SecurityxCompliance/BOURXE_Sentry_Frontend_Privacy_Audit.md`. It describes defects that were later fixed.

Remaining work: Three minor refinements are listed in SENTRY.md:77-79. No implementation was authorized.

## 8. PostHog Readiness and Proposed Architecture

No PostHog package, initialization, event dispatch, environment variable, or account configuration exists in the repository. The wrapper design in POSTHOG.md:55-127 is a reasonable proposal for a Vite SPA: a single module, explicit initialization, consent check, autocapture disabled, replay disabled, and typed events. Prerequisites are product-owner decisions on region, project separation, keys, retention, and activation. The wrapper should be implemented only after those decisions.

## 9. Bolu Usage Ledger Assessment

The ledger records operational and billing-related measurements: TTFT, generation duration, latency, token velocity, prompt/completion/total tokens with source labels, estimated USD cost, success, provider, and model (`src/lib/ai-assistant/bolu-usage-ledger.ts:65-96,258-426`). It persists to central `public.app_ai_usage_ledger`. Writes use the service role. Direct client access is denied by RLS and REVOKE. Reads require platform admin (`api/ai-usage.ts:17,28-35`).

It also stores `tenant_id`, `user_id`, `user_email`, `conversation_id`, and `connection_id`. It has no retention policy. It is not a product analytics source and has no code path to PostHog.

Safe for operational monitoring: aggregate timings, token counts, cost, token source, success, provider, model. Never forward: prompt or conversation text, commercial data, user email, raw ledger rows, or the admin leaderboard output.

## 10. Business Audit Trail Assessment

`src/lib/audit.ts` records business document events in tenant schemas. It is tenant-isolated through schema selection and RLS. It contains sensitive commercial values by design. It is not immutable, has no retention policy, and permits UPDATE and DELETE for authorized users. It must remain independent from product analytics.

## 11. Error Registry Assessment

`src/lib/errorRegistry.ts` stores up to 200 entries in `localStorage['bd-error-registry']` with `id`, `timestamp`, `route`, `title`, and `diagnostic`. There is no TTL, server sync, or remote transmission. Writes come from `src/lib/feedback.ts`, not ErrorBoundary. `route` is raw pathname and is not passed through `sanitizeUrl`. `diagnostic` is sanitized by a separate scrubber in `src/lib/errorMessages.ts:78-97`. It is a local diagnostic tool, not product analytics.

## 12. Consent and Privacy Assessment

The banner stores a single accepted or declined value. It has no granular categories, no withdrawal path, no telemetry gating, and no enforcement before analytics initialization. Sentry runs regardless of consent. Session Replay remains disabled in the proposal and no replay package is installed. The data blacklist in CONSENT-AND-PRIVACY.md and EVENT-TAXONOMY.md is appropriate and should be preserved. Legal questions about Sentry's lawful basis, NDPA obligations, retention, and erasure require qualified review.

## 13. Identity and Multi-Tenant Assessment

Supabase Auth is authoritative. Sessions persist by configuration. Multiple workspace and entity memberships are supported with session-only active picks. Logout clears local auth state. Biometric gate relocks on resume. Tenant isolation uses schema selection plus `has_entity_permission()` RLS. No account-deletion implementation was found. PostHog identity and group behavior is proposed. PostHog groups must never be treated as security boundaries.

## 14. Product Metrics and Activation Assessment

The seven-day activation milestone is a proposal, not an approved requirement. BOURXE has multiple workflows, so a universal definition is premature. The measurement framework should keep onboarding completion, first meaningful action, first successful workflow, module-specific adoption, repeat usage, and retention as separate measurements. All metrics in EVENT-TAXONOMY.md and DASHBOARDS-AND-METRICS.md are proposed. None has an existing verified measurement in the repository.

## 15. Historical Consolidation and Git Integrity

No Git history exists for `docs/prd/product-analytics-posthog/` on any branch. No PostHog-named files exist outside dependencies. The two referenced audit reports survive under `docs/reports/SecurityxCompliance/`. Broken paths were corrected. Stashes were inspected read-only and contained no matching paths. No pre-existing user work was affected by this audit. A concurrent process committed the work during the audit; this report records that observation without judging its authority.

## 16. Waterfall Roadmap Assessment

Both roadmaps present eight sequential phases with gates and blocked downstream phases. Dependency order is reasonable. Entry and exit criteria exist but some acceptance criteria rely on unverified test evidence or account configuration. Existing Sentry work is not incorrectly scheduled as future work. PostHog account work is correctly shown as blocked. The HTML and Markdown are materially consistent.

## 17. Documentation Corrections Completed

Corrected files inside `docs/prd/product-intelligence-observability/` only:

- README.md
- PRD.md
- CURRENT-STATE-AUDIT.md
- COMPLETED-WORK.md
- OBSERVABILITY-ARCHITECTURE.md
- SENTRY.md
- POSTHOG.md
- CONSENT-AND-PRIVACY.md
- ACCEPTANCE-AND-VERIFICATION.md
- DECISIONS-AND-OPEN-QUESTIONS.md

Corrections fixed broken report paths, immutability claims, the redaction marker, unverified account confirmation, present-tense PostHog flows, the ErrorBoundary registry edge, RLS description, retention and erasure claims, and the legal-basis assertion. No application code, database file, test, configuration, manifest, or account setting was changed.

## 18. Product-Owner Decisions Still Required

1. Approve or reject the three-layer architecture as the initiative boundary.
2. Resolve PostHog region, project separation, keys, plan, and retention.
3. Decide whether the seven-day activation milestone is a requirement or one of several workflow-specific signals.
4. Decide whether consent withdrawal and granular categories are required.
5. Obtain qualified legal review of Sentry processing without consent gating.
6. Decide whether audit immutability and retention are product requirements. If yes, authorize database and application work in a separate task.
7. Decide retention and deletion treatment for the Bolu ledger, including `user_email`.
8. Decide when and whether to re-run the Sentry privacy suite and add it to a test script.
9. Confirm whether the old PostHog documentation must be reconstructed as historical evidence.

## 19. Recommended Next Action

Do not begin PostHog implementation. First, resolve decisions 1 through 5. Then update the roadmap with approved decisions and re-run the Sentry privacy suite under an authorized test command. Treat audit immutability and ledger retention as separate engineering workstreams with their own approval gates.

## 20. Verification

- All 17 unified documents inspected: yes.
- Material claims cross-checked against repository evidence: yes.
- Three layers distinguished: yes.
- Sentry completed work and remaining work separated: yes.
- PostHog represented as proposal only: yes.
- Bolu metrics classified and protected: yes.
- Business audit records separated from product analytics: yes.
- Consent claims matched to implementation: yes.
- Tenant and identity boundaries reviewed: yes.
- Activation metrics kept as proposals: yes.
- Historical consolidation verified where evidence exists: yes.
- Both roadmaps compared: yes.
- Justified documentation corrections completed: yes.
- Unresolved decisions recorded: yes.
- Tests: not run, per authorization boundary.
- bun run build: not run, per hardware policy.
- Typecheck and lint: not run, per documentation-audit scope.
- Supabase push: not applicable.
- Git: no commit, push, staging, stash, reset, clean, or destructive operation by this audit.
- Initial Git state: branch `main`, HEAD `8ba6950e`, extensive pre-existing modified and untracked files.
- Concurrent Git state observed: HEAD moved to `e721142e`; the unified package became tracked and the worktree became clean except `.perch/`.
- Final Git state: 10 unified documentation files modified by this audit; `.perch/` untracked and left alone.

## 21. Risks and Limitations

Live Sentry and PostHog account settings, event delivery, hosted database state, and deployed migration status cannot be verified from the repository. The Sentry privacy suite was not executed. The historical Sentry audit describes an earlier state. Git history provides no evidence of the old PostHog documentation directory. A concurrent process changed Git state during the audit; this report records the observation and does not attribute authority to that process.

## 22. Deferred Work

No implementation was performed. Product-owner decisions, legal review, test execution, audit immutability, retention policy, and any future PostHog work are deferred.
