# BOURXE — Independent Verification of Bolu Migration-Pair Correction

**Date:** 2026-11-18  
**Review type:** Independent, read-only implementation review and deployment-readiness assessment  
**Subject:** Correction of the divergent `20261118120000` / `20261118130000` Bolu operation-ID migration pair  
**Report author:** Tencent Hunyuan Hy via WorkBuddy Agent  
**Documentation style:** ASD-STE100 Simplified Technical English

---

## 1. Objective and authority

The implementation agent reported that:

- Migration A no longer recreates simplified invoice and quotation save RPCs.
- Migration B remains the canonical tenant RPC installer.
- Existing-tenant schema selection and eligibility guards were aligned.
- The generator and focused tests were updated.
- 88 focused tests pass.
- `bun run audit:load` and `bun run typecheck` pass.
- Runtime PostgreSQL validation and genuine concurrency testing remain unavailable.

These statements were treated as claims, not as facts. This review independently inspected the repository, reproduced checks where feasible, and assessed whether the correction is technically sound, preserves existing behaviour, and is safe to advance toward deployment.

Authorized boundaries:

- Read-only review. No defect was fixed.
- No migration was deployed or applied.
- No production connection, hosted query, push, diff, shell, or dump was run.
- No file was modified except this report.
- Bun only. `bun run build` was not run.
- No Git staging, commit, push, stash, reset, checkout, clean, or destructive operation was performed by this review.

Governance sources read:

- root `AGENTS.md`
- `.claude/agent-instructions/core-guardrails.md`
- `.claude/agent-instructions/concurrent-agent-safety.md`
- `.claude/agent-instructions/documentation.md`
- `.claude/agent-instructions/verification-gate.md`
- `docs/PROJECTSKILLINDEX.md`
- `supabase/database-workflow.md`
- relevant local Supabase Postgres skill references
- `docs/reports/bolu-persistence-integrity/deployment-readiness-audit.md`
- `docs/reports/bolu-persistence-integrity/remediation.md`

`AGENTS.md` states that deployment automation is the default direction, but it also states that this default is not blanket authorization to cross environment boundaries or mutate an unauthorized target. The user explicitly prohibited deployment and production access. That explicit boundary controls this review. `supabase/database-workflow.md` says migrations must normally be pushed, but it also says to stop when the user clearly says not to push. This review followed the user's boundary.

---

## 2. Evidence classes

### 2.1 Source-level evidence inspected

- Both migration files, read in full.
- Canonical installer source in `20261106230000_tenant_rpc_purchase_order_transaction.sql`.
- Generator `scripts/gen-bolu-operation-id-tenant-rpcs.cjs`.
- Focused test files:
  - `src/tests/ai-assistant/bolu-persistence-integrity-remediation.test.js`
  - `src/tests/ai-assistant/bolu-canonical-persistence-and-context.test.js`
  - `src/tests/critical/boluTenantProvisioningIntegrity.test.js`
- Provisioning sources:
  - `20260717000000_entity_provisioning_engine.sql`
  - `20261014100000_document_search_platform.sql`
  - `20260716000000_multi_tenancy_platform_operators.sql`
- Application persistence service:
  - `src/lib/ai-assistant/bolu-document-service.ts`
- Git history, ancestry, hashes, and status.

### 2.2 Runtime evidence available

None from a database. No local PostgreSQL, `psql`, Supabase CLI database command, hosted schema probe, migration ledger query, tenant provisioning run, or concurrent duplicate-operation test was performed. All runtime statements in this report are explicitly marked as unverified.

### 2.3 Source hashes verified in this review

| File | SHA-256 | Bytes |
|------|---------|-------|
| `supabase/migrations/20261118120000_bolu_operation_idempotency.sql` | `8e628c8d28050f5a93cd6d1dc8b2d51e9518049af8881240b92181ced92e30e4` | 11,528 |
| `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql` | `846ade43033b4a01c87d01fea0a204f1819568cd3245f052d1c14ed60ea26e99` | 103,304 |
| `scripts/gen-bolu-operation-id-tenant-rpcs.cjs` | `4a243ea1e37cb3e6b4749bcf4dfd262cc4621042c8e50a7bc6a378764af2d0e0` | 12,085 |

