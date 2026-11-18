# Stage 0 — Bolu Document Modification Integrity Fix

**Date:** 2026-11-18 · **Type:** Remediation (scoped integrity fix + behavioral tests + this report) · **Bolu:** Gate 1/Gate 2 preserved throughout.

**Status: Partially completed** — the scoped fix is implemented and all targeted evidence passes (16/16 new harness tests; 150/151 pre-existing AI-assistant suite assertions green; 1 pre-existing baseline failure). Critical gaps in verification remain (hosted RPC/database behavior, the `bun run test` critical suite outcome as of writing, and concurrency beyond the single oldValue gate), so the completion is conditional, not absolute. Details in §9 and §12.

---

## 1. Initial Git state (attribution)

```
## main...origin/main [ahead 12]
 M .workbuddy-ai/memory/2026-11-18.md            (pre-existing, untouched)
?? docs/reports/bolu-document-capability-parity/  (pre-existing, untouched)
?? docs/reports/bolu-persistence-integrity/independent-verification.md  (pre-existing, untouched)
?? docs/reports/bolu-persistence-integrity/production-deployment.md     (pre-existing, untouched)
HEAD = 295f98e4 "📝 docs: add bolu persistence integrity files and updates"
```

Task-attributable changes (all pre-existing work above preserved):
- **Modified:** `src/lib/ai-assistant/bolu-document-service.ts`
- **Modified:** `src/lib/ai-assistant/bolu-operations.ts`
- **Added:** `src/tests/ai-assistant/bolu-modify-integrity.test.js`
- **Added:** this report.

No commits, pushes, staging, stashes, resets or cleans were performed. `bun run build` was not run. No migrations were created or applied; no production data was read or written.

## 2. Files inspected and changed

### Inspected (read before editing)
- `src/lib/ai-assistant/bolu-document-service.ts` — the modification persist paths (`persistInvoiceModification`, `persistQuotationModification`, the create paths, `findVerifiedReplay`, `serializeBoluItem`, `toDbItem`).
- `src/lib/ai-assistant/bolu-operations.ts` — `validateInvoiceItems`, `validateInvoiceModifyInput`, `validateBoluExtraCharges`, `computeAuthoritativeTotals`, `buildInvoiceModifyProposal`.
- `src/lib/Calculations.ts` — canonical engine (`calculateDocument`, `normalizeDocumentInput`).
- `src/domain/invoice/{factories.ts, types.ts, columns.ts, calculations.ts}` — `toDbItem`, column semantics, hydration helpers (`extractCalculationInputs`, `inferLegacyCalculationInputs`).
- `src/domain/invoice/normalize.ts` — quantity/rate healing.
- `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql` — the actual tenant RPC bodies (update branches).
- `supabase/migrations/20260520090002/3_*.sql` — base table shapes (`invoices.custom_fields` text, `quotations.custom_fields` jsonb).
- `supabase/migrations/20261118120000_bolu_operation_idempotency.sql` — operation_id partial unique indexes.
- `src/hooks/useInvoiceSave.ts` — the form's save payload (reference behavior).
- Existing Bolu tests (operations, canonical-persistence, commercial-and-gate-lifecycle, etc.).
- Governing documents: root `AGENTS.md`, `.claude/agent-instructions/{execution-rules.md, verification-gate.md}`, relevant skill `pdf-rendering-correctness` (already loaded for this work; it forbids changing financial semantics, which was respected).

### Changed
1. **`src/lib/ai-assistant/bolu-operations.ts`** — made the row-level validator tri-state: absent (`undefined`) ≠ explicit clear (`null`) ≠ explicit value. `install_rate_taxable` keeps booleans only. No change to create semantics (verified by existing suites).
2. **`src/lib/ai-assistant/bolu-document-service.ts`** — replaced the two reduced-fidelity modification implementations with a shared preservation core and thin wrappers. See §5.
3. **`src/tests/ai-assistant/bolu-modify-integrity.test.js`** — new behavioral suite (16 tests) driving the real `persist*Modification` functions against a faithful in-memory tenant-contract harness.

## 3. Actual failure reproduction and evidence (before the fix)

The failure was reproduced by source-level inspection and then by harness, not by touching production. The seeded document carried: PO `PO-7788`, title `Reactor maintenance — Q3`, `project_id`, fixed charges (workmanship/transportation/shipping), a named taxable extra charge, payment terms, `custom_fields` containing an `advance_invoice` config, header + additional fields, group meta, signatory, PDF options, and line items with non-default VAT (15%), explicit zero discount, install rate + override + taxable flag, image, lineage ids and `custom_data` (`partNo`, `condition`, `vendor_ref`).

