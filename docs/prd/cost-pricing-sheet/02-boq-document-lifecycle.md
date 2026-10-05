# 02 — BOQ Document Lifecycle

> **Historical reference.** This file is a BOQ-era migration document. It is
> not the current CPS lifecycle contract. Use
> [01-cost-pricing-sheet-product-domain-architecture.md](01-cost-pricing-sheet-product-domain-architecture.md)
> and [03-cost-pricing-sheet-implementation-readiness-roadmap.md](03-cost-pricing-sheet-implementation-readiness-roadmap.md)
> for active CPS requirements. BOQ terminology in this file is historical
> context only.

**Part of the BOQ PRD package.** Entry point: [README.md](README.md).

**Date:** 2026-09-29
**Documentation standard:** ASD-STE100 Simplified Technical English
**Skills used:** writing-clearly-and-concisely
**Status:** Save, conversion, duplicate, lineage, audit, and export architecture RESOLVED. Planning authorization only.

**Source.** Split from `docs/prd/boq-architecture-prd.md`. Every section keeps its old section number in the heading. Example: `§3 (old §20)` means old section 20.

**Evidence rule.** Every claim marked *(evidence)* was verified against the repository.

**Companion documents.**

- [01 — BOQ Domain Architecture](01-boq-domain-architecture.md): identity, calculations, columns, persistence, migrations.
- [03 — BOQ Presentation Contract](03-boq-presentation-contract.md): V12 gate, FAB, View Page, pdfcn Forme PDF.

---

## §1. Save / Form Lifecycle Architecture (old §19)

### §1.1 Standards Applied

- `docs/standard/document-form-consolidation-standard.md` (current version, 2026-09-29)
- `docs/standard/document-save-orchestration.md`
- `docs/standard/lifecycle-ownership-standard.md`

The form consolidation standard lists BOQ as "Under active rebuild. Temporary state, not a permanent exception." *(evidence, §5)*. Its Rule 3 states that orchestration consolidation is mandatory while form UI sharing is conditional: a document with a structurally different domain model MUST use a dedicated form UI component inside its consolidated FormPage.

BOQ's domain is structurally different. Therefore BOQ uses a **dedicated** form UI component, not `SharedDocumentForm`. This is explicitly permitted by Rule 3.

### §1.2 Target File Layout

```text
src/pages/BoqFormPage.tsx            orchestration, mode: 'create' | 'edit'
src/pages/NewBoq.tsx                 3-line delegator: <BoqFormPage mode="create" />
src/pages/EditBoq.tsx                3-line delegator: <BoqFormPage mode="edit" />
src/components/boq/BoqFormScreen.tsx dedicated form UI (V12 transplant target)
src/components/boq/useBoqLineItems.ts   row + group operations
src/components/boq/boqFormUtils.ts      buildCustomFields · group meta helpers
src/components/boq/boqFormTypes.ts      editor state types
src/hooks/useBoqSave.ts                 DocumentSaveStrategy<BoqSaveInput>
```

Routes stay unchanged. `AppShell.tsx` lazy-loads `NewBoq` and `EditBoq` already *(evidence)*.

### §1.3 Mode Responsibilities

| Concern | create | edit |
| :--- | :-: | :-: |
| Next number query | ✔ | ✘ |
| Route-state prefill (project, client, import) | ✔ | ✘ |
| Data loading | ✘ | ✔ |
| Identity lock | ✘ | ✔ |
| Duplicate from editable | ✘ | ✔ |

### §1.4 Save Strategy

`useDocumentSave` *(evidence: `src/hooks/useDocumentSave.ts`)* supplies `validate`, `buildPayload`, `persist`, `afterSave`, `getNavigationTarget`.

| Hook | BOQ rule |
| :--- | :--- |
| `validate` | §1.5 plus identity check in edit mode |
| `buildPayload` | Synchronous. MUST NOT call `computeDocument` or `computeBoqTotals`. Totals arrive pre-computed |
| `persist` | Create: `withUniqueRetry` + `getNextBoqNumber` + cursor advance. Edit: plain update, no retry |
| `afterSave` | Audit emitters (§6), row persist, lineage writes |
| `getNavigationTarget` | `/boqs/:id` |

