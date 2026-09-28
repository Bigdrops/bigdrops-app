# Invoice Form V3 Design Candidates Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Correct the Invoice form design direction after human review rejected the V2
approach.

The V2 candidates moved too far away from the accepted BOQ form structure and
invented a different Invoice architecture. V3 does not iterate from V2.

V3 evolves the accepted Invoice visual baseline:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-inline.html
```

Two separate standalone HTML candidates were produced:

1. A PHONE + FOLD candidate.
2. A DESKTOP candidate.

The pair covers one architecture in two files. The result reads as the Invoice
sibling of the accepted BOQ V11 prototype.

## Interpretation of the desktop instruction

The task brief forbids an unrelated application shell and a new left
navigation rail. The user then stated that the desktop does not need to
conform to BOQ.

The two statements were resolved as follows:

- The desktop is NOT required to reproduce the BOQ V11 mobile grammar. It does
  not use the fold identity/data split, and it is not a stretched phone layout.
- The desktop IS still a composition of the same Invoice document form. It
  keeps the numbered section hierarchy, the section-header rhythm, the item
  anatomy with its enumeration rail, the edge-to-edge groups, and the inline
  Columns / Import / Clear all tools.
- No application shell, no left navigation rail, and no dashboard was added.

Where the desktop departs from BOQ V11, the reason is width: the item row is
recombined into two zones on one line, one section renders at a time through a
sticky section index, and the sheets become centred dialogs.

## Scope

In scope:

- Audit `invoice-form-inline.html` in full.
- Audit BOQ V11 for the structural grammar.
- Audit the rejected V2 candidates to identify what review rejected.
- Audit the V1 candidates for structural ideas only.
- Audit the live Invoice form components, domain logic, Column Manager, and
  Item Library suggestion behavior.
- Write a capability checklist before implementation.
- Produce two new standalone HTML candidates and this report.

Out of scope, and not touched:

- React application source, SQL, migrations, Supabase, Android, workflows.
- `invoice-form-inline.html` itself. It is the baseline and is preserved.
- BOQ V11. It is read only.
- The V1 and V2 candidates. They are preserved.

## Audit findings

### `invoice-form-inline.html` (primary visual baseline)

2 211 lines. 13 numbered CSS areas plus a 1 330-line script. It already
implements the complete Invoice surface:

- Tailwind-free token system (Manrope + DM Mono, slate ink, navy accent),
  light and dark themes.
- Sticky top bar with a status badge, a layout chip and a labelled Save.
- Five numbered sections: Document details, Line items, Commercial terms,
  Totals, Supporting info.
- Client picker with search and add-client sheets, a locked saved state.
- Document type segmented control, title, number, PO number, dates, linked
  project, custom header fields.
- A segmented enumeration rail with move, duplicate, insert-below and delete.
- Description with the Item Library suggestion listbox, the suggestion meta
  line and the price-context strip with the use-price action.
- Sub Description with the accepted compact behavior.
- Row fields Make / Quantity / Unit / Rate plus optional Install, VAT and
  Discount rates and custom columns.
- Edge-to-edge groups with a subtotal toggle and an add-item row.
- Six commercial term cards, including Fixed Charges.
- Totals with a VAT quick-adjust pill and amount in words.
- Supporting info: notes and terms with editable titles, signatory picker,
  reference links, bank account, PDF toggles.
- Column Manager with fixed Description, ordering, labels, TEXT/NUM badges,
  visibility and totals switches, the install-rate multiplier, custom columns,
  reset with confirmation, and Row Overrides.
- Save validation and a saved state that locks the client picker.

Conclusion: the baseline is complete, not partial. V3 therefore refines and
completes rather than rebuilds.

### BOQ V11 (structural authority)

Read for the structural grammar only: continuous document flow, numbered
section headers with a rule and a meta cell, segmented enumeration rail,
compact Sub Description, inline Columns / Import / Clear all, edge-to-edge
expanded groups, phone FAB plus end-of-form Save, fold recomposition, dark
mode, and the large-phone breakpoint.

No BOQ commercial concept was read into Invoice.

### Rejected V2 candidates

`invoice-form-candidate-desktop-v2.html` introduced a fixed left module rail,
a command bar, and a table with a column header row. That is an application
shell and a different document architecture.

`invoice-form-candidate-mobile-fold-v2.html` replaced the BOQ rail anatomy with
a thin index gutter and moved the document into a card stack.

V3 avoids both: the baseline anatomy is preserved, and the desktop file adds no
shell.

### V1 candidates

Reviewed for structural ideas only. V1 additionally carries BOQ commercial
terminology (CP, SP, line profit, gross profit). No V1 content was reused.

### Live Invoice implementation

The semantic authority for every field and every behavior, as audited in the
prior session and re-confirmed here:

`InvoiceFormPage`, `SharedDocumentForm`, `FormHeader`, `FormLineItems`,
`FormCommercialTerms`, `FormTotals`, `FormNotesTerms`, `FormFooter`,
`MobileItemCard`, `mobileFormPrimitives`, `ColumnManager`,
`useInvoiceColumns`, `PdfOutputSettings`, `domain/invoice/types.ts`,
`domain/invoice/columns.ts`, `domain/invoice/calculations.ts`,
`domain/invoice/factories.ts`, `useInvoiceSave`,
`item-library/types`, `item-library/domain/invoiceSuggestionSelection.ts`,
`item-library/domain/invoiceSuggestionPriceContext.ts`.

## Capability checklist

Written before implementation. Two of the three groups are inherited from the
baseline unchanged, because the baseline is the accepted direction.

### Group 1 — STRUCTURAL, inherited or adapted from BOQ V11

| # | Capability | Mobile + Fold V3 | Desktop V3 |
|---|---|---|---|
| 1 | Full-page form composition | Yes | Yes |
| 2 | Numbered section hierarchy | Yes, visible | Yes, and used as the section index |
| 3 | Section header rhythm (number, title, rule, meta) | Yes | Yes, widened to a masthead |
| 4 | Line-item architecture | Yes | Yes |
| 5 | Strong enumeration / control rail | Yes | Yes |
| 6 | Inline Columns / Import / Clear all | Yes | Yes |
| 7 | Edge-to-edge expanded group treatment | Yes | Yes |
| 8 | Compact, information-dense field composition | Yes | Yes, denser |
| 9 | Responsive recomposition, not scaling | Fold recomposition | Desktop recomposition |
| 10 | Dark mode | Yes | Yes |
| 11 | Phone FAB save | Yes | Not applicable |
| 12 | Fold top-bar labelled save | Yes | Not applicable (persistent by default) |

### Group 2 — INVOICE semantic, from the live implementation

| # | Capability | Mobile + Fold V3 | Desktop V3 |
|---|---|---|---|
| 13 | Invoice title | Yes | Yes |
| 14 | Invoice number, auto-numbered | Yes | Yes |
| 15 | PO number | Yes | Yes |
| 16 | Issue date / due date | Yes | Yes |
| 17 | Client picker with search and add-client | Yes | Yes |
| 18 | Linked project | Yes | Yes |
| 19 | Custom header fields | Yes | Yes |
| 20 | Line items | Yes | Yes |
| 21 | Description (dominant identity field) | Yes | Yes |
| 22 | Sub Description, real text, tap to edit | Yes | Yes |
| 23 | Make | Yes | Yes |
| 24 | Quantity | Yes | Yes |
| 25 | Unit | Yes | Yes |
| 26 | Unit price / rate | Yes | Yes |
| 27 | Amount | Yes, amount bar | Yes, amount bar |
| 28 | Optional install rate column | Yes | Yes |
| 29 | Optional VAT rate column | Yes | Yes |
| 30 | Optional discount rate column | Yes | Yes |
| 31 | Custom columns stored in `custom_data` | Yes | Yes |
| 32 | Item Library suggestions | Yes | Yes |
| 33 | Suggestion meta (alias, uses, last document) | Yes | Yes |
| 34 | Price label (client last / last used / standard) | Yes | Yes |
| 35 | Price context strip and use-price action | Yes | Yes |
| 36 | Selecting a suggestion sets description, link, price | Yes | Yes |
| 37 | Editing a linked description clears the link | Yes | Yes |
| 38 | Groups and subtotals | Yes | Yes |
| 39 | Import (items, groups, title, charges, columns) | Yes | Yes |
| 40 | Columns | Yes | Yes |
| 41 | Clear all | Yes | Yes |
| 42 | Row actions (move, duplicate, insert below, delete) | Yes | Yes |
| 43 | Commercial terms | Yes | Yes |
| 44 | Discount value, type and timing | Yes | Yes |
| 45 | VAT rate | Yes | Yes |
| 46 | WHT rate and unit | Yes | Yes |
| 47 | Additional charges with tax / without tax | Yes | Yes |
| 48 | Fixed charges (workmanship, transportation, shipping) | Yes | Yes |
| 49 | Additional fields | Yes | Yes |
| 50 | Totals with the full summary line set | Yes | Yes |
| 51 | Amount in words | Yes | Yes |
| 52 | Notes and terms with editable titles | Yes | Yes |
| 53 | Signatory | Yes | Yes |
| 54 | Reference links | Yes | Yes |
| 55 | Bank / PDF payment configuration | Yes | Yes |
| 56 | Draft, Save and Cancel surfaces | Yes | Yes |
| 57 | Edit lock (client, document type, number) | Yes, reviewable | Yes, reviewable |
| 58 | Column Manager: fixed Description | Yes | Yes |
| 59 | Column Manager: builtin and custom columns | Yes | Yes |
| 60 | Column Manager: TEXT / NUM distinction | Yes | Yes |
| 61 | Column Manager: display visibility | Yes | Yes |
| 62 | Column Manager: totals participation | Yes | Yes |
| 63 | Column Manager: reorder (buttons and drag) | Yes | Yes |
| 64 | Column Manager: add, rename, remove custom | Yes | Yes |
| 65 | Column Manager: reset with confirmation | Yes | Yes |
| 66 | Column Manager: Row Overrides | Yes | Yes |
| 67 | Readable numeric editing with thousands separators | Yes | Yes |

### Group 3 — Responsive requirements

| # | Requirement | Result |
|---|---|---|
| 68 | Phone is touch-first, compact, one-handed Save | FAB plus end-of-form Save |
| 69 | Fold recomposes the phone structure | Item becomes identity column plus data column; document fields reach four columns |
| 70 | Fold reduces unnecessary vertical stacking | Commercial term cards recombine into two columns; supporting-info cards pair; item data fields reach three columns |
| 71 | Fold keeps the rail and Description dominance | Unchanged from the baseline |
| 72 | Desktop is a recomposition of the same architecture | Sticky section index, item recombined into two zones on one line, three-column commercial board, two-column supporting board, totals on the document width |
| 73 | Desktop does not introduce an app shell | Confirmed. No left nav rail, no dashboard |
| 74 | Save is prominent and persistent on desktop | Top-bar Save, section-index Save, end-of-form Save |
| 75 | Accessibility: labels, roles, focus return, Escape, reduced motion | Inherited from the baseline; the new controls reuse the existing label, `role="switch"`, `aria-pressed` and focus-return patterns |

## Files changed

Added:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v3.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v3.html`
- `docs/reports/invoice-quote/invoice-form-candidate-mobile-fold-desktop-v3-2026-09-28.md` (this report)