**Pre-fix persist flow (invoice, item modification with tenant `entityId`):**
1. Fetch: `id, invoice_number, client_name, notes, terms, due_date, issue_date, total, archived_at` (9 columns only).
2. Items re-serialized: only `description, quantity, unit_price, unit, row_type` survived; `vat_rate`, `discount_rate`, `install_rate`, `sub_description`, `make`, `image_url`, lineage and `custom_data` were dropped.
3. Totals recomputed as `computeAuthoritativeTotals(newItems)` — **defaults** (VAT 7.5%, discount 0, WHT 0, no charges).
4. Payload `{ ...currentDoc(9 keys), ...updates }` handed to `save_invoice_with_items_transaction` (`p_mode='update'`), whose UPDATE branch writes every listed column authoritatively. Absent keys become `NULL` (`custom_fields` has no COALESCE guard) or `0`/`COALESCE` defaults (charges, totals) or `'unpaid'` (status).

**Observed pre-fix destruction (from code + RPC body reading, confirmed by harness comparison):**
- `custom_fields` → `NULL` (invoice) / `{}` (quotation), erasing the advance config, `calculationInputs`, extra charges, signatory, PDF options and all commercial settings.
- `po_number`, `invoice_title`/`quotation_title`, `project_id` → `NULL`.
- `payment_terms` → `NULL` (invoice); on quotation, `payment_terms` for modify mapped into `terms` (wrong column).
- `workmanship`, `transportation`, `shipping` → `0`.
- `status` → forced back to `unpaid`/`open`.
- `install_rate_total` → `0` (invoice path never set it).
- Item `id`, `image_url`, `item_id` lineage, `source_*`, `vat_rate`, `discount_rate`, `install_rate`, `install_rate_taxable`, `show_install_rate`, `formula`, `install_rate_override`, `custom_data` → discarded.
- Financial recompute ignored the document's persisted `calculationInputs` and extra charges entirely.

**Post-fix behavior** — see §5–§7 with before/after evidence in the harness (`src/tests/ai-assistant/bolu-modify-integrity.test.js`). Note on reproduction method: reproduction was against an in-memory tenant-contract harness, not a scratch Supabase instance (none available in this environment; Docker/psql absent). The harness hand-mirrors the RPC UPDATE branch semantics from the installer migration; the exact mapping lines were read directly (invoice UPDATE `$18 = payload->>'custom_fields'` with no COALESCE → absent ⇒ `NULL`; quotation `COALESCE(NULLIF(payload->>'custom_fields',''),'{}')::jsonb` → absent ⇒ `'{}'`).

## 4. Root cause

Two defects compounded:

1. **Reduced snapshot payload.** The modification path selected 9 header columns and spread them into the RPC payload. Because the tenant RPC UPDATE is authoritative for every column it names, all unselected columns were destroyed by the write itself — no merge protection existed anywhere (not in service, not in RPC).
2. **Lossy item reconstruction.** Items were rebuilt from the reduced validation output (`description, quantity, unit_price, unit, row_type` on invoices), discarding persisted item metadata and lineage, then re-costed with boilerplate defaults instead of the document's saved calculation inputs.

A secondary defect: the `payment_terms` modification mapped into the `terms` column (invoice) / `terms` (quotation), overwriting Terms & Conditions with payment-terms text.

Matching persisted-calculation requirement was also unmet: no item-modify path used `custom_fields.calculationInputs`, so VAT/discount/WHT settings were silently replaced with 7.5% / 0 / 0.

## 5. Exact preservation behavior implemented

### 5.1 Full-snapshot RPC payload
Modification fetches **every column the composite RPC UPDATE branch writes** (`id, *_number, *_title, po_number, client_id, project_id, issue_date, due_date`/`valid_until`, `status, document_type (invoice only), payment_terms (invoice), notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields` (+`work_duration` for invoice), `subtotal, install_rate_total, total, amount_in_words, archived_at`) before applying changes. The RPC payload is `{...snapshot, ...updates}`. Every unchanged RPC-written column reaches the database with its persisted value. `custom_fields` is carried verbatim (string for invoices, object for quotations) — never replaced with a reduced shape or silently normalized.

