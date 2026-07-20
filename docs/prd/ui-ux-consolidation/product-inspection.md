# Product Inspection — UX Feel Assessment

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Focus:** How the application feels to real users — navigation rhythm, form interaction, visual polish, mobile experience

---

## Executive Summary

BIGDROPS is a functional, data-dense B2B application that prioritizes completeness over polish. The core document workflows work end-to-end, but the feel is utilitarian — minimal motion, inconsistent spacing and alignment across modules, and a noticeable gap between the Radix-powered interactive components (dialogs, sheets, selects) which feel modern, and the custom-built form sections which feel dense and static. The application lacks a consistent micro-interaction language: confirmations, transitions, loading affordances, and error feedback vary by module.

---

## Scope

- Navigation experience (sidebar, mobile nav, tabs)
- Form interaction patterns (create/edit across all modules)
- List/table browsing experience
- Document view experience
- Settings and dashboard experience
- Mobile experience (iOS/Android via Capacitor)
- Loading, empty, and error states
- Visual consistency (spacing, typography, color hierarchy)

---

## Methodology

1. Manual inspection of all 48 page components for UX patterns
2. Comparison across module pairs: invoice↔quotation, BOQ↔RFQ, CSR↔waybill
3. Mobile responsiveness assessment (md: breakpoint at 768px)
4. Interaction mapping: every user action path evaluated for feedback
5. Template reference comparison against 9 target patterns

---

## Files Inspected

- All 48 page files in `src/pages/`
- `src/components/Layout.tsx` — navigation orchestrator
- `src/components/layout/DesktopSidebar.tsx` — desktop navigation
- `src/components/layout/MobileSidebar.tsx` — mobile drawer
- `src/components/layout/MobileBottomNav.tsx` — mobile tab bar
- `src/components/layout/ModuleShell.tsx` — list page shell
- `src/components/document/SharedDocumentForm.tsx` — unified form shell
- `src/components/csr/CsrFormScreen.tsx` — CSR form
- `src/components/waybill/WaybillFormOverlay.tsx` — waybill form
- `src/components/boq/BoqForm.tsx` — BOQ form
- `src/components/rfq/RfqForm.tsx` — RFQ form
- `src/components/dashboard/DashboardOverview.tsx` — dashboard
- `src/components/settings/SettingsShell.tsx` — settings
- `src/components/ui/` — 30+ UI primitive components
- `src/styles/formTheme.css` — design token layer
- `src/index.css` — main CSS with shadcn tokens + animations

---

## Screens Inspected

| Module | Create/Edit | View | List |
|--------|-------------|------|------|
| Invoice | NewInvoice, EditInvoice | ViewInvoice | Invoices |
| Quotation | NewQuotation, EditQuotation | ViewQuotation | Quotations |
| Waybill | NewWaybill, EditWaybill | ViewWaybill | Waybills |
| CSR | NewCSR, EditCSR | ViewCSR | CSR |
| BOQ | NewBoq, EditBoq | ViewBoq | Boqs |
| RFQ | NewRfq, EditRfq | ViewRfq | Rfqs |
| Client | AddClient, EditClient | ClientDetail | Clients |
| Project | NewProject | ProjectDetail, ProjectDocumentView | Projects |
| Auth | Login, ResetPassword, PendingApproval | — | — |
| Settings | — | Settings (12 sections) | — |
| Dashboard | — | DashboardRedesign | — |

---

## Findings

### 1. Navigation Experience

#### Desktop Sidebar (`DesktopSidebar.tsx`)
- **Persistent left rail** with nav items + business context section at bottom
- **Active state**: High-glighted nav item with colored icon + background — works well
- **Hover state**: `hover:bg-bd-surface-muted` — subtle but functional
- **Scroll**: `overflow-y-auto` with custom scrollbar — adequate
- **Missing**: No sign-out button on desktop sidebar (sign-out is only available in mobile drawer)
- **Missing**: No collapsible groups, no animated hover highlight, no resize handle
- **Missing**: Business context section scrolls away — should be sticky

**Template gap**: Reference `sidebar.tsx` has spring-animated hover follower, resize handle, collapsible groups with animated chevrons, and `AnimatePresence` transitions. Current sidebar has none of these.

