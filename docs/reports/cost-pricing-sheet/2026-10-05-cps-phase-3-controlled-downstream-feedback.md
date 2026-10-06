# CPS Phase 3 — Controlled Downstream Item Feedback

**Date:** 2026-10-05
**Scope:** Cost & Pricing Sheet (CPS) downstream feedback
**Status:** Complete
**Migration:** `20261005160000_tenant_rpc_cps_downstream_feedback.sql`

---

## 1. Purpose

Phase 1 built the CPS audit trail and the row lineage.
Phase 2 built the conversion chain and the authority handoff.
Phase 2.5 hardened integrity and moved lineage into the save transaction.

Phase 3 adds one controlled capability: an approved downstream edit can flow
back into the CPS row that the document came from.

Phase 3 does not change the conversion. The initial CPS to Quotation conversion
stays a snapshot creation. Feedback is the only return path, and it is narrow.

---

## 2. Approved fields

Feedback can write exactly three CPS fields. Nothing else.

| Downstream field | CPS field | Audit label | Value kind |
| --- | --- | --- | --- |
| `unit_price` | `sp` | Selling price | money |
| `description` | `description` | Description | text |
| `image_url` | `image_url` | Image | image |

The constant `CPS_FEEDBACK_FIELDS` in `src/domain/cps/feedback.ts` is the single
source of the list.

**Forbidden fields.** Feedback never writes: `cp`, quantity, unit, make or
brand, specification or sub-description, `group_id` or `group_name`, notes,
site or project, VAT, WHT, discount, additional charges, totals, client,
document title, issue date, custom fields, and every other field.

A downstream value cannot create a CPS row. A downstream deletion is not an
upstream deletion. `cp` is never a feedback target, because a downstream
commercial price is a selling price only.

---

## 3. Feedback planner design

The planner lives in `src/domain/cps/feedback.ts`. It is a pure function.

It has no network import, no Supabase import, no clock, and no random value.
It reads only the caller's before and after row state plus the resolved
authority, and it returns a plan. The persistence layer applies the plan.
No diff logic hides inside a save hook.

`planCpsFeedback` returns a plan with these parts:

- `ok` — true when the authority gate passed.
- `reason` — the refusal reason, or null.
- `chainId`, `sourceDocumentId`, `sourceDocumentType`, `sourceDocumentNumber`.
- `sourceCpsId` — the CPS root that the plan targets.
- `mutations` — one entry per changed row that may be applied.
- `skipped` — diagnostic rows that could not participate.

A plan with `ok: true` and zero mutations is normal. An ordinary save is not a
feedback event.

**Skip reasons.** `authority-mismatch`, `no-chain`, `invalid-source-document`,
`invalid-lineage`, `ambiguous-lineage`, `row-not-in-baseline`, `section-row`.

A skip is a diagnostic. A skip is never a retarget.

### Canonical values

Feedback uses the same normalisation as the CPS audit diff. It does not invent
a second rule.

- Price: a blank value is zero. A non-finite value is zero. So `25000` and
  `25000.00` are equal, and `''` and `0` are equal.
- Text: trimmed. Whitespace-only noise is not a change.
- Image: trimmed. An empty value is null, which means "no image".

---

## 4. Authority enforcement

The gate reads persisted state only. It never reads edit recency, document
status, document number, or client state.

A plan is allowed only when all of these conditions hold:

1. The document belongs to a conversion chain.
2. The chain has an authority row.
3. The authority stage equals the saving document type.
4. The authority document id equals the document that is being saved.
5. The chain ids agree, when the authority row records a chain id.

Any other combination refuses the plan.

The authority row is the single quotation row with
`feedback_authority IS NOT NULL` for the chain. `readChainAuthority` in
`src/domain/cps/lineageStore.ts` reads it.

The tenant RPC re-validates the whole gate in SQL before it writes anything. A
stale or forged client plan cannot retarget a CPS row.

---

## 5. Lineage resolution

A downstream row participates only when it carries a persisted
`source_cps_id` and `source_cps_row_id` pair. Nothing else is consulted. The
planner never uses description, `item_id`, row order, price, quantity, unit,
image, group, or text similarity.

The planner indexes rows by the key `source_cps_id|source_cps_row_id`. Then:

- A row with no lineage is downstream-only. It can never create, attach to, or
  inherit a CPS row.
- A row with an incomplete or non-persistable lineage pair is not indexed. It
  is not even reported, because it never claimed ancestry.
