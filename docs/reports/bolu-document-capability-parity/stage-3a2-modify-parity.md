# Stage 3A.2 - Existing-Document Field & Commercial Charge Modifications

**Date:** 2026-11-18 · **Status:** Implemented, verified, uncommitted · **Type:** Scoped implementation + verification for modifying scalar fields, fixed commercial charges, named extra charges and calculation inputs on **existing** invoices and quotations.

## What was delivered

### Contract & validation (`src/lib/ai-assistant/bolu-operations.ts`)
- `BoluModifyFieldKey` union (13 fields): `client_name`, `notes`, `payment_terms`, `due_date`, `issue_date`, `terms`, `po_number`, `title`, `project_id`, `work_duration`, `workmanship`, `transportation`, `shipping`.
- New payload blocks: `extraChargesChange` (the **complete resulting list** of named charges) and `calculationInputsChange` (partial patch; allow-list `vatPercent` (0-100), `discountValue` (>=0), `discountType`, `discountTiming`, `whtValue` (>=0; percent modes bounded at 100), `whtType`; unknown keys and duplicate charge labels are rejected). `documentFamily` is accepted on the payload.
- `BoluDocumentModifyProposal` widened: `oldValue`/`newValue` (rich-text arrays supported), `extraChargesChange { oldExtraCharges, newExtraCharges }`, `calculationInputsChange { old, new }`, `computedTotals` extended (`discount`, `wht`, `installRateTotal`, `extraChargesTotal`), and `chargesSnapshot` (effective fixed charges for executor/preview carry-through).
- `validateInvoiceModifyInput` rewritten: family-aware; **quotation `work_duration` rejected** (invoices only); **`client_name` may not be cleared** (renaming supported, the form requires a customer too); notes/terms accept the rich-text contract or plain strings; fixed charges accept finite non-negative numbers only; a modification must request at least one field, items, extra charges or calculation inputs.
- `buildInvoiceModifyProposal` rewritten: when `current` (the persisted snapshot the caller passes) is supplied, **every scalar baseline is read from the snapshot, never from the model** — per-family resolution included (`title` → `invoice_title`/`quotation_title`, quotation `payment_terms` → `custom_fields.payment_terms`, quotation `due_date` → `valid_until`). A persisted baseline is mandatory for stale-checked scalar edits. When items/charges/inputs change, the Gate 1 preview is recomputed by `computeAuthoritativeTotals` (fixed charges as non-taxable additions; named charges with their VAT flag; stored `calculationInputs` merged with the requested patch; missing `calculationInputs` fall back to form defaults). `chargesSnapshot` is always attached. Persisted group-header rows contribute 0 to the recompute (no totals distortion).

### Executors & persistence (`src/lib/ai-assistant/bolu-document-service.ts`)
- `FamilyModifyConfig` gains `titleField`; both modify selects already carry the full scalar/charge/cf surface (`workmanship`, `transportation`, `shipping`, `custom_fields`, totals).
- **Fail-closed on missing persisted baseline** for every scalar edit (`proposal.oldValue === undefined` → refusal) — before any read or write.
- Stale check now covers rich text (both sides normalized through `normalizeBoluRichText`) and all new scalar fields.
- **Fixed charges:** executor enforces finite non-negative values (builder too); **clearing to 0 is an explicit write of 0**, never an omission.
- **Project reference:** `verifyProjectReference` reused — an id that is not an active (non-archived) project in the tenant, or a lookup that fails, is discarded with a warning (`updates.project_id = null`); explicit clear (`newValue: null`) skips verification; other persist failures stay untouched.
- **Named extra charges & calculation inputs:** merged onto the persisted `custom_fields` document (never clobbering sibling keys such as `chargeLabels`, `created_via`, `operation_id`); unknown persisted charges are preserved; charges matched by lower-cased label; **stale guard re-verifies the proposal baseline before any write** (extra charges: full normalised old-set vs persisted, mismatch → refusal; calculation inputs: baseline per touched key, with a default-match allowance for legacy documents missing the key).
- **Canonical recalculation** via `computeDocument` now runs whenever items, fixed charges, named extra charges or calculation inputs changed, using the persisted items + merged cf + effective charges; writes `subtotal`, `discount`, `vat`, `wht`, `total`, `install_rate_total`, `amount_in_words`. Totals are identical in nature to the document form.
- `custom_fields` serialization follows the family convention (invoice → JSON text, quotation → jsonb object) via a single pending document assembled from the sections, written once.
- Modification audit now records `changedField: 'extra_charges' | 'calculation_inputs'` for block-only changes; structured-text values are summarized as `[structured text]` in the audit row.