### §1.5 Validation Contract

Derived from V12's own save gate *(evidence: `save()` in the V12 candidate)*:

1. `boq_number` non-empty.
2. Every `row_type: 'standard'` row has a non-empty `description`.
3. Every standard row has `quantity > 0`.
4. Every standard row has `sp > 0`.
5. Group headers are exempt from (2)–(4).

Blocking errors highlight the offending row and scroll it into view, matching V12 behavior.

### §1.6 Lifecycle Placement

| Stage | Owner |
| :--- | :--- |
| Init | `createEmptyBoq` |
| Load | `BoqFormPage` edit branch |
| Hydrate | `normalizeDbBoq` + `resolveFinancialColumns` |
| Edit | Form state (V12 + commands) |
| Compute | Layer 1 + Layer 2, memoized in `BoqFormPage` |
| Validate | Strategy `validate` |
| Persist | Strategy `persist` + `useDocumentSave` |
| Export | Prepared data only (§7) |
| Convert | §3 |
| Revert | Out of scope for BOQ stage 1 |

---

## §2. BOQ → Quotation → Invoice Snapshot Lineage Model (old §8)

### §2.1 The Chain

```text
BOQ  ──convert(snapshot)──►  Quotation  ──convert(snapshot)──►  Invoice
 ▲                                ▲                                 │
 │                                │                                 │
 └────── NO backward propagation ◄─┴─────────────────────────────────┘
```

Each daughter document becomes independent after creation. Lineage records ancestry. It does **not** create live data synchronization.

### §2.2 Four Distinct Concepts

The package separates these. They must never be conflated.

| Concept | Definition | Exists? |
| :--- | :--- | :--- |
| **1. Conversion snapshot** | State copied at the instant of conversion. | Yes |
| **2. Lineage** | Ancestry links: source ↔ derived. A record of a past event. | Yes |
| **3. Audit history** | Field-diff and domain-event records of what happened. | Yes |
| **4. Live synchronization** | A subscription that propagates later parent edits into a child. | **No** |

Evidence that (4) does not exist *(evidence)*: the repository has no `onPostgresChange`, no `.channel(` subscription, and no parent/child observer for documents. The only subscriptions are in `src/App.tsx` and `src/pages/Settings.tsx`, neither of which is document sync.

### §2.3 Snapshot Rules

**BOQ → Quotation**

| When | Rule |
| :--- | :--- |
| At conversion | Copy state per §3. |
| After creation | Quotation is an independent daughter document. |
| After creation | Changing BOQ SP MUST NOT change the Quotation `unit_price`. |
| After creation | Changing BOQ tax, discount, columns, groups, or items MUST NOT mutate the Quotation. |
| After creation | Those changes MUST NOT transitively alter an Invoice created from that Quotation. |

**Quotation → Invoice**

| When | Rule |
| :--- | :--- |
| At conversion | Copy per the existing contract (§4). |
| After creation | Invoice is independent. |
| After creation | Later Quotation price edits MUST NOT change the Invoice. |
| After creation | Later Quotation commercial edits MUST NOT silently mutate the Invoice. |

**Never**

- Invoice → Quotation propagation.
- Invoice → BOQ propagation.
- Quotation → BOQ propagation.

### §2.4 Implementation Prohibitions

The following are prohibited. Any future agent that introduces them violates this package.

1. Adding a Postgres change listener to a parent document for the purpose of updating a child.
2. Storing a live parent foreign key used to re-read parent state during child render.
3. Recomputing a daughter document's totals from its parent's current rows.
4. Writing to a daughter from a parent mutation handler.
5. Adding a "sync", "refresh from source", or "update linked document" control.

Note: `quotations.source_boq_id` is a **lineage** foreign key *(evidence)*. It exists with `ON DELETE SET NULL` and a partial index. It MUST be read only by lineage and conversion surfaces. It MUST NOT be used to re-read BOQ rows.

### §2.5 Lineage Storage

