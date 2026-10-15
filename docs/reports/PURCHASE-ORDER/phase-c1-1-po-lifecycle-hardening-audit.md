# Phase C1.1 — Supplier Purchase Order Lifecycle Hardening and Audit Integration

This report was written by OpenCode on 2026-10-15.

Skills used: supabase-postgres-best-practices, supabase, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read. Three registered
skills were loaded and applied.

- `supabase-postgres-best-practices` — row locking for read-modify-write,
  RLS authorization model, additive schema-change discipline.
- `supabase` — imperative migration workflow, migration ordering, and
  `SECURITY DEFINER` handling per the skill checklist.
- `karpathy` — simplicity first and surgical changes. The C1 architecture
  is preserved. No abstraction was added beyond the one dedicated
  operation the brief requires.

`docs/standard/audit-trail-standard.md`,
`docs/standard/lifecycle-ownership-standard.md`, and
`20261005120000_cps_audit_entity_support.sql` (CPS audit precedent) were
the normative sources for the audit design.

---

## Objective

Harden the Phase C1 Supplier Purchase Order lifecycle, integrate audit
events, and establish a safe deployment path. No PO UI is built.

## Scope

In scope: content-immutability enforcement (database and service),
optimistic-concurrency rejection, the dedicated status-transition
operation, archive and restore rules, audit vocabulary and event mapping,
and one forward-only migration.

Out of scope and not built: PO pages, form descriptor,
`SupplierPartySelector`, list and detail UI, navigation, search, PDF,
RFQ-to-PO conversion, goods receiving, supplier payments, inventory
movements, and any accounting integration. No PDF renderer was modified.
`src/lib/Calculations.ts` was not modified.

## Files changed

### New files

| File | Lines | Purpose |
|---|---|---|
| `supabase/migrations/20261016120000_purchase_order_lifecycle_hardening.sql` | 560 | Audit CHECK widening, hardened save RPC, transition RPC |
| `src/modules/purchase-order/purchaseOrderTransitions.ts` | 100 | Status-only transition service |
| `src/tests/critical/purchaseOrderLifecycle.test.js` | 480 | 24 lifecycle, audit-mapping and migration tests |

### Modified files

| File | Change |
|---|---|
| `src/domain/purchase-order/status.ts` | +10 lines: `isPurchaseOrderContentEditable` |
| `src/lib/audit.ts` | +117 lines: `purchase_order` entity, tracked fields, 5 helpers |
| `src/modules/purchase-order/purchaseOrderService.ts` | Version reads, guards, stamp passthrough, audit hooks, transition split-out |
| `src/tests/critical/purchaseOrderPersistence.test.js` | +6/−1 lines: one superseded assertion narrowed with reason |

No other file changed. The pending C1 migration file was not edited.

## Changes made

1. Added `isPurchaseOrderContentEditable(status)`. It returns true for
   `draft` only. The transition table is unchanged.
2. Hardened the save RPC (forward-only `CREATE OR REPLACE`, old 4-arg
   signature dropped first per waybill precedent). The update branch now
   locks the row (`FOR UPDATE`), rejects archived rows, rejects stale
   stamps, and rejects every content rewrite on a non-draft PO. Create
   behaviour, identity immutability, numbering, and totals handling are
   unchanged from C1.
3. Added `transition_purchase_order_status`. It updates the status column
   only, atomically. Same-status calls return a proven no-op without
   writing. Archived rows and stale stamps are rejected.
4. Extended the service: version reads (status, archive state, write
   stamp), pre-write guards mirroring the database, stamp passthrough on
   every write, and best-effort audit hooks after every mutation.
5. Extended the audit vocabulary: `AuditEntityType` includes
   `purchase_order`; `audit_logs` admits it in every schema (CPS loop
   pattern). Five helpers map PO events onto existing actions.
6. Split the transition service into `purchaseOrderTransitions.ts` so no
   module file exceeds the load-audit size limit.
7. Added 24 lifecycle tests. Narrowed one C1 assertion that the new
   explicit content rejection supersedes.

## Lifecycle enforcement mechanism

Two layers refuse illegal writes. The database is authoritative.

| Layer | Content rule | Status rule | Stale rule | Archive rule |
|---|---|---|---|---|
| Save RPC update branch | Non-draft rewrite rejected | C1 transition table kept | Stamp newer than loaded stamp rejected | Archived row rejected |
| Transition RPC | No content column writable | C1 transition table enforced | Same check | Archived row rejected |
| Service | Pre-write refusal with user copy | Pre-write refusal with user copy | Stamp always sent | Pre-write refusal |

A same-status save on issued, cancelled, or closed is explicitly
rejected as a content update. The transition operation accepts the
same-status call as a proven no-op because its only writable column
already holds the value and the write is skipped.

## Status transition contract

```
draft      -> draft | issued | cancelled
issued     -> issued | cancelled | closed
cancelled  -> cancelled                      (terminal)
closed     -> closed                         (terminal)
```

Draft allows content edits and transitions. Issued allows status-only
transitions. Cancelled and closed are fully immutable. Archived POs are
read-only in every write path until restored. Restore clears the archive
flag only and preserves the lifecycle status, so a cancelled or closed
PO is never reactivated by restore.

## Audit event mapping

All PO events use the canonical `recordAuditLog` field-diff authority
into `audit_logs` (Mechanism 1 of `audit-trail-standard.md`), following
the CPS audit foundation. No new action name exists.

