# Multi-Tenancy Waterfall Roadmap Reconciliation Audit

This report was written by Muse Spark on 2026-09-10 via OpenCode.

## 1. Executive Finding

The roadmap is materially stale. Backend milestones M1–M4, M7 remain accurate. M5 describes removed behavior ("auto workspace") as shipped. M6 is accurate. M8 lists two items whose current state cannot be confirmed from the repository. Since 2026-09-05 the program added: exposure-gated company release, invitation-precedence reorder, active-member invitation discovery, canonical permission-seeder repair, workspace-creation UX polish, and a v2.1 §9.4 amendment — none reflected in either roadmap file. Three uncommitted working-tree tracks carry the newest fixes. No evidence contradicts the current architecture; the defects are documentation lag, not code regressions.

## 2. Current Multi-Tenancy Architecture

Account → gate evaluation (`resolveGatePhase`, `src/domain/tenant/tenantGate.ts:194-234`) → workspace resolution (active membership, else non-dismissed invitation, else pending workspace, else selection/creation) → company resolution → provisioning (`provision_entity`) → exposure queue → Management API PATCH plus re-GET verify → probe (`is_tenant_schema_exposed`, Gates 1+2) → `waitForTenantExposure` (90s/4s) → gate release → tenant client bound to confirmed schema. Invitations load for all users (`contexts.tsx:158-177`); active members discover them in Settings (`WorkspaceSwitchSection.tsx:65-89`); acceptance is one RPC with server-side validation. `ensureInitialWorkspace` is defined but uncalled (`tenantCreation.ts:572`; single grep match).

## 3. Complete Roadmap Reconciliation

### Phase 1 — Spec (M1): COMPLETE
All three steps match signed PRDs (`multi-tenancy-prd-v2.1.md`, `erp-frontend-prd-v1.5.md`, §3.11 roles). No drift.

### Phase 2 — Backend (M2–M4): COMPLETE
Core migrations, provisioning engine, workspace gaps (`20260905010000`), entity lifecycle (`20260905020000`) all applied. Live probe 2026-09-10: 3 active / 11 archived entities, 0 pending exposure rows. RLS, hierarchy, and purge paths verified in prior audited turns; files unchanged since.

### Phase 3 — Bootstrap (M5–M6)
- Step 1 (first-company bootstrap): COMPLETE. `ensureInitialCompany` intact and called.
- Step 2 (first-workspace bootstrap): STALE. Text still claims auto workspace Bootstrap as shipped behavior. Auto invocation was removed from `WorkspaceCreation.tsx` (uncommitted restoration); only the dead-but-tested `ensureInitialWorkspace` function remains.
- Step 3 (manual flows unchanged): COMPLETE. Manual creation, switching, archive/restore, invitation RPCs intact.

### Phase 4 — Recovery (M7–M8)
- Step 1 (status repair): COMPLETE (historical, verified at the time).
- Step 2 (multi-entity test fix): UNVERIFIABLE. No `multi-entity`/`multiEntity` string exists in any test file; the referenced expectation cannot be located. Either already resolved or the item never matched the suite.
- Step 3 (safe-env provisioning test): UNVERIFIABLE from the repository. No sandbox harness, script, or report evidences it. Left as stated.

## 4. Milestone Deep Dive

- **M5: STALE.** Milestone line ("auto workspace + auto company", 100%) and Phase-3 Step 2 describe removed behavior. The company half stays COMPLETE; the workspace half is SUPERSEDED by explicit Create/Join choice. Same staleness in `.html` line 246 and Phase-3 block line 275.
- **M6: COMPLETE.** Manual creation, switching (`WorkspaceSelectionSheet`, session-scoped pick), archive/restore RPCs plus UI, invitation create/revoke/accept RPCs all present and unmodified.
- **M8: PARTIALLY COMPLETE at best.** Step 2 cannot be mapped to any test; Step 3 has no harness. The milestone also omits the hardening that actually shipped since (exposure gating, precedence reorder, discovery card, seeder repair, verify-after-PATCH, UX polish), so even its scope statement is stale.
- **M1–M4, M7:** no change; prior COMPLETE/CORRECTED verdicts stand on unchanged files.

## 5. Workspace Onboarding Reconciliation

Traced against current gate order (invitation line 203, pending line 204) and provider loading (all users):

- A (clean slate): `create-workspace` → Create/Join choice, zero writes. Compliant with v1.5 §8/§12.4 and v2.1 §9.4.
- B (invite only): `pending-invitation` → accept/pass. Compliant.
- C (pending + invite): `pending-invitation` first; pass falls through to `pending-approval`; pending row never deleted. Compliant with precedence rule (v1.5 line 53, 608).
- D (pending only): `pending-approval` with 5s poll. Compliant.
- E (active + new invite): normal app; invite visible in Settings workspace section with accept/pass. Compliant with the fix intent; no PRD clause forbids it.
- F (multi-active + invite + pending): invite first if non-dismissed; otherwise remembered pick or selection screen; pending never deletes. Consistent with one-active-per-session rule (illustration line 477).

