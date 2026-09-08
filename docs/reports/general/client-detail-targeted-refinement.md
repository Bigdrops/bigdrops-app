# Client Detail Targeted Refinement Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Apply four targeted refinements to the Client Detail renovation without
redesigning it: compact header, Export Statement UI control, quotation
statistic, and Tax Summary with responsive placement.

## Scope

- `ClientIdentityBar.tsx`, `MoneyPositionStrip.tsx`, `ClientDetail.tsx`
  composition, new `TaxSummary.tsx`.
- No loader, query, permission, route, or business-logic changes.

## Files changed

See Scope list plus this report.

## Skills used: mobile-app-ui-design, mobile-android-design, shadcn, tailwind-capacitor

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Header: client name reduced to a compact 13px semibold line with a
  flexible central region. Overflow menu removed. Direct Edit pencil
  action restored. Header actions are now Back, Name, Export, Edit.
  All targets meet 44px. Header height reduced.
- Export Statement: FileOutput icon (lucide match for the file_export
  reference) beside Edit. UI-only by instruction: marked
  `aria-disabled`, named "Export statement", no workflow, navigation,
  query, or state attached.
- Quotation statistic: count from existing quotation data shown as a
  subordinate Commercial stats row inside Money Position. No quotation
  amount enters Outstanding, Invoiced, or Collected. No equal-weight
  KPI grid reintroduced.
- Tax Summary: new component with VAT Paid, VAT Unpaid, Total VAT, and
  WHT per the specified meanings. Placed beside Money Position on
  tablet and desktop (3:2 grid), stacked below it on phones.
- Tax data boundary (Section 8 stop condition): the required values are
  not in the current client data load. The invoice select lacks the
  authoritative `vat` and `wht` columns. The financials select lacks
  `wht_received`. Canonical formulas live in `useDashboardData`
  (paid = balance_due <= 0; WHT outstanding = max(0, invoiceWht -
  wht_received)). The section renders an explicit pending state.
  No values were invented. A follow-up data task must extend those
  selects.

## Verification result

Verification:

- `bun run typecheck`: passed (after one JSX nesting fix, re-verified)
- `bun run audit:load`: skipped (no schema, query, or data-layer changes)
- `bun run build`: not run (memory ban)
- `git status`: changes limited to the Scope files plus this report
  (plus another agent's pre-existing untracked vendor directory)
- Runtime or device test: not performed (no claim made)

## Risks or limitations

- Tax Summary shows a pending state until the data task lands. This is
  honest but visually quieter than specified.
- Export control is intentionally inert. Users may try it before the
  report architecture exists.

## Deferred work

- Data task: add `vat`, `wht` to the client invoice select and
  `wht_received` to the financials select, then pass real values to
  `TaxSummary`.
- Statement export report architecture and wiring for the Export action.
- Device pass for the new header and Money plus Tax grid.
