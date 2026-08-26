# Tenant Permission Architecture Audit — All Business Resources

This report was written by OpenCode on 2026-08-27 via Local Runner.

## Objective

Prove the broader tenant permission architecture works for authorized team
members across all 15 business resources, not merely that quotation creation
now works. Read-only audit; no permission model change was made.

## Scope

Target entity: `entity_bigdrops-main_main` (entity_id `eca34515-0b30-482c-b12e-3963df164322`).
15 resources: invoice, payment, receipt, quotation, waybill, project, client,
signatory, bank_account, csr, tax_setting, letter, boq, rfq, setting.

## Method

Against the live production tenant I verified, per resource/action:

1. The `entity_permissions` rows exist for owner and for a representative
   non-owner member (3 members, role=`member`).
2. The live RLS policy text calls `has_entity_permission(<entity>, auth.uid(),
   <resource>, <action>)` with the correct resource string.
3. The actual authorization decision by calling `has_entity_permission()`
   directly — the exact function the RLS policies invoke. Rows existing is not
   sufficient; the function must return TRUE.
4. RPC security context (SECURITY DEFINER/INVOKER) and internal permission
   checks.
5. Ownership-stamping trigger behavior.
6. Child-table RLS mapping.
7. Tenant isolation (non-member / wrong-entity returns FALSE).

## Permission Matrix (verified live)

All four actions (V/C/E/D) present for BOTH owner (1) and all 3 members.

| Resource     | Owner V/C/E/D | Member V/C/E/D | Rows exist | RLS path verified | Result |
|--------------|---------------|----------------|------------|-------------------|--------|
| invoice      | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `invoice`) | PASS |
| payment      | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `payment`) | PASS |
| receipt      | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `receipt`) | PASS |
| quotation    | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `quotation`) | PASS |
| waybill      | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `waybill`) | PASS |
| project      | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `project`) | PASS |
| client       | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `client`) | PASS |
| signatory    | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `signatory`) | PASS |
| bank_account | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `bank_account`) | PASS |
| csr          | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `csr`) | PASS |
| tax_setting  | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `tax_setting`) | PASS |
| letter       | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `letter`) | PASS |
| boq          | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `boq`) | PASS |
| rfq          | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `rfq`) | PASS |
| setting      | ✓/✓/✓/✓       | ✓/✓/✓/✓        | ✓          | ✓ (resource `setting`) | PASS |

Decisive test: `has_entity_permission(entity, member_uid, resource, action)`
returned **TRUE for all 60 combinations** (15 resources × 4 actions) for the
member, and all 60 for the owner. This is the function the RLS policies call,
so authorization will succeed, not merely that rows exist.

## Specifically Verified Document Flows

- Invoices create+edit: RPC `save_invoice_with_items_transaction` is
  SECURITY DEFINER and calls `has_entity_permission(...,'invoice','create'/'edit')`
  internally → member passes. (Direct-RPC path, not pure RLS.)
- Quotations create+edit: direct INSERT via `tenantClient.from('quotations')`,
  RLS WITH CHECK `has_entity_permission(...,'quotation','create')` → member passes.
- Waybills create+edit, CSR, RFQ, BOQ, Letters, Projects, Clients: direct
  INSERT/UPDATE governed by RLS → all member-authorized (verified).
- Delete: allowed where the role/permission architecture grants delete. All
  15 resources include `delete` for members; `has_entity_permission` confirmed
  TRUE. Delete paths use the same RLS policies.

## RLS Policies Alignment

All 29 tenant tables have RLS enabled with exactly 4 policies. The 15 main
tables and their item/child tables all resolve to the correct resource:
invoice_items→`invoice`, quotation_items→`quotation`, boq_rows→`boq`,
rfq_items→`rfq`, tax_filings→`tax_setting`. No resource mismatch found among
the 15 resources or their writable children.

## RPC / Trigger Paths Differing From Quotation

- Quotation: pure client INSERT, RLS-enforced (no RPC in this schema).
- Invoice / Payment: `SECURITY DEFINER` RPCs
  (`save_invoice_with_items_transaction`, `delete_invoice_with_items_transaction`,
  `record_payment_transaction`) that call `has_entity_permission` internally.
  These enforce permission explicitly and bypass RLS only for the internal
  write — correct by design. Member passes the internal check.
- Ownership trigger `stamp_row_ownership()` sets `created_by`/`updated_by =
  auth.uid()`. It performs NO permission check and NEVER rejects. A legitimate
  member is stamped with their own uid — correct ownership metadata.

## Unauthorized Access

- Non-member / non-existent user: `has_entity_permission(entity, fake_uuid,
  'invoice', 'create')` → **FALSE**.
- Wrong entity: `has_entity_permission(other_entity_id, member_uid, 'invoice',
  'create')` → **FALSE** (function filters on `ep.entity_id = p_entity_id`).
- Tenant isolation remains intact: permission rows are scoped to the single
  target entity; cross-entity and non-member access is blocked.

## Remaining Observations (not defects in the 15)

- `audit` and `device` resources: owner-only (`view`). Members correctly
  excluded. Intentional — audit logs and device sequences are owner-scoped.
- `item` resource: members hold create/edit/delete but NOT view. Odd, but
  `item` is the item-library module, not one of the 15 tenant business
  tables. Outside this audit's scope; flagged for separate review.
- Non-writable child/aggregate tables (item_catalog, item_aliases, etc.) use
  raw-name resources and are reached via SECURITY DEFINER helper RPCs or the
  owner `*` wildcard, not member-facing direct writes. No member-facing
  direct-insert into an un-mapped child table was found.

## Whether Another Migration Is Required

**No.** The existing `20260827000002_quotation_member_permission_backfill.sql`
already backfilled all 15 resources for every existing member. This audit
confirms all 15 resources are now correctly authorized for both owner and
members. No additional migration was created. The quotation fix remains
unchanged — no defect in it was found.

## Verification Gate

- bun run audit:load: passed (warnings only, "Audit complete").
- bun run typecheck: FAILS on a **pre-existing, unrelated** error in
  `src/components/rfq/RfqList.tsx` (`Expected 2 arguments, but got 1`). Not in
  this change set; `tsc` does not process SQL.
- git status / git diff --stat: only
  `supabase/migrations/20260827000002_quotation_member_permission_backfill.sql`
  (applied) is mine. Other working-tree changes and migrations present in the
  tree are pre-existing and were not touched.
- bun run build: not run (hard rule: hardware policy).

## Owner vs Member

- Owner: all 15 resources fully authorized (explicit rows + `*` wildcard).
- Member (3 users, role=`member`): all 15 resources fully authorized after
  the backfill. Before the fix, the 3 members had zero rows for these
  resources.

## Unauthorized User

- Blocked on all resources (no rows; `has_entity_permission` returns FALSE).
- Cross-entity access blocked.

## Files / Migrations Changed (by this audit)

- No new migration. No permission model change.
- The only change remains the previously applied
  `supabase/migrations/20260827000002_quotation_member_permission_backfill.sql`.

## Conclusion

The system-wide permission-seeding gap is real and was the root cause, but it
is now closed for all 15 tenant business resources by the existing backfill
migration. This audit verifies — by calling the actual RLS authorization
function, inspecting the live policy text, and confirming RLS/RPC/trigger
behavior — that authorized team members can perform the allowed operations
across all 15 resources, that unauthorized users remain blocked, and that
tenant isolation is intact. The multi-tenant permission system is sound for
the 15 business resources; the claim is now backed by evidence, not by
quotation creation alone.