## 6. Invitation Lifecycle Reconciliation

- No-membership: gate-routed screen, accept via single RPC, pass session-only. COMPLETE per v1.5 §12.3/§12.5.
- Active-member: provider loads (all-user query), Settings card offers accept/pass reusing the same RPC and dismissal semantics. COMPLETE as implemented (uncommitted).
- Precedence: non-dismissed invite outranks pending workspace; dismissal yields to pending. Tested (`tenantGate.test.js` invitation block; `invitationVisibility.test.js` helper plus no-force cases).
- Accept/pass: unchanged RPCs and session semantics. Expiry/revocation server-enforced; loader fetches pending unexpired rows only.
- Multiple invitations: latest-only (`order created_at desc limit 1`, `contexts.tsx:168-169`). Pre-existing limitation, unchanged; no PRD clause demands multi-invite surfacing.

## 7. Company / Tenant Provisioning Reconciliation

Creation (`CompanyCreation.tsx`, `CreateCompanySheet.tsx`) → `provisionEntity` → `provision_entity` (schema, tables, RLS, seeds, queue insert, then `ready`) → edge GET→PATCH→re-GET-verify → probe Gates 1+2 → `waitForTenantExposure` (90s/4s) → success only on confirm; timeout transfers silently to the gate-held provisioning screen. `TenantGate` requires `ready` plus probe-true (`schemaExposed false/null` holds). `tenantClient` binds only to confirmed schema. Restart re-resolves from DB with retrigger plus 10s re-probe; no stored readiness. Canonical seeder v2 migration exists (`20260909025241`); live permission state not re-probed in this audit. All files unmodified since prior verification.

## 8. PRD / Roadmap / Code Matrix

| Roadmap Item | Roadmap Status | Actual Implementation | PRD Status | Actual Status | Evidence |
|---|---|---|---|---|---|
| M1 spec sign-off | IMPLEMENTED | Signed PRDs present | Authoritative | COMPLETE | PRD files + v2.1 §14 table |
| M2 core schema/RLS/engine | IMPLEMENTED | Migrations applied; live 3/11 entities | Required | COMPLETE | Migration files; live probe |
| M3 workspace lifecycle | IMPLEMENTED | Approval/invite/ownership RPCs + UI | Required | COMPLETE | RPC + UI files |
| M4 entity lifecycle | IMPLEMENTED | §8A RPCs + UI + audit | Required | COMPLETE | `20260905020000`; live |
| M5 auto workspace | IMPLEMENTED 100% | Auto invocation removed | Silent (PRD never required auto) | STALE | `WorkspaceCreation.tsx` diff; no callers of `ensureInitialWorkspace` |
| M5 auto company | IMPLEMENTED 100% | `ensureInitialCompany` intact | Required | COMPLETE | `tenantCreation.ts` |
| M6 manual/switching | IMPLEMENTED | All present | Required | COMPLETE | Sheet, RPCs, UI |
| M7 status repair | CORRECTED | Historical | n/a | COMPLETE | Prior verification |
| M8 test fix | PENDING | No matching test exists | Unspecified | UNVERIFIABLE | Grep clean |
| M8 safe-env test | PENDING | No harness found | Unspecified | UNVERIFIABLE | Repo search clean |
| Exposure gating | Absent | Shipped (uncommitted) | Implied by readiness rule | COMPLETE but UNREFLECTED | Gate + waiter + tests |
| Invitation precedence | Absent | Shipped (uncommitted) | Required (v1.5 §8) | COMPLETE but UNREFLECTED | Gate lines 203-204 + tests |
| Active-member discovery | Absent | Shipped (uncommitted) | Consistent, not explicit | COMPLETE but UNREFLECTED | Provider + Settings card |
| Seeder repair | Absent | Migration file present | Required (§9.3) | COMPLETE but UNREFLECTED | `20260909025241` |
| Workspace UX polish | Absent | Shipped (uncommitted files) | Required (v2.1 §9.4) | COMPLETE but UNREFLECTED | Diff present |

## 9. Stale / Superseded Roadmap Items

- M5 workspace half plus Phase-3 Step 2: describe removed auto behavior → STALE (workspace part) / SUPERSEDED by explicit choice (v2.1 §9.4 now documents the contract).
- Progress 80% plus "seven of eight live": undercounts shipped hardening; the denominator predates post-09-05 work → STALE.
- `.html` date-pill 2026-09-05, changelog ending 2026-09-05, footer "2026-09-05": STALE.
- M8 Step 2: UNVERIFIABLE reference (see §4).

## 10. Completed but Unreflected Items

Exposure-gated release; invitation-precedence reorder; active-member discovery card; `hasActionableInvitation` helper plus test suites; canonical seeder v2 migration; edge verify-after-PATCH; CompanyCreation extended-wait plus friendly errors; WorkspaceCreation polish (44px targets, alert/status semantics, friendly errors); v2.1 §9.4 contract. All exist in tree or migrations; none appear in either roadmap file.

