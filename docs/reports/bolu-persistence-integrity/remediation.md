# Bolu Persistence Integrity Remediation

**Date:** 2026-11-18 (updated after tenant provisioning/RPC installation review)
**Audit Reference:** `docs/Reports/ai-BOLU/bolu-persistence-integrityverification-audit.md`
**Original scope:** D1, D2, D4 implementation; D3 investigation only
**Excluded:** D5, D6
**Additional bounded scope:** tenant provisioning and canonical RPC installer integrity for D2 idempotency

---

## 1. Objective and boundary

The additional request was to resolve the inconsistency between:

- existing tenants, which received `operation_id` columns, partial unique indexes,
  and directly recreated save RPCs from
  `supabase/migrations/20261118120000_bolu_operation_idempotency.sql`; and
- future tenants, which inherit the columns and indexes from
  `tenant_master_template` but were still receiving save RPC bodies from the
  canonical `_prov_install_tenant_rpcs` installer that did not write
  `operation_id`.

The required outcome is that every applicable tenant—existing and future—receives
compatible invoice and quotation persistence RPCs that write `operation_id` and
therefore exercise database-enforced idempotency.

Governance observed:

- root `AGENTS.md`, relevant subordinate instructions, and
  `docs/PROJECTSKILLINDEX.md` were reviewed;
- only repository-supported extension points were used;
- legacy `BIGDROPS` identifiers were preserved;
- Bun was used for verification commands;
- no `bun run build` was run;
- no Git staging, stash, reset, checkout, clean, commit, push, or destructive
  operation was performed;
- production was not used as a test database;
- no migration was deployed or applied to any database environment.

---

## 2. Defect verification before any change

The defect was confirmed from source before implementation:

| Evidence | Finding |
|----------|---------|
| `20261106230000_tenant_rpc_purchase_order_transaction.sql` | Latest authoritative `public._prov_install_tenant_rpcs(p_schema_name text)` install body before this work. Its invoice INSERT had 25 columns; its quotation INSERT had 22 columns. Neither included `operation_id`. |
| Same installer | No `operation_id` reference existed anywhere in the canonical installer block. |
| `20261118120000_bolu_operation_idempotency.sql` | Directly recreated invoice/quotation RPCs for existing `entity_%` schemas with `operation_id`, but did not update the canonical installer and did not call it. |
| `20261014100000_document_search_platform.sql` | `public.provision_entity` clones template tables, then calls `_prov_install_tenant_rpcs(v_schema_name)` at step 12, before status is set to `ready`. No later step overwrites the save RPCs. |
| `20260717000000_entity_provisioning_engine.sql` | `_prov_clone_table` uses `CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)`, so template columns and indexes are inherited by future tenants. |
| Migration filename scan | `20261106230000_...` was the last installer definition before the new correction; no later migration supplied a competing corrected installer. |

Conclusion: the reported gap was real. Existing tenants were inconsistent with
future tenants because the durable uniqueness infrastructure was not matched by
the canonical write path for newly provisioned tenants.

---

## 3. Architecture review and decision

Options considered:

| Option | Assessment |
|--------|------------|
| Direct canonical installer update | Smallest safe change. Preserves one source of truth. Future tenants and all existing backfill loops receive the same corrected RPC definitions. |
| Scoped second installer plus hook | Rejected. Creates a competing source of truth and a bypassable path. |
| Post-clone hook only | Rejected. Provisioning already calls the canonical installer after cloning; a hook would duplicate that responsibility and could be skipped. |
| New extension point | Rejected. No repository-supported need; would be an unrelated provisioning refactor. |

**DECISION:** regenerate and forward-apply the canonical installer. No parallel
installer, no unrelated RPC changes, no authorization or permission changes, and
no provisioning-engine rewrite were introduced.

This follows the repository's established generator-script convention for large
installer migrations: read the prior authoritative installer, apply surgical
edits, assert unique anchors, and write a forward migration.

---

## 4. Files changed or added

