# CSR Portrait Logo And Footer Reference Report

This report was written by Qoder on 2026-10-30 via Qoder Desktop.

## Objective

Redesign the portrait CSR masthead logo and footer with the quotation references:

- `docs/templates/ref-invquo/SASQUO-000428.pdf`
- `docs/templates/ref-invquo/Screenshot_2026-10-30-07-12-23-530_com.google.android.apps.docs.jpg`

The logo must be prominent. The white container must not be larger than the logo needs. The company name must stay separate and readable. The footer must follow the reference structure and must show on the first page and on continuation pages.

## Scope

- Portrait CSR masthead logo presentation.
- Portrait CSR footer.
- Focused render verification with real, square, wide, tall, and missing logos.

Out of scope: landscape template, PDFCN resolver, canonical CSR contract, Forme pipeline, tenant branding data, logo source data, A4 geometry, Archivo Black typography, materials algorithm, and sign-off layout.

## Reference Study

- Logo: the quotation shows a white logo area at the top right. The visible lockup is about 54 by 36 points (3:2). The logo has a small white margin. The area is not a large empty tile.
- Footer: a thin light-gray rule. Three muted gray zones: `Page 1 of 1` left, `SASQUO-000428` centre, `Sun & Shield Power Solutions` right. The footer sits close to the page bottom edge.
- The screen image shows the same footer structure.

## Files Changed

- `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx`
- `src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx`
- `docs/reports/csr/2026-10-30-csr-portrait-logo-footer-reference-report.md`

## Skills Used

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Before And After

### Before

- The masthead used a white cell with a fixed size of 76 by 64 points.
- The logo was capped at 56 points. A 3:2 logo showed at 56 by 37.3 points.
- The cell kept about 20 points of empty space at the sides and 27 points above and below the logo.
- The footer used 5.4-point text in two zones: company name left and `REF: number · A4 PORTRAIT` right.
- Forme omitted the footer from page 1 when the materials table wrapped.

### After

- The logo uses only a height of 46 points. Forme calculates the width from the file aspect ratio.
- The white plate has a padding of 4 points and no fixed size. It fits the logo.
- The plate has no margins. Fixed-width spacers on each side keep the name clear of the plate.
- A 3:2 logo shows at 69 by 46 points in a 77 by 54 point plate. The logo is about 23 percent wider and taller than before.
- The footer has a 0.6-point light-gray rule and three 6.6-point muted zones: page number left, CSR number centre, company name right.
- The footer is declared before the flowing table. Forme now shows it on page 1 and on all continuation pages.
- The footer uses `csr.csrNumber` and `serviceProvider.name`. It has no fixed company text.

## Code Changes

### Logo Sizing

`BrandLogo` in `csrPdfcnUtils.tsx` now has a height-only mode:

- A height-only `Image` keeps the file aspect ratio.
- Wide logos stay wide. Tall logos stay tall. Square logos stay square.
- The template gives `height={46}`. It does not give a width.
- The old `maxSize` cap is removed.

The landscape call still gives both width and height. Its geometry does not change.

### Masthead

- The white plate is an auto-width child of the flex row. It has no margins.
- An 8-point spacer is before the plate. A 10-point spacer is after the plate.
- The plate uses `alignSelf: 'center'`.
- The identity text keeps `flex: 1` and its existing padding.
- When no logo is present, the spacers and plate are not rendered. The name starts at the content edge. No empty container is shown.

### Footer

- The footer is a `Fixed position="footer"` element directly after the masthead.
- This position prevents the Forme defect that removed the footer from page 1 after a wrapping table.
- The footer uses three `flex: 1` text zones. The centre zone is centred. The right zone is right-aligned.

## Verification Result

Renders used the production portrait template, the real tenant data, and the logo extracted from the CSR PDF.

### Logo Geometry

| Logo | Image size (pt) | Plate size (pt) | Masthead height (pt) | Pages, 4 items |
| --- | --- | --- | --- | --- |
| Real 3:2 logo | 69 by 46 | 77 by 54 | 63.4 | 1 |
| Square | 46 by 46 | 54 by 54 | 63.4 | 1 |
| Tall (1:2) | 23 by 46 | 31 by 54 | 63.4 | 1 |
| Wide lockup (2.4:1) | 110.4 by 46 | 118.4 by 54 | 75.36 | 1 |
| Extreme wide file (3:1 with large internal padding) | 138 by 46 | 146 by 54 | 85.44 | 2 |

