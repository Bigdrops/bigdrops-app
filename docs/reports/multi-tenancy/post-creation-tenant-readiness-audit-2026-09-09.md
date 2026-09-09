# Post-Creation Tenant Readiness Audit — Premature-Release Race

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Determine whether new companies release before tenant infrastructure is ready.
- Scope: Creation flows, gate, provider, exposure pipeline, Waybill/Client paths, restart, loading contracts.
- Files changed: NONE except this report. Zero implementation changes.
- Skills used: supabase, react-dev, vercel-react-best-practices.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: NONE. Read-only inspection plus read-only live DB probes from prior verified state.
- Verification result: `git status` clean before; all claims cite file + line.
- Risks or limitations: No runtime reproduction. Timing claims derive from code, not measurement.
- Deferred work: Implementation belongs to a future coding task.

---

## CONFIRMED FACTS

1. `provision_entity()` marks `ready` in the same transaction that queues exposure (`20260906103000_source_transactions.sql:581-582`). Exposure completes asynchronously via edge function.
2. Both creation flows withhold success until `waitForTenantExposure()` returns true (90s bound, 4s poll): `CompanyCreation.tsx:127,143,216,229`, `CreateCompanySheet.tsx:154,170`.
3. Gate renders app children only when `provisioningStatus==='ready'` AND `schemaExposed===true` (`tenantGate.ts:199-205`, wired `TenantGate.tsx:57`).
4. Provider sets `schemaName` only on `ready + exposed` (`contexts.tsx:435`). Otherwise `tenantClient.from()/rpc()` throw `Tenant schema is not available yet.` (`tenantClient.ts:17-22`).
5. No route renders tenant pages outside `TenantGate` (`App.tsx:590-598`).
6. No localStorage entity persistence exists. Selection refs are session-only (`contexts.tsx` provider remount re-resolves from DB).
7. Restart runs explicit recovery: `triggerPostgrestExposure()` at bootstrap (`App.tsx:477-479`) plus provider remount resolve, probe, trigger, and 10s re-probe (`contexts.tsx:297-433`).
8. `isPermissionError()` does NOT match the readiness string (`tenantGate.ts:82-91`). Waybill blank-download catch therefore surfaces it raw (`WaybillFormPage.tsx:133-141`).
9. The exact string `Failed to create` does not exist in `src`. Closest: AddClient `Save failed / Failed to save client` (`AddClient.tsx:31`).
10. Level 5 names company provisioning explicitly, with status-based stages and tips (`10-loading-and-refresh.md:145-170,880-892`).

## OBSERVED IMPLEMENTATION (lifecycle timeline)

| # | Transition | Implementation | Sync/async | Blocks user | Persists | Survives restart |
|---|---|---|---|---|---|---|
| 1 | Create request | `createEntity()` insert (`tenantCreation.ts:53-72`) | async RPC | yes (form) | DB row | n/a |
| 2 | Provision | `provision_entity()` RPC (`tenantCreation.ts:75-89`) | async, ~3-5s typical | yes (poll) | status table | n/a |
| 3 | Schema/tables/RLS/perms | Inside provision txn (`...06103000:553-580`) | sync in txn | yes | schema | yes |
| 4 | Queue row | Same txn, before `ready` (`:581-582`) | sync | yes | queue table | yes |
| 5 | Status `ready` | Same txn | sync | — | status table | yes |
| 6 | Edge trigger | Fire-and-forget (`tenantCreation.ts:82-86`, `:169`) | async, unawaited | no | — | no (retriggered) |
| 7 | Queue processed | Edge GET→PATCH→verify→mark (`index.ts:198-283`) | async, seconds–min | no | queue row | yes |
| 8 | Confirmation | `waitForTenantExposure` 90s/4s poll (`:158-176`) | async | yes (creation flows) | no | no (re-polled) |
| 9 | Success UI | Only if poll true (`CompanyCreation:129`, `:218`; Sheet `:156`, `:172`) | — | — | no | n/a |
| 10 | Tenant release | Gate `ready` needs probe true (`tenantGate.ts:199-205`) | reactive | yes (holds screen) | no | re-evaluated |
| 11 | First operation | Component handlers via `tenantClient` | user-paced | no | business rows | n/a |
| 12 | Timeout path (>90s) | selectEntity + refresh, NO success (`:75-81`, `:104-107`) | — | gate holds `ProvisioningProgress` | selection (session) | re-resolved |
| 13 | Restart | Fresh resolve + trigger + probe + 10s re-probe; no stored entity | async | splash/gate | no | n/a (it IS restart) |

