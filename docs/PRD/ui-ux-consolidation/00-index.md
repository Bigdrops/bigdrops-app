# UI/UX Consolidation PRD

**Project:** BIGDROPS UI/UX Architecture Consolidation  
**Status:** Draft  
**Date:** 2026-06-30  
**Author:** AI Codebase Analysis

---

## Purpose

Consolidate redundant patterns, eliminate code duplication, and standardize the UI/UX architecture across all document modules (Invoice, Quotation, Waybill, CSR, BOQ, RFQ). The goal is **not a visual redesign** but a **structural cleanup** that reduces maintenance cost, improves consistency, and enforces the "single source of truth" principle across the presentation layer.

## Success Criteria

- [ ] New/Edit page pairs unified into single components per module (e.g., `InvoiceFormPage` replaces `NewInvoice` + `EditInvoice`)
- [ ] CSS Module pattern files reduced from 6× identical copies to 1 shared source
- [ ] Dead CSS tokens removed or documented
- [ ] Unused `App.css` removed
- [ ] `ui/sidebar.tsx` either adopted by Layout or removed
- [ ] Code size reduction of at least 15% across page components
- [ ] No visual regressions — existing tests pass

## Stakeholder Impact

| Role | Impact |
|---|---|
| Frontend engineers | Less code to maintain, single source of truth for patterns |
| QA | Fewer surfaces for regressions |
| Product | Faster iteration on form/view changes |
| New hires | Shorter onboarding — fewer patterns to learn |

## Non-Goals

- No visual redesign or rebranding
- No CSS-to-Tailwind conversion of existing modules
- No removal of existing functionality
- No changes to `src/lib/Calculations.ts`
- No changes to PDF rendering pipeline
