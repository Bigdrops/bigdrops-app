# Company Creation Frontend UX Audit

This report was written by Muse Spark on 2026-09-09 via OpenCode.

## 1. Executive Summary

Current Company Creation releases the user only after exposure confirmation. Both creation flows await `waitForTenantExposure()` before success. `TenantGate` renders tenant UI only on `ready` plus probe-true. No path lets a user act inside a tenant at provisioning-only state. The historical premature-release incident is not reproduced in current code. The later fresh-company result (usable in ~13 seconds, Waybill opened at once) matches this implementation. Remaining items are minor UX and accessibility gaps plus one residual verify-vs-serve risk. No correctness-blocking defect exists.

## 2. Exact Repository Evidence

| Area | Evidence |
|---|---|
| Creation UI (first company) | `src/pages/CompanyCreation.tsx:24` |
| Creation UI (later companies) | `src/components/layout/CreateCompanySheet.tsx:33`, mounted from `CompanySelectionSheet.tsx:158`, `CompanyManageSection.tsx:247` |
| Creation service | `src/domain/tenant/tenantCreation.ts:53` (`createEntity`), `:75` (`provisionEntity`), `:158` (`waitForTenantExposure`), `:379` (`ensureInitialCompany`) |
| Gate logic | `src/domain/tenant/tenantGate.ts:180` (`resolveGatePhase`), hold at `:199-205` |
| Gate render | `src/components/app/TenantGate.tsx:39`, phases `:77-123`, exposure wired `:57,71` |
| Provider | `src/lib/tenant/contexts.tsx:272` (`EntityProvider`), probe/retry `:397-433`, release rule `:435` |
| Client enforcement | `src/lib/tenantClient.ts:11-34` (throws at `:17-22` when schema null) |
| Bootstrap recovery | `src/App.tsx:475-479` (`runSyncBootstrap` plus exposure trigger) |
| Edge processor | `supabase/functions/postgrest-schema-exposure/index.ts:198-283` (PATCH plus re-GET verify at `:225-266`) |
| Provision chain | `supabase/migrations/20260906103000_source_transactions.sql:552-592` (queue at `:581`, `ready` at `:582`) |
| Probe | `supabase/migrations/20260905200145_exposure_probe_queue_state.sql:28-89` (Gate 1 `:68-73`, Gate 2 `:75-82`) |
| Gate tests | `src/tests/critical/tenantGate.test.js:83-91` (ready-plus-exposed matrix) |
| Waybill blank download | `src/pages/WaybillFormPage.tsx:84-143` (catch at `:133-142`) |
| Client create | `src/pages/AddClient.tsx:16-37`; quick-add `src/components/ClientSelector.tsx:100-133` |
| Raw-string site | `src/components/document/ProjectLinkDialog.tsx:78-80` |
| Error normalization | `src/lib/errorMessages.ts:20-67`, `src/lib/feedback.ts:128-159` (registry plus expandable diagnostic) |

## 3. Company Creation Lifecycle

Actual sequence from code:

1. First company: gate `create-company` phase renders `CompanyCreation` (`TenantGate.tsx:106-107`). Later companies: `CreateCompanySheet` over ready tenant context.
2. `ensureInitialCompany()` reuses an existing active entity when present (`tenantCreation.ts:404-411`). Else inserts the row with deterministic slug, retries to 5 on unique violation, re-reads on race (`:417-456`).
3. `provisionEntity()` calls `provision_entity` RPC, then fire-and-forget exposure trigger on `ready` (`:75-89`).
4. Provisioning RPC runs schema, tables, RLS, settings, permissions, queue insert, then `ready` in one transaction (`...06103000:552-592`).
5. UI polls status to terminal (`CompanyCreation.tsx:36-61`, 2s × 15).
6. On `ready`, UI calls `confirmExposureAndSelect`, which awaits `waitForTenantExposure` (90s bound, 4s poll, immediate trigger at `tenantCreation.ts:169-175`) and only then selects plus reports success (`CompanyCreation.tsx:71-81,127,216,229`; sheet `:100-110,154,170`).
7. `EntityProvider` sets `schemaName` only on `ready` plus probe-true (`contexts.tsx:435`). `TenantGate` renders children only in that state (`tenantGate.ts:199-205`).
8. Timeout or poll-timeout paths select the entity and refresh without success (`CompanyCreation.tsx:153-158,239-243`; sheet `:179-183`). The gate then holds the `ProvisioningProgress` screen, which re-polls every 3s (`ProvisioningProgress.tsx:24-30`).

