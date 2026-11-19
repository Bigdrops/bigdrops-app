# Stage 3A.2 — Independent Acceptance Audit

**Date:** 2026-11-19 · **Type:** Independent, read-only acceptance audit · **Decision: Conditionally accepted** · **Scope:** Stage 3A.2 only (existing-document scalar field & commercial charge modifications, invoice and quotation families)

## 1. Scope, authority and approach

This audit verified the delivered Stage 3A.2 implementation against the approved blueprint (`docs/prd/conversational-document-assistant/Waterfall-roadmap.md` §37.3, Stage 3A.2; `Waterfall-roadmap.md` §37.6/§37.7 exclusions) and the Stage 3A.2 dispatch constraints. It inspected the full relevant diff (`git diff HEAD` limited to the 3A.2-scope files), the complete relevant call paths (validation → proposal builder → preview → executor → persistence → audit), the tests, and the delivery report (`stage-3a2-modify-parity.md`) as supporting evidence only. Every code claim below was checked against the source, not against the report.

Authority applied: explicit user requirements → root `AGENTS.md` → repository standards → source and tests. DECISION / OBSERVATION / PROPOSAL are kept distinct; nothing observed in code was promoted to an approved requirement. No implementation, test, PRD, roadmap or preserved report was edited. No Git state was altered. No database, production or disposable, was contacted.

The only task-attributable output is this report.

## 2. Baseline and git state

- Expected HEAD baseline: `0ed64a7042ceb82b821328acbe6b03d267b27ddd` (`0ed64a70`). **Actual: identical.**
- `git status --porcelain=v1` at audit start and end: see §12. The tree contains **non-3A.2 work by other sessions** (a "What's New"/release-notification surface: `src/components/app/update/ChangelogTimeline.tsx`, `src/hooks/useReleaseNotifications.ts`, `src/pages/WhatsNew.tsx`, `src/domain/appUpdate/releaseDiscovery.ts`, `src/tests/critical/releaseDiscoveryState.test.js`, `docs/reports/whats-new-changelog/`) plus the two pre-existing unrelated modifications (`.github/workflows/build-android-test-release.yml`, `.perch/PERCH.md`), the Stage 3A.2 implementation (11 tracked files + 1 new test file), an untracked implementation report (`stage-3a2-modify-parity.md`), and the two preserved untracked reports (`stage-2-final-verification.md`, `stage-3-full-field-parity-audit.md`). None of these were read-modified, staged, committed, reset or cleaned by this audit.
- Branch is ahead of `origin/main` by prior authorized commits (`1d7d6d75`, `e099eab2`, `0ed64a70`); 3A.2 itself remains uncommitted, as reported.
- Concurrent-session attribution uncertainty is explicit (§12): the "What's New" files are untracked/modified by sessions other than 3A.2; this audit does not attribute them to 3A.2 and does not certify them.
- The two preserved untracked reports were confirmed present and untouched at the start and end of the audit.

## 3. Evidence reviewed

- Root `AGENTS.md` (repository governance, authority order, verification gate, audit order `audit:load` → `typecheck`).
- `docs/PROJECTSKILLINDEX.md` (skimmed; no skills loaded — task class is audit, already in-session).
- `Waterfall-roadmap.md` §37.2–§37.6 (Stage 3 blueprint), `Readme.md` (DEC-40/41 context).
- Implementation (full relevant hunks, not snippets): `api/bolu-chat.ts`, `src/lib/ai-assistant/bolu-operations.ts` (1770 lines), `bolu-document-service.ts` (1912 lines), `bolu-data.ts`, `bolu-generation.ts`, `bolu-runtime.ts`, `src/components/ai-assistant/chat/assistant-chat-parts.tsx` (1464 lines), `src/lib/ai-assistant/hooks/useBoluThread.ts` (modify dispatch, line 621/623), `bolu-gate2-result.ts`, `bolu-audit.ts`.
- Form parity path: `src/pages/InvoiceFormPage.tsx` (`computeDocument` usage, line 371–385), `src/hooks/useInvoiceSave.ts` (lines 33, 262–312), `useInvoiceHydration.ts`, `src/domain/invoice/calculations.ts` (`buildCalculationInputs`, `extractCalculationInputs`), `src/lib/Calculations.ts` (`normalizeDocumentInput` lines 601–767, `computeDocument` line 767, `getVisibleRowEffects` lines 581–599).
- Tests: full `src/tests/ai-assistant/` directory; key suites re-run (§8).
- `stage-3a2-modify-parity.md` used as claims to verify, not as evidence.

## 4. Audit A — Field contract and document-family mapping — Pass with findings

