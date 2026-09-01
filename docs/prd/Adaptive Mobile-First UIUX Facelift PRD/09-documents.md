# Documents — View UX

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Define the UX direction for invoice, quotation, waybill, CSR, BOQ, RFQ, and letter document surfaces. This document concerns application UX only — not PDF rendering or financial calculations.

> **Document view design:** Load `appllama-app-design-skill` (`.agents/skills/appllama-app-design-skill/SKILL.md`) for native-feeling document view screens, or `mobile-app-ui-design` for mobile-first document layouts.

---

## Document Types

| Type | Code | Key Properties |
|------|------|---------------|
| Invoice | INV | Line items, amounts, VAT, discount, payment tracking |
| Quotation | QTN | Line items, amounts, acceptance status, conversion |
| Waybill | WB | Items dispatched, delivery status, no monetary values |
| CSR | CSR | Problem, service, materials, engineer remarks |
| BOQ | BOQ | Bill of quantities, descriptions, units, costs |
| RFQ | RFQ | Items requested, deadline, vendor responses |
| Letter | LTR | Recipient, subject, body, attachments |

---

## Document View Structure (Phone)

### Top Navigation

| Element | Position | Action |
|---------|----------|--------|
| Back button | Left | Return to list |
| Document number | Center | Display only |
| Actions menu | Right | Open action sheet |

### Content Layout

```
┌──────────────────────────────────┐
│  ←  INV-0045          [⋯]      │  top nav
├──────────────────────────────────┤
│  Status badge                    │
│  Client name                     │
│  Date · Due date                 │
│  Amount (prominent)              │
├──────────────────────────────────┤
│  Line items                      │
│  ┌────────────────────────────┐  │
│  │ Item 1          ₦120,000  │  │
│  │ Item 2           ₦45,000  │  │
│  │ Item 3           ₦30,000  │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  Summary                         │
│  Subtotal:          ₦195,000    │
│  VAT (7.5%):         ₦14,625    │
│  Discount:           -₦5,000    │
│  Grand Total:       ₦204,625    │
├──────────────────────────────────┤
│  Actions bar                     │
│  [Send] [Download] [Record Pay]  │
└──────────────────────────────────┘
```

### Section Order (Phone)

1. Status + header info
2. Line items
3. Financial summary
4. Activity/audit trail
5. Notes/comments
6. Related documents

---

## Document View Structure (Tablet)

### Split View

- Left panel: document content (scrollable)
- Right panel: actions, activity, related documents

### Layout

```
┌─────────────────────┬──────────────┐
│  Document content    │  Actions     │
│  (scrollable)        │  Activity    │
│                      │  Related     │
│                      │  Notes       │
└─────────────────────┴──────────────┘
```

---

## Document View Structure (Desktop)

### Full Layout

- Header with all metadata
- Full-width content area
- Side panel for actions and activity
- Sticky summary bar at bottom

---

## Document Lifecycle

| State | Visual Indicator | Available Actions |
|-------|-----------------|-------------------|
| Draft | Blue badge | Edit, Delete, Finalize |
| Pending | Yellow badge | Edit, Send, Cancel |
| Sent | Gray badge | View, Remind, Record Payment |
| Overdue | Red badge | View, Remind, Record Payment |
| Paid | Green badge | View, Download, Duplicate |
| Delivered | Gray badge (waybill) | View, Download |

---

## Action Sheet

Triggered by the ⋯ menu in the top nav.

### Available Actions

| Action | Icon | Description |
|--------|------|-------------|
| Edit | pencil | Open edit form |
| Download PDF | download | Generate and download PDF |
| Send | send | Send to client |
| Duplicate | copy | Create new from this document |
| Record payment | dollar-sign | Open payment recording |
| Convert | arrow-right | Convert to next document type |
| Delete | trash-2 | Delete (with confirmation) |
| View PDF | file-text | Open PDF preview |

### Action Sheet Style

Same as v6 bottom sheet pattern:
- Slides up from bottom
- Max height 78%
- Grab handle + title + close
- Icon + title + description per action
- Destructive actions in red

---

## Document-Specific Behaviors

### Invoice

- Line items with qty, unit, rate, VAT, discount
- Row totals computed per item
- Summary section with subtotal, VAT, discount, grand total
- Payment recording tracks partial and full payments
- WHT tracking (if applicable)

### Quotation

- Line items with qty, unit, rate
- Acceptance status tracking
- Convert to invoice when accepted
- Expiry date display

### Waybill

- Items dispatched (no monetary values)
- Delivery status tracking
- Source invoice reference
- Items stripped of: unit_price, rate, vat, discount, subtotal, grand_total

### CSR

- Problem reported
- Service rendered
- Materials used
- Engineer remarks
- Before/after photos (optional)

### BOQ / RFQ

- Quantity-based line items
- Unit pricing
- Total cost breakdown
- Vendor responses (RFQ)

### Letter

- Recipient details
- Subject line
- Body text (rich text or plain)
- Attachments
- Document references

---

## Navigation Between Documents

- Quotation → Invoice: "Convert to Invoice" action
- Invoice → Waybill: "Create Waybill" action
- Invoice → Payment: "Record Payment" action
- Any → PDF: "Download PDF" action

Navigation preserves context. Back button returns to the originating document or list.

---

## Financial Display Rules

- All amounts use `var(--number)` (monospace font)
- Currency: ₦ (Nigerian Naira)
- Thousands separator: comma
- Decimal places: 2 (for amounts), 0 (for whole numbers)
- Negative amounts: displayed with minus sign, red color
- Status badges use consistent colors across all document types

**Note:** AI integration (Section 13) may generate document summaries and content, but must NOT calculate prices, taxes, totals, or VAT. Per AGENTS.md guardrails, PDFs are renderers only.
