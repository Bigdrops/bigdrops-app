# Accounting Foundation + PDF Customize Unification — Handoff

> **Date:** 2026-09-06
> **Branch:** main (1 commit ahead of origin — `d25795fd`)
> **Typecheck:** clean
> **Tests:** 11/13 pass (2 pre-existing failures in untouched files)

---

## What Was Done

### 1. PDF Customize Unification (🎨 button)

Replaced per-document-type customize sheets with a single shared popup.

**Before:** Each doc type (invoice, quotation) had its own `PdfOutputCustomizeSheet` with duplicated logic.

**After:** Shared `DocumentSheet` + `DocumentCustomizeCard` — each doc type fills optional ReactNode slots.

| File | What |
|------|------|
| `src/components/document-view/shared/DocumentCustomizeCard.tsx` | Extended with optional slots: `bankAccountSelector`, `companyTagline`, `footerText`, `showOutputOptions`, `outputOptions` |
| `src/components/document-view/shared/CommercialTemplatePicker.tsx` | **New** — compact 4-column grid, 7 template buttons |
| `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` | **Deleted** — all features absorbed |
| `src/pages/ViewQuotation.tsx` | Wired to DocumentSheet + DocumentCustomizeCard |
| `src/components/document-view/invoice/InvoiceOverlays.tsx` | Wired to DocumentSheet + DocumentCustomizeCard |

**Key patterns:**
- `ResolvedPdfCustomization` uses `handwritingFont`/`handwritingColor` (NOT `inkFont`/`inkColour`)
- `PdfBankControls` takes `value`/`onChange`/`bankAccounts` (NOT `selectedBankId`/`onSelect`)
- `DocumentCustomizeCardProps` takes `customization: ResolvedPdfCustomization` as object + individual setters
- Commercial docs pass empty arrays/"auto" for handwriting-related props
- Save: `useQuotationActions.handleSaveCustomization()` / `useInvoiceActions.handleSaveCustomization()`

### 2. Accounting Foundation (Increments 1/2/3)

Full source transaction tracking pipeline.

| File | What |
|------|------|
| `src/domain/accounting/sourceTransactions.ts` | Service layer |
| `src/modules/accounting/sourceTransactionService.ts` | Integration layer |
| `supabase/migrations/20260906103000_source_transactions.sql` | DB migration + RLS |
| `src/tests/critical/sourceTransactionContract.test.js` | 32 contract tests |

### 3. Other

- `src/components/ui/carousel.tsx` — shadcn/ui embla-carousel wrapper
- `src/components/dashboard/RecentAlertsCarousel.tsx` — refactored to use Carousel
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Waterfall-roadmap.md` — updated with milestones
- `docs/reports/general/accounting-increment3-source-transactions-2026-09-06.md` — report

---

## Critical Rules (Read Before Changing Anything)

- **AGENTS.md** must be read before any code change
- **`bun run build` is FORBIDDEN** — 4GB RAM limit. Use `bun run typecheck` / `bun run lint`
- **Financial calculations** → `src/lib/Calculations.ts` (`computeDocument()`) — never duplicate
- **PDFs are renderers only** — no price/tax/VAT/discount calculations
- **Commit messages:** Gitmoji + Conventional Commits
- **Package manager:** Bun only

---

## Remaining Work

1. Push to origin when ready (`git push`)
2. Resolve `src/lib/tenant/settingsCache.ts` deletion — it's deleted in working tree but not staged. Decide whether to restore or keep deleted
3. Clean up `.claude/handoffs/` directory (created by mistake, not needed)

---

## Pre-Existing Test Failures (Do Not Fix)

In `src/tests/invoice/pdfRegressionCleanup.test.js`:
- Line 18: `invoice preview detail rows exclude duplicate title and client header entries` — tests `previewModel.ts` (not modified)
- Line 54: `advance invoice summary renders after the shared totals block` — tests `Industry.tsx` (not modified)

These are structural regression tests that check source files which were NOT touched by this work.