Contract: `BoluModifyFieldKey` (`bolu-operations.ts:161-174`), `BoluInvoiceModifyPayload` (198-211), `BoluDocumentModifyProposal` (270-309), `validateInvoiceModifyInput` (594+), `buildInvoiceModifyProposal` (1236), executors (`bolu-document-service.ts`, `persistDocumentModification` 1232) + `INVOICE_MODIFY_CONFIG` (1093-1108) / `QUOTATION_MODIFY_CONFIG` (1110-1122).

| User-facing field | Invoice persistence | Quotation persistence | Verified |
|---|---|---|---|
| Terms | `terms` column, normalized via `normalizeBoluRichText` (F3-07) | `terms` column, normalized | ✅ |
| PO number | `po_number` | `po_number` | ✅ |
| Title | `invoice_title` | `quotation_title` (`titleField` 1105/1107) | ✅ |
| Project | `project_id`, fail-closed tenant check (`verifyProjectReference` 1209-1221) | same | ✅ |
| Work duration | `work_duration` | **Rejected** at validator (`bolu-operations.ts:642-644`), builder/executor (`bolu-document-service.ts:1294-1300`) | ✅ |

Additional checks:

- **client_name cannot be cleared** — rejected at the validator (`bolu-operations.ts:677-687`). Matches the form's required-customer semantics. ✅
- **Explicit zero vs omitted charges** — `0` persists as `0` and recomputes (tested); omitted charge `newValue` carries `undefined` forward and the executor refuses with a non-finite error at Gate 2 rather than writing (§F-01 nuance below). ⚠️ for scalar fields: omitted value collapses to silent clear (F-01).
- **Unknown keys rejected where required** — `calculationInputs` rejects unknown keys and out-of-domain percentages (0–100, `discountValue`/`whtValue` ≥0) at validation (`bolu-operations.ts:733-810` region); duplicate charge labels rejected (`bolu-operations.ts:716-722`). Top-level unknown payload keys are silently ignored (pre-existing contract shape; not treated as a defect). ✅/note.
- **Invalid values fail closed** — non-numeric charges refused at executor too; bad project ids → null + warning, never persisted raw; lookup failure → null + warning. ✅
- **Rich text normalized at the write boundary** — `normalizeBoluRichText` (`bolu-document-service.ts:1137-1139` → `normalizeRichTextHtml`); the proposal carries the validated block/string shape and the executor normalises at write (proposal payload is not the DB value; preview renders via `richTextToPlainText`). ✅
- **Payment-term storage difference intact** — invoice `payment_terms` column; quotation `custom_fields.payment_terms`. The Gate 1 baseline reader resolves the quotation baseline from `persistedCf.payment_terms` (`bolu-operations.ts` baseline switch, ~1296) and the executor re-reads it the same way. ✅
- **No model oldValue becomes trusted baseline** — `buildInvoiceModifyProposal` always re-derives scalar baselines from `current` when supplied (~1276-1305); the generation/runtime paths pass the persisted snapshot or refuse to propose. ✅

**Finding F-01 (Medium · Acceptance gap)** — omitted scalar `newValue` collapses to a silent clear. `validateModifyFieldString(undefined)` → `{ value: null, ok: true }` (`bolu-operations.ts:576` onward), so `{documentId, field: 'terms' | 'title' | 'po_number' | 'payment_terms' | 'issue_date' | 'due_date'}` with no `newValue` passes validation with `newValue = null`, and the executor writes it verbatim. For rich text, `payload.newValue === undefined` → `newValue = undefined` (`bolu-operations.ts:668-676`) and the executor writes `normalizeBoluRichText(undefined)` → `''`. A malformed model envelope therefore clears the field after explicit Gate 1/Gate 2 approval (the preview shows the change, `→ —`), with no validation error. Pre-existing contract shape for the original five fields; **3A.2 widened it** to `terms`, `title`, `po_number`. PROPOSAL: distinguish "absent" (reject) from explicit `null` (clear) for non-optional scalar edits; require explicit `null` for clears. Severity Medium: requires explicit user approval, shows a before→after diff, and the stale baseline still applies; still an unintended-clear path.

**Finding F-02 (Medium · Defect)** — fixed-charge coercion accepts booleans/objects. `Number(payload.newValue)` with no type guard (`bolu-operations.ts:647-656`): `true` → `₦1` persisted, `false` → `₦0` (charge cleared), numeric strings accepted silently, `''` → `₦0`. The executor repeats the coercion (`bolu-document-service.ts:1345` `Number(proposal.newValue)`). PROPOSAL: accept `number` or a numeric string only; reject everything else at validation.

## 5. Audit B — Fixed-charge calculation semantics — Pass (parity verified), with notes

