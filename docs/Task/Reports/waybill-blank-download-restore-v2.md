# Blank Waybill Download Restore v2

**Date:** 2026-06-22
**Commit:** To be committed
**Task:** Restore blank waybill PDF download to exact working state from commit `1a53727886f27bd0436d86d944e2007989079b7a`

---

## What Changed

### `src/components/waybill/blankWaybillTemplate.tsx`
- **Checked out from commit `1a53727`** — full file replacement
- Restores old `MinimalContentData` interface (flat raw props, no engine)
- Restores `WaybillMinimalContent({ data })` component (not `{ model }`)
- Restores `Checkbox` with `{ backgroundColor: '#000' }` style (not text checkmark)
- Restores direct `pdf` import from `@react-pdf/renderer` (not dynamic import)
- Restores `BlankTemplateOptions` interface for the public API
- Restores `downloadBlankWaybillTemplate` function with `document.body.appendChild(a)` pattern

### `src/pages/NewWaybill.tsx`
- **Handler `handleBlankDownload` restored** to match old commit's flat-props format
- Removes engine imports: `buildWaybillRenderModel`, `STANDARD_ITEM_COLUMNS`
- Passes flat props: `{ type, waybillNumber, date, companyName, companyAddress, companyLogoUrl, tagline, companyPhone, companyEmail }`

---

## What Was NOT Changed

- `src/components/waybill/WaybillGatewayOverlay.tsx` — blank download buttons unchanged
- `src/components/waybill/waybillMinimalStyles.ts` — shared styles unchanged
- `src/components/waybill/waybillUtils.ts` — utility functions unchanged
- Filled waybill template (`waybillTemplate.tsx`) — not modified

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` (full project) | ✅ Pass — only pre-existing CSR errors (unrelated) |
| `eslint` on changed files | ✅ Pass — no warnings |
| Git diff confirms exact restore | ✅ Diff matches old commit `1a53727` |

---

## Code Path

1. User clicks "Blank Download" button in `WaybillGatewayOverlay`
2. `onDownloadBlank(type)` fires → `handleBlankDownload` in `NewWaybill.tsx`
3. Handler calls `getNextWaybillNumber` with existing numbers from DB
4. Inserts to `blank_waybill_logs` with retry loop (up to 3 attempts on 23505)
5. On success: `await import('blankWaybillTemplate')` → `downloadBlankWaybillTemplate({ type, waybillNumber, ...companyInfo })`
6. Template renders `WaybillMinimalContent` with flat props into `pdf(element).toBlob()`
7. Downloads blob as `blank-{type}-waybill.pdf`

---

## Previous Attempt (Superseded)

Commit `b0609c0` fixed the engine-based template by removing hooks and replacing `require()` with dynamic `import()`. User requested exact restoration from old commit instead of modernization. This report supersedes that approach.
