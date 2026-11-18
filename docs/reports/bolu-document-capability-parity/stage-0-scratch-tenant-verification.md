# Stage 0.3 — Install & Verify on `svrpqsdagtgtclnrlmbm`: **PASS (bounded)**

**Date:** 2026-11-18 · **Type:** Authorized installation + live verification on the disposable Supabase project "Wibrops dev" (`svrpqsdagtgtclnrlmbm`, `eu-central-1`) · This report records actual outcomes; unverified claims are marked as such.

## Final status: **PASS (bounded)** — full migration chain installed; isolated scratch tenant provisioned; 23/23 app-path live checks pass; 2 direct-RPC adversarial probes run (one expected rejection, one seeded-gap finding). See "Limits" for what remains unverified.

## What was done

### 1. Migration chain installation (`supabase db push --project-ref svrpqsdagtgtclnrlmbm`)
- Initial state: 138 migrations applied through `20261014120000_document_search_convergence.sql`; then `20261014150000_tenant_template_receipts_invoice_number.sql` (repair authored earlier in this stage) applied OK.
- Blocker found at `20261014160000_document_search_phase3.sql`: `tenant_master_template.csrs` lacked `engine_no`; after adding it, a second blocker surfaced: `tenant_master_template.receipts` lacked the receipt-snapshot columns. Both repaired (see below); the remainder of the chain then applied cleanly.
- Final state: **161/161 migrations applied and matched** (`supabase migration list --project-ref svrpqsdagtgtclnrlmbm`: 161 entries, local == remote; 0 pending; `_temp_debug.sql` present locally but intentionally skipped by the CLI). Local `supabase/migrations/*.sql` count: 162 including `_temp_debug.sql`.
- Repair migrations created by this stage (all additive, forward-only, untracked at time of writing):
  | File | Content | Why |
  |---|---|---|
  | `supabase/migrations/20261014150000_tenant_template_receipts_invoice_number.sql` | `ALTER TABLE tenant_master_template.receipts ADD COLUMN IF NOT EXISTS invoice_number text;` | public receipts got `invoice_number` in `20260707000000_receipt_snapshot_and_idempotency.sql`; the curated template seed never received it; `public._prov_install_search` creates `idx_receipts_invoice_number_trgm` on it (failure #1 of phase-3). Committed by another actor in HEAD `f99ee2bd` — not part of this stage's untracked output. |
  | `supabase/migrations/20261014158000_tenant_template_csrs_engine_no.sql` | `ALTER TABLE tenant_master_template.csrs ADD COLUMN IF NOT EXISTS engine_no text;` | public csrs got `engine_no` in `20260620000001_add_csr_engine_no.sql`; template never received it; `search_documents` in phase-3 references `c.engine_no` (SQLSTATE 42703). |
  | `supabase/migrations/20261014159000_tenant_template_receipts_snapshot_columns.sql` | `ALTER TABLE tenant_master_template.receipts ADD COLUMN IF NOT EXISTS payment_amount numeric, payment_reference text, payment_notes text, cash_amount numeric DEFAULT 0, wht_amount numeric DEFAULT 0;` | Same drift class as above; phase-3 `search_documents` reads `rc.payment_notes` etc. (SQLSTATE 42703 on `rc.payment_notes`, reported at statement 5). |
  | `supabase/migrations/20261014170000_public_schema_grants.sql` | `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;` + default-privilege counterparts. | The disposable project was provisioned without the standard Supabase bootstrap table grants (anon SELECT / authenticated CRUD on `public`); without them no application path can insert into `workspaces`/`entities` or read public tables (`permission denied for table workspaces`, 42501). |
- No historical migration was edited; no migration was skipped; no destructive DDL was issued. Repairs are additive `IF NOT EXISTS` / `GRANT`-only.

### 2. PostgREST exposure of the tenant schema (out-of-band, disposable project only)
- `provision_entity` queued the new schema in `public._pending_postgrest_schemas` (pending, unprocessed). On production this is drained by the `postgrest-schema-exposure` edge function via the Management API; no such automation is deployed on the disposable project, so the schema was not reachable through PostgREST (`Invalid schema: entity_stage0-verify-dd665862-real_stage0-verify-dd665862-real` on the first live attempt).
- Remediated with a **union** PATCH to the project's PostgREST config (`db_schema`: `public,graphql_public` → `public,graphql_public,entity_stage0-verify-dd665862-real_stage0-verify-dd665862-real`), exactly the semantics of the edge function. The PATCH initially returned a Management-API timeout message, but a follow-up GET confirmed `db_schema` was updated (partial-apply is handled the same way by the edge function). The queue row was then marked `processed = true` (it was in fact exposed).
- Required schemas were not removed; no other project setting was touched. **Production `xqlpekpkbszpdgtuwybh` was never contacted, linked, read, or written.** `supabase/.temp/linked-project.json` still points at production (`xqlpekpkbszpdgtuwybh`).

### 3. Scratch tenant provisioned (all on the disposable project; empty except fixtures)
- Test user created via admin API (`auth.users`): `stage0verify-mwmbfycw@example.test` — created by this task, throwaway.
- Platform operator row inserted for the test user (`platform_operators`, role `owner`) so workspace approval is possible.
- Workspace `Stage 0 Scratch Verify` (`stage0-verify-dd665862-real`, `e15acbc5-5909-40f4-a3d5-c241b90a39d2`) created as `pending_approval`, approved via `public.approve_workspace(...)` → `active` (owner membership inserted).
- Entity `Stage 0 Scratch Entity` (`stage0-verify-dd665862-real`, `984a4f24-3dab-406a-b3d4-2c5d0251d0ae`) created; `public.provision_entity(...)` → `{"message":"Entity provisioned successfully","schema_name":"entity_stage0-verify-dd665862-real_stage0-verify-dd665862-real","status":"ready"}`.
- Test user assigned the workspace's preloaded **Company Admin** permission template via `public.assign_role_to_company_member(...)` (delivers `create`/`edit`/`view`/`delete` on the template's resources).
- Fixtures seeded into the tenant schema: client (`Fixture Client`, id `cccc…0001`), project (`FX-001`, id `cccc…0002`), active item (`Fixture Item A`, `aaaa1111-…`, ₦25,000), inactive item (`Fixture Item Inactive`, `eeee5555-…`, `is_active = false`).

