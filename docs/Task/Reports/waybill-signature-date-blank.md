# Waybill Signature Date Field — Remove Auto-Fill

**Date:** 2026-06-22
**Task:** Remove date pre-filling from signature section so couriers/receivers can write the date by hand.

---

## Problem

The "Delivered By / Driver" and "Received By" signature cards in `blankWaybillTemplate.tsx` were auto-filling the Date field with the waybill's date value (`date || 'Time'`). This field must be blank for handwriting.

## Analysis

| Template | Had Issue? | Reason |
|---|---|---|
| `blankWaybillTemplate.tsx` | **YES** | `{date \|\| 'Time'}` rendered in both signature cards |
| `MinimalTemplate.tsx` | No | Uses static `"Date / Time"` label text, no value injection |
| `ClassicTemplate.tsx` | No | Uses `<View style={S.sigFieldValueBlank} />` — already blank |

## Fix

**File:** `src/components/waybill/blankWaybillTemplate.tsx`

Two surgical changes in the signature section (ZONE 5):

- **Line 221** (Delivered By card): `{date || 'Time'}` → empty string
- **Line 235** (Received By card): `{date || 'Time'}` → empty string

The Name field (`{senderName || 'Name'}`, `{receiverName || 'Name'}`) and signature image areas are untouched.

## What Was NOT Changed

- `MinimalTemplate.tsx` — already correct (static label, no value)
- `ClassicTemplate.tsx` — already correct (blank view element)
- Signature image rendering — untouched
- Date label text — untouched (field remains visible for handwriting)
- Header date display (line 95) — untouched, still shows waybill date in header

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` (filtered to changed files) | ✅ No errors |
| `eslint` on `blankWaybillTemplate.tsx` | ✅ Clean |