The original committed Migration A content at `501fdd59` hashed to `f9d4a9c1d41f79dc745295ac8953252dc4e47f907027de11cbd175b73bfaddbf` and was 33,230 bytes. The current file is materially different and no longer contains the divergent RPC block.

---

## 3. Git state and attribution

### 3.1 Baseline observed during this review

At the start of the resumed review, Git showed staged task work and no conflicts, with `HEAD` at `4b07a8a9` and `main` ahead of `origin/main` by 11 commits. Earlier in the overall session, the same work had been observed as modified and untracked. No staging operation was performed by this review.

During the read-only checks, the repository state changed externally:

- New local commit: `13135809af4bf0cec5880c45a78f2d47aa381de9`
- Author: `Bigdrops`
- Time: `2026-11-18T11:06:19+01:00`
- Subject: `Add new files and update existing ones for bolu persistence integrity features`
- Branch after the change: `main...origin/main [ahead 12]`
- Worktree after the change: clean
- The commit contains the files that had been staged at the resumed baseline.

This review did not create that commit. Attribution of the staging and commit is uncertain. The source hashes used for this review were unchanged after the commit, so the change did not alter the reviewed SQL or generator content.

### 3.2 Ancestry evidence

| Check | Result | Meaning |
|-------|--------|---------|
| `git merge-base --is-ancestor 501fdd59 origin/main` | exit `1` | Original Bolu remediation commit is not in `origin/main`. |
| `git merge-base --is-ancestor 13135809 origin/main` | exit `1` | New local commit is not in `origin/main`. |
| `git merge-base --is-ancestor 501fdd59 HEAD` | exit `0` | Original commit is an ancestor of the local `HEAD`. |

This proves local-only Git status. It does **not** prove that no database ever consumed a local file. A migration can be applied manually or from a working tree that is not pushed. The review did not query a migration ledger because hosted access was prohibited.

`supabase/.temp/linked-project.json` and `supabase/.temp/project-ref` exist and point to project `xqlpekpkbszpdgtuwybh`. These files prove CLI link metadata only. They do not prove migration application.

---

## 4. Claim verification summary

| Implementation claim | Independent result | Evidence |
|----------------------|--------------------|----------|
| Migration A no longer recreates simplified RPCs | Verified | Full read of Migration A; no `CREATE OR REPLACE FUNCTION`, no save-RPC names, no `$rpc_update$`, no `item_count`, no `pg_namespace`. |
| Migration B remains canonical installer | Verified | Migration B defines `public._prov_install_tenant_rpcs`; 32 tenant functions installed; canonical invoice and quotation bodies present. |
| Existing-tenant selection and eligibility aligned | Verified at source level | Both migrations derive schemas from `public.entities` through `public._prov_get_schema_name(e.id)` and use escaped `entity\_%` matching. Migration B validates 16 relations, two columns, and three public helpers. |
| Generator and tests updated | Verified | In-memory generator reproduction produced byte-identical Migration B; focused tests pass and include the new responsibility and canonical-behaviour contracts. |
| 88 focused tests pass | Verified by rerun | `88 pass`, `0 fail`, 3 files. |
| `bun run audit:load` and `bun run typecheck` pass | Verified by rerun | Both exit `0`. |
| Runtime PostgreSQL and genuine concurrency unavailable | Verified as environmental limitation | No database tool or hosted connection was used. No concurrency test was run. |

---

## 5. Review A — Migration immutability and application status

### 5.1 What the repository evidence proves

- The original Bolu migration commit `501fdd59` is local-only relative to `origin/main`.
- The new commit `13135809` is also local-only relative to `origin/main`.
- No report in the repository records `20261118120000` or `20261118130000` as applied.
- A prior forensic report records production migrations applied through `20261116132000`, and records `20261117000000` as pending at that time. The disputed pair did not exist at that point.
- Prior work in this conversation explicitly did not push, deploy, or mutate a hosted database.

### 5.2 What the evidence does not prove

- It does not prove the absence of manual SQL execution in any environment.
- It does not prove the current contents of `supabase_migrations.schema_migrations`.
- It does not prove that the original `f9d4a9...` Migration A content was never applied.
- It does not prove that `20261118130000` is pending or absent.

### 5.3 Repository policy assessment

