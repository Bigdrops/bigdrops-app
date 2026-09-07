# FAB Bounce Propagation Report

This report was written by Muse Spark on 2026-09-07 via OpenCode.

## Objective

- Propagate the CSR Save FAB bounce to all applicable Save and Download FABs.
- Change nothing else about any FAB.

## Scope

- New shared motion CSS plus four component edits.
- No logic, layout, or dependency changes.

## Files changed

- `src/components/layout/fabFloat.css` (new)
- `src/components/layout/MobileFab.tsx`
- `src/components/csr/CsrFormScreen.tsx`
- `src/components/document-view/shared/FloatingDownloadButton.tsx`
- `src/components/document/FormFooter.tsx`
- `docs/reports/GENERAL/fab-bounce-propagation-2026-09-07.md` (this report)

## Skills used

Skills used: animate
Documentation standard: ASD-STE100 Simplified Technical English

## CSR forensics

- Reference: `MobileFab.tsx`, motion refined in commit `314cefed`.
- Float: `translateY 0 to -3px`, 4s ease-in-out, infinite, continuous from mount.
- Halo: opacity 0.35 to 0.55 plus scale 1 to 1.08, same cadence.
- Reduced motion disables both. Halo rests at opacity 0.4.

## Inventory

- Already animated (shared component, untouched behavior): CSR form save plus all list create FABs (CSR, Waybills, Projects, Clients, Invoices, Letters, BOQ, RFQ, Quotation, Journal, Periods).
- Updated here: CSR desktop save, CSR desktop download-blank, `FloatingDownloadButton` (all document views), `FormFooter` floating save (invoice and quotation forms).
- Excluded: create and add FABs (not Save or Download), `ProjectActionRail` (no save or download action), batch and dashboard panels (not FABs).

## Implementation

- Keyframes live once in `fabFloat.css`. `MobileFab` imports it and drops its inline style block. Output behavior identical.
- Targets wrap the button in a `csr-fab-float` span. The float must sit on an ancestor because a running transform animation overrides the button's own hover and active transforms.
- Halo excluded from targets. It is decorative CSR glow, not the bounce. Adding it would change appearance.
- Disabled states keep working. The download disabled rule even forces static via existing `!important`.

## Preservation

- Dimensions, position, shape, radius, colors, typography, icons, shadows, z-index unchanged.
- Click, save, download, loading, disabled, and success flows unchanged.
- Hover and press transforms preserved through wrapper placement.

## Verification

- `bun run typecheck`: passed, clean, repository-wide.
- `bun run audit:load`: skipped (no data-layer logic touched).
- `bun run build`: not run (hardware policy).
- `git diff`: five intended files. Concurrent work left untouched.
- No device or runtime visual check exists here. Motion values are byte-identical to the reference.
