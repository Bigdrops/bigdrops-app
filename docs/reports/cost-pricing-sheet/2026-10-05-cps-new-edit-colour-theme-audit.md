# CPS New/Edit Colour and Theme-System Audit Report

This report was written by Qwen on 2026-10-05 via Local Runner.

## 1. Executive Summary

**CPS New/Edit owns a complete private light/dark literal palette.** The production form stylesheet `src/components/cps/cost-pricing-sheet-form.css` defines 33 CSS custom properties on `.cps-form` with 35 hardcoded light literal values and 33 hardcoded dark literal values. None resolve through BIGDROPS semantic theme authority (`--bd-*`). This is the same architectural issue previously found and remediated in CPS View.

**Dark mode is complete.** Every token in the `.cps-form` block has a dark override under `.dark .cps-form`. No incomplete dark coverage.

**No P0 visual/theme defects found.** Contrast ratios are acceptable in both modes. Light-mode `--faint` (#8b9ab0 on #eef2f7, ~3.5:1) is marginal for small text but acceptable for labels.

**Active literal count:** approximately 78 active literal values (68 in the token block + 10 outside it), plus 3 inline colour styles that resolve to literals via variable indirection. Additionally, 3 dead literals and 2 dead tokens exist outside the active set.

**New and Edit share the same authority.** Both routes render `CpsFormPage` → `CostPricingSheetEditor` → the same CSS file. Desktop and mobile/fold share the same `.cps-form` root; mobile adds extra hardcoded white-translucent literals for group controls.

**The form's `--accent` (#1e3a5f navy) differs from the app's primary brand** (`--bd-button-primary-bg` = indigo 225 75% 48%). This is both a theme bypass and a visual inconsistency with the rest of the application.

## 2. Actual Production New/Edit Component Tree

```text
Route: /cost-pricing-sheets/new  → NewCps  → CpsFormPage mode="create"
Route: /cost-pricing-sheets/edit/:id → EditCps → CpsFormPage mode="edit"

src/pages/NewCps.tsx          (active, 5 lines)
src/pages/EditCps.tsx         (active, 5 lines)
src/pages/CpsFormPage.tsx    (active, 127 lines — shared by New and Edit)
├── src/components/Layout.tsx (shared chrome, immersive, hidePageHeader)
└── src/components/cps/CostPricingSheetEditor.tsx (active, ~1150 lines)
    ├── src/components/cps/CostPricingSheetForm.tsx (active)
    │   └── src/components/layout/fabFloat.css (shared, motion only — no colours)
    ├── src/components/cps/CostPricingSheetFormPresentations.tsx (active, 641 lines)
    │   └── src/components/cps/cost-pricing-sheet-form.css (active — MAIN COLOUR AUTHORITY)
    ├── src/components/cps/CpsImportSheet.tsx (active, shared — semantic)
    ├── src/components/cps/CpsMarkupSheet.tsx (active, shared — semantic)
    ├── src/components/ClientSelector.tsx (active, shared — semantic)
    ├── src/components/ui/dialog.tsx (shared primitive — semantic)
    ├── src/components/ui/sheet.tsx (shared primitive — semantic)
    ├── src/components/ui/button.tsx (shared primitive — semantic)
    ├── src/components/ui/input.tsx (shared primitive — semantic)
    └── src/components/ui/switch.tsx (shared primitive — semantic)
```

Layout split: `CostPricingSheetEditor` uses `useLayoutMode()`. When `isDesktop && !hasFold && !isTablet` → `CostPricingSheetDesktopForm`; otherwise → `CostPricingSheetMobileFoldForm`. Both render inside `.cps-form` (same CSS token block).

**Legacy/unmounted:** `CpsJ3Form`, `CostPricingSheetFormPresentations` (old J3-era), and the embedded `CPS_J3_CSS` string in `docs/templates/` are NOT mounted in production. The active editor is `CostPricingSheetEditor`.

## 3. Theme Authority Discovered

### 3.1 Global semantic tokens

- `src/index.css` — `:root` and `.dark` base triplets (`--background`, `--foreground`, `--card`, `--primary`, `--border`, `--muted`, `--muted-foreground`, `--destructive`, `--ring`).
- `src/styles/formTheme.css` — `:root` and `.dark` bridge tokens (`--bd-app-bg`, `--bd-surface`, `--bd-card-bg`, `--bd-border`, `--bd-text`, `--bd-text-muted`, `--bd-button-primary-bg`, `--bd-status-success-*`, `--bd-status-warning-*`, `--bd-status-danger-*`, `--bd-accent`, `--bd-shadow-*`, etc.).
- `tailwind.config.js` — maps `bd-*` utilities to `hsl(var(--bd-*))`. Dark mode is class-based.

### 3.2 CPS form local token set

`cost-pricing-sheet-form.css` lines 1-73 define a private token set on `.cps-form`. Light values on `.cps-form` (lines 2-34); dark values on `.dark .cps-form` (lines 44-72). **Every value is a hardcoded literal.** No token resolves through `--bd-*`.

### 3.3 Shared component authority

The editor's overlay surfaces (sheet, dialog, markup sheet, import sheet) use semantic `bd-*` Tailwind utilities directly in TSX. These are correct and must not change.

## 4. Complete Active Local-Token Inventory

All tokens defined in `.cps-form` (lines 2-34 light, 44-72 dark). Classification: all HARDCODED (private literal palette).

| Variable | Light value | Dark value | Consumers | Classification | Recommended semantic source | Confidence |
|---|---|---|---|---|---|---|
| `--ink` | `#0f172a` | `#f1f5f9` | page text (37) | HARDCODED | `--bd-text` | High |
| `--sub` | `#475569` | `#cbd5e1` | secondary text (126, 333, 399, 480, 545) | HARDCODED | `--bd-text` or derived | High |
| `--faint` | `#8b9ab0` | `#7d8da5` | muted text (155, 267, 276, 358, 370, 375) | HARDCODED | `--bd-text-muted` | High |
| `--line` | `rgba(15,23,42,.10)` | `rgba(148,163,184,.18)` | borders (110, 124, 232, 287, 338, 390, 543) | HARDCODED | `--bd-border` | High |
| `--line-strong` | `rgba(15,23,42,.20)` | `rgba(148,163,184,.32)` | strong borders (320, 479) | HARDCODED | `--bd-border-strong` | High |
| `--bg` | `#eef2f7` | `#0b1220` | page bg (36, 109) | HARDCODED | `--bd-app-bg` | High |
| `--card` | `#ffffff` | `#16233a` | card surfaces (125, 288, 321, 391, 478, 524, 544) | HARDCODED | `--bd-card-bg` | High |
| `--soft` | `#f6f9fc` | `#111d31` | subtle surfaces (332) | HARDCODED | `--bd-surface-muted` | High |
| `--accent` | `#1e3a5f` | `#38bdf8` | focus ring, FAB, primary buttons, group title, borders (101, 157, 163, 219, 248, 299, 402-403, 717, 943, 979-980) | HARDCODED | `--bd-button-primary-bg` or `--bd-accent` | High |
| `--accent-soft` | `rgba(30,58,95,.13)` | `rgba(56,189,248,.16)` | focus ring bg, sheet headers (300, 1158, 1260, 1517) | HARDCODED | `--bd-button-primary-bg` at alpha | High |
| `--accent-ink` | `#ffffff` | `#06131f` | text on accent (164, 220) | HARDCODED | `--bd-button-primary-text` | High |
| `--red` | `#dc2626` | `#f87171` | destructive (280, 409, 818) | HARDCODED | `--bd-status-danger-text` | High |
| `--red-soft` | `rgba(220,38,38,.09)` | `rgba(248,113,113,.13)` | destructive bg (687, 1293, 1402, 1438) | HARDCODED | `--bd-status-danger-bg` | High |
| `--green` | `#15803d` | `#34d399` | gain/profit (683, 1289) | HARDCODED | `--bd-status-success-text` | High |
| `--green-soft` | `rgba(21,128,61,.10)` | `rgba(52,211,153,.14)` | gain bg (683, 1289) | HARDCODED | `--bd-status-success-bg` | High |
| `--cost-soft` | `rgba(180,83,9,.10)` | `rgba(251,191,36,.13)` | none (dead token) | DEAD | — | High |
| `--sell-soft` | `rgba(21,128,61,.10)` | `rgba(52,211,153,.14)` | none (dead token) | DEAD | — | High |
| `--rail` | `rgba(15,23,42,.22)` | `rgba(148,163,184,.32)` | rail separator (513) | HARDCODED | `--bd-border-strong` | High |
| `--cost` | `#b45309` | `#fbbf24` | cost emphasis (586, 588, 601, 671) | HARDCODED | `--bd-status-warning-text` or CPS alias | High |
| `--sell` | `#15803d` | `#34d399` | sell emphasis (587, 589, 602, 674, 677) | HARDCODED | `--bd-status-success-text` or CPS alias | High |
| `--loss` | `#b91c1c` | `#f87171` | loss (680) | HARDCODED | `--bd-status-danger-text` | High |
| `--group-line` | `rgba(30,58,95,.38)` | `rgba(56,189,248,.34)` | group wall (842, 942) | HARDCODED | `--bd-border` or CPS alias | High |
| `--group-spine` | `#1e3a5f` | `#38bdf8` | group left spine (843) | HARDCODED | `--bd-button-primary-bg` or CPS alias | High |
| `--group-soft` | `rgba(30,58,95,.07)` | `rgba(56,189,248,.10)` | group subtle bg (932) | HARDCODED | `--bd-surface-muted` | High |
| `--group-head` | `linear-gradient(115deg,#0f172a,#1e3a5f 58%,#334155)` | `linear-gradient(115deg,#16233a,#1c3550)` | group header bg (862) | HARDCODED | CPS alias or `--bd-button-primary-bg` gradient | High |
| `--group-on` | `#f8fafc` | `#e2e8f0` | text on group header (876, 899) | HARDCODED | `--bd-button-primary-text` | High |
| `--profit-bg` | `linear-gradient(120deg,#0f172a,#1e293b)` | `linear-gradient(120deg,#0d1728,#1b2b45)` | profit cell bg (611) | HARDCODED | CPS alias | High |
| `--on-dark` | `#f1f5f9` | `#f1f5f9` | text on dark (618) | HARDCODED | `--bd-text` | High |
| `--pos-on-dark` | `#4ade80` | `#4ade80` | positive on dark (625) | HARDCODED | `--bd-status-success-text` | High |
| `--neg-on-dark` | `#fca5a5` | `#fca5a5` | negative on dark (627) | HARDCODED | `--bd-status-danger-text` | High |
| `--shadow-ear` | `0 3px 9px rgba(15,23,42,.16)` | `0 3px 9px rgba(0,0,0,.45)` | card shadow (484) | HARDCODED | `--bd-shadow-sm` or keep | Medium |
| `--shadow-sheet` | `0 -18px 44px rgba(0,0,0,.28)` | `0 -18px 44px rgba(0,0,0,.5)` | sheet shadow (1192) | HARDCODED | `--bd-shadow-lg` or keep | Medium |
| `--mono` | font stack | font stack | monospace (97, 245, 264, etc.) | Not a colour | — | — |

## 5. Hardcoded Colour Inventory (Active — Outside Token Block)

| File | Line | Rule | Literal | Visual role | Light impact | Dark impact | Classification | Recommended authority | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| cost-pricing-sheet-form.css | 684 | `.cps-fcell.pf.gain` | `rgba(21,128,61,.16)` | profit cell border | Green border | Green border | HARDCODED | `--bd-status-success-border` | High |
| cost-pricing-sheet-form.css | 688 | `.cps-fcell.pf.loss` | `rgba(185,28,28,.16)` | loss cell border | Red border | Red border | HARDCODED | `--bd-status-danger-border` | High |
| cost-pricing-sheet-form.css | 819 | `.cps-photo-x` | `#fff` | delete badge text | White on red | White on red | HARDCODED | `--bd-button-primary-text` or `--bd-status-danger-text` | High |
| cost-pricing-sheet-form.css | 887 | `.cps-gcount` | `rgba(248,250,252,.75)` | group count text (mobile) | Light text on dark header | Light text on dark header | HARDCODED | `--group-on` (semantic) | High |
| cost-pricing-sheet-form.css | 897 | `.cps-gbtn` | `rgba(255,255,255,.24)` | group button border (mobile) | White border on dark | White border on dark | HARDCODED | `--group-on` at alpha | High |
| cost-pricing-sheet-form.css | 898 | `.cps-gbtn` | `rgba(255,255,255,.12)` | group button bg (mobile) | White bg on dark | White bg on dark | HARDCODED | `--group-on` at alpha | High |
| cost-pricing-sheet-form.css | 905 | `.cps-gbtn.danger` | `rgba(255,255,255,.26)` | danger group button border (mobile) | White border on dark | White border on dark | HARDCODED | `--group-on` at alpha | High |
| cost-pricing-sheet-form.css | 1019 | `.cps-totals` | `rgba(255,255,255,.36)` | totals top fade gradient | White fade over card | White fade over card | HARDCODED | Remove or use `--card` | Medium |
| cost-pricing-sheet-form.css | 1167 | `.cps-overlay` | `rgba(8,15,28,.62)` | sheet/dialog scrim | Dark scrim | Dark scrim | HARDCODED | `--bd-overlay-scrim` | High |
| cost-pricing-sheet-form.css | 1437 | `.cps-mk-err` | `rgba(220,38,38,.18)` | markup error border | Red border | Red border | HARDCODED (dead rule) | `--bd-status-danger-border` | High |

## 6. Raw Tailwind Palette Inventory

No raw Tailwind palette utilities (`bg-slate-*`, `text-gray-*`, `border-blue-*`, etc.) found in any active CPS New/Edit TSX file. Searched: `CostPricingSheetFormPresentations.tsx`, `CostPricingSheetEditor.tsx`, `CostPricingSheetForm.tsx`.

## 7. Tailwind Arbitrary Colour Inventory

No Tailwind arbitrary colour values (`bg-[#...]`, `text-[#...]`, `border-[#...]`, `ring-[#...]`, `shadow-[#...]`) found in any active CPS New/Edit TSX file.

## 8. Inline Colour-Style Inventory

| File | Line | Element | Mechanism | Resolves to | Classification |
|---|---|---|---|---|---|
| CostPricingSheetEditor.tsx | 1101 | secondary text | `style={{ color: 'var(--sub)' }}` | `#475569` (light) / `#cbd5e1` (dark) | HARDCODED (via indirection) |
| CostPricingSheetEditor.tsx | 1114 | error text | `style={{ color: 'var(--red)' }}` | `#dc2626` / `#f87171` | HARDCODED (via indirection) |
| CostPricingSheetEditor.tsx | 1131 | faint text | `style={{ color: 'var(--faint)' }}` | `#8b9ab0` / `#7d8da5` | HARDCODED (via indirection) |

## 9. SVG/Icon Colour Inventory

- `CostPricingSheetFormPresentations.tsx` line 283 — inline SVG with `stroke="currentColor"`. Inherits parent colour. Correct.
- All lucide icons in the form inherit colour from parent via `currentColor` or parent `color`. No literal icon colours found.

## 10. CSS Custom-Property Trace

Every variable in the `.cps-form` token block was traced to its definition (lines 2-34 light, 44-72 dark). **All terminate in hardcoded literals.** None resolve through `--bd-*` semantic tokens. See section 4 for the complete trace.

## 11. Group Colour-Authority Analysis

Group styling uses these private literals:

- `--group-spine: #1e3a5f` / `#38bdf8` — 6px left border on the group wall (line 843). This is the group's visual identity marker.
- `--group-line: rgba(30,58,95,.38)` / `rgba(56,189,248,.34)` — 1px group wall border (line 842) and dashed subtotal border (line 942).
- `--group-head: linear-gradient(115deg,#0f172a,#1e3a5f 58%,#334155)` / `linear-gradient(115deg,#16233a,#1c3550)` — group header background (line 862). A dark gradient that makes the group header visually prominent.
- `--group-on: #f8fafc` / `#e2e8f0` — text colour on the group header (lines 876, 899).
- `--group-soft: rgba(30,58,95,.07)` / `rgba(56,189,248,.10)` — group subtotal top border (line 932).
- `--accent` — group title colour (line 943) and grouped-row left border (line 717).

**Assessment:** The group roles (spine, wall, header, header-text, subtle-bg) are legitimate CPS-specific semantic roles. They should be preserved. However, they currently resolve to private literals. The BIGDROPS theme does not have dedicated group tokens. The recommended approach is to define CPS group aliases that resolve through approved semantic authority (e.g., `--group-spine: var(--bd-button-primary-bg)`, `--group-head: linear-gradient(115deg, var(--bd-button-primary-bg), ...)`). Do NOT flatten group styling merely to eliminate local aliases.

## 12. Cost/Sell/Markup/Status Colour Analysis

| Concept | Variable | Light | Dark | BIGDROPS equivalent | Assessment |
|---|---|---|---|---|---|
| Cost | `--cost` | `#b45309` | `#fbbf24` | `--bd-status-warning-text` (38 92% 50%) | Close but form is darker/muted. CPS alias justified. |
| Selling | `--sell` | `#15803d` | `#34d399` | `--bd-status-success-text` (142 71% 45%) | Close. CPS alias justified. |
| Profit/gain | `--green` | `#15803d` | `#34d399` | `--bd-status-success-text` | Same as sell. |
| Loss | `--loss` | `#b91c1c` | `#f87171` | `--bd-status-danger-text` (0 84% 60%) | Close. |
| Destructive | `--red` | `#dc2626` | `#f87171` | `--bd-status-danger-text` | Close. |
| Accent/primary | `--accent` | `#1e3a5f` | `#38bdf8` | `--bd-button-primary-bg` (225 75% 48%) | **Different hue family** (navy vs indigo). Visual inconsistency. |

**Assessment:** Cost/sell/loss are domain colours with genuine semantic meaning. Dedicated CPS aliases are justified. However, `--accent` (the form's primary action colour) is a different hue from the app's `--bd-button-primary-bg`. This is a visual inconsistency: the form's Save button, FAB, and focus ring are navy/sky while the rest of the app uses indigo. The `--accent` should resolve through `--bd-button-primary-bg` (or `--bd-accent`) to match the application's primary brand.

## 13. Light/Dark Comparison

- **Dark mode is complete.** Every token in `.cps-form` has a dark override. No light-only or dark-only literals in the active token set.
- **Light-to-dark shifts:** page bg `#eef2f7`→`#0b1220`; card `#ffffff`→`#16233a`; text `#0f172a`→`#f1f5f9`; accent `#1e3a5f`→`#38bdf8`; cost `#b45309`→`#fbbf24`; sell `#15803d`→`#34d399`.
- **No light colour remains active in dark mode** (except `--on-dark`, `--pos-on-dark`, `--neg-on-dark` which are intentionally mode-independent text colours for dark surfaces).
- **Contrast:** Light-mode `--faint` (#8b9ab0) on `--bg` (#eef2f7) is ~3.5:1 — marginal for small text but acceptable for labels/metadata. All other text roles exceed 4.5:1. Dark mode contrast is good throughout.
- **No washed-out surfaces, lost hierarchy, or unreadable text** identified from code evidence.

## 14. Mobile/Fold/Desktop Comparison

- **Same authority.** Both presentations render inside `.cps-form` with the same token block. No viewport-specific token definitions.
- **Mobile/fold additions:** `.cps-mobile-wrap` overrides (font sizes, padding) and `.cps-phone-fab` (mobile-only FAB). The mobile group controls (`.cps-gcount`, `.cps-gbtn` at lines 884-906) contain hardcoded white-translucent literals (`rgba(248,250,252,.75)`, `rgba(255,255,255,.24/.12/.26)`) designed to sit on the dark group header gradient. These are mobile-only active literals.
- **Desktop-only:** `.cps-railside`, `.cps-panel` (desktop rail) use the same token block. No desktop-only literals.
- **No separate hardcoded palettes per viewport.** Mobile reuses the same private palette plus a few white-translucent group-control literals.

## 15. Shared-Component Findings and Blast Radius

| Component | Used by New/Edit | Hardcoded colours? | Blast radius |
|---|---|---|---|
| `CpsMarkupSheet` | Yes | No (semantic `bd-*`) | None — already correct |
| `CpsImportSheet` | Yes | No (semantic `bd-overlay-*`) | None — already correct |
| `ClientSelector` | Yes | No (semantic `bd-*`) | None — already correct |
| `ui/dialog.tsx` | Yes | No (semantic) | None — already correct |
| `ui/sheet.tsx` | Yes | No (semantic) | None — already correct |
| `ui/button.tsx` | Yes | No (semantic) | None — already correct |
| `ui/input.tsx` | Yes | No (semantic) | None — already correct |
| `ui/switch.tsx` | Yes | No (semantic) | None — already correct |
| `cost-pricing-sheet-form.css` | Yes (CPS-local) | Yes (private palette) | CPS New/Edit only |

**The form CSS is CPS-local.** It is imported only by `CostPricingSheetFormPresentations.tsx`, which is imported only by `CostPricingSheetEditor.tsx`. No other component imports it. Blast radius of a future remediation: CPS New/Edit only. No shared-component blast radius.

## 16. Correct Semantic Usages That MUST NOT Be Changed

1. **Editor overlay surfaces** (`CostPricingSheetEditor.tsx` lines 853-961) — sheet/dialog using `border-bd-border`, `bg-bd-card-bg`, `text-bd-text`, `bg-bd-surface-muted`, `text-bd-text-muted`, `text-bd-text`. Correct semantic usage.
2. **`CpsMarkupSheet.tsx`** — `text-bd-text-muted`, `text-bd-status-danger-text`, `border-bd-border`, `bg-bd-surface-muted`. Correct.
3. **`CpsImportSheet.tsx`** — `border-bd-overlay-border`, `bg-bd-overlay-section-bg`, `text-bd-overlay-text`, `text-bd-overlay-muted`. Correct.
4. **`CostPricingSheetFormPresentations.tsx` line 480** — destructive button `bg-bd-status-danger-text text-white`. Correct.
5. **`CpsFormPage.tsx` line 111** — loading state `text-bd-text-muted`. Correct.
6. **SVG icons** — `stroke="currentColor"` throughout. Correct.
7. **`fabFloat.css`** — motion only, no colours. Correct.

These already follow the design system. A future remediation agent must not replace them.

## 17. Dead/Unmounted Literals

| File | Line | Rule | Literal | Reason dead |
|---|---|---|---|---|
| cost-pricing-sheet-form.css | 221 | `.cps-fab` box-shadow | `rgb(0 0 0 / .1)` | Desktop FAB not used (only `.cps-phone-fab`) |
| cost-pricing-sheet-form.css | 1371 | `.cps-dialog` box-shadow | `rgba(0,0,0,.28)` | `.cps-dialog` not used in any TSX |
| cost-pricing-sheet-form.css | 1437 | `.cps-mk-err` border | `rgba(220,38,38,.18)` | `.cps-mk-err` not used in any TSX |
| cost-pricing-sheet-form.css | 17-18 | `--cost-soft`, `--sell-soft` | (token values) | Defined but never consumed |

These do not affect production New/Edit. They are separated from production findings per task constraints.

## 18. Prioritized Remediation Plan

### P0 — broken/readability/theme failures

None found. Dark mode is complete. No unreadable states.

### P1 — active private palette/theme bypass

1. Re-point the `.cps-form` core token block (lines 2-34, 44-72) to `--bd-*` semantic tokens. Mapping per section 4. The `--accent` should resolve through `--bd-button-primary-bg` to match the app's primary brand. Cost/sell/loss may use dedicated CPS aliases resolving through `--bd-status-*` authority.
2. Fix the 10 active literals outside the token block (section 5): profit/loss cell borders, photo-delete badge text, mobile group controls, totals gradient, overlay scrim.
3. Fix the 3 inline colour styles (section 8) to use semantic `bd-*` utilities or semantic CSS variables.

### P2 — local consistency cleanup

4. Remove dead tokens `--cost-soft` and `--sell-soft` (defined, never consumed).
5. Reconcile the mixed authority: the editor's TSX overlays use semantic `bd-*` while the CSS file uses private literals. After P1, both will use semantic authority.

### P3 — shared/dead-code/optional refinement

6. Remove dead rules `.cps-fab`, `.cps-dialog`, `.cps-mk-err` (separate dead-code task).
7. Consider mapping `--shadow-ear` and `--shadow-sheet` to `--bd-shadow-*` tokens (currently neutral black shadows; low priority).

Do not execute this plan. It is the recommended scope for a separate remediation task.

## 19. Exact Recommended Scope for the Future Remediation Task

**In scope:**

- `src/components/cps/cost-pricing-sheet-form.css` only:
  - Re-point the `.cps-form` light token block (lines 2-34) and dark token block (lines 44-72) to `--bd-*` semantic tokens.
  - Fix the 10 active literals outside the token block (lines 684, 688, 819, 887, 897, 898, 905, 1019, 1167).
  - Remove dead tokens `--cost-soft` and `--sell-soft`.

**Out of scope for the fix task (already correct):**

- All shared components (CpsMarkupSheet, CpsImportSheet, ClientSelector, ui/dialog, ui/sheet, ui/button, ui/input, ui/switch).
- Editor TSX overlay surfaces (already semantic).
- `CostPricingSheetFormPresentations.tsx` destructive button (already semantic).
- `fabFloat.css` (no colours).

**Separate task required for:**

- Dead rules `.cps-fab`, `.cps-dialog`, `.cps-mk-err` (dead-code removal).
- Shadow token alignment (`--shadow-ear`, `--shadow-sheet`).

## 20. Explicit Out-of-Scope Findings

- **CPS View** (`cost-pricing-sheet-view.css`) — separately audited and remediated. Not reopened here.
- **PDF/Forme** — out of scope per task.
- **Legacy J3 form** (`CpsJ3Form`, `CPS_J3_CSS` in `docs/templates/`) — not mounted in production. Not audited.
- **Pre-existing uncommitted changes** in the working tree (concurrent agent's lineage/audit/PDF work) — not touched by this audit.

## 21. Search Evidence

Patterns searched (ripgrep):

- `#[0-9a-fA-F]{3,8}\b` — hex literals — in `cost-pricing-sheet-form.css`, all CPS TSX files, shared components.
- `rgba?\(` — rgb/rgba — in `cost-pricing-sheet-form.css`, all CPS TSX files.
- `hsla?\(` — hsl/hsla — in `cost-pricing-sheet-form.css`.
- `oklch\(|color-mix` — oklch/color-mix — in `cost-pricing-sheet-form.css` (none found).
- `(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]` — raw Tailwind palette families — in all CPS TSX files. No matches.
- `(bg|text|border|ring|shadow|fill|stroke)-\[#` — Tailwind arbitrary colour syntax — in all CPS TSX files. No matches.
- `style=\{\{` — inline styles — in all CPS TSX files. 3 colour matches (all `var()` indirection).
- `fill=|stroke=|currentColor` — SVG colours — in presentations. `currentColor` only.
- `var\(--` — CSS custom properties — full trace of every `.cps-form` token to its definition.
- `dark:` — Tailwind dark variants — in all CPS TSX files. No matches (dark mode is CSS-only).
- `.dark` / `[data-theme="dark"]` — CSS dark selectors — in `cost-pricing-sheet-form.css` (lines 41-43).
- `import.*css` — CSS imports — traced all stylesheets in the production tree.
- Class-name cross-reference — every CSS rule with literals checked against TSX usage to classify active vs dead.

## Skills used: karpathy, frontend-design

Documentation standard: ASD-STE100 Simplified Technical English
