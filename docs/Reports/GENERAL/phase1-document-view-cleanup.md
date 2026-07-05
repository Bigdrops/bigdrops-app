# Phase 1: Document View Subsystem Safe Consolidation

This report was written by OpenCode on 2026-07-05 via Local Runner.

## Scope

Phase 1 of the Document View subsystem cleanup — stabilization-only, zero deletions.

## Changes Executed

### 1. Token Consolidation (`--bd-brand`)
- **`src/index.css`**: Removed duplicate `--bd-brand: 225 75% 48%` from `:root`. The canonical definition lives in `formTheme.css` which is imported after `index.css` in `main.tsx` (line 24), making it the cascade-winner.
- **`src/styles/formTheme.css`**: Added `.dark` block with `--bd-brand: 235 70% 60%` and `--bd-brand-foreground: 0 0% 100%`. This is now the single source of truth for brand token in both themes.

### 2. Dark Mode FAB Visibility Fix
- **`src/components/document-view/invoice/InvoiceWorkspace.module.css`**: FAB `.fab` class changed from `hsl(var(--bd-brand))` → `hsl(var(--primary))`. The `--primary` token has proper dark mode overrides in `index.css:101` (`235 70% 60%`), ensuring adequate contrast against dark backgrounds. Icon color changed from `hsl(var(--bd-surface))` → `hsl(var(--primary-foreground))`.
- **`src/components/document-view/shared/FloatingDownloadButton.module.css`**: Same `--bd-brand` → `--primary` migration for consistent FAB styling.

### 3. Legacy Token Migration (`--dv-*` → `--bd-*`)
- **`src/components/document-view/shared/documentViewTheme.css`**: Migrated all `var(--dv-*)` references in CSS utility rules and element selectors to direct `--bd-*` token references. `--dv-*` variable declarations (lines 3-78) are preserved per Phase 1 constraints. Downstream consumers (waybill/csr/quotation module CSS files) still reference `--dv-*` — migration deferred to Phase 2.

### 4. Toggle Standardization (Radix Switch)
- **`src/components/document-view/shared/DocumentOptionsCard.tsx`**: Replaced custom `<span>` ToggleRow implementation with Radix `Switch` primitive from `@/components/ui/switch`. Removed `onClick` handler from wrapper div. Switch receives `size="sm"`, `checked`, and `onCheckedChange` props. Keyboard accessibility (Tab, Space, Enter) is provided by Radix primitives natively.

## CSS Cascade Analysis

Import order in `src/main.tsx`:
1. `./index.css` (line 23) — base Tailwind + shadcn tokens + bridge fallbacks
2. `./styles/formTheme.css` (line 24) — canonical `--bd-*` system, overrides `index.css`

`formTheme.css` is the cascade-winner for all `--bd-*` tokens. Dark mode overrides now live exclusively in `formTheme.css`.

## Verification Gate

- `bun run typecheck`: Pre-existing errors in `src/components/waybill/ThermalTemplate.tsx` (TS2339: `color` property not in style type). These are NOT introduced by this phase's changes.
- `git status`: Only target files modified. Waybill template changes are pre-existing CRLF normalization.
- No files deleted or renamed.

## Deferred to Phase 2

- Extraction of shared styles from `InvoiceWorkspace.module.css` to a new shared CSS module (cross-module style isolation)
- Full `--dv-*` variable declaration removal after downstream consumer migration
- `documentViewTheme.css` removal after full migration validation
- Removal of diagnostic console logging in `FloatingDownloadButton.tsx`