No repository rule was found that globally forbids correction of an unapplied migration file. `supabase/database-workflow.md` says that when a push fails, the migration must be corrected and pushed again, and that a migration must not be deleted merely to skip an error. That supports correction of source that has not been accepted by the target ledger.

The in-place correction was therefore justified **for the local source pair**, because the available evidence indicates that the pair was prepared locally and not applied through the recorded deployment path.

### 5.4 Deployment gate

If any target environment has already recorded either old migration version, `supabase db push` will not replay the corrected in-place file content for that version. That environment requires a separate forward migration or an explicitly authorized migration-repair decision. This must be checked in the authorized non-production environment before any wider deployment.

Finding classification: `OBSERVATION` for application-status uncertainty; `DECISION` for the local-source immutability judgment.

---

## 6. Review B — Migration responsibilities and canonical behaviour

### 6.1 Migration A is schema and data only

Migration A performs:

- `operation_id text` columns in `tenant_master_template`, then active tenant schemas.
- Partial unique indexes named `idx_invoices_operation_id_unique` and `idx_quotations_operation_id_unique`, both with `WHERE operation_id IS NOT NULL`.
- Safe historical backfill:
  - invoice `custom_fields` is `text`;
  - each candidate row is parsed inside its own `BEGIN` / `EXCEPTION WHEN invalid_text_representation` block;
  - `jsonb_typeof` rejects non-object JSON and non-string operation IDs;
  - `btrim` plus `NULLIF` rejects empty and whitespace-only values;
  - existing operation IDs are never overwritten;
  - invalid and unusable rows are counted with `RAISE NOTICE`.
- Duplicate pre-checks before index creation.
- `NOTIFY pgrst, 'reload schema'`.

It does not create, replace, or drop functions. Searches found no `CREATE OR REPLACE FUNCTION`, no `save_invoice_with_items_transaction`, no `save_quotation_with_items_transaction`, no `$rpc_update$`, no simplified `item_count` response, and no `pg_namespace` scan.

This removes the source-level divergence identified by the prior audit. A deployment that stops after Migration A no longer leaves simplified RPC bodies in tenant schemas.

### 6.2 Migration B is the canonical installer

Migration B replaces `public._prov_install_tenant_rpcs(p_schema_name text)` and installs 32 tenant functions. It also removes only the obsolete four-argument invoice overload with `DROP FUNCTION IF EXISTS` and no `CASCADE`, then grants execute on all routines in the tenant schema.

Independent installer inventory derived 32 installed functions:

1. `save_invoice_with_items_transaction`
2. `delete_invoice_with_items_transaction`
3. `record_payment_transaction`
4. `record_invoice_created`
5. `record_invoice_status_changed`
6. `record_payment_voided`
7. `record_payment_attachment_uploaded`
8. `record_waybill_created`
9. `record_waybill_status_changed`
10. `record_csr_created`
11. `record_csr_status_changed`
12. `record_csr_linked`
13. `record_quotation_created`
14. `record_quotation_status_changed`
15. `record_quotation_linked`
16. `record_project_updated`
17. `record_project_note_added`
18. `record_project_document_added`
19. `record_project_linked_activity`
20. `record_letter_created`
21. `record_letter_updated`
22. `record_letter_status_changed`
23. `record_letter_duplicated`
24. `record_letter_archived`
25. `record_audit_log`
26. `record_activity_event`
27. `revert_invoice_to_quotation_transaction`
28. `record_cps_audit_event`
29. `apply_cps_item_feedback_transaction`
30. `save_quotation_with_items_transaction`
31. `save_purchase_order_with_items_transaction`
32. `transition_purchase_order_status`

A scan of the 16 migration files between the authoritative source installer and Migration B found zero redefinitions of those 32 functions after Migration A was corrected. Therefore no unrelated function is downgraded relative to source history. Hosted drift remains unverified.

### 6.3 Canonical invoice and quotation behaviour retained

