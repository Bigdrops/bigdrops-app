# Stage 0.3 — Scratch-Tenant Verification: **BLOCKED**

**Date:** 2026-11-18 · **Type:** Authorized bounded scratch-tenant verification · **Result: stopped before any write; no database was contacted.**

## Final status: **Blocked — scratch isolation cannot be positively established**

The available environment offers exactly one database: the BOURXE **production** Supabase project `xqlpekpkbszpdgtuwybh`. No isolated scratch tenant is configured, documented, or reachable here, and the task's own isolation rules prohibit using it. No query, RPC call, migration or write of any kind was made.

## Evidence establishing what the environment actually points at

| Datum | Finding |
|---|---|
| `.env` `SUPABASE_URL` / `VITE_SUPABASE_URL` | `https://xqlpekpkbszpdgtuwybh.supabase.co` |
| `.env` `DATABASE_URL` | host `db.xqlpekpkbszpdgtuwybh.supabase.co`, port `5432`, database `postgres` |
| `.env` contains | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — service-role production credentials |
| `docs/reports/bolu-persistence-integrity/production-deployment.md` (pre-existing report) | "**All authorized migrations were applied to the BOURXE production Supabase database**" and `| Project ref | `xqlpekpkbszpdgtuwybh` |` |
| Repository tickets (`docs/tickets/pending-migrations-push.md`, `docs/tickets/postgrest-schema-overwrite-bug.md`) | refer to `xqlpekpkbszpdgtuwybh` as "the hosted project"; the incident of the wrong project was `bigdrops-main` |
| `supabase/.temp/` CLI link metadata | points to `xqlpekpkbszpdgtuwybh`; the Stage 0.2 independent verification explicitly warned this proves CLI linkage only |
| Search for any scratch/test tenant in this repo (docs, reports, configs) | **none found** — no second project ref, no `supabase start` local config for a scratch instance, no documented test tenant |
| `docker` CLI | **not installed** (`not recognized`) — a self-contained local Supabase stack cannot be started |
| `supabase` CLI | on PATH, but with no scratch project configured and no authorization to provision one |

Every database credential reachable from this environment therefore targets production. The task states plainly: "Do not use production credentials, production tenants, or production records for this task" and "Stop if the available environment cannot positively establish that the target is an isolated scratch tenant." Both triggers are met.

## What was NOT done (by design)
- No database connection of any kind (read-only included), because the only credentials are production credentials and production use is categorically forbidden for this task.
- No RPC inspection on the hosted project (that requires production access).
- No migration verification against a live instance.
- No test records were created; nothing to clean up.

## What Stage 0.3 would require
1. The exact isolated **scratch** project ref and its dedicated credentials (non-production), confirmed in writing as isolated from production business data, or
2. Deployable local scratch infrastructure (e.g. Docker + `supabase start`) or a documented test tenant, with your explicit selection of it, or
3. Explicit authorization to create a new scratch Supabase project (which would be a new environment require authorization outside this task — and even then, the deployed-production-RPC objective of Stage 0.3 would not be met by it).

## State of Stage 0 evidence before this blocker
- Stage 0: implemented; harness-tested; reported Partially completed.
- Stage 0.1: independent review — Partially completed (item-identity abstention/floor).
- Stage 0.2: independent review — **PASS (bounded)**; harness SQL parity improved; explicit `item_id` sanitization + tenant catalog verification with fail-closed semantics (33→34 tests green, `tsc --noEmit` clean).
- Stage 0.3 (this task): **Blocked at environment gate.** The specific defect the task targets — hosted/deployed RPC bodies — remains unverified by this task. The local harness is a model, not the deployed RPC; the migration `20261118130000_bolu_tenant_rpc_installer.sql` is unverified against any live database by this work.

## Risks that persist while blocked
- Any live-tenant mismatch between the installer migration and its actual deployed form (parameter order, `p_cps_feedback`, `has_entity_permission` edit gate, `is_active` behavior, item INSERT column list) is **unverified**. Production could behave differently than the model in ways the harness cannot show.
- The migration installer was applied in production per the pre-existing report, but that is a historical claim by another actor, not evidence this audit could inspect or re-verify.

## Git state (unchanged)
```
## main...origin/main [ahead 12]
 M .workbuddy-ai/memory/2026-11-18.md
 M src/lib/ai-assistant/bolu-document-service.ts   (Stage 0/0.1/0.2, uncommitted)
 M src/lib/ai-assistant/bolu-operations.ts          (Stage 0)
?? docs/reports/bolu-document-capability-parity/
?? docs/reports/bolu-modification-integrity/
?? docs/reports/bolu-persistence-integrity/independent-verification.md
?? docs/reports/bolu-persistence-integrity/production-deployment.md
?? src/tests/ai-assistant/bolu-modify-integrity.test.js
HEAD = 295f98e4
```
No implementation, test, migration, configuration, SQL, or UI files were modified by this task. No commits, pushes, staging, stashes, resets, checkouts or cleans were performed. This report is its only attributable output.

## Recommended next step
Provide an explicitly authorized, isolated scratch tenant (project ref + credentials, or Docker + `supabase start`), then re-run this stage end-to-end against it: catalog identity cases A–F, atomicity checks with transactional verification, and the data-preservation regression diff, with cleanup limited to task-created records. Production paths must remain untouched in the interim.
