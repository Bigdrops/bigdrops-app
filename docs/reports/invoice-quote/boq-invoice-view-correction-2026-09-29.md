# BOQ V4.1 / Invoice V1 View Correction Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Rejection reasons

1. Group containers in BOQ V4.1 and Invoice V1 were still
   card-based design: a rounded, bordered, tinted box around each
   group merely moved the card boundary from items to groups.
2. Invoice V1 dropped production capabilities: Customize and
   Audit Trail had no representation.

## Files inspected

- The four candidates (V4.1 mobile/desktop, Invoice V1
  mobile/desktop) and their latest reports.
- Production: `src/pages/ViewInvoice.tsx`,
  `src/components/document-view/invoice/InvoiceWorkspace.tsx`,
  `InvoiceDocumentCard.tsx`, `InvoiceMoreSheet.tsx`,
  `InvoicePaymentsSection.tsx`, `InvoiceRecordPaymentSheet.tsx`,
  `InvoiceTopNav.tsx`, `InvoiceOperationalSections.tsx`,
  `sections/ActivityCard.tsx`, `useInvoiceActions.ts`,
  `src/components/document-view/shared/DocumentTopNav.tsx`
  (palette icon, Customize entry), `DocumentCustomizeCard.tsx`,
  `InvoiceOverlays.tsx` (Customize Invoice PDF sheet),
  `src/domain/invoice/calculations.ts`, `financialState.ts`,
  `resolveInvoiceStatus.ts`, `previewModel.ts`,
  `invoiceViewMockData.ts`.
- Standards: fab-standard v1.1, document-image-upload-policy,
  document-transformation-standard. (The working-tree
  modifications to two standards files predate this task and
  belong to another agent; this task changed no standard.)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design.
`frontend-design` is not registered in docs/PROJECTSKILLINDEX.md
and was not loaded.

## Group-card removal

All `.grp` container rules, headers, footers, and wrappers are
gone from all four files (verified: zero matches for
`class="grp"`, `grp-head`, `grp-foot`, `grp-items` across the
view directory). Groups now read as hierarchy on the continuous
surface: an explicit "GROUP X" header (kicker, title, count,
ghost letter, 2px top rule), flat rows in the shared row
language, and a "Group total" / "Group subtotal" close row. No
tint, no radius, no perimeter border, no shadow, no nested cards.

## Standalone-row states

BOQ sample is now: 01 standalone no-photo, 02 standalone with
photo, Group A (03 with photo, 04), 05 standalone no-photo.
Invoice sample is now: Group S (01 with photo, 02), 03
standalone no-photo, 04 standalone with photo. Together they
demonstrate every required state: standalone with and without
photo, consecutive standalone rows, grouped rows, and
group-to-standalone plus standalone-to-group transitions.
Numbering stays continuous. Grouped and ungrouped rows share one
row language. No item cards returned. Financial values are
unchanged (BOQ 6,158,090 / 7,237,000 / 1,078,910; Invoice
subtotal 4,150,000, total 4,720,000, received 2,000,000, balance
2,720,000, 42%; Group A selling 4,382,000; Group S 3,380,000 —
all re-verified with bun).

## Customize restoration

