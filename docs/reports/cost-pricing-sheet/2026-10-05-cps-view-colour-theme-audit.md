# CPS View Colour and Theme-System Audit Report

This report was written by Qwen on 2026-10-05 via Local Runner.

## 1. Executive Summary

This audit traced every significant visible colour on the production CPS View page to its source. The audit covered desktop, mobile, fold, light mode, and dark mode.

The main finding: CPS View does NOT consume the BIGDROPS semantic theme tokens (`--bd-*`) for its core surfaces. It uses a private, component-scoped token set defined in `src/components/cps/cost-pricing-sheet-view.css`. Fourteen light-mode literals and fourteen dark-mode literals define the CPS surface palette. Some CPS tokens alias global theme tokens correctly (`--brand`, `--action-soft*`). The rest are hardcoded local literals.

Dark mode is complete. Every CPS token has a dark-mode override. No broken contrast or unreadable state was found. The risk is theme-authority bypass: CPS View will not follow global theme changes (brand colour, dark surface ramp, status colours) because its palette is private.

The shared document-view components used by CPS View (dialogs, sheets, confirmations, customize card) are fully semantic and correct. They must not be changed.

No code was modified. This report is the only file created.

## 2. Production CPS View Component/Dependency Tree Inspected

```text
src/pages/ViewCps.tsx
├── src/components/Layout.tsx
├── src/components/cps/CostPricingSheetViewPresentations.tsx
│   ├── src/components/cps/cost-pricing-sheet-view.css
│   ├── src/components/document-view/shared/DocumentConfirmDialog.tsx
│   │   └── src/components/document-view/shared/DocumentModal.tsx
│   │       └── src/components/ui/dialog.tsx
│   │           └── src/components/ui/button.tsx
│   ├── src/components/document-view/shared/DocumentCustomizeCard.tsx
│   │   └── src/components/ui/{input,switch,select}.tsx
│   │   └── src/lib/pdfDesignPreset.ts (PDF_ACCENT_SWATCHES)
│   ├── src/components/document-view/shared/DocumentMoreSheet.tsx
│   │   ├── src/components/document-view/shared/DocumentSheet.tsx
│   │   │   └── src/components/ui/sheet.tsx
│   │   └── src/components/document-view/shared/DocumentMoreSheet.module.css
│   ├── src/components/document-view/shared/FloatingDownloadButton.tsx
│   │   ├── src/components/document-view/shared/FloatingDocumentButton.tsx
│   │   ├── src/components/document-view/shared/FloatingDownloadButton.module.css
│   │   └── src/components/layout/fabFloat.css
│   ├── src/components/cps/CpsConversionOptionsSheet.tsx
│   │   └── src/components/ui/{sheet,input,switch,button}.tsx
│   └── src/components/cps/CpsActivityHistory.tsx
│       └── src/components/cps/cps-activity-history.css
src/pages/view-cps-actions.ts (pure logic, no colours)
```

Route split: `ViewCps.tsx` renders `CostPricingSheetDesktopView` when `isDesktop && !hasFold && !isTablet`, otherwise `CostPricingSheetMobileFoldView`. Both presentations share the same CSS file and the same token set.

## 3. Theme Authority Discovered

### 3.1 Global semantic tokens

- `src/index.css` — `:root` and `.dark` define the base triplets: `--background`, `--foreground`, `--card`, `--primary`, `--border`, `--muted`, `--muted-foreground`, `--destructive`, `--ring`.
- `src/styles/formTheme.css` — `:root` and `.dark` define the `--bd-*` bridge tokens. Examples: `--bd-app-bg`, `--bd-surface`, `--bd-card-bg`, `--bd-border`, `--bd-text`, `--bd-text-muted`, `--bd-button-primary-bg`, `--bd-status-success-text`, `--bd-status-warning-text`, `--bd-status-danger-text`, `--bd-fab-bg`, `--bd-fab-text`, `--bd-focus-ring`.
- `tailwind.config.js` — maps `bd-*` utilities to `hsl(var(--bd-*))`. Dark mode is class-based (`darkMode: ["class"]`).

### 3.2 CPS local token set

`cost-pricing-sheet-view.css` lines 1-52 define a private token set on `.cps-view`:

