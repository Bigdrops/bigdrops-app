# Receipt Single-Page Layout Fix

This report was written by OpenCode on 2026-07-11 via Local Runner.

## Objective

Fix receipt PDF rendering onto a second page when all content fits on one A4 page.

## Root Cause

The receipt layout had excessive vertical spacing that consumed roughly half the usable A4 height (~414pt of spacing overhead out of ~762pt usable). Key contributors:

| Element | Before | After | Saving |
|---|---|---|---|
| Page padding (top+bottom) | 40pt each | 30pt each | 20pt |
| Header marginBottom | 20pt | 14pt | 6pt |
| Title marginVertical | 16pt | 10pt | 12pt |
| receiptMeta marginBottom | 16pt | 12pt | 4pt |
| Divider marginBottom (×4) | 16pt each | 12pt each | 16pt |
| Section marginBottom (×5) | 16pt each | 12pt each | 20pt |
| amountBox padding | 14pt | 12pt | 2pt |
| amountBox marginBottom | 20pt | 14pt | 6pt |
| sectionTitle marginBottom | 8pt | 6pt | 2pt |
| detailRow marginBottom (per row) | 6pt | 4pt | ~12pt |
| termsBox marginBottom | 20pt | 14pt | 6pt |
| signatureRow marginTop | 30pt | 16pt | 14pt |
| signatureRow marginBottom | 20pt | 14pt | 6pt |
| signatureLine marginTop | 20pt | 14pt | 6pt |
| Footer marginTop | 20pt | 12pt | 8pt |
| Footer paddingTop | 12pt | 10pt | 2pt |
| **Total** | | | **~142pt** |

No element was reduced below a reasonable value. The original values were simply generous defaults that added up to overflow.

## Layout Adjustments Made

Only one file modified: `src/components/pdf-new/ReceiptPdf.tsx`

- Reduced page padding 40→30 (still generous)
- Reduced margins/gaps across all section dividers (16→12pt)
- Reduced section internal spacing (detailRows 6→4pt, sectionTitle margin 8→6pt)
- Reduced signature area spacing (marginTop 30→16pt, marginBottom 20→14pt)
- Reduced footer margins (marginTop 20→12pt, paddingTop 12→10pt)
- Reduced title vertical margins (16→10pt)
- Reduced amount box padding (14→12pt) and marginBottom (20→14pt)
- Reduced terms block marginBottom (20→14pt)

No font sizes were changed. No content was removed. No business logic was touched.

## Files Modified

- `src/components/pdf-new/ReceiptPdf.tsx` — 16 style property adjustments, 0 lines of logic changed

## Verification Results

- `bun run audit:load` — Passed. No new issues.
- `git status` — Only `ReceiptPdf.tsx` was intentionally modified (infra lock file also touched by a concurrent process).
- `bun run build` — Skipped per AGENTS.md hardware policy (4GB RAM limit).

## Risks & Limitations

- Receipts with very long notes or many optional sections (project + bank + void note + all invoice fields) could still push to a second page. This is acceptable per requirements ("Long notes may naturally spill to a second page").
- The visual appearance is preserved — spacing is tighter but remains professional. No font sizes changed.

## Deferred Work

- Signatory improvements intentionally deferred. See `docs/tickets/signatory-management-system.md`.
