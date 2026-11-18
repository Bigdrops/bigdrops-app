# Stage 0.3 — Install & Verify on `svrpqsdagtgtclnrlmbm`: **BLOCKED at migration `20261014160000_document_search_phase3.sql`**

**Date:** 2026-11-18 · **Type:** Authorized installation + live verification, blocked at migration install · This report records actual outcomes; no success is claimed for unrun phases.

## Final status: **Blocked**

## What was attempted
1. `supabase db push` against `svrpqsdagtgtclnrlmbm` — initially failed with `IPv6 is not supported` on `db.svrpqsdagtgtclnrlmbm.supabase.co`; a PAT for the project's organization (`sbp_…`, stored only in gitignored `.env.disposable`) was supplied and now the CLI sees the project (`ACTIVE_HEALTHY`, `eu-central-1`, "Wibrops dev").
2. **138 of 158 migrations applied successfully**, through `20261014120000_document_search_convergence.sql` (verified by `supabase migration list --project-ref svrpqsdagtgtclnrlmbm`).
3. **Migration `20261014160000_document_search_phase3.sql` failed** and every migration after it was not applied:
   ```
   ERROR: column "invoice_number" does not exist (SQLSTATE 42703)
   At statement: 5
   ```
   The failing statement is the `DO $$ … $$` re-install block inside the file; it calls `public._prov_install_search(…)`, which executes `CREATE INDEX IF NOT EXISTS idx_receipts_invoice_number_trgm ON %I.receipts USING GIN (invoice_number gin_trgm_ops)` (line ~163 of the phase-3 file, mirrored in `_prov_install_search` in `20261014120000_document_search_convergence.sql`).

## Root cause (source-verified)
- `public.receipts` (`supabase/migrations/20260706000000_create_receipts.sql`) has **no** `invoice_number`.
- Migration **`20260707000000_receipt_snapshot_and_idempotency.sql`** adds it:
  `ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_number text;`
- But the committed tenant template seed **`20260915194332_tenant_template_seed.sql`** clones an older shape of the table: `tenant_master_template.receipts` is defined with `receipt_number, payment_id, invoice_id, client_id, client_name, amount, currency_code, payment_date, payment_method, payment_ref, notes, …` — it **never receives `invoice_number`**, and no later committed migration adds it (grep for `tenant_master_template.receipts` modifications finds only indexes and FKs on existing columns).
- Consequently, from a **fresh, empty project**, the phase-3 DO block running `_prov_install_search('tenant_master_template')` fails inside `idx_receipts_invoice_number_trgm`.
- On production the same error had to have been resolved out-of-band (the phase-3 migration is not recorded as applied by the CLI for either environment's history; the production deployment report documents manual out-of-band application of later migrations).

## Why this is not fixed here
The constraints for this task forbid editing historical migrations, skipping migrations, or rewriting migration history. A repair such as a new idempotent migration that aligns the template with `public.receipts` would be additive (`ALTER TABLE tenant_master_template.receipts ADD COLUMN IF NOT EXISTS invoice_number text;`), but **creating a new migration is outside the authority granted for this task** and must not be introduced unilaterally into a shared migration chain.

## What is needed to unblock
Authorization to add **one** new migration (name suggested: `20261119000000_tenant_template_receipts_invoice_number.sql`) containing exactly:
```sql
ALTER TABLE tenant_master_template.receipts ADD COLUMN IF NOT EXISTS invoice_number text;
```
and permission to push the remaining migrations. After that, `supabase db push --project-ref svrpqsdagtgtclnrlmbm` should complete, and Stage 0.3 verification (tenant provisioning + RPC and preservation tests) can run.

## State & leaks
- `.env.disposable` holds the disposable DB password and PAT; `git check-ignore` still matches; `git status --porcelain=v1` shows `.env.disposable` untracked. **No secrets committed.** `supabase/.temp/linked-project.json` unchanged (still `xqlpekpkbszpdgtuwybh`).
- The 158-question migration set applied: 138 complete; pending list from `supabase migration list`: `20261014160000, 20261015120000, 20261016090000, 20261016120000, 20261016130000, 20261102000000, 20261106230000, 20261107120000, 20261107140000, 20261107150000, 20261108233000, 20261114160000, 20261114170000, 20261114180000, 20261115150000, 20261115160000, 20261115170000, 20261116120000, 20261116130000, 20261116131000, 20261116132000, 20261117000000, 20261118120000, 20261118130000`.
- No application source, no migrations, no tracked files modified by this task.
- Verification cannot truthfully report PASS on any RPC/item for this database today; it has a known-incomplete schema.

## Git status (unchanged by this task)
```
 M .workbuddy-ai/memory/2026-11-18.md
 M src/lib/ai-assistant/bolu-document-service.ts
 M src/lib/ai-assistant/bolu-operations.ts
 M supabase/database-workflow.md
?? supabase/disposable-database.md
?? docs/reports/bolu-document-capability-parity/
?? docs/reports/bolu-modification-integrity/
?? src/tests/ai-assistant/bolu-modify-integrity.test.js
```
(`.env.disposable` intentionally untracked/ignored.)

**Verdict: FAIL / BLOCKED — schema installation incomplete; verification not possible on current state.**