- Light literals: `--ink: #101828`, `--body: #344054`, `--faint: #667085`, `--line: rgba(16,24,40,.10)`, `--line-strong: rgba(16,24,40,.22)`, `--bg: #f2f4f7`, `--card: #ffffff`, `--soft: #eef1f5`, `--cost: #b54708`, `--cost-soft: rgba(181,71,8,.10)`, `--sell: #067647`, `--sell-soft: rgba(6,118,71,.10)`, `--danger: #b42318`, `--ghost: rgba(16,24,40,.07)`, `--shadow-sheet: 0 -18px 44px rgba(0,0,0,.28)`.
- Semantic aliases: `--brand: hsl(var(--bd-button-primary-bg))`, `--brand-ink: hsl(var(--bd-button-primary-text))`, `--brand-soft: hsl(var(--bd-button-primary-bg) / .08)`, `--action-soft: hsl(var(--bd-surface-action))`, `--action-soft-border: hsl(var(--bd-surface-action-border))`, `--action-soft-text: hsl(var(--bd-action-icon-bg))`.
- Dark literals (lines 31-52): `--ink: #f2f4f7`, `--body: #d0d5dd`, `--faint: #98a2b3`, `--line: rgba(255,255,255,.12)`, `--line-strong: rgba(255,255,255,.24)`, `--bg: #0c111d`, `--card: #1d2939`, `--soft: #161f2e`, `--cost: #fdb022`, `--cost-soft: rgba(253,176,34,.13)`, `--sell: #6ce9a6`, `--sell-soft: rgba(108,233,166,.12)`, `--danger: #f97066`, `--ghost: rgba(255,255,255,.06)`, `--shadow-sheet: 0 -18px 44px rgba(0,0,0,.55)`.

The dark selector is `.dark .cps-view, [data-theme="dark"] .cps-view, .cps-view[data-theme="dark"]`. The app uses class-based dark mode, so `.dark .cps-view` is the active path.

### 3.3 Shared component variants

- `DocumentConfirmDialog`, `DocumentModal`, `DocumentSheet`, `DocumentCustomizeCard`, `DocumentMoreSheet` — all use `bd-*` semantic utilities only.
- `FloatingDownloadButton.module.css` — semantic background/border/colour via `--bd-fab-*`; shadow layers mix semantic and hardcoded values.
- `ui/sheet.tsx`, `ui/dialog.tsx` — radix primitives; scrim uses `bg-black/50 dark:bg-black/70`.

## 4. Hardcoded Colour Inventory

### 4.1 CPS local token block (core surfaces)

| File | Line | Element | Mechanism | Light impact | Dark impact | Classification | Recommended source | Confidence |
|---|---|---|---|---|---|---|---|---|
| cost-pricing-sheet-view.css | 3 | `--ink` page text | `#101828` | Dark text on light bg | Overridden to `#f2f4f7` | HARDCODED | `--bd-text` | High |
| cost-pricing-sheet-view.css | 4 | `--body` secondary text | `#344054` | Medium text | Overridden to `#d0d5dd` | HARDCODED | `--bd-text` | High |
| cost-pricing-sheet-view.css | 5 | `--faint` muted text | `#667085` | Muted text, ~4.6:1 on white | Overridden to `#98a2b3` | HARDCODED | `--bd-text-muted` | High |
| cost-pricing-sheet-view.css | 6 | `--line` borders/separators | `rgba(16,24,40,.10)` | Subtle border | Overridden to `rgba(255,255,255,.12)` | HARDCODED | `--bd-border` | High |
| cost-pricing-sheet-view.css | 7 | `--line-strong` strong borders | `rgba(16,24,40,.22)` | Visible border | Overridden to `rgba(255,255,255,.24)` | HARDCODED | `--bd-border-strong` | High |
| cost-pricing-sheet-view.css | 8 | `--bg` page background | `#f2f4f7` | Light grey page | Overridden to `#0c111d` | HARDCODED | `--bd-app-bg` | High |
| cost-pricing-sheet-view.css | 9 | `--card` surfaces | `#ffffff` | White cards | Overridden to `#1d2939` | HARDCODED | `--bd-card-bg` | High |
| cost-pricing-sheet-view.css | 10 | `--soft` subtle surface | `#eef1f5` | Light panel | Overridden to `#161f2e` | HARDCODED | `--bd-surface-muted` | High |
| cost-pricing-sheet-view.css | 18 | `--cost` cost/amber | `#b54708` | Brown-amber cost text | Overridden to `#fdb022` | HARDCODED | `--bd-status-warning-text` or approved CPS alias | High |
| cost-pricing-sheet-view.css | 19 | `--cost-soft` cost tint | `rgba(181,71,8,.10)` | Amber tint | Overridden to `rgba(253,176,34,.13)` | HARDCODED | `--bd-status-warning-bg` | High |
| cost-pricing-sheet-view.css | 20 | `--sell` selling green | `#067647` | Green sell text | Overridden to `#6ce9a6` | HARDCODED | `--bd-status-success-text` or approved CPS alias | High |
| cost-pricing-sheet-view.css | 21 | `--sell-soft` sell tint | `rgba(6,118,71,.10)` | Green tint | Overridden to `rgba(108,233,166,.12)` | HARDCODED | `--bd-status-success-bg` | High |
| cost-pricing-sheet-view.css | 22 | `--danger` destructive | `#b42318` | Red danger text | Overridden to `#f97066` | HARDCODED | `--bd-status-danger-text` | High |
| cost-pricing-sheet-view.css | 23 | `--ghost` hover surface | `rgba(16,24,40,.07)` | Hover grey | Overridden to `rgba(255,255,255,.06)` | HARDCODED | `--bd-surface-muted` | High |
| cost-pricing-sheet-view.css | 24 | `--shadow-sheet` sheet shadow | `rgba(0,0,0,.28)` | Dark shadow | Overridden to `rgba(0,0,0,.55)` | HARDCODED | Shadow tokens or keep (conventional) | High |