High-priority independent check. The claim under review is that fixed charges are treated as **non-taxable additions** during Gate 1 recalculation, execution recompute and persistence.

- **Existing form path** (`InvoiceFormPage.tsx`): the form builds `documentTotals` by calling the shared engine `computeDocument({ items, columns, document: { ...invoice, workmanship, transportation, shipping }, cf: { extraCharges, calculationInputs } })` (lines 371–385). The engine (`src/lib/Calculations.ts`, `normalizeDocumentInput` lines 653–659) folds fixed charges into non-taxable `ExtraCharge` entries (`vatApplicable: false`, always), and named charges from `cf.extraCharges` honour their `withTax === true` flag (`Calculations.ts:661-672`). There is no form-level VAT flag for fixed charges (`useInvoiceEditableState.ts:125-129` shows `chargeLabels` metadata only). **The application itself treats fixed charges as non-taxable.** The 3A.2 Gate 1 recompute and executor do the same thing through the same engine. Parity **established from source**, not assumed.
- **Named extra charges and VAT flags** — form hydrates `extraCharges` from persisted `custom_fields.extraCharges` verbatim; Bolu create persists `withTax` from the validated create payload; 3A.2 modify preserves the flag verbatim in `mergeExtraChargesKeepUnknowns` and the engine reads `c.withTax === true`. ✅
- **VAT / discount / discount timing / WHT / installation totals / rounding / amount-in-words** — all flow through `computeDocument` in both families. The executor recompute (`bolu-document-service.ts:1553-1582`) sets exactly: `subtotal`, `discount`, `vat`, `wht`, `total`, `install_rate_total`, `amount_in_words` (via `numberToWords`) — the same surface the form persists (`useInvoiceSave.ts` lines 304-312). Gate 1 preview (`computeAuthoritativeTotals`, `bolu-operations.ts:1018-1035`) goes through `calculateDocument` on the same inputs. Neither gate reads model arithmetic; **model totals are ignored by construction**. ✅
- **Gate 1 vs Gate 2 agreement** — Gate 1 computes from `persisted items + merged effective inputs/charges`; the executor recomputes from `persisted items + merged cf + effective charges` through the same engine with the same rounding. Given identical persisted state, the results are identical (the one asymmetry — `install_rate_taxable` mapped with `=== true` in `toBoluItemsFromPersisted` (`bolu-operations.ts:1217`) vs truthy `?? false` in the engine reader — cannot diverge because the column is `boolean` in both item migrations (`20260520090003_invoices.sql:59`, `20260520090002_quotations.sql:65`)). Noted as informational (F-08), not a defect.
- **Hidden-row effects honoured** — `getVisibleRowEffects` reads `columns` (persisted `columnConfig` for 3A.2 recompute); `hide_full` for vat/discount/install forces rates to null in both Gate 1 and Gate 2. ✅
- **Legacy inference identical** — documents without persisted `calculationInputs` use the same `inferLegacyCalculationInputs` the form uses (`bolu-document-service.ts:1570`); never blind defaults. ✅
- **No omitted input silently reset to default** — `calculationInputsChange` merges onto the persisted inputs (`{ ...persistedInputs, ...new }`); untouched keys are preserved, and legacy defaults apply only inside the stale-gate comparison with an explicit default-match allowance (`DEFAULT_CALCULATION_INPUTS`, `bolu-document-service.ts:1145-1152`). ✅
- **Discounts fixed vs percentage, timing before/after tax, WHT** — engine-supported in both families; 3A.2 accepts and validates all six input keys with the same type set as the create flow. ✅

**Limitations, not defects:** (i) For the non-RPC fallback with a combined items+charge edit, items are deleted and re-inserted before the header `.update`; a header-update failure leaves totals stale relative to the replaced items (best-effort restore attempted). This is pre-existing Stage-0 behaviour, unchanged by 3A.2 triggers except that charge edits in the same proposal widen which proposals reach that branch. (ii) No database-level atomicity beyond the composite RPC contract (`save_invoice_with_items_transaction` / `save_quotation_with_items_transaction`) — the in-process stale checks are **not** atomic guarantees; concurrent writers between the executor's read and write are mitigated by the checks, not eliminated, and only for touched keys. (iii) Live behaviour is unverified against the disposable tenant (F-10).

## 6. Audit C — Gate 1 snapshot and proposal integrity — Pass with findings

`readBoluModifySnapshot` (`bolu-data.ts:186-226`) reads the persisted row (all scalar/charge/cf columns + number + totals + `archived_at` guard) and its items (`select('*')`, `order('sort_order')`). Both live paths are wired to it and **fail closed** when it cannot be read (`bolu-generation.ts:430-448`, `bolu-runtime.ts:362-380`): an unreadable document yields no proposal and a plain message, never a guess. Both pass `current: { document, items }` into `buildInvoiceModifyProposal`.

