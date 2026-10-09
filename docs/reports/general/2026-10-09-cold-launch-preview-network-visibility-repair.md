# Cold Launch Preview Network Visibility Repair

## Summary

Repaired the `/cold-launch-preview` tenant network preview. The update keeps the preview isolated from production startup and improves the visible core network, featured product labels, and simulated connectivity failure and retry behavior.

## Files Changed

- `src/components/cold-launch/PreviewTree.tsx`
- `src/pages/ColdLaunchPreview.tsx`

## Implementation Notes

- Replaced generic workspace labels with product-facing groups: Pre-Sales, Business Operations, and Finance & Service.
- Added featured product nodes for RFQ, Cost & Pricing Sheets, Quotation, Invoice, Waybill, Customer Service Reports, and Payments.
- Split the visual topology into visible core nodes and decorative extension branches.
- Kept the real BIGDROPS launcher artwork as the central visual anchor.
- Added affected-path fragments, failing signals, affected node dimming, and a staggered recovery wave for the preview-only Connection Error state.
- Kept the tree mounted across Normal, Connection Error, and Retry transitions.
- Continued to use existing theme CSS variables for accent, signal, label, warning, and error colors.

## Verification

- `bun run typecheck` passed.
- `bun run build` was not run.
- `bun run audit:load` was not run because no schema, query, or data-layer logic changed.
- Static startup-file check showed no changes to `src/App.tsx`, `src/components/app/SplashOverlay.tsx`, `src/components/app/TenantGate.tsx`, `src/components/app/UpdateGate.tsx`, `src/components/app/BiometricGate.tsx`, or `src/domain/tenant/tenantGate.ts`.

## Remaining Visual Risks

- Browser chrome on very short mobile screens can still reduce the perceived lower safe area. The preview now reserves the lower text region, but a device pass is still useful.
- The retry timing is simulated for preview only and may need small tuning after a visual pass on a physical foldable device.
