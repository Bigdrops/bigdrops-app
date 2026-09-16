# M8 Migration Repair Set — Production-Readiness Audit

This report was written by Muse Spark on 2026-09-15 via OpenCode.
Skills used: supabase, supabase-postgres-best-practices, database-schema-designer
Documentation standard: ASD-STE100 Simplified Technical English

## 1. Executive verdict

Classification: **FAIL — do not push to production in current form.**

The disposable M8 PASS is real functional evidence. It is not proof of clean migration replay. The working tree contains 28 edited historical migrations, 2 new repair migrations, 1 edited untracked migration, and 1 malformed migration artifact. Production `db push` would skip the 28 edited versions (already applied), so short-term production data is not at immediate risk. A fresh database recreated from migration files alone cannot reproduce the disposable PASS state. Manual API repairs fill the gap. One file is corrupted. Revert-and-replace is required before production work.

Initial `git status --short`: 34 modified + 9 untracked (28 migration edits listed in section 3). No database or configuration changes were made by this audit.

## 2. Production safety assessment (already-migrated database)

Supabase `db push` applies only versions absent from `supabase_migrations.schema_migrations`. Production already holds every version through `20260914132241`. Consequence:

- All 28 edited historical files are **skipped on next production push**. Their edits change zero rows, zero functions, zero policies on production.
- Only `20260914202935_fix_projects_audit_dependency.sql` and `20260915053455_fix_workspaces_updated_by.sql` would execute on production. Both are idempotent (section 8). Safe.
- Exception: `20260830010000_wht_receipts_tenant_grant.sql` is malformed in the working tree (section 5). Its version is already applied on production, so `db push` also skips it. The danger is future `db reset`, `migration repair`, or fresh clone, not next `push`.

Short-term production data risk: **none**. History integrity risk: **high** (section 4).

## 3. Fresh-reset and replay assessment

Fresh replay from files alone: **FAIL.**

Evidence from the disposable run (`supabase db reset --linked --yes` reached `EXIT:0` only after all guards, yet `provision_entity` then failed with `relation "tenant_master_template.clients" does not exist`, then `tax_computation_results`, then `journal_entries`, then `function invoice_persisted_status does not exist`, then `ON CONFLICT` without PK). Each failure was patched via `database/query` API, not via files. The final PASS depended on that API state.

Root causes in files:

- `20260902055836_tenant_master_template.sql` clones from `entity_bigdrops-main_main`. On a fresh database that schema has 0 tables. The edited fallback clones 32 names from `public`, but `20260830000000_public_business_schema_purge.sql` already purged `public` business tables. Fallback therefore creates minimal or empty tables. Disposable required manual `CREATE TABLE ... (LIKE public ...)` plus full definitions copied from `git show HEAD` plus manual PK/index/FK rebuild.
- `20260520090001_projects.sql`, `20260520090002_quotations.sql`, `20260520090003_invoices.sql`, `20260520090005_items_catalog.sql` no longer create their functions. Fresh replay depends entirely on `20260914202935`. That file wraps each `CREATE` in `DO $outer$ IF EXISTS`. If `activity_events` or `item_price_summary_v` is absent at that point, it emits `NOTICE` and skips. No retry. A fresh replay that reaches it out of order would silently miss functions.
- `_prov_get_template_tables()` on disk (in `20260902055836`) returns a static 32-array. The disposable PASS used a manually overwritten version returning all 45 `tenant_master_template` tables. File behavior and tested behavior differ.

## 4. Historical migration immutability assessment

`supabase/database-workflow.md` section 1 and `AGENTS.md` section 3 require one migration file per schema change and forbid hand-editing the hosted database. The project convention (and Supabase semantics: `supabase migration list --linked` compares version numbers only) treats applied versions as immutable.

Current state violates it: 28 applied versions edited in place.

| Effect on production `db push` | Effect on fresh `db reset` |
|---|---|
| Skipped (safe) | Consumes edited contents (intended fix, but unreviewable as a diff against history) |

`git show HEAD:supabase/migrations/<file>` vs working copy confirms each edit is a guard or deferral, not a data change. Intent is correct. Form is not migration-safe. `git log --oneline -8` shows no commit for these edits; they are uncommitted working-tree changes owned by the M8 session, plus pre-existing uncommitted changes from other agents (`docs/PROJECTSKILLINDEX.md`, `skills-lock.json`, `src/hooks/useQuotationSave.ts`, `src/pages/ViewQuotation.tsx`, `src/pages/view-boq-actions.ts`, `supabase/migrations/20260907000000_record_capture_foundation.sql` was already modified before M8).

Recommendation: **revert the 28 history edits and replace their behavior with new repair migrations** (strategy B in section 10). Retaining them with sign-off is possible but leaves `db reset` and `db push` consuming different code paths for the same version, which `supabase db diff` cannot reconcile.

## 5. Integrity assessment of 20260830010000_wht_receipts_tenant_grant.sql

`HEAD` version (from `git show HEAD:supabase/migrations/20260830010000_wht_receipts_tenant_grant.sql`):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE
  ON "entity_bigdrops-main_main".wht_receipts
  TO anon, authenticated, service_role;