Modified: none.

Removed: none.

`invoice-form-inline.html` was already modified in the working tree before this
task started. It was read and copied, and then left untouched.

## Skills used

Skills used: html-prototype
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Output 1 — Mobile + Fold V3

File: `invoice-form-candidate-mobile-fold-v3.html`

Method: the accepted baseline was copied, then extended. The section
hierarchy, rail anatomy, field composition, group treatment, save surfaces and
dark mode are the baseline, unchanged.

Additions:

1. Fold completion. The six commercial term cards previously stacked into one
   tall strip at fold width. They now recombine into two columns. The
   supporting-info cards pair into two columns. The item data field grid
   reaches three columns so fewer rows scroll.
2. Edit lock. The top bar gained a lock control. The control switches between
   Draft and Saved. In the Saved state the client picker, the document type and
   the invoice number freeze. This is the live `useInvoiceSave` plus
   `assertIdentityImmutable` rule made reviewable. The header comment records
   both additions.

### Output 2 — Desktop V3

File: `invoice-form-candidate-desktop-v3.html`

Method: the same baseline was copied, then recomposed for a wide viewport with
a desktop-only cascade. All content below 1 024px is the baseline composition,
so the file is never broken.

Additions:

1. Document identity band. Desktop opens with the whole document in view
   before any field: identity, dates and reference chips on the left, and the
   live grand total, tax rates, line-item count and status on the right. The
   grand total, tax and count values are written by the existing totals pass.