### 4.2 Other hardcoded colours in CPS View CSS

| File | Line | Element | Mechanism | Light impact | Dark impact | Classification | Recommended source | Confidence |
|---|---|---|---|---|---|---|---|---|
| cost-pricing-sheet-view.css | 321 | `.cps-brandlogo` logo chip | `background: #ffffff` | White chip behind logo | Stays white in dark mode | HARDCODED (intentional-looking) | `var(--card)` or dedicated logo-chip token | High |
| cost-pricing-sheet-view.css | 915 | `.cps-fab-slot button` shadow | `0 4px 10px rgba(15,23,42,.18)` | Dark shadow | Nearly invisible on dark surface | HARDCODED | Shadow token or remove layer | High |
| cost-pricing-sheet-view.css | 928 | `.cps-sheet-backdrop` | `rgba(12,17,29,.5)` | Not rendered (dead CSS) | Not rendered | HARDCODED (dead code) | Remove or wire to `--bd-overlay-scrim` | High |
| cost-pricing-sheet-view.css | 994-995 | `.cps-mini` template mini | `background: #fff; color: #101828` | Not rendered (dead CSS) | Not rendered | HARDCODED (dead code) | Remove dead rules | High |
| cost-pricing-sheet-view.css | 1004 | `.cps-mini h6` accent bar | `border-left: 3px solid #175cd3` | Not rendered (dead CSS) | Not rendered | HARDCODED (dead code) | Remove dead rules | High |

### 4.3 Shared-component hardcoded colours

| File | Line | Element | Mechanism | Light impact | Dark impact | Classification | Recommended source | Confidence |
|---|---|---|---|---|---|---|---|---|
| FloatingDownloadButton.module.css | 12, 22, 29, 50 | FAB shadow layers | `rgba(15,23,42,0.18/0.2/0.18/0.16)` | Dark shadow | Nearly invisible on dark | HARDCODED (shared) | Shadow token; check blast radius | High |
| DocumentMoreSheet.module.css | 162 | `.pill` shadow | `rgba(15,23,42,0.04)` | Negligible | Negligible | HARDCODED (shared) | Shadow token; check blast radius | High |
| ui/sheet.tsx | 39 | Sheet scrim | `bg-black/50 dark:bg-black/70` | Black scrim | Black scrim | THEME BYPASS (shared primitive) | `--bd-overlay-scrim` exists; consider migrating | Medium |
| ui/dialog.tsx | 43 | Dialog scrim | `bg-black/50 dark:bg-black/70` | Black scrim | Black scrim | THEME BYPASS (shared primitive) | `--bd-overlay-scrim` exists; consider migrating | Medium |

## 5. Raw Tailwind Palette Inventory

No raw Tailwind palette utilities (`bg-slate-500`, `text-gray-200`, etc.) were found in any CPS View file. Searched: `CostPricingSheetViewPresentations.tsx`, `CpsConversionOptionsSheet.tsx`, `CpsActivityHistory.tsx`, `cost-pricing-sheet-view.css`, `cps-activity-history.css`, and all shared document-view components used by CPS View.