Verification of the required properties:

- **Persisted baselines, never model claims** — scalar oldValue is re-derived from the snapshot per field with family mapping (`title` → `quotation_title`/`invoice_title`, quotation `payment_terms` → `cf.payment_terms`, quotation `due_date` → `valid_until`) (`bolu-operations.ts` ~1276-1305). ✅
- **extraChargesChange.oldExtraCharges** = the persisted complete set, normalised (label trim, lower source, VAT flag coerced, zero-label rows dropped) at proposal time (`bolu-operations.ts:1313-1322`). ✅
- **calculationInputsChange.old** = actual persisted state per touched key, falling back to the documented legacy default (`DEFAULT_CALCULATION_INPUTS`) only when the key is absent (`bolu-operations.ts:1326-1346`). ✅
- **chargesSnapshot** carries the effective persisted fixed charges (`bolu-operations.ts:1350-1355`), updated by the charge field when present (`:1395-1404`). ✅
- **Group-header rows** — persisted `group_header` rows flatten to `row_type: 'standard'`, quantity 0, price 0 in the preview path; totals contribution is exactly 0; VAT/discount rates/warehouse not distorted. Note F-07. ✅ (with note)
- **Archived documents** — excluded at snapshot read *and* executor (`archived_at IS NULL`), belt and braces. ✅
- **Missing scalar baselines cannot become trusted model values** — if `current` is absent (only possible without a tenant client, i.e. unit contexts), the payload oldValue is used verbatim but the executor then hard-refuses any edit lacking an `oldValue` ("Proposal is missing the persisted baseline") — Gate 2 remains fail-closed. The generation path refuses to propose at all when the snapshot fails. ✅ with note.
- **Family retained end-to-end** — `documentFamily` in payload → builder → proposal `documentFamily` → executor config (`persistQuotationModification` vs `persistInvoiceModification`, `bolu-runtime.ts`/`useBoluThread.ts:621-623`). ✅

**Finding F-09 (Low · Acceptance gap)** — the `bolu-generation` modify branch has no dedicated test. Evidence for wiring correctness is: code inspection (read at lines 427-470), the `g1` test of the new reader, the symmetric Stage 2 advance-invoice path (covered), and code paths shared via `buildInvoiceModifyProposal`. Residual uncertainty covers the exact envelope-to-proposal flow in a live session. PROPOSAL: add a generation-level modify test before 3B.

## 7. Audit D — Gate 2 stale-value and write integrity — Pass with findings

Both executors share `persistDocumentModification` (`bolu-document-service.ts:1232`). Findings:

**Scalar fields** — every newly editable scalar field requires `proposal.oldValue !== undefined` (`:1322-1328`) and is compared before any write; rich-text sides are both normalized through `normalizeBoluRichText` (F3-07 pattern, `:1330-1341`); quotation `due_date` maps to `valid_until` and `title` to `quotation_title` consistently with the builder's baseline resolution. ✅

**Fixed charges** — finite, non-negative enforced at validator and executor (`:1344-1351`); explicit `0` is written as `0` (a1 test: 250,000 → 0 round-trip verified with recompute); omitted charge newValue never writes; a concurrent change to a charge's persisted value fails the stale check before anything is read for the write. ✅

**Named extra charges** — full normalized old-set comparison (`extraChargesEqual(normalizeExtraChargesList(persisted), ...)`, `:1384-1392`) before any write; labels matched case-insensitively; duplicates are rejected at validation; unknown persisted entries survive via merge; sibling `custom_fields` keys (`chargeLabels`, `created_via`, `operation_id`, …) survive because the merged document is `{ ...base, ... }` and only `extraCharges`/`calculationInputs` keys are written (`:1427-1438`). ✅

**Calculation inputs** — per-key baseline check (`:1394-1418`); legacy defaults applied only when the key is absent in persisted cf **and** the baseline matches the default; concurrent edits to touched keys reject the proposal (c5 test verified by rejection of `/whtType changed after this proposal/`); untouched concurrently changed keys are preserved because the merge spreads persisted-over-new (no clobber) — **correct merge semantics; cannot invalidate the approved edit**. Stale checks occur before the single `updates` write; nothing persists on refusal. ✅

**Write behaviour** — stale checks happen before persistence. The pending document is assembled as `payload = { ...currentDoc, ...updates, id }` for the RPC path (`:1590-1604`) or as `.update(updates)` (`:1522`) — never a partial second write of other sections. Block changes produce exactly one `custom_fields` write (`:1434-1438`). Atomicity across header+items is established only by the composite RPC contract (entityId present); the in-process checks are not database-atomic. ✅ with Limitation F-12.

