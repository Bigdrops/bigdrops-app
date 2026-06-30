
---

## **📄 `docs/PRD/UI-UX-Consolidation/08-decisions.md`**

```markdown
# UI/UX Consolidation — Decision Log

**Purpose:** Single source of truth for all architectural decisions made during the consolidation initiative. Prevents re-litigation of settled debates.

---

## 📋 Decision Log

| ID | Decision | Rationale | Date | Owner | Status | Related Docs |
|----|----------|-----------|------|-------|--------|--------------|
| D-001 | **CSR Switch = Platform Standard** | Eliminates 6 switch variants across Invoice, Quotation, Waybill, RFQ, CSR, Settings. Reduces maintenance burden and ensures visual consistency. | 2026-06-30 | Jason | ✅ **Approved** | `03-component-standards.md` |
| D-002 | **RichText001 = Toolbar Standard** | Unified toolbar across all document editors (Invoice, Quotation, Waybill, RFQ). Preserves existing editor engines (TipTap) while standardizing visual shell. | 2026-06-30 | Mr Yaga | ✅ **Approved** | `03-component-standards.md` |
| D-003 | **Sidebar001 = Sidebar Standard** | Replaces current Layout.tsx sidebar with template's scrolling behavior + visual language. Preserves existing navigation logic. | 2026-06-30 | Jason | ✅ **Approved** | `03-component-standards.md` |
| D-004 | **FilterButton001 = Filter Standard** | Standardizes filter/sort controls across all list views. Maintains existing functionality (grouping, dropdowns). | 2026-06-30 | Mr Yaga | ✅ **Approved** | `03-component-standards.md` |
| D-005 | **FloatingDisclosureBase = FAB Standard** | Replaces dashboard Floating+ with animated disclosure panel. Preserves existing actions (Invoice, Quote, etc.). | 2026-06-30 | Mr Yaga | ✅ **Approved** | `03-component-standards.md` |
| D-006 | **Template Picker = CSR Picker Standard** | CSR's picker becomes the universal template selector. Standardizes layout, spacing, hover, selected state, search, preview. | 2026-06-30 | Jason | ✅ **Approved** | `03-component-standards.md` |
| D-007 | **SharedDocumentForm = Unified Form Shell** | CSR form will be refactored to use SharedDocumentForm (currently Invoice/Quotation only). Reduces 861-line outlier. | 2026-06-30 | Jason | ✅ **Approved** | `migration-plan.md` |
| D-008 | **Two-Step Sign Out** | Prevents accidental logout. Requires confirmation dialog before destroying session. | 2026-06-30 | Mr Yaga | ✅ **Approved** | `issue-tracker.md` (UX-002) |
| D-009 | **Sticky First Column in Tables** | Prevents context loss when scrolling wide tables. Applies to DataGrid in all modules. | 2026-06-30 | Mr Yaga | ✅ **Approved** | `issue-tracker.md` (UX-003) |
| D-010 | **Reduced-Motion Support** | Respects `prefers-reduced-motion` for all animations. WCAG compliance requirement. | 2026-06-30 | Jason | ✅ **Approved** | `02-inconsistency-report.md` |
| D-011 | **3-Phase CSS Convergence** | Phase 1: Clean (remove dead CSS) → Phase 2: Consolidate (unify tokens) → Phase 3: Componentize (shared primitives). | 2026-06-30 | Jason | ✅ **Approved** | `design-system-roadmap.md` |
| D-012 | **Design Tokens in `src/lib/design-tokens.ts`** | Single source of truth for spacing, radius, colors, animation. Replaces scattered CSS variables. | 2026-06-30 | Mr Yaga | ⚠️ **Proposed** | `design-system-roadmap.md` |
| D-013 | **Remove Dead Components** | 5 identified dead components (App.css, ui/sidebar.tsx, etc.). Cleanup reduces maintenance burden. | 2026-06-30 | Mr Yaga | ✅ **Approved** | `component-inventory.md` |
| D-014 | **Build InputGroup + ButtonGroup Primitives** | From templates (`filter-button-reference.tsx`, `richtextform.tsx`). Used across all forms. | 2026-06-30 | Mr Yaga | ⚠️ **Proposed** | `migration-plan.md` |
| D-015 | **Column Locking in DataGrid** | First column sticky, rest scrollable. Prevents horizontal scrolling context loss. | 2026-06-30 | Mr Yaga | ✅ **Approved** | `issue-tracker.md` (UX-003) |
| D-016 | **Mobile-First Safe Areas** | Respect `env(safe-area-inset-*)` for all bottom sheets/FABs. | 2026-06-30 | Jason | ⚠️ **Proposed** | `02-inconsistency-report.md` |

---

## 🔄 Decision Workflow

### How to Add a New Decision
1. **Propose:** Open a PR with the decision in this file (status: `⚠️ Proposed`)
2. **Discuss:** Team review in PR comments
3. **Approve:** After consensus, change status to `✅ Approved`
4. **Implement:** Reference the decision ID in implementation PRs
5. **Revisit:** If new evidence emerges, open a new PR to amend/reverse

### Decision Types
| Type | Description | Example |
|------|-------------|---------|
| **Standard** | Adopts a component/pattern as the platform standard | D-001 (CSR Switch) |
| **Architecture** | Structural changes to the codebase | D-011 (3-Phase CSS) |
| **UX** | User experience improvements | D-008 (Two-Step Sign Out) |
| **Accessibility** | WCAG compliance | D-010 (Reduced-Motion) |
| **Cleanup** | Removing technical debt | D-013 (Dead Components) |

---
## 📊 Decision Impact Tracking

| Decision | Effort | Risk | Impact | Phase |
|----------|--------|------|--------|-------|
| D-001 (CSR Switch) | Low (1 day) | Low | High | 1 |
| D-002 (RichText001) | Low (2 days) | Low | High | 1 |
| D-003 (Sidebar001) | Medium (3 days) | Medium | High | 2 |
| D-004 (FilterButton001) | Low (1 day) | Low | Medium | 1 |
| D-005 (FloatingDisclosure) | Medium (2 days) | Low | Medium | 2 |
| D-006 (Template Picker) | Medium (3 days) | Medium | High | 2 |
| D-007 (SharedDocumentForm) | High (1 week) | Medium | High | 2 |
| D-008 (Two-Step Sign Out) | Low (<1 day) | Low | High | 1 |
| D-009 (Sticky Columns) | Low (1 day) | Low | Medium | 1 |
| D-010 (Reduced-Motion) | Low (1 day) | Low | High | 1 |
| D-011 (3-Phase CSS) | High (2 weeks) | Medium | High | 3 |
| D-012 (Design Tokens) | Medium (3 days) | Low | High | 3 |
| D-013 (Dead Components) | Low (2 hours) | Low | Low | 1 |
| D-014 (InputGroup/ButtonGroup) | Medium (2 days) | Low | Medium | 1 |
| D-015 (Column Locking) | Low (1 day) | Low | Medium | 1 |
| D-016 (Safe Areas) | Low (1 day) | Low | Medium | 3 |

---