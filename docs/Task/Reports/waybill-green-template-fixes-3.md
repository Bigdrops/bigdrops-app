# Waybill Green Template — Round 3 Fixes

**Date:** 2026-06-21
**Files Modified:**
- `src/components/waybill/GreenTemplate.tsx` — FIX 1 + FIX 2

---

## FIX 1: Client/Destination Split Into Two Side-by-Side Boxes

### Problem
Client and Destination were merged into a single block showing `clientName` as main and `deliveryLocation` as sub-text. Green.html (lines 522-533) shows two separate side-by-side boxes:
- Left: "Client / Consignee" → `clientName` (main) + `senderName` (sub)
- Right: "Destination Address" → `deliveryLocation` (main)

### Fix
Replaced the single merged block with two side-by-side blocks inside `clientDestRow`:
- Block 1: Label "Client / Consignee", main = `clientName`, sub = `senderName`
- Block 2: Label "Destination Address", main = `deliveryLocation`

### Green.html Reference
```html
<div class="client-dest">
    <div class="block">
        <div class="label">Client / Consignee</div>
        <div class="main">Global Industrial Logistics</div>
        <div class="sub">Plot 42, Ikoyi Crescent, Lagos</div>
    </div>
    <div class="block">
        <div class="label">Destination Address</div>
        <div class="main">Ikoyi Depot, Lagos</div>
    </div>
</div>
```

---

## FIX 2: Method Tick-Box Value Mismatch (Root Cause)

### Problem
Method tick-boxes never showed a tick even when a delivery mode was selected.

### Root Cause
- DB stores `transport_mode` as `'By Vehicle'`, `'By Hand'`, `'By Courier'` (per zod schemas in `externalWaybillSchema.ts` and `internalWaybillSchema.ts`)
- GreenTemplate compared against `'Hand'`, `'Vehicle'`, `'Courier'` — **missing the "By " prefix**
- No value ever matched, so no tick was ever filled

### Evidence
```ts
// externalWaybillSchema.ts line 9
transport_mode: z.enum(['By Vehicle', 'By Hand', 'By Courier']).nullable().optional()

// GreenTemplate.tsx (before fix) line 497
{(['Hand', 'Vehicle', 'Courier'] as const).map((opt) => {
  const checked = deliveryMode === opt  // 'By Hand' === 'Hand' → false always
```

### Fix
Changed Method tick-box options from bare strings to `{ value, label }` objects:
- `{ value: 'By Hand', label: 'Hand' }` — compares full DB value, displays short label
- `{ value: 'By Vehicle', label: 'Vehicle' }`
- `{ value: 'By Courier', label: 'Courier' }`

The `checked` comparison now uses `opt.value` (full DB string), while the displayed label shows the short form matching Green.html.

### Why This Is Correct
- Green.html displays: "Hand", "Vehicle", "Courier" (short labels)
- DB stores: "By Hand", "By Vehicle", "By Courier" (full values)
- Fix bridges the gap: compare against full value, display short label

---

## FIX 3: Section Visibility Audit (Post-Fix)

### Green.html Section Mapping (All Verified)

| # | Green.html Section | Lines | GreenTemplate | Status |
|---|---|---|---|---|
| 1 | Accent bar | 472 | `S.accentBar` | ✅ |
| 2 | Header (brand + badge) | 475-487 | `S.header` | ✅ |
| 3 | Doc title | 489-490 | `S.docTitle` | ✅ |
| 4 | Info grid (Date/Time/PO/Vehicle) | 493-498 | `S.infoGrid` | ✅ |
| 5 | Method & Purpose tick-boxes | 500-520 | `S.twinCards` | ✅ FIXED |
| 6 | Client & Destination boxes | 522-533 | `S.clientDestRow` | ✅ FIXED |
| 7 | Items table | 535-563 | `S.tableWrap` | ✅ |
| 8 | Driver row | 566-570 | `S.driverRow` | ✅ |
| 9 | Notes | 573-577 | `S.notesChecklist` | ✅ |
| 10 | Signatures (sender + receiver) | 588-625 | `S.sigRow` | ✅ |
| 11 | Footer | 627-632 | `S.footer` | ✅ |

### Note: Receiving Checklist (Green.html lines 578-584)
Green.html shows a "Receiving Checklist" box with 4 static items (Quantity Checked, Condition Confirmed, Shortage Reported, Goods Accepted). This is **intentionally omitted** from the template because:
- No engine data drives these checkboxes (they're static mockup decoration)
- Blank waybills must fit on a single A4 page (pdf-rendering-correctness skill contract)
- Adding static non-data-driven UI elements would violate the "PDFs are dumb renderers" principle

---

## Verification

- **TypeScript:** `tsc --noEmit` — clean (no errors)
- **ESLint:** `eslint src/components/waybill/GreenTemplate.tsx` — clean (no errors)