| Document | Field | Content |
| :--- | :--- | :--- |
| BOQ | `custom_fields.conversionTrail.derived[]` | Quotations produced from it |
| Quotation | `custom_fields.conversionTrail.source` | `{ id, type: 'boq', number, project_id, po_number, created_at }` |
| Quotation | `source_boq_id` | Direct FK to `boqs.id` |
| Quotation | `custom_fields.conversionTrail.derived[]` | Invoices produced from it |
| Invoice | `custom_fields.conversionTrail.source` | `{ id, type: 'quotation', ... }` |

---

## §3. BOQ → Quotation Conversion Mapping (old §20)

### §3.1 Function

`convertBOQToQuotation` in `src/pages/view-boq-actions.ts`. It is rewritten to this contract.

### §3.2 Document Header Mapping

| BOQ source | Quotation target | Action |
| :--- | :--- | :--- |
| — | `quotation_number` | **Recomputed** via shared cursor + `getNextQuotationNumber` |
| `title` | `quotation_title` | Copied |
| `client_name` | `client_name` | **Copied** — see §3.5 |
| `vendor_name` | — | BOQ-only, omitted |
| `vendor_contact` | — | BOQ-only, omitted |
| `project_id` | `project_id` | Copied |
| `issue_date` | `issue_date` | Set to today (existing behavior) |
| `status` | `status` | `'open'` |
| `notes` | `notes` | **Copied** (new — currently missing) |
| `boq.id` | `source_boq_id` | FK written |
| — | `custom_fields.conversionTrail.source` | Written with `type: 'boq'` |
| — | `subtotal`, `total` | Zeroed; target recomputes on open |

### §3.3 Item Mapping

| BOQ row | Quotation row | Action |
| :--- | :--- | :--- |
| `row_type` | `row_type` | **Copied** after BOQ adopts `group_header`/`standard` ([01 §9](01-boq-domain-architecture.md)) |
| `group_id` | `group_id` | **Copied** |
| `group_name` | `group_name` | **Copied** |
| `sort_order` | `sort_order` | Rebased 0..n |
| `description` | `description` | Copied |
| `sub_description` | `sub_description` | **Copied** (new) |
| `make` | `make` | **Copied** (new — was `make_brand`, unmapped) |
| `quantity` | `quantity` | Copied |
| `unit` | `unit` | Copied |
| `sp` | `unit_price` | **Transformed** |
| `cp` | — | **Intentionally BOQ-only.** Not copied |
| — | `amount` | **Recomputed** = `quantity × unit_price` |
| `image_url` | `image_url` | **Copied** (new) |
| `vat_rate` | `vat_rate` | **Copied** (new) |
| `discount_rate` | `discount_rate` | **Copied** (new) |
| `install_rate` | `install_rate` | **Copied** (new) |
| `install_rate_override` | `install_rate_override` | **Copied** (new) |
| `install_rate_taxable` | `install_rate_taxable` | **Copied** (new) |
| `custom_data` | `custom_data` | **Copied** |
| `notes` (row) | `notes` (row) | Copied if present |

Group header rows keep `quantity = 0`, `unit_price = 0`, `cp = 0`.

### §3.4 Configuration Mapping

| BOQ `custom_fields` key | Quotation `custom_fields` key | Action |
| :--- | :--- | :--- |
| `groupMeta` | `groupMeta` | Copy verbatim |
| `calculationInputs` | `calculationInputs` | Copy verbatim |
| `extraCharges` | `extraCharges` | Copy verbatim |
| `showItemImages` | `showItemImages` | Copy verbatim |
| `columnConfig` | `columnConfig` | **Transformed** per the strip/rename rule below |
| `conversionTrail` | `conversionTrail.source` | Write source; do not copy `derived` |
| `template_id`, palette, `table_rows` | — | BOQ-only, omitted |

**Column config transform rule:**

1. `sp` → key renamed to `unit_price`, label, `visibilityMode`, and order preserved.
2. `cp` → **removed**. It has no Quotation counterpart.
3. `sub_description` → never present ([01 §8](01-boq-domain-architecture.md)).
4. All other keys (`description`, `quantity`, `make`, `unit`, `amount`, `install_rate`, `vat_rate`, `discount_rate`, `custom_*`) → copied verbatim.
5. Result passes through `resolveFinancialColumns` before persisting.

