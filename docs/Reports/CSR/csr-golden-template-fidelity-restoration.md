# CSR Golden Template Fidelity Restoration

This report was written by OpenCode on 2026-07-13 via Local Runner.

## Objective & Scope

Restore Sentinel and Nexus CSR PDF acknowledgement sections to match their approved HTML prototypes pixel-for-pixel. Fix Nexus header (missing logo). Adjust Sentinel header padding to match HTML. **Follow-up pass:** Reduce header vertical footprint on both templates to eliminate the "Megamind" regression (over-padded headers pushing one-page CSRs onto a second page). Helix, Beacon, and Industry templates were out of scope.

## Evidence

All findings are based on direct comparison of:
- `docs/TEMPLATES/htmltemps/CSR/Sentinel.html` — the Sentinel spec
- `docs/TEMPLATES/htmltemps/CSR/Nexus.html` — the Nexus spec
- `src/components/csr/preview-templates/Sentinel.tsx` — React-PDF target
- `src/components/csr/preview-templates/Nexus.tsx` — React-PDF target
- `src/components/csr/preview-templates/IndustryCsr.tsx` — layout source of truth for acknowledgement block
- `src/components/csr/preview-templates/components.tsx` — shared components

## Changes Made

### 1. `components.tsx` — Shared `AcknowledgementBlock`

Replaced the old four-field grid + two signature cards with the IndustryCsr layout:
- Bordered container (`ackContainer`)
- Top row: Recipient Name (left half) | Comment (right half)
- Bottom row: Recipient Signature (40%) | Technician Signature (30%) | Technician Name (30%) — separated by brand accent color borders
- Added `getLayoutDensity` to imports
- Preserved conditional rendering: hidden when both flags are off

### 2. `Sentinel.tsx` — Header Padding & Ack Styles

- Increased `headerBg.paddingVertical` from `tight ? 8 : 10` to `tight ? 12 : 16`, `paddingHorizontal` from `tight ? 10 : 12` to `tight ? 14 : 17` — matches HTML `5.5mm 6mm 4mm 6mm` (~15.6pt top, 17pt sides, 11.3pt bottom)
- Added ack styles (`ackContainer`, `ackTopRow`, `ackTopHalf`, `ackTopHalfLast`, `ackBottomRow`, `ackRecipientSig`, `ackTechSig`, `ackTechName`, `ackFieldLabel`) — gold/bronze accent borders matching Sentinel brand

### 3. `Nexus.tsx` — Header Logo, Ack Styles, Signature Replacement

- Added imports: `PdfLogoSlot`, `PdfBrandBlock`, `AcknowledgementBlock` from `./components`
- Replaced `<Text style={styles.companyName}>` in header with `<PdfLogoSlot>` + `<PdfBrandBlock>` — matches HTML logo (38x38) + brand/subtitle
- Removed `getTechnicianName`, `getTechnicianSignatureUrl` from imports (no longer used directly)
- Replaced `renderSignatureNexus(styles, csr, tight)` with `<AcknowledgementBlock styles={styles} csr={csr} />`
- Deleted the entire `renderSignatureNexus` function (~55 lines)
- Added ack styles with plum accent borders matching Nexus brand

### 4. `Sentinel.tsx` — Header Height Reduction

- `headerBg.paddingVertical: tight ? 12 : 16` → split into `paddingTop: tight ? 6 : 8, paddingBottom: tight ? 3 : 4` — reduces total vertical padding from 12/16 to 9/12
- `logoSlot` reduced from 44×44 to 36×36
- `logoImage` reduced from 48px to 38px (matches HTML prototype)
- `companyTagline.marginTop` reduced from 2 to 1
- `contactLine.marginTop` reduced from 2 to 1

### 5. `Nexus.tsx` — Header Height Reduction

- `header.paddingVertical: tight ? 10 : 12` → split into `paddingTop: tight ? 6 : 8, paddingBottom: tight ? 3 : 4` — reduces total vertical padding from 10/12 to 9/12
- `logoImage` reduced from 48px to 38px (matches HTML prototype)

## Verification

| Check | Status |
|---|---|---|
| `bun run audit:load` | Passed — no new warnings introduced |
| `git status` | Only 2 intended files modified (`Sentinel.tsx`, `Nexus.tsx`); `components.tsx` unchanged since previous session; `pdf-new/index.ts` restored from unintended diff |
| Files modified (this pass) | `Sentinel.tsx` — 5 lines changed; `Nexus.tsx` — 2 lines changed |
| Cumulative (both passes) | `components.tsx`, `Sentinel.tsx`, `Nexus.tsx` — ~86 insertions, ~84 deletions across 3 files |

## Risks & Limitations

1. **No visual PDF rendering test.** The templates are React-PDF components; no rendering comparison was performed against the HTML prototypes. Visual verification on a machine with the PDF viewer is needed.
2. **The previous header padding increase (`tight ? 12 : 16`) caused the "Megamind" regression.** This follow-up pass reduces header vertical footprint below even the original values by splitting `paddingVertical` into asymmetrical `paddingTop`/`paddingBottom` (more top, less bottom) to match the HTML prototypes' 3mm / 1mm distribution.

## Deferred Work

None intentionally deferred. The scope was surgical fidelity restoration for Sentinel and Nexus acknowledgement sections, Nexus header logo, Sentinel header padding, and header height reduction across both templates.