## 4. Level 5 Loading Compliance

Company Creation qualifies as Level 5: asynchronous infrastructure work beyond request/response. Implementation state:

| Level 5 rule (Loading PRD) | State | Evidence |
|---|---|---|
| Prominent waiting surface | Compliant | `CompanyCreation` processing card; `ProvisioningProgress` full screen |
| Status-based progress | Partial | Copy states exist (`Creating company…`, `Setting up schema…`, `Setting Up Your Company`) but no named Preparing→Complete stage list |
| Tips | Absent, acceptable | Tips MAY appear; none implemented on these surfaces; no rule broken |
| Cancel | Partial | Only Sign Out with background-continues dialog (`ProvisioningProgress.tsx:96-112`); no true cancel (operation cannot cancel — permitted) |
| No fake progress | Compliant | Spinners only; no percentages anywhere on this flow |
| No artificial delay | Compliant | Polling is state-driven; success fires at once on confirmation |
| Error replaces loading | Compliant | `error` phase plus `ProvisioningFailed` screen |
| Retry/support | Compliant | Try Again resets to form (`CompanyCreation.tsx:368-378`); gate auto-retries |
| aria-busy / role=status / live | Gap | No `aria-busy`, `role="status"`, or `aria-live` on any creation/provisioning surface; spinners are `aria-hidden` |
| Reduced motion | Unknown for these screens | `ProvisioningProgress` animations not checked against `prefers-reduced-motion` in this audit; verify before claiming |
| Mobile full-screen | Compliant | `min-h-screen` centered cards; `h-12` (48px) controls |
| Back behavior | Compliant | Screens are gate phases, not routes; back cannot enter tenant UI |

## 5. Readiness / TenantGate Analysis

State origins: `provisioningStatus` from `entity_provisioning_status` via RPC (`contexts.tsx:357-384`); `schemaExposed` from `is_tenant_schema_exposed` probe with trigger plus one 10s re-probe (`:397-433`); `schemaName` derived (`:435-437`); gate input wired (`TenantGate.tsx:44-73`).

Release combination: `ready` AND `schemaExposed === true`. `false`, `null` (unchecked), and non-ready states all hold. `undefined` keeps legacy provisioning-only behavior for unmigrated callers (`tenantGate.ts:204`, tested at `tenantGate.test.js:87`).

Staleness: provider clears entity state on every resolve (`contexts.tsx:300-305`); `schemaName` recomputes from fresh probe results; `tenantClient` memoizes on `schemaName` (`:437`). No persisted entity selection exists (session refs only), so no stale context survives restart. Mid-session exposure loss flips the gate back to `ProvisioningProgress` — fail-closed in both directions.

Bypass: all tenant routes render inside `TenantGate` children (`App.tsx:590-598`). No tenant page is route-mounted outside the gate. A schema cannot serve before exposure because serving requires the Management API config the probe confirms via queue state.

## 6. Verify-vs-Serve Analysis

Path: probe Gate 2 treats "no unprocessed queue row" as served (`...05200145:75-82`). Edge marks processed after PATCH plus re-GET of Management API config (`index.ts:225-266`). Both observe configuration, not a live query against the tenant schema.

