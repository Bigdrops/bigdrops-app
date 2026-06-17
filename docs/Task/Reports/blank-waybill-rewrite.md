# Blank Waybill React-PDF Migration Report

**Date:** 2026-06-17  
**Status:** COMPLETE  
**File:** `src/components/waybill/blankWaybillTemplate.tsx`  
**Validation:** `bun run typecheck` — 0 errors

---

## Summary

Migrated `blankWaybillTemplate.tsx` from HTML semantics (`<div>`, `<table>`, `<th>`, `<td>`, `<span>`) to pure `@react-pdf/renderer` primitives (`<Document>`, `<Page>`, `<View>`, `<Text>`). The file now compiles cleanly and follows the same patterns as `WaybillPDF.tsx`.

---

## What Changed

| Before (HTML→PDF) | After (React-PDF) |
|---|---|
| `<div>` with inline CSS (30+ instances) | `<View>` with `StyleSheet.create()` styles |
| `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` | `<View style={S.tableHeader}>` + `<View style={S.tableRow}>` with flex columns |
| Inline CSS strings (`display: flex`, `gap: 20px`, `border: 1px solid #000`) | `StyleSheet.create()` with `flexDirection: 'row'`, `gap: 20`, `border: '1pt solid #000'` |
| `<span>` for text | `<Text>` |
| Raw string nodes in `<div>` | All text wrapped in `<Text>` |

## What Did NOT Change

- **Download pipeline:** Same `pdf(element).toBlob()` → `createObjectURL` → `.click()` pattern
- **Function signature:** `downloadBlankWaybillTemplate(type, waybillNumber, companyName)` — unchanged
- **Column system:** Description=6, Qty=1, Unit=2, Notes=3 (flex weights) — preserved
- **Both templates:** BlankExternalTemplate and BlankInternalTemplate — both migrated
- **Content:** All labels, placeholders, checkbox markers (☐) — identical

---

## Migration Phases (Condensed)

The file is 228 lines with 2 template functions + 1 download function. Since `<div>`→`<View>` and `<table>`→flex rows are interdependent throughout, all phases were applied in a single pass:

### Phase 2: Base Layout Skeleton
- All `<div>` → `<View>` 
- All `<table>/<thead>/<tbody>/<tr>/<th>/<td>` → `<View>` with `flexDirection: 'row'`

### Phase 3: Static Sections
- Header: `<div style="text-align: center">` → `<View style={S.header}>` with `textAlign: 'center'` in StyleSheet
- Footer: Signature blocks migrated to `<View>` + `<Text>`

### Phase 4: Party Blocks
- Sender/Receiver (External) and Origin/Destination (Internal)
- `<div>` → `<View style={S.partyBox}>` with `flex: 1`

### Phase 5: Item Table (Highest Risk)
- `<table>` → `<View style={{ border: '1pt solid #000' }}>` container
- `<thead>/<tr>` → `<View style={S.tableHeader}>` with flex children
- `<td>` → `<View style={S.tableRow}>` with flex children
- Column widths: `width: 30` (Num) + `flex: 6/1/2/3` (Desc/Qty/Unit/Notes)

### Phase 6: Signature Blocks
- `<div>` with inline border → `<View style={S.signatureBox}>`
- Signature space: `<div style="height: 60px">` → `<View style={S.signatureSpace} />`

---

## Verification

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ 0 errors |
| Zero HTML elements (`<div>`, `<table>`, `<th>`, `<td>`, `<span>`) | ✅ Verified |
| Zero inline CSS styles | ✅ All moved to `StyleSheet.create()` |
| Download pipeline unchanged | ✅ Same blob → URL → click pattern |
| `companyName` parameter preserved | ✅ Dynamic from settings |
| Import compatible with NewWaybill.tsx | ✅ Same function signature |

---

## Rollback

To revert: restore the original file from git:
```bash
git checkout HEAD -- src/components/waybill/blankWaybillTemplate.tsx
```
