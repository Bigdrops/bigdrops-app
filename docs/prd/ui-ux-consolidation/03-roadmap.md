# Implementation Roadmap — UI/UX Consolidation PRD

**Total estimated effort:** 5-8 engineering days  
**Parallelizable:** Yes (several workstreams independent)

---

## Phase 1: Quick Wins (Day 1)

| Task | Effort | Owner |
|---|---|---|
| R4: Delete `App.css` and its import | 15 min | Any |
| R3: Audit & prune unused CSS tokens | 2 hours | Frontend |
| R6: Create `useWaybillColumns`, `useQuotationColumns`, `useCSRColumns` | 2 hours | Frontend |

## Phase 2: Sidebar Clarification (Day 2)

| Task | Effort | Owner |
|---|---|---|
| R5: Decide Option A vs B for sidebar | 1 hour discussion + 4 hours implementation | Frontend lead |
| Refactor Layout.tsx if needed | 3-4 hours | Frontend |

## Phase 3: CSS Pattern Consolidation (Days 2-3)

| Task | Effort | Owner |
|---|---|---|
| R2: Create shared CSS Modules in `document-view/shared/` | 4 hours | Frontend |
| Migrate 6 modules to use shared CSS Modules (or Tailwind) | 4 hours | Frontend |

## Phase 4: Major Refactor — New/Edit Page Unification (Days 3-7)

| Task | Effort | Owner |
|---|---|---|
| R1: Create `useInvoiceForm` hook | 4 hours | Senior frontend |
| R1: Create `InvoiceFormPage` + route update | 2 hours | Senior frontend |
| R1: Verify no regressions on Invoice forms | 2 hours | QA |
| R1: Repeat for Waybill | 4 hours | Senior frontend |
| R1: Repeat for Quotation | 3 hours | Frontend |
| R1: Repeat for CSR | 3 hours | Frontend |
| R1: Repeat for BOQ | 3 hours | Frontend |
| R1: Repeat for RFQ | 3 hours | Frontend |

## Phase 5: Cleanup (Day 8)

| Task | Effort | Owner |
|---|---|---|
| R7: Extract mobile form primitives | 1 hour | Any |
| R8: Standardize portal usage | 2 hours | Frontend |
| R9: Audit SortableLineItem scope | 1 hour | Frontend |

---

## Dependency Graph

```
Phase 1 (quick wins) ─── no deps
Phase 2 (sidebar)    ─── no deps
Phase 3 (CSS)        ─── no deps
Phase 4 (New/Edit)   ─── no deps, but largest effort
Phase 5 (cleanup)    ─── no deps
```

All phases can run in parallel with separate engineers.

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| New/Edit unification breaks form submission | Feature-flag the unified page; run existing tests before delete |
| CSS consolidation causes visual regressions | Snapshot tests on view pages before/after |
| Token pruning removes something in use | Grep aggressively; stage removals separately per commit |
| Sidebar change affects navigation | Manual QA pass on desktop + mobile nav before merge |
