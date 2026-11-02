# Forme Minimal Replacement (Priority 2)

Date: 2026-11-02
Status: Complete, pending project lead review.

## Objective

Replace the former Forme Modern Minimal implementation with a faithful Forme port of the existing React Minimal template. Keep one Forme Minimal implementation only.

## Scope

In scope:

- Port React Minimal composition, typography, spacing, hierarchy, tables, totals, notes, attachments, signature, and footer.
- Preserve the commercial data contract, currency formatting, amount-in-words logic, and total calculations.
- Retire Modern Minimal from the template registry, routing, picker, normalizer, and tests.
- Verify the output with rasterized PDF pages.

Out of scope:

- Landscape redesign (Priority 3).
- Mosaic.
- Invoice, quotation, and purchase-order forms, schemas, calculations, and save workflows.
- Database schema and query changes.

## Files changed

New:

- `src/components/pdf/forme/MinimalFormeDocument.tsx`
- `src/tests/pdf/formeCommercialBatch1.test.ts`

Modified:

- `src/components/pdf/index.ts`
- `src/components/pdf/forme/fonts.ts`
- `src/domain/invoice/types.ts`
- `src/components/document-view/shared/CommercialTemplatePicker.tsx`
- `src/tests/pdf/dualIndustryRendererRouting.test.ts`
- `src/tests/pdf/templateIds.test.js`
- `src/tests/pdf/formeIndustryTemplate.test.ts`
- `src/tests/invoice/pdfRegressionCleanup.test.js`

Deleted:

- `src/components/pdf/forme/ModernMinimalFormeDocument.tsx` (obsolete untracked implementation)

Unrelated working-tree changes were left unchanged.

## Skills used

- `pdf-rendering-correctness`
- `react-pdf`
- `qa-test-planner`
- `verification-before-completion`

## Documentation standard

ASD-STE100 Simplified Technical English.

## Changes made

### Renderer

- Added `MinimalFormeDocument` with the React Minimal palette, Helvetica base type, 22pt title, party boxes, reference strip, table, group headers and subtotals, bank details, totals, notes, terms, attachments, signature, and fixed footer.
- Reproduced the React column layout rule: a positive fixed width wins; other columns share the remaining width by flex weight.
- Linked attachments and table images correctly by nesting `Link` inside `Text`.
- Kept the reference footer at 16pt from the page edge. Forme anchors fixed footers to the content margin, so the footer uses a 31pt translate and a 54pt content margin. The 54pt margin gives Forme the extra 6pt it needs to keep a group subtotal with its rows. Page counts do not change.
- Removed the old Modern Minimal renderer.

### Routing and selection

- `resolveCommercialPdfRoute` sends `minimal` and retired `modern-minimal` to `minimal-forme`.
- The React-PDF branch no longer imports the React Minimal module.
- `normalizeInvoicePdfTemplateId` maps saved `modern-minimal` values to `minimal`.
- The template picker keeps the existing `minimal` option and label. No new user-facing option was added.

### Tests

- Added coverage for Minimal serialization, portrait geometry, repeated table headers, and missing optional data.
- Removed Modern Minimal from expected template IDs.
- Updated cleanup assertions to check that React Minimal is no longer imported and Minimal uses the Forme renderer.

## Verification result

Commands:

```bash
bun test src/tests/pdf/formeCommercialBatch1.test.ts \
  src/tests/pdf/dualIndustryRendererRouting.test.ts \
  src/tests/pdf/templateIds.test.js \
  src/tests/pdf/formeIndustryTemplate.test.ts \
  src/tests/invoice/pdfRegressionCleanup.test.js
```

Result: 32 passed, 0 failed.

Targeted lint:

```bash
bunx eslint src/components/pdf/forme/MinimalFormeDocument.tsx \
  src/components/document-view/shared/CommercialTemplatePicker.tsx
```

Result: no errors. The targeted test files have existing `no-explicit-any` errors that this change did not add.

The build was not run, per project policy.

### Raster evidence

Reference React Minimal:

- `artifacts/minimal-forme/react-minimal-page1.png`
- `artifacts/minimal-forme/react-minimal-page2.png`

Forme Minimal, 9 line items:

- `artifacts/minimal-forme/forme-minimal-page1.png`
- `artifacts/minimal-forme/forme-minimal-page2.png`

Forme Minimal, 32 line items:

- `artifacts/minimal-forme/forme-minimal-long-page1.png`
- `artifacts/minimal-forme/forme-minimal-long-page2.png`
- `artifacts/minimal-forme/forme-minimal-long-page3.png`
- `artifacts/minimal-forme/forme-minimal-long-page4.png`

Forme Minimal, missing optional data:

- `artifacts/minimal-forme/forme-minimal-missing-page1.png`

PDF source files are in the same folder.

### Geometry checks

- Table header: React 331.0pt, Forme 332.0pt.
- Group A header: React 352.0pt, Forme 354.0pt.
- Group B header: React 554.0pt, Forme 555.0pt.
- Group B subtotal: React 733.0pt, Forme 732.0pt.
- Footer page line: React 816.0pt, Forme 816.0pt.

Page count for the 9-item sample: React 2, Forme 2.
Page count for the 32-item sample: React 4, Forme 4.
Page count for the missing-data sample: Forme 1.

Raster review confirmed:

- Correct totals, VAT, amount in words, and balance due.
- Correct repeated table header on continuation pages.
- Group subtotals stay with their group rows.
- Missing company, client, bank, totals, notes, terms, attachments, and signature data render no empty sections.
- Footer is aligned with the reference position.

## Supabase push status

Not applicable. No database schema, query, or data-layer change.

## Risks and limitations

- Forme keeps a group header with its first row. When a group starts near a page break, the header moves to the next page. The reference can leave a group header alone at the bottom of a page. The Forme result is coherent; it is an engine pagination difference, not missing content.
- The 54pt content margin and the 31pt footer translate compensate for Forme fixed-footer anchoring. A future Forme version can change this behavior. Re-check the footer position after an engine upgrade.

## Deferred work

- Priority 3 Landscape redesign. Not started.
- Mosaic. Not started.