| File | Change |
|------|--------|
| `scripts/gen-bolu-operation-id-tenant-rpcs.cjs` | Added. Regenerates the canonical installer from `20261106230000` with exactly four surgical edits and contract probes. |
| `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql` | Added. Regenerated canonical installer plus an existing-tenant backfill loop and `NOTIFY pgrst, 'reload schema'`. |
| `src/tests/critical/boluTenantProvisioningIntegrity.test.js` | Added. Installer, lifecycle, existing-tenant, negative, and behavioural payload tests. |
| `docs/reports/bolu-persistence-integrity/remediation.md` | This report was updated. |

No existing migration was edited in place. No existing application source file
required another change for this task; the application payloads already included
`operation_id` for both families and were verified behaviourally.

---

## 5. Canonical installer correction

`20261118130000_bolu_tenant_rpc_installer.sql` recreates
`public._prov_install_tenant_rpcs(p_schema_name text)` from the prior authoritative
installer with only these four changes:

1. Invoice INSERT column list gains `operation_id` as column 26.
2. Invoice `USING` tail gains
   `NULLIF(p_invoice_payload->>'operation_id', '')` as argument 26.
3. Quotation INSERT column list gains `operation_id` as column 23.
4. Quotation `USING` tail gains
   `NULLIF(p_quotation_payload->>'operation_id', '')` as argument 23.

Verified alignments:

| RPC | Columns | Placeholders | `USING` arguments | Final argument |
|-----|---------|--------------|-------------------|----------------|
| `save_invoice_with_items_transaction` | 26 | `$1`…`$26` in order | 26 | `NULLIF(p_invoice_payload->>'operation_id', '')` |
| `save_quotation_with_items_transaction` | 23 | `$1`…`$23` in order | 23 | `NULLIF(p_quotation_payload->>'operation_id', '')` |

A source-equivalence test proves the regenerated installer body is exactly the
prior installer body plus the four authorized edits. Function signatures,
grants, permissions, item handling, feedback handling, update-mode bodies, and
all unrelated RPCs are unchanged. The obsolete four-argument invoice overload
removal is preserved, and `CASCADE` does not appear in the generated migration.

`NULLIF(..., '')` maps both a missing payload key and an empty string to SQL
`NULL`, so ordinary non-Bolu documents without an operation ID remain compatible
and stay outside the partial unique indexes.

Update mode does not reassign `operation_id`; the idempotency key is written only
on create.

---

## 6. Existing-tenant and future-tenant paths

### 6.1 Existing tenants

The new migration ends with a guarded backfill loop that calls the corrected
canonical installer for fully provisioned `entity_%` schemas only. A schema is
eligible only when all of the following exist:

- `activity_events`, `audit_logs`, `invoices`, `invoice_items`, `quotations`,
  `quotation_items`, `cps_sheets`, and `cps_rows`;
- an `invoices.operation_id` column, added by `20261118120000`.

Failed or in-progress schemas, and schemas not yet migrated to the new column,
are skipped rather than partially reinstalled.

### 6.2 Future tenants

The lifecycle remains unchanged and now resolves the gap:

1. `tenant_master_template` contains `operation_id` columns and partial unique
   indexes from `20261118120000`.
2. `_prov_clone_table` copies them via `LIKE ... INCLUDING ALL`.
3. `provision_entity` calls `_prov_install_tenant_rpcs(v_schema_name)` at step 12.
4. The corrected installer writes `operation_id` from the Bolu payload.
5. Status is set to `ready` only after installation; any exception sets `failed`
   and cleans up.

No later provisioning step reinstalls stale save RPC bodies.

### 6.3 Migration ordering and compatibility

`20261118120000` sorts before `20261118130000`, so columns and indexes exist
before the installer backfill runs. The correction is forward-only and does not
mutate applied migration files. No columns or indexes are dropped. The existing
document-number uniqueness indexes are untouched.

---

## 7. D1, D2, D4 outcomes retained

