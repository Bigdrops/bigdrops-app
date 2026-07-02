# Waybill Green Template Only — Task Report

**Date:** 2026-06-20
**Status:** ✅ Complete

## Summary

Replaced the multi-template waybill PDF system (Classic, Minimal, Thermal) with a single Green template built from `CANDIDATES/Green.html`. Removed all old template files and wired only the Green template throughout the app.

## Changes Made

### Files Deleted
- `src/components/waybill/ClassicTemplate.tsx`
- `src/components/waybill/ThermalTemplate.tsx`
- `src/components/waybill/templates/MinimalTemplate.tsx`
- `src/components/waybill/templates/` directory

### Files Created
- `src/components/waybill/GreenTemplate.tsx` — New Green PDF template using react-pdf, faithful to the HTML source design

### Files Modified
- `src/components/waybill/WaybillPDF.tsx` — Removed old template imports; now imports and renders only `GreenTemplateDocument`. Removed `template` and `waybill`/`settings` props.
- `src/components/waybill/waybillUtils.ts` — Changed `WaybillPdfTemplateId` to `'green'` only; updated `normalizeWaybillPdfTemplateId` to always return `'green'`.
- `src/pages/ViewWaybill.tsx` — Removed `WAYBILL_PDF_TEMPLATE_OPTIONS`, `templateId` state, `DocumentTemplatePicker` UI, and template-related imports. Simplified WaybillPDF usage to `<WaybillPDF model={model} designPreset={designPreset} />`.

## Green Template Features

Faithfully translated from the HTML source:
- Green accent bar and green-themed color palette (`#1f6e5c` accent, `#c9a84c` gold)
- Header with company logo, name, address, and waybill badge
- "WAYBILL / DELIVERY NOTE" title banner
- Info grid: Date, Time, P.O. Number, Vehicle Plate
- Method (By Hand/Vehicle/Courier) and Purpose (Supply/Return/Repair/Transfer/Other) checkbox cards
- Client/Consignee and Destination Address blocks
- Items table with columns: #, Description, Qty/Unit, Condition, Part No, Make
- Driver name row
- Operational Notes and Receiving Checklist boxes
- Delivered By / Collected By signature cards with signature image support
- Footer with company name, waybill number, and page numbers

## Verification

- ✅ `bun run typecheck` — passes
- ✅ `bun run lint` — no new errors introduced (1330 pre-existing lint issues unrelated to this change)
