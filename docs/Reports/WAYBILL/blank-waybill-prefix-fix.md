# Blank Waybill Prefix Routing Token Fix — Work Report

## Task
Fix the blank waybill download handler to route through the existing prefix engine so that blank external waybills use `ME` tokens and blank internal waybills use `MI` tokens (matching the prefix engine standard), instead of the previous behavior that used `E`/`I` tokens.

## What Changed

### 1. `src/components/waybill/waybillUtils.ts` — `getNextWaybillNumber()`

Added a `mode: 'normal' | 'blank' = 'normal'` parameter. When `mode === 'blank'`, the function generates sequence numbers with `ME` (manual external) or `MI` (manual internal) routing tokens. When `mode === 'normal'` (the default), behavior is unchanged (`E`/`I` tokens).

### 2. `src/pages/NewWaybill.tsx` — blank download handler

Updated `handleBlankDownload` to:
- Pass `'blank'` as the fourth argument to `getNextWaybillNumber`
- Resolve the prefix via `resolvePrefix(settings?.document_prefixes, 'waybill')` instead of any hardcoded string

## Verification

| Command | Result |
|---|---|
| `bun run audit:load` | Passed (pre-existing warnings only) |
| `bun run typecheck` | Zero errors |
| `bun run lint` | No new errors (1281 pre-existing errors) |

## Files Modified
| File | Lines |
|---|---|
| `src/components/waybill/waybillUtils.ts` | `getNextWaybillNumber` — added `mode` parameter, conditional routing token logic |
| `src/pages/NewWaybill.tsx` | Blank download handler — passes `mode: 'blank'` and uses `resolvePrefix` |

## Files NOT Modified (Intentionally)
| File | Reason |
|---|---|
| `src/domain/prefixConstants.ts` | Canonical prefix engine — no changes needed |
| `src/components/waybill/WaybillPDF.tsx` | PDF template — out of scope |
| Blank template design files | Out of scope |

## Expected Behavior

| Scenario | Token | Example |
|---|---|---|
| Normal external waybill | `E` | `AWB-E-000001` |
| Normal internal waybill | `I` | `AWB-I-000001` |
| Blank external download | `ME` | `AWB-ME-000001` |
| Blank internal download | `MI` | `AWB-MI-000001` |
