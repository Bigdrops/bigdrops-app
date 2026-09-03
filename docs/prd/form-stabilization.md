# PRD — Form Stabilization & Capability Architecture

**Status:** Approved for implementation
**Priority:** Critical
**Scope:** Shared document form infrastructure
**Target Version:** Next Engineering Cycle

---

# Vision

Transform the current shared document form into a stable platform capable of supporting both financial and operational documents without feature leakage.

This is NOT a rewrite.

This is a controlled stabilization and architectural extraction.

---

# Current Problems

## 1. Capability Leakage

Financial behaviour currently leaks into operational documents.

Examples:

- Item price suggestions appearing in Waybill
- Unit price injection reaching non-financial forms
- Financial metadata being evaluated where it has no meaning

Current fixes rely on scattered checks such as:

```
ctx !== "waybill"
```

instead of a single architectural contract.

---

## 2. Shared Form Instability

Observed across mobile:

- white flashes
- keyboard resize glitches
- blur/focus instability
- layout jumping
- repaint while typing
- viewport instability
- keyboard causing component remounts

Important:

These issues occur outside document forms as well.

Therefore this is treated as an application-shell/input rendering problem until proven otherwise.

---

## 3. Item Library Coupling

Item Library has become a shared engine instead of a reusable service.

Evidence includes:

- invoice suggestion engine
- quotation suggestion engine
- embedded price history
- cleanup engine
- duplicate detection
- history
- merge logic

Large portions are imported directly into financial forms.

---

## 4. Growing Technical Debt

Evidence:

- 6,350+ line module
- 1,122 line cleanup engine
- 1,037 line cleanup panel
- shared behaviours added incrementally
- context-specific guards spread across components

The architecture remains functional but difficult to evolve safely.

---

# Project Goals

1. Stabilize mobile input behaviour.

2. Remove capability leakage.

3. Keep one consistent UI across all document types.

4. Keep one shared form.

5. Reduce document-specific conditional logic.

6. Prepare the form for future document types.

---

# Non Goals

This project will NOT:

- rewrite document pages
- redesign UI
- migrate to another framework
- introduce Redux/Zustand
- rebuild Item Library
- introduce Redis/Kafka/Elastic

---

# Architecture Direction

The shared form remains.

Only document capabilities become modular.

The architecture becomes:

```
Shared Form

        │

        ▼

Document Capability Profile

        │

        ▼

Feature Modules

        │

        ▼

Domain Logic
```

The UI is shared.

Behaviour is selected by capability.

---

# Document Classification

## Financial Documents

- Invoice
- Quotation
- RFQ
- BOQ

Characteristics

✓ Prices

✓ Taxes

✓ Totals

✓ Item Suggestions

✓ Price History

✓ Financial Validation

✓ Discounts

✓ VAT

---

## Operational Documents

- Waybill
- CSR

Characteristics

✓ Items

✓ Quantity

✓ Units

✓ Attachments

✓ Notes

✗ Prices

✗ Taxes

✗ Financial Suggestions

✗ Price Injection

✗ Financial Validation

---

# Phase 1 — Global Input Stabilization

Objective

Determine why keyboard interaction causes flashing and unstable rendering.

Deliverables

- inspect AppShell
- inspect viewport listeners
- inspect resize listeners
- inspect focus handlers
- inspect theme transitions
- inspect keyboard events
- inspect modal behaviour
- inspect safe-area handling

Exit Criteria

Typing into any input should not:

- flash
- blur unexpectedly
- repaint the screen
- change background colour
- lose focus
- jump layout

---

# Phase 2 — Capability Extraction

Replace scattered document checks with a single capability model.

Instead of

```
ctx !== "waybill"
```

the form asks

```
supportsItemSuggestions
```

Instead of

```
ctx === "invoice"
```

the form asks

```
supportsFinancialFields
```

Instead of

```
hideUnitPrice
```

the form asks

```
supportsPricing
```

The shared UI no longer knows document types.

It only knows capabilities.

---

# Phase 3 — Item Library Boundary

Item Library becomes a provider.

Not a controller.

Responsibilities retained

- suggestions
- aliases
- history
- ranking
- cleanup
- merge

Responsibilities removed

- document behaviour
- document decisions
- UI assumptions

Documents choose which Item Library capabilities they consume.

Item Library never decides.

---

# Phase 4 — Financial Isolation

Financial logic is isolated behind financial capabilities.

Includes

- totals
- VAT
- discount
- markup
- pricing
- amount validation
- invoice calculations

Operational documents never evaluate these paths.

---

# Phase 5 — Performance Stabilization

Inspect and reduce unnecessary rendering.

Focus areas

- expensive memo chains
- repeated derived arrays
- unnecessary parent renders
- large list rendering
- heavy cleanup computations

No behavioural changes.

Performance only.

---

# Phase 6 — Export Stabilization

Audit every export path.

Separate:

- current-page export
- filtered export
- lifetime export
- JSON export
- PDF export

Document the limits of each.

Ensure large datasets are handled intentionally rather than accidentally.

---

# Success Criteria

The project is complete when:

✓ Mobile typing is visually stable.

✓ No document contains another document's behaviour.

✓ Financial features cannot appear inside operational documents.

✓ Operational documents remain lightweight.

✓ Shared form remains the single UI implementation.

✓ Item Library is consumed through capabilities rather than controlling document behaviour.

✓ Existing document UX remains visually consistent.

✓ No regression in Invoice or Quotation functionality.

---

# Future Work (Out of Scope)

After stabilization, future projects may include:

- Item Library decomposition
- Background job system
- Export pipeline redesign
- Document application services
- PostgreSQL full-text search
- Server-side PDF generation

These are intentionally deferred until the shared form platform is stable.

---

# Engineering Principles

1. Stabilize before optimizing.

2. Extract before rewriting.

3. One UI.

4. Multiple capabilities.

5. Domain behaviour must never leak across document types.

6. Shared infrastructure must remain document-agnostic.

7. Every new document should be added by defining capabilities, not by introducing new conditional branches throughout the UI.