# BOQ Desktop V3 Semantic Zones Report

This report was written by opencode (mimo-v2.6-flash-free) on 2026-09-27 via OpenCode CLI.

## Objective

Create a new desktop BOQ editing architecture. Use semantic zones per row instead of a page-wide grid. Keep all V2 behavior. Write one design report.

## Scope

- New file: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-desktop-v3.html`.
- No changes to V2, v9, React source, SQL, or migrations.
- No React port. No database work.

Skills used: frontend-design, html-prototype, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

## Files changed

| File | Action |
|---|---|
| `docs/prd/.../boq/BOQ Full-Page Live Form-desktop-v3.html` | Created (403,787 bytes) |
| `docs/reports/boq/boq-desktop-v3-semantic-zones-report-2026-09-27.md` | Created (this report) |

No other file changed. V2 and v9 hashes match the pre-task baseline (verified via `git status`: both unmodified vs HEAD).

## Changes made

### Row architecture

Each row is a flex-wrap container with four semantic zones. Zones do not share grid tracks.

1. **IDENTITY** (`zident`): global index, description textarea, sub-description line. Internal grid `26px | 1fr` with areas `idx desc` / `. sub`.
2. **METADATA** (`zmeta`): qty, unit, make (make hidden when the Columns toggle hides it).
3. **COMMERCIAL** (`zcomm`): CP and SP inputs. Persistent micro-labels `CP (cost)` and `SP (sell)`.
4. **RESULT** (`zres`): profit chip with unit-profit line. `margin-left:auto` on compact rows.
5. **ACTION**: hanging rail. `.zacts` sits at the row's right edge, opacity 0.45 at rest, 1 on row hover or focus. Row reserves `--rail` (126px, 112px at ≤1199px) as padding. Insert-below stays bottom-center.

Zone separators are left hairlines (`border-left` + `padding-left`). No zone cards.

### Wide vs compact recomposition

- Wide (≥1440px): identity `flex:1 1 420px`, meta/commercial/result auto. All zones on one line. Verified: meta starts right of identity (left 672 > identity right 658).
- Compact (≤1439px): identity takes `flex:1 1 100%`. Meta, commercial, and result flow to an internal second line. First-of-line border on meta is removed. Verified: meta top 356 > identity top 227, meta left 62 (back to row start).
- Trims at ≤1199px (rail 112px, narrower fields) and ≤1023px (toolbar and dock tighten). Verified: rail 112px, qty field 64px at 1100px.

Future fields join an existing zone. The row template and the zone borders do not change. No new page-wide track is needed.

### Sub-description

- Empty rows show a `+ Add sub-description` ghost button in the identity zone.
- Click shows the textarea in place. The zone row always exists, so no layout shift occurs.
- Typed content keeps the textarea after blur. Clearing the text and blurring returns the button.
- V2's `toggleSub`, `renderHead`, and `subOpen` seed flag are removed. `editRow` no longer has a sub toggle branch.

### Page structure

- Full-bleed command bar: back, title, bar number, mode badge, spacer, toolbar (JSON Import, Columns, Clear All, theme button, `Save BOQ`).
- `.app` holds two sibling panels: identity/metadata band (`docband`) and the work panel (`workpanel`). No shell inside a shell.
- Fixed bottom dock: cost, sell, profit, margin, note, amount in words. Same element ids as V2 (`tCost`, `tSell`, `tProfit`, `tMargin`, `tWords`).
- `Add line item` and `Add group` sit in a create pair after the row list. `Add group` is not in the toolbar.
- No Save FAB (per `docs/standard/fab-standard.md`).

### Theming

- Fonts embed as base64 `@font-face` data URIs (Archivo, Fraunces, Spline Sans Mono). No Google Fonts link.
- Dark mode uses two declaration sets with identical values: `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-theme="light"])`. The attribute wins in both directions.
- Shadow and gradient values are CSS tokens. Dark overrides stay inside the two dark blocks.
- `toggleTheme()` reads the effective state (`isDarkNow()`), then writes the opposite attribute. The first click now works when the OS is dark and no attribute exists.

### Behavior

The V2 script is copied with these deltas only: sub-description helpers (`addSub`, `subBlur`, `subAdd` set), zone-based `itemHTML`, removed `renderHead`/`toggleSub`/`subOpen`, token-based theme toggle, `render()` = `renderItems(); renderTotals();`. Calculations, validation, import, columns, groups, move, duplicate, delete, insert, and save are unchanged.

## Verification result

- `node --check` on extracted script: passed (SCRIPT OK).
- Grep: `thead` = 0, `googleapis` = 0, `renderHead` = 0, `toggleSub` = 0, `subOpen` = 0, `Save BOQ` = 1, standalone `fab`/`.fab` = 0.
- Seed totals parity (Playwright, 1600px): V2 and V3 identical — cost ₦4,984,090.00, sell ₦5,883,000.00, profit ₦898,910.00, margin 15%, words "FIVE MILLION EIGHT HUNDRED EIGHTY THREE THOUSAND NAIRA ONLY".
- Deterministic calc (clear, add, qty=2, cp=100, sp=150): ₦200.00 / ₦300.00 / ₦100.00 / 33% / "THREE HUNDRED NAIRA ONLY". Matches the plan.
- Enumeration: seed shows `01`–`05`. Group A members show `02`, `03`, `04`. First ungrouped item shows `01`. Group badge shows "3 items".
- Groups: 2 wrappers, 2 group footers with "Add item to this group". Create pair children: "Add line item", "Add group".
- Sub-description: hidden when empty (button only), textarea appears on click, empty content collapses on blur, typed content persists.
- Structure: `.thead` = 0, no Actions column, one `Save BOQ`, no font link, no FAB element.
- Theme: no attribute at boot, `toggleTheme()` writes `data-theme="dark"` then back to `light`.
- Modals: Columns (3 rows), JSON Import, Clear All all open.
- Console/page errors: 0 on V3, 0 on V2.
- `git diff --check`: no whitespace errors in changed files.
- `bun run build`: skipped due to hardware policy (4GB RAM host).
- `bun run typecheck`, `bun run audit:load`, lint: not applicable (no TS/React source changed).

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Zone order is fixed: identity, metadata, commercial, result, action. A future field that must sit between existing zones needs a zone edit, not a track edit.
- The amount-in-words line can wrap to two lines at 1024px. It is never truncated.
- Fonts use latin subsets. The naira glyph may fall back per-glyph, same as V2.
- Human visual inspection is still required. Machine checks cover structure, parity, and layout geometry only.

## Deferred work

- Human browser inspection of wide, compact, and dark compositions.
- React source port (out of scope for this task).
- New business fields such as Discount, Tax, Rate (not invented here; the zones are ready for them).

This report lists machine checks. A human must inspect the rendered result in a browser before design acceptance.
