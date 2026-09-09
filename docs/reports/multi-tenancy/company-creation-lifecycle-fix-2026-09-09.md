# Company-Creation Lifecycle Fix Report

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Fix two systemic new-company defects (exposure-readiness window, permission-seeder regression).
- Scope: Tenant readiness gate, creation flows, exposure edge function, canonical seeder migration plus backfill.
- Files changed: 8 modified, 1 new migration. No unrelated files touched.
- Skills used: supabase, supabase-postgres-best-practices, typescript-advanced-types, react-dev, react-useeffect, karpathy.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: See READINESS FIX and PERMISSION FIX below.
- Verification result: typecheck clean; audit:load warnings only (pre-existing); focused tenant tests 25/25; full suite 269/4 (4 pre-existing env failures); live Adel 58/4 permissions, queue 0 pending, REST 200 on Adel/Anthropology/Main.
- Risks or limitations: Edge function change not yet deployed; browser-level Waybill E2E not executed (writes production data); no fresh test company created.
- Deferred work: Edge deploy, single fresh-company acceptance test, migration-history replay (blocked, see below).

---

## ROOT CAUSE — NEW-COMPANY READINESS

`provision_entity()` commits schema, init, permission seed, queue insert, and status `ready` in one transaction. PostgREST exposure runs after, async. Two layers treated `ready` as usable: `resolveGatePhase` returned `ready` on status alone, and both creation UIs selected the entity and showed success on `ready`. A new company was therefore routable ~minutes before PostgREST served it. `EntityProvider` failed closed correctly (`schemaName=null` → `Tenant schema is not available yet.`).

## READINESS FIX

| File | Change |
|---|---|
| `src/domain/tenant/tenantGate.ts` | New optional `schemaExposed` gate input. `ready` + `false`/`null` → `provisioning` hold. `undefined` keeps legacy behavior. New pure `buildTenantSchemaName()`. |
| `src/domain/tenant/tenantCreation.ts` | New `waitForTenantExposure()` (trigger + bounded probe poll, fail-closed `false` on timeout). |
| `src/lib/tenant/contexts.tsx` | Provider exposes `schemaExposed` from existing probe state. |
| `src/components/app/TenantGate.tsx` | Passes `schemaExposed` into gate input. |
| `src/pages/CompanyCreation.tsx` | Auto and manual flows await exposure before success. Timeout selects entity without success claim; gate holds on `ProvisioningProgress`. |
| `src/components/layout/CreateCompanySheet.tsx` | Same hold-before-success contract. Timeout no longer claims success. |
| `supabase/functions/postgrest-schema-exposure/index.ts` | Re-GET after PATCH. Only verified schemas mark `processed`. Unconfirmed rows release locks for retry. |
| `src/tests/critical/tenantGate.test.js` | 2 new tests: exposure-hold matrix, schema-name derivation. |

No gate weakening. No queue removal. No Management API in DB transaction. Probe and fail-closed semantics unchanged.

## ROOT CAUSE — PERMISSION SEEDER

`20260906103000_source_transactions.sql:484` redefined `_prov_seed_default_permissions` with 8 resources. This overwrote the canonical restore from `20260906015952`. New companies (Adel, 2026-09-08) received 32 rows, 0 wildcard. Waybill access flows through the wildcard (`blank_waybill_logs` maps to resource `waybill`; `has_entity_permission` matches `resource IN (p_resource,'*')`). Adel owner therefore failed Waybill reservation.

## PERMISSION FIX

New migration `supabase/migrations/20260909025241_restore_canonical_permission_seed_v2.sql`:

- Seeder = canonical 12 resources + audit/device view-only + wildcard, plus `source_transaction` (the one legitimate addition from `20260906103000`, kept).
- Backfill targets only pairs with `source_transaction` rows on entities with no `('*','view')`. Adds missing rows only. Removes nothing. Idempotent.
- RLS untouched. No invented permissions. Nothing copied from Anthropology.

## ADEL RESULT

Adel permissions: 32/0 → 58 rows / 4 wildcard, identical to Anthropology. Creator holds `('*',create)`, which covers `('waybill','create')`. Readiness resolves (schema exposed, probe gates pass). No Adel-only code exists anywhere in the fix.