**Audit logging** — `recordBoluDocumentModificationAudit` (`bolu-audit.ts:148-195`) fires only after a successful write and is fully best-effort (failures downgrade to `console.warn`, never to a fake error or fake success). Block-only changes record name-only markers (`extra_charges` / `calculation_inputs` with null value). ✅

**Existing authorization/ownership/confirmation/expiry/intent controls** — intact: `assertTenantAuthorization`, `canRead`, `archived_at IS NULL` confinement, `isProposalStale`, status gate (`approved_pending_save`), `executedOperationIds` replay guard (in-process, not a cross-instance guarantee — known limitation carried from Stage 0). ✅

**Finding F-05 (Low · Limitation)** — internal payload-key vocabulary reaches user-facing prose at execution time: `${key} changed after this proposal was prepared. Please review and try again.` prints camelCase payload keys (e.g. `whtType`) to the user (`bolu-document-service.ts:1406` and `:1414`). Not a table/schema name, but implementation vocabulary in ordinary business prose, contrary to the NL business-language standard. PROPOSAL: map keys to business labels ("VAT rate", "discount type", "WHT type").

**Finding F-06 (Low · Limitation)** — backend error fragments are interpolated into user-visible text on save failure (`bolu-document-service.ts:1595` `Transactional update failed: ${rpcError.message}`, `:1611` items restore message, `:1622` `Failed to update ${cfg.family}: ${updateError.message}`). Pre-existing pattern; no SQL/schema structure was confirmed to leak, but PostgREST/Postgres message fragments can surface constraint or relation names. PROPOSAL: keep the detail for logs; show generic save-failure copy to the user.

## 8. Audit E — proposalPlainText and preview parity — Partial (one known gap confirmed)

`ProposalCardView` renders `ModifyDiffPanel` (before→after for field/inputs/charges; "Cleared" badge when a charge goes from >0 to 0; named charges show VAT flags and New/Removed markers). `proposalPlainText` (`assistant-chat-parts.tsx:336`) mirrors the modify branch: field row, `VAT rate (%)` etc. per calculation-input key, named-charge rows with `[new]`/`[removed]` and `(VAT)` markers (`:362-390`). `MODIFY_FIELD_LABELS` (`:118-135`), `formatModifyCell` (`:137-144`), `CALC_INPUT_LABELS` (`:146-153`), `formatCalcCell` (`:155-164`) — **all required before→after rows are present in both surfaces**: terms, PO number, title, project, work duration, workmanship, transportation, shipping, named charges with tax flags, and every calculation-input key.

Discounts/WHT: the card's totals block renders `Discount` (`-₦…`) and `WHT` (`-₦…`) rows whenever the respective totals are >0, and a VAT row with the effective percent (`vatPercent` rewired to `calculationInputsChange.new.vatPercent`, lines 1104-1111). The plain-text artifact's totals block (`assistant-chat-parts.tsx:425-433`) prints Subtotal, Charges, VAT and `Authoritative total` — **and no discount or WHT lines, ever**. The artifact therefore misstates the approved money when a proposal changes discount or WHT settings. This is the gap acknowledged in the delivery report; it is **confirmed still present** and is an acceptance gap, not a defect in the executor.

**Findings:**

- **F-03 (Medium · Acceptance gap)** — `proposalPlainText` omits the Discount and WHT lines the card renders (`assistant-chat-parts.tsx:425-433`). The copied artifact is materially incomplete against the same proposal's card — the user can copy/send an understated money picture. PROPOSAL (no code changed): print `Discount` and `WHT` lines when >0, mirroring the card exactly.
- **F-04 (Low · Limitation)** — Charge clearing to zero is unambiguous on the card ("Cleared" badge + explanatory note, `:290-294`) but only implicit in the artifact (`-> ₦0.00`); an artifact reader cannot distinguish "unchanged zero" from "cleared charge" without the card. PROPOSAL: append a `(cleared)` marker in the plain-text row for the >0→0 case.
- **F-11 (Low · Acceptance gap)** — A modify proposal without financial changes (e.g., notes-only) renders "BOUXRE calculates the authoritative totals when this document is saved." (`assistant-chat-parts.tsx:1329`) — misleading wording for edits that change no amounts. Pre-existing text reused by the modify family. PROPOSAL: suppress the fallback on modify proposals with no `computedTotals`, or reword it to cover both families.
- **F-13 (Informational)** — Named-charge rows are re-cased from their lowercased match key (`assistant-chat-parts.tsx:269`), so "Long Distance Fee" renders as "Long distance fee". Cosmetic.
- **F-14 (Informational)** — `.ac-modify-diff` on the modify panel has no dedicated styles (reuses `ac-advance-*`); no visual defect observed beyond that, no separate inspection possible (§10).
- No raw internal keys appear in the rendered card or in `proposalPlainText` (checked: `custom_fields`, `calculation_inputs` never emitted verbatim; `field` labels humanized; artifact contains no module/function/table names). No model-supplied computed totals appear in either surface; both consume only `proposal.computedTotals` produced by the application builder. Additions and removals are visually distinct in both surfaces. The preview represents exactly the proposal Gate 2 executes (single proposal object reference through the approval flow).