| Contract | Invoice | Quotation |
|----------|---------|-----------|
| Signature | `(uuid, jsonb, jsonb, text, jsonb)` | `(uuid, jsonb, jsonb, text, jsonb)` |
| Create INSERT columns | 26, final `operation_id` | 23, final `operation_id` |
| Placeholders | `$1`…`$26` | `$1`…`$23` |
| `USING` arguments | 26 | 23 |
| Final argument | `NULLIF(p_invoice_payload->>'operation_id', '')` | `NULLIF(p_quotation_payload->>'operation_id', '')` |
| CPS feedback | `apply_cps_item_feedback_transaction` called in one transaction | Same |
| CPS item lineage | `source_cps_id`, `source_cps_row_id` written | Same |
| Response | `{ id, invoice, items_saved }` | `{ id, quotation, items_saved }` |
| Update mode | Does not reassign `operation_id` | Does not reassign `operation_id` |
| Security | `SECURITY DEFINER`, `SET search_path TO 'public'` | Same |

Operation-ID support is additive. Missing or empty payload values become SQL `NULL`, and partial indexes exclude `NULL`. Non-Bolu documents remain compatible at the source-contract level.

Finding classifications: `OBSERVATION` for preserved responsibilities and behaviour; `REFERENCE` for partial-index null exclusion.

---

## 7. Review C — Existing-tenant eligibility and skipped-tenant safety

### 7.1 Schema selection

Both migrations use:

```sql
FROM public.entities e
LEFT JOIN public.entity_provisioning_status eps ON eps.entity_id = e.id
WHERE public._prov_get_schema_name(e.id) LIKE 'entity\_%'
  AND COALESCE(eps.status, 'ready') = 'ready'
```

`entity_provisioning_status.entity_id` is a primary key, so a simple left join cannot duplicate an entity row. A missing status row is treated as legacy ready. Known non-ready statuses are skipped by Migration B with a notice.

### 7.2 Dependency derivation

Independent parsing of the installer body found:

- 32 installed functions.
- 17 tenant-qualified relation references:
  `activity_events`, `audit_logs`, `cps_rows`, `cps_sheets`, `csrs`,
  `invoice_financials_v`, `invoice_items`, `invoices`, `letters`, `payments`,
  `projects`, `purchase_order_items`, `purchase_orders`, `quotation_items`,
  `quotations`, `suppliers`, `waybills`.
- Public helper references:
  `_audit_resolve_invoice_schema`, `_prov_get_schema_name`,
  `_prov_install_tenant_rpcs`, `compute_jsonb_diff`, `has_entity_permission`.

Migration B declares 16 required relations. The only derived relation not declared is `invoice_financials_v`. This is justified: `record_payment_transaction` catches `undefined_table` for the view and sets the status to `NULL` (Migration B lines 409–417). The migration also checks both `operation_id` columns and the three public helpers used by tenant functions. `_prov_get_schema_name` and `_prov_install_tenant_rpcs` are necessarily available because the migration itself calls them.

### 7.3 Failure handling

- Known non-ready tenants are skipped with `RAISE NOTICE`.
- Active tenants with any missing dependency raise an exception before installation.
- There is no per-tenant exception handler around the installer call.
- After installation, both canonical five-argument save RPC signatures are checked with `to_regprocedure`.
- A missing signature raises an exception.

Therefore an active tenant cannot be silently left on an old or divergent save RPC. Failure aborts the migration. Recovery requires correcting the missing dependency or tenant state, then rerunning the migration. This is fail-closed behavior.

### 7.4 Low-severity observation

The invoice backfill increments `v_backfilled` after issuing the guarded `UPDATE`, without checking the affected row count. Under concurrent activity, the notice can overstate the number of rows actually populated. The `WHERE ... AND operation_id IS NULL` guard prevents an overwrite, so data correctness is not affected. Optional cleanup: increment only when the command affected one row.

Finding classifications: `OBSERVATION` for aligned eligibility and fail-closed handling; `OBSERVATION` (LOW) for backfill notice overcount.

---

## 8. Review D — Future-tenant provisioning

The source lifecycle is unchanged and remains correct:

1. Migration A adds `operation_id` columns and partial unique indexes to `tenant_master_template`.
2. `_prov_clone_table` clones template tables with `CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)` at `20260717000000_entity_provisioning_engine.sql:239`, so columns and indexes are inherited.
3. `public.provision_entity` clones tables at `20261014100000_document_search_platform.sql:396`.
4. It calls `public._prov_install_tenant_rpcs(v_schema_name)` at line 432.
5. It marks the tenant `ready` at line 447.
6. Its exception handler cleans up and marks the tenant `failed` at lines 455–457.

