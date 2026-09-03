# Waybill Blank Download Restore

**Date:** 2026-06-17  
**Status:** Fixed

## Problem
Blank waybill PDF download was broken in `blankWaybillTemplate.tsx` due to two issues:

1. **`require()` import** (line 266): Used `require('@react-pdf/renderer')` — forbidden by ESLint `no-require-imports` rule
2. **React hooks in PDF render** (lines 17-24): `WaybillMinimalContent` used `useState`/`useEffect` for opacity animation — unnecessary and inappropriate for a PDF render function

## Fix (Surgical)

### `src/components/waybill/blankWaybillTemplate.tsx`

**Removed React hooks from `WaybillMinimalContent`:**
- Deleted `useState(false)` for `mounted` state
- Deleted `useEffect` with `requestAnimationFrame` timer
- Removed all 9 instances of `{ opacity: mounted ? 1 : 0 }` from View styles
- Changed `style={[styles.X, { opacity: mounted ? 1 : 0 }]}` → `style={styles.X}` for all 9 blocks (titleZone, headerGrid, topGrid, secondGrid, modeRow, table, notesBox, sigsRow, footer)

**Fixed import to use dynamic `import()`:**
- Removed `const { pdf } = require('@react-pdf/renderer') as typeof import(...)` 
- Changed function to `async` and added `const { pdf } = await import('@react-pdf/renderer')`
- Changed return from `.then()` chain to `async/await`
- Removed unused `React`, `useState`, `useEffect` imports
- Removed unused `StyleSheet` import
- Added `eslint-disable react-refresh/only-export-components` for intentional multi-export pattern

## Verification
- ✅ `tsc --noEmit` — clean (no errors)
- ✅ `eslint blankWaybillTemplate.tsx` — clean (no errors)
- ✅ `bun run audit:load` — passes (all warnings pre-existing)
- ✅ Handler in `NewWaybill.tsx` (line 44) — builds model via `buildWaybillRenderModel` + `STANDARD_ITEM_COLUMNS`, calls `downloadBlankWaybillTemplate`
- ✅ Gateway overlay buttons wired via `onDownloadBlank` prop (line 119)

## Architecture
```
NewWaybill handleBlankDownload
  → resolves prefix via resolvePrefix()
  → generates waybill number via getNextWaybillNumber() with retry loop
  → logs to blank_waybill_logs (with duplicate key protection)
  → builds WaybillRenderModel via buildWaybillRenderModel({ waybill, columns, company })
  → calls downloadBlankWaybillTemplate({ model, type })
    → dynamic import('@react-pdf/renderer')
    → pdf(doc).toBlob() → URL.createObjectURL → hidden <a> click
```

## Files Modified
- `src/components/waybill/blankWaybillTemplate.tsx` — 22 insertions, 29 deletions

## Git
- Commit: pending