This rule prevents BOQ-only keys from reaching `quotation_items`.

### §3.5 Client Field Correction

`boqs` has **both** `client_name` and `vendor_name` *(evidence: migration `20260826000000`)*. The current code sets `client_name: boq.vendor_name || boq.client_name`.

**Target:** `client_name → client_name`, with `vendor_name` used only as a legacy fallback when `client_name` is empty. Rationale: `vendor_name` names the supplier. Quotation's `client_name` names the customer.

This inverts the current preference. It is recorded as a defect correction, not a new feature. Open question Q3 in [README §9](README.md).

### §3.6 Unknown-Column Protection

**Defect (evidence).** `toQuotationItemRow` calls `toDbItem`, which spreads remaining item keys. BOQ rows carry `cp`, `sp`, `specification`, `make_brand`. `quotation_items` has no such columns.

**Rule:** conversion MUST construct the Quotation row from an explicit whitelist. It MUST NOT spread a BOQ row.

```ts
// Target shape — explicit construction, never a spread
function toQuotationItemRowFromBoq(boqRow, quotationId, sortOrder) { /* explicit fields only */ }
```

### §3.7 Conversion Classification

| Class | Items |
| :--- | :--- |
| **Copied** | description, sub_description, make, quantity, unit, row_type, group_id, group_name, image_url, vat_rate, discount_rate, install_rate overrides, custom_data, row notes, groupMeta, calculationInputs, extraCharges, showItemImages, notes, project_id |
| **Transformed** | `sp → unit_price`; `columnConfig.sp → unit_price`; `columnConfig.cp` removed; client field preference |
| **Recomputed** | `quotation_number`, `amount`, `sort_order`, `issue_date` |
| **Intentionally BOQ-only** | `cp`, total cost, gross profit, margin, template/palette, `vendor_name`, `vendor_contact` |
| **Intentionally omitted** | `custom_fields.table_rows`, `table_columns` |

### §3.8 Post-Conversion

1. Advance the Quotation cursor after a successful automatic allocation.
2. Emit Quotation `LINK` audit + `LINKED` activity.
3. Write `conversionTrail.derived` on the source BOQ.
4. Never write back to the BOQ.

### §3.9 Known Conversion Defects (evidence, fixed by this contract)

| # | Defect | Fix |
| :--- | :--- | :--- |
| 1 | Groups lost — `'group_header'` never matches BOQ `'section'` | §3.3 copy after [01 §9](01-boq-domain-architecture.md) vocabulary adoption |
| 2 | CP discarded through unknown-column spread | §3.6 explicit whitelist; `cp` omitted by design |
| 3 | `make_brand` / `specification` unmapped | §3.3 `make`, `sub_description` rows |
| 4 | `notes` unmapped | §3.2 notes row |
| 5 | `client_name` vs `vendor_name` preference inverted | §3.5 (open Q3) |
| 6 | `DocumentTrailLink.type` has no `'boq'` | §4.4 |

---

## §4. Quotation → Invoice Snapshot Boundary (old §21)

### §4.1 Current Behavior (verified)

`convertQuotationToInvoice` in `src/pages/view-quotation-actions.ts` *(evidence)*:

1. Reads invoice numbers and the Quotation's `custom_fields`.
2. Allocates an invoice number through `getNextInvoiceNumber` + `fetchAutoCursor`.
3. Builds `sourceLink` with `type: 'quotation'`.
4. Deep-copies items with `JSON.parse(JSON.stringify(item))` and sets `id: null`.
5. Writes `custom_fields: withSourceTrail(quotationCustomFields, sourceLink)` — the **whole** Quotation `custom_fields` becomes the Invoice `custom_fields`. This is the commercial-configuration snapshot.
6. Persists atomically via `save_invoice_with_items_transaction` RPC when `entityId` is present; otherwise sequential inserts.
7. Writes `appendDerivedTrail(quotationCustomFields, derivedLink)` back to the Quotation.
8. Advances the Invoice cursor.

