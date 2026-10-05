# CPS Row-Level Lineage & Downstream Authority Handoff — Phase 2

**Date:** 2026-10-05
**Scope:** Phase 2 of the CPS downstream-feedback architecture
**Phase 1 (unchanged, still live):** [CPS audit foundation & view history](./2026-10-05-cps-audit-foundation-and-view-history.md)

Phase 2 installs **identity and authority infrastructure only**. No downstream
edit propagates to a Cost & Pricing Sheet. No Phase 3 feedback exists.

The chain this phase makes reliable:

```
CPS row X  ->  Quotation item Y  ->  Invoice item Z
```

and exactly one active downstream feedback authority per chain:

```
CPS -> Quotation                 authority = Quotation
Quotation -> Invoice             authority = Invoice  (Quotation authority ends)
```

---

## 1. Schema changes

**Migration:** [20261005130000_cps_row_lineage_and_authority.sql](../../../supabase/migrations/20261005130000_cps_row_lineage_and_authority.sql)

Applied to `public`, `tenant_master_template`, and every existing `entity_%`
tenant schema (11 entity schemas on the linked project), so future tenant
schemas inherit the definition from the template.

### Item lineage — uniform on `quotation_items` **and** `invoice_items`

| column | type | meaning |
|---|---|---|
| `source_cps_id` | `uuid` | originating Cost & Pricing Sheet |
| `source_cps_row_id` | `uuid` | originating `cps_rows.id` (item rows only) |
| `source_quotation_id` | `uuid` | originating Quotation document (carried into the Invoice) |
| `source_quotation_item_id` | `uuid` | originating Quotation item row (carried into the Invoice) |

**Why the columns are duplicated on both item tables.** The repo has a single
shared item serializer, [`toDbItem`](../../../src/domain/invoice/factories.ts),
used for both `quotation_items` and `invoice_items` writes. If the two tables
had different lineage shapes, that one serializer could emit a key the target
table does not have (a hard PostgREST error) or silently drop lineage on one
path. A uniform contract means every write path round-trips lineage without the
serializer knowing its target. On `quotation_items` the two
`source_quotation_*` columns are always NULL; they describe the Quotation
ancestry of an *Invoice* row.

### Active authority — on `quotations` (the CPS conversion target)

| column | type | meaning |
|---|---|---|
| `feedback_authority` | `text` | `'quotation'` \| `'invoice'` \| `NULL` |
| `feedback_authority_document_id` | `uuid` | document that currently owns authority |
| `feedback_authority_updated_at` | `timestamptz` | when authority last moved |

Constraint `quotations_feedback_authority_check`:
`feedback_authority IS NULL OR feedback_authority IN ('quotation','invoice')`.

**Why the quotation owns the chain state.** The quotation *is* the CPS
conversion artifact — it already carries `source_cps_id` (pre-existing
document-level lineage). Putting the single authority pointer there avoids
scattering state and guarantees "at most one active stage" structurally: one
row, one pointer.

### Indexes

- `quotation_items_cps_lineage_idx`, `invoice_items_cps_lineage_idx`
  on `(source_cps_id, source_cps_row_id) WHERE source_cps_id IS NOT NULL`
- `quotation_items_source_quotation_idx`, `invoice_items_source_quotation_idx`
  on `(source_quotation_id) WHERE source_quotation_id IS NOT NULL`

### Deliberately **no** foreign keys

Lineage is provenance evidence, not ownership. An FK would either block CPS
deletion (`NO ACTION`) or destroy ancestry (`ON DELETE SET NULL`) — both wrong
for a provenance record. Phase 2 keeps the ancestry when the source row or
document disappears (see §6) and lets Phase 3 resolve a missing origin
explicitly. This is documented in the migration header and asserted by test.

### Deliberately **no** backfill

Historical CPS-derived Quotations/Invoices predate this contract. They stay
NULL and classify as *lineage unavailable*. No heuristic backfill of any kind
was performed.

Idempotent: every `ALTER`/`CREATE INDEX` is guarded, no table rewrite, no data
change, no function change.

**Verified live:**

```
entity_bigdrops-main_main  invoice_items   source_cps_id, source_cps_row_id,
                                           source_quotation_id, source_quotation_item_id
entity_bigdrops-main_main  quotation_items source_cps_id, source_cps_row_id,
                                           source_quotation_id, source_quotation_item_id
entity_bigdrops-main_main  quotations      feedback_authority,
                                           feedback_authority_document_id,
                                           feedback_authority_updated_at
tenant_master_template     (same)
quotations_feedback_authority_check        present in template + all 11 entity schemas
```

---

## 2. Lineage field design

**[src/domain/cps/lineage.ts](../../../src/domain/cps/lineage.ts)** — pure,
network-free, unit-testable, reusable by the Phase 3 writer.