## AUTHORITATIVE PRD REQUIREMENTS

- Tenancy PRD v2.1: readiness = provisioning status; exposure automation, probe, and gate-hold are implemented extensions (prior fix commits). PRD text does not define an exposure-confirmation gate or preparation copy.
- Loading PRD Level 5 (`10-loading-and-refresh.md:145-170`, Example 8 `:880-892`): provisioning gets full surface, status stages (Preparing→Processing→Generating→Finalizing→Complete), tips, optional cancel; completion = fade out, route to company, snackbar confirm. No fake percentages, no artificial delay, `aria-busy` + `role="status"`, reduced-motion respected.
- Engagement System: extends loading, never replaces it (`Product-Guidance-Engagement-System.md:7-9`). Status and errors outrank guidance (`:50-54`, `:118-120`). Session-scoped state must survive loading passes (`:68-69`). No second loading system (`:348-358`).

## ROOT CAUSE / RACE ANALYSIS

**Verdict on the suspected cause: DISPROVEN for current code, with one residual window.**

- Success condition today = **D** (exposure confirmed), not A/B/C. Both creation flows prove it (`CompanyCreation:127`, `CreateCompanySheet:154`).
- Release condition (gate children) = **D** (`tenantGate.ts:204-205`). Users cannot reach tenant screens at A/B/C.
- The reported journey (success at 3–5s, then failure) matches the PRE-fix behavior (success on provision `ready`), not the current code. If observations postdate fix commit `30be0bbc`, the residual explanations are:
  1. **Verify-vs-serve gap (likeliest).** Edge verify re-GETs Management API *config* (`index.ts:225-243`), never test-queries the schema. If serving lags config, probe is true, gate releases, and real REST calls fail. Waybill download then throws a PostgREST-level error through `feedback.error` with stack diagnostic + registry ID — exactly the "extensive tenant-related error". Client insert fails similarly (user paraphrase: "Failed to create" — string absent from `src`, closest `AddClient.tsx:31`).
  2. **Unguarded write paths.** `WaybillFormPage` number-gen (`:37-58`), blank download (`:84-143`), `saveWaybill` callers (`:165-190`, callee has no guard), `AddClient.handleSave` (`:16-37`), `ClientSelector.handleSaveNewClient` (`:100-133`, also `fetchClients` `:73-76`) never check `isReady`. Reachable only mid-session if exposure flaps after release, or in window (1).
  3. **AddClient silent failure.** Sync throw bypasses the `{error}` branch: `setSaving(false)` skipped, spinner stuck, no message. Worse than reported; distinct UX defect, same root trigger.
  4. **ProjectLinkDialog raw string** (`:78-80`): only UI site rendering the internal text. Nearly unreachable (dialog lives behind gate-ready), but non-conforming copy.
- Read paths are safe: ~30 `isReady` guards cover all view/load effects (`ViewWaybill:171`, `ViewCSR:163`, `Clients:102-112`, invoice/quotation hooks, dashboard, search, accounting, settings).

## RESTART ANALYSIS

**Restart performs explicit recovery; time alone is insufficient explanation.**

