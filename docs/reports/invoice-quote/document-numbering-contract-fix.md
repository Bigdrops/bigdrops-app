# Document Numbering Contract Fix Report

This report was written by Muse Spark on 2026-09-25 via opencode.

## Objective

Fix two defects in document numbering. Make automatic generation follow the Settings preview format. Preserve manually entered document numbers through save.

## Scope

Invoice, Quotation, Waybill, RFQ, BOQ, and CSR numbering. Duplicate flows for the same types. Receipts, letters, and projects were audited and left unchanged.

Out of scope:

- Database migration. None needed.
- Historical number rewrites. None made.
- Settings UI redesign. None made.
- Time inputs and time pickers. Untouched.

## Files changed

Shared contract:

- `src/domain/prefixConstants.ts` (added canonical formatter)
- `src/lib/withUniqueRetry.ts` (unchanged; its existing `initialValue` parameter is now used)

Automatic generation:

- `src/domain/documentConversion.ts` (`getNextInvoiceNumber`)
- `src/domain/quotation/normalize.ts` (`getNextQuotationNumber`)
- `src/domain/rfq/normalize.ts` (`getNextRfqNumber`)
- `src/domain/boq/normalize.ts` (`getNextBoqNumber`)
- `src/domain/csr/csrNumbering.ts` (new; pure helpers moved verbatim from component layer)
- `src/components/csr/csrUtils.ts` (re-exports domain helpers; no behavior change)
- `src/pages/QuotationFormPage.tsx` (inline generation replaced with shared helper)
- `src/pages/view-rfq-actions.ts` (duplicate flow)
- `src/pages/view-boq-actions.ts` (duplicate flow)
- `src/pages/view-waybill-actions.ts` (duplicate flow)
- `src/pages/view-csr-actions.ts` (duplicate flow prefix resolution)
- `src/modules/invoices/services/invoiceLifecycleService.ts` (duplicate flow)

Manual preservation:

- `src/hooks/useInvoiceSave.ts` (both insert paths)
- `src/hooks/useQuotationSave.ts`
- `src/domain/waybill/waybillMutations.ts`
- `src/pages/NewRfq.tsx`
- `src/pages/NewBoq.tsx`
- `src/pages/InvoiceFormPage.tsx` (init guard)
- `src/pages/QuotationFormPage.tsx` (init guard; same edit as generation fix)

Test infrastructure and coverage:

- `src/tests/resolve-alias.js` (directory barrel resolution)
- `src/domain/invoice/advanceConfig.ts` (type-only import fix)
- `src/domain/rfq/normalize.ts` (type-only import fix)
- `src/tests/critical/documentNumbering.test.js` (new; 12 tests)
- `src/tests/critical/boqNormalize.test.js` (updated stale format expectations)

## Skills used

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

The karpathy skill guided this work. Think before coding, simplicity first, surgical changes, and goal-driven verification were applied. The typescript-advanced-types skill was evaluated and not loaded. No advanced type work was needed. No Supabase skill was loaded. No migration and no RPC change was needed. The supabase-postgres-best-practices skill was evaluated and not loaded for the same reason.

## Documentation standard

This report uses ASD-STE100 Simplified Technical English. It uses short sentences. It uses active voice. It uses one idea per paragraph.

## Root causes

### Defect 1: preview and generation disagreed

Settings previews `${prefix}-000001` with a 6-digit serial. Real generators used independent formats:

- Invoice: `${prefix}` plus 3-digit serial with no dash (`SASINV113`).
- Quotation: dash with 4 digits inline in the form, dash with 3 digits in the shared helper.
- RFQ and BOQ: dash with 3 digits in shared helpers, dash with 4 digits and hardcoded prefixes in duplicate flows.
- Waybill duplicates: hardcoded legacy families with 4-digit serials.
- Invoice duplicates: hardcoded `SASINV-B` family with 3-digit serials.

Each path built its own string. No shared formatter existed. The prefix-engine standard mandates `{prefix}-{6-digit}` but no code enforced it.

### Defect 2: manual numbers were overwritten

All create paths wrap inserts in `withUniqueRetry`. The utility regenerates the candidate before the first attempt. Every `insertFn` then assigned the candidate unconditionally. The manual number never reached the database. The utility already accepted an `initialValue` first candidate. Only the CSR form passed it. All other call sites ignored it.

Form init effects added a second overwrite. Invoice and Quotation create forms set the generated number unconditionally when settings finished loading. A number typed before the fetch resolved was replaced.

## Changes made

### Canonical formatter

