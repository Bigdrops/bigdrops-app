# CPS V1 Visual Refinement Report

This report was written by Muse Spark on 2026-09-30 via OpenCode.

## Objective

Refine the existing CPS V1 candidates in place after human
visual review: remove the giant chevron artifact, dedupe the
selected client, and give the document Total Summary a distinct
commercial identity. No V2. No production changes.

## Scope

Two existing files modified in place. One new report (this
file). No production, database, standards, V13, Invoice, or
BOQ View changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-desktop.html` (modified)
- `docs/reports/cost-pricing-sheet/cost-price-sheet-form-candidate-v1-refinement-2026-09-30.md` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.

## Root cause: the giant chevron

The clear (X) control was a `<button>` nested inside the
picker `<button>`. HTML parsers eject content after an inner
button start tag, so the X button and the chevron span landed
outside the picker trigger. The scoped sizing rules
(`.clientpick .cx svg`, `.clientpick .chev svg`) no longer
matched, and the SVGs rendered at default size — an enormous
dark downward chevron (inheriting body ink instead of the
faint trigger tone) with a large blank region, exactly where
the screenshot showed it. The chevron itself is a genuine
affordance (it opens the picker) and is retained at its
correct 15px scale.

## Fix 1: valid picker structure

The trigger is now a `div role="button"` with keyboard
activation, so the inner X clear button is valid HTML and all
scoped sizing rules apply. No visual change to the accepted
trigger beyond correctness.

## Fix 2: selected picker is the face

The duplicate selected-client detail card is deleted (markup,
styles, and sync logic). The picker itself shows the selected
identity: name plus a compact contact line (person · phone ·
email, ellipsized). Unselected state keeps the established
"Select a client / Bill to · Client" presentation. Search,
select, change, clear, and Add New Client behavior is
preserved on mobile and desktop.

## Fix 3: document close-out identity

The totals block is reframed as the sheet's financial
conclusion without touching the accepted item trios: accent
top edge with a slow travelling highlight, tonal wash,
"COST & PRICING SUMMARY" eyebrow with live document number,
and a hero profit figure. Cost, selling, and profit keep
their established tones as accents. The highlight is
restrained (90px sheen, 14s loop, top edge only) and dies
under the existing global reduced-motion rule; the summary
stays strong without motion. Phone stacks the hero;
fold/desktop keep their compositions. Desktop rail summary
is unchanged context.

## Preserved

CPS identity and numbering, dates, Site/Project, Notes,
compact rows, groups, CP/SP/TCP/TSP/Profit/margin, Instant
Markup with preview/undo/validation, row controls, photo
flow, Save FAB, fold/desktop behavior, all calculations
(no data rows changed).

## Verification

- `git status` before and after: captured. Only the two CPS
  files plus this report are attributable to this task.
- `git diff --check`: passed (whitespace clean).
- No `button`-in-`button` remains; no `clcard` markup,
  styles, or script references remain; selected client
  renders exactly once per file.
- Close-out markers (edge, eyebrow, hero, sheen) present in
  both files; item trio CSS/JS untouched.
- Search/select/clear/add affordances and handlers intact;
  save still requires a client.
- V13, Invoice, production, migrations untouched.
- No-build, no-typecheck, no-lint, no-Supabase rule obeyed.
- Human screenshot review is mandatory. No visual approval
  is claimed.
