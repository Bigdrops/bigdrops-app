# BOQ Desktop Full-Page Redesign v2 Report

This report was written by opencode (mimo-v2.6-flash-free) on 2026-09-27 via OpenCode CLI.

## Objective

Build a standalone desktop BOQ prototype with a full structural redesign. The prototype replaces the rejected desktop V1. It keeps all BOQ business behavior from `BOQ Full-Page Live Form-v9.html`. It widens the mobile form into a real desktop layout instead of a stretched mobile card stack.

## Scope

- New file: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop-v2.html`
- Reference files (read only, not modified):
  - `BOQ Full-Page Live Form-desktop.html` (rejected V1)
  - `BOQ Full-Page Live Form-v9.html` (mobile behavior source)
- Desktop structure:
  - Sticky command bar: back, title, BOQ number, mode badge, JSON Import, Columns, Clear All, theme toggle, Save BOQ.
  - Metadata strip above the grid.
  - High-density line item grid with `Qty`, `CP`, `SP` prefix chips.
  - Group sections with inset ring (`gwrap`, `gbody`, `gfoot`).
  - Closing strip: totals ledger and amount-in-words.
  - Bottom create pair: Add line item, Add group. No FABs. Add Group not in the toolbar.
- Dark mode via `data-theme="dark"`.
- Responsive rules at 1439px, 1279px, and 1023px plus a `prefers-reduced-motion` block.

## Files Changed

- Created `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop-v2.html` (47,754 bytes, 697 lines).
- Created this report.

## Skills Used

Skills used: frontend-design, html-prototype, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

## Design Principles Learned

1. Structure follows the desktop task, not the phone. A desktop BOQ is a grid with a persistent command bar. It is not a card stack.
2. One primary action. The command bar holds one labeled `Save BOQ` button. No FAB competes with it.
3. Money columns need visible units. `Qty`, `CP`, and `SP` prefix chips make each column readable without a header guess.
4. Groups must read as containers. An inset ring around `gwrap` separates scope from line items at a glance.
5. Totals belong in a closing ledger. Cost, sell, profit, margin, and words sit in one strip below the grid.
6. Preserve behavior, change layout. Calculations, validation, numbering, import, and save logic stay identical to v9.

## Changes Made

1. **Command bar**: Replaced the mobile top zone with a sticky `<header class="cmdbar">`. It holds back navigation, title, BOQ number, mode badge, and the action set. `Add Group` stays out of the toolbar.
2. **Line item grid**: Grouped columns under shared headers. Added `pre` chips for Qty, `pre cost` for CP, and `pre sell` for SP. Added `nomake` variants for hidden Make columns.
3. **Group envelope**: Wraps each group in `gwrap` with an inset ring. Items live in `gbody`. Group actions live in `gfoot`.
4. **Closing strip**: Totals render in `.closing`, `.ledger`, and `.words`.
5. **Dialogs**: Columns, Clear All, and JSON Import render as `ovColumns`, `ovClear`, and `ovImport`.
6. **Numbering fix**: V1 showed group `00`. V2 assigns `nums[m.id] = ++n` before it pushes `groupHTML(r)`. Group numbers now run sequential with items.
7. **Behavior parity**: `naira`, `profit`, `words`, `save`, `editNum`, `patchProfit`, `doImport`, and seed rows match v9. `doImport` differs only in the sheet name it closes. `renderTotals` uses the same formulas and the same five DOM targets.

## Verification Result

- `node --check` on the extracted script: passed.
- Grep checks: no FAB references (0 matches), one `Save BOQ` button, one `onclick="save()"`, required chips and DOM ids present, dark mode references present.
- Calculation parity with v9: confirmed by normalized diff.
- Seed rows: byte-identical to v9 (1142 chars).
- Playwright headless smoke test: passed with 0 console errors and 0 page errors.
  - FAB count: 0. Save buttons: 1. Group numbering: `01`-`07` sequential.
  - Columns dialog, Import dialog, and theme toggle all work. Save validation toast fires.
- Playwright deterministic totals test: passed with 0 errors.
  - Input: qty 2, CP 100, SP 150.
  - Output: cost `₦200.00`, sell `₦300.00`, profit `₦100.00`, margin `33%`, words `THREE HUNDRED NAIRA ONLY`.
- `git diff --check`: exit 0.
- `git status`: only the v2 file and this report were added. Reference files are unchanged. Pre-existing changes from other agents were not touched.
- Human browser inspection is the final visual acceptance gate. Headless tests verify behavior, not visual design.

## Verification Section (exact commands)

```text
Verification:
- bun run audit:load: skipped (standalone prototype HTML, no app source changes)
- bun run typecheck: skipped (standalone prototype HTML, no app source changes)
- bun run build: skipped due to hardware policy (banned command)
- node --check on extracted script: passed
- Playwright smoke test: passed (0 errors)
- Playwright totals test: passed (0 errors)
- git diff --check: passed
- git status: only intended files added
- supabase db push: not applicable
```

## Supabase Push Status

Supabase push status: not applicable (no SQL or schema changes).

## Risks or Limitations

- The file is a standalone prototype. It is not wired into the React app.
- Headless tests confirm behavior only. Final visual acceptance requires a human browser inspection.
- The prototype duplicates calculation logic from v9. It does not import `src/lib/Calculations.ts`. This is acceptable for a standalone design reference.

## Deferred Work

- Integrate the desktop grid, command bar, group envelope, and closing ledger into React components.
- Decide whether the desktop prototype should call the shared calculation layer when it is ported.