#### Mobile Navigation
- **Drawer**: `MobileSidebar.tsx` — slide-in from left, covers full viewport
- **Bottom tab bar**: `MobileBottomNav.tsx` — 5 tabs (Dashboard, Invoices, CSR, More...)
- **More sheet**: `MobileMoreSheet.tsx` — bottom sheet for overflow nav items
- **Feel**: The drawer feels smooth (Radix sheet). Bottom tab bar is standard mobile pattern. Works adequately.

**Missing**: Sign-out in mobile drawer lacks confirmation dialog.

### 2. Form Interaction Patterns

#### Invoice / Quotation (`SharedDocumentForm`)
- **Flow**: Select client → Edit document metadata → Add line items → Configure terms → Preview/Save
- **Interaction**: Sections collapse/expand; line items drag-to-reorder; rich text for notes/terms
- **Rich text toolbar**: Fully functional (Bold, Italic, Underline, List, Clear) — issue already fixed
- **Feel**: Most polished form in the app. Sections have clear visual separation. Line items use cards.

#### CSR (`CsrFormScreen.tsx`) — The Outlier
- **Flow**: All-in-one scrolling form, no tabbed sections
- **Style**: Completely different visual language (inline `Section`, `TextInput`, `TextArea`, `SelectField`)
- **Feel**: Dense, utilitarian, no visual section hierarchy. 861 lines in one file.
- **Missing**: No SharedDocumentForm reuse. No tab navigation. No mobile-specific components.

#### BOQ / RFQ (Tabbed Editor)
- **Flow**: 3 tabs — Details / Rows / Output
- **Interaction**: Side-by-side form + preview in Rows tab (editor on left, preview on right)
- **Feel**: Technical, spreadsheet-like. Works well for table-based documents but feels different from invoice/CSR.

#### Waybill (Overlay)
- **Flow**: Gateway overlay → Single-page form
- **Interaction**: Modal overlay pattern — unique to waybill
- **Feel**: Lightweight, task-focused. The overlay pattern works well for quick data entry.

### 3. List / Table Browsing

- **Filter system**: `ModuleShell.tsx` provides `FilterTray` with slide-down animation, active filter indicators, per-filter clear buttons. Well-implemented.
- **Search**: Inline search fields per module
- **Batch operations**: Checkbox selection + batch action toolbar
- **Mobile**: Cards layout replaces table on small screens
- **Missing**: Column lock/freeze not available on any list
- **Missing**: Sortable columns UI may not be surfaced (backend `moveColumn` exists)

### 4. Document View Experience

- **View pages**: All 7 document types have dedicated View{Module}.tsx pages
- **Shared view layer**: `components/document-view/shared/` provides 33 reusable view components
- **PDF preview**: `PdfOutputSettings` component used across modules for template selection + preview
- **Feel**: Good consistency in view layer — all document views share the same structural components

### 5. Dashboard

- **Active**: `DashboardRedesign.tsx` (separate from dead `Dashboard.tsx`)
- **Structure**: Stats cards row → Recent activity → Quick action tiles → Recent invoices/projects
- **Quick tile grid**: 4 tiles (Invoice, Quotation, Waybill, CSR) — these serve the same purpose as FAB
- **Missing**: No floating action button on dashboard. The quick tile grid is the primary creation path.
- **Feel**: Functional but static — no summary metrics, no charts/visualizations beyond basic cards

### 6. Settings

- **12 sections**: Company, Branding, Banking, Documents, Prefixes, Dashboard, Signatories, Users, Admin, Archives, Theme, Notifications
- **Shell**: `SettingsShell.tsx` with tabbed navigation
- **Form primitives**: Custom `SettingsField` wrapper pattern for consistent label+input layout
- **Feel**: Most consistent module in the app — all sections follow the same pattern. Signs of polish.

### 7. Mobile Experience

- **Breakpoint**: All responsive behavior hinges on `md:` (768px)
- **Form support**: Full mobile form support only for Invoice (`MobileItemCard`, `MobileGroupCard`). Waybill reuses invoice primitives. CSR has partial. BOQ/RFQ have none.
- **Navigation**: Bottom tab bar + FAB per list page → works well
- **Layout**: List pages switch to card layout on mobile
- **Gap**: Creating a BOQ or RFQ on mobile may force desktop-like layout

### 8. Loading, Empty, and Error States

