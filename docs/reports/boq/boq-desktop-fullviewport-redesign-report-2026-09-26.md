# BOQ Desktop Full-Viewport Redesign Report

This report was written by opencode (mimo-v2.6-flash-free) on 2026-09-26 via opencode CLI.

## Objective

Redesign `BOQ Full-Page Live Form-desktop.html` as a true full-viewport desktop BOQ editor. The old prototype was rejected as a mobile layout stretched wider. The new file uses three zones: a command and document header, a BOQ editing workspace, and a financial summary. BOQ data semantics and behavior stay unchanged. Presentation and markup are fully rewritable.

## Scope

- Target: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop.html`.
- Out of scope: v9 phone prototype, React app, Supabase, other prototypes.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop.html` — full rewrite (710 lines). Untracked file, so the original content is not in git history. The v9 script is the only behavior reference.

## Skills used

Skills used: frontend-design, redesign-existing-projects
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

Structure:

- Sticky command bar (`cmdbar`): back button, title, BOQ number (`#barNo`), mode badge, Columns / JSON Import / Clear All / theme toggle. No add buttons in the bar.
- Full-viewport `.app` shell with a single `.sheet` panel (no 1360px max-width).
- Metastrip: one horizontal grid with project title, BOQ no., date, vendor, reference. Fields use `editRow(this)` (DOM source of truth). `fNo` also calls `syncNo()`.
- Work zone: section header, static 9-column sticky `.thead`, `#items` list, and a create pair (Add line item + Add group) after the content.
- Summary band: gross profit hero, margin on selling price, total cost, total sell, and words in naira and kobo.
- FAB: 50×50, radius 18, `bg-bd-button-primary-bg`, SaveAll icon, per `docs/standard/fab-standard.md`.

Rows:

- 9-track grid with breakpoints at 1279px, 1000px, and an 860px summary stack. No `@media (min-width:1024px)`.
- Plain index cell, hover-revealed row actions, always-visible remove button, hover-revealed insert pill.
- Sub-description: collapsed toggle button inside the description cell; textarea renders only when `subOpen`.
- Profit cell: total and per-unit values with sign, via `profitHTML` / `patchProfit`.
- CP and SP: plain mono inputs with cost/sell focus rings and hidden spin buttons.

Groups:

- Group wrapper with header, body, and footer. Footer has "Add item to this group".
- Collapsed state shows header only (adjacency selectors, no `:has()`).
- Remove group keeps its items (ungroup them).

Behavior (ported from v9 script lines 394–771):

- All row CRUD, group toggles, import, save, theme toggle, toast, and totals functions.
- `openSheet` / `closeSheet` use the `open` class with full overlay ids.
- Margin formula: `p / sell * 100` (on selling price). Label says so.
- `words()` keeps the kobo part.
- `editRow` element overload ignores header inputs. `syncNo()` writes only `#barNo`.

Fix found during final review:

- `toggleCol` now calls `render()` instead of `renderItems()`, so the static `.c-make` header cell toggles off with the column.

## Verification result

Checks run after the last edit:

- `node <temp>/boq-desktop-verify.js <desktop file>`: ALL CHECKS PASSED (exit 0, 9 header cells).
- JS syntax (vm parse): passed inside the harness.
- CSS brace balance, dark block first, single script, inline handlers defined: passed.
- Structure checks (sticky thead, grids, groups, create pair, modals, FAB, summary ids, banned patterns): passed.
- `git diff --check`: exit 0 (only CRLF warnings on unrelated `src/` files of another agent).
- `git status --porcelain`: matches the pre-task state. v9 still shows its prior-task ` M`. The other agent's files are unchanged.
- v9 file: not edited in this task (`git diff --numstat` shows only the prior task's 30/14 lines).

Not run, per task rules:

- `bun run build`: banned by hardware policy.
- `bun run typecheck`, `bun run audit:load`: not applicable to this standalone HTML prototype task.

Browser visual inspection by the human remains the final design acceptance gate. Regex and harness checks cannot certify visual quality.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- The desktop file is untracked. Git cannot show its diff. The full 710-line file was read and inspected in one pass.
- Harness checks are structural. They do not check pixel rendering, font loading, or responsive feel in a real browser.
- Locked column switches are `disabled`, so their "always shown" toast cannot fire from a click. This matches the ported v9 markup behavior.
- Seed data (rows, cols) is prototype data inside the file. A real integration would load data from the app.

## Deferred work

- Human browser review at wide, medium, and narrow widths. Also check dark mode and print behavior.
- Wire the file to live BOQ data if this file graduates from prototype to product.
