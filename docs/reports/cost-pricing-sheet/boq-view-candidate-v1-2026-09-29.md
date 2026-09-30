# BOQ View Page Candidate V1 Report

This report was written by Longcat on 2026-09-29 via OpenCode Local Runner.

## Objective

Create a standalone HTML design candidate for the BOQ View Page for human visual review before any production implementation.

## Scope

One new design-direction file. No production code changed. No database change. The reference BOQ V12 file stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-v1.html` (new)

## Skills used

html-prototype, design-artifact

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

- Created a View Page composition with five document sections: Document identity (hero with number, status chip, title, vendor, reference, issue date, template, palette, contents), Commercial summary (dark band with total cost, total selling price, gross profit, margin), Schedule items (read-only groups and items), Notes, and Totals (formal close with amount in words).
- Presented legitimate actions only. Edit, Convert to Quotation, Duplicate, status change, Archive, and Delete come from src/pages/view-boq-actions.ts. No PDF action is offered because the PDF renderer was removed in the demolition phase.
- Used the locked commercial model from calculateBoqTotals.ts. Total cost = SUM(cp x qty). Total selling price = SUM(sp x qty). Gross profit = selling minus cost. No VAT, no WHT, no discount.
- Reused the V12 visual language: tokens, Manrope/DM Mono pairing, top bar, numbered section headers, group envelopes (read-only, no delete X), commercial tones, profit bands, totals anatomy, sheet and confirm-dialog system, toast, dark mode.
- Composed items for viewing: numbered chip, full description, clamped specification, make/brand, quantity with unit, CP/SP in commercial tones, line profit band. No inputs, no rail controls, no insert below, no add item/group, no import, no column settings, no save.
- Composed fold and desktop deliberately. Fold uses the identity-column plus data-column item layout. Desktop uses a document card with a sticky close-out rail carrying the commercial summary and the actions. Phone keeps a sticky action bar with Edit, Convert, and a More sheet.
- Added restrained environmental artwork: a faint blueprint grid with one cropped scale-ruler line-art. The art hides at desktop widths.
- Used realistic sample data: two groups, six items, a long sub-description, make/brand entries, and the locked model totals (cost 5,908,090; sell 6,987,000; profit 1,078,910; margin 15%).
- The status toggle is interactive. It updates the hero chip, the top-bar badge, and the rail label between Open and Approved.

## Verification

- Static group and control audit: no form inputs, no rail editing controls, no add/import/clear/save controls in the rendered UI. Passed.
- `node --check` equivalent via DOM-shim execution of the candidate script: passed.
- DOM-shim smoke test with 26 checks: item and group counts, continuous numbering, commercial tones, profit bands, locked-model totals, amount in words, status toggle, and artwork presence. All passed.
- `git status` before and after: captured. The new `view/` directory is the only artifact of this task. The BOQ V12 modification predates this task and was not touched.
- `git diff --check`: passed (exit 0).
- `bun run audit:load`: not run. Excluded by the task.
- `bun run typecheck`: not run. Excluded by the task.
- `bun run lint`: not run. Excluded by the task.
- `bun run build`: skipped due to hardware policy.
- Playwright and browser automation: not run. Excluded by the task. Visual review is left to the user.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Static verification executes the script against a DOM shim. It does not render pixels. A human must review the visual result in a browser.
- The artwork placement uses aspect-ratio crop. Its exact position varies with document height. A human must confirm it never sits under dense fields.
- Action toasts name real production actions. They do not perform persistence in the prototype.
- Sample data is fictional.

## Deferred work

- Visual browser review of phone, fold, 1024px, and wide desktop in light and dark modes.
- User acceptance against the BOQ V12 baseline.
- Production React implementation after design acceptance.
