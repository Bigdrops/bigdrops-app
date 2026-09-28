# Invoice Form V2 Design Candidates Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Create two standalone HTML design candidates for the Invoice form:

1. One candidate for PHONE + FOLD.
2. One candidate for DESKTOP.

Both candidates must describe the same Invoice. Their layouts may differ.
Their Invoice meaning must not differ.

A second goal was to correct a defect in the earlier V1 candidates. The V1
desktop candidate imported BOQ commercial concepts (CP, SP, line profit,
gross profit) into the Invoice form. That import is not valid.

## Scope

In scope:

- Audit the four authoritative sources.
- Write a capability checklist for the Invoice domain.
- Write two new standalone prototype files under the Invoice design directory.
- Report.

Out of scope:

- Application source. No React, TypeScript, SQL, Supabase, or schema file was
  changed.
- The BOQ V11 prototype. It was read only.
- The earlier V1 candidates and the corrected `invoice-form-inline.html`. They
  were read only, and they are preserved.

## Sources audited, and what each one governs

| Source | Authority |
|---|---|
| `boq/boq-form-candidate-v11.html` | STRUCTURAL and VISUAL reference only. Top bar, numbered sections, enumeration rail, compact Sub Description, inline Columns / Import / Clear all, edge-to-edge groups, phone FAB, end-of-form Save, fold recomposition, dark mode. |
| Live Invoice source code | AUTHORITY for Invoice behaviour and semantics. |
| `invoice/invoice-form-inline.html` | INVENTORY and IDEATION reference only. Field coverage check. |
| `invoice/invoice-form-candidate-*-v1.html` | Prior V1 attempt. Reviewed to avoid repeating its defect. |

Live Invoice files that were read:

- `src/pages/InvoiceFormPage.tsx`
- `src/components/document/SharedDocumentForm.tsx`
- `src/components/document/FormHeader.tsx`
- `src/components/document/FormLineItems.tsx`
- `src/components/document/FormCommercialTerms.tsx`
- `src/components/document/FormTotals.tsx`
- `src/components/document/FormNotesTerms.tsx`
- `src/components/document/FormFooter.tsx`
- `src/components/invoice/MobileItemCard.tsx`
- `src/components/invoice/mobile/mobileFormPrimitives.tsx`
- `src/components/ColumnManager.tsx`
- `src/components/useInvoiceColumns.tsx`
- `src/components/PdfOutputSettings.tsx`
- `src/domain/invoice/types.ts`
- `src/domain/invoice/columns.ts`
- `src/domain/invoice/calculations.ts`
- `src/domain/invoice/factories.ts`
- `src/hooks/useInvoiceSave.ts`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/modules/item-library/domain/invoiceSuggestionSelection.ts`
- `src/modules/item-library/domain/invoiceSuggestionPriceContext.ts`

## Defect found in the V1 candidates

The V1 desktop candidate contains a `Gross profit` total and a
`Line profit` row label. The V1 mobile candidate contains CP and SP row
semantics. Both candidates use BOQ vocabulary.

Evidence:

```text
invoice-form-candidate-desktop-v1.html:466  <small>Gross profit</small>
invoice-form-candidate-desktop-v1.html:678  Line profit ·
invoice-form-candidate-desktop-v1.html      CP 18, SP 18, profit 15, margin 24
invoice-form-candidate-mobile-fold-v1.html  CP 15, SP 14, profit 18
```

The live Invoice implementation has no cost price, no selling price, and no
profit. The Invoice row contract is Amount = Quantity x Unit Price, with
optional per-row VAT, discount, and install rates.

The V2 candidates contain no BOQ concept. A scan of the visible text in both
V2 files returns zero matches for CP, SP, profit, vendor, contractor, and BOQ.

## Capability checklist

This checklist was written before implementation. Both candidates cover every
item. The final column records where the two candidates intentionally differ.

| # | Invoice capability | Mobile + Fold V2 | Desktop V2 | Intentional difference |
|---|---|---|---|---|
| 1 | Document type (Invoice / Quotation) | Segmented control | Segmented control | None |
| 2 | Invoice Title | Full-width field | Large title field | None |
| 3 | Invoice No. (auto-numbered, locked on edit) | Field + mono | Field + mono | None |
| 4 | PO Number | Field | Field | None |
| 5 | Issue Date / Due Date | Date fields | Date fields | None |
| 6 | Client picker, search, add new | Bottom sheet | Modal | Surface differs; behaviour same |
| 7 | Linked project | Select | Select | None |
| 8 | Header fields (label / value pairs) | Stacked rows | Inline chips | Composition only |
| 9 | Item count | Section meta | Section meta + legend | None |
| 10 | Inline Columns / Import / Clear all | Toolbar | Toolbar | None |
| 11 | Enumeration rail per row | Number + grip + rail line | Number + grip | Desktop uses a table index |
| 12 | Description as the dominant field | Textarea, identity column | Table cell, widest track | Composition only |
| 13 | Item Library suggestions on the Description field | Anchored listbox | Anchored popover | Surface differs; behaviour same |
| 14 | Suggestion identity line (alias / uses / last document) | Present | Present | None |
| 15 | Suggestion price label (Client last / Last used / Standard) | Present | Present | None |
| 16 | Selecting a suggestion sets description, item link, unit price | Yes | Yes | None |
| 17 | Typing after a link clears the item link | Yes | Yes | None |
| 18 | Manual entry remains available | Yes | Yes | None |
| 19 | Price context line | Present | Present | None |
| 20 | "Use price" history action, rate 0 only | Present | Present | None |
| 21 | Compact Sub Description, real text, tap to edit | Yes | Yes | None |
| 22 | Make | Field | Cell | None |
| 23 | Quantity | Field | Cell | None |
| 24 | Unit | Field | Cell | None |
| 25 | Unit Price (Rate) | Field | Cell | None |
| 26 | Amount (derived) | Amount bar | Amount cell | None |
| 27 | Install Rate with auto / multiplier override | Field | Cell | None |
| 28 | VAT Rate per-row override | Field | Cell | None |
| 29 | Discount Rate per-row override | Field | Cell | None |
| 30 | Custom columns stored in `custom_data` | Part No., Condition | Part No., Condition | None |
| 31 | Row actions: move, duplicate, delete | Vertical buttons | Inline icon row | Composition only |
| 32 | Groups with subtotal toggle | Edge-to-edge workbench | Table group row | Composition only |
| 33 | Add item / add item to group / add group | Yes | Yes | None |
| 34 | Clear all with confirmation | Dialog | Dialog | None |
| 35 | Import (items, groups, title, extra charges) | Bottom sheet | Modal | Surface differs |
| 36 | Payment terms | Select | Select | None |
| 37 | Due / validity note | Field | Field | None |
| 38 | Discount value, type (NGN / %), timing | Collapse card | Compact grid | Composition only |
| 39 | VAT rate | Collapse card + totals pill | Grid + totals pill | None |
| 40 | WHT rate and unit (% / NGN) | Collapse card | Grid | Composition only |
| 41 | Fixed charges (workmanship, transportation, shipping) | Collapse card | Compact grid | Composition only |
| 42 | Additional charges with tax / without tax | Two add buttons | Two add buttons | None |
| 43 | Additional fields (label / value) | Collapse card | Grid | Composition only |
| 44 | Summary rows (subtotal, discount, charges, VAT, install, WHT) | List | List | None |
| 45 | Grand total | Prominent | Prominent | None |
| 46 | Amount in words | Present | Present | None |
| 47 | Notes and terms, with editable section titles | Two text areas | Two text areas | Side by side on desktop |
| 48 | Signatory | Collapse card | Inline select | None |
| 49 | Reference links (label / URL) | Collapse card | Inline rows | None |
| 50 | Bank account for the PDF | Select | Select | None |
| 51 | Column Manager: fixed Description row | Yes | Yes | Bottom sheet vs side drawer |
| 52 | Column label editing, TEXT / NUM badge | Yes | Yes | None |
| 53 | Visibility switch and totals removal mode | Yes | Yes | None |
| 54 | Install-rate multiplier sub-input | Yes | Yes | None |
| 55 | Custom column add, rename, type, delete | Yes | Yes | None |
| 56 | Column reorder (buttons) and Description pinning | Yes | Yes | None |
| 57 | Reset to defaults with confirmation | Dialog | Dialog | None |
| 58 | Row Overrides panel (per-row VAT, discount, install) | Yes | Yes | None |
| 59 | Save: client required | Yes | Yes | None |
| 60 | Save: one item with a description required | Yes | Yes | None |
| 61 | Save: every standard row needs a description, row highlighted | Yes | Yes | None |
| 62 | Save draft | Yes | Yes | None |
| 63 | Cancel | Yes | Yes | None |
| 64 | Phone Save FAB | Yes | Not applicable | Phone only by design |
| 65 | Labelled Save at the end of the form | Yes | Yes | None |
| 66 | Persistent labelled Save in the header at fold and desktop | Yes (fold) | Yes | None |
| 67 | Dark mode | Yes | Yes | None |
| 68 | Identity lock on edit | Documented in the report | Documented in the report | Prototypes are create-mode |

The prototypes run in create mode. The identity lock is an edit-mode rule. The
live rule is recorded here and is not simulated.

## Files changed

Added:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v2.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v2.html`
- `docs/reports/invoice-quote/invoice-form-candidate-design-mobile-fold-desktop-v2-2026-09-28.md` (this report)