### 4. Live verification through the application path (bun script importing the real `bolu-*` modules + real Supabase client)
Creation and modification proposals were built with `buildDocumentCreateProposal` / `buildInvoiceModifyProposal`, and executed through `persistInvoiceCreation` / `persistQuotationCreation` / `persistInvoiceModification` / `persistQuotationModification` — i.e. the same code the app runs. **23/23 checks pass.** Highlights:
- Invoice and quotation creation via the deployed RPCs: success; full header persisted (po, title, terms, charges, status); items persisted with `item_id` against the active catalog row; `custom_data` (`partNo`/`condition`) and group-header rows survived; `custom_fields` parses and carries `operation_id`.
- **Due-date-only modification** (invoice): `due_date` updated; 15 tracked header columns byte-identical (`po_number`, title, project, payment_terms, terms, notes, status, workmanship/transportation/shipping, subtotal/total/VAT/WHT/discount, work_duration); items row set untouched. Quotation `valid_until`-only modification likewise preserved the header.
- **Items modification preserving persisted metadata** (RPC `p_mode='update'` path): header, charges and `custom_fields` preserved; reactor row kept `item_id`, sub_description, make, `vat_rate=15`, `discount_rate=5`, `install_rate=25000`, `install_rate_taxable=true`, `install_rate_override=true`, `quantity` change applied (6 for Lifting lugs); group-header row kept `row_type/group_id/group_name`; explicit item removal removed exactly the dropped row.
- **Adversarial (app path)**: inactive catalog UUID discarded with a warning (`not an active item_catalog record`), row persists with `item_id = null` (E3-D); malformed UUID discarded with warning (`not a well-formed UUID`), same persistence (E3-C); stale `oldValue` mismatch rejected before any write; invalid item (empty description) rejected by input validation before persistence; `payment_terms` writes the invoice column / quotation `custom_fields.payment_terms` and never touches `terms`.
- **Direct-RPC adversarial probes** (bypass the service layer, superuser transaction + `request.jwt.claims` set to the test user, all rolled back):
  - Malformed `item_id` UUID → RPC fails with `[22P02] invalid input syntax for type uuid`; item rows before=4 after=4; reactor `item_id` unchanged. **PASS (fail-closed).**
  - Well-formed but **non-existent** catalog UUID → **accepted by the deployed RPC** (`[none] UNEXPECTED SUCCESS`), reactor `item_id` became the unknown UUID inside the rolled-back transaction. See finding F1.

### Finding F1 (reported, not "fixed"): deployed RPCs do not reject unknown catalog UUIDs
The harness model in `src/tests/ai-assistant/bolu-modify-integrity.test.js` documents `EX-FK` as "rejected (FK violation)", and `invoice_items_item_id_fkey` / `quotation_items_item_id_fkey` were indeed defined in `20260520090005_items_catalog.sql`. They are **absent** on the disposable project everywhere the query can see (no `pg_constraint` rows for those names in any schema; `public.invoice_items` does not exist at all), and the curated template seed (`20260915194332_tenant_template_seed.sql`, ~line 1422) re-creates FKs only for `item_aliases` / `item_merge_log`, never for `invoice_items`/`quotation_items.item_id`. Production necessarily behaves the same as this template deployment. Through the app path this is unreachable (the service layer discards non-`is_active` catalog ids before the RPC runs — verified live in E3-D), so the practical exposure is limited to direct SQL/RPC bypass. The fix (restore/clone those FKs or explicitly waive them) is an out-of-scope schema change and was not made; it should be a deliberate, separately-reviewed decision (and applied on production with the same repair pattern if accepted).