Classification: RESIDUAL RISK, not a confirmed defect. Reason: if config application lags actual serving, the probe passes while first REST calls fail. No code evidence shows this lag occurring; the fresh-company test succeeded at once. The failure mode, if hit, produces PostgREST errors on first operations — consistent with the historical Waybill symptom shape — then self-heals as serving catches up and the provider re-probes. Monitor; do not redesign on this basis.

## 7. Tenant Identity Analysis

Identity chain: deterministic slug at insert → `buildTenantSchemaName(workspace.slug, entity.slug)` mirrors `_prov_get_schema_name` → `expectedSchema` from live workspace plus selected entity → `schemaName` only on confirmed readiness → `tenantClient` bound to that schema. `selectEntity` resolves by id from the freshly fetched list. No global-client fallback exists in `tenantClient`. No cross-tenant access path found in the creation flow. COMPLIANT.

## 8. Success Semantics

`Company created` / `is now active` renders only after `confirmExposureAndSelect` returns true (`CompanyCreation.tsx:127-131,216-220`; sheet `:154-158,170-175` plus toast). Timeout paths never set success. Finding: success means operational readiness as probed, not mere row creation. COMPLIANT. Minor note: success copy claims active status while the gate performs one more reactive evaluation; evaluation uses the same confirmed inputs, so no observable gap.

## 9. Failure / Timeout / Retry Analysis

| Path | Behavior | Verdict |
|---|---|---|
| Create request failure (validation, unique, RLS, network) | `error` phase, raw `String(e.message)` shown (`:244-248`) | Works; copy is raw (MINOR UX GAP) |
| Provisioning `failed` | `error` phase with backend `lastError` | Visible, actionable via Try Again |
| Exposure timeout (90s waiter) | Silent hold transfer to gate screen | Safe; no message explains the transfer (MINOR UX GAP) |
| Poll timeout (30s status poll) | Silent hold transfer (`:239-243`) | Safe; same messaging note |
| Tenant-client throw | Fail-closed throw; caught per call site | Safe core; unguarded write paths noted below |
| Retry | Try Again resets to form; `ensureInitialCompany` reuses existing row; slug-unique plus 5-attempt race converge | Safe and idempotent; duplicates not producible from UI (phase unmounts form during flight; sheet closes on success) |
| Navigation failure | No explicit handling; gate re-derives on refresh | Acceptable; no stranded success state reachable |

Unguarded write paths (throw synchronously when client not ready): `WaybillFormPage` number generation (`:37-58`), blank download (`:84-143`), `saveWaybill` callers (`:165-190`); `AddClient.handleSave` (`AddClient.tsx:16-37`, spinner sticks, silent); `ClientSelector` quick-add plus list fetch (`:73-76,100-133`). Unreachable pre-release through the gate; reachable only in the residual serve-lag window or a mid-session flap. Classify as hardening backlog, not current defect.

## 10. Restart / Recovery Analysis

Restart: splash plus auth resolve, `runSyncBootstrap` (native offline sync only — unrelated to tenancy), fire-and-forget exposure trigger (`App.tsx:475-479`), provider remount re-resolves entities, provisioning, and exposure from DB, with trigger plus 10s re-probe on negative results. Sign-out/in repeats the same path. Pending queue rows persist server-side, so recovery does not depend on the original browser session; external cron covers the no-client case. Restart therefore performs explicit re-resolve, retrigger, and re-probe — not mere elapsed time. COMPLIANT. No stored readiness is trusted.

## 11. Back Navigation Analysis

Creation screens are gate phases, not router entries, so browser back cannot dismiss a blocking wait into tenant UI. Android back behavior on these specific screens was not traced to a handler in this audit; the screens contain no modal that traps back. The sheet variant (`CreateCompanySheet`) sits over already-ready tenant context and closes without state damage; its timeout path leaves the sheet open on stale copy (minor UX note in §18). No inconsistent-state vector found. COMPLIANT with a minor sheet-timeout messaging note.

## 12. Mobile / Android Analysis

