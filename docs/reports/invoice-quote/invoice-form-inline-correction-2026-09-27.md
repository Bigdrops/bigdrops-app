# Invoice Form Inline Prototype Correction Report

This report was written by Qwen on 2026-09-27 via Local Runner.

## Objective

Rebuild the Invoice phone + fold authoring prototype so it represents the real BIGDROPS Invoice workflow through the accepted BOQ V11 structural design language.

## Scope

- Target: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-inline.html`
- Structural reference: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v11.html` (not modified)
- Semantic reference: live Invoice React implementation (not modified)

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-inline.html` (rewritten, 2112 lines)

## Skills used

- html-prototype
- mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Audit summary

### BOQ V11 (structural reference only)

Reused: mobile-first continuous document flow; segmented enumeration rail (number / move / duplicate); compact Sub Description behavior (empty add row, clamped actual-text preview, tap-to-edit, collapse on empty blur); inline Columns / Import / Clear all tools; numeric thousands separators with caret anchoring; phone FAB + end-of-form labeled Save + fold top-bar Save; edge-to-edge expanded groups; fold recomposition into identity column + data column; dark mode; large-phone breakpoint.

Excluded from BOQ: CP, SP, line profit, total cost, gross profit, margin, vendor/contractor, BOQ terminology.

### Live Invoice implementation (semantic authority)

Verified in repository source, not from candidate comments:

- `src/pages/InvoiceFormPage.tsx` — document type, identity lock in edit mode, save orchestration.
- `src/components/document/SharedDocumentForm.tsx` — shared form section order: header, line items, commercial terms, totals, notes/terms, footer.
- `src/components/document/FormHeader.tsx` — client picker (dashed trigger, locked when saved), title, invoice no (locked in edit), PO no, issue/due dates, header fields.
- `src/components/document/FormLineItems.tsx` — inline Import / Settings / Clear tools, groups, add item / add group.
- `src/components/invoice/MobileItemCard.tsx` — description with Item Library suggestions, sub-description collapse, photo upload, Make / Qty / Unit / Rate / Part No. / Condition / Install / VAT % / Disc % compact inputs, row subtotal readout, move / duplicate / remove / insert-below.
- `src/modules/item-library/hooks/useItemSuggestionEngine.ts` — suggestions trigger at 2+ focused characters; selecting a suggestion sets description + item_id + unit_price; price label priority Client last, Last used, Standard; meta line with alias / uses / last document; price context with Use-price action; typing clears the item link.
- `src/domain/invoice/columns.ts` — nine builtin columns (description fixed; quantity, make, unit, unit_price, amount non-removable; install_rate with formula; vat_rate, discount_rate nullable overrides); custom columns stored in item.custom_data; Part No. / Condition exist only as custom columns.
- `src/domain/invoice/calculations.ts` — row discount (row override or global percent; fixed discount distributed proportionally when no row overrides), VAT base depends on discount timing, extra charges split taxable / non-taxable, WHT on grand total minus VAT, total payable.
- `src/hooks/useInvoiceSave.ts` — validation: client required, at least one item with description.
- `src/components/document/FormCommercialTerms.tsx` — payment terms select, due/validity note, discount value/type/timing, VAT rate, WHT rate/unit, additional charges with withTax toggle, additional fields.
- `src/components/document/FormTotals.tsx` — summary rows, VAT quick-adjust pill, amount in words, grand total.
- `src/components/document/FormNotesTerms.tsx` — editable notes/terms titles, signatory picker, reference links.
- `src/components/ClientSelector.tsx` — client search, add new client.

### Reconcilization outcome

The full reconciliation matrix (capability x old prototype x live x decision) was built before editing. Decisions: keep all live Invoice capabilities; represent Part No. / Condition as custom columns per the live architecture; expose no BOQ-only concept.

## Changes made

1. Rebuilt the prototype on the BOQ V11 skeleton: same design tokens, top bar, section numbering, rail anatomy, group treatment, save surfaces, sheets, dark mode, fold and large-phone breakpoints.
2. Replaced BOQ commercial semantics with the live Invoice row contract: Qty | Unit, Rate | VAT %, Disc % | Install, Amount bar (Qty x Rate - row discount).
3. Implemented the Item Library authoring interaction: suggestion dropdown on the description field (open on the first demo row), price label (Client last / Last used / Standard), meta line (alias / uses / last document), price context with Use-price button on the linked demo row, typing clears the item link, manual descriptions remain possible.
4. Ported the real Invoice column manager: fixed Description row, nine builtins with editable labels, NUM badges, visibility switches, totals-affecting switch, install-rate formula sub-input, custom columns (Part No., Condition included) with delete, add custom column, reset with confirm, and the Row Overrides section.
5. Ported the live calculation pipeline: row discount / VAT / WHT / extra charges / fixed charges (workmanship, transportation, shipping) / install totals / grand total / total payable / amount in words, with discount timing (before / after VAT) and discount type (NGN / %).
6. Added Invoice document sections: document type segmented control (Invoice / Quotation), client picker sheet with search and add-new-client, linked project, header fields, payment terms + due/validity, commercial terms collapse cards, VAT quick-adjust pill, supporting info (editable notes/terms titles, signatory picker, reference links, bank account switcher, PDF output toggles).
7. Save validation matches live: client required, at least one item with description, per-row description check with error highlight; saved state locks the client picker and flips the Draft badge to Saved.
8. Import sheet follows the live invoiceImportAdapter contract (items, groups, title, notes, terms, extra_charges, columns).

## Verification

- node --check on the extracted inline script: passed.
- Handler reference check: all 64 inline event handlers have definitions; all render helpers are referenced.
- Tag balance check: no imbalances.
- Visible-text scan: no BOQ business terms (CP / SP / profit / margin / vendor / BOQ) outside comments and CSS class names.
- Invoice-native terms present: VAT, WHT, discount, grand total, payment terms, signatory, bank, subtotal, install, client, invoice, quotation.
- git status: only the target file modified. No live React, BOQ, SQL, schema, or unrelated files touched.
- bun run build: skipped due to hardware policy.
- bun run typecheck / lint / Playwright / browser automation: not run per task constraint D. Human visual verification is reserved for the user.

## Supabase push status

Not applicable.

## Risks or limitations

- The Item Library catalog is a prototype stand-in for the live suggestion service; the interaction shape, not real data, is demonstrated.
- Photo upload is represented with a generated placeholder thumbnail, not a real file picker.
- Desktop layout is out of scope per the task; the fold breakpoint (600px) is the widest composition represented.
- Focus and caret behavior after re-render is prototype-grade; the live React implementation preserves focus through component keys rather than innerHTML replacement.

## Deferred work

- Desktop Invoice prototype (separate task).
- Real client search API wiring in the client picker sheet.
