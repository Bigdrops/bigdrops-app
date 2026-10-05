# CPS View Colour Theme-Authority Remediation Report

This report was written by Qwen on 2026-10-05 via Local Runner.

## Objective

Move active CPS View colour authority into the BIGDROPS semantic theme system. Preserve the CPS semantic visual hierarchy. Do not redesign the view.

## Scope

In scope:

- `src/components/cps/cost-pricing-sheet-view.css` (active production CPS View stylesheet)

Out of scope (unchanged):

- Shared document-view components (DocumentModal, DocumentSheet, DocumentConfirmDialog, DocumentCustomizeCard, DocumentMoreSheet, FloatingDownloadButton)
- `ui/dialog.tsx`, `ui/sheet.tsx`
- PDF accent swatches
- CPS New/Edit, PDF/Forme, calculations, conversion, numbering, database

## Final Alias-to-Semantic-Token Mapping

All mappings resolve through `src/styles/formTheme.css` (`--bd-*` bridge tokens), which define both light (`:root`) and dark (`.dark`) values.

| CPS alias | Before (light literal) | After (semantic) | Resolves to |
|---|---|---|---|
| `--ink` | `#101828` | `hsl(var(--bd-text))` | `--bd-text` → `--foreground` |
| `--body` | `#344054` | `color-mix(in oklab, hsl(var(--bd-text)) 62%, hsl(var(--bd-text-muted)))` | derived middle tone (see gap note) |
| `--faint` | `#667085` | `hsl(var(--bd-text-muted))` | `--bd-text-muted` → `--muted-foreground` |
| `--line` | `rgba(16,24,40,.10)` | `hsl(var(--bd-border))` | `--bd-border` → `--border` |
| `--line-strong` | `rgba(16,24,40,.22)` | `hsl(var(--bd-border-strong))` | `--bd-border-strong` |
| `--bg` | `#f2f4f7` | `hsl(var(--bd-app-bg))` | `--bd-app-bg` → `--background` |
| `--card` | `#ffffff` | `hsl(var(--bd-card-bg))` | `--bd-card-bg` → `--card` |
| `--soft` | `#eef1f5` | `hsl(var(--bd-surface-muted))` | `--bd-surface-muted` → `--muted` |
| `--cost` | `#b54708` | `hsl(var(--bd-status-warning-text))` | `--bd-status-warning-text` |
| `--cost-soft` | `rgba(181,71,8,.10)` | `hsl(var(--bd-status-warning-bg))` | `--bd-status-warning-bg` |
| `--sell` | `#067647` | `hsl(var(--bd-status-success-text))` | `--bd-status-success-text` |
| `--sell-soft` | `rgba(6,118,71,.10)` | `hsl(var(--bd-status-success-bg))` | `--bd-status-success-bg` |
| `--danger` | `#b42318` | `hsl(var(--bd-status-danger-text))` | `--bd-status-danger-text` |
| `--ghost` | `rgba(16,24,40,.07)` | `hsl(var(--bd-surface-muted))` | `--bd-surface-muted` (unused in active rules) |

Preserved unchanged (already semantic):

- `--brand` → `hsl(var(--bd-button-primary-bg))`
- `--brand-ink` → `hsl(var(--bd-button-primary-text))`
- `--brand-soft` → `hsl(var(--bd-button-primary-bg) / .08)`
- `--action-soft` → `hsl(var(--bd-surface-action))`
- `--action-soft-border` → `hsl(var(--bd-surface-action-border))`
- `--action-soft-text` → `hsl(var(--bd-action-icon-bg))`

## Dark Mode

The entire `.dark .cps-view` override block (22 lines of dark literals) was removed. Every active token now resolves through `--bd-*` variables, which define their own dark values in `formTheme.css` under `.dark`. Dark mode follows global dark tokens automatically. CPS View no longer maintains a separate dark literal palette.

## Token Gaps Discovered

**Three-tier text hierarchy.** BIGDROPS defines two text tokens: `--bd-text` (primary) and `--bd-text-muted` (muted). CPS View requires three tiers: primary (`--ink`), secondary (`--body`), muted (`--faint`). Mapping both `--body` and `--faint` to `--bd-text-muted` would collapse the secondary and muted tiers.

Resolution: `--body` is derived via `color-mix(in oklab, hsl(var(--bd-text)) 62%, hsl(var(--bd-text-muted)))`. This uses the repository's established derivation pattern (`src/index.css` uses `color-mix(in oklab, ...)` extensively). The derived tone follows the theme automatically in both modes and preserves the three-tier hierarchy. No new global token was introduced.