- Fresh `EntityProvider` mount re-resolves entities, provisioning, and exposure from DB (`contexts.tsx:297-433`). Nothing cached.
- Bootstrap fires `triggerPostgrestExposure()` (`App.tsx:477-479`); provider re-triggers on negative probe plus one 10s re-probe (`:411-421`); `ProvisioningProgress` re-polls every 3s.
- `useSyncBootstrap` handles only native offline CSR/quotation sync (`useSyncBootstrap.ts:67-140`) — unrelated to tenancy.
- Elapsed time helps only because the async edge/cron/serve pipeline progresses concurrently. The *mechanism* is re-resolve + retrigger + re-probe.

## AFFECTED USER FLOWS

| Flow | Guarded loads | Guarded writes | Verdict |
|---|---|---|---|
| Waybill view/download | Yes (`:171`) | No (number-gen, blank download, save) | Affected in windows (1)/(2) |
| Client create (page) | n/a (form) | No — silent stuck spinner | Affected; silent |
| Client quick-add (selector) | Partial (`:54` effect) | No | Affected |
| Invoice/Quotation/RFQ/BOQ/Receipt/Letter/CSR | Yes (all view + form effects) | Via gate only | Safe except window (1) |
| Dashboard/Search/Settings/Accounting/Item Library | Yes | Via gate only | Safe except window (1) |
| Project link dialog | Renders raw error | n/a | Copy defect |
| PDF/export generation | Uses loaded models | Client-side render | Safe (data already loaded) |

## PRODUCT CONTRACT RECOMMENDATION

Keep the built contract (withhold success until operational — current option 2), because the gate, provider, and flows already implement it and both PRDs support holding over pretending. Do NOT revert to immediate-success-plus-spinner. Changes needed:

1. Codify in PRD: operational readiness = `ready` + exposure confirmed; success withheld; timeout holds gate screen (already true in code).
2. Preparation surface per Level 5: named stages (e.g. Creating schema → Setting permissions → Connecting access → Ready), reassuring copy direction ("Preparing your company…", "We're setting things up for your first use. This usually takes a little while."), tips slot, `role="status"` + `aria-live`, reduced-motion-safe. No fake percentages, no artificial delay.
3. Timeout/exposure-lag UX: keep holding (never raw error); CreateCompanySheet exposure-timeout currently sits on "Setting up schema…" with no message — give it the preparation copy instead of silence.
4. Replace ProjectLinkDialog raw string with the same waiting state.
5. Guard or try/catch the five unguarded write paths with the preparation message (not the internal string).
6. Residual verify-vs-serve: either accept (monitor) or strengthen confirmation with a serving check. Do not build a second loading system; Engagement System needs no change (status already outranks guidance; preparation is a blocking-status case).

## PRD/BACKLOG ADDITIONS

1. Tenancy PRD §9 (new §9.4): operational-readiness definition, withhold-success rule, timeout-hold rule.
2. Loading PRD Example 8: add exposure-confirmation to completion condition; preparation stages + copy direction.
3. Backlog P1: unguarded write-path guards (Waybill ×3, AddClient, ClientSelector ×2) + AddClient silent-spinner fix.
4. Backlog P1: ProjectLinkDialog waiting state.
5. Backlog P2: ProvisioningProgress Level-5 conformance (stages, tips slot, aria, copy).
6. Backlog P2: verify-vs-serve strengthening or documented acceptance with monitoring.
7. Backlog P3: CreateCompanySheet exposure-timeout messaging.

## IMPLEMENTATION DEFERRED

Everything above. No code, migration, config, or data change in this task.

## UNRESOLVED QUESTIONS/BLOCKERS

1. Whether the observed journey predates fix commit `30be0bbc` (determines if residual window (1) ever triggered in the wild).
2. Unmeasured Management-API PATCH→serve propagation lag (bounds the residual window).
3. Exact user-visible text of the "extensive" Waybill error (needs the error-registry entry from the reporter's browser; registry is localStorage-only).
4. "Failed to create" has no source string — treated as paraphrase; confirm with reporter which screen (AddClient page vs in-form quick-add).
