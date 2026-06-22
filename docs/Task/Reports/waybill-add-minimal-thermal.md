# Waybill Templates: Add Minimal & Thermal + Green Fix

**Date:** 2026-06-20
**Round:** 4 (following Rounds 1–3 of Green template fixes)

---

## Summary

Added Minimal and Thermal waybill PDF templates alongside the existing Green template, fixed a data mapping error in Green's Client/Consignee box, and wired all three templates through WaybillPDF routing and ViewWaybill picker.

---

## Changes Applied

### FIX 1: Green Client/Consignee box — remove senderName sub-text

**File:** `src/components/waybill/GreenTemplate.tsx`
**Line:** 535

**Root cause:** `senderName` is the delivering company name (the sender), NOT the client's address. Displaying it under "Client / Consignee" was misleading.

**Fix:** Removed the `<Text style={S.blockSub}>{model.parties.senderName || ''}</Text>` line from the Client/Consignee block. The box now shows only `clientName`.

**Before:**
```tsx
<Text style={S.blockLabel}>Client / Consignee</Text>
<Text style={S.blockMain}>{model.parties.clientName || ''}</Text>
<Text style={S.blockSub}>{model.parties.senderName || ''}</Text>
```

**After:**
```tsx
<Text style={S.blockLabel}>Client / Consignee</Text>
<Text style={S.blockMain}>{model.parties.clientName || ''}</Text>
```

---

### CHANGE 2: Create MinimalTemplate.tsx

**File:** `src/components/waybill/MinimalTemplate.tsx` (NEW)

Clean minimal A4 waybill design based on `Minimal-final.html`:
- Arial font family
- Title: "WAYBILL / DELIVERY NOTE" centered with bottom border
- Header grid: brand info (logo + name + address + contact + tagline) left, doc-ident pills (waybill number, date, time) right
- Client/Consignee + Destination Address — two bordered boxes
- Vehicle Plate + Driver Name — two bordered boxes
- Delivery Mode + Delivery Reason — checkbox rows with tick boxes
- 6-column dynamic items table (#, Description, Qty/Unit, Condition, Part No, Make)
- Notes box
- Signatures: Delivered By / Received By — side-by-side cards with name, signature area, date/time
- Footer: company name, waybill number, page number

**Contract:** Same as Green — `(model: WaybillRenderModel, designPreset?: PdfDesignPreset)`

---

### CHANGE 3: Create ThermalTemplate.tsx

**File:** `src/components/waybill/ThermalTemplate.tsx` (NEW)

Receipt-style waybill design based on `Thermal.html`:
- Courier New monospace font
- 104mm receipt width centered on A4 page
- Receipt-edge decoration (dot pattern on left/right borders)
- Brand block: logo + company name + contact info, centered
- Title bar: "WAYBILL / DELIVERY NOTE" with dashed borders
- Waybill number centered
- Compact info rows: DATE, TIME, P.O. NO, VEHICLE, DRIVER
- Dispatch From block with dashed border
- Deliver To block with dashed border
- Movement Details: METHOD and PURPOSE tick boxes
- Items table with dotted bottom borders
- Note box with dashed border
- Acknowledgement section: Delivered By / Collected By with signature image or blank line
- Footer: company name, waybill number, page number

**Contract:** Same as Green — `(model: WaybillRenderModel, designPreset?: PdfDesignPreset)`

---

### CHANGE 4: WaybillPDF.tsx routing

**File:** `src/components/waybill/WaybillPDF.tsx`

- Added imports for `MinimalTemplateDocument` and `ThermalTemplateDocument`
- Added `template?: 'green' | 'minimal' | 'thermal'` prop (default: `'green'`)
- Routes to correct template component based on prop value

---

### CHANGE 5: ViewWaybill.tsx template picker

**File:** `src/pages/ViewWaybill.tsx`

- Added `template` state (`'green' | 'minimal' | 'thermal'`, default `'green'`)
- Initializes from `waybill.custom_fields.pdfTemplateId` when waybill loads
- Passes `template` to `WaybillPDF` in download handler
- Passes `template` to `buildWaybillCustomFields` when saving
- Added template picker UI in the customization sheet — three buttons (Green, Minimal, Thermal) with active state styling

---

### CHANGE 6: waybillUtils.ts type updates

**File:** `src/components/waybill/waybillUtils.ts`

- `WaybillPdfTemplateId`: extended from `'green'` to `'green' | 'minimal' | 'thermal'`
- `normalizeWaybillPdfTemplateId()`: now validates `'minimal'` and `'thermal'` in addition to `'green'`; defaults to `'green'`

---

## Verification

- **TypeScript:** `npx tsc --noEmit` — ✅ passes (0 errors)
- **ESLint:** `npx eslint` on all modified files — ✅ passes (0 errors)

---

## Files Modified

| File | Action |
|------|--------|
| `src/components/waybill/GreenTemplate.tsx` | Modified — removed senderName from client box |
| `src/components/waybill/MinimalTemplate.tsx` | Created — new minimal template |
| `src/components/waybill/ThermalTemplate.tsx` | Created — new thermal template |
| `src/components/waybill/WaybillPDF.tsx` | Modified — 3-template routing |
| `src/pages/ViewWaybill.tsx` | Modified — template picker + state |
| `src/components/waybill/waybillUtils.ts` | Modified — extended type + normalize |

## Constraints Honored

- ✅ No changes to engine (`buildWaybillRenderModel`, `resolveColumns`, `buildRows`)
- ✅ No changes to `WaybillRenderModel` contract (types.ts)
- ✅ No hardcoded table columns — all templates iterate `model.table.columns` / `model.table.rows`
- ✅ PDFs receive shaped data, never compute
- ✅ No Tailwind v4 syntax
- ✅ No framer-motion
- ✅ All sections visible even when data is blank
- ✅ Blank values render as empty strings
- ✅ Signature images 110×42 or empty bordered box when null