### §4.2 Verdict

**The existing Quotation → Invoice path already satisfies the snapshot rule (D10, D11).**

- Items are deep-copied with `id: null` — a genuine snapshot, not a reference.
- No parent observer exists *(evidence: no `onPostgresChange`, no document `.channel(`)*.
- No code path re-reads a Quotation to recompute an Invoice.

**No remediation is required for the snapshot rule.** Invoice price changes are authoritative for that Invoice. Downstream edits never flow backward.

### §4.3 Compatibility Requirement on BOQ's Lineage Model

BOQ's lineage model MUST NOT weaken this:

1. BOQ MUST NOT add a parent observer.
2. BOQ's `conversionTrail.source` MUST carry `type: 'boq'` so the chain reads correctly.
3. BOQ MUST use the same `withSourceTrail` / `appendDerivedTrail` helpers in `src/domain/documentConversion.ts`.
4. BOQ MUST NOT introduce a `source_boq_id`-style live re-read during Quotation render.

### §4.4 Known Drift (evidence, not a snapshot defect)

| Item | Status |
| :--- | :--- |
| `DocumentTrailLink.type` is `'invoice' \| 'quotation'` | No `'boq'`. A BOQ source cannot be typed correctly |
| `buildTrailLink({ type: 'quotation' })` used for the BOQ source | Mislabels the source |

Both are lineage correctness issues, not synchronization issues. [01 §18.6](01-boq-domain-architecture.md) records the type update.

---

## §5. Duplicate / Transformation Contract (old §22)

### §5.1 Standard Requirement

`docs/standard/document-transformation-standard.md` §3, "The Duplicate Law (New Origin)" *(evidence)*:

> A duplicated document is a clean draft pre-filled with the original's line items and pricing, but **no identity, no client, no payments, no lineage — a new origin.**

Also: duplicates carry all item-level financial data but shed client, document identity, and lineage.

### §5.2 Current Defect

`duplicateBOQRecord` in `src/pages/view-boq-actions.ts` fetches the `boqs` row, strips `id`/`created_at`/`updated_at`/`boq_number`, and inserts a new `boqs` row.

**It never reads or writes `boq_rows`.** All items, groups, columns, photos, and commercial settings are lost. *(evidence — the function contains no `boq_rows` statement.)*

This is a defect. The target contract fixes it.

### §5.3 Target Contract

| Aspect | Target |
| :--- | :--- |
| Identity | New `id`. No identity carried |
| Number | Fresh automatic allocation through `withUniqueRetry`. Never reuses the source number |
| Lineage | **Shed.** `conversionTrail` empty. No `source_boq_id` |
| Client / vendor identity | **Shed.** `client_name`, `vendor_name`, `client_id` cleared |
| Project link | Cleared |
| Status | `'open'` |
| Issue date | Today |
| Items | **Copied** — all rows, including `cp`, `sp`, `sub_description`, `image_url`, `custom_data` |
| Groups | **Copied** — `row_type`, `group_id`, `group_name`, `groupMeta` |
| Columns | **Copied** — `columnConfig` |
| Custom data | **Copied** |
| Photos | **Copied** — `image_url` values retained |
| Commercial settings | **Copied** — `calculationInputs`, `extraCharges`, `showItemImages`, discount/WHT types |
| CP / SP | **Copied** — item-level financial data is preserved |
| Notes / terms | **Copied** |
| Title | Copied |
| Audit | `CREATE` on `audit_logs` + `CREATED` on `activity_events` (matches Quotation duplicate, evidence) |

**Source-state preference.** When duplicating from an editable state, the duplicate reflects what the user currently sees, not the last saved version *(standard §3 recovery rule)*.

### §5.4 Order of Operations

1. Persist the current editable state (or read it from memory).
2. Strip identity, lineage, client, and project.
3. Allocate the new number through `withUniqueRetry`.
4. Insert `boqs`.
5. Insert `boq_rows` with rebased `sort_order` and new row ids.
6. Write `custom_fields` minus lineage.
7. Advance the cursor.
8. Emit audit.
9. Navigate to form view in unsaved state (standard §2.4.3).

