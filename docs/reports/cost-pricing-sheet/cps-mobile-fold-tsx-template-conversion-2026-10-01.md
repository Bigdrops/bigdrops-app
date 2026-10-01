# Cost Pricing Sheet Mobile Fold TSX Template Conversion Report

This report was written by Buffy on 2026-10-01 via Freebuff.

## Objective

Convert the mobile/fold HTML prototype of the Cost & Pricing Sheet form into
production-oriented React 19 TSX. Keep visual fidelity. Expose typed callbacks
for application logic.

Source prototype:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/
cost-price-sheet-form-candidate-v1-mobile-fold.html
```

## Scope

- Convert the prototype markup, CSS, and presentational JS to TSX.
- Split the prototype into presentation components.
- Keep the prototype CSS as the source of visual truth.
- Expose typed callback props for save, back, client picker, JSON import,
  photo upload, columns, and theme.
- Save the template under `docs/templates/react-temps/`.

Out of scope:

- Supabase, persistence, database calls, routing.
- CPS calculations (production Decimal path).
- JSON import parsing, Client Picker backend, Cloudinary, save logic.

## Files changed

```text
docs/templates/react-temps/cost-pricing-sheet/CostPricingSheetForm.tsx
docs/templates/react-temps/cost-pricing-sheet/CostPricingSheetOverlays.tsx
docs/templates/react-temps/cost-pricing-sheet/CostPricingSheetIcons.tsx
docs/templates/react-temps/cost-pricing-sheet/cost-pricing-sheet-shared.ts
docs/templates/react-temps/cost-pricing-sheet/cost-pricing-sheet-form.css
docs/templates/react-temps/cost-pricing-sheet/README.md
docs/reports/cost-pricing-sheet/cps-mobile-fold-tsx-template-conversion-2026-10-01.md
```

No file under `src/` was changed.

## Skills used

Skills used: react-dev

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- `CostPricingSheetForm.tsx` holds the page shell: top bar, three sections,
  item list, totals block, save surfaces, and the phone FAB. It owns document
  state, rows, columns, client, sheets, undo bar, toast, and theme.
- `CostPricingSheetOverlays.tsx` renders the client sheet, import sheet,
  column settings sheet, instant markup sheet, confirm dialogs, and toast.
- `CostPricingSheetIcons.tsx` reproduces the prototype inline SVG set.
- `cost-pricing-sheet-shared.ts` holds types, column constants, formatters,
  row helpers, and the prototype sample model.
- `cost-pricing-sheet-form.css` copies the prototype `<style>` block. A diff
  check confirmed identical content. Only the 2-space indent was dropped.
- `README.md` maps each prototype control to the TSX callback or state prop.
- Numeric inputs keep the prototype live reformat behavior with caret
  restore. Row, group, columns, markup, import, and save flows follow the
  prototype JavaScript.
- Column label fields commit on blur or Enter. This matches the prototype
  `onchange` behavior.

## Prototype controls mapped to callbacks

| Prototype control | TSX surface |
| --- | --- |
| Back button | `onBack()` else demo toast |
| Save surfaces | prototype validation then `onSave(payload)` |
| Draft badge | `modeLabel` else internal Draft to Saved |
| Theme button | internal theme, `theme` / `defaultTheme` / `onToggleTheme` |
| Document fields | internal `doc` state, delivered in `onSave` payload |
| Client trigger and sheet | `clients`, `initialClient`, `onClientChange` |
| Add new client | `onAddNewClient()` else demo toast |
| Column settings sheet | `initialColumns`, `onColumnsChange` |
| Import sheet | `onImport(jsonText)` returns `CpsImportResult` |
| Instant markup sheet | `initialMarkupExcluded`, internal, `onApply` |
| Photo attach | `onRequestPhoto(rowId)` resolves an image URL |
| Row operations, undo, clear all | internal |
| Totals and row financials | display math, prototype float math, 2dp |

## Verification result

```text
- targeted tsc (project flags, template files): passed
- targeted tsc --strict (template files): passed
- CSS diff vs prototype style block: content identical
- bun run audit:load: passed (all warnings pre-existing in src/)
- bun run typecheck: passed
- git status: pre-existing changes untouched; new files only under
  docs/templates/react-temps/cost-pricing-sheet/ and this report
- bun run build: skipped due to hardware policy
```

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Row and total displays use prototype float math rounded to 2dp. Production
  must use the authoritative Decimal path before ship.
- Prototype CSS class names are generic, for example `.item`, `.sec`,
  `.fld`. Host apps with global collisions must scope the CSS import.
- The CSS sets `html, body` background and font rules. Remove them if the
  host page owns those styles.
- State is uncontrolled. Remount with a new `key` to reset the form.
- The import CTA is inert without `onImport`. The callback must return a
  result and must not throw.
- The markup default exclusions `[6, 8]` match the prototype sample rows.
  Pass `initialMarkupExcluded` with custom `initialRows`.

## Deferred work

- Wire the template into the live CPS editor.
- Replace display float math with the authoritative Decimal path.
- Add unit tests for row operations inside the template.
