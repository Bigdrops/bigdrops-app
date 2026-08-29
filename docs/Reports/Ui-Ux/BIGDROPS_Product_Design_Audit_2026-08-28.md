# BIGDROPS Product & Design Audit

> Date: 2026-08-28
> Scope: Full repository investigation — zero code changes
> Stack: React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel, Capacitor 8

---

## 1. Executive Summary

BIGDROPS is a B2B business management suite for Nigerian SMEs. The product is **functionally mature** with 7 document families, full CRUD for clients/projects, a multi-tab reporting system, compliance hub, item library, and PDF generation pipeline. The codebase has approximately 60 pages, 30+ route definitions, and a shared form architecture (`SharedDocumentForm`) that unifies document creation across modules.

**Key strength:** The domain model is well-structured. Invoice, quotation, waybill, CSR, BOQ, RFQ, and letter modules share a common form skeleton with module-specific extensions. Financial calculations are centralized in `src/lib/Calculations.ts`.

**Key weakness:** The visual layer is fragmented. There are three competing token systems (`index.css` shadcn HSL, `formTheme.css` `--bd-*` tokens, Tailwind config colors), ~30 theme presets (29 deleted, 2 remaining), and 6× duplicated CSS Module files across document-view modules. The mobile experience is functional but not premium — no bottom navigation in production, no FAB, no contextual sheets, and no premium loading states.

**The application works. The design does not yet match the premium mobile-first direction.**

---

## 2. Current Product Map

### 2.1 Document Families (7)

| Module | Routes | Create | Edit | View | PDF | Status |
|--------|--------|--------|------|------|-----|--------|
| **Invoice** | `/invoices`, `/invoices/new`, `/invoices/:id`, `/invoices/edit/:id` | ✅ | ✅ | ✅ | ✅ (7 templates) | Mature |
| **Quotation** | `/quotations`, `/quotations/new`, `/quotations/:id`, `/quotations/edit/:id` | ✅ | ✅ | ✅ | ✅ | Mature |
| **Waybill** | `/waybills`, `/waybills/new`, `/waybills/:id`, `/waybills/:id/edit` | ✅ | ✅ | ✅ | ✅ | Mature |
| **CSR** | `/csr`, `/csr/new`, `/csr/:id`, `/csr/edit/:id` | ✅ | ✅ | ✅ | ✅ | Mature |
| **RFQ** | `/rfqs`, `/rfqs/new`, `/rfqs/:id`, `/rfqs/edit/:id` | ✅ | ✅ | ✅ | ✅ | Functional |
| **BOQ** | `/boqs`, `/boqs/new`, `/boqs/:id`, `/boqs/edit/:id` | ✅ | ✅ | ✅ | ✅ | Functional |
| **Letter** | `/letters`, `/letters/new`, `/letters/:id`, `/letters/edit/:id` | ✅ | ✅ | ✅ | ✅ | Functional |

### 2.2 Core Modules

| Module | Routes | Purpose |
|--------|--------|---------|
| **Dashboard** | `/` | KPI cards, recent documents, activity |
| **Clients** | `/clients`, `/clients/new`, `/clients/:id`, `/clients/edit/:id` | Client management with full CRUD |
| **Projects** | `/projects`, `/projects/new`, `/projects/:id`, `/projects/:id/documents/:documentId` | Project management with document linking |
| **Reports** | `/reports` | 5-tab financial reporting (Overview, Receivables, Collections, Projects, Tax) |
| **Compliance Hub** | `/compliance` | Compliance tracking |
| **Item Library** | `/item-library` | Item catalog with price history |
| **Receipts** | `/receipts`, `/receipts/:id` | Payment receipt viewing |
| **Settings** | `/settings`, `/settings/notifications` | 13 settings sections |
| **Debug** | `/debug/tenant` | Tenant diagnostics (operator-only) |

### 2.3 Workspace & Auth

| Feature | Implementation |
|---------|---------------|
| Login | Email/password + OAuth providers |
| Workspace selection | `WorkspaceSelection.tsx` |
| Workspace creation | `CompanyCreation.tsx`, `WorkspaceCreation.tsx` |
| Invitation flow | `WorkspaceInvitation.tsx` |
| Pending approval | `WorkspacePendingApproval.tsx` |
| Password reset | `ResetPassword.tsx` |
| Set password modal | For OAuth users without password |
| Offline access | Android native SQLite fallback |

