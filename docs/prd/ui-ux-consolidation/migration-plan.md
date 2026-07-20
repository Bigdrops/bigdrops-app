# Migration Plan

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Timeline:** 6 months total (Phase 1: Month 1, Phase 2: Months 2-3, Phase 3: Months 4-6)

---

## Executive Summary

The migration plan moves BIGDROPS from its current hybrid-utility state to a unified design system with consistent UX patterns. The plan is organized into 3 phases: **Clean** (low-risk removals), **Consolidate** (patterns converge), and **Componentize** (build missing primitives). Each phase has verifiable exit criteria.

---

## Migration Strategy

- **No big-bang rewrite** — every step preserves existing functionality
- **Side-by-side compatibility** — old and new patterns coexist during transition
- **CSS-first** — visual changes are handled via CSS before component refactors
- **Dead code deleted first** — remove unused weight before adding new patterns

---

## Phase 1: Clean (Month 1)

### Week 1: Dead Code Removal

| Task | Files | Risk | Acceptance |
|------|-------|------|------------|
| Delete `App.css` | `src/styles/App.css` | None (not imported) | Build succeeds, no visual change |
| Delete `Dashboard.tsx` | `src/pages/Dashboard.tsx` | None (DashboardRedesign is active) | Build succeeds, route still works |
| Delete `sidebar.tsx` | `src/components/ui/sidebar.tsx` | Low (Layout.tsx uses DesktopSidebar) | Build succeeds, no missing imports |
| Delete `FormNavigationItem.tsx` | `src/components/document/FormNavigationItem.tsx` | Low (not imported) | Build succeeds |
| Delete `FormNavigation.tsx` | `src/components/layout/FormNavigation.tsx` | Low (only imported by dead FormNavigationItem) | Build succeeds |

**Exit criteria**: `bun run build` passes, no visual regression on any page.

### Week 2: CSS Audit

| Task | Files | Effort |
|------|-------|--------|
| Audit formTheme.css for unused tokens | `formTheme.css` | 1 day |
| Deduplicate `@keyframes` between index.css + formTheme.css | Both | 1 day |
| Standardize animation durations (use `--bd-duration-fast/md/slow` tokens) | `index.css` | 0.5 day |

**Exit criteria**: formTheme.css reduced by 30%+, no duplicate `@keyframes`, all animations use tokenized durations.

### Week 3: Quick UX Fixes

| Task | Effort |
|------|--------|
| K4 — Sign-out confirmation dialog (AlertDialog) | 0.5 day |
| K5 — First column sticky in DataGrid | 1 day |
| D2 — Add `reducedMotion` check via `useReducedMotion()` hook from framer-motion | 0.5 day |

**Exit criteria**: Sign-out shows confirmation, first column sticks on scroll, reduced-motion disables framer-motion animations.

### Week 4: Mobile Baseline

| Task | Effort |
|------|--------|
| K9 — Increase touch targets on MobileItemCard drag handles | 1 day |
| D5 — Add AnimatePresence route transitions | 1 day |
| Add safe-area-inset CSS variables for iOS | 1 day |

**Exit criteria**: Drag handles ≥44×44px on mobile, page transitions animate, safe areas respected on iPhone X+.

---

## Phase 2: Consolidate (Months 2-3)

### Month 2: Token System

| Task | Effort |
|------|--------|
| Convert BigDrops hex tokens to hsl format | 2 days |
| Merge BigDrops tokens into shadcn :root layer | 1 day |
| Add missing semantic tokens (border-radius, spacing, safe-area) | 1 day |
| Create `tailwind.presets.ts` | 1 day |
| Audit components for raw color values vs token references | 2 days |

### Month 3: Form Unification & Patterns

| Task | Effort |
|------|--------|
| K8 — Fix sidebar scroll restoration timing | 1 day |
| K6 — Build sortable column UI in settings | 2 days |
| Start CSR → SharedDocumentForm migration (data layer prep) | 3 days |
| Build section components for CSR form (extract from 861 lines) | 3 days |

**Exit criteria**: One CSS variable layer, no duplicated token systems, CSR form split into manageable sub-components, all 11 reported issues resolved.

---

## Phase 3: Componentize (Months 4-6)

### Month 4: Build Missing Primitives

| Task | Effort |
|------|--------|
| Build `input-group.tsx` from template | 1 day |
| Build `button-group.tsx` from template | 1 day |
| Adopt `reui/sortable` in FormLineItems | 2 days |
| Build FAB component with staggered items | 1 day |

### Month 5: CSR Overhaul

| Task | Effort |
|------|--------|
| Implement CsrFormScreen → SharedDocumentForm migration | 5 days |
| Convert CSRPreviewContent.js → .tsx | 1 day |
| Add mobile form support for CSR | 2 days |

### Month 6: Polish & Docs

| Task | Effort |
|------|--------|
| K7 — CSR universal toggle | 1 day |
| Responsive audit: BOQ/RFQ mobile forms | 5 days |
| Component documentation | 5 days |
| Final CSS audit | 1 day |

**Exit criteria**: All 16 issues resolved, all 9 templates adopted or reviewed, CSR uses SharedDocumentForm, BOQ/RFQ functional on mobile, 3 of 5 oversized files split.

---

## Dependencies

| Task | Depends On |
|------|-----------|
| D2 (Reduced motion) | framer-motion (already installed) |
| K5 (Column lock) | DataGrid already built — CSS change only |
| K6 (Sortable columns) | moveColumn hook exists — needs UI component |
| CSR migration | SharedDocumentForm already supports invoice/quotation |
| reui/sortable adoption | reui/sortable module already exists |
| Mobile BOQ/RFQ | mobileFormPrimitives exist for invoice — extend |

---

## Rollback Plan

Every migration task has a rollback strategy:

- **CSS changes**: Revert single commit
- **Component changes**: Wrap new implementation in feature flag
- **Dead code removal**: Files are git-deleted, recoverable via `git checkout <hash> -- <path>`
- **Token system merge**: Keep old tokens alongside new for 1 release cycle, remove in next

---

## Affected Files (Complete)

### Phase 1
- `src/styles/App.css` — delete
- `src/pages/Dashboard.tsx` — delete
- `src/components/ui/sidebar.tsx` — delete
- `src/components/document/FormNavigationItem.tsx` — delete
- `src/components/layout/FormNavigation.tsx` — delete
- `src/styles/formTheme.css` — audit
- `src/styles/index.css` — deduplicate
- `src/components/layout/MobileSidebar.tsx` — sign-out dialog
- `src/components/reui/data-grid/` — sticky column
- `src/components/invoice/MobileItemCard.tsx` — touch target
- `src/App.tsx` — route transitions

### Phase 2
- `tailwind.config.cjs` — tokens
- `src/styles/index.css` — token merge
- `src/components/layout/DesktopSidebar.tsx` — scroll fix
- `src/components/csr/CsrFormScreen.tsx` — split

### Phase 3
- `src/components/ui/input-group.tsx` — create
- `src/components/ui/button-group.tsx` — create
- `src/components/document/FormLineItems.tsx` — sortable migration
- `src/components/csr/CsrFormScreen.tsx` — SharedDocumentForm migration
- `src/components/csr/CSRPreviewContent.js` — convert to tsx

---

## Future Considerations

- After migration, run a full a11y audit (WCAG 2.2 AA)
- Set up Chromatic visual regression testing for component library
- Consider extracting UI primitives into their own package for future mobile app
