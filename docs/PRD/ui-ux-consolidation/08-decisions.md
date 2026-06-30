
---

## **📄 `docs/PRD/UI-UX-Consolidation/08-decisions.md`**

```markdown
# UI/UX Consolidation — Decision Log

**Purpose:** Single source of truth for all architectural decisions made during the consolidation initiative. Prevents re-litigation of settled debates.

**Status Legend:**
- ⚠️ **Proposed** – Under discussion
- ✅ **Accepted** – Consensus reached, not yet implemented
- 🟢 **Implemented** – Code merged
- 🔄 **Superseded** – Replaced by newer decision
- ❌ **Rejected** – Will not proceed

---

## 📋 Decision Log

| ID | Decision | Rationale | Date | Owner | Status | Confidence | Related Docs |
|----|----------|-----------|------|-------|--------|------------|--------------|
| D-001 | **CSR Switch = Platform Standard** | Eliminates 6 switch variants across Invoice, Quotation, Waybill, RFQ, CSR, Settings. Reduces maintenance burden and ensures visual consistency. | 2026-06-30 | Architecture Team | ✅ Accepted | High | `03-component-standards.md` |
| D-002 | **RichText001 = Toolbar Standard** | Unified toolbar across all document editors (Invoice, Quotation, Waybill, RFQ). Preserves existing editor engines (TipTap) while standardizing visual shell. | 2026-06-30 | UI Team | ✅ Accepted | High | `03-component-standards.md` |
| D-003 | **Sidebar001 = Sidebar Standard** | Replaces current Layout.tsx sidebar with template's scrolling behavior + visual language. Preserves existing navigation logic. | 2026-06-30 | Architecture Team | ✅ Accepted | Medium | `03-component-standards.md` |
| D-004 | **FilterButton001 = Filter Standard** | Standardizes filter/sort controls across all list views. Maintains existing functionality (grouping, dropdowns). | 2026-06-30 | UI Team | ✅ Accepted | High | `03-component-standards.md` |
| D-005 | **FloatingDisclosureBase = FAB Standard** | Replaces dashboard Floating+ with animated disclosure panel. Preserves existing actions (Invoice, Quote, etc.). | 2026-06-30 | UI Team | ✅ Accepted | High | `03-component-standards.md` |
| D-006 | **Template Picker = CSR Picker Standard** | CSR's picker becomes the universal template selector. Standardizes layout, spacing, hover, selected state, search, preview. | 2026-06-30 | Architecture Team | ✅ Accepted | High | `03-component-standards.md` |
| D-007 | **SharedDocumentForm = Unified Form Shell** | CSR form will be refactored to use SharedDocumentForm (currently Invoice/Quotation only). Reduces 861-line outlier. | 2026-06-30 | Architecture Team | ✅ Accepted | Medium | `migration-plan.md` |
| D-008 | **Two-Step Sign Out** | Prevents accidental logout. Requires confirmation dialog before destroying session. | 2026-06-30 | Product | ✅ Accepted | High | `issue-tracker.md` (UX-002) |
| D-009 | **Sticky First Column in Tables** | Prevents context loss when scrolling wide tables. Applies to DataGrid in all modules. | 2026-06-30 | Product | ✅ Accepted | High | `issue-tracker.md` (UX-003) |
| D-010 | **Reduced-Motion Support** | Respects `prefers-reduced-motion` for all animations. WCAG compliance requirement. | 2026-06-30 | Architecture Team | ✅ Accepted | High | `02-inconsistency-report.md` |
| D-011 | **3-Phase CSS Convergence** | Phase 1: Clean (remove dead CSS) → Phase 2: Consolidate (unify tokens) → Phase 3: Componentize (shared primitives). | 2026-06-30 | Architecture Team | ✅ Accepted | High | `design-system-roadmap.md` |
| D-012 | **Single Design Token Source of Truth** | All design tokens (spacing, radius, colors, animation, etc.) should have a single, centralized source. Implementation format (CSS vars/TS/JSON) TBD. | 2026-06-30 | Architecture Team | ✅ Accepted | Medium | `design-system-roadmap.md` |
| D-013 | **Candidate Components for Removal** | Components identified as potentially unused: `App.css`, `ui/sidebar.tsx`. Requires runtime verification before deletion. | 2026-06-30 | Architecture Team | ✅ Accepted | Low | `component-inventory.md` |
| D-014 | **InputGroup + ButtonGroup Primitives** | Create shared primitives from templates (`filter-button-reference.tsx`, `richtextform.tsx`). Used across all forms. | 2026-06-30 | UI Team | ✅ Accepted | Medium | `migration-plan.md` |
| D-015 | **Column Locking in DataGrid** | First column sticky, rest scrollable. Prevents horizontal scrolling context loss. | 2026-06-30 | Product | ✅ Accepted | High | `issue-tracker.md` (UX-003) |
| D-016 | **Mobile-First Safe Areas** | Respect `env(safe-area-inset-*)` for all bottom sheets/FABs. | 2026-06-30 | Architecture Team | ✅ Accepted | Medium | `02-inconsistency-report.md` |

---

## 🔄 Decision Workflow

### How to Add a New Decision
1. **Propose:** Open a PR adding the decision with status `⚠️ Proposed`
2. **Discuss:** Team review in PR comments
3. **Accept:** After consensus, change status to `✅ Accepted`
4. **Implement:** Reference the decision ID in implementation PRs
5. **Track:** Update status to `🟢 Implemented` when merged
6. **Revisit:** If new evidence emerges, open a PR to amend/reverse (status `🔄 Superseded` or `❌ Rejected`)

### Decision Types
| Type | Description | Example |
|------|-------------|---------|
| **Standard** | Adopts a component/pattern as the platform standard | D-001 (CSR Switch) |
| **Architecture** | Structural changes to the codebase | D-011 (3-Phase CSS) |
| **UX** | User experience improvements | D-008 (Two-Step Sign Out) |
| **Accessibility** | WCAG compliance | D-010 (Reduced-Motion) |
| **Cleanup** | Removing technical debt | D-013 (Dead Component Candidates) |

---
## 📊 Decision Impact Tracking

| Decision | Effort | Risk | Impact | Phase | Confidence |
|----------|--------|------|--------|-------|------------|
| D-001 (CSR Switch) | Low (1 day) | Low | High | 1 | High |
| D-002 (RichText001) | Low (2 days) | Low | High | 1 | High |
| D-003 (Sidebar001) | Medium (3 days) | Medium | High | 2 | Medium |
| D-004 (FilterButton001) | Low (1 day) | Low | Medium | 1 | High |
| D-005 (FloatingDisclosure) | Medium (2 days) | Low | Medium | 2 | High |
| D-006 (Template Picker) | Medium (3 days) | Medium | High | 2 | Medium |
| D-007 (SharedDocumentForm) | High (1 week) | Medium | High | 2 | Medium |
| D-008 (Two-Step Sign Out) | Low (<1 day) | Low | High | 1 | High |
| D-009 (Sticky Columns) | Low (1 day) | Low | Medium | 1 | High |
| D-010 (Reduced-Motion) | Low (1 day) | Low | High | 1 | High |
| D-011 (3-Phase CSS) | High (2 weeks) | Medium | High | 3 | Medium |
| D-012 (Design Tokens) | Medium (3 days) | Low | High | 3 | Medium |
| D-013 (Component Cleanup) | Low (2 hours) | Low | Low | 1 | High |
| D-014 (InputGroup/ButtonGroup) | Medium (2 days) | Low | Medium | 1 | Medium |
| D-015 (Column Locking) | Low (1 day) | Low | Medium | 1 | High |
| D-016 (Safe Areas) | Low (1 day) | Low | Medium | 3 | Medium |
---