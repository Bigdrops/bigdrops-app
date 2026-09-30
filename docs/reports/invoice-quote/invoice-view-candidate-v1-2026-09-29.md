# Invoice View Page Candidates V1 Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Create Invoice View Page design-direction candidates that inherit
the accepted BOQ V4.1 visual language while deriving all content
and behavior from the live production Invoice View Page.

## Scope

Two new standalone HTML files plus this report. No production code
changed. No database change. BOQ candidates untouched except the
separately reported V4.1 refinement.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/invoice/invoice-view-candidate-mobile-fold-v1.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/invoice/invoice-view-candidate-desktop-v1.html` (new)
- `docs/reports/invoice-quote/invoice-view-candidate-v1-2026-09-29.md` (new, this file)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Standards audited

- `AGENTS.md` — Bun only, no build as verification,
  concurrent-agent safety, locked math, report rules.
- `docs/standard/fab-standard.md` v1.1 — container, AB Download
  Manager icon, wrapper float, clearance, z-50, one FAB per view.
- `docs/standard/document-image-upload-policy.md` — upload
  validation only; read-only thumbnails unaffected.
- `docs/standard/document-transformation-standard.md` —
  lifecycle actions stay sheet-level.

## Production audit (behavioral authority)

- `src/pages/ViewInvoice.tsx` — shell wiring, FAB triggers
  Download, Edit route, advance-child quarantine.
- `src/components/document-view/invoice/InvoiceWorkspace.tsx` —
  top nav, action row (Record Payment unless paid, Edit,
  Download), document card, bank card, options card, operational
  sections, floating download.
- `InvoiceDocumentCard.tsx` — brand fallback, status pill, title,
  meta chips (number, issue, due, PO), client block, GROUP rows,
  GROUP_FOOTER optional subtotals, numbered lines with detail and
  fact pills, read-only imageUrl thumbnails, right-aligned
  amounts, totals with grand emphasis, amount in words, signatory
  with signature-or-fallback.
- `InvoiceMoreSheet.tsx` — Lifecycle (Revert to Quotation,
  Generate Waybill), Payments & Advances (Record Payment, Advance
  Invoice), Common (Link to Project, Duplicate, Copy Invoice
  Number, Export CSV, Qty+Unit merge), Danger Zone (Archive,
  Delete).
- `InvoicePaymentsSection.tsx` — Cash Received, WHT Applied,
  % settled progress, balance remaining, history entries with
  payment/wht/voided kinds.
- `InvoiceRecordPaymentSheet.tsx` — payment capture with receipt
  outcome (represented as a demo sheet; no persistence).
- `src/domain/invoice/calculations.ts` — pipeline shape:
  subtotal, extra charges, discount timing, VAT, grand total, WHT
  base, total payable.
- `financialState.ts` + `resolveInvoiceStatus.ts` — derived
  Unpaid / Partially Paid / Paid, OVERDUE presentation-only.
- `previewModel.ts` + `renderTypes.ts` — preview rows, group and
  group_footer types, line imageUrl, bank projection, signatory.
- `invoiceViewMockData.ts` — reference sample content and tone.

## Synthesis (what transferred, what did not)

Transferred from BOQ V4.1: flowing document surface, dossier
identity, static summary, bounded GROUP containers with explicit
headers and subtotal closes, ungrouped lines on the open surface,
compact thumbnails with lightbox, hairline entries, signed
close-out, bottom nav, Download FAB, sectioned More sheet, dark
mode, fluid desktop shell. Translated, never transplanted:
invoice lines show Qty/Rate/Amount (no Cost/Sell/Profit tones);
groups close with "Group subtotal" (never "chapter total");
the document closes as an invoice (never "BOQ complete").
Nothing copies the live Invoice visual structure.

## Invoice content represented

Identity (INV-2026-0117, Tax Invoice, Partially Paid derived
status), brand fallback monogram, client block with PO, issue/due
dates, 4 lines in 2 groups plus 1 ungrouped line, 1 compact
thumbnail with lightbox, Subtotal / Workmanship / Transportation /
VAT 7.5% / Total Due / Received / Balance Remaining, amount in
words, bank details, notes, signatory fallback, linked quotation
and waybill, payment position with 42% progress and 2 history
entries (cash + WHT), Record Payment demo sheet, full More menu.

## Sample model verification

Verified with bun from the same inputs the scripts use: lines sum
to Subtotal ₦4,150,000; charges ₦205,000 plus VAT ₦365,000 bring
Total Due to ₦4,720,000; received ₦2,000,000 (cash ₦1,650,000 +
WHT ₦350,000); balance ₦2,720,000; settled 42%. Group S subtotal
₦3,380,000; Group I subtotal ₦650,000. All figures render from
one data array per file, so display cannot drift.

## Verification

- `git status` before and after: captured. Only intended files
  new or modified; all pre-existing changes belong to other
  agents and are untouched.
- `git diff --check`: passed (whitespace clean).
- Production Invoice files: no diff. Untouched.
- BOQ V2/V3/V4 files: no diff from this task. Untouched.
- BOQ form candidates: untouched.
- No new BOQ version created: confirmed.
- Mobile candidate has bottom nav, FAB, labeled Download, menu
  Download, thumbnail, groups plus one ungrouped line: confirmed.
- Desktop candidate is fluid, schedule-dominant, has labeled
  Download plus menu Download, no FAB: confirmed.
- No Cost/Profit semantics on invoice: confirmed (tones are
  received/balance only).
- No full-width item imagery: confirmed (64–72px thumbnails).
- Build, typecheck, lint, browser, Supabase: not run. Excluded.
  Human visual review is authoritative.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- No browser render was run. A human must judge the invoice
  rhythm, payment section weight, rail balance, and dark mode.
- Record Payment is a demo sheet with no persistence and no
  receipt issuance. Production behavior must be wired at
  implementation.
- The sample mixes grouped and ungrouped invoice lines and shows
  a partially-paid state. Other states (unpaid, paid, overdue,
  voided payments, advance invoices) are not demonstrated.
- Sample data is fictional. The equipment photo is simulated.
- Margin/precision and CP-visibility questions do not apply to
  invoice; VAT display (7.5%) follows production evidence.

## Deferred work

- Human visual acceptance against BOQ V4.1 side by side.
- Additional state demonstrations if required (paid, overdue).
- Production React implementation after acceptance.
- Real item photography replacing the simulated thumbnail.
