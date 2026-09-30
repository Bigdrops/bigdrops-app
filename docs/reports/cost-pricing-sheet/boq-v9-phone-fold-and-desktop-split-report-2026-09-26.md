# BOQ v9 Phone/Fold and Desktop Split Report

This report was written by OpenCode on 2026-09-26 via Local Runner.

## Objective

Split the BOQ full-page form into two independent prototypes:

1. Make `BOQ Full-Page Live Form-v9.html` a pure phone and fold prototype. Remove the desktop `>= 1024px` architecture. Keep the earlier spacing, separator, and dark-mode fixes.
2. Create `BOQ Full-Page Live Form-desktop.html`. It is a purpose-built wide-screen editing workspace. It shares data and behavior with v9. It does not copy v9 CSS or stretch the phone layout.

## Scope

- Static HTML, CSS, and JavaScript only. No framework change. No React source change.
- One file edited, one file created. No SQL change. No other prototype changed.

## Files changed

| File | Change |
|---|---|
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v9.html` | Edited. 30 insertions, 14 deletions vs HEAD. 794 to 771 lines in this session. |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop.html` | Created. Self-contained. 772 lines. |

Verification harnesses (outside the repository):

- `C:\Users\DELL\AppData\Local\Temp\opencode\boq-v9-verify.js`
- `C:\Users\DELL\AppData\Local\Temp\opencode\boq-desktop-verify.js`

## Skills used

Skills used: frontend-design, mobile-app-ui-design

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Part 1 — v9 becomes phone and fold only

- Deleted the `@media (min-width:1024px)` block. It held the horizontal grid, `display:contents` cell flow, and desktop compaction rules.
- Deleted the grid target ids `id="docDetails"` and `id="totalsSec"`. No other HTML changed.
- Kept the fold queries at 600px and 900px. The fold keeps the phone interaction model. Fields move from 1 to 3 to 5 columns.
- Kept the spacing fixes: `.item` padding `10px 0 0`, compact `.ins` separator anatomy, `var(--card)` surfaces, unified adjacency margins, and the dark `.idx` rule.
- Verified no residue: no `1024`, `Desktop`, `display:contents`, or the two ids remain.

### Part 2 — independent desktop workspace

- Own HTML, CSS, and JavaScript in one file. No shared stylesheet with v9.
- Shared 8-track row grid: `56px | minmax(200px,1.8fr) | 64px | 84px | 112px | 92px | 92px | 132px`. Description is the dominant cell.
- Sticky column header (`.thead`) sits under the top bar at `top:57px`.
- Hanging delete button on each row. No permanent delete column.
- Compact 2x2 control pocket: line index, duplicate, move up, move down.
- Hidden `Make` column shows a ghost `--` cell. The header stays dimmed.
- Line profit chip with `pos`, `neg`, and `zero` states.
- Groups: strong header, body, and footer. Collapsed groups stay compact. Group footer has `+ Add item to this group`.
- Global line numbering. Groups never consume numbers.
- Multi-column document details. Totals: cost, selling, profit, margin, and amount in words.
- Centered modals replace phone bottom sheets. The functions `openSheet` and `closeSheet` keep their names.
- Add group button lives after the final content, not in the toolbar.
- Save FAB follows `docs/standard/fab-standard.md`: 50x50, radius 18, `SaveAll` icon, design tokens, fixed at `right:24px; bottom:24px`.
- Dark mode fixes: row focus uses `var(--card)`, `.idx` and `.mbtn:hover` use `#334155`, switch track uses `#475569`.

### Behavior parity

The `<script>` blocks of both files were extracted and diffed. The only differences are render functions: `renderHead` is new in desktop, `itemHTML` emits grid cells, `renderItems` prepends the header, and one unused `sellP` line is absent. All business logic is identical: import, column manager, clear all, sub-description, group collapse, add item, add group, move, duplicate, delete, numbering, calculations, validation, save, and theme toggle.

### Deliberate skips

- No card layout on desktop. Rows stay horizontal.
- No separate delete column on desktop. The hanging delete is enough.
- No browser rendering test. Checks are static.
- An invented harness check for a "notes fallback" was dropped. Neither file has a notes field.

## Verification result

- `bun run audit:load`: passed. All warnings are pre-existing in `src/`. None involve changed files.
- `bun run typecheck`: passed.
- v9 harness: 79 of 79 checks passed. Checks cover brace balance, JS syntax, absence of desktop architecture, fold queries, spacing anatomy, and behavior functions.
- Desktop harness: 74 of 74 checks passed. Checks cover brace balance, JS syntax, row grid, sticky header, groups, totals, modals, FAB spec, absence of phone patterns, and behavior functions.
- Script diff: behavior parity confirmed. Only render markup differs.
- `git diff --check`: clean.
- Final diff inspected: one file modified, one file created. No unrelated file changed.
- `git status`: ` M` v9, `??` desktop file, `??` the earlier spacing report. No pre-existing work reverted or overwritten.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

supabase db push: not applicable. No SQL changed.

## Risks or limitations

- Verification is static. No browser rendered either page.
- The desktop row grid is fixed. A window narrower than about 1024px will squeeze cells. The desktop file targets wide screens only by design.
- v9 and desktop duplicate the behavior script. A future logic fix must land in both files.

## Deferred work

- Browser render test at phone, fold, and desktop widths.
- Optional shared extraction of the behavior script into one include, only if the two files drift.