The only raw palette usage in the wider dependency surface is `bg-black/50 dark:bg-black/70` in `ui/sheet.tsx` and `ui/dialog.tsx` (shared radix primitives, app-wide blast radius).

## 6. Literal CSS Colour Inventory

All literal colours in the CPS View dependency surface:

- `cost-pricing-sheet-view.css` lines 3-24 (light token block): `#101828`, `#344054`, `#667085`, `rgba(16,24,40,.10)`, `rgba(16,24,40,.22)`, `#f2f4f7`, `#ffffff`, `#eef1f5`, `#b54708`, `rgba(181,71,8,.10)`, `#067647`, `rgba(6,118,71,.10)`, `#b42318`, `rgba(16,24,40,.07)`, `rgba(0,0,0,.28)`.
- `cost-pricing-sheet-view.css` lines 34-51 (dark token block): `#f2f4f7`, `#d0d5dd`, `#98a2b3`, `rgba(255,255,255,.12)`, `rgba(255,255,255,.24)`, `#0c111d`, `#1d2939`, `#161f2e`, `#fdb022`, `rgba(253,176,34,.13)`, `#6ce9a6`, `rgba(108,233,166,.12)`, `#f97066`, `rgba(255,255,255,.06)`, `rgba(0,0,0,.55)`.
- `cost-pricing-sheet-view.css` line 321: `#ffffff` (logo chip).
- `cost-pricing-sheet-view.css` line 915: `rgba(15,23,42,.18)` (FAB shadow).
- `cost-pricing-sheet-view.css` line 928: `rgba(12,17,29,.5)` (dead backdrop).
- `cost-pricing-sheet-view.css` lines 994-995: `#fff`, `#101828` (dead mini preview).
- `cost-pricing-sheet-view.css` line 1004: `#175cd3` (dead mini preview).
- `FloatingDownloadButton.module.css` lines 12, 22, 29, 50: `rgba(15,23,42,0.18/0.2/0.18/0.16)`.
- `DocumentMoreSheet.module.css` line 162: `rgba(15,23,42,0.04)`.
- `DocumentCustomizeCard.tsx` line 124: `['#14b8a6', '#3b82f6', '#ef4444', '#f59e0b', '#6366f1', '#111827']` — accent colour swatches. INTENTIONAL (user-facing colour-picker choices for PDF accent). Not a theme bypass.
- `src/lib/pdfDesignPreset.ts` line 115: `PDF_ACCENT_SWATCHES` — same swatch set passed by CPS. INTENTIONAL.
- `src/domain/pdf/customization/cps.ts` lines 34, 37: `#0f172a` — PDF ink default for the Forme renderer. Not a screen colour. Out of scope.

## 7. Inline Style Colour Inventory

No inline colour styles were found in any CPS View file. The only inline styles in the CPS component directory are in `CostPricingSheetEditor.tsx` (CPS New/Edit — out of scope) and use CSS variables (`var(--sub)`, `var(--red)`, `var(--faint)`), not literals.

`FloatingDownloadButton.tsx` line 10 uses `style={{ width, height, fill: 'currentColor' }}` — `currentColor`, not a literal.

`CpsConversionOptionsSheet.tsx` line 219 uses an inline style for `paddingBottom` only — not a colour.

`DocumentCustomizeCard.tsx` lines 257, 322 use `style={{ backgroundColor: swatch }}` — dynamic swatch values for the colour picker. Intentional.

## 8. SVG/Icon Colour Inventory

- `FloatingDownloadButton.tsx` — inline SVG with `fill: 'currentColor'`. Inherits button colour. Correct.
- `cost-pricing-sheet-view.css` lines 918-922 — `.cps-fab-slot button svg { color: currentColor; fill: currentColor; }`. Correct.
- All lucide icons in CPS View (`ArrowLeft`, `Share2`, `Palette`, `MoreHorizontal`, `FileOutput`, `Pencil`, `Download`, `Package`, `Zap`, `Copy`, `Archive`, `Trash2`, `History`, `ChevronDown`, `RefreshCw`, `Image`, `X`, `Plus`) inherit colour from parent via `currentColor` or parent `color`. No literal icon colours found.
- `CpsActivityHistory.tsx` line 121 — inline style `transform` on chevron. Not a colour.

## 9. Local CSS-Variable Inventory and Traced Source