## 9. Audit F — Natural business-language compliance — Pass with findings

Inspected the generation reply paths, the validation-failure messages, the executor stale/refusal messages, warnings, the Gate 2 execution message (`bolu-gate2-result.ts`), and the card/artifact strings.

- **Success path** — "✓ Successfully saved <number> to your business records." (`bolu-gate2-result.ts:46`); modify success follows the same wrapper; **save is never claimed before persistence returns** (the message is composed from the executor result only). ✅
- **Warnings** — project-discard warning: "Project \<id> is not active or not available in this business entity; the project reference was discarded." — business register, names the cause. ✅ Duplicate/stale-merge refusals: "Extra charges changed after this proposal was prepared. Please review and try again." — plain and actionable. ✅
- **Refusals** — executor work_duration quote: "Work duration applies to invoices only; quotations do not carry a work duration." (`bolu-document-service.ts:1296`) — clear, plain. Unsupported actions (status transitions, file upload, group headers, PDF settings, banking details) are refused at the prompt layer in plain language (`api/bolu-chat.ts:444`). ✅
- **Internal vocabulary leak points** — the validation-failure reply path (`bolu-generation.ts:468-470`) prints `validation.errors` verbatim, which include payload-key identifiers (e.g. `Unknown calculation input "paymentTerms". Supported: vatPercent, discountValue, …`); the executor calc-input stale errors print camelCase keys (F-05); the semi-technical baseline refusal (F-05, `bolu-document-service.ts:1325`). No file paths, function names, table names or RPC names are present in ordinary conversation prose. Prompt-layer product copy (e.g. the JSON envelope instructions) is model-facing, not user-facing.
- **Error redaction** — safe; the one caveat is F-06 (backend fragments in failure strings). The audit-log provenance (`changed_via: bolu_assistant`) is not user-facing prose.

Assessment: no critical/high language failure; the identified items (F-05, F-06) are Low. The standard is substantively met.

## 10. Audit G — Four-viewport UI verification — NOT VERIFIED

**Not inspected — record, don't simulate.** The environment still cannot boot the application (paired Chrome extension reports `paired-offline`, `browsers: []`, relay up but no connected browser; the desktop browser surface has **no window-resize or viewport-emulation control**; the Vite dev server fails with `504 Outdated Optimize Dep`, and cache deletion / Vite config changes / dependency changes are out of bounds for this audit). SSR markup is explicitly not viewport verification, and converting the existing SSR smoke into a `data:`-URI screenshot would still cover only one arbitrary desktop width — not the four required classes — so no such substitute was claimed as viewport verification either.

Not inspected: Mobile/Fold Closed, Fold Open, Tablet (portrait/landscape), Desktop — horizontal overflow, before/after readability, long terms/project names, long charge labels, dense calculation-input rows, cleared-charge note wrapping, narrow-screen action placement, proposal-card/composer interplay. **This criterion is unmet and is recorded as a limitation, not as a pass.** The 3A.2 UI change is additive (an extra `<section>` of rows on an existing card) and reuses the `.ac-advance-*` two-column row pattern already in use by the advance preview, which lowers the risk of overflow, but that is an argument from pattern reuse, not evidence of the four classes.

## 11. Audit H — Test and type verification — Pass

Commands run by this audit (read-only, no `bun run build`, no database):

| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js` | **25 pass / 0 fail / 25 tests** |
| `bun test src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js` | pass |
| `bun test src/tests/ai-assistant/bolu-modify-integrity.test.js` | pass |
| `bun test src/tests/ai-assistant/bolu-advance-integrity.test.js` | pass |
| `bun test src/tests/ai-assistant/bolu-advance-thread-flow.test.js` | pass (106/106 across the four regression suites) |
| `bun test src/tests/ai-assistant/` (full directory) | **571 pass / 1 fail / 572 tests — matches the reported Stage 3A.2 baseline** |
| `bun run audit:load` | **1125 files scanned; 58 oversized / 8 broad selects / 1 component fetch / 4 heavy limits — identical profile to the 3A.1 baseline; no new ❌/🚨 markers in the 3A.2 files** (`bolu-runtime.ts` at 602 lines newly crosses the 600-line threshold and joins the oversized list; accepted as a pre-existing-class WATCH item, not a new class) |
| `bun run typecheck` (`tsc --noEmit`) | **exit 0** |
| `bun run build` | not run (prohibited) |

**Pre-existing failure confirmed, not assumed:** `src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js` — "An authorized create/edit role can save an invoice through Gate 2" — `false !== true` at line 324. Evidence chain verified by inspection: `createPersistenceMock()` (lines 45-73) implements `from().select().then(...)` with **no `.limit(1)`**; the creation path calls `fetchDocumentPrefixesSafe` which invokes `.limit(1)` (`src/domain/documentNumbering.ts:133`) → the settings read throws → the create aborts → `result.success === false`. The mechanism and signature match the documented pre-existing baseline; the file passes the other 17 tests in it and is untouched by 3A.2. **Classification: pre-existing, unrelated, unchanged by this audit.** Repair remains a separately authorized task.

**Finding F-10 (Informational · Limitation)** — no live disposable-tenant verification for 3A.2 (executor verified via the in-memory harness only; no live DB path was exercised, consistent with the no-database-contact constraint).

## 12. Git state and preservation

`git status --porcelain=v1` at audit initial (start) and at report time (end) — identical:

```
 M .github/workflows/build-android-test-release.yml   <- pre-existing, unrelated, untouched
 M .perch/PERCH.md                                   <- pre-existing, unrelated, untouched
 M api/bolu-chat.ts
 M src/components/ai-assistant/chat/assistant-chat-parts.tsx
 M src/components/app/update/ChangelogTimeline.tsx    <- NOT 3A.2 (concurrent session)
 M src/hooks/useReleaseNotifications.ts               <- NOT 3A.2 (concurrent session)
 M src/pages/WhatsNew.tsx                             <- NOT 3A.2 (concurrent session)
 M src/domain/appUpdate/releaseDiscovery.ts           <- NOT 3A.2 (untracked, concurrent session)
 M src/lib/ai-assistant/bolu-data.ts
 M src/lib/ai-assistant/bolu-document-service.ts
 M src/lib/ai-assistant/bolu-generation.ts
 M src/lib/ai-assistant/bolu-operations.ts
 M src/lib/ai-assistant/bolu-runtime.ts
 M src/tests/ai-assistant/bolu-operations.test.js     <- 3A.2 (regex aligned to new message)
 M src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts  <- 3A.2 (contract update)
