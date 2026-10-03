# CPS Form Rename and Prototype Popup Removal Report

This report was written by Buffy on 2026-10-03 via Freebuff.

## Objective

Promote the approved CPS J3 form to a production file name.

Remove the prototype popup and overlay implementations from that form.

Build no replacement popups.

## Scope

- `src/components/cps/CpsJ3Form.tsx` (renamed)
- `src/components/cps/CostPricingSheetForm.tsx` (new active path)
- `src/pages/CpsFormPage.tsx` (import and helper names)

No database, schema, calculation, PDF, numbering, save, Cloudinary, or CPS View file was changed.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx` (renamed from `CpsJ3Form.tsx`, then edited)
- `src/pages/CpsFormPage.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-j3-rename-and-prototype-popup-removal-report.md`

## Skills Used

Skills used: karpathy, react-dev, frontend-design, accessibility, tailwind-css-patterns, react-useeffect

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### Rename

- Renamed `src/components/cps/CpsJ3Form.tsx` to `src/components/cps/CostPricingSheetForm.tsx`.
- Updated `src/pages/CpsFormPage.tsx` to import `CostPricingSheetForm` and its types from the new path.
- Renamed the page-local helpers to remove the J3 identity:
  - `toCpsJ3Number` -> `toCpsNumber`
  - `toCpsJ3Document` -> `toCpsDocument`
  - `toCpsJ3Client` -> `toCpsClient`
  - `toCpsJ3Rows` -> `toCpsRows`
- Changed the mount key prefix from `cps-j3-` to `cps-form-`.
- No duplicate `CpsJ3Form.tsx` remains.
- No compatibility wrapper was created. No other module imported the old path.

### Identity tokens

- Renamed the embedded CSS constant from `CPS_J3_CSS` to `CPS_FORM_CSS`.
- Renamed the style element attribute from `data-cps-j3` to `data-cps-form`.
- Renamed the root class from `.cps-j3-root` to `.cps-form-root`.
- Updated the header docblock to describe a production form, not a prototype.

### Popup removal

Removed these prototype overlay components and their props:

- `ConfirmDialog`
- `ClientSheet`
- `ImportSheet`
- `ColumnsSheet`
- `MarkupSheet`
- `LabelInput` (used only by `ColumnsSheet`)

Removed popup-only state, handlers, effects, and refs from `CostPricingSheetForm`:

- `openIds` / `setOpenIds`
- `openSheet` / `closeSheet`
- `focusReturnRef`, `prevOpenRef`, and the focus-management `useLayoutEffect`
- The Escape-key `useEffect`
- `undo` / `setUndo`, `openMarkup`, `handleMarkupApply`, `undoMarkup`
- `impText`, `impErr`, `doImport`
- `commitColumns`, `toggleColumn`, `changeColumnLabel`, `moveColumn`, `resetColumns`
- `chooseClient`, `addNewClient`, `doClearAll`
- `MkAff`, `MkCompute`, `MK_HINT_*`

Removed popup-only types and constants:

- `CpsSheetId`
- `CpsMarkupMode`
- `CpsMarkupChange`
- `SAMPLE_MARKUP_EXCLUDED`

Removed popup-only props from `CostPricingSheetFormProps`:

- `onAddNewClient`
- `onImport`
- `initialMarkupExcluded`

Removed now-dead exports and helpers:

- `CpsImportResult`
- `CPS_TYPE`
- `naira0`
- `IconNaira`, `IconGrip`, `IconCheck`

Removed popup-only CSS:

- Overlay and sheet: `.ov`, `.sheet`, `.grab`, `.shd`, `.x`
- Dialog: `.dialog`, `.dbtn`
- Client sheet: `.cl-list`, `.crow`, `.cmnote`
- Import sheet: `.imperr`, `.impnote`
- Column sheet: `.cm-*`
- Markup sheet: `.mk-*`
- Dead controls: `.colrow`, `.tag`, `.sw`, `.cta`, `.linkbtn`
- Dead tokens: `--shadow-sheet` (both themes)
- Dead media rules for `.sheet`, `.mk-list`, `.mk-prev`

### Trigger behavior

The toolbar triggers stay in the approved form presentation.

- Columns, Import, Markup, and Clear all remain visible and inert.
- No dialog, sheet, drawer, popover, menu, `alert()`, `confirm()`, `prompt()`, or toast replacement was built.
- The client field stays inline and inert. It no longer opens a picker.
- The `Clear client` control still clears the client and calls `onClientChange`.

### Fidelity preservation

- The corrected `:where(...)` reset strategy is unchanged.
- J3 isolation behavior is preserved. It is now named CPS form isolation.
- Root typography protection and heading/label host protection are unchanged.
- No geometry, typography, color, spacing, or breakpoint rule was changed.
- Light mode and dark mode values are unchanged.

## Verification Result

Verification:

- `bun run typecheck`: passed
- `git diff --check`: passed. Git reported a line-ending warning for `src/pages/CpsFormPage.tsx`.
- `git status`: shows the deleted `CpsJ3Form.tsx`, the modified `CpsFormPage.tsx`, the new untracked `CostPricingSheetForm.tsx`, and pre-existing untracked CPS reports.
- `supabase db push`: not applicable
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy

Reference audit:

- No active source file imports `@/components/cps/CpsJ3Form`.
- No active source file references `CpsJ3Form`, `CpsSheetId`, `CpsMarkupChange`, `CpsMarkupMode`, `CpsImportResult`, or `SAMPLE_MARKUP_EXCLUDED`.
- The new active path is `src/components/cps/CostPricingSheetForm.tsx`.
- No duplicate active `CpsJ3Form.tsx` remains.

## Supabase Push Status

Not applicable.

No SQL changed.

No database file changed.

## Risks or Limitations

- The Columns, Import, Markup, and Clear all triggers are inert by instruction. The real workflows are not designed yet.
- The client field is now display-only. Client selection needs a new workflow in a later task.
- The Instant Markup float math was prototype-only. It is removed with the popup. Production SP derivation still needs the authoritative Decimal path.
- Physical device visual verification was not claimed.
- The 1,847-line component was not decomposed. A future decomposition can be handled separately.

## Deferred Work

- Design the real column settings workflow.
- Design the real JSON import workflow.
- Design the real instant markup workflow with the authoritative Decimal path.
- Design the real clear-all confirmation workflow.
- Design the real client selection workflow.
- Wire production CPS behavior into `CostPricingSheetForm`.
- Decompose the single-file component in a separate task.
