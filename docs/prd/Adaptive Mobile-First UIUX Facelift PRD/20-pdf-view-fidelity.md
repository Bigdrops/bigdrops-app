# PDF-View Page Fidelity Consolidation

> Status: Draft
> Last updated: 2026-08-29
> Depends on: `06-component-patterns.md`, `09-documents.md`

---

## 1. Purpose

Define how the in-app document view card for Invoice and Quotation consolidates content currently scattered across separate cards, sheets, and overlays into the primary document card — so the user sees PDF-equivalent content without leaving the card.

---

## 2. Context

### What Already Exists

The PDF system (`src/components/pdf-new/`) renders Invoice and Quotation documents with a unified `PdfBaseDocumentModel`. The model includes: identity, issuer, recipient, header fields, items, columns, totals, bank details, notes, terms, additional sections, reference links, attachments, signature, logo, footer text, and meta footer.

The in-app view pages (`InvoiceWorkspace.tsx`, `QuotationViewPage.tsx`) render the same data in a card format, but several PDF sections are hidden behind separate interactive elements:

| PDF Section | Current In-App Location | User Access |
|-------------|------------------------|-------------|
| Bank details | `BankDetailsCard` (separate collapsible card below the document card) | Must scroll past the document card, expand the bank card |
| Notes | Hidden inside `FormNotesTerms` sheet (only visible in edit mode) | Must enter edit mode or open a sheet |
| Terms | Hidden inside `FormNotesTerms` sheet (only visible in edit mode) | Must enter edit mode or open a sheet |
| Reference links | Hidden inside `FormNotesTerms` sheet | Must enter edit mode or open a sheet |
| Attachments | Hidden inside `FormNotesTerms` sheet | Must enter edit mode or open a sheet |
| Footer text | Rendered only in PDF output, not in the document card | Not visible in-app at all |
| Additional sections | No in-app equivalent | Not visible in-app at all |
| Advance summary | `AdvanceInvoicesCard` (separate card) | Must scroll past the document card |

### What the Document Card Already Renders

The `InvoiceDocumentCard` component renders:

- Logo, company name, tagline, company address lines
- Status pill
- Invoice title
- Meta chips (number, issue date, due date, PO number)
- Client name and address lines
- Detail rows
- Line items (with groups, subtotals, item images, quantities, amounts)
- Totals (subtotal, VAT, discount, WHT, grand total)
- Amount in words
- Signatory block

---

## 3. Scope

### In Scope

Consolidation of the following into the Invoice and Quotation document view cards:

1. **Bank details** — currently in a separate `BankDetailsCard` below the document card
2. **Notes and terms** — currently hidden in sheets/overlays, not visible in the card
3. **Reference links** — currently hidden in sheets/overlays
4. **Footer text** — currently only in PDF output

### Out of Scope

- **Waybill, CSR, BOQ, RFQ** — these use separate PDF generators (not the unified `PdfBaseDocumentModel`). Their fidelity work is deferred to a future pass.
- **Additional sections** — these are free-form text sections that may not have meaningful in-app content yet. Deferred.
- **Attachments** — file-based attachments require download/open interaction that is better suited to a separate card. Deferred.
- **Advance summary** — already has its own `AdvanceInvoicesCard` with specific interaction needs (viewing child invoices). Not consolidated into the document card.

---

## 4. Consolidation Spec

### 4.1 Bank Details — Inline in Document Card

**Current state:** `BankDetailsCard` is a separate collapsible card below the document card. Shows bank name, account name, account number. Supports multiple bank accounts with radio-style selection.

**Target state:** Bank details render as a final section inside the `InvoiceDocumentCard`, below the signatory block.

#### Layout

```
┌─────────────────────────────────────────┐
│  ... (existing document card content)   │
│                                         │
│  ── Signatory ──                        │
│  [signature image]  Name                │
│                     Role                │
│                                         │
│  ── Bank Details ──                     │
│  First Bank Nigeria                     │
│  Account Name: BigDrops Limited         │
│  Account Number: 3012345678             │
│  ── or ──                               │
│  +1 more account                        │
└─────────────────────────────────────────┘
```

#### Properties

| Property | Value |
|----------|-------|
| Section title | "Bank Details" — 10px, 800 weight, uppercase, `var(--ink-3)` |
| Bank name | 13px, 600 weight, `var(--ink)` |
| Account detail | 11px, 500 weight, `var(--ink-2)` |
| Separator | 1px line, `var(--line)` |
| Multiple accounts | Show primary account. If more than one, show "+N more accounts" text. |
| Selected account indicator | Green dot or checkmark next to active account |

#### Rules

- If no bank accounts exist, the section does not render.
- If one bank account exists, show it inline without a selection indicator.
- If multiple bank accounts exist, show the selected/primary account with a visual indicator.
- The separate `BankDetailsCard` below the document card is removed to avoid duplication.

### 4.2 Notes and Terms — Inline in Document Card

**Current state:** Notes and terms content is stored on the invoice/quotation record (`invoice.notes`, `invoice.terms`) and rendered in the PDF via `PdfTextSection`. In the app, this content is only visible in edit mode or via the `FormNotesTerms` sheet.

**Target state:** Notes and terms render as collapsible sections inside the document card, below bank details.

#### Layout