- `ItemLineage` / `LINEAGE_COLUMNS` — the uniform four-column contract.
- `isPersistableLineageId` / `normalizeLineageId` — a lineage id is written
  **only** when it is a real persisted uuid. A client-side `_uiKey`, a blank
  string, or any non-uuid is normalised to `null` ("lineage unavailable"),
  never promoted.
- `cpsRowLineageId(row)` — reads `row.id` **only**, never `_uiKey`. Lineage must
  survive persistence and reload, so an in-memory identity can never become
  ancestry.
- `buildCpsRowLineage(cpsId, row)` — quotation-item lineage. `row_type ===
  'section'` yields document ancestry with a NULL row id, so a structural row
  can never be mistaken for commercial item ancestry.
- `buildInvoiceItemLineage(quotationId, item)` — invoice-item lineage. Copies
  CPS ancestry verbatim from the quotation item; adds the Quotation
  document/item ancestry. Group headers keep document ancestry and a NULL row
  id.
- `hasCpsLineage`, `hasAnyLineage`, `lineageSignature`, `sameLineage`,
  `withoutLineage` (duplicate stripping).
- `summarizeQuotationLineage` / `summarizeUnlineagedRows` — audit sentences.
- `resolveActiveFeedbackAuthority` / `feedbackStageOwnsAuthority` /
  `feedbackAuthorityUpdate` / `authorityTransitionSummary`.

**[src/domain/cps/lineageStore.ts](../../../src/domain/cps/lineageStore.ts)** —
the only writers: `applyInvoiceItemLineage` and `persistFeedbackAuthority`.

Typed surface (no `any`): `InvoiceItem` gains the four optional lineage fields;
`DbInvoiceItem`, `DbQuotationItem`, `DbQuotation`, `Quotation` gain the matching
columns. `toDbItem` normalises all four on every write, so no path can persist a
non-uuid identity.

---

## 3. Conversion propagation

### CPS → Quotation — [src/domain/cps/conversion.ts](../../../src/domain/cps/conversion.ts)

- `ConvertedQuotationItem` now extends `ItemLineage`.
- Every converted row gets `source_cps_id` + `source_cps_row_id` (item rows
  only; group headers get document ancestry only).
- The payload seeds `feedback_authority: 'quotation'` at insert time, so a
  successfully created conversion always has determinate authority even if the
  follow-up id stamp fails.
- `lineage` report is returned for audit: `linkedRowCount`, `summary`
  ("Row ancestry established for 12 CPS items."), `unlineagedRowLabels`,
  `unlineagedSummary`.
- **Commercial mapping is untouched**: SP → `unit_price`, CP excluded, notes
  and site excluded, row order and group mapping preserved.

In [view-cps-actions.ts](../../../src/pages/view-cps-actions.ts) the lineage
columns are part of **the same insert** that creates the quotation item rows, so
a converted quotation is never persisted with partially unlineaged items. On a
row-write failure the existing compensating parent delete still applies. The
authority document id is then stamped by `persistFeedbackAuthority`.

### Quotation → Invoice — [view-quotation-actions.ts](../../../src/pages/view-quotation-actions.ts)

`toDbItem` now carries lineage, so:
- the **non-RPC** path writes lineage in the same insert as the rows;
- the **composite RPC** path (`save_invoice_with_items_transaction`) writes a
  fixed `invoice_items` column list and therefore drops lineage, so the same
  serialized rows are re-stamped immediately after, keyed by the stable
  `(invoice_id, sort_order)` pair, verified per row.

Quotation-added rows keep `source_cps_*` NULL and gain only Quotation ancestry.
Invoice-added rows keep every lineage column NULL. Nothing is inferred from a
neighbouring row, a shared catalog `item_id`, a description, or a position.

---

## 4. Save / edit preservation

| path | mechanism |
|---|---|
| Quotation edit | `toQuotationItem` → `toDbItem`; items are hydrated with lineage by `mapDbQuotationItem`, so delete-and-reinsert round-trips it |
| Quotation reorder | items are mapped/spread; lineage travels with the row object, `sort_order` is rewritten only |
| Quotation group change | `normalizeQuotationGrouping` spreads the row (`...item`) and rewrites only `row_type`/`group_id`/`group_name`/`sort_order` |
| Invoice save/edit (RPC) | `useInvoiceSave.afterSave` re-stamps lineage after the RPC from the exact rows it wrote |
| Invoice save/edit (pre-cutover) | `toDbItem` includes lineage in the insert |
| Offline / native quotation sync | same shared serializer |
| Import | rows come from `makeEmptyItem` → no lineage (correct) |
| Duplicate (quotation + invoice) | `withoutLineage` strips ancestry — Law 2 "duplicate = clean draft" — so a clone can never claim ancestry or later authority over a CPS it did not come from |

