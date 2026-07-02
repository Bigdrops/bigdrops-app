# Minimal Template — Signature, Notes & Persistence Fix

## Task

Fix three bugs in the Minimal Waybill PDF template:
1. Signature layout regression causing page overflow
2. Notes rendering leaking raw HTML
3. Template persistence mismatch on reload

## Root Causes

| Bug | Root Cause |
|---|---|
| Signature overflow | Minimal used `width: '100%', height: '100%'` for signature image — expands infinitely, pushing content to page 2. Classic used fixed `width: 110, height: 42`. |
| HTML in notes | `notes` field contains HTML tags (`<p>`, `<br>`) but Minimal renders it raw via `Text`. Classic uses `richTextToPlainText()` to sanitize. |
| Template persistence | `buildWaybillCustomFields()` returned `pdfCustomFields` spread but omitted `pdfTemplateId`, so the template selection was lost on reload. |

## Key Design Decisions

1. **Applied Classic containment strategy** — Signature image in Minimal now uses fixed `width: 110, height: 42` matching Classic's approach to prevent page overflow.

2. **Reused existing utility** — Imported `richTextToPlainText` from `@/components/pdf-new/core/richText` for HTML sanitization (matches Invoice PDF approach).

3. **Fixed persistence at merge layer** — Added `pdfTemplateId` to `buildWaybillCustomFields()` return object, ensuring template selection survives the custom fields merge.

## Files Changed

| File | Change |
|---|---|
| `src/components/waybill/blankWaybillTemplate.tsx` | Fixed signature image dimensions (110x42), added `richTextToPlainText` import, added `sanitizedNotes` computation |
| `src/components/waybill/waybillMinimalStyles.ts` | Changed `sigArea` from `minHeight: 48` to `height: 48` with flex alignment, `sigCard` from `minHeight: 100` to `height: 100` |
| `src/components/waybill/waybillUtils.ts` | Added `pdfTemplateId: patch.pdfTemplateId ?? base.pdfTemplateId` to `buildWaybillCustomFields` return |

## Verification

| Command | Result |
|---|---|
| `bun run audit:load` | Passed (pre-existing warnings only) |
| `bun run typecheck` | Zero errors |
| `bun run lint` (changed files) | Clean — no errors in any changed file |

## Manual Verification Required

| # | Test | Expected |
|---|---|---|
| 1 | Save Minimal template | Saves successfully |
| 2 | Reload page | Still shows Minimal template |
| 3 | Generate PDF with signature | Signature does not overflow to page 2 |
| 4 | Add notes with HTML content | Notes show plain text, no HTML tags |
| 5 | Classic template unchanged | Signature, notes, behavior identical to before |

## Files NOT Modified (Intentionally)

| File | Reason |
|---|---|
| `src/components/waybill/WaybillPDF.tsx` | Classic renderer — untouched, only used as reference |
| `src/pages/ViewWaybill.tsx` | Already passes `pdfTemplateId` correctly — bug was in merge layer |
| `src/components/pdf-new/core/richText.ts` | Existing utility — used as-is |
