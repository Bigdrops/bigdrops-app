# CSR Acknowledgement Section Redesign

**Date:** 2026-06-26  
**Templates Modified:** Crimson, Zinc  
**Reference:** SignalBands (read-only, not modified)

---

## Problem

- **Crimson**: Labels were vertically centered in their containers due to `paddingVertical` on `ackTopHalf`/`ackTopHalfLast`, not sitting flush at the top ("ceiling") as in SignalBands.
- **Zinc**: Used a completely different layout structure (`fieldCard` + `blockCard` + `PdfSignatureCard`) instead of the SignalBands split-row pattern. Labels were centered, not ceiling-positioned.

## Changes

### Crimson (`Crimson.tsx`)

**Styles (lines 230-238):**
- `ackTopHalf`/`ackTopHalfLast`: Changed from `paddingVertical: N` → `paddingTop: 3-4` + `paddingBottom: 20-24` so labels sit flush at top while leaving space for handwriting below.
- `ackContainer`, `ackTopRow`, `ackBottomRow`, `ackFieldLabel`: Added/adjusted to match SignalBands split-row structure.

**JSX (lines 386-442):**
- No structural changes — existing layout already matched SignalBands pattern.
- Added missing `compact` variable declaration (line 256).

### Zinc (`Zinc.tsx`)

**Styles (lines 176-184):**
- Added new acknowledgement styles: `ackContainer`, `ackTopRow`, `ackTopHalf`, `ackTopHalfLast`, `ackBottomRow`, `ackRecipientSig`, `ackTechSig`, `ackTechName`, `ackFieldLabel`.
- Border colors use `#e4e4e7` (zinc palette) vs Crimson's `#e2e8f0` (slate palette).

**JSX (lines 335-389):**
- Replaced `fieldCard`/`blockCard`/`PdfSignatureCard` approach with SignalBands-style split-row layout:
  - **Top row**: 50/50 split (Recipient Name | Comment)
  - **Bottom row**: 40% Recipient Signature | 30% Technician Signature | 30% Technician Name

**Imports:**
- Removed unused `PdfSignatureCard` import.
- `Image` was already imported.

## Verification

| Check | Status |
|---|---|
| `bun run audit:load` | ✅ Pass (no new issues) |
| `bun run typecheck` | ✅ Pass |
| `bun run build` | ✅ Pass |
| Headless PDF generation (4 templates) | ✅ All generated |

## Files Modified

| File | Lines Changed |
|---|---|
| `src/components/csr/preview-templates/Crimson.tsx` | +2 (compact variable), style tweaks |
| `src/components/csr/preview-templates/Zinc.tsx` | ~80 lines (styles + JSX rewrite) |

## Files NOT Modified

- `SignalBands.tsx` — reference only
- `Minimal.tsx` — not in scope
- `components.tsx` — shared components untouched
- `types.ts`, `layoutModel.ts`, `utils.ts` — no changes
