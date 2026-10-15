# Phase C1.2 — Supplier Purchase Order Integrity Hardening and Deployment

This report was written by OpenCode on 2026-10-15.

Skills used: supabase-postgres-best-practices, supabase, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read. Three registered
skills were loaded and applied.

- `supabase-postgres-best-practices` — row locking for read-modify-write,
  RLS authorization model, additive schema-change discipline.
- `supabase` — imperative migration workflow, migration ordering, and
  `SECURITY DEFINER` handling per the skill checklist.
- `karpathy` — simplicity first and surgical changes. No TypeScript file
  changed. The authorized RPCs are preserved byte-for-byte in behaviour.

Normative sources: `docs/standard/lifecycle-ownership-standard.md`
(business rules stay in the domain layer and its persistence
authorities; the database enforces stored invariants),
`docs/standard/audit-trail-standard.md` (no second audit stream), and
`20261005120000_cps_audit_entity_support.sql` (convergence precedent).

---

## Objective

Close the direct-table-write lifecycle bypass identified in C1.1. Then
deploy the approved PO backend (C1, C1.1, C1.2) to the authorized live
project. No UI work. No accounting, inventory, or PDF work.

## Scope

In scope: one forward-only integrity migration with row-level guards on
`purchase_orders` and `purchase_order_items`, extension of the canonical
trigger installer for future tenants, convergence of eligible existing
tenants, static contract tests, authorized deployment, and read-only
production verification.

Out of scope and not built: PO pages, search, PDF, goods receiving,
supplier payments, inventory movements, accounting integration, and any
unrelated schema change.

## Files changed

### New files

| File | Lines | Purpose |
|---|---|---|
| `supabase/migrations/20261016130000_purchase_order_integrity_guards.sql` | 370 | Guard functions, installer extension, convergence |
| `src/tests/critical/purchaseOrderIntegrity.test.js` | 230 | 10 static guard-contract tests |

### Modified files

None. No TypeScript, configuration, or existing migration file changed.
The two pending C1 migrations were not edited.

## Changes made

1. Ran production preflight (identity, reachability, history, ordering,
   prerequisites, drift). All checks passed.
2. Created the C1.2 integrity migration (details below).
3. Added 10 static contract tests for the guards.
4. Ran local verification: audit, typecheck, focused and full suites.
5. Pushed exactly the three authorized migrations, in order, to the
   authorized project.
6. Ran read-only post-deployment probes for every acceptance item. No
   test purchase order was created. No business data was mutated.

## Database integrity mechanism

Two row-level guards apply to every writer, RPC or direct. There is no
bypass flag and no session-variable escape hatch.

**`public._po_transition_is_legal(from, to)`** — the C1 transition graph
as one shared predicate: draft to draft, issued, or cancelled; issued
to issued, cancelled, or closed; cancelled and closed terminal.

**`public._po_guard_purchase_orders()`** — `BEFORE INSERT OR UPDATE OR
DELETE` on every `purchase_orders` table:

- `DELETE` is rejected. Archiving is the only removal path.
- `INSERT` passes through. The status CHECK, the supplier foreign key,
  and number uniqueness vet creation, preserving the authorized
  create-with-any-status path.
- `UPDATE` rejects any change to `po_number`, `supplier_id`, or the
  frozen `supplier_name` on every status.
- An archived row accepts only the lone archive-flag change in either
  direction. Restore and archive therefore preserve history exactly.
- Status movement must satisfy the shared predicate. Terminal documents
  name their own refusal with C1.1 wording.
- Any other content change on a non-draft row is rejected with C1.1
  wording, so the service error mapping applies to direct writes too.
- Content comparison excludes system columns, status, and the archive
  flag. A column added later is guarded by default.

**`public._po_guard_purchase_order_items()`** — `BEFORE INSERT OR UPDATE
OR DELETE` on every `purchase_order_items` table:

- Each write qualifies its parent PO by primary key: live draft, or a
  parent born in the same transaction (the atomic create path, whose
  header INSERT already vetted the initial status).
- The parent row is locked (`FOR UPDATE`), so item writes serialise with
  issuance and cannot race it.
- Re-pointing an item qualifies both the old and the new parent.
- Archived or non-draft parents reject every item write.