| Defect | Outcome |
|--------|---------|
| D1 | Fixed. Invoice replay lookup uses `.eq('operation_id', opId)` against the dedicated column, not the type-invalid `custom_fields->>operation_id` filter. |
| D2 | Source complete. Dedicated nullable columns, partial unique indexes, payload writes in application and RPCs, exact constraint-based 23505 classification, and verified replay retrieval. Genuine concurrent database behaviour remains unverified. |
| D4 | Fixed. `fetchDocumentPrefixesSafe` distinguishes valid configured prefixes, valid absence, and malformed/error states. Malformed settings abort before number allocation or insertion. |
| D3 | Investigation only. Unresolved pending hosted PostgREST verification; no audit functions or callers changed. |

### D2 replay classification

PostgREST errors were verified to expose `message`, `details`, `hint`, and
`code`, with no typed `constraint` property. `isOperationIdConflict` therefore
requires `code === '23505'` plus an exact whole-identifier match of the relevant
constraint name, explicitly rejects the other family's constraint, and permits a
narrow fallback only for `Key (operation_id)=` details when no named constraint
is present.

A replay is reported as successful only when a ready tenant client with a
concrete schema returns a row from the correct family table carrying the exact
expected `operation_id`. Otherwise the operation returns a failure rather than a
false success.

### Historical backfill safety

Invoice `custom_fields` is `text`. The backfill uses a per-row PL/pgSQL loop,
isolates the `::jsonb` cast in a per-row exception handler, checks
`jsonb_typeof`, accepts only non-empty string operation IDs, and never overwrites
an existing dedicated value. Invalid JSON, non-object JSON, arrays, scalars,
empty values, and whitespace-only values are skipped and counted with
`RAISE NOTICE`. Quotation backfill follows the same non-empty-string rule.

---

## 8. Tests added

`src/tests/critical/boluTenantProvisioningIntegrity.test.js` contains 14 tests:

- installer is the last canonical installer definition;
- regenerated body differs from the prior installer only by the four authorized
  edits;
- generator retains unique-anchor, probe, and no-`CASCADE` guards;
- invoice and quotation INSERT alignment;
- update mode does not reassign `operation_id`;
- template cloning uses `INCLUDING ALL`;
- `provision_entity` installs RPCs after cloning and before `ready`;
- failed provisioning sets `failed`, not `ready`;
- existing-tenant backfill reuses the same installer and skips incomplete
  schemas;
- unrelated and cross-family 23505 errors are not replays;
- absent `operation_id` remains outside the partial unique index;
- failed prefix reads abort before the save RPC;
- behavioural invoice payload contains `operation_id`;
- behavioural quotation payload contains `operation_id`.

Source-pattern checks are used only where a database lifecycle does not exist
locally. Behavioural tests with mocked tenant clients cover the actual
application-to-RPC payload contract.

---

## 9. Verification evidence

Environment: local Windows host, Bun 1.3.14, no local PostgreSQL/`psql`, no
authorized non-production database.

| Command / check | Result |
|-----------------|--------|
| `bun run audit:load` | Exit 0. Pre-existing warnings only: 1,123 files scanned, 57 oversized files, 8 broad selects, 1 component fetch, 4 heavy limits. No new finding from this task. |
| `bun run typecheck` | Exit 0, no TypeScript errors. |
| `bun test src/tests/critical/boluTenantProvisioningIntegrity.test.js` | 14 pass, 0 fail. |
| `bun test` on the two existing Bolu suites plus the new suite | 84 pass, 0 fail. |
| `bun test src/tests/critical` | 1,660 tests, 1,656 pass, 4 fail. The four failures are the known pre-existing baseline: two stylesheet scoping tests, the document-share upload-order test, and the original-HTML-reference test. No new failure was introduced. |
| `bun run build` | Not run, per authorization boundary. |

---

## 10. Deployment and verification states

These states are deliberately kept separate:

| State | Result |
|-------|--------|
| Source changes prepared | YES |
| Local SQL syntax execution validation | NO — no local PostgreSQL or `psql` |
| Migration applied locally | NO |
| Migration applied to non-production | NO |
| Deployed to production | NO |
| Hosted existing-tenant RPC installation verified | NO |
| Hosted future-tenant provisioning verified | NO |
| Genuine concurrent duplicate-operation test | NO |
| Production used as a test database | NO |

