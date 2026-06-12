# Waybill Module — 12 Fixes Report

**Date:** 2026-06-12
**Branch:** `main`
**Commit:** `e8b2c61`

## Summary

Delivered 12 corrections to the Waybill form (`WaybillForm.tsx`) and supporting utilities to align UI behaviour, shared component reuse, and PDF output with product requirements.

## Fixes Delivered

| # | File | Change |
|---|---|---|
| 1 | `WaybillForm.tsx` | Reordered header: Type badge → Client Picker → WAYBILL NO + P.O. NUMBER row → DATE/TIME row. Replaced `h1` `[Auto-generated]` with `MobileTextField`. |
| 2 | — | Client Picker block was already correct — no change needed. |
| 3 | `WaybillForm.tsx` | Added `AttachExistingDocumentSheet` import/state and Linked Invoice section between header and transport details. |
| 4 | — | Shell chrome already absent in `NewWaybill.tsx` — no change needed. |
| 5 | `WaybillForm.tsx` | Replaced inline Notes section with `CollapseCard` + lazy-loaded `RichTextEditor` via `Suspense`, default collapsed. |
| 6 | `WaybillForm.tsx` | Changed Terms `CollapseCard` to default collapsed; upgraded from `Textarea` to lazy-loaded `RichTextEditor`. |
| 7 | — | Column visibility defaults already correct — no change needed. |
| 8 | `WaybillForm.tsx` | Locked `unit` checkbox in Table Settings (alongside `description` and `qty`). |
| 9 | — | 3 separate eye toggles already present in signatures — no change needed. |
| 10 | — | Sender/receiver signature source options already correct — no change needed. |
| 11 | `waybillUtils.ts` | Changed External Waybill PDF title from `'External Waybill'` to `'Waybill/Delivery note'` at line 181. |
| 12 | — | FAB styling confirmed: `bg-[var(--bd-primary)] text-[var(--bd-primary-foreground)]`. |

## Verification

- `bun run typecheck` — passed
- `eslint` — passed (0 errors)
- `npm audit` — 0 vulnerabilities
- All changes committed to `main` and pushed to `origin/main`

## Files Modified

- `src/components/waybill/WaybillForm.tsx` (fixes 1, 3, 5, 6, 8)
- `src/components/waybill/waybillUtils.ts` (fix 11)
