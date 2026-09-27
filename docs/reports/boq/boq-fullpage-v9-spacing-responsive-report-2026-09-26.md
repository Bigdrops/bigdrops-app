# BOQ Full-Page v9 Spacing and Responsive Facelift Report

This report was written by OpenCode on 2026-09-26 via Local Runner.

## Objective

Refine `BOQ Full-Page Live Form-v9.html` in two areas:

1. Remove inter-row whitespace. Redesign the Insert Below control as a compact separator. Use one spacing system for all four adjacency types.
2. Add three width behaviors: phone, fold, and desktop. Preserve the phone layout exactly.

## Scope

- Static HTML/CSS change only. No JavaScript change.
- No React source, no UI library, no framework change.
- One file changed. No SQL change.

## Files changed

| File | Change |
|---|---|
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v9.html` | 55 insertions, 16 deletions |

Verification harness (outside the repository): `C:\Users\DELL\AppData\Local\Temp\opencode\boq-v9-verify.js`.

## Skills used

Skills used: frontend-design, mobile-app-ui-design

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### 1. Row spacing and separator anatomy

- `.item` padding changed from `14px 0 0` to `10px 0 0`. The per-item `border-bottom` was removed. The `.ins` hairline now separates rows.
- `.ins` changed from a 36px empty band to a 24px full-width separator. It contains a label, a hairline rule (`::after`), and an invisible 44px hit area (`::before`). Hover colors both label and rule.
- `.gwrap` top margin changed from 18px to 14px.
- Adjacency margins unified: item-to-group 8px, collapsed-group-to-item 4px.
- The hairline hides before `.gfoot`, after the last item in a group, after the last top-level item, and before a following group. This avoids double lines.

### 2. Dark-mode surface tokens

- Hardcoded whites (`#fff`, `#f1f5f9`, `#fcfdff`) in `.ghdr.closed`, `.gwrap`, `.gbody`, `.gfoot`, `.gfoot-btn` now use `var(--card)` or `var(--soft)`. Light theme renders the same. Dark theme becomes correct.
- Added dark rule: `.idx` and `.mbtn:hover` use `#334155`.

### 3. Three width behaviors

| Breakpoint | Behavior |
|---|---|
| < 600px (phone) | v9 layout unchanged. |
| 600–900px (fold) | `.wrap` widens to 660px, then 920px. Commercial fields move from 1 to 3 to 5 columns. Mobile interaction model kept. |
| ≥ 1024px (desktop) | Horizontal workspace rows. |

Desktop details:

- Row grid: `108px | minmax(200px,1fr) | 64px | 72px | 98px | 92px | 92px | 140px` (index/description/Qty/Unit/Make/CP/SP/profit).
- `.utop`, `.fwrap`, and `.g2` use `display:contents` so cells flow into one grid. Description is the widest cell.
- Description textarea compacts to 38px. The sub-description toggle sits beside it. Rows stay near 86px tall.
- Delete button hangs at the row's right edge inside 20px padding.
- `.ins` spans the full row as line two.
- Document details use a 3-column grid. Totals use a smart grid: summary chips left and center, grand total right, amount-in-words full width.
- FAB moves to `right:24px; bottom:24px`. It clears the totals block at rest.
- Added `id="docDetails"` and `id="totalsSec"` for grid targeting. No other HTML change.

### Deliberate skips

- No desktop sticky column headers (YAGNI).
- Bottom sheet keeps its phone style. Only its width changes.
- Pre-existing hardcoded whites in `.tbn:hover`, `.x`, `.theme-btn` stay as found.

## Verification result

- `bun run audit:load`: passed. All warnings are pre-existing in `src/`. None involve changed files.
- `bun run typecheck`: passed.
- Verification harness: 65 of 65 checks passed. Checks cover brace balance, dark-block order, JS syntax, separator anatomy, adjacency, dark rule, three media queries, desktop grid, and both new ids.
- `git diff --check`: clean.
- Final diff inspected: one file, 55 insertions, 16 deletions. No JavaScript change.
- `git status`: only the v9 file is modified. Pre-existing renames seen before the task were committed by another agent. This task did not touch them.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

supabase db push: not applicable. No SQL changed.

## Risks or limitations

- Verification is static. No browser rendered the page at the three breakpoints.
- On desktop, a row with `.item.err` loses its 4px left padding. The red border stays. This is cosmetic.
- On desktop, the FAB can cover the totals block during scroll. It clears at rest.
- Phone below 600px is untouched by design.

## Deferred work

- Desktop sticky column headers.
- Bottom-sheet desktop styling beyond width.
- Pre-existing hardcoded whites listed above.
