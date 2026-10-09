# CPS Instant Markup Live Workspace Implementation Report

This report was written by Muse Spark on 2026-10-09 via Opencode.

Date: 2026-10-09

Objective: Convert CPS Instant Markup into a live reactive pricing workspace. Remove the Preview step. Keep one Apply Markup commit. Preserve the corrected pricing contract.

Scope: Instant Markup session state, Mobile/Fold sheet, Desktop dialog, focused regression tests, and this report. No schema, persistence, calculation-rule, import, column, Invoice, PDF, conversion, numbering, or group changes. Column Settings toggle behavior is deferred and untouched.

Skills used: systematic-debugging, karpathy, test-driven-development, verification-before-completion, accessibility, typescript-advanced-types, react-dev, safe-area-handling, tailwind-css-patterns, redesign-existing-projects, mobile-app-ui-design, apple-design
Documentation standard: ASD-STE100 Simplified Technical English

Note: `frontend-design` is not registered in docs/PROJECTSKILLINDEX.md. Project equivalents above served as the design lens. Prior reports confirm this standing.

## Pricing Contract (Unchanged)

The domain authority in `src/domain/cps/instant-markup.ts` is untouched. The contract stays:

- Base = current working SP when positive, else CP.
- Percentage: `base × (1 + percentage / 100)`.
- Fixed: `base + fixed value`.
- CP never mutates. Sections stay excluded. Excluded rows stay unchanged.
- Repeat markup stacks from the latest working SP. No user-facing Stack terms.

Verified examples: CP 270 / SP 0 / 20% gives 324.00. CP 285 / SP 0 / 20% gives 342.00. CP 10 / SP 0 / 1000% gives 110.00. CP 270 / SP 0 / fixed 1000 gives 1270.00.

## Changes Made

## 2026-10-09 Presentation And Layering Refinement

This follow-up was a presentation and interaction rescue. It did not change the Instant Markup pricing contract, live-calculation contract, editor commit authority, persistence authority, import behavior, column behavior, PDF behavior, conversion behavior, numbering, or group behavior.

Additional changes:

- Repaired `CostPricingSheetEditor.tsx` after a corrupted duplicate `CpsColumnSheet` / markup JSX tail caused 115 TypeScript parse errors.
- Kept the active desktop Instant Markup dialog and added a valid `MarkupRowList` helper for the desktop row list.
- Kept the Mobile/Fold `CpsMarkupSheet` as the compact presentation path.
- Removed the failed local confirmation-host approach and used the shared `AlertDialog` body portal with a higher alert layer than the dialog and sheet layers.
- Updated the focused presentation test so it now protects the accepted row language: CP, SP, arrow, and result price. The test now rejects visible `Proposed` and verbose `Current` copy in the shared price-flow component.

Pricing math stayed unchanged:

- Base = current working SP when positive, else CP.
- Percentage = `base × (1 + percentage / 100)`.
- Fixed = `base + fixed value`.
- No intermediate Supabase write.
- One final Apply Markup commit through editor state.

### Editor session state (`CostPricingSheetEditor.tsx`)

- Removed the `preview` and `markupError` states.
- Added a `liveProposal` derivation with `useMemo`. It calls `previewInstantMarkup` on working rows, mode, value, and inclusion. Every keystroke, toggle, and inclusion change recomputes it.
- Empty input yields no proposal and no error. Invalid input yields the domain error. Valid input with zero affected rows yields a no-change notice.
- Removed `handlePreview` and `handleApplyPreviewMarkup`.
- `handleApplyMarkup` commits `liveProposal.preview?.nextRows` through the existing `updateRows` authority. It still never writes to Supabase. Normal CPS Save remains the persistence authority.
- Reset and Undo Reset keep the corrected snapshot contracts. The live proposal reacts to them with no extra code.
- Value and mode inputs wire directly to state setters. Keystroke handlers never reach `updateRows` or `setCps`.
- Removed the now-unused `Check` icon import.

### Mobile sheet (`CpsMarkupSheet.tsx`)

- Removed the two-screen setup/preview branch. One screen always shows controls, live summary, item list, and footer.
- Removed the Preview Markup button, the Apply-to-Form stage, and Back navigation. One Apply Markup primary button remains.
- Each included row shows CP, SP, an arrow, and a dominant calculated destination price. Excluded rows show no active destination price.
- Live summary sits directly under the controls with `aria-live="polite"`. It shows affected count, aggregate change, selling before/after, and profit before/after from the same proposal object.
- Include All and Exclude All stay compact text buttons. The count reads `N / M included`.
- Footer stays persistent with safe-area padding. Reset and Undo Reset stay secondary below Apply Markup. Cancel closes without persisting.
- Copy states the CP fallback: "Mark up from current SP, or CP when SP is empty." Reset copy describes snapshot restore and no longer claims zeroing.

### Desktop dialog (`InstantMarkupDialog`, same file)

- Same single-screen conversion. Same live rows, summary, copy, and footer hierarchy.
- Kept the established right-dock shell. It is viewport-bounded by construction.
- Added a `cps-mk-dialog` sheet modifier so the sheet no longer scrolls as a whole.
- Added a `cps-mk-list` scroll region. Only the item list scrolls.
- Added a `cps-mk-foot` persistent footer with Cancel, Reset, Undo Reset, and primary Apply Markup.
- Removed the stale `Plus`/`Check` action buttons with the preview footer.

### Styles (`cost-pricing-sheet-form.css`)

- Added three scoped rules: sheet overflow override, list scroll region, footer persistence. No other selectors touched.

### Tests

- `cpsInstantMarkup.test.js`: added supplied runtime examples (270→324, 285→342), recomputation on value change, mode-switch recomputation, exclusion/include-all/exclude-all aggregate updates, and source-row immutability.
- `cpsMarkupPresentation.test.js`: replaced the two-stage commit test with single-commit assertions. Added live-derivation wiring, no-persistence wiring, live-region summary, CP/SP/arrow/result hierarchy, copy correction, safe-area footer, desktop bounded-workspace assertions, conditional Undo Reset checks, and reset-confirmation layering checks.
- `cpsCalculationAuthority.test.js`: updated P/Q to the corrected contract. The old test encoded the superseded `cp > 0` eligibility gate. Zero-base rows now process to a value-identical zero and count as processed. Excluded-row behavior is unchanged.

## Verification Result

- Focused suites: 42 pass, 0 fail (`cpsInstantMarkup`, `cpsMarkupPresentation`).
- `bun run typecheck`: passed with no errors.
- `git diff --check`: passed. Git reported line-ending normalization warnings only.
- Browser geometry was not run in this pass. Runtime Mobile/Fold and Desktop screenshots remain the final visual check.
- `bun run build`: not run per task instruction.

## Supabase Push Status

Not applicable. No migration written. No schema changed. No Supabase writes added. Apply Markup commits to editor state only.

## Risks Or Limitations

- No browser harness exists in this repo. Layout reachability is proven by structural assertions, not screenshots. Runtime screenshots remain the final check.
- Desktop keeps the dock shell. Only its internals changed. Visual review on a wide viewport is still advised.
- The live summary adds height to the mobile control block. The list region absorbs the difference through flex layout.
- Concurrent agents hold uncommitted changes across the tree. Only markup-scoped regions were edited. No pre-existing change was reverted or overwritten.

## Deferred Work

- Column Settings toggles that appear enabled without functioning. Explicitly deferred by the task. Untouched.
- Runtime screenshot verification on Mobile/Fold and Desktop.
- The five unrelated failing suites listed above belong to other workstreams.