No `supabase db push`, hosted SQL execution, or production mutation was
performed. Backfill counts, live DDL behaviour, and hosted PostgREST resolution
remain unknown until an authorized environment applies the migrations.

---

## 11. Migration rerun and partial-failure safety

- Column and index creation in `20261118120000` uses existence guards.
- The new installer migration uses `CREATE OR REPLACE FUNCTION`; rerunning it
  reinstalls the same definitions rather than creating competing overloads.
- The backfill loop checks required tables and the `operation_id` column before
  calling the installer.
- No destructive `DROP ... CASCADE` or data-deletion path was added.
- Under Supabase's migration transaction semantics, a failure rolls back the
  migration's DDL and installer reinstall together. This is a source-level
  expectation, not a live-tested result.
- The provisioning engine's existing exception handler sets tenant status to
  `failed`; the corrected installer does not bypass that path.

---

## 12. Remaining risks and unavailable checks

1. No live SQL execution check was possible.
2. Genuine concurrent duplicate-operation requests for invoice and quotation
   were not executed; the database mechanism and application retry path are
   source/unit verified only.
3. Hosted existing-tenant backfill behaviour was not observed.
4. Hosted future-tenant provisioning was not observed.
5. D3 remains unresolved pending hosted PostgREST overload verification.
6. D5 and D6 remain excluded.
7. Four unrelated critical-suite failures remain at the pre-existing baseline.
8. Manual save paths still receive prefixes from React state; no
   `useSettings()` refactor was authorized.

---

## 13. Git state preservation

At the start of this continuation, the tracked tree was clean. Pre-existing
untracked entries `.perch/` and `.workbuddy-ai/` were left untouched. Work added
by this task consists of the generator, generated migration, new test file, and
this updated report. No staged, conflicted, or unrelated tracked work was
altered. No Git destructive operation, staging operation, commit, or push was
performed.

---

## 14. Finding classification

| Class | Finding |
|-------|---------|
| OBSERVATION | The prior canonical installer lacked `operation_id` in both save RPCs, while `20261118120000` had already added columns/indexes and directly updated existing tenant RPCs. |
| OBSERVATION | `_prov_clone_table` copies indexes with `INCLUDING ALL`, and `provision_entity` calls the canonical installer before marking a tenant ready. |
| OBSERVATION | No local or non-production database exists in this environment; hosted existing- and future-tenant verification could not be performed. |
| REFERENCE | Repository installer migrations use generator scripts with unique-anchor assertions and forward migrations. |
| REFERENCE | PostgREST error shape was verified from the installed `@supabase/postgrest-js` source; no typed constraint field exists. |
| PROPOSAL | Regenerate the canonical installer with four surgical edits, add a guarded existing-tenant backfill, and rely on the existing provisioning call path for future tenants. |
| DECISION | The proposal was implemented. No second installer, post-clone hook, unrelated RPC change, authorization change, or provisioning refactor was introduced. |
| DECISION | Migration changes are source-prepared only; no deployment, hosted verification, or production test was attempted. |
| OBSERVATION | All targeted tests pass and the full critical suite retains exactly the four pre-existing failures. |

---

## 15. Divergent migration pair correction

This section records the focused follow-up that corrected the deployment blocker
reported in `deployment-readiness-audit.md`.

### 15.1 Original defect

`20261118120000_bolu_operation_idempotency.sql` directly recreated simplified
invoice and quotation save RPCs. Those bodies added `operation_id`, but omitted
CPS feedback processing, CPS item lineage, and the canonical response shape.
`20261118130000_bolu_tenant_rpc_installer.sql` then reinstalled canonical bodies
only for schemas that passed its guard. A tenant skipped by that guard could
retain a degraded save implementation.

### 15.2 Migration immutability decision

Evidence showed that the Bolu migration commit `501fdd59` is local-only:

- `HEAD` is ahead of `origin/main` by 11 commits.
- `git merge-base --is-ancestor 501fdd59 origin/main` returned exit code 1.
- No `supabase/.temp/` evidence showed that the pair had been applied.
- No push, deployment, or hosted mutation was performed.

