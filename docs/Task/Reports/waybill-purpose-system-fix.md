# Waybill Purpose System — End-to-End Fix

**Date:** 2026-06-20
**Status:** ✅ Complete

---

## Problem Statement

The Waybill Purpose system had several issues:
1. **Silent defaults** — purpose was auto-set to `'Supply'` when null/empty
2. **No Purpose dropdown** — UI relied on old values that don't exist in the new schema
3. **PDF checkbox mapping wrong** — Supply showed as Transfer, Return showed as Maint., Third-Party Custody showed as Other
4. **"Signature" placeholder text** — rendered literal "Signature" text when no signature existed

## What Changed

### Files Modified

| File | Change |
|------|--------|
| `src/components/waybill/waybillUtils.ts` | Updated `WaybillPurpose` type, split `PURPOSE_OPTIONS` → `EXTERNAL_PURPOSE_OPTIONS` + `INTERNAL_PURPOSE_OPTIONS`, updated normalizer, set default purpose to `null` |
| `src/components/waybill/WaybillForm.tsx` | Added Purpose dropdown with CompactSelectField (type-aware: external vs internal options) |
| `src/domain/waybill/waybillMutations.ts` | Removed silent `'Supply'` default — now uses `waybill.purpose ?? null` |
| `src/components/waybill/blankWaybillTemplate.tsx` | Fixed checkbox mapping, removed "Signature" placeholder text |

### Type Changes

**Before:**
```typescript
type WaybillPurpose = 'Supply' | 'Return' | 'Third-Party Custody';
purpose: WaybillPurpose | '';
```

**After:**
```typescript
type WaybillPurpose = 'Supply' | 'Return' | 'Repair' | 'Other' | 'Transfer';
purpose: WaybillPurpose | null;
```

### Purpose Options

**External waybills:** Supply, Return, Repair, Other, Blank (→ NULL)
**Internal waybills:** Transfer, Repair, Other, Blank (→ NULL)

### PDF Checkbox Mapping

**Before (wrong):**
- Supply → isTransfer ✓
- Return → isMaint ✓
- Third-Party Custody → isReasonOther ✓

**After (correct):**
- Supply → isSupply ✓
- Return → isReturn ✓
- Repair → isRepair ✓
- Transfer → isTransfer ✓
- Other → isReasonOther ✓

### Null Handling

- `normalizeWaybillPurpose('Supply')` → `'Supply'`
- `normalizeWaybillPurpose('Third-Party Custody')` → `null` (old value, no longer valid)
- `normalizeWaybillPurpose('')` → `null`
- `normalizeWaybillPurpose(null)` → `null`

## Verification

- ✅ `bun run audit:load` — passed (pre-existing warnings only)
- ✅ `bun run typecheck` — zero errors
- ✅ `bun run lint` on changed files — zero new errors
- ✅ No import adapters set purpose (verified)
- ✅ No useEffect auto-assigns purpose (verified)
- ✅ No DB triggers set default purpose (verified)

## Manual Verification Checklist

1. [ ] New external waybill → purpose is NULL → PDF shows no ticks
2. [ ] Select Supply → save → reload → PDF shows Supply ticked
3. [ ] Select Blank → purpose returns to NULL → PDF shows no ticks
4. [ ] Old waybill with 'Supply' in DB loads correctly
5. [ ] Internal waybill with NULL purpose renders no purpose checkbox row
6. [ ] No "Supply" appears anywhere unless explicitly chosen

## Breaking Changes

- Old `'Third-Party Custody'` purpose value is no longer valid — existing waybills with this value will display as NULL (no checkbox ticked)
- `Waybill.purpose` field type changed from `WaybillPurpose | ''` to `WaybillPurpose | null`
- All consumers checking `purpose === ''` for null detection should now check `purpose === null`
