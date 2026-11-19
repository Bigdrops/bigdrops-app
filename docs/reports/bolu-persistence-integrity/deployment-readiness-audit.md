# BOUXRE — Bolu Operation ID Deployment-Readiness and Installer Blast-Radius Audit

This report was written by Tencent Hunyuan Hy on 2026-11-18 via WorkBuddy Agent.

Skills used: supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive conclusion

The two prepared migrations are **not internally consistent**.

`20261118120000_bolu_operation_idempotency.sql` directly recreates the invoice
and quotation save RPCs for existing tenants with simplified bodies. Those bodies
add `operation_id`, but they omit CPS feedback handling, CPS item lineage, and the
canonical response shape. `20261118130000_bolu_tenant_rpc_installer.sql` then
reinstalls the canonical RPCs through the broad tenant installer for tenant
schemas that pass its guard.

For normal fully provisioned tenants, the second migration restores the canonical
definitions. For a tenant skipped by the second migration, the divergent bodies
from the first migration remain. A deployment that applies the first migration and
stops before the second also leaves those divergent bodies in place. That state is
a verified source-level defect and blocks deployment approval.

The broad installer does reinstall 30 unrelated tenant functions. No source-level
downgrade was verified: for those 30 functions, the installed body is the latest
migration-defined body, and no later migration supersedes it. Hosted tenant drift
cannot be checked from the repository.

The audit is complete within its read-only scope. Runtime SQL validation, hosted
schema verification, and genuine concurrency testing were not performed and are
not claimed.

---

## 2. Scope and evidence sources

### 2.1 Authorized scope

Read-only audit and deployment-readiness assessment of:

- `supabase/migrations/20261118120000_bolu_operation_idempotency.sql`
- `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql`
- `scripts/gen-bolu-operation-id-tenant-rpcs.cjs`
- canonical `public._prov_install_tenant_rpcs`
- existing-tenant migration loop
- future-tenant provisioning path
- `docs/reports/bolu-persistence-integrity/remediation.md`

D3, D5, and D6 remain outside scope.

### 2.2 Governance sources read