Production entry: top-nav palette icon button (exact SVG in
`DocumentTopNav.tsx`, aria "Customize PDF template, fonts and
colors") opening the "Customize Invoice PDF" sheet with
`DocumentCustomizeCard` (accent, template, fonts; persists to
PDF output). Both Invoice candidates now carry the same palette
button in the same position (share, customize, more) opening a
"Customize Invoice PDF" demo sheet with theme/template/font rows
and an apply action (demo toast, no persistence). Share, More,
Download, and Record Payment are untouched.

## Audit Trail restoration

Production exposure is an in-flow "Activity & History"
collapsible card (`sections/ActivityCard.tsx`, lazy
`useAuditTrail`, actor + action rows with mono timestamps and
expandable field changes) — not a More-menu action. Both
Invoice candidates now carry an in-flow "Activity & History"
disclosure after linked documents with three sample events in
the production row shape, including one Status Unpaid →
Partially Paid change line. Collapsed by default, like
production.

## Capability matrix

Production capability → production entry → candidate →
status. All preserved or recomposed unless noted.

- Back → top nav → appbar back → preserved.
- Share → top nav → appbar share → preserved.
- Customize PDF → top-nav palette → palette button + demo
  sheet → restored.
- More → top nav → sectioned sheet → preserved.
- Record Payment → action-row primary → action-row / rail
  primary + demo sheet → preserved (recomposed, demo).
- Edit → action row → dossier / top bar → preserved.
- Download → action pill + FAB → see Download section →
  preserved.
- Revert to Quotation → More/Lifecycle → same → preserved.
- Generate Waybill → More/Lifecycle → same → preserved.
- Advance Invoice → More/Payments → same → preserved.
  (The conditional advance card has no sample advance to show;
  documented, not missing.)
- Link to Project → More/Common → More sheet → preserved
  (recomposed section).
- Duplicate → More/Common → More/Document → preserved.
- Copy Invoice Number → More/Common → More/Document →
  preserved.
- Export CSV → More/Common → More/Document → preserved.
- Qty + Unit merge → More/Common + options card → More row
  with working demo toggle → restored (options-card surface
  folds into the Customize flow; documented).
- Archive / Delete → More/Danger → same with two-tap
  confirm → preserved.
- Void payment → history-row tap → history-row tap demo →
  preserved (recomposed, demo).
- Bank selection → BankDetailsCard → static bank panel →
  recomposed (selection is PDF-output config, reached via
  Customize; documented).
- PDF output options → options card → Customize sheet →
  recomposed.
- Related docs → operational sections → linked list →
  preserved (recomposed).
- Activity & History → in-flow card → in-flow disclosure →
  restored.
- Derived status, payment history, signatory fallback, amount
  in words, totals, client/PO/dates, groups, thumbnails →
  preserved.

Nothing is silently discarded.

## Download entry points (deliberate, not mechanical)

- Mobile BOQ: Download FAB + labeled close-out button + More
  menu row.
- Desktop BOQ: top-bar button + More menu row. No FAB.
- Mobile Invoice: Download FAB + labeled action-row button +
  More menu row. (The close-out Download button was removed to
  avoid a fourth duplicate; the action row is the labeled path.)
- Desktop Invoice: top-bar button + rail button + More menu
  row. No FAB.
All follow fab-standard v1.1 where a FAB exists.

## Preserved behavior

V4.1 document-family language, thumbnails + lightbox, exposed
BOQ commercial rows, invoice payment semantics, derived
Partially Paid status, client/PO/dates, Qty/Rate/Amount rows,
totals, received/WHT/balance, progress/history, bank/signatory/
linked docs, responsive compositions, bottom nav + clearance,
dark mode, mock-data math.

## Files changed

In place only (no V5, no Invoice V2, no new versions):

- `.../view/boq/boq-view-candidate-mobile-fold-v4.1.html`
- `.../view/boq/boq-view-candidate-desktop-v4.1.html`
- `.../view/invoice/invoice-view-candidate-mobile-fold-v1.html`
- `.../view/invoice/invoice-view-candidate-desktop-v1.html`
- `docs/reports/invoice-quote/boq-invoice-view-correction-2026-09-29.md`
  (new, this file)

## Verification

- `git status` before and after: captured. Pre-existing
  modifications, deletions, and untracked files belong to other
  agents and are untouched.
- `git diff --check`: passed (whitespace clean).
- No production `src/` file changed; no migration, standard,
  PRD, form, or old-candidate file changed by this task
  (standards diffs in the tree predate this task).
- Exactly the four intended candidate files changed plus this
  report: confirmed.
- Group-box selectors extinct in all four files: confirmed.
- Standalone states present in both domains: confirmed.
- Customize + Audit Trail present in both Invoice files:
  confirmed.
- Locked math re-verified with bun (figures above).
- Build, typecheck, lint, audit:load, browser, Supabase: not
  run. Excluded by the task and the hardware gate.

## Supabase push status

Not applicable. No SQL changed.

## Human visual review still required

Group-header hierarchy without boxes, standalone-vs-grouped
legibility, thumbnail scale, Customize sheet fidelity, audit
section weight, Download hierarchy, dark mode, desktop rail
balance, and end clearance above app chrome.