Full-screen centered cards, 48px controls, 16px inputs (no iOS zoom), phone-first layout. Safe-area insets use the project `env()` convention on sheets and footers; the centered creation cards carry no explicit insets but also no fixed chrome to obscure. No foldable-specific handling on these screens; acceptable at this simplicity. COMPLIANT. Screen-reader announcements on wait states are the gap (§13).

## 13. Accessibility Analysis

Gaps (all minor, no blocking defect): no `role="status"` or `aria-live` on `CompanyCreation` processing card or `ProvisioningProgress`; error box in `CompanyCreation` has no `role="alert"` and raw backend text is announced verbatim; spinners are `aria-hidden` without adjacent live text on the provisioning screen. Positive: labels associated, controls keyboard-operable, 48px targets, visible text accompanies most spinners. Recent workspace screens already carry `role="status"`/`role="alert"` precedent (`WorkspaceCreation.tsx:160,191`; `WorkspacePendingApproval.tsx:69`) — follow that pattern.

## 14. Engagement System Analysis

No guidance competes with creation status: no tips, no auto-cards, no celebrations on these surfaces. `LoadingTips` renders only in the generic gate `loading` phase (`TenantGate.tsx:79-82`), not during provisioning. Errors replace loading per the error phase. No duplicate loading or guidance system exists. Session guidance state is untouched by this flow. COMPLIANT. No Engagement System change required.

## 15. Global Supabase Access Analysis

Creation-path global-client calls: entity insert and reads (`entities`), status RPCs, exposure RPC and trigger — all target the public schema or SECURITY DEFINER RPCs. Intentionally global: pre-tenant bootstrap has no tenant client yet. No tenant-table access via the global client found on this path. Tenant operations use `tenantClient` bound to the confirmed schema. COMPLIANT.

## 16. Workspace vs Company Lifecycle Comparison

| Aspect | Workspace Creation | Company Creation |
|---|---|---|
| Operation | One synchronous row insert | Async schema, tables, RLS, seeds, queue, exposure |
| Success basis | Row exists (`pending_approval`) | Provisioning `ready` plus exposure confirmed |
| Waiting model | Human approval, indefinite, 5s poll | Infrastructure, bounded (~90s waiter) |
| Loading level | Level 1 submit plus waiting surface | Level 5 |
| Release gate | Membership row appears | Probe-true plus gate-ready |
| Restart semantic | Re-query pending row | Full re-resolve plus retrigger plus re-probe |
| Raw-error risk | Friendly-mapped at insert (workspace polish) | Raw `String(e.message)` on manual path |

The two lifecycles share providers and gate machinery but never interchange semantics. No pending_approval concept leaks into company flow and no provisioning concept leaks into workspace flow.

## 17. Historical Readiness Incident Comparison

Old audit suspected release at provisioning-only state with the raw `Tenant schema is not available yet.` surfacing on immediate use. Current code contradicts that mechanism: success awaits exposure confirmation at four call sites, the gate holds on probe-false, the client throws instead of misrouting, and tests pin the matrix. The fresh-company result (usable in ~13 seconds, Waybill opened at once) is consistent with a ~90s waiter confirming on an early poll. Status: HISTORICAL / NOT CURRENTLY REPRODUCED. The only mechanism that could still produce its symptom shape is the residual verify-vs-serve lag (§6), which remains unobserved.

## 18. Findings Classification

### COMPLIANT
Exposure-gated success; gate hold both directions; fail-closed client; idempotent retry; restart recovery; tenant identity; global-access hygiene; Engagement compliance; back-navigation safety; mobile layout basics.

### MINOR UX GAP
1. Raw backend error text on manual creation failure (`CompanyCreation.tsx:244-248`). Impact: user sees Supabase wording. Severity: low. Confidence: high. Action: reuse friendly mapping precedent from workspace polish.
2. Silent hold transfers on timeout (`:153-158,239-243`; sheet timeout). Impact: user watches a gate screen with no transfer message. Severity: low. Confidence: high. Action: one-line status copy on transfer.
3. Sheet timeout leaves stale sheet open over the gate screen. Impact: confusion. Severity: low. Confidence: medium. Action: close or message the sheet on timeout.