- **Loading**: Skeleton patterns in `DataGrid` (via `loadingMode: "skeleton"`); `Button` uses `Loader2 + animate-spin`; `SplashOverlay` uses pulse + halo animation
- **Empty**: Module list pages show empty state with "Create first X" call-to-action
- **Error**: `ErrorBoundary` at app level; individual form validation via Zod schemas
- **Missing**: No `aria-live` regions for screen reader announcements during loading
- **Missing**: No global loading bar (like nprogress) for page transitions

### 9. Motion & Visual Polish

- **Radix animations**: Dialog/Sheet/Select/AlertDialog use `fade-in`, `zoom-in`, `slide-in` via Tailwind `animate-in` utilities
- **Custom CSS animations**: Sheet reveal (`bd-sheet-rear/front`), progress bar fill (`bd-progress`), ambient background drift (`app-wave-float-1`)
- **Framer Motion**: Used in only 3 production components — sheet panel animation (`sheet.tsx`), circuit board (`circuit-board.tsx`), AI dropdown (`OpenInAIDropdown.tsx`)
- **Missing**: No page transition animations between routes
- **Missing**: No micro-interactions on buttons/lists (scale on press, fade on complete)
- **Missing**: No reduced-motion support beyond a single inline style tag

### 10. Responsive & Touch

- **Touch targets**: FAB uses 14×14 size (56px) — meets touch guidelines. Bottom nav tabs appear touch-friendly.
- **Safe areas**: No evidence of `safe-area-inset-*` usage for iOS notched devices
- **Orientation**: No landscape-specific layouts detected

---

## Evidence

- Form pattern fragmentation confirmed by reading every form component
- Mobile support gaps confirmed by checking component files per module directory
- Animation usage confirmed by grepping for `motion`, `AnimatePresence`, `@keyframes`, and `animate-` in all source files
- Template gaps confirmed by comparing reference patterns to actual production code

---

## Risks

1. **CSR form divergence** is the highest UX risk — users get a jarringly different experience creating a CSR vs an invoice
2. **Mobile BOQ/RFQ gap** means users on phones cannot create table-based documents in a comfortable layout
3. **No sign-out confirmation** is a data safety risk for shared/multi-user devices
4. **No reduced motion support** excludes users with vestibular disorders
5. **Fragmented mobile support** creates inconsistent user experience within the same app

---

## Recommendations

1. **Unify CSR form** into `SharedDocumentForm` pattern — biggest UX win
2. **Add sign-out confirmation** dialog using existing `AlertDialog` pattern
3. **Add sticky business context** to desktop sidebar so it's always accessible
4. **Implement `reui/sortable` wrapper** to replace raw dnd-kit usage — simpler API, better DX
5. **Add page transition animations** using framer-motion `AnimatePresence` at route level
6. **Add reduced motion support** via `useReducedMotion()` hook from framer-motion
7. **Add safe area insets** for Capacitor iOS notch support
8. **Build mobile form variants** for BOQ and RFQ
9. **Add `aria-live` regions** to loading states for accessibility

---

## Priority

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Sign-out confirmation | High (safety) | Small | Critical |
| CSR → SharedDocumentForm | High (consistency) | Medium | High |
| Sticky sidebar business context | Medium | Small | High |
| Reduced motion support | Medium | Small | High |
| Route transition animations | Medium | Small | Medium |
| `reui/sortable` adoption | Low | Medium | Medium |
| Mobile BOQ/RFQ forms | Medium | Large | Medium |
| Safe area insets | Low | Small | Medium |
| `aria-live` loading regions | Medium | Small | Low |

---

## Affected Files

- `src/components/csr/CsrFormScreen.tsx` — unify form
- `src/components/layout/DesktopSidebar.tsx` — sticky BC, add sign-out
- `src/components/Layout.tsx` — sign-out confirmation dialog
- `src/components/document/FormLineItems.tsx` — reui/sortable migration
- `src/components/document/SortableLineItem.tsx` — reui/sortable migration
- `src/App.tsx` or page wrapper — route transitions, reduced motion
- `src/index.css` — safe area CSS variables

---

## Future Considerations

- **Micro-interaction library**: Create a consistent set of micro-interactions (button press, list item tap, form success, navigation) using a `motion/react` helpers file
- **Page transition system**: `<AnimatePresence mode="wait">` around route outlet with slide/fade transitions
- **Mobile-first redesign**: Consider whether all forms should adopt a mobile-first layout (field-per-page wizard) vs scrolling form
- **Gesture support**: Swipe-to-delete on mobile list items, pull-to-refresh on lists
