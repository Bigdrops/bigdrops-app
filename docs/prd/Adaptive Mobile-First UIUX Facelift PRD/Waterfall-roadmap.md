# 🏗️ WATERFALL ROADMAP [EXECUTION SEQUENCE]

> ⛔ **STATUS: PENDING FINALIZATION**
> 
> This is a **Living Command Document**. No plan has been finalized, so all phases below are set to **PENDING**. 
> *Once the PRD and Technical Plan are signed off, this document becomes the single source of truth for execution order.*
> 
> *Owner:* [Your Name/Team]

---

## 📊 MASTER PROGRESS BAR
`[███░░░░░░░] 30%` | **Total Milestones:** 7 | **Current Phase:** Phase 3

---

## 🎯 MILESTONE TRACKER

| ID | Milestone / Phase | Priority | Status | % Complete | Last Updated |
|----|-------------------|----------|--------|------------|--------------|
| M1 | Navigation & Layout | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-06 |
| M2 | PDF Customize Unification (🎨 button) | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-06 |
| M3 | Accounting Foundation (Service + UI) | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-06 |
| M4 | Document View Enhancements | MED | ⏭️ SUPERSEDED | 0% | 2026-09-06 |
| M5 | Invoice/Quotation PDF Rendering | CRIT | ⛔ PENDING | 0% | N/A |
| M6 | Testing & Regression Coverage | MED | 🔄 IMPROVED | 60% | 2026-09-06 |
| M7 | Deployment / Go-Live | HIGH | ⛔ PENDING | 0% | N/A |

---

## 📝 EXECUTION STEPS (The Ordered Plan)

### Phase 1: Navigation & Layout — ✅ IMPLEMENTED
- [x] **Step 1:** Convert Mobile More page from popup/sheet to full-page `/more` route
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** Wire all routes (`/more`, `/accounting`, `/accounting/add`, `/accounting/:id`)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** Refactor RecentAlertsCarousel to use embla Carousel
  - *Status:* ✅ IMPLEMENTED

### Phase 2: PDF Customize Unification — ✅ IMPLEMENTED
- [x] **Step 1:** Extend DocumentCustomizeCard with optional slots (bank account, tagline, footer, output options)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** Create CommercialTemplatePicker — compact 7-template grid for commercial docs
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** Wire ViewQuotation to shared DocumentSheet + DocumentCustomizeCard
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 4:** Wire InvoiceOverlays to shared DocumentSheet + DocumentCustomizeCard
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 5:** Delete PdfOutputCustomizeSheet (replaced by shared components)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 6:** Update pdfRegressionCleanup tests for new architecture
  - *Status:* ✅ IMPLEMENTED

### Phase 3: Accounting Foundation — ✅ IMPLEMENTED
- [x] **Step 1:** Source transaction service layer + types
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** Supabase migration (source_transactions table + RLS)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** UI list page with stats cards
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 4:** Detail view + add form
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 5:** Detail actions sheet
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 6:** Contract tests (32 passing)
  - *Status:* ✅ IMPLEMENTED

### Phase 4: Document View Enhancements — ⏭️ SUPERSEDED
- [x] **Step 1:** Delete frontend-design skill, designate apple-design as primary UI/UX skill
  - *Status:* ⏭️ SUPERSEDED (scope reduced, apple-design now primary)

### Phase 5: Invoice/Quotation PDF Rendering — ⛔ PENDING
- [ ] **Step 1:** [TBD] — pending future planning
- [ ] **Step 2:** [TBD] — pending future planning

### Phase 6: Testing & Regression Coverage — 🔄 IMPROVED
- [x] **Step 1:** moreNavigation tests (5 passing)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** accountingPersistenceContract tests (10 passing)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** sourceTransactionContract tests (32 passing)
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 4:** Update pdfRegressionCleanup tests for new architecture
  - *Status:* 🔄 IMPROVED

### Phase 7: Deployment / Go-Live — ⛔ PENDING
- [ ] **Step 1:** [TBD] — pending future planning

---

## 📌 CHANGELOG / LOG OF DECISIONS

| Date | Action Taken | Status Applied | Reason / Note |
|------|--------------|----------------|---------------|
| 2026-09-06 | Navigation & layout complete | ✅ IMPLEMENTED | Full-page More route, all routes wired |
| 2026-09-06 | PDF customize unified | ✅ IMPLEMENTED | Single shared popup replaces per-doc-type sheets |
| 2026-09-06 | Accounting foundation shipped | ✅ IMPLEMENTED | Service layer, UI, migration, 32 tests |
| 2026-09-06 | frontend-design skill deleted | ⏭️ SUPERSEDED | apple-design designated as primary UI/UX skill |
| 2026-09-06 | Tests updated for new architecture | 🔄 IMPROVED | 11/13 pass, 2 pre-existing failures in untouched files |