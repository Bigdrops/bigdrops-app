# BOQ View Page Candidates V3 Report

This report was written by Longcat on 2026-09-29 via OpenCode Local Runner.

## Objective

Create clean-sheet BOQ View Page design direction V3 as two separate files, structurally distinct from V2, with bottom-nav simulation, standard-compliant FAB, download, logo footprint, and item photos.

## Scope

Two new standalone HTML files. No production code changed. No database change. V1, V2, BOQ V12, and the Invoice implementation stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v3.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v3.html` (new)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Standards audited

- `docs/standard/fab-standard.md` v1.1 — 50x50 rounded-18 container, custom AB download icon, ambient float on a wrapper (4s, disabled under reduced motion), clearance principle with the bottom-nav offset token, mobile bottom calc(88px + safe-area), z-50, one primary FAB per view.
- `docs/standard/document-image-upload-policy.md` — upload validation only. It governs pickers, not read-only rendering.

## Bottom-navigation files inspected

- `src/components/layout/MobileBottomNav.tsx` — fixed geometry: left/right 10px, bottom max(8px, safe-area), 62px tall, 5 tabs, active pill, z-40.
- `src/components/layout/navData.ts` — BOQ lives under the sales picker, so the Sales tab is active.

## Invoice files used as behavioral reference

- `src/pages/ViewInvoice.tsx` — the view FAB triggers Download.
- `src/components/document-view/invoice/InvoiceWorkspace.tsx` — shell composition with action row and floating download slot.
- `src/components/document-view/invoice/InvoiceDocumentCard.tsx` — brand block, numbered items with sub-detail, read-only thumbnails only when an image exists, totals with words.
- `src/components/document-view/shared/DocumentPage.tsx` — floating placement above the bottom nav.
- `src/components/document-view/shared/FloatingDownloadButton.tsx` — the exact AB download icon path reused in both candidates.
- `src/components/document-view/shared/DocumentBrandBlock.tsx` — logo image or company-initials fallback block.
- `src/components/document-view/shared/DocumentMoreSheet.tsx` and `InvoiceMoreSheet.tsx` — sectioned action rows with a danger zone.
- `src/components/document-view/shared/downloadPdf.tsx` — download:start/success feedback, mirrored with two-stage toasts.
- `src/components/document-view/shared/shareDocument.ts` — generic Web Share used for Share.
- `src/components/document-view/invoice/InvoiceActionRow.tsx` — Edit plus Download pill pattern.

## V1/V2 patterns deliberately rejected

- The hero card with identity, metadata blocks, and commercial band sequence.
- Repeated read-only item cards with input-like field boxes.
- The Convert plus Edit plus Download action strip.
- Dark group envelopes as the only group treatment.
- One file covering all breakpoints.

## Core V3 information-architecture concept

Ledger schedule with persistent commercial context. The schedule is the hero. Identity is a slim masthead. Commercial numbers live in persistent chrome: a sticky bar on mobile, a sticky rail on desktop. Groups are navigational landmarks with jump navigation. Items are ledger rows. Actions are progressively disclosed.

## Why V3 differs materially from V2

- No hero card, no metadata blocks, no commercial band section, no item cards, no action strip.
- Commercial context persists during scroll instead of scrolling past.
- Groups render as light technical dividers with anchor jump chips instead of dark envelopes.
- Items render as ledger rows with a flowing commercial line instead of boxed field grids.
- Download lives on the FAB only; Edit sits inline; the rest lives in the More sheet.
- The mobile shell is simulated with real geometry instead of assumed.

## Mobile/fold action model

- Download FAB (standard v1.1) is the only floating action.
- Edit is a compact inline button in the letterhead row.
- The More sheet holds Convert, Duplicate, Copy Number, Export CSV, status toggle, Archive, and Delete.
- Share sits in the top bar. No action is duplicated across surfaces.

## Bottom-nav simulation geometry

- Fixed, left/right 10px, bottom max(8px, safe-area), 62px tall, 5 tabs with 17px icons, active Sales pill, z-40. Tabs toast their destination.

## FAB geometry and clearance

- Wrapper with 4s ambient float, button 50x50 rounded-18 primary, AB icon, fixed right 16px bottom calc(88px + safe-area), z-50. Document-end padding of 190px plus safe-area keeps the close-out readable above the nav and FAB.

## New item architecture

- Ledger rows: index, full description, em-dash specification, make and quantity meta, one commercial line with CP, SP, and right-aligned profit, thumbnail docked right when a photo exists.
- Fold splits body and commercial zones and docks the thumbnail beside the text.
- Desktop uses a dense 7-column matrix with headers, group landmark rows, and 64px end-cell thumbnails.

## Photo behavior

- One sample item carries an inline SVG placeholder thumbnail; production renders the stored imageUrl. Tap opens a read-only lightbox with caption.
- Items without photos emit zero photo markup and reserve zero space. Verified in the smoke test.

## Commercial architecture

- No summary band section. Mobile keeps numbers in the sticky bar; desktop keeps them in the sticky rail; both close with a right-aligned ledger and amount in words.
- Locked model totals: cost 6,158,090; sell 7,237,000; profit 1,078,910; margin 15%.

## Desktop architecture

- Compact sticky header with Edit, Download, Share, theme, and More. Schedule-first main column with jump chips, dense matrix, and ledger close-out. Sticky rail with company, commercial position, section navigation, and notes. No FAB, no bottom nav.

## Verification

- Static content audit: no editing controls in either candidate UI. Passed.
- DOM-shim execution: 35 checks on mobile/fold and 30 on desktop covering counts, numbering, groups, commercial tones, locked-model totals, words, status toggle, artwork, lightbox, sheets, and confirms. All passed after fixing one test-regex artifact.
- FAB standard compliance: element, placement, size, radius, background, icon size, screen-reader label, exact icon path, wrapper float, reduced-motion rule. Passed.
- Bottom-nav geometry: 5 tabs, active pill, 62px height, 10px sides, safe-area bottom. Passed.
- `git status` before and after: captured. Only the two V3 files are new. V1, V2, V12, and all production files are untouched by this task.
- `git diff --check`: passed (exit 0).
- Build, typecheck, lint, Playwright, browser automation, screenshots, Supabase commands: not run. Excluded by the task.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Static verification uses a DOM shim. It does not render pixels. A human must review the visuals, especially sticky-bar overlap, FAB clearance at 390px and 430px widths, fold item composition, and desktop density.
- The sticky commercial bar offset assumes a 55px top bar. A human must confirm no overlap at real render heights.
- Action toasts name real actions without persistence. Export CSV builds a real client-side extract.
- Sample company, vendor, and item data is fictional. The item photo is a placeholder illustration.

## Areas for human judgment

- Whether the sticky commercial bar plus FAB plus bottom nav feels crowded on narrow phones.
- Whether ledger rows scan better than V2 cards at real text sizes.
- Whether the light group dividers carry enough landmark weight in long schedules.
- Whether desktop CP/SP columns should hide behind a permission.
- Whether Approved should lock Edit and Convert.