- All image sizes agree with the file aspect ratio. No image is stretched or cropped.
- The real logo is larger than the reference lockup (69 by 46 against 54 by 36).
- The plate is 4 points larger than the image on each side. The old 76 by 64 empty cell is gone.
- The name does not touch the plate or the yellow panel in any variant.
- The 2.4:1 lockup wraps the name to two lines. The contact line stays complete and readable.

### Rendered Pages Inspected

- `real-portrait-4-p1.png`: full report, 1 page, footer visible.
- `real-portrait-13-p1.png` and `real-portrait-13-p2.png`: materials on page 1, sign-off on page 2, footer on both pages.
- `square-portrait-4-p1.png`, `tall-portrait-4-p1.png`: natural aspect, no collision.
- `wide3-portrait-4-p1.png`: full wide lockup visible, 1 page.
- `wide-portrait-4-p1.png` and `-p2.png`: extreme wide case, sign-off on page 2.
- `brandnologo-portrait-4-p1.png`: no empty logo area.

### Footer Text Extraction

| Render | Page 1 | Page 2 |
| --- | --- | --- |
| 4 items | `Page 1 of 1` | not applicable |
| 6, 8, 13, 18, 24 items | `Page 1 of 2` | `Page 2 of 2` |
| Wide 2.4:1, 4 items | `Page 1 of 1` | not applicable |
| Extreme wide, 4 items | `Page 1 of 2` | `Page 2 of 2` |

- The centre zone shows `SASCSR-000004` from the CSR data.
- The right zone shows the tenant name from the data.
- A render with no branding shows `Page 1 of 1` and the CSR number only. The right zone is empty. This confirms that the footer has no fixed company text.

### Regression And Tool Checks

- Landscape: the n=4 and n=13 PDF files are byte-identical to the files from before the footer move. SHA-256 prefixes: `c150fc28...` and `d7e26592...`. No landscape file was edited in this task.
- Pagination with the real logo: 4 items = 1 page. 6, 8, 13, 18, and 24 items = 2 pages. This is the same result as before the task.
- `bun test` focused suites:
  - `csrPortraitDisplayFont.test.js`: 2 pass.
  - `csrPortraitMaterials.test.js`: 3 pass.
  - `pdfcnMasterResolver.test.js`: 10 pass.
  - Total: 15 pass, 0 fail.
- `bun run audit:load`: completed. It reports only pre-existing warnings in unrelated files.
- `bun run typecheck`: exit code 0.
- ESLint on the two changed files: `CsrPortraitReferenceTemplate.tsx` passes. `csrPdfcnUtils.tsx` reports 7 pre-existing `react-refresh/only-export-components` errors for its utility exports. This task did not add them.
- `bun run test` (the Node test runner) stopped before the tests on this machine. Node 24.14 cannot strip the parameter property in `src/lib/pdf/DefaultPdfGenerator.ts`. The same suites pass with `bun test`.
- `bun run build`: not run, per the hardware policy.

## Supabase Push Status

Not applicable. No SQL, migration, or database schema changed.

## Risks Or Limitations

- The template cannot remove white padding inside an uploaded image file. A file with large internal padding shows a small ink area, although the image box is correct. Tenants must crop their logo files.
- Forme cannot limit both width and height while it keeps the aspect ratio without the image dimensions. The template uses height only. A logo wider than about 2.5:1 makes the name wrap to two lines and grows the masthead.
- With an extreme wide logo (3:1 file), a 4-item report moves the sign-off to page 2. The realistic 2.4:1 lockup stays on 1 page.
- The identity column becomes narrower when the logo is wide. The name wraps, but it does not collide with the panel.
- Pre-existing lint errors remain in `csrPdfcnUtils.tsx`.

## Deferred Work

- Add logo intrinsic dimensions and a trimmed content box to the prepared CSR data. This would permit true maximum-width and maximum-height containment and removal of file padding.
- Reduce the sign-off block height, or reflow the last page, so an extreme wide logo cannot add a page.
