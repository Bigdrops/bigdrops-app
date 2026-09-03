# CSR PDF Forensic Repair — Signature Layout, Call Type, System Down

## Summary

Fixed 3 bugs in the CSR PDF generation pipeline. All 23 tests pass, zero typecheck errors.

## Bugs Fixed

### Issue 1: Signature section — two-column layout broken; image rendering missing

**Root cause:** Each template (Zinc, Crimson, PulseFrame) rendered signature cards with inline JSX instead of the shared `PdfSignatureCard` component. The inline code varied per template:
- Some used `flexDirection: 'row'` but put the image and label in a nested `<View>` without the `flex: 1` two-card side-by-side layout.
- Some had the image inline with `<Image>` but the child layout suppressed the two-column split.
- `PdfSignatureCard` (used only by SignalBands) handles both cases correctly.

**Fix:** Replaced inline signature JSX in Zinc (lines 344-370), Crimson (lines 392-418), PulseFrame (lines 280-306) with `<PdfSignatureCard>` using symmetric `name`/`signatureUrl` props.

Also cleaned dead code: `AcknowledgementBlock` in `components.tsx` referenced non-existent `csr.recipient_signature_uri` field — removed the invalid prop.

**Files changed:** `Zinc.tsx`, `Crimson.tsx`, `PulseFrame.tsx`, `components.tsx`

### Issue 2: Call type "Paid Service" mapped to "Not Specified"

**Root cause:** `resolveCallTypeDisplay()` in `csrRenderModel.ts` only handled `BREAKDOWN/BD`, `MAINTENANCE/MNT`, `INSTALLATION/INST`, `OTHER`. The form sends values like `'Warranty'`, `'AMC'`, `'Paid Service'` which all fell through to the hardcoded `return 'NOT SPECIFIED'`.

**Fix:** Changed the fallback from `'NOT SPECIFIED'` to `return raw` (preserve the original string). Also changed null/empty input to return `''` (falsy) so templates using `hasText()` skip rendering.

### Issue 3: Blank fallback values for call_type and system_down

**Root cause:** Both `resolveCallTypeDisplay()` and `resolveSystemDownDisplay()` returned `'NOT SPECIFIED'` for null/empty input. `CSRPreviewPanel.tsx` guarded against this with `!== 'NOT SPECIFIED'` but the PDF templates had no guard — they rendered the literal text "NOT SPECIFIED" on the PDF.

**Fix:** Updated both resolver functions to return `''` for null/empty input. Simplified `CSRPreviewPanel.tsx` guards from `csr.callTypeDisplay && csr.callTypeDisplay !== 'NOT SPECIFIED'` to just `csr.callTypeDisplay`.

## Type Changes

- `CallTypeDisplay`: `'BREAKDOWN' | 'MAINTENANCE' | 'INSTALLATION' | 'OTHER' | 'NOT SPECIFIED'` → `string`
- `SystemDownDisplay`: `'DOWN' | 'OPERATIONAL' | 'NOT SPECIFIED'` → `string`

Both types are now `string` to allow preserving original unrecognized values.

## Test Results

```
✔ 23 tests pass, 0 failures
```

New assertions:
- `buildCsrRenderModel preserves Warranty call_type` → `'Warranty'`
- `buildCsrRenderModel preserves Paid Service call_type` → `'Paid Service'`
- `buildCsrRenderModel preserves AMC call_type` → `'AMC'`
- `buildCsrRenderModel resolves null system_down to empty` → `''`

## Verification

- `bun run typecheck` — clean (0 errors)
- `bun run test` (critical path) — 37/38 pass (1 pre-existing failure: `waybillImportCustomColumn.test.js` — unrelated, caused by missing `externalWaybillPrompt` module)
- `bun node --test "src/tests/csr/csrRenderModel.test.js"` — 23/23 pass