| Variable | Defined at | Resolves to | Classification |
|---|---|---|---|
| `--ink` | cost-pricing-sheet-view.css:3, 34 | `#101828` / `#f2f4f7` | HARDCODED |
| `--body` | cost-pricing-sheet-view.css:4, 35 | `#344054` / `#d0d5dd` | HARDCODED |
| `--faint` | cost-pricing-sheet-view.css:5, 36 | `#667085` / `#98a2b3` | HARDCODED |
| `--line` | cost-pricing-sheet-view.css:6, 37 | `rgba(16,24,40,.10)` / `rgba(255,255,255,.12)` | HARDCODED |
| `--line-strong` | cost-pricing-sheet-view.css:7, 38 | `rgba(16,24,40,.22)` / `rgba(255,255,255,.24)` | HARDCODED |
| `--bg` | cost-pricing-sheet-view.css:8, 39 | `#f2f4f7` / `#0c111d` | HARDCODED |
| `--card` | cost-pricing-sheet-view.css:9, 40 | `#ffffff` / `#1d2939` | HARDCODED |
| `--soft` | cost-pricing-sheet-view.css:10, 41 | `#eef1f5` / `#161f2e` | HARDCODED |
| `--brand` | cost-pricing-sheet-view.css:11, 42 | `hsl(var(--bd-button-primary-bg))` | SEMANTIC ALIAS |
| `--brand-ink` | cost-pricing-sheet-view.css:12, 43 | `hsl(var(--bd-button-primary-text))` | SEMANTIC ALIAS |
| `--brand-soft` | cost-pricing-sheet-view.css:13, 44 | `hsl(var(--bd-button-primary-bg) / .08)` / `.12` | SEMANTIC ALIAS |
| `--action-soft` | cost-pricing-sheet-view.css:14 | `hsl(var(--bd-surface-action))` | SEMANTIC ALIAS |
| `--action-soft-border` | cost-pricing-sheet-view.css:15 | `hsl(var(--bd-surface-action-border))` | SEMANTIC ALIAS |
| `--action-soft-text` | cost-pricing-sheet-view.css:16 | `hsl(var(--bd-action-icon-bg))` | SEMANTIC ALIAS |
| `--cost` | cost-pricing-sheet-view.css:18, 45 | `#b54708` / `#fdb022` | HARDCODED |
| `--cost-soft` | cost-pricing-sheet-view.css:19, 46 | `rgba(181,71,8,.10)` / `rgba(253,176,34,.13)` | HARDCODED |
| `--sell` | cost-pricing-sheet-view.css:20, 47 | `#067647` / `#6ce9a6` | HARDCODED |
| `--sell-soft` | cost-pricing-sheet-view.css:21, 48 | `rgba(6,118,71,.10)` / `rgba(108,233,166,.12)` | HARDCODED |
| `--danger` | cost-pricing-sheet-view.css:22, 49 | `#b42318` / `#f97066` | HARDCODED |
| `--ghost` | cost-pricing-sheet-view.css:23, 50 | `rgba(16,24,40,.07)` / `rgba(255,255,255,.06)` | HARDCODED |
| `--shadow-sheet` | cost-pricing-sheet-view.css:24, 51 | `rgba(0,0,0,.28)` / `rgba(0,0,0,.55)` | HARDCODED |
| `--mono` | cost-pricing-sheet-view.css:17 | Font stack | Not a colour |
| `--cps-content-inset` | cost-pricing-sheet-view.css:2 | Spacing | Not a colour |

`cps-activity-history.css` consumes the CPS tokens (`var(--card)`, `var(--line)`, `var(--ink)`, `var(--body)`, `var(--faint)`, `var(--soft)`, `var(--brand)`, `var(--brand-soft)`, `var(--danger)`, `var(--line-strong)`). It adds no new literals. It inherits the CPS token system.

## 10. Theme-Bypass Findings

1. **Core surface palette bypasses semantic authority.** The `.cps-view` token block (cost-pricing-sheet-view.css:1-52) defines 14 hardcoded light literals and 14 hardcoded dark literals for page background, cards, text, borders, and status colours. These do not resolve to `--bd-*` tokens. If the global theme changes, CPS View will not follow.
2. **Status colours use private literals, not status tokens.** `--cost`, `--sell`, `--danger` are hardcoded. Global equivalents exist: `--bd-status-warning-text`, `--bd-status-success-text`, `--bd-status-danger-text`.
3. **Logo chip background is hardcoded white in both modes** (line 321). No dark override.
4. **FAB shadow uses a hardcoded dark colour** (line 915). No dark override.
5. **Shared primitives use raw black scrims** (`bg-black/50 dark:bg-black/70` in ui/sheet.tsx:39, ui/dialog.tsx:43). A semantic scrim token exists (`--bd-overlay-scrim`) but is not used here. App-wide blast radius.
6. **Dead CSS contains light-only literals** (`.cps-mini` `#fff`/`#101828`/`#175cd3`, `.cps-sheet-backdrop` `rgba(12,17,29,.5)`). No production impact today. Would break in dark mode if revived.

