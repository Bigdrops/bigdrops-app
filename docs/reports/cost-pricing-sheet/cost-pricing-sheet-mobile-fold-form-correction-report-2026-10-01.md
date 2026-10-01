# Cost Pricing Sheet Mobile Fold Form Correction Report

This report was written by Codex on 2026-10-01 via Codex Desktop.

## Objective

Correct the live Cost and Pricing Sheet mobile and fold form presentation.

Use the two attached screenshots as visual evidence.

Do not edit candidate HTML files.

## Scope

This task changed only the live CPS form presentation.

No database, import, persistence, calculation, PDF, or view-page logic changed.

## Files changed

- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-form.css`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-mobile-fold-form-correction-report-2026-10-01.md`

## Skills used

Skills used: using-superpowers, frontend-design, tailwind-capacitor, vercel-react-best-practices, typescript-advanced-types, accessibility, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

This report follows ASD-STE100 Simplified Technical English.

## Evidence reviewed

- Screenshot 1 was reviewed. It showed the live oversized toolbar, header metadata, Notes in Document Details, loose group header, and loose item card spacing.
- Screenshot 2 was reviewed. It showed the intended compact mobile and fold density, hierarchy, toolbar scale, group header scale, and item-card rhythm.
- The candidate file was reviewed as a reference only: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`.

## Changes made

- Removed the top-bar metadata row from the live CPS form.
- Removed visible header copy: `Draft`, `Mobile/Fold Workspace`, and `Desktop Workspace`.
- Removed the remaining `Draft` fallback from the Document Details section meta.
- Moved Notes out of Document Details.
- Added a bottom Notes section after Totals.
- Kept Notes bound to the same `cps.notes` field and `onPatchCps({ notes })` update path.
- Kept Document Details focused on Sheet Title, Sheet Number, Issue Date, Client, and Site / Project.
- Tightened the mobile and fold Line Items toolbar.
- Made Columns, Import, and Markup compact bounded controls.
- Kept Clear All compact, destructive, and aligned to the toolbar grid.
- Reduced mobile item spacing and mobile field padding.
- Tightened mobile row financial cells and margin text.
- Tightened mobile sub-description spacing and photo spacing.
- Reduced mobile group header height, padding, item-count scale, and action-button size.
- Kept Client Picker wiring unchanged.
- Kept Add Client behavior through the shared `ClientSelector` unchanged.
- Kept the Save FAB keyboard rule unchanged.
- Kept `html[data-keyboard-open="true"]` rules unchanged.
- Added a phone-width group-title font override so editable text stays at 16 px on phones.

## Visual differences corrected

- The header no longer uses decorative document status or device labels.
- The Document Details block no longer includes Notes.
- The Line Items toolbar is smaller and more bounded.
- The destructive Clear All action is compact.
- Group headers use less vertical space.
- Item cards use tighter mobile spacing.
- The item rail, movement controls, description, sub-description, photo control, CP and SP fields, and row economics sit in a denser rhythm.

## Client Picker status

The shared Client Picker architecture is unchanged.

The live trigger still uses the selected client name, secondary client data, clear affordance, and dropdown affordance.

The Add New Client flow remains owned by `ClientSelector`.

## Keyboard safety status

The task did not change `KeyboardAwareness`.

The task did not change `--app-keyboard-inset`.

The task did not change `data-keyboard-open` behavior.

The Save FAB remains hidden when the keyboard is open.

Phone editable text remains at 16 px through the mobile CSS guard.

## Longcat importer regression status

The CPS importer file was not edited.

The `cost_price -> cp` and `selling_price -> sp` contract remains unchanged.

The focused CPS import regression tests passed.

## Calculation and Instant Markup status

The CPS calculation files were not edited.

The Instant Markup files were not edited.

The focused Instant Markup regression tests passed.

## Candidate file status

Candidate HTML files were not edited by this task.

The candidate folder is still a pre-existing untracked folder in git status.

## Desktop status

Desktop was not intentionally redesigned.

The only desktop-visible production change is the required Notes relocation and header metadata removal.

Desktop layout rules were not broadly rewritten.

## Supabase push status

Supabase push status: not applicable.

No SQL changed.

No migration changed.

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun test src/tests/critical/cpsImportView.test.js src/tests/critical/cpsInstantMarkup.test.js src/tests/critical/cpsNormalize.test.js`: passed, 34 tests passed
- `git diff --check`: passed, with pre-existing line-ending warnings
- `git status --short`: completed, with many pre-existing modified, deleted, added, and untracked files
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy

## Risks or limitations

- The repository had many pre-existing uncommitted and untracked changes before this task.
- The CPS production files were already untracked before this task.
- Git cannot show a tracked diff for untracked CPS files.
- A real-device visual review is still useful for final density judgment on a physical narrow phone and fold screen.

## Deferred work

- Run a human mobile-device review against the same two screenshot states.
- Confirm the final toolbar rhythm on the target Android device after the broader pre-existing CPS work is committed.