2. Sticky section index. The numbered section rhythm became a navigable index
   for the one invoice. It lists the five sections of this document and carries
   a persistent Save Invoice. One section renders at a time. This is document
   navigation, not application navigation.
3. Field distribution. Document details use a four-column grid: document type
   and title share a row, the four reference fields share a row, and the linked
   project pairs with the header fields.
4. Item recomposition. Each item becomes an identity zone and a data zone on
   one line, with the amount bar under the data zone and the insert-below
   control across the full width. The enumeration rail stays at full authority
   and Description remains the dominant field.
5. Commercial terms as a three-column board. Supporting info as a two-column
   board. Totals across the document width, with the grand total in its own
   column.
6. Sheets become centred dialogs. The grip indicator hides and the sheet
   receives dialog padding and radius.
7. The layout chip reports Phone, Large phone, Fold or Desktop.

Both files keep the same document math, the same validation messages, the same
column model and the same Item Library interaction shape, because they are the
same engine.

## Verification

This is a design-prototype task. Build, typecheck, lint, `audit:load`,
Playwright and Supabase commands were not run, per instruction.

Static checks performed on both V3 files:

```text
- node --check on the extracted inline script: PASS (both)
- inline and event handler reference check: no missing handler (both)
- HTML tag balance for div, section, span, button, textarea, select, nav: OK (both)
- BOQ semantic leakage scan on visible text: zero matches for
  SP, profit, vendor, contractor, BOQ. The 12 "CP" matches and the 7
  "margin" matches are false positives: "CP" matches the inherited client
  picker CSS classes cp-av, cp-txt and cp-chev, and "margin" matches inline
  CSS spacing. No cost-price semantics exist in either file.
- stale-flag check: no reference to the discarded state.mode flag remains
- desktop hook check: dsecbar, dnav, data-dsec, termboard and the four
  identity-band ids are present and are referenced by the script
- git status before and after: only the two new candidates were added
```