`src/domain/prefixConstants.ts` now exports:

- `DOCUMENT_SERIAL_WIDTH = 6`.
- `formatDocumentNumber(prefix, sequence)` returns `${prefix}-${padded}`.
- `parseTrailingSequence(value)` extracts trailing digits or returns null.

All automatic generators use it. Fallback defaults now match `DEFAULT_PREFIXES` per the standard (`INV`, `QTN`; RFQ, BOQ, CSR, WBL already matched).

Result for the reported tenant: existing `SASINV110` to `SASINV113` rows yield next number `SASINV-000114`. Counters are not reset. History is untouched. Other families and custom identifiers do not affect the sequence. Same-prefix custom numbers join the max scan so the next automatic number cannot collide.

### Duplicate flows

RFQ, BOQ, waybill, invoice, and CSR duplicates now resolve the tenant prefix from settings and call the shared generators. Hardcoded families and hand-rolled max logic are removed. Serial width is 6 digits everywhere.

### Manual preservation

Each create path passes the trimmed manual number as the `initialValue` first candidate:

- Invoice (RPC and fallback paths), Quotation, Waybill, RFQ, BOQ. CSR already did this.
- Empty manual values pass `undefined`, so automatic sequencing runs unchanged.
- A 23505 collision on a manual number regenerates from the shared sequence and retries. Uniqueness protection is intact.
- Receipts stay automatic-only. They expose no user number field.
- Letters stay automatic-only. Their form exposes no number field.

### Form init guards

Invoice and Quotation create forms fill the generated number only when the field is empty. Typed manual numbers survive late settings loads. CSR and Waybill forms already guarded this way.

### CSR helper relocation

`getNextCsrNumber` and `incrementTrailingLetters` moved verbatim to `src/domain/csr/csrNumbering.ts`. The component file re-exports them. Existing importers keep working. Behavior is identical. This allows direct unit testing without the tsx preview chain.

## Verification result

Verification:

- `bun run typecheck`: one error in `src/pages/settings/AdminSettingsSection.tsx` line 38. That file belongs to another agent. This task did not touch it. No error exists in any file this task changed.
- `bun run audit:load`: passed with only pre-existing warnings. No new warning categories.
- New test `src/tests/critical/documentNumbering.test.js`: 12 passed.
- Updated test `src/tests/critical/boqNormalize.test.js`: 3 passed.
- Full suite `bun run test`: 465 passed, 5 failed.
- Failure detail: 4 failures are pre-existing environment errors (`import.meta.env` missing in invoiceAccountingIntegration, paymentAccountingIntegration, remediationContract, sourceTransactionContract). 1 failure (`itemCleanupExportImport` merge-group validation) was proven pre-existing by running it on a pristine HEAD worktree without these changes. It belongs to another agent's item-library work.
- `git status` and `git diff`: only intended files changed.
- `supabase db push`: not applicable (no SQL change).
- `bun run build`: not executed (banned for this task).

## Supabase push status

No database change. No migration file was created. Push not required.

## Risks or limitations (corrected by follow-up audit 2026-09-26)

- New automatic numbers use 6-digit serials. Old short numbers remain in history. Mixed widths can coexist in listings. This is expected during transition.
- A manual number inside the active prefix family advances the next automatic number past it. This prevents collisions. It is intended. Evidence is documented in the follow-up report `document-numbering-manual-collision-fix.md`.
- CORRECTION (follow-up audit 2026-09-26): earlier text described both regeneration-after-manual-collision and failure on manual duplicates. Only the second holds. A caller-supplied manual number is authoritative. On a 23505 collision the duplicate error returns at once. No automatic substitution ever follows a manual collision. The user must pick another number or clear the field for a fresh automatic number. See follow-up report `document-numbering-manual-collision-fix.md` for proof.
- The query filter overlay and other pre-filled create forms pass their displayed number as the first candidate. On a rare race where that displayed number was already claimed, the save now surfaces the duplicate error instead of silently saving a different number. Recovery is to clear the field and save again for a fresh automatic number, or enter a distinct number.
- Duplicate flows now read the settings table. This adds one query per duplicate action. The pattern matches the existing payment service code.

## Deferred work

- Projects use a date-based code scheme outside the six-type contract. Left unchanged.
- Receipt and letter numbering already follow the 6-digit contract. No change needed.
- Hardcoded `SASINV-B001` style references in tests and mock data are fixtures. They were not rewritten.
- The `itemCleanupExportImport` merge-group failure needs its owner. It is unrelated to numbering.
