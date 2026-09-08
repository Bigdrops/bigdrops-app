# Compliance Hub V2 Structural Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Implement the approved V2 structure for the Compliance Hub. Keep Reports unchanged. V1 prototype matches current Reports behavior, so no Reports code changed.

## Scope

- `src/pages/ComplianceHub.tsx` — header, section switcher, Tax Profile sheet.
- `src/components/compliance/ComplianceOverview.tsx` — link row to Reports.
- `src/components/compliance/ComplianceKpiStrip.tsx` — tabular figures.
- `src/components/compliance/RecordCaptureSheet.tsx` — adaptive sheet side.
- Reports module: no changes.

## Files changed

- `src/pages/ComplianceHub.tsx`
- `src/components/compliance/ComplianceOverview.tsx`
- `src/components/compliance/ComplianceKpiStrip.tsx`
- `src/components/compliance/RecordCaptureSheet.tsx`

## Skills used

Skills used: mobile-app-ui-design, redesign-existing-projects
Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

ASD-STE100 Simplified Technical English.

## Changes made

- Header uses one primary Record Expense action plus an overflow menu. Tax Profile moved into the menu. The menu uses the canonical shadcn DropdownMenu.
- One adaptive section switcher replaces the dual pill-scroll and desktop sidebar copies. It scrolls horizontally on narrow screens and docks as a sticky vertical rail at desktop widths.
- Switcher buttons show attention-count badges. Today shows total attention. VAT shows entry count. WHT, Filings, and Obligations show attention counts.
- Switcher buttons meet the 44px touch target. They use `aria-current="page"`.
- Page includes a skip link to the compliance content region.
- Tax Profile sheet and Record Capture sheet open as bottom sheets on mobile and side panels on larger screens. This reuses the existing `useLayoutMode` pattern from the WHT panel.
- Today view ends with an inline link row to `/reports`. The row states that tax position is read-only in Reports.
- KPI values use tabular figures.

## Verification result

- `bun run audit:load`: passed with pre-existing warnings only. The ComplianceHub broad-select warning predates this change. No new queries were added.
- `bun run typecheck`: passed with no errors.
- `git status`: only the four listed source files changed. Pre-existing modifications by other agents remain intact. Reports source files remain unchanged.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- Panel-internal sheets (VAT, filing, obligation, WHT detail, JSON imports) keep their current side behavior. Only the two header-owned sheets became adaptive.
- Badge counts derive from loaded client data. They do not replicate the full queue ranking in ComplianceOverview. Today badge sums section attention counts.
- The `/reports` link lands on the Reports landing tab. Deep links to a specific report tab require route support that does not exist yet.

## Deferred work

- Convert panel-internal sheets to bottom sheets on mobile.
- Add route support for deep links to a specific report tab.
- Re-evaluate the pre-existing broad `select('*')` calls flagged by the audit.