```

Working-tree version (read `20260830010000_wht_receipts_tenant_grant.sql:5`): the explanatory comment lines were consumed by a Python regex into the `EXECUTE` string. The file is now one 5-line blob: `-- Root cause: ... lacks the table DO $$ BEGIN IF EXISTS ... EXECUTE 'GRANT that -- every sibling ...`. The `GRANT` still executes (push succeeded), but the header documents a wrong object and the file is unreviewable.

It is the **only comment-mangled artifact** found. Method: `git diff` across all 28 files was inspected. Other large diffs are intentional rewrites, not corruption:

- `20260905000000_revert_invoice_canonical_tenant_install.sql` (376 lines changed): 4 functions wrapped in `DO $outer$ IF EXISTS (pg_namespace) THEN EXECUTE 'CREATE ...'` with `''` quote doubling. Semantically identical, hard to review but not corrupt.
- `20260907000000_record_capture_foundation.sql` (374 lines): placeholder `__SCHEMA__` body replaced with `tenant_master_template` guard + entity-schema loop. Intentional.
- `20260810070000_payment_receipt_data_migration.sql` (44 lines): direct `INSERT/ALTER` wrapped in conditional `DO`. Intentional.

No other file shows comment-into-code fusion.

## 6. Disposable and API-only repair inventory

| Repair | In files? | Verdict |
|---|---|---|
| `public.activity_events` / `public.audit_logs` recreation via `POST /database/query` after `db reset` left them absent from PostgREST cache | Partially. `20260520090008_audit_activity.sql` defines them, but reset did not expose them until the file was re-executed via API. File is correct; ordering with `20260914202935` is fragile. | Partially represented. Do not duplicate; fix ordering, not another copy. |
| `tenant_master_template` 32-table rebuild (`LIKE public INCLUDING ALL`, full definitions from `git show HEAD`, `blank_csr/waybill_logs` FK correction, `csrs/waybills` PK restore) | Partially. `20260902055836` fallback exists but cannot populate from purged `public`. Manual rebuild exceeded file logic. | Partially represented. Must be codified. |
| PK additions on 28 template tables (`ALTER TABLE tenant_master_template.<t> ADD CONSTRAINT <t>_pkey PRIMARY KEY (id)`) | Missing. No migration adds them; `LIKE INCLUDING ALL` did not carry them on disposable because source tables lacked them at clone time. | Missing. Must be codified or source fixed. |
| FK repairs (`blank_csr_logs → csrs`, `blank_waybill_logs → waybills`) | Partially. Original migrations define FKs to `public`, template migration drops FKs. No file re-adds them on template. | Partially represented. Must be codified. |
| `_prov_get_template_tables()` replacement (static 32-array → all 45 tables) | Missing. Disk version still returns static 32-array (`20260902055836:251`). Tested version returns `array_agg` over `tenant_master_template`. | Missing. File and tested behavior differ. Must be codified as a new migration with explicit table list decision. |
| `invoice_persisted_status(text,text,numeric)` creation via API from `20260809060000` | Partially. Function exists in `20260809060000_invoice_financials_tenant_view.sql` but was absent after reset (dependency skipped or dropped). File defines it; replay did not install it. | Partially represented. Investigate why file version did not persist; do not add a duplicate definition. |
| `public.workspaces.updated_by/updated_at` via API, then codified in `20260915053455` | Already represented. | Already represented. Keep `20260915053455`. |
| Test data (`workspaces status='active'`, `workspace_members owner`, `entity_permissions client view/create`, test users/entities) | Test-only. | Do not codify. |

## 7. Tenant-template reproducibility assessment

From migration files alone (no API):

- Tables: **no**. Fallback clones from `public`, which `20260830000000` purged. Result is 13 accounting tables + minimal shells, not 32 business tables.
- Primary keys: **no**. `LIKE INCLUDING ALL` carries PKs only if source has them; disposable source did not, hence manual `ADD CONSTRAINT`.
- Indexes: **no**. Same `LIKE` dependency; manual rebuild added them.
- Foreign keys: **no**. Template migration intentionally drops FKs; no file re-adds template-scope FKs for `blank_*` tables.
- Required columns (`payment_reference`, `evidence`, `source_boq_id`): **partial**. `20260907000000` and `20260914130000` guard on `tenant_master_template` presence; on empty template they `NOTICE` and skip.
- Required functions (`record_*`, `get_item_suggestions`, `invoice_persisted_status`): **partial**. `20260914202935` installs them only `IF EXISTS` dependencies; silent skip otherwise.
- Required grants: **partial**. Hardcoded-schema `GRANT`s are now `IF EXISTS (pg_namespace)` guards; on empty template they skip.
- Table-list and provisioning behavior: **no**. File returns static 32-array; tested behavior returns 45.

## 8. Assessment of the two new repair migrations