### Finding F2 (reported): quotations write `payment_terms` only into `custom_fields`
There is no `payment_terms` column on quotations in the deployed tenant schema; the service writes/reads `custom_fields.payment_terms` (harness test 11 mirrors this). First write requires omitting `oldValue` (nothing to stale-check against); a later stale-checked rewrite works. The behaviour is intentional but non-obvious; recorded here because the first live attempt failed on it.

## Verification commands
| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-modify-integrity.test.js` | **34 pass / 0 fail** (8.0 s) |
| `bun run audit:load` | completes; reports pre-existing ❌/🚨 findings repo-wide (57 oversized files, 8 broad selects, 4 heavy limits). None are attributable to this task (no `src/` changes by this task; only 3 untracked migration files). |
| `bun run typecheck` | **exit 0** |

## Git status at end (exact)
```
## main...origin/main [ahead 13]
?? supabase/migrations/20261014158000_tenant_template_csrs_engine_no.sql
?? supabase/migrations/20261014159000_tenant_template_receipts_snapshot_columns.sql
?? supabase/migrations/20261014170000_public_schema_grants.sql
```
(`20261014150000_tenant_template_receipts_invoice_number.sql`, the repair authored earlier in this stage, is now tracked — committed by another actor in `f99ee2bd` (`docs: add bolu persistence and document integrity files and updates`) between turns.) No application source, tests, or tracked files were modified or committed by this task. No commits, pushes, stashes, resets or cleans were performed by this task.

## State on the disposable project (left in place deliberately)
- Test user `stage0verify-mwmbfycw@example.test`; workspace `Stage 0 Scratch Verify` (active); entity `Stage 0 Scratch Entity` (provisioned, schema ready); tenant schema `entity_stage0-verify-dd665862-real_stage0-verify-dd665862-real` exposed via PostgREST (marked processed).
- Fixtures: 1 client, 1 project, 2 catalog rows (1 active, 1 inactive); 2 invoices (`INV-000001` 62378a23-4f83-49b3-8404-7f1f06aceca9 — created by the first post-exposure run; `INV-000002` c1773610-3fba-4ae6-ab84-1aa84a426322 — created by the final 23/23 run) and 2 quotations (`QUO-000001` 2ab97b99-4368-4fc3-8326-16443535985b; `QUO-000002` 9a7ed715-8e02-4672-b1ca-c5a3699055d8). All fixture-only. The run before the schema exposure aborted at the numbering-settings read and created nothing.
- `_pending_postgrest_schemas`: the stage0 row marked `processed = true`.
- The two invoices/quotations from the first passing run are retained as evidence; **not** dropped. Narrow-scope cleanup (e.g. drop workspace/tenant) was not performed — it is destructive and was not authorized. Ask before removing.

## Security notes (action recommended)
- The disposable project's **JWT secret was printed into tool output** during this stage (Management API GET response). Treat it as compromised: rotate the JWT secret for `svrpqsdagtgtclnrlmbm` (Settings → API) and redeploy any dependent clients. The PAT (`sbp_…`) was already known to have been included in earlier transcripts; rotate it too (user-scope personal token).
- `.env.disposable` (gitignored, untracked, 8 lines) holds the disposable DB password / PAT / keys; it was used only to run the CLI/API calls above and was never printed in full, never written into the repo.
- Production project `xqlpekpkbszpdgtuwybh`: never linked, never queried, never written; `supabase/.temp/linked-project.json` unchanged (still `xqlpekpkbszpdgtuwybh`).

## Limits / what is NOT verified
- The live run covers the invoice/quotation creation + modification paths and the catalog-identity behaviour those paths exercise. It does **not** re-run every harness case against the hosted DB (e.g. concurrency races, full rollback restoration semantics on fallback path), nor the PDF/export paths, nor the CPS-feedback flow.
- **F1 above stands:** unknown (well-formed) catalog UUIDs are not rejected by the deployed RPC layer; the harness's EX-FK expectation does not hold against a real database built from this migration chain.
- The public→template→tenant clone chain was exercised on a **fresh empty project**; behaviour with pre-existing tenant data was not tested here (production differences are unknown without a production-safe execution).
- Migration `20261014170000_public_schema_grants.sql` grants broad public-schema CRUD to `authenticated`/`anon` mirroring standard Supabase bootstrap grants; review whether equivalent grants exist on production before applying the same repair there.
- This report says nothing about the correctness of the deployed app build, edge functions, or Vercel state; only the database chain and the DB-bound code paths were exercised.
