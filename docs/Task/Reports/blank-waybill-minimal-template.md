# Blank Waybill Minimal Template — Work Report

## Task
Replace the blank waybill PDF template with a Minimal design (based on `waybill-portrait-corrected.html`) and add a `template="minimal"` option to the data-filled `WaybillPDF.tsx`.

## Key Design Decisions

1. **Shared content component** — `WaybillMinimalContent` in `blankWaybillTemplate.tsx` renders the exact same JSX structure for both blank templates and the `template="minimal"` option in `WaybillPDF.tsx`. Only the data differs (blank mode shows 10 empty rows; filled shows actual items).

2. **Styles in separate file** — `waybillMinimalStyles.ts` holds the shared `StyleSheet.create` so both `blankWaybillTemplate.tsx` and `WaybillPDF.tsx` import from the same source.

3. **React-PDF only** — All rendering uses Document/Page/View/Text primitives. No HTML.

4. **Checkboxes** — Unicode ☐/☑ characters inside bordered Views matching the rectangular-label design from the HTML reference.

5. **Fields from HTML reference** — Logo/company/address, WAYBILL title + No/Date pills, Client/Consignee (or Origin for internal), Destination Address (or Destination), Vehicle Plate, Driver Name, Delivery Mode checkboxes, Delivery Reason checkboxes (external only), Items table (# 5% / Description 70% / Qty 12% / Unit 13%), Notes, Signatures (Name/Time/Signature), Footer with company + tagline.

6. **Excluded** — Driver Phone, Remark column (per spec).

## Files Changed

| File | Change |
|---|---|
| `src/components/waybill/waybillMinimalStyles.ts` | **NEW** — Shared React-PDF `StyleSheet.create` with #000 borders, #f4f4f4 headers, Helvetica |
| `src/components/waybill/blankWaybillTemplate.tsx` | **REWRITE** — Exports `WaybillMinimalContent`, `MinimalContentData`, `BlankTemplateOptions`, `downloadBlankWaybillTemplate`. Uses shared `WaybillMinimalContent` for both blank external and internal templates. Accepts options object instead of separate params. |
| `src/components/waybill/WaybillPDF.tsx` | **MODIFIED** — Added `template?: 'default' \| 'minimal'` prop. When `template === 'minimal'`, renders via `WaybillMinimalContent` with mapped waybill data. Added `company_tagline` to Settings interface. |
| `src/pages/NewWaybill.tsx` | **MODIFIED** — Updated `handleBlankDownload` to pass options object (`type`, `waybillNumber`, `companyName`, `companyAddress`, `companyLogoUrl`, `tagline`) to `downloadBlankWaybillTemplate`. |

## Verification

| Command | Result |
|---|---|
| `bun run audit:load` | Passed (pre-existing warnings only) |
| `bun run typecheck` | Zero errors |
| `bun run lint` | Clean on all changed files |

## Files NOT Modified (Intentionally)

| File | Reason |
|---|---|
| `src/components/waybill/waybillUtils.ts` | Prefix engine, numbering, types — not touched |
| `src/domain/prefixConstants.ts` | Canonical prefix engine — no changes needed |
| `src/components/waybill/WaybillForm.tsx` | Form UI — out of scope |
| `src/components/waybill/WaybillGatewayOverlay.tsx` | Gateway overlay — out of scope |