### ACCESSIBILITY GAP
4. No live-region semantics on creation/provisioning wait and error states (evidence §13). Severity: low. Confidence: high. Action: follow workspace-screen precedent.
5. Reduced-motion handling on provisioning animations unverified. Severity: low. Confidence: medium. Action: verify `prefers-reduced-motion` on `ProvisioningProgress` animations.

### RESIDUAL RISK
6. Verify-vs-serve lag (§6). Impact: first-operation PostgREST errors despite confirmed probe. Severity: medium if hit, currently unobserved. Confidence: medium. Action: monitor first-operation error rates; consider a serving check only with measured evidence.

### DOCUMENTATION GAP
7. PRD Example 8 (Loading PRD) still defines provisioning completion without exposure confirmation, while code enforces it. Severity: low. Confidence: high. Action: amend Example 8 plus §9.4-style readiness definition.

### HISTORICAL / NOT CURRENTLY REPRODUCED
8. Original premature-release incident. Evidence now contradicts the mechanism. No action.

No CONFIRMED CURRENT DEFECT. No architectural concern.

## 19. Recommended Next Steps

1. Apply friendly error mapping on manual creation failure (P3, small).
2. Add transfer messaging on timeout holds (P3, small).
3. Add live-region semantics to creation/provisioning surfaces (P3, small).
4. Amend Loading PRD Example 8 and tenancy readiness definition (P3 docs).
5. Monitor first-operation errors post-creation before touching verification (observability, no code).
6. Leave verification, gate, provider, edge, and migrations unchanged.

## 20. Files Inspected

`src/pages/CompanyCreation.tsx`, `src/components/layout/CreateCompanySheet.tsx`, `src/domain/tenant/tenantCreation.ts`, `src/domain/tenant/tenantGate.ts`, `src/lib/tenant/contexts.tsx`, `src/components/app/TenantGate.tsx`, `src/lib/tenantClient.ts`, `src/pages/ProvisioningProgress.tsx`, `src/App.tsx`, `src/app/useSyncBootstrap.ts`, `src/pages/WaybillFormPage.tsx`, `src/pages/AddClient.tsx`, `src/components/ClientSelector.tsx`, `src/components/document/ProjectLinkDialog.tsx`, `src/lib/errorMessages.ts`, `src/lib/feedback.ts`, `src/lib/userFacingMutationErrors.ts`, `supabase/functions/postgrest-schema-exposure/index.ts`, `supabase/migrations/20260906103000_source_transactions.sql` (provision chain), `supabase/migrations/20260905200145_exposure_probe_queue_state.sql` (probe), `src/tests/critical/tenantGate.test.js`, `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`, `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/10-loading-and-refresh.md`, `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Product-Guidance-Engagement-System.md`, `docs/Reports/multi-tenancy/post-creation-tenant-readiness-audit-2026-09-09.md`, `docs/Reports/multi-tenancy/workspace-creation-frontend-ux-audit-2026-09-09.md`, `docs/PROJECTSKILLINDEX.md`, `AGENTS.md`.

## 21. Files Created

`docs/Reports/multi-tenancy/company-creation-frontend-ux-audit-2026-09-09.md` (this report). Nothing else.

## 22. Verification / Git Scope

- Baseline `git status`: 3 modified (PRD doc update plus 2 workspace polish pages from prior authorized tasks), 2 untracked prior audit reports. All pre-existing; untouched.
- Final `git status`: identical plus this one new report file.
- Final `git diff --stat`: unchanged from baseline (3 pre-existing modified files only).
- Zero code, migration, config, test, documentation, or database changes. No validation commands run per task constraints (typecheck, lint, audit, build all skipped as instructed).

## 23. Final Verdict

NO CURRENT CORRECTNESS-BLOCKING DEFECT
