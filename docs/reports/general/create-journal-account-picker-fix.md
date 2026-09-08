# Create Journal Account Picker Fix Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Replace the browser-style account picker in Create Journal with a BIGDROPS-themed picker.

## Scope

- File changed: `src/pages/accounting/NewJournalEntry.tsx` only.
- No changes to Journal, validation, accounting service, chart of accounts, schema, Settings, or More navigation.

## Files changed

- `src/pages/accounting/NewJournalEntry.tsx`
- `docs/reports/GENERAL/create-journal-account-picker-fix.md` (this report)

## Skills used: shadcn, tailwind-capacitor, mobile-android-design

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- The defect was the native `<select>` element used for per-line account selection. On Android it summons the OS browser picker. No `alert`, `confirm`, or `prompt` was involved.
- Replaced each journal-line account `<select>` with the shared `Combobox` component (`src/components/ui/combobox.tsx`). This is the same picker used by `ClientSelector`.
- The `Combobox` opens a bottom drawer Sheet on mobile and a popover on desktop. It includes search, selected-state check marks, and an empty state.
- Options map active accounts to `{ value: code, label: "code · name", description: type }`. Selection writes back through the existing `updateLine` path, so `accountCode`, validation, and debit/credit semantics are unchanged.
- The trigger keeps the form `h-11` input style and adds a keyboard handler (Enter/Space) with `role="button"` for accessibility.
- The period `<select>` on the same form was left intact. It is outside the account-picker scope.

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched)
- `bun run build`: skipped due to hardware policy
- `git status`: only `src/pages/accounting/NewJournalEntry.tsx` modified by this task (pre-existing `bun.lock` and `package.json` changes belong to another agent and were left intact)
- Diff review: 1 file, no unrelated changes, no Settings files touched
- Runtime or device test: not performed (no claim made)

## Risks or limitations

- No runtime test on Android hardware. The drawer Sheet pattern is proven in `Periods.tsx` and `ClientSelector`, but on-device confirmation is still open.
- If two accounts share one code, the picker selects the first match. The chart treats codes as unique, so this risk is low.

## Deferred work

- The period selector on Create Journal still uses a native `<select>`. Replace it in a separate task if required.
- Native popups remain in Compliance Hub panels, `ContextualExportDropdown`, and Settings sections. They need separate tasks.
