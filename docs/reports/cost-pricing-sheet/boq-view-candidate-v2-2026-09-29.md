# BOQ View Page Candidates V2 Report

This report was written by Longcat on 2026-09-29 via OpenCode Local Runner.

## Objective

Redo the incomplete BOQ View Page V1 candidate as two separate design-direction files: one mobile+fold, one desktop.

## Scope

Two new standalone HTML files. No production code changed. No database change. BOQ V12, the Invoice View Page, and all other files stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v2.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v2.html` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Standards audited

- `docs/standard/fab-standard.md` — the FAB source of truth. It defines the 50x50 rounded-18 container, the custom AB Download Manager SVG icon for download, mobile placement above the bottom nav, and the rule that the view FAB is Download.
- `docs/standard/document-image-upload-policy.md` — upload validation only. It governs pickers, not read-only rendering. No view change follows from it.

## Invoice View Page files inspected

- `src/pages/ViewInvoice.tsx` — the FAB triggers Download (`onFabClick={actions.handleDownload}`). Actions: back, share, edit, download, more.
- `src/components/document-view/invoice/InvoiceWorkspace.tsx` — shell composition: top nav, action row, document card, floating download button, overlays.
- `src/components/document-view/invoice/InvoiceDocumentCard.tsx` — brand block with logo fallback, status pill, title, meta chips, info grid, numbered items with sub-detail and fact pills, read-only thumbnails only when an image exists, totals list with grand emphasis, amount in words, signatory block.
- `src/components/document-view/shared/DocumentPage.tsx` + module CSS — page shell and floating placement above the bottom nav on mobile.
- `src/components/document-view/shared/FloatingDownloadButton.tsx` — the exact custom download icon SVG path used in both candidates.
- `src/components/document-view/shared/DocumentBrandBlock.tsx` — logo image when present, else company initials in a fixed block.
- `src/components/document-view/shared/DocumentMoreSheet.tsx` + `InvoiceMoreSheet.tsx` — sectioned action rows with icon, label, description, and a color-differentiated danger zone.
- `src/components/document-view/shared/downloadPdf.tsx` — download:start then download:success feedback. The prototypes mirror this with two-stage toasts.
- `src/components/document-view/shared/shareDocument.ts` — generic Web Share with clipboard fallback. Used for Share in both candidates.
- `src/components/document-view/invoice/InvoiceActionRow.tsx` — Edit secondary button plus Download pill. Mirrored in the mobile candidate action row.

## Behavior learned from each

- View FAB equals Download, with the custom icon and standard container.
- Company identity is a brand block with a logo-or-initials footprint.
- Item photos render read-only inside the item body, only when present.
- Secondary actions live in a sectioned More sheet with a danger zone.
- Download, share, edit, duplicate, status change, archive, and delete are the legitimate document actions. Export CSV is grounded by the BOQS export schema.

## Changes made

- Built the mobile+fold candidate: sticky top bar with back, title, share, theme, and more; full-bleed action row with Edit and Download; company brand block with initials fallback; identity hero; commercial summary band; read-only grouped schedule items; notes; formal totals with amount in words; standard-compliant Download FAB; More sheet with Document, Status, and Danger Zone sections; archive and delete confirms; read-only photo lightbox; dark mode; fold recomposition with identity/data columns and side-by-side thumbnails.
- Built the desktop candidate: sticky top bar with Edit, Download, Share, theme, and More; document header card with brand block and meta chips; commercial strip; dense schedule table with column headers and group header rows; notes and totals close; centered sheets; no FAB.
- Represented Download on mobile/fold through the standard FAB plus the action-row pill, and on desktop through the sticky top-bar Download button. All surfaces give two-stage saved-to-Downloads feedback.
- Represented the company logo as a 44px initials block on mobile and 56px on desktop, matching the production fallback footprint.
- Attached a photo thumbnail to one sample item (inline SVG placeholder; production renders the stored imageUrl). Tapping opens a read-only lightbox. Items without photos emit zero photo markup.
- Kept the locked commercial model. Sample totals: cost 5,908,090; sell 6,987,000; profit 1,078,910; margin 15%.
- Kept the status toggle interactive between Open and Approved across chips, badges, and rail labels.

## Verification

- Static audit: no form inputs, no editing controls, no add/import/clear/save controls in either candidate UI. Passed.
- DOM-shim execution of both candidate scripts: 30 checks on mobile/fold and 29 on desktop covering item and group counts, continuous numbering, commercial tones, profit bands, locked-model totals, amount in words, status toggle, artwork, lightbox, sheets, and confirms. All passed.
- FAB standard compliance check: element, fixed placement above the bottom nav, 50x50 size, 18px radius, primary background, 22px icon, screen-reader label, exact AB icon path. Passed.
- `git status` before and after: captured. The new `view/boq` V2 files are the only artifacts of this task. The BOQ V12 modification predates this task and was not touched. All src/ changes are the pre-existing demolition work.
- `git diff --check`: passed (exit 0).
- `bun run build`, typecheck, lint, Playwright, browser automation, screenshots, Supabase commands: not run. Excluded by the task. Visual review is left to the user.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Static verification executes the scripts against a DOM shim. It does not render pixels. A human must review the visual result in a browser.
- The artwork placement uses aspect-ratio crop. Its exact position varies with document height.
- Action toasts name real production actions. They perform no persistence. Export CSV builds a real client-side extract of the sample rows.
- Sample company, vendor, and item data is fictional. The item photo is a placeholder illustration.

## Deferred work

- Visual browser review of phone, fold, and desktop in light and dark modes.
- User acceptance against the BOQ V12 baseline and the Invoice View Page behavior.
- Production React implementation after design acceptance.

## Unresolved design questions

- Whether the desktop schedule table needs visible CP and SP columns for all roles, or whether cost prices should hide behind a permission.
- Whether the approved status should lock Edit and Convert actions.
- Whether the More sheet on desktop should become a dropdown menu instead of a centered dialog.