```
┌─────────────────────────────────────────┐
│  ... (bank details above)               │
│                                         │
│  ▸ Notes                          [+]   │
│  ▸ Terms & Conditions            [+]   │
└─────────────────────────────────────────┘
```

When expanded:

```
┌─────────────────────────────────────────┐
│  ▾ Notes                          [−]   │
│  Delivery within 5 business days of     │
│  invoice date. Late payment incurs      │
│  2% monthly interest.                   │
│                                         │
│  ▸ Terms & Conditions            [+]   │
└─────────────────────────────────────────┘
```

#### Properties

| Property | Value |
|----------|-------|
| Section title | 10px, 800 weight, uppercase, `var(--ink-3)` |
| Content | 12px, 500 weight, `var(--ink)`, line-height 1.5 |
| Expand/collapse | Animated height transition, 0.2s ease-out |
| Default state | Collapsed |
| Max height when expanded | 200px (scrollable if content exceeds) |

#### Rules

- If notes are empty, the Notes section does not render.
- If terms are empty, the Terms section does not render.
- Both sections default to collapsed.
- The user can expand/collapse each independently.
- Rich text content (HTML) is rendered as plain text (strip HTML tags) for the card view. The full formatted version remains in the PDF.

### 4.3 Reference Links — Inline in Document Card

**Current state:** Reference links (label + URL pairs) are stored in `custom_fields.attachments` and rendered in the PDF. In the app, they are only visible in the edit form's `FormNotesTerms` sheet.

**Target state:** Reference links render as a compact list inside the document card, below notes/terms.

#### Layout

```
┌─────────────────────────────────────────┐
│  ... (notes/terms above)                │
│                                         │
│  ── References ──                       │
│  📎 Purchase Order    [link icon]       │
│  📎 Delivery Note     [link icon]       │
└─────────────────────────────────────────┘
```

#### Properties

| Property | Value |
|----------|-------|
| Section title | "References" — 10px, 800 weight, uppercase, `var(--ink-3)` |
| Link label | 12px, 600 weight, `var(--primary)` |
| Link icon | External link icon, 12×12px |
| Link behavior | Opens URL in browser via `window.open()` |

#### Rules

- If no reference links exist, the section does not render.
- Each link is tappable and opens the URL.
- Maximum 5 links shown. If more exist, show "+N more links".

### 4.4 Footer Text — Subtle Display in Document Card

**Current state:** Footer text is stored in `settings.footer_text` and rendered only in the PDF footer area. It is not visible in the app at all.

**Target state:** Footer text renders as a subtle line at the very bottom of the document card.

#### Layout

```
┌─────────────────────────────────────────┐
│  ... (reference links above)            │
│                                         │
│  ─────────────────────────────────────  │
│  Thank you for your business.           │
│  BigDrops Business Solutions            │
└─────────────────────────────────────────┘
```

#### Properties

| Property | Value |
|----------|-------|
| Font size | 10px |
| Font weight | 500 |
| Color | `var(--ink-3)` |
| Alignment | Center |
| Separator | 1px line above, `var(--line)` |

#### Rules

- If footer text is empty or the user has disabled footer display (`pdfOutput.showFooter === false`), the section does not render.
- Footer text is displayed as plain text (HTML stripped).

---

## 5. Updated Document Card Section Order

The consolidated document card follows this section order:

```
1.  Brand block (logo, company name, tagline, address)
2.  Status pill
3.  Document title
4.  Meta chips (number, dates, PO number)
5.  Client/recipient info
6.  Detail rows
7.  Line items (with groups, subtotals, images)
8.  Totals (subtotal, VAT, discount, WHT, grand total)
9.  Amount in words
10. Signatory block
11. Bank details (new — consolidated from BankDetailsCard)
12. Notes (new — collapsible)
13. Terms (new — collapsible)
14. Reference links (new)
15. Footer text (new — subtle)
```

---

## 6. Files Affected

| File | Change |
|------|--------|
| `src/components/document-view/invoice/InvoiceDocumentCard.tsx` | Add sections 11–15 |
| `src/components/document-view/invoice/InvoiceWorkspace.tsx` | Remove `BankDetailsCard` from separate card position |
| `src/components/document-view/shared/BankDetailsCard.tsx` | May be simplified or removed if fully inlined |
| `src/components/document-view/quotation/QuotationDocumentPreview.tsx` | Add equivalent sections for quotation |

---

## 7. Rules

- The document card is a read-only view. The user edits content through the existing edit flow.
- Rich text (HTML) in notes and terms is rendered as plain text in the card. The full formatted version remains in the PDF.
- All new sections use the same visual language as existing card sections (border, spacing, typography from `03-design-system.md`).
- If a section has no content, it does not render — no empty placeholders.
- The card MAY become scrollable if content exceeds the viewport. The existing scroll behavior of the document view page handles this.

---

## 8. Anti-Patterns

| # | Prohibition | Reason |
|---|-------------|--------|
| 1 | Do not add new data fields | The data already exists; this is consolidation, not invention |
| 2 | Do not make the card editable | Edit flows remain separate |
| 3 | Do not remove the edit button or FAB | Editing is still a primary action |
| 4 | Do not render HTML in the card | Strip to plain text; PDF is the formatted view |
| 5 | Do not expand all sections by default | Collapsed by default keeps the card scannable |