### 2.4 Settings Sections (13)

| Section | ID | Purpose |
|---------|-----|---------|
| User Profile | `user` | Personal info, avatar |
| Company Info | `company` | Business name, address, tax details |
| Logo & Branding | `branding` | Document branding |
| Banking | `banking` | Bank accounts for documents |
| Signatories | `signatories` | Authorized signatories |
| Theme & Appearance | `theme` | Colors, cards, display preferences |
| Notifications | `notifications` | Email and push notification alerts |
| Dashboard Layout | `dashboard` | Configure quick tiles |
| Document Controls | `documents` | Invoice/quotation/PDF defaults |
| Document Prefixes | `prefixes` | Auto-generated number prefixes |
| Archives | `archives` | Restore or remove archived records |
| Team | `team` | Member management (admin) |
| Devices | `devices` | Linked installations (admin) |

---

## 3. Current Information Architecture

### 3.1 Navigation Model

**Mobile (phone):**
- **Bottom nav:** 5 tabs — Home, Projects, Sales, Clients, More
- **Sales tab:** Opens bottom sheet with Invoices, Quotations, CSR, Waybills
- **More tab:** Opens bottom sheet with Correspondence (Letters), Finance (Reports, Compliance, Receipts, Item Library), System (Settings, Sign Out)
- **Sidebar (drawer):** Slides from left — Dashboard, Projects, Clients + utility nav (Reports, Compliance, Item Library, Settings)

**Desktop (≥768px):**
- **Persistent sidebar:** 256px fixed left — Dashboard, Projects, Clients, Item Library
- **Sales submenu:** Expandable in sidebar
- **More groups:** Expandable in sidebar

### 3.2 Route Hierarchy

```
/ (Dashboard)
├── /invoices
│   ├── /invoices/new
│   ├── /invoices/:id
│   └── /invoices/edit/:id
├── /quotations
│   ├── /quotations/new
│   ├── /quotations/:id
│   └── /quotations/edit/:id
├── /waybills
│   ├── /waybills/new
│   ├── /waybills/:id
│   └── /waybills/:id/edit
├── /csr
│   ├── /csr/new
│   ├── /csr/:id
│   └── /csr/edit/:id
├── /rfqs
│   ├── /rfqs/new
│   ├── /rfqs/:id
│   └── /rfqs/edit/:id
├── /boqs
│   ├── /boqs/new
│   ├── /boqs/:id
│   └── /boqs/edit/:id
├── /receipts
│   └── /receipts/:id
├── /letters
│   ├── /letters/new
│   ├── /letters/:id
│   └── /letters/edit/:id
├── /clients
│   ├── /clients/new
│   ├── /clients/:id
│   └── /clients/edit/:id
├── /projects
│   ├── /projects/new
│   ├── /projects/:id
│   └── /projects/:projectId/documents/:documentId
├── /reports
├── /compliance
├── /item-library
├── /settings
│   └── /settings/notifications
└── /debug/tenant
```

### 3.3 Document-to-Document Relationships

| From | To | Mechanism |
|------|----|-----------|
| Quotation | Invoice | Convert action (preserves line items, client) |
| Invoice | Waybill | Create waybill from invoice (strips monetary values) |
| Invoice | Payment | Record payment sheet |
| Invoice | Receipt | Auto-generated on payment |
| Project | Any document | Document linking via `project_id` |
| Any document | PDF | Download/preview action |

---

## 4. Current Design System

### 4.1 Token Architecture (Three Layers)