### 5.2 Item merge (`matchBoluItems` + `mergeBoluItem`)
- Matching: explicit `item_id` first, then greedy similarity (description equality weighted highest, then quantity, unit price, unit; ties → nearest position). Each persisted row consumed at most once.
- Merge tri-state per key: **absent** (validator `undefined`) ⇒ keep persisted; **explicit `null`** ⇒ clear; **explicit value** ⇒ overwrite.
- Preserved wholesale: `id`, `row_type` including `group_header` (the validator's forced `standard` cannot downgrade a persisted header), `group_id/group_name`, `item_id`, `source_cps_id/row_id/quotation_id/item_id`, `image_url`, `install_rate_override` (flips true only when an `install_rate` is explicitly set, mirroring the form), `show_install_rate`, `formula`, `custom_data` (unknown keys retained; `partNo`/`condition` keys overridden or deleted by explicit edit, never wiped by omission), `install_rate_taxable`, `sub_description`, `make`.
- New rows follow the create contract. Omitted rows are removed (RPC deletes and re-inserts the set — unchanged destructive semantics by design, matching the form).
- An edit that cannot be matched (e.g. full description rewrite of a member row) is treated as remove + add; metadata is retained only for rows the similarity matcher can pair. See §10.3 for the limitation.

### 5.3 Canonical calculation inputs (`computeDocument` + hydration)
Modification recomputes totals through the same engine the form uses (`normalizeDocumentInput` + `calculateDocument`) with the document's **persisted** inputs:
- Documents with `custom_fields.calculationInputs` use them verbatim (VAT, discount type/value/timing, WHT type/value, hidden VAT/discount/install columns via `hide_full`/`hide_display`).
- Documents without them fall back to `inferLegacyCalculationInputs` — the form's own legacy inference from persisted amounts — never to blind defaults.
- Fixed charges and extra charges (with their VAT flags) are included because `normalizeDocumentInput` reads them from `document.workmanship/transportation/shipping` and `cf.extraCharges`.
- `install_rate_total` is written back for both families.
- If neither source can be produced, `computeDocument` still operates on best-effort persisted data; an error aborts the modification with nothing written (failure-safe, verified by test 7).

### 5.4 Field-with-concurrency fix: payment terms
- Invoice `payment_terms` modify now writes the `payment_terms` column.
- Quotation `payment_terms` modify merges `{...cf, payment_terms}` (jsonb) and leaves `terms` untouched.
- Unrelated fields keep the existing `oldValue` concurrency check, with quotation `payment_terms` checked against `cf.payment_terms`.

### 5.5 Fallback path (no `entityId`)
Items are delete-then-reinsert (idempotent semantics), but the previous item rows are retained and re-inserted on failure ("restored" error) — the invoice fallback also gained the rollback pattern that quotation already had. The header `.update()` still touches only changed keys + `updated_at`.

## 6. RPC and database contracts affected

- **No migration added or required.** The fix works within the existing RPC contract; it never omits a field the RPC writes.
- Tenant RPC update branches read (not modified): invoice `20261118130000_bolu_tenant_rpc_installer.sql` ~lines 150-205 and item insert mapping ~lines 225-261; quotation ~lines 2214-2265 and ~2286-2340. Semantics honored: invoice `custom_fields` absent ⇒ `NULL` (must therefore never be absent), quotation ⇒ `{}`, charges/totals `COALESCE 0`, `status` coalesce unpaid/open, items DELETE+INSERT, item columns `vat_rate`, `install_rate`, `install_rate_taxable`, `show_install_rate`, `formula`, `image_url`, `custom_data` (jsonb), `discount_rate`, `install_rate_override`, `group_id/group_name`, `item_id`, `source_*` with `NULLIF(...,'')::uuid`.
- Identity immutability, tenant isolation, `has_entity_permission` gate inside the RPC, `operation_id` idempotency, audit trail (`record_audit_log` best-effort) and Gate 1/Gate 2 semantics are unchanged.
- `p_mode='update'` path is used only for item changes with `entityId`, as before.

## 7. Tests added and results

**New behavioral suite** — `src/tests/ai-assistant/bolu-modify-integrity.test.js` (16 tests), seeded with fully-populated invoice/quotation fixtures and a harness that mirrors the tenant RPC UPDATE branch (documented inline in the file) and the table builders:

| # | Scenario | Result |
|---|---|---|
| 1 | Invoice due-date-only (fallback path) preserves PO, title, project, charges+tax flags, terms, notes, **advance config**, all `custom_fields`, items row-for-row, status `paid` | pass |
| 2 | Invoice items change (RPC path) preserves header, fixed charges, taxable extra charge with tax flag, **advance config**, signatory, PDF options, attachments, lineage, images, non-default VAT 15%, discount 5%, install 25000 + override, `group_header` row, and recomputes totals via persisted inputs (exact equality with `computeDocument` on the same persisted data) | pass |
| 3 | Explicit `vat_rate: null` clears a row override; omitted row keys keep persisted values | pass |
| 4 | Explicit removal removes only the removed row | pass |
| 5 | Explicitly added item is inserted; other rows untouched | pass |
| 6 | Stale `oldValue` rejected before any write (store unchanged) | pass |
| 7 | RPC error on items modification leaves document untouched | pass |
| 8 | No-op modification reports success, destroys nothing | pass |
| 9 | Quotation `valid_until`-only modification preserves everything incl. jsonb `custom_fields` | pass |
| 10 | Quotation items modification preserves lineage, images, `vat_rate: 0` (exempt), override, `custom_fields`; respects `hide_full` VAT/discount semantics | pass |
| 11 | Quotation `payment_terms` modify → `cf.payment_terms`; `terms` untouched | pass |
| 12 | Invoice `payment_terms` modify → `payment_terms` column; `terms` untouched | pass |
| 13 | Concurrent `oldValue` mismatch on quotation cf payment terms rejected before write | pass |
| 14 | Fallback items-insert failure restores previous items (no partial document) | pass |
| 15 | Invalid items rejected at validation; nothing persisted | pass |
| 16 | Explicit `part_number`/`condition` edits override `custom_data`; unknown keys survive | pass |

Run result: **16/16 pass.**

**Pre-existing suite (attribution):** `ai-assistant` batch — 151 tests, 150 pass, 1 fail. The single failure `bolu-commercial-and-gate-lifecycle.test.js:304 'An authorized create/edit role can save an invoice'` is a **pre-existing baseline failure** reproduced identically on pristine `HEAD` (verified via `git archive HEAD src` into a scratch folder; the mock tenant client's `from()` lacks the `.limit(1).single()` chain required by `fetchDocumentPrefixesSafe` since commit 501fdd59). Not a regression; reported, not "fixed" by editing the test. Three further files (`bolu-floating-action-button`, `bolu-operational-activation-corrections`, `bolu-secret-vault`) fail at file level in this environment both before and after the change (verified against HEAD). The `canonical-persistence-and-context.test.js:261` source-text contract was affected by the rewrite and was preserved intentionally (`customData.partNo = item.part_number` / `customData.condition = item.condition` / `custom_data: customData` kept verbatim); suite passes.

**Verification commands:** `bun run audit:load` passed (exit 0; pre-existing BLOAT/WARN list unchanged in kind). `bun run typecheck` passed (`tsc --noEmit`). `bun run build` not run (prohibited).

**Critical suite (`bun run test`, `node --test "src/tests/critical/*.test.js"`):** 1602 tests run, 1598 pass, **4 fail**. All four failures reproduce identically on pristine `HEAD` (verified by `git archive HEAD src package.json` into a scratch folder and re-running the same files): `dashboardThemeExperiment.test.js` (stylesheet scoped in PREVIEW_CSS), `invoiceThemeExperiment.test.js` (same assertion class), `documentShareSecurity.test.js` (document_shares insert order), `photoHeroV2LightMode.test.js` (fixture HTML hash unchanged). None touch the Bolu/document-persistence path; they are pre-existing environment/fixture drift, not regressions. `.baseline-check` was removed after comparison; nothing from it remains.

## 8. Remaining risks and unresolved issues

1. **Hosted RPC/database behavior unverified.** The harness hand-mirrors the installer migration; the migration itself was not executed. Behavior against a live tenant (including exact `custom_fields` text column round-tripping, jsonb casts, RLS inside tenant schemas, and the `has_entity_permission` RPC) is unproven here. Before production use: run the modification on a scratch tenant/entity, diff the full row and item set, then delete nothing — the diff itself is the audit.
2. **Concurrency scope.** Only the existing `oldValue` field-level guard exists. Item-modification carries no version token (`updated_at` compare not enforced); the RPC replaces the whole item set atomically, but a caller racing another writer between fetch and RPC can still lose the other's un-itemized changes to header fields (they are preserved by the snapshot at fetch time and will overwrite them). This is a pre-existing architectural boundary, reported, not re-engineered here.
3. **Matcher is similarity-based**, not relational. A full description rewrite of a line is remove+add; per-row `item_id` only exists if the model re-emits it (the validator accepts `item_id` but models rarely supply it). Row reordering across matched equals works; cross-family reorder with equal scores is positional.
4. **`entityId` path item identity.** The RPC deletes and re-inserts items; item UUIDs change; lineage columns survive. This is the existing form contract (verified by reading the RPC insert mapping), not a regression.
5. **Invoice `document_type`** is spread into the payload harmlessly but never written by the RPC update branch; `linked_quote_id`/`linked_csr_id` are likewise outside the RPC contract and unverifiable for preservation through it (they are not in the UPDATE branch — retained implicitly).
6. **Group semantics preserved but not authorable.** A persisted group header row now survives modification (including its position); Bolu still cannot *create* group headers. Out of scope.
7. **Invoice RPC `custom_fields =` has no NULLIF** — the service must always send it; it now always does (full snapshot). If a future caller bypasses `persistDocumentModification`, the risk returns.
8. **Audit remains best-effort** (`console.warn` on failure) — unchanged.
9. **Quotation `due_date` modify** maps to `valid_until`; overdue semantics unchanged (out of scope).
10. **`status` on item modify** — invoice now preserves `status` from the snapshot (e.g. `paid`); no lifecycle recomputation is performed (by design — the form likewise does not recompute status).

## 9. Unavailable verification

- Hosted tenant SQL (Docker/psql unavailable; no credentials used).
- Browser/UI verification (not performed; no viewport claim).
- `bun run test` critical suite: executed; 4 failures, all reproduced identically on pristine `HEAD` (§7); none touch the Bolu modification path.
- Real on-device Android SQLite modification path (graceful-degraded; shares the same serializer).
- Concurrency beyond the field-level `oldValue` guard.
- Install-rate override derivation edge cases when `install_rate` is simultaneously cleared (`null`) by the model — treated as explicit clear; override flag is **not** auto-cleared (documented; no over-engineering).

## 10. Schema migration

**None proposed, none required, none applied.** All preservation is achievable within the existing composite RPC contract; the fix changes only what the service sends and how items merge. A migration would be required only to add an item-verion token or per-item concurrency columns — out of scope and unneeded for stated acceptance criteria.

## 11. Commands executed and results

| Command | Result |
|---|---|
| `git status --porcelain=v1 -b` | baseline documented; only pre-existing changes + this task's outputs |
| `bun run audit:load` | exit 0 (pass; warning list pre-existing) |
| `bun run typecheck` | pass |
| `node --test ai-assistant/*.test.js` | 150/151 pass; 1 pre-existing baseline failure (§7) |
| new harness suite | 16/16 pass |
| `bun run test` (critical suite) | 1602 tests / 1598 pass / 4 pre-existing HEAD failures (§7); `bun run build` not run |
| baseline HEAD re-run of failing files | confirms pre-existing failures (§7) |

## 12. Scope control

- No Advance Invoice implementation or changes to `suffix/mode/value/primary_label/secondary_label`.
- No UI changes, no new providers/dependencies, no schema/migration changes, no `bun run build`, no production writes, no commits/pushes/stage/stash/reset/clean.
- Creation paths untouched (including `buildBoluCustomFields` provenance block).
- Financial semantics unchanged: same `calculateDocument` engine, same WHT base rule, same extra-charge VAT flags, same hidden-column handling; calculations are application-owned end-to-end.

## 13. Completion status

**Partially completed.** The scoped fix is implemented and verified in this environment: new behavioral suite 16/16, `tsc --noEmit` clean, `bun run audit:load` clean, AI-assistant batch 150/151 (1 pre-existing baseline failure), critical suite 1598/1602 (4 pre-existing HEAD failures, reproduced on pristine HEAD). Outstanding and outside the authority of this task: (a) hosted-tenant verification of the exact RPC absent-key semantics (`invoices.custom_fields = NULL`, `quotations.custom_fields = '{}'` deep-vs-raw text round-trip, `has_entity_permission` on live schemas); (b) concurrency protection beyond the existing `oldValue` guard; (c) any hosted RPC/deploy behavior, which was not touched. **Before production use: run one populated Bolu-modified invoice and one quotation against a scratch tenant, diff every column and both item tables before/after, and hold rollout if anything besides the intended field changes.** If any of (a)–(c) contradicts the evidence recorded here, stop and report rather than force green.