DECISION: in-place correction of the unapplied migration pair is appropriate. No
new forward migration was created. If another environment already applied the
earlier file content, a forward-only correction would be required there before
deployment.

### 15.3 Final migration responsibilities

Migration A — `20261118120000_bolu_operation_idempotency.sql`:

- Adds `operation_id` columns and partial unique indexes in the template and
  active tenant schemas.
- Backfills valid historical operation IDs with per-row JSON parsing.
- Detects duplicates before index creation.
- Preserves malformed or unrelated `custom_fields`.
- Does not define, replace, or drop any tenant RPC.

Migration B — `20261118130000_bolu_tenant_rpc_installer.sql`:

- Replaces `public._prov_install_tenant_rpcs` with the canonical installer plus
  four authorized `operation_id` edits.
- Installs canonical invoice and quotation save RPCs for eligible active tenants.
- Remains the single installer used by future tenant provisioning.
- Keeps empty or absent payload operation IDs mapped to SQL `NULL` through
  `NULLIF(payload->>'operation_id', '')`.

Final source hashes:

| File | SHA-256 | Bytes |
|------|---------|-------|
| Migration A | `8e628c8d28050f5a93cd6d1dc8b2d51e9518049af8881240b92181ced92e30e4` | 11,528 |
| Migration B | `846ade43033b4a01c87d01fea0a204f1819568cd3245f052d1c14ed60ea26e99` | 103,304 |
| Generator | `4a243ea1e37cb3e6b4749bcf4dfd262cc4621042c8e50a7bc6a378764af2d0e0` | 12,085 |

### 15.4 Canonical behaviour retained

Both save RPCs retain:

- The five-argument signature
  `(uuid, jsonb, jsonb, text, jsonb)`.
- Create and update branches, with no `operation_id` reassignment on update.
- Tenant permission checks for create and edit.
- Existing field mappings, taxes, discounts, WHT, totals, and amount-in-words.
- CPS feedback through `apply_cps_item_feedback_transaction`.
- CPS item lineage through `source_cps_id` and `source_cps_row_id`.
- Canonical responses: `{ id, invoice, items_saved }` and
  `{ id, quotation, items_saved }`.
- `SECURITY DEFINER`, `SET search_path TO 'public'`, and the existing grant.

Operation ID support is additive. Documents created outside Bolu still store
`NULL`, which is outside the partial unique indexes.

### 15.5 Existing-tenant eligibility and failure handling

Both migrations now derive schemas from `public.entities` with
`public._prov_get_schema_name(e.id)` and use the escaped `entity\_%` pattern.
No migration scans `pg_namespace` by name.

A missing provisioning-status row is treated as legacy `ready`. Known non-ready
statuses are skipped with a notice and left to the normal provisioning path.

Migration B checks each active tenant for the real installer dependencies:

- 16 required tenant relations: `activity_events`, `audit_logs`, `cps_rows`,
  `cps_sheets`, `csrs`, `invoice_items`, `invoices`, `letters`, `payments`,
  `projects`, `purchase_order_items`, `purchase_orders`, `quotation_items`,
  `quotations`, `suppliers`, `waybills`.
- Both `operation_id` columns.
- `public.has_entity_permission(uuid, uuid, text, text)`,
  `public.compute_jsonb_diff(jsonb, jsonb)`, and
  `public._audit_resolve_invoice_schema(uuid, uuid)`.

`invoice_financials_v` is not a hard prerequisite because
`record_payment_transaction` catches `undefined_table` for that view.

An active tenant with a missing dependency raises an exception. There is no
per-tenant exception handler around the installer call, and a post-install
check verifies both canonical save RPC signatures. An installation failure
therefore aborts the migration; it cannot be reported as successful completion.

### 15.6 Future-tenant provisioning

The provisioning engine was not refactored. The existing path still clones
template tables with `LIKE ... INCLUDING ALL`, calls the canonical installer
before status becomes `ready`, and sets status to `failed` on exception.
Migration A adds `operation_id` to the template; future tenants inherit the
columns and partial indexes, then receive the corrected canonical RPCs.