**Layer 1: shadcn HSL tokens** (`src/index.css`)
- `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
- Format: HSL values without `hsl()` wrapper

**Layer 2: BigDrops bridge tokens** (`src/styles/formTheme.css`)
- `--bd-surface`, `--bd-text`, `--bd-border`, `--bd-surface-muted`, `--bd-text-muted`
- Status tokens: `--bd-status-success-*`, `--bd-status-warning-*`, `--bd-status-danger-*`, `--bd-status-info-*`
- Navigation tokens: `--bd-nav-active-bg`, `--bd-nav-active-text`, `--bd-nav-hover-bg`
- Overlay tokens: `--bd-overlay-bg`, `--bd-overlay-border`, `--bd-overlay-radius`
- Layout tokens: `--bd-layout-density`, `--bd-layout-padding`, `--bd-layout-content-max`
- ~196 CSS variables total

**Layer 3: Theme presets** (`src/lib/themePresets.ts`)
- 2 remaining presets: `bmw` (dark automotive) and `modern-minimalist` (light grayscale)
- Applied via `AppThemeManager` which watches `document.documentElement.classList` for `dark`
- Uses `applyThemeTokenBundle()` to set inline styles on `:root`

### 4.2 Typography

| Context | Font | Weight |
|---------|------|--------|
| Body | Manrope (via shadcn) | 400–800 |
| Monospace/numbers | DM Mono | 400–600 |
| Display (mockups) | Syne | 700–800 |

### 4.3 Component Library

**shadcn/ui primitives used:**
- Button, Input, Textarea, Select, Badge, Card, Sheet, Dialog, AlertDialog
- Separator, Tabs, Tooltip, Popover, Command, Drawer
- Table, Avatar, DropdownMenu, ContextMenu

**Custom components:**
- `MobileBottomNav` — 5-tab bottom navigation
- `MobileSidebar` — Slide-in drawer
- `DesktopSidebar` — Fixed 256px sidebar
- `MobilePageHeader` — Page header with menu button
- `GlobalSearch` — Full-screen search overlay
- `NotificationBell` + `NotificationDrawer` — Notification system
- `SectionLabel` — Form section headers
- `CollapseCard` — Collapsible section cards
- `SegmentedControl` — Toggle buttons
- `ChipButton` / `ToolbarButton` — Action buttons
- `SettingsShell` — Settings layout

### 4.4 Design Inconsistencies

| Issue | Detail |
|-------|--------|
| **Three token systems** | shadcn HSL, `--bd-*` bridge, theme presets — all coexist |
| **CSS Modules + Tailwind** | Document views use CSS Modules (`*.module.css`), forms use Tailwind |
| **6× duplicated CSS** | `DocumentHero.module.css`, `DocumentPreview.module.css`, etc. duplicated across invoice/quotation/waybill/CSR/BOQ/RFQ |
| **framer-motion in production** | `circuit-board.tsx`, `sidebar-toggle-icon.tsx`, `OpenInAIDropdown.tsx` use banned library |
| **Theme count** | 29 themes deleted, 2 remaining — but `formTheme.css` still defines 196 variables |

---

## 5. Mobile UX Assessment

### 5.1 What Works

| Feature | Status |
|---------|--------|
| Bottom navigation | ✅ 5-tab bar with Sales/More sheets |
| Sidebar drawer | ✅ Slide-in with nav groups |
| Responsive layout | ✅ `useLayoutMode()` detects compact/medium/wide |
| Touch targets | ✅ Most buttons are 36–44px |
| Safe area insets | ✅ `env(safe-area-inset-bottom)` used in bottom nav |
| Form scrolling | ✅ `overscroll-behavior: contain` |
| FAB (create) | ✅ Dashboard has FAB for quick create |
| Search overlay | ✅ Full-screen on mobile, popover on desktop |
| Dark mode | ✅ Manual toggle, persists to localStorage |

### 5.2 Critical Mobile Issues

| Priority | Issue | Evidence |
|----------|-------|----------|
| **P0** | **No bottom nav on document pages** | `Layout.tsx` renders `MobileBottomNav` globally, but document view/edit pages use immersive mode or custom navigation |
| **P0** | **Form pages lack FAB save** | `FormFooter.tsx` has a floating save button, but it's positioned relative to bottom nav offset — may overlap on some devices |
| **P1** | **Table horizontal scroll on phone** | Document list tables overflow horizontally with no visual indicator |
| **P1** | **Settings is a long flat list** | 13 sections in a single scrollable list — no visual grouping on mobile |
| **P1** | **No pull-to-refresh** | Dashboard data loads once, no manual refresh gesture |
| **P2** | **Sheets lack swipe-to-dismiss** | Bottom sheets use `Sheet` component — no gesture-based dismiss |
| **P2** | **No haptic feedback** | No `@capacitor/haptics` integration for actions |
| **P3** | **Missing skeleton loading** | Dashboard has `AuditTrailSkeleton` but most pages show generic spinner |

---

## 6. Dashboard Assessment

### 6.1 Current Implementation

**File:** `src/pages/DashboardRedesign.tsx` → `src/components/dashboard/DashboardOverview.tsx`

**Data source:** `src/hooks/useDashboardData.ts` — queries Supabase directly for invoices, quotations, CSRs, waybills, RFQs, BOQs, and projects.

### 6.2 Existing KPI Metrics

| Metric ID | Label | Data Source | Format |
|-----------|-------|-------------|--------|
| `totalInvoiced` | Total Invoiced | `invoice_financials_v.total_gross` | Naira |
| `thisMonthCollections` | Collected This Month | `invoice_financials_v.cash_received` (current month) | Naira |
| `outstandingReceivables` | Outstanding Receivables | `invoice_financials_v.balance_due` (positive) | Naira |
| `overdue` | Overdue Balance | `balance_due` where `due_date < now` | Naira |

### 6.3 Additional Dashboard Data (computed but not all displayed as KPIs)

| Data Point | Source | Used In |
|------------|--------|---------|
| `pendingFollowUp` | Invoices due within 7 days with balance | Hero stats |
| `dueThisWeek` | Sum of balances due this week | Summary |
| `prevMonthCollections` | Previous month's cash received | KPI trends |
| `prevMonthInvoiced` | Previous month's invoiced total | KPI trends |
| `outstandingTotal` | Sum of all positive balances | KPI bar ratios |
| `inTransitWaybills` | Waybills with status "dispatched" | Hero stats |
| `awaitingPaymentCount` | Invoices with positive balance | Hero stats |

### 6.4 Dashboard Sections

| Section | Component | Dynamic? |
|---------|-----------|----------|
| KPI cards (4) | `KpiGrid` | ✅ Real data, configurable via Settings |
| Recent documents | `DashboardOverview` | ✅ Last 6 docs across all types |
| Payment reminder | `PaymentReminderBanner` | ✅ Shows when overdue exists |
| Alerts carousel | `RecentAlertsCarousel` | ✅ Real alerts |
| Audit trail | `AuditTrailSkeleton` | ⚠️ Shows skeleton only — audit data not loaded |

### 6.5 Dashboard Assessment

**Existing functionality:**
- 4 configurable KPI cards with real financial data
- Recent document activity feed
- Payment reminder banner
- Alert carousel
- Create action FAB with quick actions

**Missing vs. design direction:**
- No workspace identity display (name, owner)
- No editable metric labels in dashboard
- Audit trail is skeleton-only
- No "Finance pulse" eyebrow with date
- No section-level "View all" links
- No contextual AI entry point (planned per ai-integration.md)

---

## 7. Workflow Assessment

### 7.1 Quotation → Invoice Conversion

| Step | Implementation | Friction |
|------|---------------|----------|
| Create quotation | `QuotationFormPage` → `SharedDocumentForm` | Low — shared form |
| Client selects items | Line item editor with groups | Low |
| Send quotation | Status change + PDF | Low |
| Client accepts | Status update | Low |
| Convert to invoice | `documentConversion.ts` | **Medium** — opens new form, user must re-confirm all fields |
| Invoice created | New invoice with copied data | Low |

**Friction:** Conversion creates a new invoice but does not carry forward all custom fields cleanly. The `conversionTrail` is stored but not prominently displayed.

### 7.2 Invoice → Payment Recording

| Step | Implementation | Friction |
|------|---------------|----------|
| Open invoice | `ViewInvoice` → `InvoiceWorkspace` | Low |
| Tap "Record Payment" | `InvoiceRecordPaymentSheet` | Low |
| Enter amount/date/method | Sheet with form fields | Low |
| Save payment | Supabase insert + balance update | Low |
| Receipt generated | `Receipts` module | **Auto** — no user action needed |

**Friction:** Payment recording is well-implemented. The sheet approach is mobile-friendly.

### 7.3 Document Creation Flow

All document types follow the same pattern:
1. Navigate to `/[module]/new`
2. `New[Module]` page loads → renders `SharedDocumentForm` via module-specific form page
3. User fills header (client, dates, numbers)
4. User adds line items (with groups, sub-descriptions, custom columns)
5. User sets commercial terms (VAT, discount, WHT, charges)
6. User saves (Draft or Sent)

**Friction points:**
- Client selection opens a full `ClientSelector` component — could be a simpler sheet on mobile
- Column manager is a lazy-loaded sheet — good for performance but adds a step
- JSON import is available but hidden in toolbar

### 7.4 Missing Workflow: Project → Documents

Projects exist but the connection between projects and documents is weak:
- Documents can reference a `project_id` but the project detail page shows linked documents
- No "create document from project" action in project detail
- No project-level financial summary

---

## 8. Component & UI Architecture Assessment

### 8.1 Shared Components

| Component | Location | Usage |
|-----------|----------|-------|
| `SharedDocumentForm` | `src/components/document/` | All 7 document types |
| `FormHeader` | `src/components/document/` | All document forms |
| `FormLineItems` | `src/components/document/` | All document forms |
| `FormCommercialTerms` | `src/components/document/` | Invoice, Quotation |
| `FormTotals` | `src/components/document/` | All document forms |
| `FormNotesTerms` | `src/components/document/` | All document forms |
| `FormFooter` | `src/components/document/` | All document forms |
| `MobileItemCard` | `src/components/invoice/` | Mobile line item editing |
| `SortableLineItem` | `src/components/document/` | Desktop line item with DnD |
| `MobileGroupCard` | `src/components/invoice/` | Mobile group editing |
| `ClientSelector` | `src/components/` | Client selection across forms |

### 8.2 Duplicated Components

| Duplication | Files | Impact |
|-------------|-------|--------|
| CSS Module files | 6× `DocumentHero`, `DocumentPreview`, `DocumentSummaryStrip`, `DocumentDocumentPreview` | High maintenance |
| Document action buttons | Module-specific CSS files | Medium |
| View page shells | Module-specific page components | Medium |

### 8.3 Oversized Components

| Component | Lines | Issue |
|-----------|-------|-------|
| `SharedDocumentForm.tsx` | ~368 | Handles all props for all document types — prop drilling is heavy |
| `MobileItemCard.tsx` | ~517 | Complex item editing with image upload, suggestions, custom fields |
| `Layout.tsx` | ~299 | Navigation + chrome + sign-out dialog — could be split |
| `useDashboardData.ts` | ~300 | Two variants (overview/classic) with duplicated query logic |

### 8.4 High-Value Design System Opportunities

| Opportunity | Current State | Impact |
|-------------|--------------|--------|
| **Unified card component** | Cards use `pageCardCls` string + ad-hoc classes | Consistent card appearance |
| **Status badge system** | Manual color classes per status | Single `StatusBadge` component |
| **Section header** | `SectionLabel` exists but not universally used | Consistent section hierarchy |
| **Form field** | `fieldCls` + `labelCls` strings | Reusable `FormField` component |
| **Empty state** | Ad-hoc per page | Shared `EmptyState` component |
| **Loading skeleton** | Only `AuditTrailSkeleton` exists | Skeleton system for all list/detail views |

---

## 9. Search & Discovery Assessment

### 9.1 Global Search

**Implementation:** `src/hooks/useGlobalSearch.ts` + `src/components/layout/GlobalSearch.tsx`

**Behavior:**
- Minimum 2 characters to trigger
- Searches across: clients, projects, invoices, quotations, CSRs, waybills
- Uses `ilike` pattern matching on name/number fields
- 300ms debounce
- Returns up to 3 results per type (18 max)
- Shows "Jump to Module" grid when empty

**Strengths:**
- Fast, responsive
- Type-specific icons and colors
- Quick module navigation grid

**Weaknesses:**
- No search for RFQs, BOQs, Letters, Receipts
- No search within document line items
- No recent search history
- No search filters (by date, status, amount)
- No search within settings

### 9.2 Document Discovery

| Mechanism | Implementation |
|-----------|---------------|
| List pages | Each module has a list page with filtering |
| Dashboard recent docs | Last 6 documents across all types |
| Client detail | Shows linked documents |
| Project detail | Shows linked documents |
| Global search | Cross-module text search |

**Weakness:**
- No "recently viewed" tracking
- No bookmarking/favorites
- No quick filters on list pages (e.g., "Overdue", "This week")

---

## 10. States & Feedback Assessment

### 10.1 Loading States

| Page | Loading State | Quality |
|------|--------------|---------|
| Dashboard | `AuditTrailSkeleton` for audit, spinner for KPIs | ⚠️ Partial |
| Document lists | Generic spinner | ⚠️ Basic |
| Document view | Full-page loader | ✅ Adequate |
| Form pages | Inline spinner | ✅ Adequate |
| Search | Spinner in input | ✅ Good |
| Settings | Skeleton per section | ✅ Good |

### 10.2 Empty States

| Page | Empty State | Quality |
|------|------------|---------|
| Document lists | "No [module] yet" with create button | ✅ Good |
| Dashboard | Hidden when no data | ⚠️ No explicit empty state |
| Search results | "No matches found" | ✅ Good |
| Client detail | No documents section shown | ⚠️ Implicit |

### 10.3 Error States

| Context | Implementation |
|---------|---------------|
| API failures | `feedback.error()` toast |
| Form validation | Inline field errors |
| Auth failures | Redirect to login |
| Network offline | `OfflineAccessBlocked` page |
| Permission denied | Implicit (routes not shown) |

### 10.4 Success States

| Context | Implementation |
|---------|---------------|
| Save | `feedback.success()` toast |
| Delete | Toast + navigation back |
| Payment recorded | Toast |
| Status change | Toast |

### 10.5 Feedback Gaps

| Gap | Impact |
|-----|--------|
| No optimistic updates | Forms feel slow on save |
| No undo for destructive actions | Delete is permanent |
| No progress indicators for PDF generation | User waits without feedback |
| Toast system has duplicates | GoeyToaster + NativeFeedbackRenderer both active |

---

## 11. Accessibility Assessment

### 11.1 Semantic Controls

| Area | Status |
|------|--------|
| Native buttons | ✅ Used throughout |
| Native inputs | ✅ Used in forms |
| ARIA labels | ⚠️ Inconsistent — some icon-only buttons lack labels |
| Landmark roles | ⚠️ No `<main>`, `<nav>`, `<header>` in Layout |
| Heading hierarchy | ⚠️ Skips levels in some views |

### 11.2 Keyboard Navigation

| Area | Status |
|------|--------|
| Tab order | ✅ Generally follows visual order |
| Focus visible | ✅ `focus-visible:ring` on interactive elements |
| Escape to close | ✅ Sheets and dialogs respond to Escape |
| Enter to submit | ✅ Forms support Enter key |
| Skip links | ❌ None implemented |

### 11.3 Touch Targets

| Area | Status |
|------|--------|
| Bottom nav | ✅ 64px height, 5 columns |
| Form buttons | ✅ 38–44px height |
| List items | ✅ Adequate padding |
| Icon buttons | ⚠️ Some are 28×28px (below 44px minimum) |

### 11.4 Color Contrast

| Area | Status |
|------|--------|
| Body text on surface | ✅ Meets WCAG AA |
| Muted text | ⚠️ Some `--bd-text-muted` values may fail on light surfaces |
| Status badges | ✅ Generally good contrast |
| Focus rings | ✅ Visible against backgrounds |

### 11.5 Critical A11y Issues

| Priority | Issue |
|----------|-------|
| P1 | No skip-to-content link |
| P1 | No `<main>` landmark in Layout |
| P1 | Icon-only buttons without `aria-label` |
| P2 | No `prefers-reduced-motion` respect in all animations |
| P2 | Form error messages not linked to inputs via `aria-describedby` |
| P3 | No screen reader announcements for dynamic content updates |

---

## 12. Design Direction Gap Analysis

### 12.1 Already Aligned

| Direction Element | Current State |
|-------------------|--------------|
| Slate/navy color foundation | BMW theme (dark) provides this |
| Light and dark modes | ✅ Both implemented |
| Bottom navigation | ✅ 5-tab bar |
| KPI metrics on dashboard | ✅ 4 configurable cards |
| Recent activity feed | ✅ Document list on dashboard |
| FAB for creation | ✅ Dashboard FAB |
| Global search | ✅ Full-screen overlay |
| Contextual sheets | ✅ Bottom sheets for Sales/More |
| Business name display | ✅ In sidebar and page headers |
| Notification bell | ✅ With unread count |

### 12.2 Needs Refinement

| Direction Element | Current Gap |
|-------------------|------------|
| Premium card treatment | Cards are flat with basic borders — no depth/shadow hierarchy |
| Gradient identity | BMW theme has no gradient — dashboard direction uses gradient accent |
| Typography hierarchy | Body text is uniform — no display/heading scale |
| Information density | Dashboard is sparse — could show more data per screen |
| Card shadows/elevation | Minimal shadows — direction shows layered depth |
| Motion/animation | Only page transitions — no micro-interactions |
| Status indicators | Basic text badges — direction shows colored dots/pills |
| Section headers | `SectionLabel` exists but not consistently styled |

### 12.3 Missing

| Direction Element | Current Gap |
|-------------------|------------|
| Workspace identity (owner name) | Not displayed on dashboard |
| Configurable metric labels | KPI cards have fixed labels |
| "Finance pulse" eyebrow | Not implemented |
| Audit trail (real data) | Skeleton only — no actual audit feed |
| Action-oriented alerts | Alerts exist but are not actionable from dashboard |
| Contextual AI entry point | Planned in ai-integration.md but not built |
| Premium loading states | No shimmer/skeleton for most views |
| Editable dashboard metrics | Settings allows reordering but not inline editing |
| Gradient background | Direction shows radial gradient — current is flat |

### 12.4 Should NOT Be Carried Over

| Direction Element | Reason |
|-------------------|--------|
| Amber/warm palette (form mockup) | Different design language — not the chosen direction |
| Liquid metallic effects | Too heavy for mobile performance |
| Ambient orb animations | GPU-intensive, battery drain |
| Glass morphism bottom nav | Backdrop-filter performance issues on low-end devices |

---

## 13. Priority Matrix

### P0 — Critical Product/UX Problems

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **Three competing token systems** | `index.css` + `formTheme.css` + `themePresets.ts` — any theme change requires touching all three |
| 2 | **CSS Module duplication (6×)** | `DocumentHero`, `DocumentPreview`, etc. duplicated across 6 modules |
| 3 | **framer-motion in production** | `circuit-board.tsx`, `sidebar-toggle-icon.tsx` — banned by AGENTS.md |
| 4 | **Duplicate toast systems** | `GoeyToaster` + `NativeFeedbackRenderer` both active in `App.tsx` |
| 5 | **Dashboard audit trail is skeleton-only** | `AuditTrailSkeleton` renders placeholder — no real data |

### P1 — High-Value Improvements

| # | Finding | Evidence |
|---|---------|----------|
| 6 | **No pull-to-refresh on dashboard** | No gesture handler in `DashboardOverview` |
| 7 | **Settings is a flat list on mobile** | 13 sections in one scroll — needs grouping |
| 8 | **Search misses RFQs, BOQs, Letters, Receipts** | `useGlobalSearch.ts` only queries 6 tables |
| 9 | **No skeleton loading for document lists** | Generic spinner instead of content-shaped skeletons |
| 10 | **Project→Document connection is weak** | No "create from project" action, no project financial summary |
| 11 | **Desktop sidebar lacks Sales/More grouping** | Only 4 items in desktop nav vs. 5+ groups in mobile |
| 12 | **No "recently viewed" tracking** | Users must navigate back to find previously viewed documents |

### P2 — Meaningful Refinements

| # | Finding | Evidence |
|---|---------|----------|
| 13 | **Missing skip-to-content link** | No `<a href="#main">` at top of page |
| 14 | **Icon-only buttons without aria-label** | Some buttons in document views |
| 15 | **No haptic feedback on Capacitor** | No `@capacitor/haptics` usage |
| 16 | **No optimistic updates on save** | Forms show spinner until server responds |
| 17 | **Client selector is heavy on mobile** | Full component with search — could be simpler sheet |
| 18 | **Document number generation is client-side** | Prefix + random — could conflict in multi-user |

### P3 — Polish

| # | Finding | Evidence |
|---|---------|----------|
| 19 | **No page transition animations** | `AnimatePresence` not in `App.tsx` |
| 20 | **Toast duration inconsistent** | GoeyToaster: 2400ms, NativeFeedback: 3000ms |
| 21 | **No landscape orientation handling** | Content reflows but no layout adaptation |
| 22 | **Theme customizer hex input has no validation feedback** | Only shows warning text |

---

## 14. Recommended Product Design Sequence

### Phase 1: Foundation (Design System Consolidation)

**Why first:** Everything else depends on a clean token system.

1. **Consolidate token systems** — Merge shadcn HSL + `--bd-*` + theme presets into one. The `formTheme.css` bridge tokens should become the single source.
2. **Delete duplicate CSS Modules** — Extract shared patterns from 6× `DocumentHero`, `DocumentPreview`, etc. into shared Tailwind utilities or a single CSS file.
3. **Remove framer-motion** — Replace `circuit-board.tsx` and `sidebar-toggle-icon.tsx` with CSS transitions.
4. **Remove duplicate toast system** — Delete `NativeFeedbackRenderer` and wire all feedback through `GoeyToaster`.

### Phase 2: Dashboard (Primary Screen)

**Why second:** The dashboard is the first thing users see. It sets the tone.

1. **Implement premium dashboard** — Gradient background, workspace identity, "Finance pulse" eyebrow, section headers with "View all" links.
2. **Wire real audit trail** — Replace skeleton with actual audit data from Supabase.
3. **Add pull-to-refresh** — Gesture-based refresh on dashboard.
4. **Refine KPI cards** — Add gradient highlight on primary card, segmented bar visualization, trend arrows.

### Phase 3: Navigation & Shell (Mobile Experience)

**Why third:** Navigation is the skeleton of the mobile experience.

1. **Bottom nav refinement** — Match direction: active gradient tab, frosted glass background, proper safe areas.
2. **Drawer refinement** — Match direction: brand mark, section groups, user identity at bottom.
3. **Settings reorganization** — Group into Account, Workspace, Preferences, System on mobile.
4. **Sheet gestures** — Add swipe-to-dismiss on bottom sheets.

### Phase 4: Document Forms (Core Workflow)

**Why fourth:** Forms are where users spend most time.

1. **Form field component** — Extract `fieldCls` + `labelCls` into a reusable `FormField` component.
2. **Client selector sheet** — Simpler mobile-first client picker.
3. **Line item improvements** — Better mobile touch targets, swipe actions, image upload UX.
4. **Form loading skeletons** — Content-shaped skeletons for form pages.

### Phase 5: Document Views (Reading Experience)

**Why fifth:** Views are read-heavy — optimize for scanning.

1. **Consolidate CSS Modules** — Single shared styles for all document view types.
2. **Mobile document view** — Match direction: hero card, summary strip, action buttons, related docs.
3. **PDF preview** — In-app PDF preview before download.
4. **Status management** — Consistent status badges across all document types.

### Phase 6: Reports & Discovery

**Why sixth:** Reports are power-user features — optimize after core experience is solid.

1. **Reports dashboard** — Visual charts for overview tab.
2. **Search expansion** — Add RFQs, BOQs, Letters, Receipts to global search.
3. **Recent items** — Track and surface recently viewed documents.
4. **Quick filters** — Add "Overdue", "This week", "My documents" filters.

---

## 15. Design Principles to Lock

Based on the current product and the dashboard direction, these principles should govern the BIGDROPS redesign:

### 1. Mobile-First, Desktop-Adaptive

Every screen must work perfectly on a 375px phone before adapting to larger screens. Desktop is a bonus, not the starting point.

### 2. Premium Operational Interface

BIGDROPS is a professional tool. The visual language communicates trust and efficiency. No consumer-social patterns. No playful illustrations. Clean surfaces, purposeful color, restrained motion.

### 3. Dense but Readable

Business users need to see a lot of data. Present information densely without clutter. Use typography hierarchy, color, and spacing to guide the eye — not whitespace alone.

### 4. Consistent Token Architecture

One token system. One source of truth. Theme = color only. Structure, spacing, typography, and component dimensions are invariant.

### 5. Predictable Interactions

Same action produces same result everywhere. Sheets slide from bottom. Drawers slide from left. Search is a full-screen overlay. FAB creates. Bottom nav navigates.

### 6. Graceful Degradation

Every feature must work offline (Capacitor), on slow networks, and with screen readers. AI features are additive, not required.

### 7. Minimal chrome, Maximum content

Navigation and chrome should be as small as possible. Content area should be as large as possible. Every pixel of chrome must justify its existence.

---

## 16. Out of Scope

This audit explicitly did NOT:

- Modify any application source code
- Modify any database migrations or schemas
- Modify any configuration files
- Modify any dependencies
- Design or recommend an AI architecture
- Implement any AI features
- Run `bun run build`, `bun run typecheck`, or `bun run lint`
- Change any runtime behavior
- Execute any destructive commands

The only file created is this Markdown report under `docs/Reports/`.

---

*Report written by Buffy on 2026-08-28 via Freebuff.*