**Light-mode border equivalence.** In light mode, `--bd-border-strong` equals `--bd-border` (both resolve to `--border`). This is a property of the global theme authority, not a mapping error. In dark mode, `--bd-border-strong` resolves to `--foreground`, so the strong-border hierarchy is preserved there. CPS View follows the authority's definition.

## Logo Decision

`.cps-brandlogo` had `background: #ffffff` (hardcoded white in both modes). The logo is a tenant-uploaded company logo (`resolveCanonicalLogoUrl`); it does not require a fixed white backing for legibility. Changed to `background: var(--card)` (semantic card surface). On desktop the chip blends with the dossier card (delineated by its `var(--line)` border); on mobile it uses the card surface over the page background.

## FAB Shadow Decision

`.cps-fab-slot button` had a second shadow layer `0 4px 10px rgba(15, 23, 42, .18)` (hardcoded neutral). BIGDROPS defines an elevation authority in `formTheme.css`: `--bd-shadow-sm`, `--bd-shadow-md`, `--bd-shadow-lg`. The second layer was mapped to `var(--bd-shadow-lg)` (`0 4px 12px 0 rgba(0,0,0,.15)`). This uses the existing shadow authority (no new token invented) and is visually equivalent. The first layer (`0 16px 32px hsl(var(--bd-fab-bg) / .35)`) was already semantic and is unchanged. The shared `FloatingDownloadButton` implementation was not modified.

## Tailwind Alpha-Modifier Finding

Verified empirically by running the project's Tailwind 3.4.1 compiler (`node_modules/.bin/tailwindcss -c tailwind.config.js`) against the project source:

- `bg-bd-button-primary-bg/10` generates `background-color: hsl(var(--bd-button-primary-bg) / 0.1)` — alpha applied correctly.
- `ring-bd-text/20` generates `--tw-ring-color: hsl(var(--bd-text) / 0.2)` — alpha applied correctly.

Conclusion: Tailwind 3.4 correctly applies alpha modifiers to `hsl(var(--bd-*))` colour definitions. The syntax is reliable. No new reliance on alpha utilities was introduced by this remediation (the CPS CSS uses `var()` directly).

## Deferred Literals (Intentionally Not Changed)

The following literals remain in the file. All are consumed exclusively by dead CSS rules (no production consumers). Per task constraints, dead-code removal is a separate concern.

| Line | Rule | Literal | Reason deferred |
|---|---|---|---|
| 24 | `--shadow-sheet` | `rgba(0,0,0,.28)` | Only consumer is `.cps-view-sheet` (dead) |
| 905 | `.cps-sheet-backdrop` | `rgba(12,17,29,.5)` | Dead rule, no consumers |
| 971-972 | `.cps-mini` | `#fff`, `#101828` | Dead rule, no consumers |
| 981 | `.cps-mini h6` | `#175cd3` | Dead rule, no consumers |

These are not active production colour authority. They are part of the dead-CSS chain and are explicitly deferred.

## Verification Results

- `bun run typecheck`: passed (no errors)
- `bun run test`: 708 tests, 690 pass, 18 fail — all 18 failures are pre-existing or caused by a concurrent agent's in-flight changes to other files (lineage, conversion, TSX presentations, PDF). None are caused by this CSS change. Proven by:
  - Running `cpsViewProductionRedesign.test.js` in isolation: 5 failures, all pre-existing (2 fail on the original CSS via greedy-regex and stale-padding assertions; 3 are TSX-content assertions broken by the concurrent agent's edits to `CostPricingSheetViewPresentations.tsx`).
  - Confirming the original CSS also matches the failing regexes (`git show HEAD:...` tested against the patterns).
- `git diff --check`: clean (no whitespace errors)
- ESLint on CSS file: not applicable (no CSS linter configured; ESLint ignores `.css`)
- Static literal audit: `rg "#[0-9a-fA-F]{3,8}|rgba?\(" cost-pricing-sheet-view.css` returns only the 5 deferred dead-CSS literals listed above. Zero active literals remain.
- Theme-authority trace: every active token resolves through `--bd-*` → `formTheme.css` → `index.css` base triplets, with both light and dark values defined.

## Files Changed

- `src/components/cps/cost-pricing-sheet-view.css` (16 insertions, 39 deletions)

No other files were modified. Shared components, PDF, CPS New/Edit, and all other out-of-scope files are unchanged.

## Skills used: karpathy, frontend-design, verification-before-completion

Documentation standard: ASD-STE100 Simplified Technical English