- A lineage key that appears more than once is ambiguous. The planner refuses
  both occurrences (`ambiguous-lineage`). An ambiguous identity must never
  decide a target.
- A row whose key is absent from the before-state was added downstream. It is
  refused (`row-not-in-baseline`). It never creates a CPS row.
- A `section` or `group_header` row never participates.

The planner reads the before-state from the database, not from editor state.
The helper `loadCpsFeedbackRows` reads the persisted item rows for the
document, ordered by `sort_order`.

A failed baseline read **throws**. It is never flattened into an empty
baseline, because an empty baseline would classify every linked row as "added
downstream" and would silently suppress the feedback that the user performed.

---

## 6. Transaction architecture

Two paths exist. They differ in how the plan is committed.

### 6.1 Authoritative transactional path — the Invoice

`save_invoice_with_items_transaction` gained one defaulted argument,
`p_cps_feedback jsonb DEFAULT NULL`. The function now runs:

```sql
IF p_cps_feedback IS NOT NULL THEN
    PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback);
END IF;
```

This runs after the item INSERT loop and before the saved invoice is read back
and returned.

Result: the invoice, its item rows, the CPS mutation, and both causal audit
events commit in **one transaction**. A feedback failure rolls the invoice save
back. The two stores can never diverge on this path.

The default value keeps every existing 4-argument call working unchanged.

### 6.2 Compatibility path — the Quotation

A Quotation save has no composite RPC. The client writes `quotation_items` with
a delete, then an insert. The hook therefore:

1. reads the persisted item baseline **before** the delete and insert,
2. writes the item rows,
3. calls `apply_cps_item_feedback_transaction`.

The RPC itself is atomic: the CPS mutation and both causal audit events commit
together. But the quotation save and the feedback are two transactions.

**Risk statement.** A process death between the item write and the feedback RPC
leaves the quotation saved and the CPS row unchanged. That window is narrow
and it is never silent: an RPC failure is logged and shown to the user as a
warning ("Saved, but the pricing sheet was not updated"). The user can re-save
the quotation to retry, because the RPC is field-diff idempotent.

The authoritative path removes this window. The compatibility path cannot,
because the Quotation save is not transactional today. Moving the Quotation
save onto a composite RPC is the natural follow-up, and it is out of Phase 3
scope.

### 6.3 Ordering

On both paths, `apply_cps_item_feedback_transaction` re-validates the authority
gate and the lineage gate from persisted state before any row changes.

---

## 7. Quote path

A Quotation edit feeds back only while the Quotation is the active authority
of its chain. The gate checks `authority.stage === 'quotation'` and
`authority.documentId === <this quotation id>`.

After the conversion to an Invoice, the Quotation stops feeding back, because
the authority has moved to the Invoice.

The Quotation path reads the baseline only when the quotation has a conversion
chain. A quotation with no chain reads nothing extra and calls no RPC.

## 8. Invoice path

An Invoice edit feeds back only while the Invoice is the active authority.
The gate checks `authority.stage === 'invoice'` and
`authority.documentId === <this invoice id>`.

An Invoice created by the conversion carries `source_quotation_id` and
`conversion_chain_id`. The Invoice form does not create chain-linked invoices,
so the effective path is the update path.

The CPS root is re-derived in SQL from the chain owner. A stale client value
cannot retarget the mutation.

The Invoice path reads the baseline only when
`initialInvoiceSnapshot.conversion_chain_id` is present. A non-CPS invoice
reads nothing extra and passes no extra RPC argument.

`cp` is never written. The planner maps `unit_price` to `sp` only.

---

## 9. Revert behaviour

A revert removes the Invoice and returns authority to a newly created
Quotation **inside the same chain**. The chain keeps exactly one authority row.

After a revert:

- A Quotation edit feeds back again. The authority row has `stage: 'quotation'`
  and points at the reverted quotation.
- An Invoice save can no longer feed back. The RPC returns
  `authority-mismatch`.

The revert does not change CPS content. Lineage survives the revert, so the
reverted quotation can still feed back.

---

## 10. Duplicate behaviour

A duplicate is a clean draft. Both duplicate entry points strip lineage:

- `duplicateQuotationRecord` applies `withoutLineage` to every copied item.
- `duplicateInvoice` writes `source_quotation_id: null` and
  `conversion_chain_id: null`.

A duplicated document therefore has no chain and no lineage. It cannot claim
ancestry over a CPS it did not come from, and it can never feed back.

---

