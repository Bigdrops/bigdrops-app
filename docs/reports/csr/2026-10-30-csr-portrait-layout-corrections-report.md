# CSR Portrait Layout Corrections Report

This report was written by Qoder on 2026-10-30 via Qoder Desktop.

## Objective

Correct three layout defects in the portrait CSR template (`csr-reference-portrait`):

1. Separate the company logo from the company name.
2. Remove the redundant Quantity label beside the quantity value.
3. Change the client address label to `Address`.

## Scope

- Portrait CSR masthead layout.
- Portrait materials quantity presentation.
- Portrait client address label.
- Focused render verification with and without a logo.

Out of scope: landscape template, PDFCN resolver, canonical CSR contract, Forme pipeline, tenant branding data, logo source data, materials distribution algorithm, pagination work, A4 geometry, sign-off layout, and Archivo Black typography.

## Files Changed

- `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx`
- `src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx`
- `src/components/pdf/pdfcn/csr/csrPortraitMaterials.tsx`
- `docs/reports/csr/2026-10-30-csr-portrait-layout-corrections-report.md`

## Skills Used

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### 1. Logo And Company Identity Separation

- The logo tile used a `margin` of 7 points. The Forme flex row did not count that margin when it placed the next item. The company name started 7 points under the tile.
- The logo now has a dedicated outer region with an explicit width of 66 points. The white tile is 52 points square and is centred in that region.
- The identity text starts after the full 66-point region. The gap between the tile and the text is 7 points.
- The tile has `overflow: hidden`. An unusually tall logo cannot leave the tile or touch the text.
- `BrandLogo` now accepts an optional height. The portrait template gives only the width (40 points). Forme calculates the height from the image aspect ratio, so the logo is not stretched.
- The landscape template still passes width and height. Its call path does not change.
- When no logo is present, the logo region is not rendered. The identity text starts at the normal left margin.

### 2. Materials Quantity Presentation

- Removed the `Quantity` label from the vertical card.
- Removed the `Quantity` label from the full-width single-column card.
- The quantity value and the unit moved to the right edge. The value and unit remain unchanged.
- The six-row distribution algorithm, item order, and card dimensions did not change.

### 3. Address Label

- Changed the client field label from `Corporate address` to `Address`.
- The value still comes from `csr.client.address` in the canonical prepared CSR contract.
- The equipment field label still uses `csr.location.label`, which is fixed to `Site / Equipment Location`.

## Verification Result

- Reference PDF: rendered `SASCSR-000004.pdf` at 2x. It reproduced the logo and name collision.
- Render with the exact reference logo:
  - The logo tile and the identity text do not overlap.
  - The full logo lockup is visible and has its natural 3:2 aspect ratio.
  - The name starts after the tile with a 7-point gap.
- Render with synthetic square, wide (3:1), and tall (1:2) logos:
  - Square: 40 by 40 points, inside the tile.
  - Wide: 40 by 13.3 points, inside the tile, aspect preserved.
  - Tall: clipped by the tile boundary, aspect preserved, no collision with text.
- Render with branding and no logo:
  - No empty tile is shown.
  - The identity text starts at the normal left margin.
- Text extraction from the rendered PDF confirms:
  - The client label is `ADDRESS`.
  - The physical location label is `Site / Equipment Location`.
  - The string `QUANTITY` does not occur.
  - Quantity values and units are present.
- Pagination matrix with a logo:
  - 4 rows: 1 page.
  - 6, 8, 13, 18, and 24 rows: 2 pages.
  - All pages: 210.0 by 297.0 mm.
- `bun test` focused suites:
  - `csrPortraitDisplayFont.test.js`: 2 pass.
  - `csrPortraitMaterials.test.js`: 3 pass.
  - `pdfcnMasterResolver.test.js`: 10 pass (includes portrait and landscape renders with and without image assets).
- `bun run typecheck`: exit code 0.
- ESLint: the template and materials files pass. `csrPdfcnUtils.tsx` reports 7 pre-existing `react-refresh/only-export-components` errors for its utility exports. This task did not add them.
- `bun run build`: not run, per the hardware policy.
- `git status`: the task changed only the three source files above and added this report. The other listed modifications and untracked files existed before this task.
- Landscape: no landscape file was edited in this task. The shared `BrandLogo` landscape call still supplies both dimensions.

## Supabase Push Status

Not applicable. No SQL, migration, or database schema changed.

## Risks Or Limitations

- A logo with an extreme tall aspect ratio is clipped at the tile edge. Normal square and horizontal logos are not clipped.
- The reference logo is a wide lockup. At the existing 40-point logo width, its wordmark is small but undistorted. The shield mark is clear.
- The long-value fixture still has the pre-existing footer overlap and capacity wrapping. This task did not change that condition.
- Pre-existing lint errors remain in `csrPdfcnUtils.tsx`.

## Deferred Work

- None for this task. A future task can enlarge the masthead if a larger brand logo is required.