Modified: none.

Removed: none.

Preserved without change:

- `invoice-form-inline.html`
- `invoice-form-candidate-mobile-fold-v1.html`
- `invoice-form-candidate-desktop-v1.html`
- `boq-form-candidate-v11.html`
- All application source, SQL, and schema files.

## Skills used

Skills used: html-prototype
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Output 1 — Mobile + Fold V2

File: `invoice-form-candidate-mobile-fold-v2.html`

Phone composition:

- Compact sticky top bar. Back, title, status and layout meta, overflow,
  theme.
- Section 1 Document details: title, document type, invoice number, PO
  number, issue and due dates, dashed client picker, linked project, header
  fields.
- Section 2 Line items: inline Columns / Import / Clear all, item count.
- Each item row has a segmented enumeration rail, a Description textarea with
  the Item Library suggestion listbox, a compact Sub Description row that shows
  the real text and enters edit on tap, a Make / Quantity / Unit / Rate grid,
  optional Install / VAT / Discount / custom fields, and an Amount bar that
  reads "Quantity x Rate".
- Groups run edge to edge as workbenches with a subtotal toggle and an
  add-item row.
- Section 3 Commercial terms as collapse cards.
- Section 4 Totals with a VAT rate pill.
- Section 5 Notes, terms, signatory, reference links.
- Section 6 Bank account for the PDF.
- Save surfaces: phone FAB, labelled Create Invoice at the end of the form,
  Save draft, Cancel.

Fold composition (600px and above) is a deliberate recomposition:

- Document fields move from two columns to four.
- The client picker and the document fields sit in two adjacent regions.
- Each item becomes an identity column and a data column. The identity column
  holds the rail, Description, and Sub Description. The data column holds the
  numeric and commercial fields. The Amount bar spans both.
- Totals use two columns: the breakdown on the left, the amount in words and
  the VAT pill on the right.
- Supporting sections pair into two columns.
- The FAB is removed. The top bar gains a persistent labelled Save Invoice.

### Output 2 — Desktop V2

File: `invoice-form-candidate-desktop-v2.html`

This file is not a widened phone layout. It is a desktop-native workspace:

- The application moves from a bottom bar to a desktop application shell. A
  fixed left rail carries the module list and document tools.
- A sticky command bar holds the breadcrumb, the document identity, the status
  chip, Save draft, Cancel, more actions, theme, and a prominent Save Invoice.