## 11. Missing-origin behaviour

The originating CPS row is re-read inside the RPC. It must still exist in the
same CPS document.

- When the CPS row is missing, the mutation is skipped. The row is **not**
  recreated and **not** guessed.
- When the downstream lineage no longer matches exactly one persisted item
  row, the mutation is skipped (`Lineage unavailable` or `Ambiguous lineage`).

The skip count is returned in the RPC result and is written to the CPS audit
trail as a `FEEDBACK_SKIPPED` event. A skip is always auditable.

---

## 12. Image clear semantics

An image change happens only when the after row **owns** the `image_url` field.

- An explicit value sets the CPS image.
- An explicit empty value or null clears the CPS image.
- An **omitted** field is not a change. Serialization omission must never clear
  a CPS image.

This is why the planner uses an own-property check and not a truthiness check.

A description clear is refused. The downstream domain requires a non-empty item
description, so the RPC drops a blank description instead of writing it.

---

## 13. Audit causality

Feedback writes two events on the CPS timeline, in this order:

1. `DOWNSTREAM_ITEM_UPDATED` — the human edit that the user performed.
   - `actorType: 'user'`
   - `parentEventId: null`
   - changes: the downstream old and new values
2. `CPS_FEEDBACK_APPLIED` — the automatic consequence.
   - `actorType: 'automated-feedback'`
   - `actor_id: NULL`, `actor_label: 'Automated feedback'`
   - `parentEventId`: the id of event 1
   - changes: the CPS values that were really replaced

The parent event is written **first**, and its id is captured with
`RETURNING id INTO v_parent_id`. The automatic consequence therefore always has
an existing causal parent.

The automatic event is a system event. The human actor is never falsified as
the direct CPS editor. The actor identity travels in the detail line, for
example: `From Quotation QTN-000432 · amina@bigdrops.com`.

A skipped mutation writes a third event, `FEEDBACK_SKIPPED`, with
`actorType: 'system'` and the diagnostics joined into the detail line.

The Activity History shows the chain behind a disclosure. The disclosure
labels the context with the related document number. A raw id is never the
label; the id stays in the tooltip.

`src/domain/audit/auditTypes.ts` gained the three event types.
`src/domain/cps/auditDiff.ts` maps all three to the `UPDATE` action and adds
`CPS_AUDIT_SOURCE.downstreamFeedback`.

---

## 14. Tenant safety

- Every read and write uses the caller's tenant client.
- The RPC resolves every table through the caller's own schema (`__SCHEMA__`).
  There is no global join across entity schemas.
- The RPC requires `public.has_entity_permission(p_entity_id, auth.uid(),
  <document type>, 'edit')`. A user without that permission gets
  `insufficient_privilege`.
- The CPS root is re-derived from the chain owner inside the schema.
- For an Invoice, the RPC also verifies that the invoice belongs to the chain:
  `id = v_source_doc_id AND source_quotation_id = <authority row> AND
  conversion_chain_id = v_chain_id`.
- No cross-tenant id is accepted.

---

## 15. Idempotency

Two layers protect against duplicate writes.

1. **Plan level.** When the approved fields do not change, `planCpsFeedback`
   returns zero mutations. `buildCpsFeedbackPayload` then returns null, and the
   caller opens no transaction at all.
2. **Field-diff level.** Inside the RPC, a mutation whose approved fields
   already hold the incoming values writes nothing and records nothing
   (`IF v_mutation_applied = 0 THEN CONTINUE`). A retry therefore cannot
   duplicate a feedback event.

The authority gate is also idempotent. It converges on the same state when it
is repeated.

---

## 16. Schema and RPC changes

Migration `supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql`
(2125 lines) is generated by `scripts/gen-cps-phase3-tenant-rpcs.cjs` from the
Phase 2.5 installer. The generator has `ANCHOR MISSING` and `ANCHOR NOT UNIQUE`
guards, so a silent anchor drift cannot happen.

Three changes:

1. **Block 1 signature.** `save_invoice_with_items_transaction` gains
   `p_cps_feedback jsonb DEFAULT NULL::jsonb`.
2. **Block 1 body.** One `PERFORM` call to
   `apply_cps_item_feedback_transaction`, after the item INSERT loop.
3. **New block 29.** `apply_cps_item_feedback_transaction(p_entity_id uuid,
   p_feedback jsonb) RETURNS jsonb`.

No table, column, or index changed. The migration ends with
`NOTIFY pgrst, 'reload schema'`.