| PO event | Action | Metadata |
|---|---|---|
| created | CREATE | Tracked header fields |
| draft_updated | UPDATE | Old and new tracked fields |
| issued, cancelled, closed | STATUS_CHANGE | Old and new status |
| archived | ARCHIVE | Archived header |
| restored | UNARCHIVE | Restored header |

Tracked fields: `po_number`, `supplier_id`, `supplier_name`,
`po_date`, `status`, `currency`, `subtotal`, `discount`, `vat`,
`total`, `notes`, `terms`. Items, extra charges, calculation inputs,
and supplier contact details are never tracked. Audit writes are
best-effort post-write calls and never fail a mutation (invoice
convention). No `activity_events` row is written for PO events.

## Migration strategy

Forward-only corrective migration. The pending C1 file is untouched, so
ordering holds whether C1 is applied or not. The `audit_logs` change
widens allowed sets only, so existing rows stay valid. The template
carries the CHECK definition that future tenants inherit through table
cloning. No installer function was redefined. No existing constraint
member, table, column, or numbering key was removed.

## Read-only target verification

```
Linked project reference: xqlpekpkbszpdgtuwybh (supabase/database-workflow.md)
supabase migration list --linked: remote current through 20261015120000
Pending remote migrations: 20261016090000 (C1, confirms the C1 report)
                           20261016120000 (this task, local only)
Environment tier (dev, staging, production): not determined
Deployment authorization: not present in the task brief
```

No unexpected drift was found. One pre-existing anomaly was observed:
`_temp_debug.sql` in `supabase/migrations/` is skipped by the CLI
because its name breaks the timestamp pattern.

## Cloud deployment status

**Not deployed. No `supabase db push` was run.**

The brief forbids blind pushes and requires explicit target
authorization, which the brief does not contain. The database-workflow
document states a general push mandate; the brief's controlled-deployment
rule governs this task because it is more specific and safety-critical.
The conflict is recorded here.

To deploy when authorized, push applies `20261016090000` then
`20261016120000` in file order against project `xqlpekpkbszpdgtuwybh`,
then re-run the read-only probes for the CHECK, both RPC signatures,
and the PostgREST reload.

## Test results

| Suite | Result |
|---|---|
| New `purchaseOrderLifecycle.test.js` | 24 pass, 0 fail |
| `purchaseOrderPersistence.test.js` | 23 pass, 0 fail |
| `purchaseOrderDomain.test.js` | 19 pass, 0 fail |
| `purchaseOrderCalculations.test.js` | 10 pass, 0 fail |
| Full critical suite | 1306 tests, 1291 pass, 15 fail |

The 15 full-suite failures are the known pre-existing set
(`cpsIndustry`, `cpsLedger`, `cpsPdf`, four CPS view-contract tests,
`invoiceAccountingIntegration`, `paymentAccountingIntegration`,
`remediationContract`, `sourceTransactionContract`,
`validateFlaggedCleanupImport`, two theme-toggle tests). None touches a
file this task changed. One C1 persistence assertion was narrowed because
the new explicit content rejection supersedes the old transition-table
refusal; terminal-transition coverage now lives on the transition path
and in the migration contract tests.

## Verification result

```
Verification:
- git status before work: 1 untracked file (another agent's ClientSupplierRoleCard.tsx), tree otherwise clean
- git status after work: 4 scoped modifications, 3 new task files, pre-existing file untouched
- bun run audit:load: passed (exit 0, no finding in any purchase-order file)
- bun run typecheck: passed (exit 0, 0 errors)
- bun run test: 1306 tests, 1291 pass, 15 fail — all 15 pre-existing (see above)
- focused PO suites: 76 tests, 76 pass, 0 fail
- git diff --check: clean (exit 0)
- supabase db push: not run — no deployment authorization (see above)
- bun run build: skipped due to hardware policy
```

## Supabase push status

Not pushed. Two migrations are pending against the linked project:
`20261016090000_purchase_order_domain_and_persistence.sql` and
`20261016120000_purchase_order_lifecycle_hardening.sql`. Explicit target
approval is requested before any push.

## Risks or limitations

- The migration is verified by static contract tests only. It has not
  run against any database. A push may surface environment-specific
  issues that static review cannot catch.
- Audit integrity is best-effort post-write, matching the invoice
  convention. A lost audit row is logged server-side and never fails
  the mutation. Transactional audit consistency is not claimed.
- PO events appear in `audit_logs` and the merged audit feed only.
  No discrete `activity_events` row is written for PO events.
- The stale-write check compares write stamps with `>`. A client that
  truncates stamp precision may see a false stale refusal and must
  reload. The refusal message instructs exactly that.
- Same-status saves through the save RPC are rejected even when the
  submitted content is identical. Callers must use the transition
  operation for status-only intent.
- `bun run build` was not run, by hardware policy. Type safety is
  checked by `tsc --noEmit` only.

## Deferred work

- Push both pending migrations after explicit authorization, then run
  read-only post-migration verification.
- Decide whether a terminal PO must freeze content edits that arrive
  through direct table writes outside the RPC (out of scope: RLS
  permits `edit` holders to update the table; the RPC is the enforced
  path for service writes).
- Decide whether PO audit belongs in `activity_events` in addition to
  `audit_logs` when a PO activity feed exists.
- Decide whether a hard delete is required for drafts (still not
  implemented; archiving is the only removal path).
- Decide whether the PO number may ever be corrected after creation
  (currently immutable identity, matching the invoice convention).
- Fix the 15 pre-existing test failures owned by other work streams.
- Remove or rename the stray `_temp_debug.sql` migration file.

(End of file)