## 11. Correct Semantic Usages That Must NOT Be Changed

1. `--brand`, `--brand-ink`, `--brand-soft`, `--action-soft`, `--action-soft-border`, `--action-soft-text` — alias global `--bd-*` tokens. Correct.
2. Template picker buttons in `CpsCustomizeSheet` (CostPricingSheetViewPresentations.tsx:422-429) — `border-bd-accent bg-bd-accent/10`, `border-bd-border bg-bd-card-bg`, `text-bd-text`, `text-bd-muted`. Correct.
3. `CpsConversionOptionsSheet.tsx` — all `bd-*` semantic utilities. No literals. Correct.
4. `DocumentConfirmDialog.tsx` — cancel/confirm button classes use `bd-border`, `bd-surface`, `bd-text`, `bd-status-danger-*`, `bd-button-primary-*`. Correct.
5. `DocumentModal.tsx` — `bd-border`, `bd-card-bg`, `bd-text`, `bd-surface-muted`. Correct.
6. `DocumentSheet.tsx` — `bd-border`, `bd-card-bg`, `bd-text`, `bd-text-muted`, `bd-surface-muted`. Correct.
7. `DocumentCustomizeCard.tsx` — all `bd-*` utilities. Correct.
8. `DocumentMoreSheet.module.css` — all `hsl(var(--bd-*))`. Correct.
9. `ViewCps.tsx` loading state — `text-bd-text-muted`. Correct.
10. `Layout.tsx` — all `bd-*` utilities. Correct.
11. `PDF_ACCENT_SWATCHES` and the `DocumentCustomizeCard` fallback swatch array — intentional colour-picker choices. Correct.
12. `src/domain/pdf/customization/cps.ts` `#0f172a` — PDF ink default, not a screen colour. Correct.
13. `CpsActivityHistory` + `cps-activity-history.css` — consistent use of the CPS local token system. Correct within that system.
14. `FloatingDownloadButton.module.css` background/border/colour — `hsl(var(--bd-fab-bg))`, `hsl(var(--bd-fab-text))`. Correct.

## 12. Shared-Component Findings

| Component | CPS View-only or shared | Finding | Blast radius |
|---|---|---|---|
| cost-pricing-sheet-view.css token block | CPS View only | 28 hardcoded literals | CPS View (desktop + mobile/fold) |
| `.cps-brandlogo` #ffffff | CPS View only | Hardcoded white | CPS View |
| `.cps-fab-slot` shadow | CPS View only | Hardcoded shadow | CPS View mobile/fold |
| Dead `.cps-tz-*`, `.cps-view-sheet`, `.cps-sheet-backdrop` | CPS View only (`.cps-sheet-head` also used by CPS Edit) | Dead code with literals | None today |
| FloatingDownloadButton.module.css shadows | Shared | Hardcoded `rgba(15,23,42,...)` | All document View pages using FloatingDownloadButton |
| DocumentMoreSheet.module.css pill shadow | Shared | Hardcoded `rgba(15,23,42,0.04)` | All document View pages |
| ui/sheet.tsx, ui/dialog.tsx scrims | Shared app-wide | `bg-black/50 dark:bg-black/70` | Entire application |

Recommendation: do not change shared components from this audit. Any shared-component fix needs its own blast-radius analysis.

## 13. Mobile/Fold/Desktop Differences

- Desktop: `.cps-view-topbar`, two-column `.cps-view-room` grid with 360px rail, `.cps-doc` card with border and radius, `.cps-entry` grid layout, no FAB.
- Mobile/Fold: `.cps-view-appbar`, single-column `.cps-view-wrap` (max-width 600px), borderless `.cps-doc`, transparent `.cps-dossier`, two-column `.cps-summary` grid, `.cps-fab-slot` FAB visible, `.cps-comm` becomes block with dashed top border.
- Colours: both viewports use the same `.cps-view` token set. No viewport-specific colour overrides exist. The only viewport-dependent colour behaviour is the FAB shadow (same value both viewports; visible only on mobile/fold).
- The `.cps-view-wrap .cps-doc-actions` bar uses `background: var(--bg); border-bottom: 1px solid var(--line)` — semantic via local tokens.

