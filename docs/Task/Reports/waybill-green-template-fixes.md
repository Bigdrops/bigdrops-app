# Waybill Green Template — Engine Contract Compliance Fixes

**Date:** 2026-06-21  
**Status:** ✅ COMPLETE — `bun run typecheck` passes, `bun run lint` clean  
**File:** `src/components/waybill/GreenTemplate.tsx`

---

## Summary

Applied 6 fixes to `GreenTemplate.tsx` to bring the Green waybill template into compliance with the Waybill Render Engine Contract (v1.0), specifically Printable Blank Preservation (Section 1), Table Block (Section 4.7), and Signatures (Section 4.8).

---

## Fixes Applied

### FIX 1 — Logo Rendering (no tint/overlay)

**Problem:** Logo `<Image>` used `style={S.brandIcon}` which included `backgroundColor: accent` (green), tinting/overlaying the logo.

**Fix:** Created a separate `brandLogo` style with no background color:
```tsx
brandLogo: {
  width: 36,
  height: 36,
  borderRadius: 8,
  flexShrink: 0,
},
```
Logo now renders exactly as provided by `model.branding.logo` without any background. Fallback to green `brandIcon` box with ⚡ emoji only when `model.branding.logo` is null.

### FIX 2 — Printable Blank Preservation (remove dashes)

**Problem:** Template used `'—'` (em-dash) as fallback for all empty fields throughout the template, violating the Printable Blank Preservation rule.

**Fix:** Replaced all `|| '—'` with `|| ''`. Fields affected:
- `model.header.waybillNumber`
- `model.header.date`
- `model.header.time`
- `model.header.poNumber`
- `model.logistics.vehiclePlate`
- `model.logistics.driverName`
- `model.logistics.deliveryLocation`
- `model.notes`
- `model.parties.clientName`
- `model.parties.senderName`
- `model.parties.receiverName`
- `row.cells[col.key]` (all dynamic columns)

### FIX 3 — Dynamic Table Columns

**Problem:** Table hardcoded 6 columns: #, Description, Qty/Unit, Condition, Part No, Make — ignoring `model.table.columns`.

**Fix:** Table now iterates `model.table.columns` dynamically:
- Header row: iterates `columns.map(col => <Text>{col.label}</Text>)`
- Data rows: iterates `columns.map(col => <Text>{row.cells[col.key] || ''}</Text>)`
- Column widths: `95 / columns.length` (remaining 5% for # column)
- Removed hardcoded `colNum`, `colDesc`, `colQty`, `colCond`, `colPart`, `colMake` styles

### FIX 4 — Client/Consignee Box (height + deliveryLocation)

**Problem:** Client box had no multi-line support; delivery location was in a separate box.

**Fix:** Merged client and delivery location into one block:
```tsx
<View style={S.block}>
  <Text style={S.blockLabel}>Client / Consignee</Text>
  <Text style={S.blockMain}>{model.parties.clientName || ''}</Text>
  <Text style={S.blockSub}>{model.logistics.deliveryLocation || ''}</Text>
</View>
```
Client name as primary, delivery location as second line below.

### FIX 5 — Signature Boxes (empty bordered box or image)

**Problem:** Signature boxes contained faint `"Signature"` text when no signature was present, and used `width: '100%'` for the image.

**Fix:**
- Empty signature: renders `<View style={S.sigImageArea} />` (empty bordered dashed box, no text)
- Signature present: renders `<Image src={sig.url} style={S.sigImage} />` at exactly **110×42 points** per contract
- Removed all `"Signature"` placeholder text

### FIX 6 — Dynamic Column Rendering (no hardcoded columns)

**Problem:** Fixed Part No / Make columns rendered regardless of `model.table.columns`.

**Fix:** All columns now come from `model.table.columns`. Template no longer defines any column schema — only renders what the engine provides. Empty cells render as empty string, not dashes.

---

## Additional Cleanup

- Removed `DELIVERY_MODES` and `PURPOSES` hardcoded constants — delivery mode and purpose now render as plain text from `model.logistics.deliveryMode` / `model.logistics.purpose`
- Removed `Tick` component (only used for hardcoded checkbox approach)
- Removed unused `border` and `surface` style variables

---

## Verification

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ PASS — no errors |
| `bun run lint` (GreenTemplate.tsx) | ✅ PASS — 0 errors, 0 warnings |