Lineage is system-owned metadata: it lives in domain/persistence layers, never
in presentation, and no form field can overwrite it (the quotation and invoice
payload builders do not include the columns).

---

## 5. Authority model

Deterministic, persisted, and **never** derived from `updated_at`, "most
recently edited", document existence, UI state, or browser state.

- After CPS → Quotation: `feedback_authority='quotation'`,
  `feedback_authority_document_id=<quotation id>`.
- After Quotation → Invoice: `feedback_authority='invoice'`,
  `feedback_authority_document_id=<invoice id>`; the Quotation's authority ends.
- A Quotation **edit never writes authority**, so a stale Quote edit cannot
  regain it. `resolveActiveFeedbackAuthority` ignores `updated_at` entirely.
- Quotations with no CPS ancestry have no chain and are never given authority.

### Handoff transaction boundary and failure behaviour

`recordInvoiceAuthorityHandoff` runs once per Quotation → Invoice conversion,
only when the quotation has a persisted `source_cps_id`:

1. The invoice + items are created (RPC path is atomic; pre-cutover path is
   parent-then-items with a thrown error on failure — unchanged behaviour).
2. Lineage is stamped per row; failures are collected, logged, and recorded as
   a CPS `LINEAGE_WARNING` audit event.
3. Authority is moved to the invoice.
4. A CPS `CONVERTED_TO_INVOICE` audit event is recorded.

**Idempotency / retry:** the authority write is an unconditional set of a
deterministic value triple, so repeating it — a retry, or converting the same
quotation twice — converges on the same state and can never produce
contradictory authority. A failed authority write is logged and reported; it
never claims success. Audit failures never fail the conversion (audit is
evidence, not a control path).

**Known atomicity gap (recorded, not hidden):** the composite
`save_invoice_with_items_transaction` RPC writes a fixed `invoice_items` column
list, so lineage for the create/update paths of an Invoice is a **compensating
follow-up write**, not part of the RPC transaction. The rows are written
atomically by the RPC; the lineage stamp is verified per row and any failure is
reported through console + a `LINEAGE_WARNING` audit event rather than silently
accepted. Extending the RPC to carry the lineage columns (which requires
updating `public._prov_install_tenant_rpcs` so future tenants inherit it) is
listed as a Phase 3 prerequisite in §8.

---

## 6. Legacy data and deleted sources

- **Legacy rows stay lineage-null.** Tested against `mapDbQuotationItem` /
  `mapDbInvoiceItem` with rows that have no lineage columns.
- **Deleted CPS rows keep their ancestry.** No FK, no `ON DELETE SET NULL`, no
  reassignment. Provenance survives the source disappearing.
- **Reverting an Invoice to a Quotation** (`revert_invoice_to_quotation_transaction`)
  uses its own fixed column list and therefore does not carry row lineage into
  the reverted quotation. Document-level ancestry still records the source
  invoice via `conversionTrail`. Out of Phase 2 scope; noted in §8.

---

## 7. Audit events and CPS Activity History

Phase 1's audit authority is reused unchanged (`recordCpsAuditEvent`,
`buildCpsAuditMeta`, `_cps` payload key, `useAuditTrail`).

- `CONVERTED_TO_QUOTATION` now carries the lineage consequence as a second line:
  *"Row ancestry established for 12 CPS items."*
- New `CONVERTED_TO_INVOICE` — *"Quotation converted to Invoice"* with
  *"Feedback authority moved: QTN-000432 → INV-000201"* and the invoice number
  as the related-document chip. Recorded on the CPS chain root, one event per
  conversion (not one per row).
- New `LINEAGE_WARNING` — diagnostic, system actor, emitted only when a
  converted row could not carry its origin or a stamp did not match.