## 14. Light/Dark Differences

- Every `.cps-view` token has a dark override. Dark mode is complete.
- Light-to-dark shifts: page bg `#f2f4f7` to `#0c111d`; card `#ffffff` to `#1d2939`; text `#101828` to `#f2f4f7`; muted `#667085` to `#98a2b3`; borders `rgba(16,24,40,.10)` to `rgba(255,255,255,.12)`; cost `#b54708` to `#fdb022`; sell `#067647` to `#6ce9a6`; danger `#b42318` to `#f97066`.
- No light colour remains active in dark mode except `.cps-brandlogo` background `#ffffff` (intentional-looking, no dark override).
- No dark colour remains active in light mode.
- Contrast: light-mode muted text `#667085` on white is ~4.6:1 (acceptable for 12px semibold metadata). Dark-mode muted `#98a2b3` on `#0c111d` is ~7:1 (good). Status badges use tinted backgrounds with matching text — acceptable in both modes.
- The FAB shadow `rgba(15,23,42,.18)` is nearly invisible in dark mode. Low visual impact.
- Dead `.cps-mini` literals (`#fff`, `#101828`, `#175cd3`) are light-only. No production impact.

## 15. Prioritized Remediation Plan

### P0 — clearly broken theme/contrast or unreadable state

None found. Dark mode is complete. No unreadable states.

### P1 — hardcoded colour bypassing semantic theme authority

1. Re-point the `.cps-view` core token block (cost-pricing-sheet-view.css:3-24, 34-51) to `--bd-*` semantic tokens, OR formally adopt the CPS token set as an approved theme extension in `formTheme.css`/`index.css` so it becomes part of the theme authority. Mapping: `--bg` to `--bd-app-bg`, `--card` to `--bd-card-bg`, `--soft` to `--bd-surface-muted`, `--ink` to `--bd-text`, `--body` to `--bd-text`, `--faint` to `--bd-text-muted`, `--line` to `--bd-border`, `--line-strong` to `--bd-border-strong`, `--sell` to `--bd-status-success-text`, `--sell-soft` to `--bd-status-success-bg`, `--cost` to `--bd-status-warning-text`, `--cost-soft` to `--bd-status-warning-bg`, `--danger` to `--bd-status-danger-text`, `--ghost` to `--bd-surface-muted`. The cost/sell/danger roles are genuine CPS domain roles — dedicated aliases are acceptable if they resolve through the global theme.

### P2 — consistency/design-system cleanup

2. Fix `.cps-brandlogo` background `#ffffff` (line 321) — use `var(--card)` or a dedicated logo-chip token.
3. Fix `.cps-fab-slot button` shadow `rgba(15,23,42,.18)` (line 915) — use a shadow token or remove the layer.
4. Remove dead CSS: `.cps-sheet-backdrop` (924-929), `.cps-view-sheet` (930-950), `.cps-tz-*` (963-1047). These contain hardcoded literals (`#fff`, `#101828`, `#175cd3`, `rgba(12,17,29,.5)`) with no dark coverage.

### P3 — optional refinement

5. FloatingDownloadButton.module.css shadow layers (shared — needs blast-radius check).
6. DocumentMoreSheet.module.css `.pill` shadow (shared — needs blast-radius check).
7. ui/sheet.tsx and ui/dialog.tsx scrims (shared app-wide — consider `--bd-overlay-scrim`).

Do not execute this plan. It is the recommended scope for a separate remediation task.

## 16. Exact Recommended Scope for the Future Fix Task

**In scope:**

- `src/components/cps/cost-pricing-sheet-view.css` only:
  - Re-point or formally tokenize the `.cps-view` light token block (lines 3-24) and dark token block (lines 34-51).
  - Fix `.cps-brandlogo` background (line 321).
  - Fix `.cps-fab-slot button` shadow (line 915).
  - Remove dead rules: `.cps-sheet-backdrop`, `.cps-view-sheet`, `.cps-sheet-head` (view-only usage), `.cps-tz-sec`, `.cps-tz-rail`, `.cps-tz-card`, `.cps-mini`, `.cps-tz-fonts`, `.cps-tz-swatches`, `.cps-tz-font`, `.cps-tz-sw` (lines 924-1047).