The installer keeps one tenant-RPC installer
(`public._prov_install_tenant_rpcs`). The backfill guard requires
`activity_events`, `audit_logs`, `invoices`, `invoice_items`, `quotations`,
`quotation_items`, `cps_sheets`, and `cps_rows`. A schema that is missing any of
them is skipped.

### Verified live

| Check | Result |
| --- | --- |
| Migration applied (Local == Remote) | `20261005160000` on both |
| `apply_cps_item_feedback_transaction` present | 11 of 11 provisioned entity schemas |
| `save_invoice_with_items_transaction` argument count | 5 in 11 of 11 |
| Unprovisioned schemas skipped | 3 (agam, issa-certified, ororo) |

### Functional RPC verification

The RPC was executed against `entity_bigdrops-main_main` with `mutations: []`.
Every call wrote nothing (`applied: 0`), and the audit table gained no rows.

| Input | Result |
| --- | --- |
| `sourceDocumentType: 'waybill'` | `{"applied":0,"skipped":0,"status":"unsupported"}` |
| Valid permission, no chain id | `{"applied":0,"skipped":0,"status":"no-op"}` |
| Valid permission, unknown chain | `{"applied":0,"skipped":0,"status":"authority-mismatch"}` |
| User without `quotation/edit` | Raises `insufficient_privilege` at line 52 |

---

## 17. Files changed

### New in this phase

| File | Lines | Role |
| --- | --- | --- |
| `src/domain/cps/feedback.ts` | 444 | Pure feedback planner |
| `src/domain/cps/feedbackStore.ts` | 374 | Persistence layer and RPC call |
| `scripts/gen-cps-phase3-tenant-rpcs.cjs` | 572 | Migration generator |
| `supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql` | 2125 | Tenant RPCs |
| `src/tests/critical/cpsDownstreamFeedback.test.js` | 905 | Focused suite, 31 tests |

### Modified in this phase

| File | Change |
| --- | --- |
| `src/hooks/useInvoiceSave.ts` | Plans feedback and passes `p_cps_feedback` into the composite save RPC |
| `src/hooks/useQuotationSave.ts` | Captures the baseline, then applies feedback after the rows persist |
| `src/domain/audit/auditTypes.ts` | Three new CPS event types |
| `src/domain/cps/auditDiff.ts` | Action map and `CPS_AUDIT_SOURCE.downstreamFeedback` |
| `src/components/cps/CpsActivityHistory.tsx` | Chain disclosure; labels the context instead of printing a raw id |
| `src/components/cps/cps-activity-history.css` | `.cps-ah-chain-label` |
| `src/tests/critical/cpsChainIntegrity.test.js` | Replaced the Phase 2.5 "no feedback" guard with a Phase 3 scope guard |

---

## 18. Tests

`src/tests/critical/cpsDownstreamFeedback.test.js` — 31 tests, 31 pass. The
tests cover the full A to K matrix. The numbered cases run from 1 to 46:

| Group | Cases | Content |
| --- | --- | --- |
| A | 1–11 | Quotation is the active authority; three approved fields; every other field is inert; an equal value is not a change |
| B | 12–15 | Refusal on authority mismatch, no authority, no chain, no document id, and a foreign chain |
| C | 16–20 | Invoice is the active authority; stage and document identity |
| D | 21–22 | A revert returns authority to the quotation and stops invoice feedback |
| E | 23–28 | Added rows, incomplete lineage, ambiguous lineage, section rows, per-row targeting |
| F | 29–30 | Image clear semantics; omission is not a clear |
| G | 31–38 | Labels, value kinds, event types, causal order, system actor, document label |
| H | 39–41 | No transaction for an unchanged save; null payload; field-diff idempotency |
| I | 42–43 | A duplicate strips lineage and cannot feed back |
| J | 44 | Tenant safety and the exact RPC payload |
| K | 45–46 | Pure planner; no forward sync; `cp` never appears |

Seven more tests cover failure reporting and the wiring contracts: a failed
baseline read, a failed transaction, an unexpected RPC status, a document with
no chain, and the Invoice path, the Quotation path, and persisted-state
planning.

`src/tests/critical/cpsChainIntegrity.test.js` replaces the old Phase 2.5
"no Phase 3 feedback is implemented by any Phase 2.5 file" guard. The new
guards are:

1. **Feedback is confined to the controlled boundary.** Only the planner, its
   persistence layer, and the two save hooks may reference feedback. Nine
   lineage, conversion, view, and lifecycle modules must stay feedback-free.
   No module writes `cps_rows` directly and none writes CPS commercial fields
   into a document.
2. **Only three fields are writable.** The planner tuple is exactly
   `['sp', 'description', 'image_url']`, the RPC refuses any other field, and
   the string `'cp'` never appears in the migration.

---

## 19. Verification

| Command | Result |
| --- | --- |
| `bun run audit:load` | Exit 0. Only pre-existing findings; none in a Phase 3 file. |
| `bun run typecheck` | Exit 0 (`tsc --noEmit`). |
| Focused suite (`cpsDownstreamFeedback`) | 31 tests, 31 pass, 0 fail. |
| Affected suites (8 CPS suites) | 162 tests, 162 pass, 0 fail. |
| `bun run test` | 770 tests, 757 pass, 13 fail. |
| `git diff --check` | Exit 0. |
| `git status --short` | Only the Phase 3 files. |
| `bun run build` | **Not executed**, as required by the 4 GB RAM limit. |

### Baseline failure identity

The 13 failures are byte-identical to the documented pre-Phase-3 baseline:

- 3 loader failures: `cpsIndustry`, `cpsLedger`, `cpsPdf` (`.tsx` and `.woff`).
- 4 browser-environment failures: `invoiceAccountingIntegration`,
  `paymentAccountingIntegration`, `remediationContract`,
  `sourceTransactionContract`.
- 5 stale `cpsViewProductionRedesign` tests.
- 1 `itemCleanupExportImport` test (`validateFlaggedCleanupImport`).

Test count grew from 738 to 770. No new failure was introduced.

### Acceptance criteria

| # | Criterion | Result |
| --- | --- | --- |
| 1–11 | Only the three approved fields feed back, from the active authority | Pass |
| 12–15 | A non-authority save is refused | Pass |
| 16–20 | The Invoice path feeds back while it owns authority | Pass |
| 21–22 | A revert returns authority to the Quotation | Pass |
| 23–28 | Lineage identity rules hold; no guessing | Pass |
| 29–33 | Image clear semantics, missing origin, retry safety | Pass |
| 34 | Cross-tenant feedback is prevented | Pass |
| 35–36 | CPS edits do not propagate downstream; CPS calculations are unchanged | Pass |
| 37 | Existing totals recompute through the canonical authority | Pass (no total is written) |
| 38–39 | Activity History is understandable; no raw UUID is primary | Pass |
| 40 | `bun run typecheck` passes | Pass |
| 41 | `bun run audit:load` passes | Pass |
| 42–43 | Focused and affected tests pass; only baseline failures remain | Pass |
| 44–45 | `git diff --check` passes; `git status` shows exact scope | Pass |
| 46 | `bun run build` is not executed | Pass |
| 47 | The report is complete | Pass |

---

## 20. Remaining limitations

1. **The applied path has never run on real data.** No tenant has a
   CPS-derived conversion chain yet. The RPC was verified on its `unsupported`,
   `no-op`, `authority-mismatch`, and `insufficient_privilege` branches only.
   The row-write path is covered by the focused tests and by static review of
   the SQL, not by a live end-to-end conversion.

2. **The Quotation path is two transactions.** A process death between the item
   write and the feedback RPC leaves the two stores diverged. The failure is
   surfaced and the retry is idempotent, but the window exists. The fix is a
   composite Quotation save RPC, which is out of Phase 3 scope.

3. **Three tenants are not provisioned** (agam, issa-certified, ororo). They
   have no CPS tables and no CPS RPCs. The backfill guard skips them by design.
   They must be provisioned before CPS feedback can work there.

4. **`tenant_master_template` has no tenant RPCs.** The installer creates them
   per tenant. A future provisioning run must include
   `apply_cps_item_feedback_transaction`.

5. **Feedback is not a merge.** The last save wins. There is no concurrency
   check between two users who edit the same chain link at the same time. The
   authority gate limits this to one document, and the RPC is atomic, but a
   lost update across two sequential saves is possible by design.

6. **No new indexes were added.** The authority lookup and the lineage lookup
   rely on the Phase 2 and 2.5 indexes. This is adequate at the current chain
   count. A large tenant may need an index on
   `cps_rows (cps_sheet_id, id)`.

7. **The `image_url` field lives inside the `cps_rows.cells` JSON payload.**
   Feedback writes `cells` and the `description` column. It does not write a
   dedicated `image_url` column, because none exists.