Both functions run with the invoker's privileges (no `SECURITY
DEFINER`). The header guard touches only `OLD`/`NEW`. The item guard's
parent read fails closed under the writer's own RLS. No grant, policy,
or RLS object was added or weakened.

The authorized RPCs already obey every rule: create INSERTs pass
through, draft updates and legal transitions pass, archive and restore
pass as lone flag changes. Their behaviour is unchanged.

Future tenants inherit the guards twice: table clones carry triggers
(`LIKE ... INCLUDING ALL`), and the extended
`_prov_install_canonical_triggers()` reinstalls them on every
provisioned table. The installer reproduction is otherwise verbatim.

## Preflight project identity

| Check | Result |
|---|---|
| Linked project file `supabase/.temp/project-ref` | `xqlpekpkbszpdgtuwybh`, matches authorization |
| Project reachable (`db query`, read-only) | Yes, as `postgres` on database `postgres` |
| Remote history before push | Current through `20261015120000` |
| Pending before push | `20261016090000`, `20261016120000` only |
| Pending after C1.2 file creation | Those two plus `20261016130000` only |
| Destructive operations in C1/C1.1 SQL | None found (no `DROP TABLE`, `TRUNCATE`, or business-data `DELETE`; C1.1 drops only the superseded 4-arg save signature before replacing it) |
| Supplier foundation | `tenant_master_template.suppliers` exists; 11 of 14 entity schemas carry `suppliers` |
| PO objects before push | None (both tables and both RPCs absent) |
| Unexpected drift or unrelated pending migration | None |

Preflight re-confirmed the pending set immediately before the push. No
other agent pushed in between.

## Migration history before and after

Before: remote current through `20261015120000`; `20261016090000` and
`20261016120000` pending.

Push (exit 0, file order preserved):

1. `20261016090000_purchase_order_domain_and_persistence.sql`
2. `20261016120000_purchase_order_lifecycle_hardening.sql`
3. `20261016130000_purchase_order_integrity_guards.sql`

After: `schema_migrations` records all three versions. The pre-existing
`_temp_debug.sql` filename warning is unrelated and unchanged.

## Production verification results

All probes read-only. No test purchase order created. No business data
mutated.

| Item | Result |
|---|---|
| All three migrations recorded | Yes, in `schema_migrations` |
| PO tables exist in template | `purchase_orders` and `purchase_order_items` present |
| Supplier foreign key | `purchase_orders_supplier_id_fkey` references template `suppliers(id)` |
| RLS enabled and forced | Yes on both tables in all 11 eligible entity schemas; template tables match the existing convention (RLS off, as with `clients`, `suppliers`, `audit_logs`) |
| Permissions present | 44 `entity_permissions` rows with `resource = 'purchase_order'` (11 schemas x 4 actions x 1 owner) |
| Save RPC exists | 5-arg signature with `p_expected_updated_at timestamptz` |
| Transition RPC exists | 4-arg signature with `p_expected_updated_at timestamptz` |
| Guard functions exist | `_po_transition_is_legal`, `_po_guard_purchase_orders`, `_po_guard_purchase_order_items` |
| Guard triggers installed | 24 rows: both triggers in the template and all 11 eligible schemas |
| Provisioning includes PO tables | `_prov_get_template_tables()` returns 53 tables including both PO tables |
| Eligible tenants converged | 11 of 11 schemas with `suppliers` carry PO tables, RLS, permissions, and guards |
| Numbering configuration | Prefix CHECK includes `purchase_order`; live settings row backfilled with `"purchase_order": "PO"` alongside unchanged custom prefixes |
| Audit CHECK admits `purchase_order` | Yes on template and entity schemas, with all nine pre-existing members preserved |
| Transition predicate live check | draft to issued true; draft to closed false; issued to closed true; cancelled self true; cancelled to issued false; closed to draft false |
| Unexpected schema changes | None observed |

## Skipped tenant schemas

Three entity schemas carry no `suppliers` table and were skipped by name
with a reason in every convergence loop (C1, C1.1 pattern, C1.2
pattern). This is the documented incomplete-tenant policy, not a
defect. They receive PO tables, permissions, and guards once their base
tables are restored and a later convergence runs.

## Test results

| Suite | Result |
|---|---|
| New `purchaseOrderIntegrity.test.js` | 10 pass, 0 fail |
| Focused PO suites (lifecycle, persistence, domain, calculations) | 76 pass, 0 fail |
| Full critical suite | 1316 tests, 1301 pass, 15 fail |

The 15 full-suite failures are the known pre-existing set
(`cpsIndustry`, `cpsLedger`, `cpsPdf`, four CPS view-contract tests,
`invoiceAccountingIntegration`, `paymentAccountingIntegration`,
`remediationContract`, `sourceTransactionContract`,
`validateFlaggedCleanupImport`, two theme-toggle tests). None touches a
file this task changed.

## Verification result

```
Verification:
- git status before work: clean tree, 0 changes
- git status after work: 2 new task files only, no modification
- bun run audit:load: passed (exit 0, no finding in any purchase-order file)
- bun run typecheck: passed (exit 0, 0 errors)
- bun run test: 1316 tests, 1301 pass, 15 fail — all 15 pre-existing (see above)
- focused PO suites: 86 tests, 86 pass, 0 fail
- git diff --check: clean (exit 0)
- supabase db push --yes: passed (exit 0, exactly the 3 authorized migrations, in order)
- post-deployment probes: all read-only checks passed (see table above)
- bun run build: skipped due to hardware policy
```

## Supabase push status

**Pushed and verified.** `supabase db push` exited 0 against project
`xqlpekpkbszpdgtuwybh`. Remote history and read-only object probes
confirm all three migrations and every expected object. No unrelated
schema or data change. No production test data created.

## Risks or limitations

- Guard triggers were verified by static contract tests, presence
  probes, and a live predicate check. No write was executed against
  production, so trigger refusal paths have not been fired there. The
  first real PO create, edit, transition, archive, and restore will
  exercise them.
- A future data-repair migration that must rewrite PO history would hit
  these guards and must drop them first, deliberately, in its own
  migration. This is intended behaviour, recorded here so it is not
  mistaken for breakage.
- A column added to `purchase_orders` by a later migration is guarded
  as content by default. If the column is meant to be editable on
  issued orders, the guard exclusion list must be extended.
- `bun run build` was not run, by hardware policy. Type safety is
  checked by `tsc --noEmit` only.
- The 15 pre-existing test failures remain, owned by other work
  streams. The `_temp_debug.sql` filename warning remains.

## Deferred work

- Exercise the guards through the first real PO lifecycle (create,
  draft edit, issue, item freeze, archive, restore) from the application
  once PO UI exists.
- Decide whether a hard delete is ever required for drafts (still not
  implemented; archiving remains the only removal path).
- Converge the three incomplete tenant schemas after their base tables
  are restored.
- Fix the 15 pre-existing test failures.

## Final deployment verdict

**DEPLOYED AND VERIFIED.** The Supplier Purchase Order backend (C1
domain and persistence, C1.1 lifecycle hardening and audit, C1.2
direct-write integrity guards) is live on `xqlpekpkbszpdgtuwybh` with
all acceptance probes passing and no unrelated change.

(End of file)