Not run: `bun run build` (banned), `bun run typecheck`, `bun run lint`,
`bun run audit:load`, browser automation, screenshot automation, Supabase
commands.

Human visual verification is reserved for the user.

## Supabase push status

Not applicable. No SQL and no schema changed.

## Risks or limitations

- Desktop one-section-at-a-time navigation is a product decision. The design
  system already hides and shows regions, and the baseline has a resize
  handler that returns to a continuous document below 1 024px. If continuous
  scrolling is preferred at desktop width, the change is a single media-query
  block.
- The desktop candidate is composed for 1 024px and above. Below that width it
  deliberately falls back to the baseline phone and fold composition, so it
  never renders broken.
- The Item Library catalog remains a representative dataset, not the live
  Supabase suggestion service. The interaction shape is faithful.
- Save is local to the prototype. Nothing persists.
- The identity band repeats the invoice title and reference values as display
  text. The live form binds them to the fields. This is a prototype-grade
  duplication.
- The baseline WH T base is `grandTotal - vatAmount`. This was inherited
  unchanged and was not modified, because the task forbids changing locked
  business behavior.
- Other agents are active in this repository. `android/app/build.gradle`,
  `android/app/src/main/cpp/`, `MainActivity.java`, `LocalAIPlugin.java`,
  `src/lib/native/localAI.ts` and the `item-library` files changed outside this
  task. None were touched.

## Deferred work

- Human visual acceptance of both V3 candidates.
- Confirmation of the desktop one-section-at-a-time decision.
- Item photo capture is present in the prototype and unchanged.
- Retirement of the V1 and V2 candidates once V3 is accepted. They are
  preserved now on purpose.
- A build-based visual regression check after the human review gate passes.