**Out of scope for the fix task (already correct):**

- All shared document-view components (DocumentConfirmDialog, DocumentModal, DocumentSheet, DocumentCustomizeCard, DocumentMoreSheet, FloatingDownloadButton).
- CpsConversionOptionsSheet, CpsActivityHistory, cps-activity-history.css.
- Template picker buttons, PDF accent swatches.
- Layout.tsx, ViewCps.tsx, view-cps-actions.ts.

**Separate task required for:**

- FloatingDownloadButton.module.css, DocumentMoreSheet.module.css, ui/sheet.tsx, ui/dialog.tsx (shared components with app-wide blast radius).

## 17. Explicit Out-of-Scope Findings

- **CPS New/Edit** (`CostPricingSheetForm.tsx`, `cost-pricing-sheet-form.css`, `CostPricingSheetEditor.tsx`) — has its own private token system with hardcoded colours (e.g., `--ink: #0f172a`, `--accent: #1e3a5f`, `--group-spine: #1e3a5f`, `--red: #dc2626`). Not audited per task constraints. Flagged for a future audit.
- **PDF/Forme rendering** — out of scope per task. `src/domain/pdf/customization/cps.ts` `#0f172a` is a PDF ink default.
- **Pre-existing uncommitted changes** in the working tree (another agent's audit-foundation work) — not touched.
- **Alpha-modifier uncertainty** — the codebase defines `bd-*` colours as `hsl(var(--bd-*))` without the `<alpha-value>` placeholder. Utilities like `bg-bd-accent/10`, `bg-bd-button-primary-bg/10`, `ring-bd-text/20` may not apply the intended alpha in Tailwind 3.4. This is a functional question, not a colour-source question. The remediation task should verify whether these resolve as intended.

## Search Evidence

Patterns searched (ripgrep):

- `#[0-9a-fA-F]{3,8}\b` — hex literals — in `src/components/cps`, `src/components/document-view/shared`, `src/components/ui`, `src/components/Layout.tsx`.
- `rgba?\(` — rgb/rgba — in `cost-pricing-sheet-view.css`, `src/components/document-view/shared`, `src/components/ui/sheet.tsx`, `src/components/ui/dialog.tsx`.
- `oklch|hsla?\(` — oklch/hsl — in all CPS View files; `hsl(var(--bd-*))` usage confirmed in `cost-pricing-sheet-view.css` (35 occurrences), `formTheme.css`, `index.css`.
- `(bg|text|border|ring|shadow|fill|stroke)-\[#[0-9a-fA-F]` — Tailwind arbitrary colour syntax — in `src/components/cps`, `src/components/document-view/shared`. No matches.
- `(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]` — raw Tailwind palette families — in `CostPricingSheetViewPresentations.tsx`, `CpsConversionOptionsSheet.tsx`. No matches.
- `style=\{\{[^}]*(color|Color|background|border)` — inline colour styles — in `src/components/cps`. Only `CostPricingSheetEditor.tsx` (out of scope); uses variables, not literals.
- SVG `fill`/`stroke` — read `FloatingDownloadButton.tsx`, `cost-pricing-sheet-view.css` FAB rules directly. `currentColor` only.
- CSS custom properties — read `cost-pricing-sheet-view.css:1-52`, `cps-activity-history.css`, `formTheme.css`, `index.css` token blocks directly.
- `dark:` — dark variants — in `src/components/cps`. Only `cost-pricing-sheet-form.css` (out of scope). CPS View uses `.dark .cps-view` scoping instead. Also checked `ui/sheet.tsx:39` and `ui/dialog.tsx:43` directly (`bg-black/50 dark:bg-black/70`).
- CSS imports — `rg "import.*\.css"` across the CPS View chain. All stylesheets accounted for.

## Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

## Verification

- bun run audit:load: not run (audit-only task)
- bun run typecheck: not run (audit-only task)
- git status: see below
- supabase db push: not applicable
- bun run build: skipped due to hardware policy

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- The audit is static. It did not render the page in a browser. Contrast ratios are approximate.
- The alpha-modifier behaviour of `bd-*` utilities in Tailwind 3.4 is unverified (see section 17).
- CPS New/Edit has a separate private token system that was not audited.

## Deferred work

- CPS New/Edit colour audit.
- Shared-component shadow/scrim cleanup (needs blast-radius analysis).
- Alpha-modifier verification for `bd-*` utilities.
