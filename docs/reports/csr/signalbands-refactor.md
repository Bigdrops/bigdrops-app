# SignalBands Refactor Report

## Summary
Refactored `src/components/csr/preview-templates/SignalBands.tsx` to match the `Signal.html` design spec exactly.

## Changes

### 1. Header — Grid-cols-2 identity card (local component)
- Created `SignalBandsHeader` local component replacing `StructuredTopIdentity`
- Logo slot: 96×128 (from 48×48)
- Header bg: `#7e1f1f`
- Identity card uses 2-column grid (CSR Number | Date in one row)
- PO Number, Call Type, System Status stack vertically below
- `PdfLogoSlot` and `PdfBrandBlock` imported from shared components instead

### 2. Acknowledgement — Three-column layout
- Replaced `PdfSection` + `PdfSignatureCard` with raw `View` structure matching Signal.html
- **Top row** (if `showAcknowledgement`): Recipient Name (50%) | Comment (50%) with single border divider
- **Bottom row** (full-height): Recipient Signature (40%) | Technician Signature (30%) | Technician Name (30%) with 2px dividers
- Technician signature column renders `Image` when `getTechnicianSignatureUrl` is available
- Technician Name column displays bold name text

### 3. Style changes
- `ackGrid`, `signRow`, `signCard`, `signSpace`, `signLabel` removed
- Added `ackContainer`, `ackTopRow`, `ackTopHalf`, `ackTopHalfLast`, `ackBottomRow`, `ackRecipientSig`, `ackTechSig`, `ackTechName`, `ackFieldLabel`
- `identityGrid` changed to `flexDirection: 'column'` with new `identityRow`/`identityHalf` styles

### 4. Import cleanup
- Removed: `StructuredTopIdentity`, `DefectsFoundBlock`, `PdfSignatureCard`, `PdfSection`
- Added: `PdfLogoSlot`, `PdfBrandBlock`
- Added `const density`/`const compact` in component scope (used in ack padding)

### 5. Verification
- `bun run typecheck`: passed
- `bun run build`: passed
- No-touch zones respected (no changes to `Calculations.ts`, shared `components.tsx`, or waybill domain)
