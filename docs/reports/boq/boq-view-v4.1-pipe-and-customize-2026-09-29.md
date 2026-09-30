# BOQ V4.1 Pipe Correction and PDF Customization Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Two additions to the existing BOQ V4.1 view candidates, in
place: correct the group-pipe visual per human review, and add
the new PDF customization/template-picker interaction. No V5.
No redesign. No production changes.

## Scope

Two existing files updated in place. One new report (this
file). No production, database, standards, PRD, form, V2, V3,
V4, V13, Invoice, or reference-file changes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` (modified)
- `docs/reports/boq/boq-view-v4.1-pipe-and-customize-2026-09-29.md` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.

## Reference finding

claude-PIPE.html contains no black-pipe implementation; it is
V12 plus decorative blueprint artwork. Its honest contribution
is the measured-perimeter overlay strategy (pixel-exact
sizing, debounced re-measure, fonts.ready hook), which the
implementation adapts. Nothing else was taken from it.

## Pipe correction

- Solid black conduit: 6px opaque tube (thickness unchanged),
  near-square corners, transparent interior, no tint, no
  elevation, no card surface.
- Recessed groove channel centered inside the tube gives the
  hollow-conduit read without a double-border look.
- One layered light only: soft blurred halo plus a white-hot
  core with brand glow, travelling inside the channel.
- Geometry stretched outward: the pipe sits near the page
  edges (negative-margin outreach) with comfortable inner
  clearance (18px mobile, 22px desktop), so grouped rows keep
  essentially standalone width.
- Constant perceived speed: dash length and 10–14s duration
  derive from the measured path length; re-measured after
  render, on debounced resize, and after fonts settle.
- `prefers-reduced-motion` hides halo and core, leaving the
  complete static black pipe.

## PDF customization surface

- Palette action (project palette icon, not emoji) beside
  Share in both top navigations; Back/identity and
  Edit/Download hierarchy preserved.
- Mobile: bottom sheet coexisting with bottom nav, FAB, and
  safe area. Desktop: centered 720px dialog with wider cards.
- Template carousel first: four visually distinct miniature
  document cards (Classic Ledger, Modern Minimal, Bold
  Commercial, Compact Schedule) with header, rows, totals,
  and footer treatments; horizontal scroll with next-card
  peek on phone; unmistakable selected state (border, check,
  background, Active label).
- Font section below: four typeface-preview options with
  selected state; applies to miniatures only, never app
  chrome. Text Colour section below that: five swatches with
  ring selection plus a native custom-colour picker.
- Live prototype: open/close, browse, select template/font/
  colour with persistent states; minis re-render in the
  chosen font and colour; template choice toasts as the
  active PDF template. Scope is exactly Template, Font, and
  Text colour — nothing else invented.

## Production and policy gap (explicit)

Repository evidence (readiness audit §10) describes BOQ
customization as document-font-only. Template plus text
colour exceeds current production capability and policy.
This task implements a NEW human-directed design requirement
in the candidates only: no production policy, standard, or
implementation was modified. Production implementation is a
separate later task.

## Preserved

Flowing page, exposed Cost/Sell/Profit/Margin, compact
thumbnails with lightbox, headers, totals, numbering, all
Download paths, Edit, Share, More actions, FAB and bottom
nav, desktop composition, dark mode, sample math (no data
rows changed).

## Verification

- `git status` before and after: captured. All other tree
  changes belong to other agents and are untouched.
- `git diff --check`: passed (whitespace clean).
- Pipe geometry, layered light, measurement hooks, palette
  buttons, sheets, carousel, font/colour controls, and
  selection engine present in both files: confirmed.
- Desktop FAB-free; mobile nav/FAB intact: confirmed.
- claude-PIPE.html, V13, Invoice, production source,
  standards, migrations untouched.
- Sample calculations unchanged (no data edits).
- Build, typecheck, lint: not run (banned/excluded).

## Supabase push status

Not applicable. No SQL changed.

## Human screenshot review still required

Pipe solidity, light legibility and speed, corner travel,
mid-scroll membership, width parity, customization surface
hierarchy, mini distinctness, dark mode. No visual approval
is claimed.
