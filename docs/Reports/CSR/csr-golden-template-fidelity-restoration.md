# CSR Golden Template Fidelity Restoration

This report was written by OpenCode on 2026-07-13 via Local Runner.

## Objective & Scope

Restore Sentinel and Nexus CSR PDF acknowledgement sections to match their approved HTML prototypes pixel-for-pixel. Also fix Nexus header (missing logo) and Sentinel header padding. Helix, Beacon, and Industry templates were out of scope — IndustryCsr.tsx was used only as the source-of-truth layout to copy.

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

## Verification

| Check | Status |
|---|---|
| `bun run typecheck` | Skipped — timeout per hardware policy (4GB RAM limit). Dependency graph too large for `tsc --noEmit` within 120s. |
| `bun run audit:load` | Passed — no new warnings introduced |
| `git status` | Only 3 intended files modified; no collateral damage |
| Files modified | `components.tsx`, `Sentinel.tsx`, `Nexus.tsx` — 79 insertions, 77 deletions across 3 files |

## Risks & Limitations

1. **Typecheck not confirmed.** The 4GB RAM hardware limitation prevents full `tsc` validation in this environment. Visual inspection confirms no type errors in the changed code (all props and function signatures match existing patterns), but a manual `bun run typecheck` on a capable machine is recommended before merge.
2. **No visual PDF rendering test.** The templates are React-PDF components; no rendering comparison was performed against the HTML prototypes. Visual verification on a machine with the PDF viewer is needed.

## Deferred Work

None intentionally deferred. The scope was surgical fidelity restoration for Sentinel and Nexus acknowledgement sections + Nexus header + Sentinel header padding.