### Conversational wiring (`bolu-data.ts`, `bolu-generation.ts`, `bolu-runtime.ts`)
- New `readBoluModifySnapshot` (`bolu-data.ts`): reads the persisted row (all scalar/charge/cf fields + number + `archived_at` guard) and its items at proposal time. Both live paths (`bolu-generation`, `bolu-runtime`) **fail closed** with a plain message when the snapshot cannot be read, and build the proposal with `current` from that snapshot.
- Invalid modify envelopes now surface their validation errors in the assistant reply (`validation.errors`) instead of being silently dropped (mirrors the Advance Invoice path).

### Preview & copy artifact (`assistant-chat-parts.tsx`)
- New `ModifyDiffPanel` on the modify card: before → after rows for the scalar change (rich text summarized through `plainTextOf`), calculation-input rows with business labels (`VAT rate (%)`, `Discount`, `Discount type`, `Discount timing`, `WHT`, `WHT type`), and the named-charges set as before → after with **New** / **Removed** markers and VAT flags. **A fixed charge cleared to 0 renders a "Cleared" marker** plus an explanatory note ("This clears the <charge> to zero - the charge will no longer be applied on this document.").
- `proposalPlainText` parity: the same rows (field, inputs, charges with `[new]` / `[removed]`) are emitted; card totals show the effective VAT percent when the patch changes it; no internal keys (`custom_fields`, `calculation_inputs`) appear in rendered text or the artifact.

### Prompt (`api/bolu-chat.ts`)
- `modify-document` bullets updated to the supported scalar/block catalog, full-list semantics for `extra_charges`, `calculation_inputs` allow-list and ranges, "never output `oldValue` baselines — the application fills them from the saved document", the quotation `work_duration` limitation, an explicit plain-business rule when clearing a charge (name the charge, say it was cleared), and group-header/PDF-appearance entries were added to the refusal list. Business-language standard retained; no module names in user-facing prose.

### Tests
- **New** `src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js` — 25 tests: (a) scalar round-trip + fixed-charge recompute + clearing-to-zero; quotation title/`valid_until`, executor `work_duration` refusal; (b) project verification incl. error-fail-closed; (c) extra-charge add/remove/recompute/stale gate, calc-input persistence + VAT/total recompute vs the engine, stale-key rejection, unknown-key rejection; (d) fail-closed missing baseline, rich-text round-trip + stale rejection, client/date round-trips; (e) preservation of notes/terms/items/sibling cf keys, quotation payment_terms cf baseline; (f) snapshot-not-model baselines, computed totals carried, `proposalPlainText` content + internal-key absence, default baseline on legacy documents; (g) `readBoluModifySnapshot` round-trip + fail-closed null.
- Two Stage-2-era tests updated to the new contract: `bolu-operations.test.js` (error message regex), `bolu-save-diagnostic-edit-remediation.test.ts` (modification `extra_charges` now *accepted* as the desired full list; duplicate labels rejected).

## Verification (exact commands & results)

| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js` | **25 pass / 0 fail** |
| `bun test src/tests/ai-assistant/` (full directory) | **571 pass / 1 fail / 572 tests** |
| `bun run audit:load` | **1125 files scanned; 58 oversized / 8 broad selects / 1 component fetch / 4 heavy limits** — no new ❌/🚨 in the 3A.2 files; one additional file is now over the 600-line threshold (`bolu-runtime.ts`, 602 lines). `assistant-chat-parts.tsx`, `bolu-data.ts`, `bolu-operations.ts`, `bolu-document-service.ts` and `bolu-generation.ts` remain on the oversized list as before. |
| `bun run typecheck` (`tsc --noEmit`) | **exit 0** (no TS errors) |
| SSR smoke (scratch `renderToStaticMarkup` over `ProposalCardView` with a full 3A.2 modify proposal: charge-to-zero, named charges, calc-input change; scratch file deleted afterwards) | **PASS** — renders the document number, the "Cleared" marker, named-charge rows and calculation-input labels; no `calculation_inputs`/`custom_fields` leakage |
| `bun run build` | Not run (prohibited on this host) |

Pre-existing failure, unchanged and not introduced by this stage: `src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js` — "An authorized create/edit role can save an invoice through Gate 2" (`createPersistenceMock()` lacks `.limit(1)`). Repair still requires separate authorization.

## Git state at reporting time

`git status --porcelain=v1` after verification:

```
 M .github/workflows/build-android-test-release.yml   <- pre-existing, NOT authored by 3A.2
 M .perch/PERCH.md                                   <- pre-existing, NOT authored by 3A.2
 M api/bolu-chat.ts
 M src/components/ai-assistant/chat/assistant-chat-parts.tsx
 M src/lib/ai-assistant/bolu-data.ts
 M src/lib/ai-assistant/bolu-document-service.ts
 M src/lib/ai-assistant/bolu-generation.ts
 M src/lib/ai-assistant/bolu-operations.ts
 M src/lib/ai-assistant/bolu-runtime.ts
 M src/tests/ai-assistant/bolu-operations.test.js
 M src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts
?? docs/reports/bolu-document-capability-parity/stage-2-final-verification.md      <- preserved, untouched, not staged
?? docs/reports/bolu-document-capability-parity/stage-3-full-field-parity-audit.md  <- preserved, untouched, not staged
?? src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js
```

Stage-scoped diff: 9 tracked files changed, **1131 insertions(+), 94 deletions(-)**, plus the new test file (877 lines). **This stage created no commits, pushes, stashes, resets or cleans.** The two preserved untracked reports were neither read-modified nor staged.

## Limits / honest qualifications

- **Responsive viewport inspection (all four classes) was NOT performed.** The app cannot boot in this sandbox (Vite `504 Outdated Optimize Dep`; paired Chrome offline). The new preview rows reuse the established `ac-advance-*` row pattern (single-file, no layout restructure); evidence is limited to typecheck, SSR markup smoke and the suite — **do not cite viewport verification**.
- **No live disposable-tenant verification** for 3A.2. Builder/executor behaviour is verified against the in-memory harness and SSR only; the `bolu-generation`/`bolu-runtime` modify branches are exercised structurally by suite (the modify path has no dedicated generation-level test — a pre-existing coverage gap, symmetric with the advance-invoice path which is threaded through tests as of Stage 2). Live execution against the disposable project remains unrun.
- **Stale protection is scoped to the touched keys** (extra-charges baseline = full normalised old set; calculation inputs = per-key baseline). A concurrent edit to an untouched key is *preserved* rather than rejected — by design (merge-over-current-persisted prevents clobbering).
- Without a persisted snapshot (unit contexts with no tenant client) the builder falls back to payload-supplied baselines, which still fail closed at the executor when absent; the live paths (`bolu-generation`, `bolu-runtime`) always build from the snapshot.
- The `proposalPlainText` artifact for modify proposals omits the discount/WHT lines (unchanged from 3A.1 behaviour); block-only audits record a name-only marker (`extra_charges`/`calculation_inputs`) with null value.
- New-document creation, advance changes, status transitions, group headers, item image upload, PDF appearance/output controls, and any RPC/migration/schema changes remain **out of scope** (Stages 3B/3C). `client_name` clearing is deliberately rejected.
