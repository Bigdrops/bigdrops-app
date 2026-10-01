# CPS V1 Hierarchy and Close-Out Refinement Report

This report was written by Muse Spark on 2026-09-30 via OpenCode.

## Objective

Refine the CPS V1 candidates in place: verify the arrow and
duplication fixes against the artifacts, harden icon sizing,
and give the document Total Summary an unmistakable
close-out identity. No V2. No production changes.

## Scope

Two existing files modified in place. One new report (this
file). No production, database, standards, V12, V13, Invoice,
or BOQ View changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-desktop.html` (modified)
- `docs/reports/cost-pricing-sheet/cost-price-sheet-form-candidate-v1-hierarchy-2026-09-30.md` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.

## Arrow finding

The prior round's root cause stands: a `<button>` nested
inside the picker `<button>` ejected the X and chevron from
the trigger, voiding their scoped sizing. The trigger is a
valid keyboard-accessible div since that fix. This round
verified every SVG context in both files and added the two
missing explicit size rules (sub-description toggle chevron,
picker-list check glyph), so no icon can regress to default
sizing. No giant-chevron construct exists in either file;
no decorative arrow, scroll hint, or dead vertical space was
introduced or retained.

## Client single surface

Confirmed: no picker-plus-card duplication remains. The
selected picker carries name plus an ellipsized contact line;
unselected, search, select, change, clear, and Add New Client
behavior is intact, as is client-required save validation.

## Close-out redesign

The summary is now a purpose-built instrument, not a larger
trio: a gateway transition rule ("End of schedule ·
Commercial close-out") separates editing from result; the
surface keeps its tonal wash, accent edge, travelling
highlight, and eyebrow; aggregate rows carry cost/sell spine
markers; a mono math caption states the relationship
(Selling − Cost = Profit · Margin on selling); Gross Profit
is a hero figure with margin as a secondary pill. Item
TCP/TSP/Profit trios are byte-untouched. Fold keeps its
two-column composition with the caption spanning full
width; desktop uses wider spacing and a larger hero.
Reduced motion kills the highlight via the existing global
rule; the static composition stands alone.

## Preserved

CPS identity and numbering, dates, Site/Project, Notes,
compact rows, groups, CP/SP/TCP/TSP/Profit/margin, Instant
Markup with preview/undo/validation, row controls, photo
flow, Save FAB (mobile only), fold/desktop behavior, sample
math (no data rows changed), dark mode, safe areas.

## Verification

- `git status` before and after: captured. Only the two CPS
  files plus this report are attributable to this task.
- `git diff --check`: passed (whitespace clean).
- No nested interactive elements; no duplicate client card;
  gateway, markers, math caption, and hero present in both
  files; markup engine intact; FAB mobile-only; no bottom
  nav in either form (matches the V12 shell).
- Locked arithmetic untouched (no data edits; prior
  verification stands).
- V12, V13, Invoice, production, migrations untouched.
- No-build, no-typecheck, no-lint, no-Supabase rule obeyed.
- Human screenshot review is mandatory. No visual approval
  is claimed.
