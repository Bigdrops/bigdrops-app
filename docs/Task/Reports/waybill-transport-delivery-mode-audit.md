# Waybill Transport Mode vs Delivery Mode Audit

**Date:** 2026-06-20
**Files examined:** `WaybillForm.tsx`, `WaybillPDF.tsx`, `blankWaybillTemplate.tsx`, `waybillUtils.ts`

---

## Q1 — What field does the form actually store?

**File:** `src/components/waybill/WaybillForm.tsx`, lines 515–532

| Property | Value |
|---|---|
| State field | `waybill.transport_mode` (line 517) |
| Dropdown options | `'By Vehicle'`, `'By Hand'`, `'Courier'`, `'Blank'` (lines 526–530) |
| Default/initial value | `'By Vehicle'` — set in `createDefaultWaybill()` at `waybillUtils.ts:356` |

The dropdown maps `'Blank'` → empty string `''` (line 519).

---

## Q2 — What does the Minimal PDF "Delivery Mode" row read from?

**File:** `src/components/waybill/blankWaybillTemplate.tsx`, lines 124–184

| Property | Value |
|---|---|
| Prop read | `transportMode` from `MinimalContentData` (line 26) |
| Source field | `mapped.transport_mode` — piped through `WaybillPDF.tsx:122` |
| Checkbox tick logic | `isHand = transportMode === 'By Hand'` (line 55) |
| | `isVehicle = transportMode === 'By Vehicle'` (line 56) |
| | `isModeOther = !!transportMode && !['By Hand', 'By Vehicle'].includes(transportMode)` (line 57) |

**Label truncation:** Yes. The visible checkbox label is always a shortened form:
- `'By Vehicle'` → displayed as `'Vehicle'` (line 134)
- `'By Hand'` → displayed as `'Hand'` (line 129)
- Fallback (`Courier`, `Self Pick-Up`, other) → displayed as `'Other'` (line 138)

No other display mapping exists. The stored value is not translated before comparison.

---

## Q3 — Are Transport Mode and Delivery Mode the same field?

**Definitive answer: Yes, they are the same field.** Both read from `transport_mode`.

| Aspect | Detail |
|---|---|
| Same field? | **Yes** — `transport_mode` on the `Waybill` type |
| Label mismatch | The PDF section heading is `"Delivery Mode"` (line 126), but it reads `transportMode`. No separate `delivery_mode` field exists. |
| Option list mismatch | Form dropdown shows 4 values: `By Vehicle`, `By Hand`, `Courier`, `Blank`. Under `TRANSPORT_MODE_OPTIONS` (waybillUtils.ts:128–133) a 4th value `Self Pick-Up` is declared but **not wired** into the form dropdown. |
| PDF checkbox mapping | `By Vehicle` → Vehicle tick ✔; `By Hand` → Hand tick ✔; `Courier`/`Self Pick-Up`/anything else → Other tick ✔ |
| `'Courier'` gap | `Courier` exists in the form and type but maps to `Other` in the PDF — no distinct Courier checkbox exists |

---

## Q4 — Does Classic render either field?

**File:** `src/components/waybill/WaybillPDF.tsx` (Classic path, lines 98–262)

**`transport_mode` is NOT rendered in the Classic template.** `purpose` is also not rendered.

| Field | Classic | Minimal |
|---|---|---|
| `transport_mode` | ❌ Missing | ✅ Delivery Mode checkboxes |
| `purpose` | ❌ Missing | ✅ Delivery Reason checkboxes |
| `driver_name` | ❌ Missing | ✅ Shown in second grid |
| `vehicle_plate` | ✅ Shown in meta grid | ✅ Shown in second grid |
| `sender_name` / `receiver_name` | ✅ Shown as party names | ✅ Shown in signature area |
| `date` / `time` | ✅ Shown in meta grid | ✅ Date shown in header |
| `delivery_location` | ✅ Shown in meta grid | ✅ Shown as destination address |
| `client_name` | ✅ Shown in meta grid | ✅ Shown as client/consignee |
| `po_number` | ✅ Shown in meta grid | ❌ Not shown |
| `notes` | ✅ Shown | ✅ Shown |

The Classic template renders a **subset** compared to Minimal — specifically it omits `transport_mode`, `purpose`, and `driver_name`.

---

## Summary

- The `transport_mode` field is the single source of truth. `"Delivery Mode"` in the PDF is a section heading, not a separate field.
- The form offers `By Vehicle | By Hand | Courier | Blank` but the type definition (`TransportMode`) also includes `Self Pick-Up` which is not wired into the form dropdown.
- The PDF's checkbox labels truncate values (`By Vehicle` → `Vehicle`), and `Courier` falls through to the `Other` checkbox.
- The Classic PDF template omits `transport_mode`, `purpose`, and `driver_name` entirely.
