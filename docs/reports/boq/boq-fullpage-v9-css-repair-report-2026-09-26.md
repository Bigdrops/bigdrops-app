# BOQ Full-Page Live Form v9 CSS Repair Report

This report was written by opencode (mimo-v2.6-flash-free) on 2026-09-26 via opencode CLI.

## Objective

Repair the CSS regression in `BOQ Full-Page Live Form-v9.html`. The page rendered with browser-default styles (serif font, unstyled layout). The repair must fix the root cause only. It must not redesign the page. It must preserve all prior refinements.

## Scope

- File changed: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v9.html`
- No other file was modified.
- Pre-existing uncommitted `src/` changes belong to other agents. They were not touched.

## ROOT CAUSE

The dark theme block `[data-theme="dark"]{` lost its closing `}`. The line `--bd-button-primary-text:#f1f5f9;` was directly followed by the global reset `*{box-sizing:border-box;margin:0;padding:0}`.

The browser parsed `*{box-sizing...}` as a nested rule inside the dark block. Two failures followed:

1. The whole stylesheet after that point was treated as nested content of the dark block. The reset, base styles, and component styles never applied in light mode.
2. In dark mode, the nested `html,body` selectors became `[data-theme="dark"] html, [data-theme="dark"] body`. The `html,body` selector no longer matched, so dark mode also failed.

Net effect: the page lost all custom CSS. This was the single root cause.

## REPAIR

Nine fixes were applied:

1. **Missing brace.** Inserted `}` after `--bd-button-primary-text:#f1f5f9;`. The dark block now closes before the global reset.
2. **Full-width commercial zone.** Changed `.fwrap` grid from `1fr 1fr` to `1fr`. The `.fwrap` zone has one child (`.g2`). The 2-column grid inside `.g2` now spans the full width.
3. **CP/SP pair cells.** Wrapped each CP and SP pair in `<div class="sfield">`. Added `.sfield{display:flex;align-items:center;min-width:0}` and `.sfield .sfld{flex:1;min-width:0}`. The label and input now sit in one grid cell.
4. **SP label color.** Changed the SP label class from `cp-sp-label` to `cp-sp-label sec`. The existing `.cp-sp-label.sec` rule gives SP the green treatment.
5. **Totals color rules.** The rules `.tProfit.*` and `.tMargin.*` were dead. The markup uses `id`, not class. Replaced them with six `#tProfit.*` / `#tMargin.*` rules. Semantics are unchanged: positive is green, negative is red, zero is ink.
6. **Focus readability.** The old `.sfld-cp:focus` set an amber background under amber text. The rules now order base, generic focus, CP focus, SP focus. All focus backgrounds are `#fff`. The ring color carries the CP/SP identity. Text stays readable.
7. **Dark bar contrast.** `.profit.neg span` used `--loss-soft` (12% alpha on a dark bar = invisible). Changed to `#fca5a5`. `.profit.zero b` used `--ink` (light-on-light risk). Changed to `#f1f5f9`.
8. **FAB icon.** Replaced the tray/arrow glyph with the Lucide `SaveAll` icon. Paths were verified against `node_modules/lucide-react/dist/esm/icons/save-all.js` (v0.577.0). This matches `docs/standard/fab-standard.md` section 3.2.
9. **FAB color and shadow.** Changed `color:#fff` to `color:var(--bd-button-primary-text)`. Changed the custom shadow to the shadow-lg literal. This matches fab-standard section 2.

## PRESERVED

The following prior refinements were checked after the repair:

- Enumeration pocket ends after description. The upper zone comment and `.utop` grid are unchanged.
- Full-width 2-column lower commercial grid. `.fwrap` + `.g2` structure intact; the fix widens it to full width as intended.
- CP amber / SP green semantics. Tokens (`--cost`, `--sell`, `--loss` in light and dark), `.sfld-cp`, `.sfld-sp`, `.cp-sp-label`, `.cp-sp-label.sec` all intact.
- Negative profit red, positive green, zero ink. `.profit.*` and `#tProfit/#tMargin` rules apply.
- Save FAB per fab-standard: 50×50, radius 18, `right:16px`, `bottom:calc(82px + env(safe-area-inset-bottom))`, z-index 50, hover scale 1.05, active scale 0.95, 20px icon with stroke 2.
- Dark FAB override, `esc()` quote fix, `profitHTML()` state classes, `.g3i` removal, `.fab-halo` removal — all intact.

## REQUESTED REFINEMENTS

All four requested refinements are complete:

1. Enumeration pocket ends after description — preserved.
2. Full-width 2-column lower commercial grid — achieved (fix 2 + fix 3).
3. CP amber, SP green — achieved (fix 4 confirms SP green label; CP/SP input styles preserved).
4. Negative profit red and FAB per fab-standard — achieved (fixes 5, 7, 8, 9).

## Skills used: frontend-design

## Documentation standard: ASD-STE100 Simplified Technical English

## Verification result

- `bun run audit:load`: passed (pre-existing warnings in `src/` only; none relate to this task).
- `bun run typecheck`: passed (clean `tsc --noEmit`).
- `git status`: target file `M`; all pre-existing `src/` changes and untracked files intact; no file reverted or overwritten.
- `git diff --check`: no whitespace errors.
- `git diff` on target: reviewed hunk by hunk; only the nine intended fixes appear.
- Static checker (custom script, temp dir): CSS brace balance = 0; dark block closes before `*{box-sizing`; inline script syntax OK (20,537 chars); 19 spot checks on all nine fixes passed.
- `bun run build`: skipped due to hardware policy.
- Manual browser smoke test: not performed.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- The repair was verified statically. No browser render test was run. A manual open of the file is the remaining confirmation step.
- The dark FAB token `--bd-button-primary-bg-dark` exists only in this prototype. It is not in the app design system yet.
- `--bg-bd-button-primary-bg` is a prototype-local token. If the pattern moves to the app, add it to the design system.

## Deferred work

- Dead variable `sellP` in `renderTotals()` (unused, harmless).
- Extra spaces in `profitHTML()` class string from empty ternary branches (cosmetic, harmless).
- Design-system registration of the two FAB tokens above.
- Pre-existing `src/` changes from other agents remain uncommitted and untouched.
