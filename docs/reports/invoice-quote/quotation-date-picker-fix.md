# Quotation Date Picker Fix Report

This report was written by Muse Spark on 2026-09-25 via opencode.

## Objective

Fix the malformed date-picker dialog on the Quotation Date field. Replace the broken picker with an app-controlled calendar. Keep stored date semantics unchanged.

## Scope

Quotation Date and Valid Until fields in the shared document header. These fields serve both Invoice and Quotation forms.

Out of scope:

- Other native date inputs in Waybill, BOQ, RFQ, CSR, compliance, and reports. They keep current behavior. They can adopt the shared component later.
- Database schema changes. None made.
- Date format changes. None made.
- Validation rule changes. None made.
- Timezone interpretation changes. None made.

## Files changed

- `src/components/ui/date-helpers.ts` (new)
- `src/components/ui/date-field.tsx` (new)
- `src/components/document/FormHeader.tsx` (modified)
- `src/tests/document/dateField.test.js` (new)

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

Skills from the project index guided this work. The mobile UI skill guided thumb-zone actions and touch targets. The safe-area skill guided bottom-sheet padding. The React skill guided component patterns. No skill file was loaded through the skill tool. Project standards and existing code patterns controlled the implementation.

## Documentation standard

This report uses ASD-STE100 Simplified Technical English. It uses short sentences. It uses active voice. It uses one idea per paragraph.

## Root cause

The Quotation Date field used a native `<input type="date">` through the shared `Input` primitive (`FormHeader.tsx`). About 30 date fields across the app use the same native input. No shared date-picker component existed. No date-picker dependency existed.

The dialog in the bug report is the Android WebView native date picker. Evidence:

- CLEAR, CANCEL, and SET footer buttons match the Android native picker. No BIGDROPS code renders these buttons.
- The floating day circle matches the native selected-day style.
- No repository component renders a calendar dialog.

Web CSS cannot style the native dialog internals. Only the `color-scheme` property hints its theme. The app sets `color-scheme` through the `.dark` class, which JavaScript toggles at runtime. The native dialog can therefore show a white surface while the app is in dark mode. The empty grid layout is a native rendering failure. CSS cannot fix it reliably across devices.

Conclusion: the fix must replace the native picker with an app-controlled picker at the shared layer. Fragile CSS over native UI was rejected per the task brief.

## Changes made

### `src/components/ui/date-helpers.ts` (new)

Pure date logic with no DOM and no React:

- Parse strict `YYYY-MM-DD` strings. Reject impossible dates such as 2026-02-30.
- Serialize dates with zero padding.
- Format display as `DD/MM/YYYY` by splitting the string. Never call `new Date(value)` on stored values. No timezone shift is possible.
- Build Monday-first month grids with complete weeks.
- Shift months across year boundaries.
- Compare ISO strings for min and max checks.

### `src/components/ui/date-field.tsx` (new)

Shared `DateField` component:

- Props: `value`, `onChange`, `label`, `className`, `placeholder`, `disabled`, `min`, `max`, `id`.
- Value contract matches the native input: `''` or `YYYY-MM-DD`.
- Trigger is a button styled like other form fields. It shows the formatted date and a calendar icon.
- The picker is a bottom sheet built on the existing Radix Sheet primitive. It uses overlay theme tokens. Dark mode shows a dark surface.
- The sheet holds a month calendar with previous and next month buttons. Day cells are 40px minimum. Action buttons are 44px minimum.
- Selected day uses the primary button tokens. Today uses a ring. Out-of-range days are disabled.
- Footer buttons are Clear, Cancel, and Set. They sit directly under the calendar. No detached actions.
- The sheet limits height to 85% of the viewport height and scrolls internally. It reserves safe-area bottom padding. Content cannot hide behind the home indicator.
- Each day button carries a full spoken date label. Selected day uses `aria-current="date"`. The grid uses `role="grid"`. The trigger uses `aria-haspopup="dialog"` and the field label.
- No new dependencies were added. No native date input is used inside.

### `src/components/document/FormHeader.tsx` (modified)

- Quotation Date and Issue Date now use `DateField` with the same state keys (`issue_date`).
- Valid Until and Due Date now use `DateField` with the same state keys (`due_date`).
- No native date input remains in this file. Text fields still use `Input`.
- Stored values, change handlers, and field names are unchanged.

## Verification result

Verification:

- `bun run typecheck`: passed
- New test `src/tests/document/dateField.test.js`: 7 passed
- Neighbor test `sharedDocumentFormRegression`: has pre-existing failures unrelated to this change (missing files, stale layout and suggestion expectations in files this task did not touch)
- `git status` and `git diff`: only the four task files changed. Pre-existing changes from other agents preserved.
- `supabase db push`: not applicable (no SQL change)
- `bun run build`: not executed (banned for this task)

## Supabase push status

No database change. Push not required.

## Risks or limitations

- Other forms still use native date inputs. They can show the native dialog on Android. They can adopt `DateField` one form at a time.
- Display format is fixed as `DD/MM/YYYY`. This matches the existing form display. It is not user-configurable.
- Week starts on Monday. This matches Nigerian locale convention.
- The picker needs JavaScript. The native input worked without JavaScript. This app requires JavaScript for all forms, so impact is nil.

## Deferred work

- Migrate Waybill, BOQ, RFQ, CSR, compliance, reports, and payment date inputs to `DateField`.
- Add year and month dropdowns for fast long-range jumps. Month stepping covers current needs.
- Localize weekday and month names beyond English. Current forms use English labels.