### 15.7 Generator integrity

`scripts/gen-bolu-operation-id-tenant-rpcs.cjs` was updated only for the
existing-tenancy footer. It still reads the authoritative `20261106230000`
installer, applies four unique-anchor edits to the installer body, and rejects
missing or ambiguous anchors. It now emits the corrected dependency guard.
The generator was run successfully: 4 edits applied, all probes passed, and
103,304 bytes were written.

No claim is made that the generator validates every embedded RPC against full
migration history. That limitation remains documented.

### 15.8 Verification performed

| Check | Result |
|-------|--------|
| `bun run audit:load` | Exit 0; 1,123 files scanned; pre-existing bloat, broad-select, and heavy-limit warnings remain. |
| `bun run typecheck` | Exit 0. |
| Focused Bolu tests after correction | 88 pass, 0 fail across the three focused suites. |
| First focused run after removing the RPC block | 2 stale assertions failed because they still read RPC definitions from Migration A. They were changed to read Migration B; the final rerun passed. |
| Generator | Exit 0; 4 authorized edits; all contract probes passed. |
| Static SQL structure | Migration A: 1 dollar-quote tag pair, 1 `DO`/`END`, no `CASCADE`, `NOTIFY` present. Migration B: 37 tag pairs, 1 `DO`/`END`, no `CASCADE`, `NOTIFY` present. |
| Full critical suite | Not rerun in this focused pass; the recorded baseline remains 4 unrelated failures out of 1,660 tests. |
| `bun run build` | Not run. |

### 15.9 Verification not performed

- No local PostgreSQL or `psql` binary was available.
- Docker was unavailable, so no local Supabase database was started.
- No non-production database was used or contacted.
- No hosted tenant schema, function definition, or grant was inspected.
- No new tenant provisioning run was observed.
- No genuine concurrent duplicate-operation test was performed.

SQL runtime validation is therefore unavailable. Database uniqueness and
concurrency remain source-level and unit-level contracts, not runtime proofs.

### 15.10 Deployment status

Source preparation is complete. Migration deployment, production mutation,
hosted verification, and push remain untouched. This report does not claim
deployment readiness.

### 15.11 Git state

Initial state in this correction pass:

- Modified: `AGENTS.md`, the remediation report.
- Untracked: `.perch/`, `.workbuddy-ai/`,
  `docs/integrations/aws-agent-toolkit-setup.md`,
  `docs/reports/bolu-persistence-integrity/deployment-readiness-audit.md`,
  the generator, the provisioning test file, and Migration B.

Final state adds these task-attributable changes:

- Modified: Migration A, the remediation test file, and this report.
- Untracked: Migration B, the generator, and the provisioning test file remain
  untracked.

No staging, commit, push, reset, checkout, stash, clean, or destructive Git
operation was performed.

### 15.12 Classification

| Class | Finding |
|-------|---------|
| OBSERVATION | The original migration pair could leave simplified save RPCs as a final state for tenants skipped by Migration B. |
| OBSERVATION | Migration A no longer defines any RPC; Migration B is the only canonical installer in the pair. |
| OBSERVATION | Both migrations now use entity-derived schemas with the same escaped tenant prefix and legacy-ready status rule. |
| OBSERVATION | Active tenants with missing installer dependencies abort the migration; non-ready tenants are skipped with a notice. |
| OBSERVATION | The generator footer now emits the corrected guard while the installer body remains the prior installer plus four authorized edits. |
| REFERENCE | `invoice_financials_v` is optional because the canonical payment RPC catches `undefined_table`. |
| REFERENCE | Supabase CLI migration files are expected to run transactionally; this was not runtime verified. |
| PROPOSAL | Treat Migrations A and B as one deployment unit and verify them in an authorized non-production database before any production decision. |
| DECISION | The local-only migration evidence authorized in-place correction instead of a new forward migration. |
| DECISION | Production, push, deployment, and build were not attempted. |

---

## 16. Final status

PARTIALLY COMPLETED
