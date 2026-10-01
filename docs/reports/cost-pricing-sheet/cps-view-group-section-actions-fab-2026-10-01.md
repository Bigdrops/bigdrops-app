# CPS View Group Section, Actions Sheet, and FAB Report

This report was written by Muse Spark on 2026-10-01 via OpenCode.

## Objective

- Replace the CPS View group pipe and frame treatment with a document-section presentation.
- Rebuild the CPS actions sheet on the shared sectioned sheet model with real production actions.
- Replace the hardcoded CPS download FAB with the approved semantic FAB implementation.

## Scope

- CPS View page presentation only.
- Group membership, actions sheet, and download FAB.
- No database change. No calculation change. No PDF engine change. No form change.

## Files changed

- `src/domain/cps/viewData.ts`
- `src/pages/ViewCps.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`

## Skills used

Skills used: karpathy, accessibility, vercel-react-best-practices, redesign-existing-projects
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Group presentation

- Removed the `GroupPipe` component and all pipe CSS and keyframes.
- Added `groupId` to CPS view rows. The field carries `row.group_id` for items. The field carries the section identity for group rows.
- Group letters follow section order (A, B, C). Standalone rows do not shift letters.
- Membership derives from `row.group_id`. Physical adjacency is not domain truth.
- Non-contiguous members keep their group letter and subtotal. Row order does not change.
- Each group renders a header band with letter, title, member count, and subtotal.
- Each member row keeps the normal CPS item-row markup and gains a 3px inset rail.
- Each group ends with an explicit end bar: "End of Group X" plus subtotal.
- Subtotals aggregate all members of the group, not only adjacent rows.
- Member rows include screen-reader text: "Member of Group X".

### Actions sheet

- Removed the flat CPS-only actions sheet.
- The sheet now uses the shared `DocumentMoreSheet` component.
- The sheet title uses CPS terminology: "Cost & Pricing Sheet actions".
- Sections: Document, Status, Danger Zone.
- Actions: Convert to Quotation, Duplicate, Customize PDF, status toggle, Archive, Delete.
- Each action uses an approved lucide icon: Zap, Copy, Palette, CheckCircle2, Archive, Trash2.
- No icon uses hand-written SVG.
- No BOQ terminology appears in the sheet.
- Convert, Archive, and Delete use the shared `DocumentConfirmDialog`.
- Edit stays in the page headers. The sheet does not duplicate it.
- Download PDF and Export CSV are omitted. The View page has no implementation for them.

### Action wiring

- `ViewCps` wires the existing helpers from `src/pages/view-cps-actions.ts`.
- Convert maps section rows to the group-header shape before it calls the helper.
- Convert preserves CPS to Quotation provenance (`source_cps_id` and trail link).
- Duplicate navigates to the new sheet. Convert navigates to the new quotation.
- Archive and Delete navigate to the sheet list.
- Status toggles between open and approved and updates local state.

### Download FAB

- Removed the hardcoded `.cps-view-fab` button and its geometry CSS.
- Removed CPS-owned FAB variables `--fab-bg` and `--fab-text`.
- The View now renders the canonical `FloatingDownloadButton`.
- The standard owns geometry, icon, motion, and interaction states.
- CPS keeps only a positioning wrapper (`.cps-fab-slot`) with the contextual offset that clears the mobile bottom navigation.
- FAB behavior is unchanged. No CPS PDF download pipeline exists.

## Verification result

- `bun run typecheck`: passed.
- Focused CPS tests (`cpsNormalize`, `cpsImportView`, `cpsInstantMarkup`): 34 passed, 0 failed.
- `git diff --check`: passed.
- `git status`: only the four listed files changed. Pre-existing changes from another agent were not touched.
- Shared components were not modified. Invoice, Quotation, Waybill, RFQ, and CSR consumers are unaffected.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

- Supabase push status: not applicable. No schema or migration change occurred.

## Risks or limitations

- The download buttons and FAB have no handler. No CPS PDF renderer exists in the repository. A PDF pipeline is a separate task.
- Export CSV has no View-level implementation. The list page owns export. A single-document export is a separate task.
- Groups beyond 26 sections reuse letter codes. Large sheets with many groups need an extended scheme.

## Deferred work

- CPS PDF download pipeline (renderer plus download handler).
- Single-document CSV export for the CPS View page.
- Removal of the CPS-owned mobile bottom navigation in favor of the shared navigation shell.
