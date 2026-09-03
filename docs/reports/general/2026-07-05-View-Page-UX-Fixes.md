# View Page UX Fixes

This report was written by OpenCode on 2026-07-05 via Local Runner.

## Objective

Resolve three UX issues on document View pages:
1. Missing bottom navigation on View pages
2. Client Notes textarea on CSR View page (should only appear in PDF)
3. "Related Documents" heading on Invoice View page should read "Linked Documents"

## Changes

### Issue 1 — Bottom Navigation on View Pages

**Files changed:** `src/components/document-view/shared/DocumentPage.tsx`

The `DocumentPage` component is the shared layout wrapper for all 6 document View pages (CSR, Invoice, Quotation, Waybill, Boq, RFQ). Previously it rendered a standalone layout without the `MobileBottomNav`. The `MobileBottomNav` only existed in `Layout.tsx` which wraps dashboard and list pages.

**Fix:** Added `MobileBottomNav` with routing-aware active tab detection inside `DocumentPage`. All View pages now inherit bottom navigation automatically.

- Imports: `useLocation`, `useNavigate`, `MobileBottomNav`, `getActiveTab`
- Active tab derived from `getActiveTab(location.pathname)` (maps path to home/projects/sales/clients/more)
- Tab clicks navigate to section root pages (`/invoices` for sales, `/reports` for more, etc.)
- Wrapped in `<div className="md:hidden">` to match desktop-vs-mobile behavior in Layout.tsx

**Scope:** Single file edit — every view page (ViewCSR, ViewInvoice, ViewQuotation, ViewWaybill, ViewBoq, ViewRfq) and workspace wrappers (InvoiceWorkspace) all render `DocumentPage` and now get the bottom nav.

### Issue 2 — Remove Client Notes from CSR View Page

**Files changed:** `src/pages/ViewCSR.tsx`

The CSR View page displayed a "Client Notes" textarea for entering notes that appear on the PDF. Requirement: remove the View page UI while keeping PDF generation functional.

**Fix:** Removed the `<div>` block containing the "Client Notes" label, helper text `"These notes appear on the PDF below the signature area."`, and the `<textarea>` element.

The `comments` state variable and `setComments` setter remain in the component since `comments` is still passed to `getCsrPdfDocument()` for PDF generation. The PDF `ClientNotesBlock` component is untouched.

### Issue 3 — Rename Invoice "Related Documents" to "Linked Documents"

**Files changed:** `src/components/document-view/invoice/sections/RelatedDocsCard.tsx`

The Invoice View page used "Related Documents" as the section heading. The shared `DocumentRelatedDocsSection` component already uses "Linked Documents" as its default title. The Invoice-specific card was the only outlier.

**Fix:** Changed `<span>Related Documents</span>` to `<span>Linked Documents</span>` in `RelatedDocsCard.tsx`.

The Quotation View was verified to already use "Linked Documents" and was not modified.

## Verification

- `bun run typecheck` — passes (no errors)
- `bun run audit:load` — passes (no new warnings)
- `git status` — only intended files modified:
  - `src/components/document-view/shared/DocumentPage.tsx`
  - `src/pages/ViewCSR.tsx`
  - `src/components/document-view/invoice/sections/RelatedDocsCard.tsx`

## Risks & Limitations

- **Issue 1:** The `sales` and `more` tab clicks navigate directly to `/invoices` and `/reports` respectively, rather than opening the drawer/sheet behavior from the Dashboard. This is intentional for detail views where navigating to the list page makes sense. Drawer behavior can be added if parity with Dashboard navigation is desired.
- **Issue 2:** The `comments` state on ViewCSR will remain empty (`''`) since the textarea is the only way to set it on the View page. Comments set during CSR creation/editing in `NewCSR.tsx` are unaffected.
- **Issue 3:** No side effects — strictly a label change in one component.

## Deferred Work

- None intentionally deferred.
