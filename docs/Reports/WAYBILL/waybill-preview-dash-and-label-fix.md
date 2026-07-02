# Waybill Preview — Dash Placeholder & Ref No Label Fix

**Date:** 2026-06-27
**Scope:** 1 file — `WaybillDocumentPreview.tsx`
**Verification:** `bun run typecheck` passes (no errors)

---

## Problem

1. **Dash placeholders:** Empty fields showed `—` (em-dash) instead of blank, violating the Printable Blank Preservation rule.
2. **Wrong label:** The field displayed as "Ref No" but the source is `po_number` — PDF and form use "P.O. No".

## Changes

### `WaybillDocumentPreview.tsx`

**Fix 1 — Removed all `'—'` fallbacks (7 occurrences):**

| Line | Before | After |
|---|---|---|
| 26 | `{header.waybillNumber \|\| '—'}` | `{header.waybillNumber \|\| ''}` |
| 30 | `{header.date \|\| '—'}` | `{header.date \|\| ''}` |
| 39 | `{parties.clientName \|\| '—'}` | `{parties.clientName \|\| ''}` |
| 47 | `{logistics.vehiclePlate \|\| '—'}` | `{logistics.vehiclePlate \|\| ''}` |
| 51 | `{header.poNumber \|\| '—'}` | `{header.poNumber \|\| ''}` |
| 55 | `{logistics.driverName \|\| '—'}` | `{logistics.driverName \|\| ''}` |
| 76 | `{value \|\| '—'}` | `{value \|\| ''}` |

Also removed the notes fallback text: `'No delivery notes recorded.'` → `''`

**Fix 2 — Label change:**
- Line 50: `Ref No:` → `P.O. No:`

Value source confirmed as `model.header.poNumber` (from `WaybillRenderModel`).

## Files Changed

| File | Change |
|---|---|
| `src/components/document-view/waybill/WaybillDocumentPreview.tsx` | 8 `'—'` → `''` replacements, 1 label rename |
