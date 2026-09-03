# CSR Template Registry Correction

This report was written by OpenCode on 2026-07-13 via Local Runner.

## Objective & Scope

Correct the CSR template registry by restoring the wrongly-deleted Industry template and permanently removing Crimson (`variant '4' → 'crimson'`) and SignalBands (`variant '2' → 'signalbands'`) template entries from all registry files.

Explicitly excluded: redesign, restyling, or feature additions. Materials Used adaptive layout was investigated and found to already be handled by the shared `MaterialsSection` component in `components.tsx`.

## Evidence-Based Findings

### Files Modified

| File | Changes |
|------|---------|
| `src/components/csr/CsrTemplateCarousel.tsx` | Removed `key === '2' → 'signalbands'` mapping; changed fallback `'crimson'` → `'zinc'` |
| `src/components/csr/preview-templates/index.tsx` | Removed `SignalBandsTemplate`/`CrimsonTemplate` imports, `Template2`/`Template4` functions, and their dispatcher entries in `getCsrPdfDocument`; default template `'4'` → `'3'`; fallback `Template4` → `Template3` |
| `src/components/csr/preview-templates/layoutModel.ts` | Removed `signalbands: 5` and `crimson: 6` from `MATERIALS_MAX_ROWS_PER_COLUMN` |
| `src/tests/csr/pdfTemplateLayout.test.js` | Replaced `signalbands` test cases with `industry` |

### Files Already Clean (HEAD matched our edits)

`src/components/csr/CSRPreviewContent.js` — signalbands and crimson entries were already removed from `CSR_TEMPLATE_VARIANTS`, `CSR_TEMPLATE_OPTIONS`, and `getCsrTemplateVariant()` in HEAD.

### Files Deleted (already absent from HEAD)

- `src/components/csr/preview-templates/Crimson.tsx`
- `src/components/csr/preview-templates/SignalBands.tsx`

### Industry Template Restoration

`src/components/csr/preview-templates/IndustryCsr.tsx` was restored from commit `4e42f686^` (the commit prior to its wrongful deletion). Registry mapped it as variant key `'8'` → `'industry'` with label `"Industry"` and accent `#7D8A88`.

### Materials Used Layout Investigation

The shared `MaterialsSection` in `components.tsx` already provides adaptive layout:
- **Comma style**: single-paragraph pipe-separated text, used when `numBlocks === 0`
- **Tabulate style**: multi-column table with dynamic column splitting via `resolveMaterialColumnBlocks()`, which checks `MATERIALS_MAX_ROWS_PER_COLUMN[templateId]`

Used by Zinc (`templateId="zinc"`) and Industry (`templateId="industry"`). Minimal template has its own `renderMaterialsTable` for distinct border-based visual style — not a candidate for unification.

## Verification Gate

| Check | Status |
|-------|--------|
| `bun run typecheck` | Passed (exit 0) |
| `bun run audit:load` | Passed (no new warnings) |
| `git status` | Only intended files modified (plus pre-existing `commit-docs.ps1`) |

No remaining code references to `signalbands`, `crimson`, `Crimson`, `SignalBands`, `Template2`, or `Template4` anywhere in `src/`. The sole match is `"crimson signals"` in `src/lib/themePresets.ts:1154` — a descriptive color palette label, not a code reference.

## Risks & Limitations

- Users with existing CSRs using template `'2'` (SignalBands) or `'4'` (Crimson) will fall back to Zinc (`'3'`) when re-rendering PDFs.
- No migration script was created for existing records.
- Default template changed from `'4'` (Crimson) to `'3'` (Zinc).

## Deferred Work

- Materials Used: Minimal's inline `renderMaterialsTable` could eventually use `MaterialsSection` with a styling variant, but this is a visual design choice, not a regression.
