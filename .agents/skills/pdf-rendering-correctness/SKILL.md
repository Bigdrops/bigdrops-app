# SKILL: PDF Rendering Correctness & Invoice Pipeline Architecture

## 1. Core Architectural Principle (Absolute Truth)

The parent invoice is the ONLY financial and structural source of truth.
Everything else is a PURE PRESENTATION DERIVATION.

PDF rendering pipelines must act purely as data-blind presentation layers. No document compilation step, preview model, or download handler is permitted to transform data structures, compute business math, or synthesize line items.

## 2. Advance Invoice Definition (Final Model)

An Advance Invoice is a STRICT READ-ONLY PRESENTATION VARIANT of a parent invoice.

It is NOT a separate entity.
It is NOT a financial model.
It is NOT a projection pipeline output.

### Allowed Differences ONLY

1. `invoice_number` — suffix/prefix addition (e.g., `-A`)
2. `invoice_title` — presentation label override
3. Footer rendering — advance-specific summary ("Advance due now" / "Balance upon completion")

### Forbidden Differences (Non-Negotiable)

Advance Invoice MUST NEVER:
- Modify `invoice.items`
- Reconstruct `invoice.items`
- Omit `invoice.items`
- Recalculate totals
- Transform financial values
- Generate synthetic line items
- Introduce derived "advance item arrays"
- Exist as a separate database entity

## 3. Data Ownership Matrix

| Data | Owner |
|------|-------|
| items | Parent Invoice ONLY |
| totals | Parent Invoice ONLY |
| client info | Parent Invoice ONLY |
| advance configuration | Parent metadata ONLY |
| presentation differences | Render layer ONLY |

## 4. Lifecycle Rule (Critical)

### Immutability Guarantee

Once an invoice object is created or fetched, it MUST NOT be structurally modified by ANY downstream system. This includes:

- PDF generator
- Preview model
- UI components
- Helper functions
- Adapters
- Financial calculators

## 5. Rendering Separation Rule

### Two Layers Only

**Layer 1 — DATA LAYER (Pure)**
- Parent invoice fetched from database
- No transformation beyond parsing raw fields

**Layer 2 — RENDER LAYER (Derivation Only)**
- Decides how invoice is displayed
- May apply presentation-only overrides
- MUST NEVER mutate invoice data

## 6. Context Gating Rule

All advance UI logic MUST be gated by:

```ts
const isAdvanceContext = invoice?.isVirtualProjection === true;
```

Rules:
- If `false`: NO advance UI, NO advance footer, NO advance summary
- If `true`: ONLY UI modifications allowed (labels + footer display)

The Main Invoice must remain entirely clean, flat, and untouched by the presence of an active advance payment configuration.

## 7. PDF Pipeline Rules

### Hard Rule

PDF generator MUST treat invoice as a READ-ONLY INPUT OBJECT.

It may:
- Read `invoice.items`
- Render `invoice.items`
- Display totals

It may NOT:
- Modify invoice
- Recompute invoice structure
- Generate alternative item arrays
- Reinterpret financial meaning

## 8. Advance Invoice Creation Rule

Advance invoice generation MUST:
- Clone parent invoice shallowly ONLY
- NOT modify `invoice.items`
- NOT create derived structures
- ONLY attach: `invoice_number` override, `invoice_title` override, `isVirtualProjection` flag

### Required Pattern

```ts
const advanceInvoice = {
  ...invoice,                    // SHALLOW READ-ONLY CLONE
  invoice_number: `${invoice.invoice_number || ""}${suffix}`,
  invoice_title: metadata?.primaryLabel || "Advance Invoice",
  isVirtualProjection: true,
};
```

## 9. Prohibited Architecture Patterns

DO NOT EVER INTRODUCE:
- `AdvanceInvoiceProjection.items`
- Derived invoice models
- Financial projection builders
- PDF-specific invoice transformations
- Secondary invoice recalculation layers
- Synthetic item arrays

## 10. Acceptance Criteria

### Advance Invoice PDF MUST:
- Render ALL parent invoice items unchanged
- Match parent invoice structure exactly
- Differ ONLY in header + footer presentation

### Main Invoice MUST:
- Never render advance UI
- Never show advance totals breakdown
- Remain identical regardless of advance config existence

### System Stability MUST Ensure:
- No transformation of `invoice.items` anywhere in system
- No recalculation outside parent invoice
- No divergence between UI and PDF output
- No secondary invoice models exist

## 11. Waybill PDF Template Rules

### Single Page Contract (Non-Negotiable)

Blank waybill templates MUST fit on a single portrait A4 page. Any change that causes signatures or footer to spill to a second page is an automatic contract violation.

### Layout Constraints

- **No Absolute Positioning**: Avoid `position: absolute` or fixed heights that could cause overflow
- **Flex Allocation**: Use flex for dynamic content zones (signature cards, footer)
- **Zone Structure**: Maintain existing table proportions and zone structure

### Brand Identity Order

Waybill brand identity sections must follow this exact order:
1. Company Name
2. Address
3. Contact Information
4. Tagline (subordinate brand statement)

### Footer Architecture

Waybill footer must use this layout:
- Left: Company name
- Right: Waybill number
- Center: Intentionally empty (no tagline, contact, or address)

Style: `flexDirection: 'row'`, `justifyContent: 'space-between'`

### Date Field Requirements

- "Date" label is required (unlike Phone/Email/Address which are redundant metadata prefixes)
- Date is a document control field requiring visible label
- Provide handwriting-sized entry area

### Sequence Consumption

Blank waybill downloads MUST consume a sequence number from `blank_waybill_logs`. Each download must produce an incrementing number (001, 002, 003).
