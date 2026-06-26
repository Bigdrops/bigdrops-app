# BIGDROPS Form Platform Stabilization & Evolution Plan

**Status:** Proposed
**Objective:** Stabilize the existing platform before introducing new architecture.
**Principle:** Evidence-first. Refactor only after root causes are confirmed.

---

# Guiding Principles

1. Preserve the current UI/UX.
2. Preserve existing workflows.
3. Avoid rewrites.
4. Separate platform issues from business logic issues.
5. Extract responsibilities only after boundaries are verified.
6. Every phase must leave the application in a deployable state.

---

# Phase 0 — Platform Stabilization (Highest Priority)

## Goal

Determine why mobile input experiences are unstable across the entire application.

## Scope

Not limited to document forms.

Investigate:

- AppShell
- Global layout
- Mobile viewport handling
- Keyboard handling
- Safe area calculations
- Focus management
- CSS transitions
- Modal infrastructure
- Scroll containers
- Input remounting
- React render lifecycle

## Deliverables

- Root cause report
- Render trace
- Keyboard interaction trace
- List of components causing remounts
- List of unnecessary re-renders

## Exit Criteria

- Keyboard no longer causes:
  - white flashes
  - blur
  - focus loss
  - layout jumping
  - unnecessary repainting

No architecture work begins before this is complete.

---

# Phase 1 — Capability Model

## Goal

Replace scattered document-type conditionals with a formal capability model.

Current symptoms include:

- ctx !== "waybill"
- invoice-specific feature leakage
- repeated document checks
- hidden feature coupling

Instead introduce one document capability registry.

Example concept:

Financial

- Invoice
- Quotation
- BOQ
- RFQ

Operational

- Waybill
- CSR

Capabilities become declarative.

Examples

- supportsPricing
- supportsVAT
- supportsDiscounts
- supportsItemSuggestions
- supportsFinancialTotals
- supportsPaymentTracking

Every existing conditional should derive from these capabilities.

## Deliverables

- Capability registry
- Capability audit
- Removal of duplicated document checks
- Migration map

## Exit Criteria

No feature is enabled or disabled using hardcoded document names.

Everything derives from capabilities.

---

# Phase 2 — Shared Form Audit

## Goal

Determine which parts of the form are truly shared.

Split responsibilities into layers.

Layer 1

Shared UI

Examples

- Inputs
- Selects
- Tables
- Attachments
- Notes

Layer 2

Shared Form Engine

Examples

- validation
- dirty tracking
- autosave
- keyboard navigation
- line item management

Layer 3

Financial Extensions

Examples

- price history
- tax
- discounts
- totals
- payment state
- invoice calculations

Layer 4

Operational Extensions

Examples

- logistics
- delivery
- transport
- execution
- fulfillment

## Deliverables

Dependency graph

Shared component inventory

Extension point inventory

Feature ownership map

## Exit Criteria

Financial logic no longer exists inside operational workflows.

Operational workflows no longer disable financial behavior.

Instead they simply never enable it.

---

# Phase 3 — Item Library Decomposition

## Goal

Reduce module complexity without changing user experience.

Current evidence

- ~6,350 LOC
- Multiple unrelated responsibilities
- Shared by Invoice and Quotation
- Partial coupling into forms

Target bounded contexts

Item Catalog

- master item records
- aliases
- categories

Pricing Intelligence

- price history
- historical analytics
- suggestion ranking

Suggestion Engine

- search
- matching
- recommendation
- ranking

Cleanup

- duplicate detection
- merge planning
- normalization

Merge History

- audit
- history
- recovery

Import Services

- fallback imports
- exchange payloads

## Deliverables

Dependency map

Coupling report

Extraction sequence

## Exit Criteria

No single module owns unrelated business responsibilities.

---

# Phase 4 — Export Platform

## Goal

Stabilize large exports before scaling.

Audit

- dataset sizes
- browser memory
- serialization
- Supabase response size
- nested relationship expansion

Determine

- synchronous exports
- asynchronous exports
- background jobs
- progress tracking

## Exit Criteria

Large exports become predictable and measurable.

---

# Phase 5 — Performance

Focus areas

- render profiling
- expensive hooks
- unnecessary state propagation
- virtualization
- memoization
- query optimization
- dashboard aggregation
- report aggregation

No architectural rewrites.

Only evidence-backed optimization.

---

# Phase 6 — Future Architecture

Only after Phases 0–5 are complete.

Evaluate

- background jobs
- Redis
- server-side PDF generation
- report caching
- PostgreSQL full-text search
- eventual Item Library services

Explicitly out of scope

- Kafka
- Microservices
- Elasticsearch

Unless future scale justifies them.

---

# Success Criteria

The project should achieve the following outcomes:

## Platform

- Stable mobile keyboard experience
- No layout flashing
- No focus instability

## Forms

- One consistent UI across all document types
- Capability-driven behavior
- No document-specific hacks

## Item Library

- Clear bounded responsibilities
- Reduced coupling
- Easier maintenance

## Performance

- Predictable rendering
- Stable exports
- Measurable bottlenecks

## Architecture

- Preserve the modular monolith
- Increase internal modularity
- Reduce accidental coupling
- Prepare for future scalability without premature infrastructure