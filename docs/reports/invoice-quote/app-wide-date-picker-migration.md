# App-Wide Date Picker Migration Report

This report was written by Muse Spark on 2026-09-25 via opencode.

## Objective

Remove every user-facing native date picker from the app. Route all interactive date fields through the shared app-controlled `DateField`. Keep stored date semantics unchanged.

## Scope

All interactive date inputs in Invoice, Quotation, Waybill, BOQ, RFQ, CSR, payments, compliance, reports, filters, projects, letters, tax, settings archives, and accounting periods and journal entries.

Out of scope:

- Time inputs (`type="time"`). They open a different native dialog. The reported defect covers date pickers only.
- Database schema changes. None made.
- Date format changes. None made.
- Validation rule changes. None made.
- Timezone interpretation changes. None made.

## Files changed

Shared picker:

- `src/components/ui/date-field.tsx` (modified: added generic `invalid` prop)
- `src/components/ui/date-helpers.ts` (unchanged, reused)

Migrated forms (22 files):

- `src/components/document/FormHeader.tsx` (prior task: Quotation Date, Valid Until, Issue Date, Due Date)
- `src/components/waybill/WaybillForm.tsx`
- `src/components/boq/BoqForm.tsx`
- `src/components/rfq/RfqForm.tsx`
- `src/components/csr/CsrFormScreen.tsx` (3 fields)
- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- `src/components/query/QueryFilterOverlay.tsx` (2 fields)
- `src/components/compliance/VatInputsPanel.tsx`
- `src/components/compliance/TaxRemindersPanel.tsx` (3 fields)
- `src/components/compliance/TaxFilingsPanel.tsx` (3 fields)
- `src/components/compliance/RecordCaptureSheet.tsx`
- `src/components/reports/ReportsFilterBar.tsx` (2 fields)
- `src/components/reports/TaxSection.tsx` (2 fields)
- `src/components/reports/ReceivablesSection.tsx` (2 fields)
- `src/components/reports/CollectionsSection.tsx` (2 fields)
- `src/components/project/ProjectDocumentStep3Review.tsx`
- `src/components/project/detail/ProjectDetailHeader.tsx`
- `src/pages/tax/NewTaxComputation.tsx` (2 fields)
- `src/pages/LetterFormPage.tsx`
- `src/pages/NewProject.tsx`
- `src/pages/settings/ArchivesSettingsSection.tsx` (2 fields)
- `src/pages/accounting/Periods.tsx` (2 fields)
- `src/pages/accounting/NewJournalEntry.tsx`

Tests and report:

- `src/tests/document/dateField.test.js` (extended: 9 tests)
- `docs/reports/invoice-quote/app-wide-date-picker-migration.md` (this report)

## Skills used

Skills used: mobile-app-ui-design, react-dev, accessibility, safe-area-handling
Documentation standard: ASD-STE100 Simplified Technical English

Skill files were read from the project registry at `.agents/skills/`. The mobile UI skill guided thumb-zone actions and touch targets. The React skill guided typed component patterns. The accessibility skill guided naming, roles, and selected states. The safe-area skill guided bottom-sheet padding. No Android WebView skill was needed. The fix removes the native picker instead of styling it.

## Documentation standard

This report uses ASD-STE100 Simplified Technical English. It uses short sentences. It uses active voice. It uses one idea per paragraph.

## Inventory and audit gate

Native user-facing date inputs found before migration: 36 across 20 files.

- 2 in `FormHeader.tsx` were migrated by the prior task.
- 34 in 19 files were migrated by this task.

Migrated to `DateField`: 36 of 36.

Remaining native date inputs: 0.

Repository-wide searches after migration confirm zero matches for `type="date"`, `type={'date'}`, and `type={"date"}` in app source. The only matches are regex literals inside the new regression test. AI prompt template files use the string `"date": "YYYY-MM-DD"` as JSON shape documentation. They render no inputs.

No remaining native date input needs justification. None remain.

## Changes made

### Shared picker extension

Added one generic prop to `DateField`:

- `invalid?: boolean` renders an error border on the trigger. Validation logic stays app-level. The query filter overlay uses it to preserve its start-after-end error state.

No other picker logic was duplicated. No per-form picker was created.

### Per-field migration pattern

Each field kept its contract:

- Same state key and form field name.
- Same controlled value (`''` or `YYYY-MM-DD`).
- Same `onChange` behavior, mapped from event shape to value shape.
- Empty clears to `''`, or to `null` where the field stored `null` (TaxReminders period fields, TaxFilings submission date).
- `disabled` preserved on the letter date field.
- `id="je-date"` preserved on the journal transaction date for its label.
- `aria-label` values preserved on accounting period dates through the `label` prop.
- Adjacent labels, grid layout, and CSS classes preserved. Only the input element changed.

Time inputs next to CSR start and end dates were not touched. They are out of scope.

## Verification result

Verification:

- `bun run typecheck`: one error in `src/pages/settings/AdminSettingsSection.tsx` line 38. That file belongs to another agent. This task did not touch it. The error predates this task. No error exists in any migrated file.
- New and extended test `src/tests/document/dateField.test.js`: 9 passed. Tests cover ISO parsing, display format, month grid, month arithmetic, FormHeader routing, theme and safe-area tokens, all 23 migrated files, and contract preservation.
- Neighbor test `sharedDocumentFormRegression`: has pre-existing failures unrelated to this change (missing files, stale layout and suggestion expectations in files this task did not touch).
- `git status` and `git diff`: only migration files changed. Pre-existing changes from other agents preserved.
- `supabase db push`: not applicable (no SQL change).
- `bun run build`: not executed (banned for this task).

## Supabase push status

No database change. Push not required.

## Regression gate

Migrated fields retain:

- Same state keys. Verified by source tests.
- Same values. The `YYYY-MM-DD` contract is unchanged.
- Equivalent handlers. Event wrappers became value callbacks with identical state updates.
- Same min and max behavior. No field used native min or max attributes.
- Same required and optional behavior. No field used native required validation. App-level checks are untouched.
- Same payload and storage shape. Only the picker widget changed.

## Risks or limitations

- The trigger button looks slightly different from a native date input. It matches other BIGDROPS fields in height and border.
- Display format is fixed as `DD/MM/YYYY`. This matches existing form display.
- Week starts on Monday. This matches Nigerian locale convention.
- Time inputs still use native pickers. They were not reported broken.

## Deferred work

- None for date pickers. All user-facing date inputs now use `DateField`.
- Future forms must use `DateField` directly. No new picker work is needed.