- root `AGENTS.md`
- `.claude/agent-instructions/core-guardrails.md`
- `.claude/agent-instructions/concurrent-agent-safety.md`
- `.claude/agent-instructions/documentation.md`
- `.claude/agent-instructions/verification-gate.md`
- `supabase/database-workflow.md`
- `docs/PROJECTSKILLINDEX.md`
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`
- `references/query-partial-indexes.md`
- `references/lock-short-transactions.md`
- `references/schema-constraints.md`

### 2.3 Source hashes

| File | SHA-256 | Size |
|------|---------|------|
| `scripts/gen-bolu-operation-id-tenant-rpcs.cjs` | `dc26c98eb88a139eb0c5a1e79da1639a2e6158878ee7e7ba5deb4111a6cc4c57` | 8,525 bytes |
| `20261118120000_bolu_operation_idempotency.sql` | `f9d4a9c1d41f79dc745295ac8953252dc4e47f907027de11cbd175b73bfaddbf` | 33,230 bytes |
| `20261118130000_bolu_tenant_rpc_installer.sql` | `c9e59eff8d30f2bdb6eb35d1b3625ebd674d49161ac48d6b63cc618e14bfd883` | 100,096 bytes |

### 2.4 Git state

Before this audit, Git showed pre-existing work:

- modified: `AGENTS.md`
- modified: `docs/reports/bolu-persistence-integrity/remediation.md`
- untracked: `.perch/`, `.workbuddy-ai/`,
  `docs/integrations/aws-agent-toolkit-setup.md`,
  `scripts/gen-bolu-operation-id-tenant-rpcs.cjs`,
  `src/tests/critical/boluTenantProvisioningIntegrity.test.js`,
  `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql`

No staged or conflicted entries were observed. No pre-existing file was changed by
this audit. The only new task-attributable file is this report.

---

## 3. Canonical installer inventory

### 3.1 Common installation properties

All 32 tenant functions are installed into `__SCHEMA__`, which the installer
replaces with `quote_ident(p_schema_name)`. All are `SECURITY DEFINER` with
`SET search_path TO 'public'`. Bodies are tenant-specific through
`__SCHEMA_TEXT__`/`__SCHEMA__` substitution, while shared helpers such as
`public.has_entity_permission` remain schema-qualified in `public`.

Installation method:

- 32 tenant functions use `CREATE OR REPLACE FUNCTION`.
- One obsolete four-argument invoice overload is removed with
  `DROP FUNCTION IF EXISTS` and no `CASCADE`
  (`20261118130000_bolu_tenant_rpc_installer.sql:36`).
- No `ALTER FUNCTION`, `ALTER OWNER`, or per-function `REVOKE` appears.
- One blanket grant runs at the end:
  `GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO anon, authenticated, service_role`
  (`20261118130000_bolu_tenant_rpc_installer.sql:2800`).

`CREATE OR REPLACE` preserves the owner of an existing function. A newly created
function takes the migration role as owner. Hosted ownership was not inspected.

### 3.2 Installed functions

| # | Function | Argument types | Body status in the corrected installer |
|---|----------|----------------|-----------------------------------------|
| 1 | `save_invoice_with_items_transaction` | `uuid, jsonb, jsonb, text, jsonb` | Corrected to write `operation_id`; canonical body restored |
| 2 | `delete_invoice_with_items_transaction` | `uuid, uuid` | Matches latest migration source |
| 3 | `record_payment_transaction` | `uuid, jsonb` | Matches latest migration source |
| 4 | `record_invoice_created` | `uuid, uuid, text, text, uuid` | Matches latest migration source; hosted overload resolution unverified (D3) |
| 5 | `record_invoice_status_changed` | `uuid, text, text, uuid, text, text, text, uuid` | Matches latest migration source |
| 6 | `record_payment_voided` | `uuid, uuid, numeric, uuid, text, text, text, uuid` | Matches latest migration source |
| 7 | `record_payment_attachment_uploaded` | `uuid, uuid, text, bigint, uuid, text, uuid` | Matches latest migration source |
| 8 | `record_waybill_created` | `uuid, uuid, text, text, text, uuid` | Matches latest migration source |
| 9 | `record_waybill_status_changed` | `uuid, text, text, uuid, text, text, text, uuid` | Matches latest migration source |
| 10 | `record_csr_created` | `uuid, uuid, text, text, text, uuid` | Matches latest migration source |
| 11 | `record_csr_status_changed` | `uuid, text, text, uuid, text, text, text, uuid` | Matches latest migration source |
| 12 | `record_csr_linked` | `uuid, uuid, uuid, text, text, text, uuid` | Matches latest migration source |
| 13 | `record_quotation_created` | `uuid, uuid, text, text` | Matches latest migration source |
| 14 | `record_quotation_status_changed` | `uuid, text, text, uuid, text, text, text` | Matches latest migration source |
| 15 | `record_quotation_linked` | `uuid, uuid, uuid, uuid, text, text, text` | Matches latest migration source |
| 16 | `record_project_updated` | `uuid, uuid, text, text, text, jsonb` | Matches latest migration source |
| 17 | `record_project_note_added` | `uuid, uuid, text, text, text, jsonb` | Matches latest migration source |
| 18 | `record_project_document_added` | `uuid, uuid, text, text, text, jsonb` | Matches latest migration source |
| 19 | `record_project_linked_activity` | `uuid, text, uuid, text, uuid, text, text, text` | Matches latest migration source |
| 20 | `record_letter_created` | `uuid, uuid, text, text, text` | Matches latest migration source |
| 21 | `record_letter_updated` | `uuid, uuid, text, text, text` | Matches latest migration source |
| 22 | `record_letter_status_changed` | `uuid, text, text, uuid, text, text, text` | Matches latest migration source |
| 23 | `record_letter_duplicated` | `uuid, uuid, uuid, text, text, text` | Matches latest migration source |
| 24 | `record_letter_archived` | `uuid, uuid, text, text, text` | Matches latest migration source |
| 25 | `record_audit_log` | `text, uuid, text, text, jsonb, jsonb, uuid, text, text, text, text` | Matches latest migration source; 11-argument signature preserved |
| 26 | `record_activity_event` | `text, uuid, text, text, uuid, text, text, text, jsonb, text, integer` | Matches latest migration source |
| 27 | `revert_invoice_to_quotation_transaction` | `uuid, jsonb, jsonb, uuid` | Matches canonical tenant install from `20260905000000` |
| 28 | `record_cps_audit_event` | `uuid, text, text, jsonb, uuid, text, text, text` | Matches latest migration source |
| 29 | `apply_cps_item_feedback_transaction` | `uuid, jsonb` | Matches latest migration source |
| 30 | `save_quotation_with_items_transaction` | `uuid, jsonb, jsonb, text, jsonb` | Corrected to write `operation_id`; canonical body restored |
| 31 | `save_purchase_order_with_items_transaction` | `uuid, jsonb, jsonb, text, timestamptz` | Matches latest migration source |
| 32 | `transition_purchase_order_status` | `uuid, uuid, text, timestamptz` | Matches latest migration source |

The installer function itself,
`public._prov_install_tenant_rpcs(p_schema_name text)`, is replaced with
`CREATE OR REPLACE FUNCTION` in `public`. It is shared provisioning infrastructure,
not a tenant-local RPC.

---

## 4. Installer blast-radius findings

### 4.1 Verified behaviour

The existing-tenant loop calls the broad installer:

`20261118130000_bolu_tenant_rpc_installer.sql:2832`

```sql
PERFORM public._prov_install_tenant_rpcs(v_schema.schemaname);
```

For each selected schema, this call reinstalls all 32 tenant functions listed in
§3 and regrants execution on all routines in that schema. It is not limited to the
invoice and quotation save RPCs.

### 4.2 Migration-history comparison

A source scan compared every installed function against every later migration
file after `20261106230000_tenant_rpc_purchase_order_transaction.sql`.

Results:

- Only `save_invoice_with_items_transaction` and
  `save_quotation_with_items_transaction` were redefined after
  `20261106230000`, in `20261118120000`.
- `20261118130000` restores the canonical bodies for those two functions.
- No later migration redefines any of the other 30 tenant functions.
- The corrected installer body is source-equivalent to the prior canonical
  installer plus four authorized `operation_id` edits.

Therefore, no unrelated RPC is downgraded relative to migration history. The
broad reinstall is still a blast radius: any hosted drift or manual change in a
tenant schema would be overwritten by the installer body.

### 4.3 Concrete verified differences

The differences found are between `20261118120000` and the canonical installer,
not between the canonical installer and later unrelated migrations.

| Area | `20261118120000` direct body | Canonical body in `20261118130000` |
|------|------------------------------|------------------------------------|
| Invoice response | `{ invoice, item_count }` at line 519 | `{ id, invoice, items_saved }` at lines 312–314 |
| Quotation response | `{ quotation, item_count }` at line 740 | `{ id, quotation, items_saved }` at lines 2373–2375 |
| CPS feedback | `p_cps_feedback` is accepted but never used | Invoice lines 299–301 and quotation lines 2358–2362 call `apply_cps_item_feedback_transaction` |
| Item lineage | Invoice item INSERT at lines 391–422 omits `source_cps_id` and `source_cps_row_id` | Invoice item INSERT at lines 248–286 writes those lineage columns |
| Function-source comment | Lines 269–278 say the canonical installer is updated, but the block directly recreates only two RPCs | The installer is actually updated in `20261118130000` |

The canonical response shape is also the documented contract in
`docs/reports/cost-pricing-sheet/2026-10-06-cps-phase-3-5-quotation-transactional-parity.md`.
The direct bodies in `20261118120000` are divergent.

### 4.4 Grants

The blanket grant is an established repository convention. It appears in
`20260902120000_postgrest_schema_grants.sql` and in prior installer migrations.
No tenant-schema `REVOKE` that contradicts it was found in later migrations. Its
hosted effect cannot be confirmed without a database.

---

## 5. Existing-tenant migration analysis

### 5.1 Schema selection

`20261118120000` uses:

```sql
WHERE schema_name LIKE 'entity_%'
```

In SQL `LIKE`, `_` is a wildcard, so this pattern can match a schema such as
`entityXfoo`. `20261118130000` uses `n.nspname LIKE 'entity\_%'`, which escapes
the underscore and matches the intended `entity_` prefix only.

This is a verified source-level guard mismatch. Actual impact depends on the
hosted schema list, which was not inspected.

### 5.2 Guards in `20261118130000`

The backfill loop requires:

- `activity_events`
- `audit_logs`
- `invoices`
- `invoice_items`
- `quotations`
- `quotation_items`
- `cps_sheets`
- `cps_rows`
- an `invoices.operation_id` column

It does not check:

- tenant status (`ready`, `creating`, `failed`);
- `quotations.operation_id`;
- all other tables or columns referenced by the 32 installed functions.

A schema with `invoices`, `quotations`, and `operation_id` but without one of the
eight required tables is upgraded by `20261118120000` and skipped by
`20261118130000`. That schema keeps the divergent direct RPC bodies. No hosted
evidence was available to show that such a schema exists.

### 5.3 Partial completion and recovery

- Each migration file is expected to run in one Supabase CLI transaction. This is
  a source-level expectation, not a runtime observation.
- Within `20261118130000`, there is no per-tenant exception handler and no
  `COMMIT`. One failing schema aborts the whole `DO` block, so installer changes
  in that migration roll back together.
- Across migration files, partial completion is possible. If `20261118120000`
  succeeds and `20261118130000` fails, the first migration remains applied and
  tenants keep the divergent bodies until the second migration is fixed and
  applied.
- Rerunning `20261118130000` is structurally safe: `CREATE OR REPLACE`, existence
  guards, and no destructive drops.
- Rerunning the pair reintroduces the divergent bodies in `20261118120000` and
  then restores canonical bodies in `20261118130000`, provided the schema passes
  the second loop guard.

No advisory lock is taken by either migration. The DDL can hold locks on tenant
objects for the duration of the migration transaction. Runtime lock behaviour was
not tested.

---

## 6. Future-tenant provisioning analysis

Future tenants follow this path:

1. `tenant_master_template` receives `operation_id` columns and partial unique
   indexes from `20261118120000`.
2. `_prov_clone_table` copies template tables with
   `CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)` in
   `20260717000000_entity_provisioning_engine.sql:239`.
3. `public.provision_entity` calls `_prov_install_tenant_rpcs(v_schema_name)` at
   step 12 in `20261014100000_document_search_platform.sql:432`.
4. Status is set to `ready` at line 447 only after that call.
5. The exception handler sets `failed` at line 457 if installation raises.

No later migration after `20261118130000` redefines the installer or overwrites
the save RPCs.

The future-tenant path therefore receives the corrected canonical RPCs once both
migrations are applied. Hosted provisioning was not executed or observed.

---

## 7. Generator integrity analysis

`scripts/gen-bolu-operation-id-tenant-rpcs.cjs`:

- reads `supabase/migrations/20261106230000_tenant_rpc_purchase_order_transaction.sql`;
- extracts only the `_prov_install_tenant_rpcs` block;
- applies exactly four edits: two INSERT column lists and two `USING` tails;
- adds a fixed header and a guarded existing-tenant backfill footer;
- writes `20261118130000_bolu_tenant_rpc_installer.sql`.

Safety findings:

- Every edit uses a unique-anchor assertion. A missing or ambiguous anchor raises
  an error before writing.
- The invoice anchors include the INSERT `VALUES` list and create-branch
  `COALESCE(..., 0)` expressions. The update branch uses different expressions.
  An accidental update-branch edit is therefore blocked by the anchor check.
- The generator has no timestamps, random values, or environment-dependent
  output. Static inspection supports deterministic output for unchanged input.
- The generator was not run during this audit.
- The generator trusts `20261106230000` as the source of truth. It does not verify
  that every embedded function is the latest intended definition. This limitation
  is mitigated by the migration-history scan in §4.2, but it remains a maintenance
  risk.

The generator follows the repository convention used by the
`scripts/gen-cps-phase*.cjs` scripts.

---

## 8. Invoice and quotation RPC integrity

### 8.1 Corrected canonical definitions

| Check | Invoice | Quotation |
|-------|---------|-----------|
| Signature | `(uuid, jsonb, jsonb, text, jsonb)` | `(uuid, jsonb, jsonb, text, jsonb)` |
| INSERT columns | 26 | 23 |
| Placeholders | `$1`…`$26` | `$1`…`$23` |
| `USING` arguments | 26 | 23 |
| Final column | `operation_id` | `operation_id` |
| Final argument | `NULLIF(p_invoice_payload->>'operation_id', '')` | `NULLIF(p_quotation_payload->>'operation_id', '')` |
| Empty string | maps to SQL `NULL` | maps to SQL `NULL` |
| UPDATE mode | preserves `operation_id` | preserves `operation_id` |
| Permission gate | `has_entity_permission(..., 'invoice', create/edit)` | `has_entity_permission(..., 'quotation', create/edit)` |
| Response | `{ id, invoice, items_saved }` | `{ id, quotation, items_saved }` |
| Privileges | `SECURITY DEFINER`, `search_path public`, tenant schema grant-all | same |

These definitions are internally aligned. They match the application payloads in
`src/lib/ai-assistant/bolu-document-service.ts`, which include `operation_id` for
both families, and the application tolerates the canonical response shape.

### 8.2 Partial indexes

`20261118120000` creates partial unique indexes on `operation_id` with
`WHERE operation_id IS NOT NULL` in the template and eligible tenant schemas.
A document without `operation_id` stores SQL `NULL`, which is outside the index.
Non-Bolu documents can therefore continue to persist without an operation ID.

### 8.3 Divergent direct definitions

The direct RPC bodies in `20261118120000` accept the same signature and write
`operation_id`, but they do not match the canonical payload lineage, feedback
handling, or response contract. See §4.3.

---

## 9. SQL and transaction safety

Static checks performed with Bun-only read-only scripts:

| Check | `20261118120000` | `20261118130000` |
|-------|------------------|------------------|
| Distinct dollar-quote tags | 6, all paired | 37, all paired |
| `DO` / `END tag` | 2 / 2 | 1 / 1 |
| Advisory locks | 0 | 0 |
| `EXCEPTION WHEN` | 1 (per-row invoice cast) | 1 (backfill installer call in generator) |
| `CASCADE` | absent | absent |
| Dynamic identifiers | `%I` and `quote_ident` used | `%I` and `quote_ident` used |
| Literal interpolation | `%L` used for text value | `%L` used in footer guards |
| `search_path` | functions set `public` | installer and all functions set `public` |
| `NOTIFY pgrst` | present | present |

Observations:

- Dynamic SQL is schema-qualified and identifier-escaped.
- The invoice backfill isolates invalid JSON per row.
- The duplicate pre-check raises an exception before index creation.
- No runtime SQL parse, DDL execution, or concurrency test was performed.

---

## 10. Test-baseline comparison

The prior report stated four critical-suite failures but described two of them as
`dashboardThemeExperiment.test.js ×2`. Inspection of the saved run output and
current test files identifies the four tests more precisely:

| File | Test | Failure reason |
|------|------|----------------|
| `src/tests/critical/dashboardThemeExperiment.test.js:398` | `every stylesheet selector in the experiment stays scoped` | `assert.ok(css)` failed; `PREVIEW_CSS` not found |
| `src/tests/critical/documentShareSecurity.test.js:99` | `SECURITY: Client inverts upload order to insert share record first and rollback on failure` | `assert.ok(insertIndex > 0)` failed with `Must insert document_shares` |
| `src/tests/critical/invoiceThemeExperiment.test.js:371` | `experimental styling stays scoped to the experiment root` | `assert.ok(css)` failed; `PREVIEW_CSS` not found |
| `src/tests/critical/photoHeroV2LightMode.test.js:200` | `original HTML reference remains untouched` | SHA-256 mismatch against the pinned expected hash |

The saved run reported 1,660 tests, 1,656 pass, 4 fail. None of these files was
modified by the Bolu work recorded in Git status. They are unrelated to the two
SQL files under audit.

No test suite was rerun in this audit. No test or application file was modified.
The prior report's file attribution for the second scoping failure is inaccurate;
this audit corrects it.

---

## 11. Deployment prerequisites and blockers

| Prerequisite | Required evidence | Current assessment |
|--------------|-------------------|--------------------|
| Existing tenant upgrade | Correct final RPC definitions after migration | **Blocked** by verified divergence in `20261118120000`; final state depends on `20261118130000` guard |
| Future tenant provisioning | Correct RPCs installed by normal provisioning path | Source path verified; hosted provisioning not observed |
| Installer blast radius | No unrelated RPC regression | Source history verified; no unrelated downgrade found. Hosted drift unverified |
| Schema/index availability | Correct columns and partial unique indexes | Source verified; hosted state unverified |
| Migration syntax | Static and, where available, runtime validation | Static check done; runtime validation not performed |
| Migration transaction safety | Failure and recovery behaviour understood | Source reasoning documented; runtime rollback not observed |
| Idempotency | Operation ID uniqueness enforced at database level | Source verified; DB enforcement not executed |
| Concurrency | Genuine database test or explicitly unverified | Unverified |
| Production deployment | Not performed by this task | Not performed |

---

## 12. Findings, severity, and classification

| Class | Finding | Evidence | Severity | Impact | Blocks deployment? | Verified? | Smallest safe remediation |
|-------|---------|----------|----------|--------|--------------------|-----------|---------------------------|
| OBSERVATION | `20261118120000` installs divergent invoice and quotation RPC bodies | Lines 303–523, 525–740; §4.3 | HIGH | Existing tenants can retain noncanonical feedback, lineage, and response contract if the second migration skips them | YES | Verified in source | Remove the direct RPC recreation from `20261118120000` and rely on `20261118130000` as the single installer, or make the bodies byte-identical to the canonical corrected bodies |
| OBSERVATION | `20261118130000` guard is narrower than the first migration's schema pattern and checks fewer columns | `entity\_%` at line 2813; eight table checks; line 2812–2829 vs `entity_%` in `20261118120000` | MEDIUM | A nonstandard or partially provisioned schema can be upgraded once and skipped later | YES | Source verified; hosted occurrence uncertain | Align schema matching and require every table and both `operation_id` columns needed by the installer |
| OBSERVATION | Broad installer reinstalls 30 unrelated tenant functions and regrants all routines | §3 and §4.1 | MEDIUM | Any hosted drift in tenant routines would be overwritten | NO, if hosted schema is known clean | Verified source behaviour; hosted drift unverified | Keep canonical installer as source of truth; verify hosted schema before deployment |
| OBSERVATION | No unrelated source-level downgrade found | Migration-history scan in §4.2 | LOW | None verified | NO | Verified in source | None |
| OBSERVATION | Generator trusts an old installer source without proving every embedded body is current | Generator lines 16–26 | MEDIUM | Future source changes can be copied silently if anchors remain unique | NO for this deployment | Verified in source | Add a generation-time comparison against the known latest function definitions |
| OBSERVATION | Prior report misattributes one scoping failure to `dashboardThemeExperiment.test.js` | §10 | LOW | Reporting accuracy only | NO | Verified in source and saved run output | Correct the report if that report is later updated |
| OBSERVATION | Runtime SQL, hosted schema, and concurrency checks were not performed | §2 and §9 | MEDIUM | Production readiness cannot be claimed | YES for a deployment-ready designation | Verified limitation | Run migrations in an authorized non-production PostgreSQL environment |
| REFERENCE | Partial indexes exclude `NULL` operation IDs | Supabase partial-index reference; `WHERE operation_id IS NOT NULL` | INFO | Non-Bolu documents remain compatible | NO | Verified from reference and source | None |
| REFERENCE | Migration DDL is transactional in the established Supabase workflow | `supabase/database-workflow.md`; migration comments | INFO | Failure should roll back a migration file | NO for source audit | Documented, not runtime verified | Confirm during non-prod deployment |
| PROPOSAL | Treat `20261118120000` and `20261118130000` as one deployment unit | §5.3 | HIGH | Prevents a half-applied state | YES until agreed | Proposed | Do not deploy the first migration alone |
| DECISION | This audit is read-only and does not authorize implementation or deployment | User scope and root `AGENTS.md` | INFO | No files except this report were created | NO | Verified | None |

---

## 13. Recommended next action

Do not deploy the current migration pair.

Smallest safe correction:

1. Remove the two direct RPC recreation blocks from `20261118120000`, leaving it
   responsible only for columns, indexes, backfill, duplicate detection, and
   cache reload.
2. Keep `20261118130000` as the single canonical installer update for both
   existing and future tenants.
3. Align the `20261118130000` guard with the first migration's actual schema
   population. Require all tables and both `operation_id` columns needed by the
   installer.
4. After correction, run both migrations in an authorized non-production
   PostgreSQL environment. Verify function definitions and grants for at least
   one tenant before considering production deployment.
5. Keep the production connection out of this verification path unless separately
   authorized.

This preserves the canonical source-of-truth requirement. It does not create a
second installer or a bypassable provisioning hook.

---

## 14. Explicit limitations

- No local PostgreSQL or `psql` execution was performed.
- No `supabase db push`, `db diff`, `db shell`, or `db dump` was run.
- No hosted production connection was opened.
- No hosted tenant schema list or live function definitions were inspected.
- No concurrent duplicate-operation test was performed.
- No tenant provisioning run was performed.
- No generator was executed.
- No application, SQL, script, test, or existing report file was modified.
- `bun run build` was not run.

---

## 15. Verification

- `git status`: captured before and preserved; this report is the only new file.
- `bun run audit:load`: not run in this audit; read-only documentation task.
- `bun run typecheck`: not run in this audit; no code changed.
- Test suites: not rerun; prior saved results and current source identity inspected.
- `supabase db push`: not applicable; deployment is not authorized.
- `bun run build`: skipped by repository hardware policy and task scope.

---

## 16. Files changed

None. This report is the only task-attributable file created.

---

## 17. Final status

COMPLETED

## 18. Deployment recommendation

NOT READY FOR DEPLOYMENT