## 11. Genuine Remaining Items

- Commit the three uncommitted fix tracks (process, not code completeness).
- Resolve M8 Step 2 reference (locate or retire the multi-entity expectation).
- Decide M8 Step 3 disposition (run or formally defer the sandbox test).
- Active-member multi-invite surfacing beyond latest-only (no PRD requirement; product call).
- `ensureInitialWorkspace` dead code: keep under test or remove by decision.
- Purge automation/scheduler state: not covered by any roadmap step; open.

## 12. Product Decisions Required

- Whether latest-only multi-invite display suffices.
- Whether `ensureInitialWorkspace` stays as fallback utility or is removed.
- Whether pending should outrank multi-workspace selection (current order does; no PRD clause covers it).
- Approval notifications and workspace rename remain deferred per §9.4/§12 (unchanged).

## 13. Dependency / Blocker Analysis

- Nothing in the completed tracks is blocked; all dependencies (RLS, RPCs, queue, Management API, tests) are present.
- The uncommitted state of three fix tracks is the sole process blocker to roadmap accuracy: the tree, not the architecture, lags the docs.
- M8 Step 3 depends on sandbox access policy, not on code.

## 14. Recommended Roadmap Corrections

Documentation only, not applied: split M5 into company (done) plus workspace-choice (done, supersedes auto); add post-09-05 entries for gating, precedence, discovery, seeder repair, and §9.4; resolve or retire M8 Step 2 with the actual test name; disposition M8 Step 3 explicitly; refresh progress, date-pill, changelog, and footer; mirror all changes into the `.html` twin.

## 15. Files Inspected

`Waterfall-roadmap.md`, `Waterfall-roadmap.html`, `multi-tenancy-prd-v2.1.md` (§9.4, §12, §14), `erp-frontend-prd-v1.5.md` (invitation clauses), `three-prd-tenancy-illustration.html` (line 477), `src/domain/tenant/tenantGate.ts`, `src/lib/tenant/contexts.tsx`, `src/pages/WorkspaceCreation.tsx`, `src/pages/settings/WorkspaceSwitchSection.tsx`, `src/pages/CompanyCreation.tsx`, `src/components/layout/CreateCompanySheet.tsx`, `src/components/app/TenantGate.tsx`, `src/domain/tenant/tenantCreation.ts`, `src/lib/tenantClient.ts`, `src/tests/critical/tenantGate.test.js`, `src/tests/critical/invitationVisibility.test.js`, `supabase/functions/postgrest-schema-exposure/index.ts`, `supabase/migrations/` (listing plus seeder grep), `AGENTS.md`, skill index.

## 16. Files Created

`docs/Reports/multi-tenancy/waterfall-roadmap-reconciliation-audit-2026-09-10.md` (this report). Nothing else.

## 17. Git Scope

Before: 1 modified onboarding HTML plus 8 untracked files (3 prior audit reports, 5 other-agent files), all pre-existing. After: identical plus this report. `git diff --stat` shows only the pre-existing onboarding HTML change. Zero application, test, migration, config, or documentation modifications. No validation commands run per task constraints.

## 18. Verification Limitations

No runtime execution, no live REST probes beyond the entity/queue counts cited, no browser verification, no test runs (forbidden), no secrets accessed. Conclusions rest on file reads, grep evidence, git history, and prior verified live state where explicitly noted.

## 19. Appendix — Animation Sweep of Waterfall-roadmap.html

Scoped skill pass (read-only; no file change per audit constraints). Existing motion vocabulary: `--ease-out cubic-bezier(0.23, 1, 0.32, 1)`, 1400ms hero fill, 450ms announce slide, 600ms reveals with 60ms stagger, instant filter toggles, hover gating plus reduced-motion variant. The file is already restrained; transform/opacity only.

| # | Location | Today | Purpose | Frequency | Suggested motion |
|---|---|---|---|---|---|
| — | — | — | — | — | No surviving suggestion. File needs nothing. |

Rejected candidates: filter row show/hide (`display:none` toggle, ~line 351) — user-initiated repeated action must stay instant; animation would feel sluggish on retoggle. Rejected at Speed/Function. Progress-fill 1400ms duration — reviewing existing motion is out of scope for the finder skill; left untouched. Static sheen block — decorative delight candidate, but manufacturing motion for a status page fails the Function gate; rejected.

Redesign direction (documented, not applied): replace emoji ticks (🏗️ ✅ 🔄 🛠️ ⏭️ ⛔) with text tokens such as DONE, FIXED, OPEN to match the file's own monochrome editorial sign and AREA 17 reference; keep all durations, stagger, and reduced-motion behavior unchanged.

Verdict: the page is already close to right — instant filters, single-fire entrances, full reduced-motion coverage. Highest-leverage action is the emoji-to-text token swap, a content edit, not a motion edit.
