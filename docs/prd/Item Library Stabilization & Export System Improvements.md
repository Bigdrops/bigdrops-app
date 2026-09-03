# PRD: Item Library Stabilization & Export System Improvements

**Project:** BIGDROPS Business Platform  
**Status:** Planned  
**Priority:** High  
**Owner:** BIGDROPS Engineering  
**Created:** 2026-06-30

---

# Background

The Invoice and Quotation workflows have recently undergone major architectural improvements, including:

- Stable group ordering
- Atomic group creation
- Save blocker auto-scroll
- Shared "Clear All" functionality
- JSON import order preservation
- Edit Invoice stability fixes

With the document editing experience now significantly improved, the next focus is the **Item Library ecosystem** and the **Bulk Export system**.

These systems are foundational to procurement, estimation, invoicing, and long-term catalog management. They require stabilization before introducing additional productivity features.

---

# Objectives

## Primary Objectives

- Stabilize the Item Library.
- Ensure cleanup export/import is reliable.
- Ensure Bulk Export accurately reflects current filters and sorting.
- Remove inconsistencies between export pipelines.
- Improve confidence in catalog maintenance.

---

# Scope

This PRD covers two major systems:

1. Item Library
2. Bulk Export

It does **not** include:

- PDF generation
- JSON document import
- Invoice editing
- Quotation editing
- Group rendering
- Save blocker improvements
- Document UI redesign

Those are already completed.

---

# Phase 1 — Item Library Stabilization

## Goal

Make the Item Library trustworthy as the single source of truth for reusable items.

---

## 1. Cleanup Export

### Audit

Investigate:

- Export payload correctness
- Missing fields
- Alias preservation
- Duplicate entries
- Batch metadata
- Version compatibility

### Success

Exported cleanup files must contain every required piece of information needed for reconstruction.

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 2. Cleanup Import

### Audit

Investigate:

- Import validation
- Alias restoration
- Merge handling
- Error reporting
- Rollback safety
- Partial failures

### Success

Previously exported cleanup files can be imported without data corruption.

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 3. Duplicate Detection

Audit:

- False positives
- False negatives
- Normalization
- Ranking quality

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 4. Merge Workflow

Audit:

- Alias migration
- History preservation
- Foreign-key updates
- Audit logging
- Rollback capability

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 5. Suggestion Engine

Audit:

- Ranking
- Alias prioritization
- Standard price selection
- Last-used ordering
- Merge awareness

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 6. Catalog Integrity

Audit:

- Orphan aliases
- Broken references
- Missing catalog links
- Imported item consistency

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 7. Performance

Audit:

- Large catalog search
- Duplicate review
- Merge performance
- Cleanup performance

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

# Phase 2 — Bulk Export Stabilization

## Goal

Ensure exported data exactly matches the user's current view.

---

## 1. CSV Export

Audit:

- Column accuracy
- Escaping
- Missing fields
- Empty values
- Large exports

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 2. JSON Export

Audit:

- Record completeness
- Nested relationships
- Schema consistency
- Export ordering

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 3. Filtering

Verify export respects:

- Date filters
- Status filters
- Client filters
- Amount filters
- Search filters

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 4. Sorting

Verify export order matches:

- Current sort column
- Current direction
- User expectations

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 5. Nested Documents

Verify exports correctly include:

- Invoice items
- Quotation items
- BOQ items
- Related entities where applicable

Status:

- [ ] Not Started
- [ ] In Progress
- [ ] Completed

---

## 6. Module Coverage

Review support for:

- [ ] Invoices
- [ ] Quotations
- [ ] Waybills
- [ ] Projects
- [ ] RFQs
- [ ] BOQs
- [ ] Clients
- [ ] CSR (determine whether support should be added)

---

# Out of Scope

The following are intentionally excluded:

- PDF export
- Document print layouts
- AI JSON Import
- Shared Document Form
- Group rendering
- Save validation
- Invoice editor
- Quotation editor
- Waybill editor

---

# Risks

Potential risks include:

- Catalog corruption during merge
- Alias loss
- Incorrect export schemas
- Export performance degradation
- Large dataset memory usage
- Regression in document references

---

# Deliverables

Each completed task must produce:

- Architecture summary
- Root cause
- Files modified
- Before/after behavior
- Edge cases
- Remaining limitations
- Manual testing notes

---

# Progress Tracker

| Task | Status |
|-------|--------|
| Cleanup Export Audit | ⬜ |
| Cleanup Export Fix | ⬜ |
| Cleanup Import Audit | ⬜ |
| Cleanup Import Fix | ⬜ |
| Duplicate Detection | ⬜ |
| Merge Workflow | ⬜ |
| Suggestion Engine | ⬜ |
| Catalog Integrity | ⬜ |
| Performance Review | ⬜ |
| CSV Bulk Export | ⬜ |
| JSON Bulk Export | ⬜ |
| Export Filters | ⬜ |
| Export Sorting | ⬜ |
| Nested Export Validation | ⬜ |
| Module Coverage Review | ⬜ |
| Final Regression | ⬜ |

---

# Definition of Done

This initiative is complete when:

- Cleanup export/import is fully reliable.
- Item Library integrity is preserved across merges and cleanup operations.
- Bulk exports faithfully reproduce the user's filtered and sorted dataset.
- No regressions are introduced into existing document workflows.
- All identified architectural issues have been resolved or documented with justified limitations.