?? docs/reports/bolu-document-capability-parity/stage-2-final-verification.md      <- preserved, untouched, not staged
?? docs/reports/bolu-document-capability-parity/stage-3-full-field-parity-audit.md  <- preserved, untouched, not staged
?? docs/reports/bolu-document-capability-parity/stage-3a2-modify-parity.md          <- implementation report (not read-modified)
?? docs/reports/whats-new-changelog/                  <- NOT 3A.2 (concurrent session)
?? src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js
?? src/tests/critical/releaseDiscoveryState.test.js    <- NOT 3A.2 (concurrent session)
```

Stage-scoped diff (3A.2 files only): 9 tracked files changed, ~1131 insertions / 94 deletions, plus the new test file (877 lines). **Attribution uncertainty (explicit):** the "What's New"/`releaseDiscovery` files and `docs/reports/whats-new-changelog/` are untracked/modified by sessions other than this audit and other than 3A.2; this audit makes no completeness claim about them beyond confirming their presence and not touching them. `.github/workflows/build-android-test-release.yml` and `.perch/PERCH.md` are pre-existing unrelated modifications, untouched. **Preservation confirmed at both captures:** the two preserved stage reports, both pre-existing unrelated modifications, and all unrelated concurrent work remain byte-untouched, unstaged and uncommitted. No staging, committing, pushing, stashing, resetting, cleaning or checking out occurred at any point in this audit.

## 13. Findings register

| ID | Severity | Classification | Location | Consequence / affected requirement |
|---|---|---|---|---|
| F-01 | Medium | Acceptance gap | `bolu-operations.ts:576` (`validateModifyFieldString`), `:668-676` (rich text), `:688-694` (string/date); executor writes `bolu-document-service.ts:1353-1355` | Omitted scalar `newValue` silently becomes a clear of the field after Gate 1/2 approval (Preview shows `→ —`). Widened by 3A.2 to `terms`/`title`/`po_number`. Requirement: widened fields must carry explicit stale-guard behaviour; an ambiguous clear path violates the fail-closed intent of the Gate 1 contract. |
| F-02 | Medium | Defect | `bolu-operations.ts:647-656`; `bolu-document-service.ts:1345-1351` | Booleans coerce to `₦1`/`₦0` (false clears a charge); numeric strings accepted silently. Requirement: out-of-domain values reject, not clamp/coerce. |
| F-03 | Medium | Acceptance gap | `assistant-chat-parts.tsx:425-433` | Plain-text artifact omits Discount/WHT lines the card renders; copied artifact understates the approved money. Known-acknowledged in delivery report; confirmed still present. |
| F-04 | Low | Limitation | `assistant-chat-parts.tsx:425-433` | Clearing-to-zero is explicit on the card, only implicit in the artifact. |
| F-05 | Low | Limitation | `bolu-document-service.ts:1406, 1414`; `:1325`; `bolu-generation.ts:468-470` | camelCase payload keys in user-facing prose; semi-technical baseline refusal. NL business-language standard. |
| F-06 | Low | Limitation | `bolu-document-service.ts:1595, 1611, 1622` | Backend error fragments may surface in failure copy (pre-existing). |
| F-07 | Info | Limitation | `bolu-operations.ts:1204-1234` (`toBoluItemsFromPersisted`) | Group headers flattened to zero-total standard rows for preview totals (no money distortion). |
| F-08 | Info | Limitation | `bolu-operations.ts:1217` | `install_rate_taxable === true` preview asymmetry; harmless while the column is boolean (migration-verified). |
| F-09 | Low | Acceptance gap | `bolu-generation.ts:427-470` | No generation-level modify test; wiring proven by inspection + shared builder + analogous advance path, not by dedicated test. |
| F-10 | Info | Limitation | n/a | No live disposable-tenant verification for 3A.2. |
| F-11 | Low | Acceptance gap | `assistant-chat-parts.tsx:1329` | Title-only/no-money modify proposals render "totals calculated at save" fallback; misleading but harmless. |
| F-12 | Info | Limitation | `bolu-document-service.ts:1605-1625` | Non-RPC fallback item re-write window; stale checks are not database-atomic; RPC is the atomic path. |
| F-13 | Info | Defect | `assistant-chat-parts.tsx:269` | Lowercased charge labels re-capitalise first letter only. |
| F-14 | Info | Acceptance gap | `assistant-chat-parts.tsx:247` | `.ac-modify-diff` unstyled (reuses `ac-advance-*`). |

None of the findings demonstrate a calculation, stale-write, security or data-preservation failure. F-01/F-02/F-03 are bounded, visible at Gate 1, and repairable in a small, separately authorizable change.

## 14. Known limitations and unknowns

1. **Four-viewport inspection: not performed** (§10).
2. **No live disposable-tenant verification** for 3A.2 (F-10); behaviour evidenced via in-memory harness + SSR markup smoke only (the latter performed by the implementer; not repeated by this audit).
3. **In-process vs database atomicity** — the stale/expiry guards are not database-atomic; correctness relies on the composite RPC contract and on the touched-key comparison windows (F-12). Cross-instance replay protection remains in-process (`executedOperationIds`).
4. **Non-touch key concurrency** — merges preserve untouched concurrent changes by design; only touched keys are stale-checked.
5. **Group sections** — only totals-relevant flattening handled; full group support is 3B scope.
6. The concurrent "What's New" worktree state is present and unattributed to 3A.2 (§12).
7. The pre-existing failing test and its mock repair are out of scope pending separate authorization.
8. Production state has not been inspected; no migration, RPC or schema review was performed (out of scope by constraint).

## 15. Overall acceptance decision

**Conditionally accepted.** All material Stage 3A.2 requirements are substantially met: the complete widened catalog is implemented through the same engine the form uses; every widened field carries a Gate 1 preview row and a Gate 2 stale guard; payment-term storage asymmetry is preserved; model arithmetic is ignored on both gates; preservation invariants hold; tests and typecheck are green; the one pre-existing failure is verified unrelated. The conditions are bounded and enumerated: (a) F-01 and F-02 must be assessed as gates for the next authorized change to the validator (they are not data-loss defects — Gate 1 approval and the stale baseline still bound the change); (b) F-03 (artifact discount/WHT omission) should be corrected in the implementation report's known-gap list at the next change; (c) four-viewport verification and live disposable-tenant verification remain open and were not authorized/available for this stage; (d) F-09 should be closed before Stage 3B relies on the wiring. No finding requires rejection; rejection criteria (fixed-charge tax treatment mismatch, stale-check bypass, wrong persisted totals, evidence of preservation or security failure) were **not** demonstrated.