No later provisioning step overwrites the save RPC bodies. Future tenants therefore receive corrected canonical RPCs if both migrations and the installer source are active. Runtime provisioning was not observed.

Finding classification: `OBSERVATION`.

---

## 9. Review E — Generator integrity

The generator was reproduced without writing to disk. Its file write was intercepted in memory, and the captured output was compared with the committed Migration B.

Result:

- Generator reported 4 authorized edits and all contract probes passed.
- Captured bytes: 103,304.
- Committed bytes: 103,304.
- Captured and committed content were byte-identical.
- Both hashed to `846ade43033b4a01c87d01fea0a204f1819568cd3245f052d1c14ed60ea26e99`.

Safety properties verified:

- Every edit uses a unique-anchor check and fails when an anchor is missing or ambiguous.
- The generator rejects `CASCADE` in generated output.
- It probes both `NULLIF(...operation_id...)` expressions, both canonical save functions, CPS feedback installation, and both `operation_id` column guards.
- Output is deterministic for unchanged input.

Limitations remain:

- The generator trusts `20261106230000` as the authoritative installer source.
- It does not validate every embedded function against all later migration history.
- Its anchors contain CRLF sequences and fail closed if source line endings change.

These are maintenance risks, not source-level deployment blockers for this pair. The separate migration-history scan in Review B compensates for the current release.

Finding classifications: `OBSERVATION` for in-memory identity; `OBSERVATION` (LOW/MEDIUM) for generator trust scope.

---

## 10. Review F — Test quality

### 10.1 Checks rerun in this review

| Command | Result |
|---------|--------|
| `bun run audit:load` | Exit `0`. 1,123 files scanned. Pre-existing warnings: 57 oversized files, 8 broad selects, 1 component fetch, 4 heavy limits. |
| `bun run typecheck` | Exit `0`. |
| Focused Bun tests across three Bolu suites | `88 pass`, `0 fail`, 3 files. |
| `bun run build` | Not run. |

### 10.2 Meaningful contracts covered

The focused tests verify:

- Migration A contains no save-RPC definitions.
- Migration B is the last canonical installer definition.
- The installer block equals the prior installer plus four authorized edits.
- Generator unique-anchor and no-`CASCADE` guards remain.
- Invoice and quotation INSERT alignment at 26 and 23 columns, placeholders, and arguments.
- CPS feedback, CPS lineage, signatures, permissions, security attributes, and canonical responses.
- Update mode does not reassign `operation_id`.
- Template cloning uses `INCLUDING ALL`.
- Provisioning installs RPCs after cloning and before `ready`.
- Failure sets status to `failed`.
- Existing-tenant selection uses one entity-derived rule and checks real dependencies.
- Unrelated and cross-family 23505 errors are not replays.
- Failed prefix reads abort before the save RPC.
- Application payloads contain `operation_id` for both families.

### 10.3 Confidence limits

- Many SQL checks are source-pattern assertions, not SQL parsing or execution.
- Lifecycle and guard behavior is not executed against PostgreSQL.
- Application behavioural tests use mocked tenant clients.
- No genuine database concurrency test exists.
- The full critical suite was not rerun in this review. The prior audit recorded four unrelated pre-existing failures out of 1,660 tests.

The test set is adequate for source-level contract control before non-production validation. It is not evidence of runtime correctness.

Finding classification: `OBSERVATION`.

---

## 11. Review G — Static SQL structure and transaction assessment

| Check | Migration A | Migration B |
|-------|-------------|-------------|
| Size | 11,528 bytes | 103,304 bytes |
| Dollar-quote tags | 1 distinct tag, 2 occurrences, paired | 37 distinct tags, all paired |
| `DO` blocks | 1, tag present at open and close | 1, tag present at open and close |
| `CREATE OR REPLACE FUNCTION` | 0 | 33, including public installer |
| `DROP FUNCTION IF EXISTS` | 0 | 1 |
| `CASCADE` | absent | absent |
| `NOTIFY pgrst` | present | present |
| Literal `\r\n` text | absent | absent |

Static observations:

- Dynamic SQL uses `%I` and `%L` where identifiers and literals are interpolated.
- The invoice JSON backfill has per-row error isolation.
- Duplicate pre-checks raise before index creation.
- Migration B has no per-tenant exception handler that could swallow installation failure.
- Supabase CLI migration files are expected to run transactionally; this was not runtime verified.
- No advisory lock was found. DDL lock duration was not tested.
- Cross-file partial application remains possible. If Migration A applies and Migration B fails, the source state is incomplete but no longer divergent: tenants keep their prior save RPCs until Migration B succeeds.

Finding classifications: `OBSERVATION` for static structure; `REFERENCE` for transactional expectation.

---

## 12. Ranked findings and required actions

| Rank | Class | Finding | Severity | Blocks non-production validation? | Blocks production deployment? |
|------|-------|---------|----------|-----------------------------------|-------------------------------|
| 1 | `OBSERVATION` | The target environment's migration ledger was not queried. If either old version is already applied, in-place correction will not replay. | HIGH | No — must be checked during validation | YES |
| 2 | `OBSERVATION` | No runtime SQL validation, hosted function/grant verification, or genuine concurrency test was performed. | MEDIUM | No — these are the purpose of validation | YES |
| 3 | `OBSERVATION` | Broad installer reinstalls 32 functions and regrants all routines. No source-level downgrade was found, but hosted drift is unverified. | MEDIUM | No | YES, until verified in target |
| 4 | `OBSERVATION` | Generator trusts one authoritative source file and CRLF anchors; it does not prove every embedded body is current. | LOW/MEDIUM | No | No |
| 5 | `OBSERVATION` | Invoice backfill notice can overstate populated rows under concurrent activity; data guard is safe. | LOW | No | No |
| 6 | `OBSERVATION` | Git state changed externally during review: staged work became local commit `13135809`; attribution uncertain. Hashes unchanged. | INFO | No | No |
| 7 | `REFERENCE` | Partial indexes exclude SQL `NULL`; non-Bolu documents remain outside operation-ID uniqueness. | INFO | No | No |
| 8 | `REFERENCE` | Supabase migration transaction behavior is documented, not runtime observed here. | INFO | No | No |
| 9 | `PROPOSAL` | Treat Migrations A and B as one deployment unit; validate in an authorized non-production database before any production decision. | HIGH | Recommended | YES |
| 10 | `DECISION` | This review made no source fix, no deployment, no hosted access, and no Git state change. | INFO | No | No |

### Smallest required corrections before non-production validation

None. The source pair is internally consistent enough to validate.

### Required actions before any production decision

1. Confirm the target ledger does not already record either migration version. If it does, prepare a separate forward correction for that environment.
2. Apply both migrations as one unit in an authorized non-production database.
3. Verify one existing tenant and one newly provisioned tenant:
   - both `operation_id` columns exist;
   - both partial unique indexes exist;
   - both canonical five-argument save RPCs exist;
   - CPS feedback and lineage behavior is present;
   - grants are unchanged from the established convention.
4. Run genuine concurrent duplicate-operation tests for invoice and quotation.
5. Optionally correct the low-severity backfill notice counter.

---

## 13. Source-level conclusion

The correction is technically sound at source level.

- The original high-severity divergence is removed: Migration A no longer installs RPCs.
- Migration B is the single canonical installer for existing and future tenants.
- Operation-ID support is additive and preserves signatures, permissions, payload mappings, transaction behavior, CPS feedback, CPS lineage, grants, and canonical response shapes.
- Existing-tenant selection is aligned, and active tenants with missing dependencies fail closed.
- The generator reproduces the committed migration byte-for-byte without overwriting it during this review.
- Focused verification gates pass.

Remaining uncertainty is environmental and deployment-related, not a source-level divergence in the corrected pair.

---

## 14. Files changed by this review

Only this report was created:

- `docs/reports/bolu-persistence-integrity/independent-verification.md`

No migration, generator, test, application, or existing report file was changed by this review.

---

## 15. Final Git state

Before this report was created, the worktree was clean at local commit `13135809`, ahead of `origin/main` by 12 commits. This report is the only task-attributable file added by the review. The external commit during the review remains attributed to an actor outside this review.

---

## 16. Final status

COMPLETED

## 17. Deployment verdict

READY FOR AUTHORIZED NON-PRODUCTION VALIDATION
