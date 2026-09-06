# File Rename Cleanup

## Problem

Several source files use misleading or inconsistent names that violate the project's naming conventions (kebab-case for files, PascalCase for components).

## Files to Rename

### 1. `src/pages/DashboardRedesign.tsx` → `src/pages/Dashboard.tsx`

**Why:** There is no original `Dashboard.tsx` — this IS the dashboard. The "Redesign" suffix is a leftover from a past iteration and misleading to anyone reading the codebase.

**Imports to update:**
- `src/components/app/AppShell.tsx:27` — lazy import `@/pages/DashboardRedesign` → `@/pages/Dashboard`
- `src/tests/pickers/responsivePickerRegression.test.js:16` — path string

### 2. `src/components/pdf-new/` → `src/components/pdf/`

**Why:** There is no old `src/components/pdf/` directory. The "-new" suffix is a leftover from a past migration and adds noise to every import path.

**Imports to update (24 files):**
- `src/hooks/useQuotationSave.ts:14`
- `src/hooks/useInvoiceSave.ts:19`
- `src/lib/richTextPlain.ts:1`
- `src/lib/richText.tsx:2`
- `src/components/waybill/blankWaybillTemplate.tsx:10`
- `src/domain/waybill/engine/resolvers/notes.ts:1`
- `src/tests/pdf-new/table.test.js:9`
- `src/tests/pdf-new/richTextPipeline.test.js:6`
- `src/tests/pdf-new/ledgerLayout.test.js:6`
- `src/tests/pdf-new/industryLayout.test.js:6-7`
- `src/tests/pdf-new/index.test.js:4`
- `src/pages/ViewReceipt.tsx:6`
- `src/domain/quotation/previewModel.ts:3-5`
- `src/components/table-document/TableDocumentPdfDocument.tsx:3`
- `src/components/RichTextEditor.tsx:14`
- `src/components/project/ProjectDocumentPDF.tsx:2`
- `src/domain/invoice/previewModel.ts:2-3,21`
- `src/domain/invoice/projections/contentProjection.ts:1`
- `src/components/quotation/quotationFormUtils.ts:6`

### 3. `src/pages/viewWaybillActions.ts` → `src/pages/view-waybill-actions.ts`

**Why:** Inconsistent with kebab-case convention. All other `view*Actions.ts` files have the same issue — rename them all for consistency.

**Full list of action files to rename (kebab-case):**
- `src/pages/viewWaybillActions.ts` → `src/pages/view-waybill-actions.ts`
- `src/pages/viewRFQActions.ts` → `src/pages/view-rfq-actions.ts`
- `src/pages/viewQuotationActions.ts` → `src/pages/view-quotation-actions.ts`
- `src/pages/viewInvoiceActions.ts` → `src/pages/view-invoice-actions.ts`
- `src/pages/viewCSRActions.ts` → `src/pages/view-csr-actions.ts`
- `src/pages/viewBOQActions.ts` → `src/pages/view-boq-actions.ts`

**Note:** These are only imported by their corresponding `View*.tsx` files — grep for each to confirm and update.

## Execution Order

1. Rename `DashboardRedesign.tsx` → `Dashboard.tsx` + update imports
2. Rename `pdf-new/` → `pdf/` + update all 24 import paths
3. Rename `view*Actions.ts` files to kebab-case + update imports

## Verification

```bash
bun run audit:load
bun run typecheck
```

## Risk

Low. Pure renames with import path updates. No logic changes.
