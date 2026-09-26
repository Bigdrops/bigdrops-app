# Automatic vs Manual Number Allocation Report

This report was written by Muse Spark on 2026-09-26 via opencode.

## Objective

Separate automatic sequence progression from manual identifiers. Manual numbers must never advance the automatic cursor. Automatic allocation must skip occupied identifiers. No schema change was permitted unless proven necessary.

## Scope

The six numbered families: Invoice, Quotation, Waybill, RFQ, BOQ, CSR. Their create, convert, duplicate, blank, preview, and settings paths. Receipts, letters, and projects were audited and left unchanged.

Out of scope:

- Database migration. None created.
- Historical number rewrites. None made.
- Settings UI redesign. None made.
- Time inputs, calculations, PDFs. Untouched.

## Files changed

Standard:

- `docs/standard/prefix-engine-settings-standard.md` (new normative §5)

Shared allocation core:

- `src/domain/prefixConstants.ts` (cursor helpers, skip-scan, `nextAutomaticNumber`, settings-merge helpers)
- `src/domain/documentNumbering.ts` (new; cursor fetch and best-effort bump)

Generators (optional cursor parameter, backward compatible):

- `src/domain/documentConversion.ts`
- `src/domain/quotation/normalize.ts`
- `src/domain/rfq/normalize.ts`
- `src/domain/boq/normalize.ts`
- `src/components/waybill/waybillUtils.ts` (plus extracted routing helper)
- `src/domain/csr/csrNumbering.ts` (family helper extraction)

Save paths (manual flags, cursor reads, success bumps):

- `src/hooks/useInvoiceSave.ts`
- `src/hooks/useQuotationSave.ts`
- `src/domain/waybill/waybillMutations.ts`
- `src/pages/NewRfq.tsx`
- `src/pages/NewBoq.tsx`
- `src/pages/CsrFormPage.tsx`
- `src/pages/view-csr-actions.ts`
- `src/pages/view-rfq-actions.ts`
- `src/pages/view-boq-actions.ts`
- `src/pages/view-waybill-actions.ts`
- `src/pages/view-quotation-actions.ts`
- `src/modules/invoices/services/invoiceConversionService.ts`
- `src/modules/invoices/services/invoiceLifecycleService.ts` (duplicate prefill cleared)

Form previews and manual detection:

- `src/pages/InvoiceFormPage.tsx`
- `src/pages/QuotationFormPage.tsx`
- `src/pages/WaybillFormPage.tsx`
- `src/pages/Invoices.tsx` (duplicate prefill cleared)

Settings preservation:

- `src/pages/settings/DocumentPrefixesSettingsSection.tsx`

Tests:

- `src/tests/critical/documentNumbering.test.js` (extended to 17 tests)

## Skills used

Skills used: karpathy, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

The karpathy skill guided this work. It was loaded in this session and its discipline still applies. The supabase-postgres-best-practices skill was loaded for this task. Its concurrency and RLS guidance shaped the design: no application locks, the uniqueness constraint arbitrates, and cursor writes reuse the existing permitted settings update path. The typescript-advanced-types skill was evaluated and not loaded. The implementation uses plain interfaces only.

## Documentation standard

This report uses ASD-STE100 Simplified Technical English. It uses short sentences. It uses active voice. It uses one idea per paragraph.

## Provenance limitation analysis

Persisted document rows carry no automatic or manual provenance. Only the number string is stored. Shape-based guessing is forbidden by the task brief. A persisted cursor is therefore genuinely necessary. This analysis was completed before choosing the design.

A new sequence table was rejected. It needs a migration across all tenant schemas, template updates, RLS, and a push loop. The task forbids schema changes unless necessary. A smaller binding exists.

The chosen binding stores per-family cursors in `settings.document_prefixes` under the reserved key `__auto_seq`. Evidence for safety:

- The CHECK constraint pattern-checks listed prefix keys only. The reserved key needs no migration.
- The settings update policy already permits writes.
- Cursor values are advisory. Uniqueness plus skip-scan over ground-truth rows arbitrate every allocation.
- Bumps are monotonic and best-effort. Failures warn and never block creation.
- Stale cursors self-heal through collision retry. They cost retries only.

## Changes made

### Pure allocation core

`nextAutomaticNumber(family, cursor, occupied, maxSeq)` starts at the cursor, or bootstraps above all rows when absent. It skips occupied identifiers. Manual numbers in the occupied set never move the start. They are only skipped when reached.

Helpers cover cursor read, monotonic merge, family clearing, prefix-key family mapping, settings-merge writes, and reset writes.

### Manual identity detection

A field value counts as manual only when it differs from the last system pre-fill. Invoice, Quotation, Waybill, and CSR forms record the pre-fill in a ref and compare at save. RFQ and BOQ fields start empty, so any value is manual. Duplicate prefills carry an empty number, uniform with quotation and CSR duplicates.

### Save behavior

Manual numbers attempt exactly and fail loudly on duplicates. Automatic paths read a fresh cursor, skip occupied identifiers, retry collisions, and bump the cursor after success. System flows without user values (duplicates, converts, blanks) allocate and bump identically.

### Settings behavior

Prefix saves merge over fresh raw JSON. Cursor state survives edits. Solo resets clear the affected families. Full reset drops all cursor state. Historical numbers are never touched.

## Verification result

Verification:

- `bun run typecheck`: passed with zero errors.
- Focused tests `documentNumbering` and `boqNormalize`: 20 passed. This includes the exact required 7-step sequence, skip behavior, bootstrap, helper unit tests, wiring assertions, and all prior contract tests.
- `bun run audit:load`: passed with only pre-existing warning categories. Two CSR queries grew to the established limit-1000 rows pattern already used by invoice and waybill flows.
- Neighbor form tests: 16 passed, 9 failed. All 9 failures are pre-existing stale tests referencing files that do not exist or outdated UI text in files this task did not touch.
- `git status` and `git diff`: only intended files changed. Other agents' files preserved.
- `supabase db push`: not applicable (no SQL change).
- `bun run build`: not executed (banned for this task).

## Supabase push status

No database change. Push not required.

## Risks or limitations

- Cursor bumps are best-effort. A failed bump leaves a stale cursor. The next allocation self-heals through one collision and retry.
- Long-lived forms may show a stale preview number. Save-time allocation is authoritative.
- Abandoned pre-fills and duplicates can leave gaps. Gaps are permitted. Duplicates are impossible.
- CSR letter-suffix legacy increments now resolve to digit candidates. The old letter-increment path had no cursor equivalent. No collision is possible.
- Receipts, letters, and projects keep their existing generators. They expose no manual number fields, so the distinction cannot arise there.

## Deferred work

- None for the allocation contract. All six families implement it.
- Dirty-flag edit tracking was considered and rejected. Pre-fill comparison gives the same signal with less state.
- The pre-existing `itemCleanupExportImport` merge-group failure belongs to another agent. It is unrelated to numbering.
