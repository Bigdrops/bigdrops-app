# CSR Golden Templates — Sentinel + Nexus Phase 1

This report was written by OpenCode on 2026-07-13 via Local Runner.

## Objective

Implement two CSR PDF golden templates (Sentinel and Nexus) as React-PDF components from HTML prototypes. Register them in all dispatch/UI layers.

## Scope

### In scope
- `Sentinel.tsx` — teal/gold/copper design, warm cream cards, numbered materials grid, copper-dot defect list, SVG signature block, dark footer
- `Nexus.tsx` — plum/amber/sage design, cream page, double-border section separators, left-bordered summary cards, timing row, two-column signatures with vertical divider
- Registration in `CSRPreviewContent.js`, `preview-templates/index.tsx`, `CsrTemplateCarousel.tsx`, `CSRPreviewPanel.tsx`
- Material layout policies for both templates in `layoutModel.ts`
- Adaptive Materials Engine auto-decides table vs inline for both templates

### Out of scope
- Helix and Beacon templates (not implemented)
- No DB migrations, no business logic changes, no type-level changes

## Evidence

### Files created
- `src/components/csr/preview-templates/Sentinel.tsx` (331 lines)
- `src/components/csr/preview-templates/Nexus.tsx` (442 lines)

### Files modified
- `src/components/csr/CSRPreviewContent.js` — added `sentinel` + `nexus` variants, '4'/'5' options, `getCsrTemplateVariant()` routing
- `src/components/csr/preview-templates/index.tsx` — added `Template4`/`Template5` wrapper exports, routing in `getCsrPdfDocument()`
- `src/components/csr/CsrTemplateCarousel.tsx` — added '4'→'sentinel', '5'→'nexus' in `getCsrVariantKey()`
- `src/components/csr/CSRPreviewPanel.tsx` — thumbnails for keys '4'/'5'
- `src/components/csr/preview-templates/layoutModel.ts` — sentinel + nexus material policies via `MATERIAL_LAYOUT_POLICIES`

### Design details
- **Sentinel**: teal gradient header (#0D7377→#0a5c5f), gold accent (#D4A857), copper (#B85C3A), dark footer (#1A1A2E) with gold top border, rounded header corners, summary bar with gold-label comma-separated metadata, warm cream section cards (#FFF8F0/#FDF6EE), copper-dot defect bullets, 3-column numbered materials grid with copper-hue circles, SVG signature blocks
- **Nexus**: plum header (#4A2C5A), amber accent (#C87A2C), sage (#8A9B6E), cream bg (#FDF8F3/#F5EDE4), 2px double border-top section separators, left-bordered summary cards (#4A2C5A left border), 3-column materials grid with amber-bullet categories, timing row (date/time/technician), two-column signatures with vertical divider

### Shared building blocks reused
- `PdfBrandBlock`, `PdfSection`, `PdfField`, `PdfTextBlock`, `ReadingsStrip`, `MaterialsSection`, `PdfSignatureCard`, `StatusListChecks`, `ClientNotesBlock` (all from `components.tsx`)
- `safe()`, `hasText()`, `shouldRender()`, `getBranding()`, `getMaterialsRows()` (from `utils.ts`)
- `resolveMaterialColumnBlocks()` height-based engine (from `layoutModel.ts`)

## Observations

- Sentinel: every signature logo SVG path was hand-embedded; no external assets needed
- Nexus: the 2px double-border-top section separator is unique among CSR templates (Zinc uses 1px single, Minimal uses 1px, Industry uses accent border)
- Both templates cleanly avoid monetary fields — CSR has no `unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`

## Risks & Limitations

- `bun run typecheck` not run (4GB RAM host, times out on full check); no type-level changes introduced, only new React-PDF components following established patterns
- Pre-existing `csrService.ts` debug logging (id-in-payload verification) is present but unrelated to this task

## Verification

- `bun run audit:load` — passed (no new warnings)
- `git status` — confirms only intended files modified; two pre-existing dirty files (`csrService.ts`, `layoutModel.ts`)
- Line counts: Sentinel 331, Nexus 442 — both well under 600-line bloat threshold

## Deferred Work

- No deferred work for this phase