- The workbench is a two-column region. The left column holds document
  details, the line-item table, and supporting sections. The right column
  holds Totals and Commercial terms, and it stays in view while the document
  scrolls.
- Line items are a table. A sticky header row shows the configured column
  labels in the configured order. Rows are compact and align on numeric
  columns. This is a workbench, not a spreadsheet: the control column, the
  amount column, and the group rows keep the hierarchy.
- Item Library suggestions open as an anchored popover under the Description
  cell. The suggestion identity line, the price label, the price context, and
  the use-price action are the same as the mobile candidate.
- Sub Description shows two clamped lines and expands to edit in place.
- The Column Manager is a right-side drawer. It carries the same contract:
  fixed Description row, label editing, TEXT / NUM badges, visibility switch,
  remove-from-totals mode with restore, install-rate multiplier, custom
  columns, reorder, reset, and Row Overrides.
- Import and client selection use modals.
- Save Invoice stays visible in the command bar at every scroll position.

### Shared behaviour

Both files implement the same document math, which follows
`src/domain/invoice/calculations.ts`:

```text
subtotal          = sum(quantity x unit_price)
discount_amount   = fixed value, or percent of subtotal
taxable_base      = subtotal + taxable charges - discount (when timing = before)
vat_amount        = taxable_base x vat_rate / 100
grand_total       = taxable_base + vat + fixed charges + install total
                    + non-taxable charges - discount (when timing = after)
wht_amount        = percent of grand_total, or a fixed value
total_payable     = grand_total - wht_amount
```

Both files format money with thousands separators while the user types, and
both keep the caret in place by counting digits before the caret.

Both files show the same validation messages as `useInvoiceSave`:
"Pick a client before saving", "Add at least one item before saving", and a
per-row description message with the offending row highlighted.

## Verification

This is a design-prototype task. The task forbids build, typecheck, lint,
browser automation, and Supabase commands.

Verification performed:

```text
- JavaScript syntax check on the extracted inline script of both files (node --check): passed
- Inline event handler reference check, both files: no missing handler
- HTML tag balance check on both files: no imbalance
- BOQ leakage scan on visible text, both files: zero matches for
  CP, SP, profit, vendor, contractor, BOQ
- Capability coverage check, 68 capabilities, both files: covered
- Both required HTML files exist: passed
- git status before and after: no pre-existing file was reverted or overwritten
```

Not run, per instruction: `bun run build`, `bun run typecheck`,
`bun run lint`, `bun run audit:load`, Playwright, browser automation,
Supabase commands.

Human visual verification is reserved for the user.

## Supabase push status

Not applicable. No SQL and no schema changed.

## Risks or limitations

- The Item Library catalog is a representative dataset. It is not the live
  Supabase suggestion service. The interaction shape is faithful; the data is
  not.
- The "Use price" action is enabled only when a recognized history price
  exists and the rate is 0. This matches the live guard.
- Save is local. The prototype does not persist to Supabase.
- Photos are not included. The live row supports an item image, and this is
  out of scope for this design task.
- The prototypes run in create mode. The edit-mode identity lock is described
  and not simulated.
- Focus and caret behaviour is prototype-grade. The live React form preserves
  focus through component keys; these files preserve focus by updating the DOM
  in place instead of re-rendering the row.
- Another agent added `android/app/build.gradle` and `android/app/src/main/cpp/`
  to the working tree during this session. Those changes are not mine and were
  not touched.

## Deferred work

- Human visual acceptance of both V2 candidates.
- Edit-mode identity lock dialog in the prototypes.
- Item image and camera action.
- A build-based visual regression check after the human review gate passes.
- Retirement of the V1 candidates once V2 is accepted. They are preserved now
  on purpose.

## Note on the V1 report

`docs/reports/invoice-quote/invoice-form-candidate-design-mobile-fold-desktop-v1-audit-2026-09-27.md`
records "CP/SP visual distinction" under "Functionality Intentionally
Preserved" for the Invoice candidates. That statement conflicts with the
Invoice domain. The V2 candidates remove it.