- `20260914202935_fix_projects_audit_dependency.sql` (untracked, 496 lines). Recreates 10 deferred `record_* RETURNS public.activity_events` plus `get_item_suggestions`, each in `DO $outer$ IF EXISTS`. **Safe on production**: `CREATE OR REPLACE`, identical bodies except `public.` qualifier. **Insufficient alone**: it assumes `activity_events` and `item_price_summary_v` exist; its `ELSE NOTICE` path means a misordered fresh replay silently skips with `EXIT:0`. Add a hard `RAISE EXCEPTION` when dependencies are absent on a fresh database, or split into two migrations ordered after `20260520090008` and `20260520090010`.
- `20260915053455_fix_workspaces_updated_by.sql` (untracked, 5 lines). `ADD COLUMN IF NOT EXISTS updated_by/updated_at`. **Safe and sufficient** for its defect. Keep.

## 9. Exact blockers before production

1. Restore `20260830010000_wht_receipts_tenant_grant.sql` header; keep only the conditional `GRANT`. Current blob must not ship.
2. Decide history strategy (section 10) and implement it. Current 28-file edit set must not ship as-is.
3. Codify template seeding: one new migration that populates `tenant_master_template` from committed definitions (not from live `entity_bigdrops-main_main`), including tables, PKs, indexes, FKs, and required columns. The disposable API sequence is the spec; it is not yet a file.
4. Codify `_prov_get_template_tables()` decision (32 vs 45) in a migration. Do not leave file-vs-database divergence.
5. Resolve `invoice_persisted_status` absence: determine why `20260809060000` did not persist it on reset; fix ordering or re-apply in a new migration instead of API.
6. Harden `20260914202935` skip paths: silent `NOTICE` on missing `activity_events` must fail a fresh replay, not pass it.
7. Confirm `20260914130000_add_source_boq_id_to_quotations.sql` (untracked, another agent) is reviewed and committed or excluded; it was edited in this session (guard added) but is not part of the M8 repair set.
8. Run `supabase db reset --linked` on a second clean disposable from files only (no API) and require `provision_entity` `ready` before any production `db push`.

## 10. Recommended migration strategy

**Revert historical edits; replace with new repair migrations (strategy B).**

- `git checkout --` the 28 tracked files to `HEAD` (requires explicit user authorization per `AGENTS.md` section 2; do not do it in this audit).
- Keep `20260914202935` and `20260915053455` (after hardening item 6).
- Add `20260915XXXX_template_seed.sql` (template tables + PKs + indexes + FKs from committed definitions), `20260915XXXX_template_grants.sql` (conditional `GRANT`s for `entity_bigdrops-main_main` only when present, else `NOTICE`), and `20260915XXXX_cron_guard.sql` if `pg_cron` handling needs more than the current two guards.
- Keep production-specific data migrations (`entity_bigdrops-main_main` backfills, SASQUO-324) as `NOTICE+RETURN` guards, but implement those guards in new wrapper migrations, not by editing history. The cleanest migration-safe form is a single `20260915XXXX_disposable_guards.sql` that runs before the data migrations? It cannot, because ordering is fixed. Therefore the guards must live in new migrations that supersede the old data migrations' effects, or the old data migrations must be left to fail on fresh databases and explicitly documented as production-only with `supabase db push --include-all` exclusion. State this trade-off to the project lead; do not silently retain history edits.
- Fix `20260830010000` first regardless of strategy.

## 11. Evidence

- `git status --short` (pre-audit): 34 modified + 9 untracked; 28 in `supabase/migrations/`, plus `?? 20260914130000`, `?? 20260914132241`, `?? 20260914202935`, `?? 20260915053455`.
- `git show HEAD:supabase/migrations/20260830010000_wht_receipts_tenant_grant.sql` vs working copy line 5 (comment fusion).
- `git diff --stat -- supabase/migrations/`: 28 files, +506 −953.
- `20260520090001:108`, `20260520090002:250/289/326`, `20260520090003:204/243/280` `RETURNS activity_events` vs `20260520090008` table creation (dependency).
- `20260520090005:139 get_item_suggestions` vs `20260520090010` `item_price_summary_v` (dependency).
- `20260611000000:167/178` `CREATE POLICY IF NOT EXISTS` (invalid syntax).
- `20260902055836:46 fallback`, `20260903070000:115 pg_cron guard`, `20260903100000:17 pg_cron guard`, `20260905000000:33 DO $outer$ IF EXISTS`, `20260907000000:12 tenant_master_template guard`.
- `20260902055836:246 _prov_get_template_tables` static 32-array vs disposable 45-array override.
- Skills: `supabase` (imperative migrations, `execute_sql` vs `apply_migration`, advisors), `supabase-postgres-best-practices` (RLS `security-`, `schema-` rules), `database-schema-designer` (3NF, PK/FK, reversible migrations).

## 12. Classification

**CONDITIONAL PASS as audit, FAIL as ship-readiness.**

The audit is complete and conclusive. The migration set is safe for already-migrated production on next `push` (all history edits skipped, two new files idempotent) but **not reproducible from files alone** and **not shippable** with a malformed file and 28 history edits. Implement blockers 1–8 before any production migration work.