---

## §6. Lineage and Audit Contract (old §23)

### §6.1 Audit Infrastructure (verified)

| Piece | Status | Evidence |
| :--- | :--- | :--- |
| `audit_logs.entity_type` | `text NOT NULL`, **no CHECK** | `20260520090008_audit_activity.sql` |
| `activity_events.entity_type` CHECK | **includes `'boq'`** | `20260707000000_receipt_snapshot_and_idempotency.sql` line 121 |
| `activity_events.event_type` CHECK | `CREATED, UPDATED, STATUS_CHANGED, PAYMENT_RECORDED, LINKED, UNLINKED, NOTE_ADDED, DOCUMENT_ADDED, ARCHIVED, UNARCHIVED, RECEIPT_GENERATED, RECEIPT_VOIDED` | same migration |
| Generic RPC `record_activity_event` | Accepts any `p_entity_type` | `20260520089999_audit_activity_bootstrap.sql` |
| Generic RPC `record_audit_log` | Accepts any `p_entity_type text` | same |
| App helper `recordAuditLog` | `AuditEntityType` **lacks `'boq'`** | `src/lib/audit.ts` |
| `BOQ_TRACKED_FIELDS` | **Absent** | `src/lib/audit.ts` |
| `recordBoq*` emitters | **Absent** | `src/lib/audit.ts` |
| BOQ rows in the standard's coverage matrix | **Absent** | `docs/standard/audit-trail-standard.md` §6 |

### §6.2 Migration Conclusion

**No migration is required for BOQ audit entity coverage.**

- `activity_events.entity_type` already permits `'boq'`.
- `audit_logs.entity_type` is unconstrained.
- Both generic RPCs accept `'boq'`.

This corrects an assumption that a BOQ audit whitelist migration would be needed. It is not.

No new event type is required. Quotation duplicate uses `action: 'CREATE'` on `audit_logs` *(evidence)*, and `CREATED` already exists on `activity_events`.

### §6.3 Required Application Code

```text
src/lib/audit.ts
  + 'boq' added to AuditEntityType
  + BOQ_TRACKED_FIELDS
  + recordBoqCreated(...)
  + recordBoqUpdated(...)          // field-diff via recordAuditLog
  + recordBoqStatusChanged(...)
  + recordBoqLinked(quotationId, convertedFromBoqId)
```

Generic RPCs are sufficient. A dedicated `record_boq_created` RPC is **not** required.

### §6.4 Event Matrix

| BOQ event | `audit_logs` action | `activity_events` event_type | Payload |
| :--- | :--- | :--- | :--- |
| Create | `CREATE` | `CREATED` | `BOQ_TRACKED_FIELDS` |
| Meaningful edit | `UPDATE` | `UPDATED` | field diff of tracked fields |
| Duplicate | `CREATE` | `CREATED` | tracked fields |
| Status change | `STATUS_CHANGE` | `STATUS_CHANGED` | old/new |
| Convert to Quotation | `LINK` | `LINKED` | target id + number |
| Archive | `ARCHIVE` | `ARCHIVED` | reason |
| Delete | `DELETE` | — | `activity_events` has no `DELETED` type |

**`BOQ_TRACKED_FIELDS` must include:** `boq_number`, `title`, `client_name`, `vendor_name`, `status`, `issue_date`, `project_id`, `template_id`, `notes`, `columnConfig`, `groupMeta`, `calculationInputs`, `extraCharges`, `showItemImages`.

**Row-level price state at conversion.** The standard's `audit_logs.changes` is a JSONB array of field diffs. BOQ MUST record SP changes at item granularity when a conversion happens, so the audit trail can explain "SP was X at conversion". The mechanism is `activity_events.metadata` on the `LINKED` event:

```json
{ "boq_number": "BOQ-000012", "quotation_number": "QTN-000045", "item_count": 42, "total_selling_price": 1850000, "total_cost": 1500000, "gross_profit": 350000 }
```

This is a one-time snapshot in metadata. It creates no subscription.

### §6.5 What Audit Must Be Able to Explain

