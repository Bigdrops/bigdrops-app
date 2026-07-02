# Waybill Template Mockups — Report

**Date:** 2026-06-21
**Author:** opencode (automated)
**Task:** Static HTML layout mockups for Classic and Minimal waybill PDF templates

---

## Files Created

| File | Path |
|---|---|
| Classic mockup | `docs/TEMPLATES/htmltemps/waybill/classic-mockup.html` |
| Minimal mockup | `docs/TEMPLATES/htmltemps/waybill/minimal-mockup.html` |

---

## Structural Differences: Classic vs Minimal

| Aspect | Classic (WaybillPDF.tsx) | Minimal (blankWaybillTemplate.tsx) |
|---|---|---|
| **Title** | "WAYBILL" (right-aligned, 18px) | "WAYBILL / DELIVERY NOTE" (centered, 16px, letter-spaced) |
| **Header layout** | Company info left, doc title + number right | Brand info left (logo + name + address + contact + tagline), pill-style ID + date right |
| **Meta fields** | 9-field flex grid (Date, Time, Vehicle Plate, Location, Client, PO#, Mode, Purpose, Driver) | No meta grid — fields are in dedicated box rows |
| **Client / Destination** | No dedicated boxes (appears in meta grid and party row) | Two separate bordered boxes (Client/Consignee + Destination Address) |
| **Vehicle / Driver** | Part of meta grid | Two separate bordered boxes (Vehicle Plate + Driver Name) |
| **Delivery Mode** | Single label in meta grid | Checkbox group with 3 options: Hand, Vehicle, Other |
| **Delivery Reason** | Single label ("Purpose") in meta grid | Checkbox group: external (Supply, Return, Repair, Other) or internal (Transfer, Repair, Other) |
| **Party boxes** | Sender / Receiver boxes with label + value | No separate party boxes — sender/receiver appear in signature cards |
| **Items table columns** | Dynamic columns (`model.table.columns`) — shows #, Description, Qty, Unit, Rate | Fixed 4 columns: #, Description, Qty, Unit |
| **Notes** | Bordered rounded box with "Operational Notes" heading | Bordered square box with "Delivery Remarks / Notes" heading |
| **Signature section** | Two signature boxes with title + image placeholder | Two signature cards with header, Name/Time row, and signature area |
| **Footer** | Waybill number, company name, page numbers (centered) | Company name and waybill number (space-between) |

---

## Missing Fields in Classic vs Minimal

Classic template **lacks** these fields present in Minimal:
- No checkbox-style Delivery Mode selection (Hand / Vehicle / Other)
- No checkbox-style Delivery Reason selection (Supply / Return / Repair / Transfer / Other)
- No dedicated Driver Name field row (it's in the meta grid only)
- No `tagline` display
- No contact line (phone | email) in header area

Minimal template **lacks** these fields present in Classic:
- No `Time` field
- No `P.O. Number` field
- No dynamic/additional table columns beyond Description, Qty, Unit
- No `Rate` column

---

## 2-Page Layout Simulation

Both mockups contain exactly **2 `.page` divs** with `page-break-after: always`:

- **classic-mockup.html:** Page 1 shows header, meta grid, party row, items 1-6, notes, signatures, footer. Page 2 repeats header, items 7-12, notes, signatures, footer with updated page number.
- **minimal-mockup.html:** Page 1 shows full layout with items 1-8. Page 2 repeats full structure with items 9-16 (including blank rows). Overflow is **not** calculated — sections are split logically for visual preview.

---

## Engine Logic Confirmation

**No engine logic was used.**
- No `WaybillRenderModel` reconstruction
- No `normalizeBlank` or data transformation logic
- No field mapping or conditional rendering reasoning
- No `calcTotals`, `resolveRowVat`, or financial computation
- No `richTextToPlainText` sanitization logic simulated
- All values are static placeholders from the sample data set

---

## Source Code Integrity

**No source files were modified.**
- Input files read-only: `WaybillPDF.tsx`, `blankWaybillTemplate.tsx`, `waybillMinimalStyles.ts`
- Output files are entirely new HTML files in `docs/TEMPLATES/htmltemps/waybill/`
- No React components, domain logic, or configuration was altered

---

## Files Read (Read-Only)

- `src/components/waybill/WaybillPDF.tsx`
- `src/components/waybill/blankWaybillTemplate.tsx`
- `src/components/waybill/waybillMinimalStyles.ts`
- `docs/TEMPLATES/htmltemps/waybill/wblbarebones.html`
- `AGENTS.md`

---

## Confirmation of Completion

- [x] 2 HTML files created in `docs/TEMPLATES/htmltemps/waybill/`
- [x] Visually faithful layout approximation of both templates
- [x] All fields placed according to current React-PDF structure
- [x] No engine logic or data transformation used
- [x] 2-page layout simulated with `page-break-after: always`
- [x] No source files modified
- [x] Report saved to `docs/Reports/waybill-template-mockups-report.md`