- `CpsAuditMeta` / `AuditTrailEntry` gained an optional `detail` line; the
  timeline renders it as a secondary sentence. The new event types reuse the
  existing `CONVERT` action, so **no audit_logs constraint change was needed**
  (Phase 1's constraint already allows `CONVERT`).
- Activity History design is unchanged: no raw ids, no raw JSON, no giant
  cards, no delete-history control. Convert / Edit / Download hierarchy is
  untouched.

---

## 8. Tests

**New:** [src/tests/critical/cpsRowLineageAuthority.test.js](../../../src/tests/critical/cpsRowLineageAuthority.test.js) — 45 tests, all passing.

Covers the Phase 2 acceptance matrix: A–D (exact CPS row id, document id,
identical descriptions, identical catalog `item_id`), E/K (document-added rows
have no lineage), F/G/H (save, reorder, grouping preservation), I/J (CPS and
Quotation ancestry into the Invoice), L (stamping, no-match reporting, DB error
surfacing, ambiguous sort orders rejected, non-uuid identity rejected), M (no
heuristic matching, `row.id` not `_uiKey`), N (document lineage intact),
O/Q (authority states), R (authority ignores edit recency), S/T (idempotent,
retry-safe, failure reported), U/V (audit + Activity History rendering),
W (legacy rows), X/Y/Z (no SP / description / image feedback, no CPS mutation),
plus duplicate stripping, migration shape (no FK, no backfill),
interactive-row-editing preservation, and presentation-does-not-own-lineage.

**Updated:** [cpsConversion.test.js](../../../src/tests/critical/cpsConversion.test.js)
— the "conversion emits only `quotation_items` columns" allowlist now includes
the four Phase 2 columns that the migration actually adds to that table. This is
a required schema-accurate update, not a weakened assertion: the columns exist
in the live schema and the test still rejects any column outside the table.

---

## 9. Verification

| check | result |
|---|---|
| `bun run typecheck` | pass |
| `bun run audit:load` | no new findings on any task file (remaining warnings are pre-existing bloat / broad-select in untouched modules) |
| `bun run test` (critical suite) | 708 tests, **695 pass, 13 fail** — the identical 13 pre-existing failures (4 env-less `import.meta.env` integration tests, 3 `.tsx`/`.woff` loader failures, 5 stale `cpsViewProductionRedesign` assertions, 1 item-library test). No new failures. |
| Phase 2 focused suite | 45/45 pass |
| Phase 1 focused suite | 22/22 pass (Phase 1 behaviour intact) |
| `git diff --check` | clean |
| migration push | applied; columns + CHECK constraint verified live in template + all 11 entity schemas |
| `bun run build` | **not run** (banned on this host) |

---

## 10. Files changed (Phase 2)

**Added**
- `supabase/migrations/20261005130000_cps_row_lineage_and_authority.sql`
- `src/domain/cps/lineage.ts`
- `src/domain/cps/lineageStore.ts`
- `src/tests/critical/cpsRowLineageAuthority.test.js`

**Modified**
- `src/domain/cps/conversion.ts` — lineage on converted rows + lineage report
- `src/domain/invoice/types.ts`, `src/domain/invoice/factories.ts`,
  `src/domain/invoice/normalize.ts` — lineage on the item contract, serializer,
  and hydration
- `src/domain/quotation/types.ts`, `src/domain/quotation/normalize.ts` —
  item + document lineage and authority columns
- `src/hooks/useInvoiceSave.ts` — post-RPC lineage re-stamp
- `src/pages/view-cps-actions.ts` — authority seed + lineage audit detail +
  `LINEAGE_WARNING`
- `src/pages/view-quotation-actions.ts` — lineage stamp, authority handoff +
  audit, duplicate stripping
- `src/modules/invoices/services/invoiceLifecycleService.ts` — duplicate
  stripping
- `src/domain/audit/auditTypes.ts`, `src/domain/audit/auditFormatters.ts`,
  `src/domain/cps/auditDiff.ts` — new event kinds + `detail` line
- `src/components/cps/CpsActivityHistory.tsx`, `cps-activity-history.css` —
  render the detail line
- `src/tests/critical/cpsConversion.test.js` — schema-accurate column allowlist

Untouched by this phase: CPS calculations, Instant Markup, PDF architecture,
prefix/numbering, client workflow, import, columns, photos, group semantics,
conversion commercial fields, pricing calculations, and the Phase 1 audit/Voice
design.

---

## 11. Remaining Phase 3 prerequisites

1. **Make the Invoice lineage stamp transactional.** Extend
   `save_invoice_with_items_transaction` to carry the four lineage columns (and
   update `public._prov_install_tenant_rpcs` so future tenants inherit it).
   Closes the compensating-write gap in §5.
2. **Decide the Quotation ancestry rule for Invoice rows** once feedback lands:
   the columns are populated today (document + item), but no consumer exists.
3. **Revert flow lineage.** `revert_invoice_to_quotation_transaction` should
   carry legacy lineage if reverted quotations are expected to keep CPS ancestry.
4. **Missing-origin behaviour.** Phase 3 must define what happens when
   `source_cps_row_id` no longer resolves — Phase 2 preserves the pointer and
   deliberately never reassigns it.
5. **Payload promotion.** Phase 1's `_cps` audit payload still rides inside
   `audit_logs.changes`; promote it to a dedicated metadata column before the
   feedback chain grows, and link each feedback event to its causal parent via
   `parentEventId` (the `CONVERTED_TO_QUOTATION` event id is not yet stored on
   the quotation).
6. **Legacy backfill**, if ever desired, must come from an exact stored
   source — never from description, order, price, or catalog matching.