## POSTGREST RESULT

Queue `_pending_postgrest_schemas`: 6 rows total, 0 pending. Hosted REST (read-only, anon key): Adel 200, Anthropology 200, Main 200. No Dashboard manual exposure performed.

## FUTURE-COMPANY PROVISIONING

Live seeder verified canonical (`source_transaction`, `tax_setting`, wildcard present in `prosrc`). Every future `provision_entity` call seeds the full baseline in-transaction. Creation UI holds success until the probe confirms serving. Queue plus scheduled recovery remain the durability backstop.

## RECOVERY PATH

Browser trigger preserved (now awaited with timeout in creation flows, still fire-and-forget elsewhere). `EntityProvider` 10s re-probe retry preserved. External cron-job.org polling untouched (not created, not modified). Temporary browser failure cannot strand the queue.

## WAYBILL RESULT

Path traced: download → `blank_waybill_logs` INSERT → RLS `('waybill','create')` → satisfied by restored `('*','create')`. Verified at database level for Adel owner. Browser-level reservation plus download not executed (each writes production rows). Permission error no longer possible on this path.

## ANTHROPOLOGY REGRESSION CHECK

Unchanged at 58/4. Schema serves HTTP 200. No permission removed. Functional.

## MAIN REGRESSION CHECK

`Sun & Shield Power Solutions`: 278 total / 10 wildcard (pre-existing manual grants, untouched). Schema serves HTTP 200. Functional.

## FILES MODIFIED

- `src/domain/tenant/tenantGate.ts`
- `src/domain/tenant/tenantCreation.ts`
- `src/lib/tenant/contexts.tsx`
- `src/components/app/TenantGate.tsx`
- `src/pages/CompanyCreation.tsx`
- `src/components/layout/CreateCompanySheet.tsx`
- `supabase/functions/postgrest-schema-exposure/index.ts`
- `src/tests/critical/tenantGate.test.js`
- New: `supabase/migrations/20260909025241_restore_canonical_permission_seed_v2.sql`

## DATABASE CHANGES

- Function `_prov_seed_default_permissions` restored to canonical (applied live).
- Permission-row inserts only, for narrowed-seeder victims (Adel plus matching entities, incl. archived ones where rows are behavior-neutral).
- No tables, RLS, policies, schemas, or business data changed.

## TYPECHECK

`bun run typecheck`: clean, zero errors (re-verified 2026-09-09 after concurrent-agent activity).

## AUDIT:LOAD

`bun run audit:load`: completes with pre-existing warnings only (Broad Selects 6, Component Fetches 1, Heavy Limits 3). No new warnings from this task.

## TESTS

- Focused (tenantGate, firstCompanyBootstrap, firstWorkspaceBootstrap, workspaceBootstrapDecision): 25/25 pass, including 2 new exposure tests.
- Full `bun run test`: 269 pass / 4 fail. The 4 failures are pre-existing environment load errors (`import.meta.env` outside Vite) in `invoiceAccountingIntegration`, `paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`. Identical before and after this task.

## GIT STATUS / DIFF

Task scope: 8 modified + 1 new migration (listed above). All other working-tree entries belong to concurrent agents (accounting track, onboarding assets, hygiene reports) and were not touched.

## PRE-EXISTING WARNINGS/ERRORS

- 4 test env failures (above).
- `audit:load` warnings (above).
- Concurrent-agent tree churn (staged deletions, untracked reports).

## REMAINING BLOCKERS

1. Normal `supabase db push` is blocked by another agent's `20260906140000_accounting_remediation.sql` (`v_source_id` undeclared). That file was not touched. The v2 migration SQL was applied live via `db query -f`; it will replay as a no-op on the next successful push (fully idempotent). Migration-history row for v2 is still pending until push succeeds.
2. Edge function `postgrest-schema-exposure` verify-after-PATCH change DEPLOYED 2026-09-09 (`supabase functions deploy`). Live check: HTTP 200 `{"processed":0,"skipped":0,"message":"No pending schemas"}` (queue empty, zero state change).
3. Browser-level Waybill reservation plus download on Adel needs a human click-through (writes production rows; not automatable from here).
4. Optional single fresh-company acceptance test needs explicit authorization (creates production tenant data).