1. BOQ creation.
2. Meaningful BOQ edits (tracked field diffs).
3. BOQ duplication.
4. BOQ → Quotation conversion, with price state at that instant.
5. Source/daughter relationship in both directions.
6. That lineage is ancestry, not synchronization.

---

## §7. Export Contract (old §26)

### §7.1 Defect (verified)

| Location | Current value | Correct value |
| :--- | :--- | :--- |
| `src/services/exportFetchers.ts:51` | `BOQS: 'boq_items'` | `boq_rows` |
| `src/utils/exportCompilers.ts:126` | `possibleItemProps` includes `'boq_items'` | `boq_rows` |
| `src/utils/exportCompilers.ts:176` | `itemsKey = 'boq_items'` for `BOQS` | `boq_rows` |

`boq_items` does not exist *(evidence)*. The child table is `boq_rows`.

### §7.2 Required Correction

1. `ITEMS_TABLE_MAP.BOQS` → `'boq_rows'`.
2. `flattenLineItems` `itemsKey` for `BOQS` → `'boq_rows'`.
3. `possibleItemProps` → add `'boq_rows'`.
4. Line-item property name in the flattened record must match the schema used by the BOQ export schema definition. Verify `domainSchemas.BOQS` during implementation.

### §7.3 Field Mapping for Export

| BOQ export column | Source |
| :--- | :--- |
| `#` | row index |
| Description | `description` |
| Sub Description | `sub_description` |
| Make / Brand | `make` |
| Quantity | `quantity` |
| Unit | `unit` |
| CP | `cp` |
| SP | `sp` |
| Amount | derived |
| Group | `group_name` |

### §7.4 Verification Requirement

The reconstruction MUST include a static check that no `boq_items` string remains anywhere under `src/`.

---

## §8. Lifecycle Risks (old §35, lifecycle share)

| ID | Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R7 | Conversion writes unknown columns | Insert failure | High today | Explicit row whitelist (§3.6) |
| R8 | Conversion loses groups | Structural loss | High today | Adopt Quotation row vocabulary ([01 §9](01-boq-domain-architecture.md)) |
| R9 | Duplicate copies only the parent row | Complete item loss | **Certain today** | Rewrite per §5 |
| R12 | Export queries a nonexistent table | Export fails | **Certain today** | §7 fixes |
| R15 | CP leaks into a Quotation | Identity breach (I6) | Medium | Column strip rule (§3.4); conversion test |
| R16 | Lineage misread as sync by a future agent | Unauthorized live sync | Medium | §2.4 prohibitions |
| R17 | `vendor_name` → `client_name` mapping wrong | Wrong customer on quotes | Medium | §3.5; confirm in [README §9](README.md) Q3 |

---

## §9. Lifecycle Acceptance Criteria (old §38, lifecycle share)

A future implementation agent can accept the lifecycle architecture when it can answer **yes** to every item.

### Lineage
- [ ] BOQ → Quotation → Invoice snapshot ownership is unambiguous (§2).
- [ ] The four concepts — snapshot, lineage, audit, live sync — are distinguished.
- [ ] The package states that live synchronization does not exist and must not be introduced (§2.2).
- [ ] Five concrete implementation prohibitions are listed (§2.4).
- [ ] The existing Quotation → Invoice path is verified as already snapshot-based (§4.2).

### Conversion, duplicate, audit, export
- [ ] Conversion loss points are eliminated or explicitly intentional (§3.7).
- [ ] CP is listed as intentionally BOQ-only, with the rationale for its loss.
- [ ] The unknown-column defect has a concrete fix (§3.6).
- [ ] Duplicate copies child rows, columns, groups, photos, and commercial settings (§5.3).
- [ ] Duplicate sheds identity, client, and lineage per the Duplicate Law.
- [ ] Lineage and audit accurately represent BOQ (§6).
- [ ] Audit needs **no** migration, with the evidence stated (§6.2).
- [ ] The export defect is specified with exact file and line references (§7.1).
- [ ] Save lifecycle uses `useDocumentSave` with a synchronous `buildPayload` (§1.4).
- [ ] Validation matches the V12 save gate (§1.5).
