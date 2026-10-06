# Document Form CPS-Family Presentation Corrective Report

This report was written by Codex on 2026-10-06 via Codex desktop.

## Objective

Replace the legacy Quotation, Invoice, and Waybill New/Edit presentation with the active CPS New/Edit visual and responsive language.

## Scope

Frontend layout and responsive presentation only.

## Files changed

- `src/components/UnitInput.tsx`
- `src/components/document/DocumentFormPresentation.tsx`
- `src/components/document/FormCommercialTerms.tsx`
- `src/components/document/SharedDocumentForm.tsx`
- `src/components/document/FormFooter.tsx`
- `src/components/document/FormHeader.tsx`
- `src/components/document/FormLineItems.tsx`
- `src/components/document/FormNotesTerms.tsx`
- `src/components/document/FormTotals.tsx`
- `src/components/invoice/MobileGroupCard.tsx`
- `src/components/invoice/MobileItemCard.tsx`
- `src/components/waybill/WaybillForm.tsx`
- `src/components/waybill/WaybillSignatures.tsx`

## Skills used

Skills used: using-superpowers, redesign-existing-projects, tailwind-css-patterns, vercel-composition-patterns, typescript-advanced-types, karpathy, ui-ux-pro-max

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added shared CPS-family document presentation primitives for numbered section headers and compact topbars.
- Replaced the legacy oversized Invoice and Quotation header composition with a CPS-style topbar and numbered `Document details` section.
- Replaced the old dashed client selector treatment with the CPS client selector geometry while preserving the existing picker behavior.
- Replaced legacy dot-style line-item headings with CPS numbered section heads and CPS-family toolbars.
- Reworked Invoice, Quotation, and Waybill item rows with CPS-family row rails, reorder controls, sub-description controls, photo controls, field geometry, and subtotal surfaces.
- Reworked commercial, totals, notes, Waybill custody, acknowledgement, and supporting information sections into the CPS numbered section hierarchy.
- Kept all existing state, validation, calculations, numbering, conversion, and save handlers.

## Verification result

- `bun run typecheck`: passed
- `git status`: completed
- `bun run audit:load`: not run. No schema, query, or data-layer files were intentionally changed.
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy
- Browser visual verification: attempted through Vite dev server. The protected routes redirected to the sign-in screen, so rendered comparison against CPS could not be completed in this environment.

## Supabase push status

Not applicable. No database or schema work was performed.

## Risks or limitations

- Actual rendered comparison against CPS is still blocked by the unauthenticated local session.
- Existing unrelated repository changes were present before and during this task and were not modified.

## Deferred work

- Browser screenshot review should be repeated after a valid local authenticated session is available, across 375px, 768px, 1024px, and 1440px viewports.
