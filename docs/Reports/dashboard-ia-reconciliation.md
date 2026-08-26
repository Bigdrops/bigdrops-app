# BIGDROPS Dashboard IA Reconciliation Report

This report was written by ox-alpha on 2026-08-26 via OpenCode.

Skills used: writing-clearly-and-concisely
Documentation standard: ADS-STE100 Simplified Technical English

---

## 1. Investigation Scope

### Objective

Reconcile three sources into one evidence-backed current dashboard information architecture (IA):

1. The Glass Mesh wireframe reference.
2. The current BIGDROPS dashboard implementation.
3. The historical UI/UX consolidation PRD.

The output is a structural target for later frontend consolidation work. This investigation is read-only. It makes no visual design decisions.

### Method

- Located Glass Mesh inside the repository. Confirmed path: `docs/TEMPLATES/htmltemps/wireframe-variants/batch-5/glass-mesh.html`.
- Traced the dashboard route from `src/App.tsx` through `src/components/app/AppShell.tsx` to the page component and its children.
- Inventoried every file in `docs/prd/ui-ux-consolidation/` (22 files including `assets/`). Read all files that carry requirements. Searched the large component-library reference documents (`reui-*`, `platform-component-recommendations.md`) for dashboard-relevant content and read those sections; their remaining content covers visual component adoption and is out of IA scope.
- Verified multi-tenancy behavior in source and confirmed its introduction dates with git history.

### Evidence discipline

- Repository evidence is marked as such.
- Claims without evidence are marked UNCONFIRMED or VERIFY.
- No file paths are fabricated. Every listed file was opened during this investigation.

### Working tree change during investigation

At investigation start, `git status --short` showed pre-existing uncommitted changes by other work (modified pages, hooks, services; deleted tickets; new multi-tenancy reports). These changes were not touched by this task.

While the investigation ran, another session committed that work. Final state at verification time:

- New commits at HEAD include `dc5ba0f7 ✨ feat(tenancy): remove legacy signup approval gate`, `9978bf46`, and `d732cac1`.
- Post-commit `git status --short` shows exactly one entry: the new file `docs/Reports/dashboard-ia-reconciliation.md`.
- The `PendingApproval.tsx` removal observed mid-investigation is therefore committed and intentional (commit `dc5ba0f7`). See delta D3.

Route tables and file-existence checks read during the investigation match the committed state for all dashboard-relevant paths.

---

## 2. Files Inspected

### Wireframe reference

| File | Purpose |
|---|---|
| `docs/TEMPLATES/htmltemps/wireframe-variants/batch-5/glass-mesh.html` | Glass Mesh structural reference (328 lines, read in full) |

### Current dashboard implementation

| File | Role |
|---|---|
| `src/App.tsx` | Auth bootstrap, WorkspaceProvider → EntityProvider → TenantGate → AppShell nesting |
| `src/components/app/AppShell.tsx` | Full route table; route `/` renders Dashboard |
| `src/pages/DashboardRedesign.tsx` | Dashboard page: Layout wrapper, DashboardOverview, FAB button, UnifiedActionSheet |
| `src/components/dashboard/DashboardOverview.tsx` | Single responsive dashboard body (header, quick actions, tasks, recent activity) |
| `src/components/dashboard/DashboardDesktopView.tsx` | Orphaned desktop layout — no importers found |
| `src/hooks/useDashboardData.ts` | Dashboard data hook (tenant queries, priority items, cache) |
| `src/lib/cache/dashboardCache.ts` | localStorage cache for dashboard data |
| `src/config/quickTiles.js` | Quick tile and create-action registry, localStorage persistence |
| `src/components/actions/UnifiedActionSheet.tsx` | Bottom-sheet action list used by the FAB popup |
| `src/components/Layout.tsx` | App shell orchestrator: sidebars, bottom nav, sheets, sign-out AlertDialog |
| `src/components/layout/navData.ts` | Navigation model: tabs, sales/pre-sales pickers, more groups, desktop/drawer nav |
| `src/components/layout/MobileBottomNav.tsx` | Mobile 5-tab bar |
| `src/components/layout/DesktopSidebar.tsx` | Desktop rail; hosts BusinessSwitcher (import/usage lines inspected) |
| `src/components/layout/BusinessSwitcher.tsx` | Entity/business switcher entry point (existence and consumers verified) |

### Supporting systems

| File | Role |
|---|---|
| `src/lib/tenant/contexts.tsx` | WorkspaceProvider, EntityProvider, AuthorizationProvider; tenant client creation |
| `src/components/app/TenantGate.tsx` | Workspace lifecycle gate screens (imports of workspace pages verified) |
| `src/hooks/useSettings.ts` | Settings consumption (`settings.company_name`) — consumed via imports in `DashboardRedesign.tsx`, `AppShell.tsx`, `Layout.tsx` |
| `src/components/notifications/NotificationBell.tsx` | Header notification trigger + drawer mount |
| `src/hooks/useNotifications.ts` | Notification fetch/mark-read against global `notifications` table |
| `src/components/layout/GlobalSearch.tsx` | Global search entry in dashboard header |

### PRD directory inventory (`docs/prd/ui-ux-consolidation/`)

All 21 files plus `assets/` inventoried:

| File | Read depth |
|---|---|
| `README.md` | Full |
| `00-index.md` | Full |
| `01-findings.md` | Full |
| `02-recommendations.md` | Full |
| `03-roadmap.md` | Full |
| `04-architecture.md` | Full |
| `07-testing-checklist.md` | Full |
| `08-decisions.md` | Full |
| `09-progress.md` | Full (binary-encoding file read via shell) |
| `11-implementation-roadmap.md` | Full |
| `architecture-inspection.md` | Full |
| `component-inventory.md` | Full |
| `product-inspection.md` | Full |
| `issue-tracker.md` | Full |
| `design-system-roadmap.md` | Full |
| `migration-plan.md` | Full |
| `priority-matrix.md` | Full |
| `assets/screenshots.md` | Full |
| `reui-adoption-matrix.md` | Inventory + targeted search (dashboard/FAB sections) |
| `reui-library-inspection.md` | Inventory + targeted search |
| `reui-migration-opportunities.md` | Inventory + targeted search |
| `platform-component-recommendations.md` | Inventory + targeted search |

### Architecture/history evidence

| Source | Use |
|---|---|
| `docs/Reports/multi-tenancy/` directory listing (51 reports) | Confirms multi-tenancy program scope |
| Git log for `src/lib/tenant/contexts.tsx` | Tenant infrastructure commits dated 2026-08-08, 2026-08-16, 2026-08-17 |
| Git log for PRD README | PRD revision history (2026-06-30 origin, 2026-08-15 revision) |
| `docs/Reports/GENERAL/dead-code-removal.md`, `docs/Reports/GENERAL/notification-toast-dashboard-investigation.md`, `docs/Reports/GENERAL/2026-08-10-golden-dashboard-gap-analysis.md` | Prior dashboard findings used for cross-reference only |
| Skill index `docs/PROJECTSKILLINDEX.md` | Skill selection |

### Existence checks

`Test-Path` confirmed absent: `src/pages/Dashboard.tsx`, `src/components/ui/sidebar.tsx`, `src/App.css`, `src/styles/App.css`, `src/pages/PendingApproval.tsx`. Grep confirmed `prefers-reduced-motion` present in `src/index.css`, `src/components/ui/OperationOverlay.tsx`, `src/pages/WorkspacePendingApproval.tsx`, `src/pages/ProvisioningProgress.tsx`.

---

## 3. Glass Mesh Structural Extraction

Glass Mesh is analyzed only as structure. Colors, gradients, blur, shadows, typography, animation, and sound are excluded.

### 3.1 Global application shell

- Fixed topbar (52 px) spans the full width.
- Main content area sits below the topbar and scrolls vertically. The page body itself does not scroll; only `.content` scrolls.
- Overlay layers stack above content: off-canvas sidebar, notification panel, AI panel, FAB popup, shared scrim, toast, loading screen.
- A single `openPanel` state enforces mutual exclusivity: opening one surface closes the others. Escape closes all surfaces.

### 3.2 Topbar/header

Left group: sidebar toggle button, breadcrumb-style title "BIGDROPS / Dashboard". Right group: refresh button, theme toggle, notifications bell with unread pip dot, STEWARD AI assistant button.

### 3.3 Sidebar/navigation

Off-canvas drawer (280 px) opened by the topbar toggle. Structure:

- Head: logo mark + brand name.
- Nav section "Documents": Dashboard, Invoices, Quotations, Waybills, Letters, CSR Reports.
- Nav section "Operations": Projects, Compliance, Item Library.
- Foot: user avatar, name, role label ("Operator").

A scrim covers content while the drawer is open.

### 3.4 Mobile bottom navigation

Five fixed tabs shown at ≤768 px: Home, Projects, Sales, Clients, More. Hidden above 768 px.

### 3.5 Dashboard content container

Single vertical column of stacked sections inside the scrolling content area, in this order:

1. KPI grid.
2. Smart banner (priority alert).
3. Recent Alerts carousel.
4. Recent Documents feed.
5. Audit Trail list.

### 3.6 KPI/stat region

Two-column grid of four cards: Balance, Overdue, Invoices, Payments. Each card shows label, value (₦), segmented progress bar, and a trend line ("+12% last week").

### 3.7 Smart/priority alert region

One dismissible banner between KPIs and alerts: pulsing status dot, title ("3 payments may be unrecorded"), explanatory text, one primary call-to-action ("Record now"), close control.

### 3.8 Recent alerts

Horizontally scrolling row of compact cards. Each card: title, description, relative time. Section header carries a "see all" link.

### 3.9 Recent documents/activity feed

Vertical list rows. Each row: type icon, document number, status badge, secondary client/context line, right-aligned amount, date meta. Rows are clickable.

### 3.10 Audit trail/activity history

Simple timeline list. Each row: colored status dot (ok/warn/bad), event title, actor + timestamp meta. No navigation targets defined in the wireframe.

### 3.11 Notification surface

Topbar bell opens a fixed dropdown panel anchored below the topbar on the right (300 px wide, max-height 400 px). Header with "Clear all", scrollable list of rows with unread dots. Bell shows an unread pip.

### 3.12 FAB / quick-create mechanism

Fixed circular button at bottom-right (above bottom nav on mobile). Opens the quick-create popup.

### 3.13 Quick-create popup structure

Documented facts from markup and script:

- Relationship to FAB: popup and FAB share one fixed wrapper (`fab-wrap`, flex column). The popup renders directly above the button, right-aligned to it.
- Positioning: fixed bottom-right region of the viewport; anchored to the FAB; opens upward.
- Dimensions/footprint: fixed width of 180 px; height grows with item count; solid opaque surface.
- Action arrangement: single flat vertical stack, one action per full-width row. No groups, no icons, no descriptions — labels only.
- Number/type of action groups: one implicit group of six document actions: Invoice, Quotation, Purchase orders, Boq, Waybill, Csr.
- Contextual menu behavior: yes. It behaves as a compact contextual menu anchored to the trigger, not a full-screen sheet. The rest of the page remains visible behind a scrim.
- Dismissal: tapping the FAB again (icon rotates to ×), tapping the scrim, or pressing Escape. Opening another surface also closes it.
- Relationship to the rest of the page: overlay only. It does not push or reflow page content.

Note: the wireframe's create list includes "Purchase orders". BIGDROPS has no purchase-order module today. This is a wireframe aspiration, not a current capability.

### 3.14 Responsive behavior

Breakpoint at 768 px. Above it: no bottom nav, wider content padding. Below it: bottom nav appears, FAB repositions above it, content padding tightens. Sidebar is a drawer at all widths in this wireframe (no persistent desktop rail).

### 3.15 Page scrolling model

Content-area scroll only. Fixed chrome (topbar, bottom nav) stays put. All panels are overlays.

### 3.16 AI/Steward surface

Glass Mesh includes a STEWARD AI assistant: topbar button, bottom-sheet chat panel, suggestion chips, text input. **This surface is explicitly excluded from the BIGDROPS target dashboard architecture.** It must not be introduced.

---

## 4. Current BIGDROPS Dashboard Inventory

### 4.1 Route and ownership chain

```
src/App.tsx
  └─ WorkspaceProvider → EntityProvider → TenantGate   (multi-tenancy gate)
      └─ src/components/app/AppShell.tsx
          └─ Route "/" (lazy)
              └─ src/pages/DashboardRedesign.tsx
                  ├─ src/components/Layout.tsx           (app shell)
                  ├─ src/components/dashboard/DashboardOverview.tsx
                  ├─ inline FAB <button>                 (mobile-only)
                  └─ UnifiedActionSheet (create popup)
```

### 4.2 Section-by-section inventory

#### S1. Sticky identity header

| Attribute | Value |
|---|---|
| Owning component | `DashboardOverview.tsx` (sticky `<section>`) |
| Data source | `session.user.user_metadata.full_name` (prop) and `settings.company_name` via `useSettings`; falls back to "Bigdrops Workspace" |
| Tenant/workspace scope | Identity is user/company level. It does not render the active workspace or entity name. |
| Interaction | Menu button opens mobile sidebar (via `MobileChromeContext`); bell opens notifications; search opens global search |
| Navigation | None direct |

Classification: **STAY**. Structural role matches Glass Mesh topbar. Note: identity line does not reflect tenant context — see VERIFY item V2.

#### S2. Quick Actions tile grid

| Attribute | Value |
|---|---|
| Owning component | `DashboardOverview.tsx` ("Quick Actions" section) |
| Data source | `getQuickTiles(loadStoredQuickTiles())` from `src/config/quickTiles.js`; user-configurable, persisted in localStorage key `quick_tiles`; default tiles: invoices, quotations, csr, projects |
| Tenant/workspace scope | None (static config) |
| Interaction | Tap navigates to module list route (`onQuickAction` → `navigate(path)`) |
| Config surface | Settings → Dashboard section (`src/pages/settings/DashboardSettingsSection.tsx`, `src/components/settings/DashboardQuickTilesSettings.tsx`) |

Classification: **STAY**.

#### S3. Tasks (priority items)

| Attribute | Value |
|---|---|
| Owning component | `DashboardOverview.tsx` ("Tasks" section) |
| Data source | `useDashboardData().priorityItems`, derived client-side in `buildOverviewPriorityItems()` from projects, past-due invoice financials, and open quotations. Max 3 rendered. Pending-count pill derived from array length. |
| Queries | `invoices`, `quotations`, `projects`, `invoice_financials_v` via `tenantClient` (schema-scoped); BOQs via local `listBoqs()` (not used for priority items) |
| Tenant/workspace scope | Query-scoped through `tenantClient`. Priority logic itself has no permission gating (`AuthorizationProvider` unused here). |
| Interaction | Tap navigates by item type: project → `/projects`, payment → `/invoices`, quotation → `/quotations`. Type-level navigation only — not deep links to records. |
| Notes | This is the de-facto priority/attention region. It has no dismissal behavior (unlike Glass Mesh smart banner). |

Classification: **STAY**.

#### S4. Recent Activity (recent documents)

| Attribute | Value |
|---|---|
| Owning component | `DashboardOverview.tsx` ("Recent Activity" section, with skeleton loader) |
| Data source | `useDashboardData().recentDocs`: merged recent Invoices, Quotations, CSRs, Waybills, RFQs (all `tenantClient` queries) + BOQs from `listBoqs()` local storage. Sorted by date, capped at 6. |
| Tenant/workspace scope | Mixed: five document types are schema-scoped; BOQ entries come from device-local storage and are not tenant-scoped. See delta D5. |
| Interaction | Tap navigates to the specific document view route (`/${type}/${id}`) |
| Rendering detail | Amount when present, otherwise formatted status label |

Classification: **STAY**.

#### S5. Hero stats / summary metrics (computed but NOT rendered)

| Attribute | Value |
|---|---|
| Owning component | Props `heroStats` and `summary` reach `DashboardOverview.tsx` but are never referenced in its JSX (verified by grep: destructured at lines 181–182 only). |
| Data source | `useDashboardData` computes collections, open work, awaiting-payment count, in-transit waybills, overdue, due-this-week, month collections, pending follow-up from `invoice_financials_v` + waybill statuses |
| Status | Live dashboard currently has NO visible KPI/stat region |

Classification: **INVESTIGATE**. The computation exists and is cached but has no rendering home. Whether to surface a KPI region (as Glass Mesh does) is a downstream design decision. Not REMOVE: data pipeline is live and maintained.

#### S6. Desktop-specific layout (`DashboardDesktopView.tsx`)

| Attribute | Value |
|---|---|
| Owning component | `src/components/dashboard/DashboardDesktopView.tsx` |
| Importers | None found in `src/`. Only references are in docs reports. Orphaned. |
| Content if revived | Headline card + NotificationBell, quick tile grid, recent activity list, 4-tile action summary grid (Past Due / Due This Week / Collected / Pending follow-up), "More" sheet with recent projects |
| Classification | **REMOVE** candidate — concrete dead-code evidence (zero importers), duplicated responsibilities now covered by `DashboardOverview` (single responsive flow). Removal itself is later implementation work, not part of this task. |

#### S7. FAB / create mechanism (mobile)

See section 5. Classification: **STAY** (capability explicitly preserved).

#### S8. Notification access

| Attribute | Value |
|---|---|
| Owning component | `NotificationBell` mounted in dashboard sticky header (and previously in orphaned desktop view) |
| Data source | `useNotifications` → global `supabase.from('notifications')`, ordered by created_at, limit 30. User-scoped via RLS. Row shape includes optional `scope_type` / `scope_id` columns. |
| Tenant/workspace scope | Fetch is not entity-schema-scoped; scoping fields exist but their population semantics were not traced. DATA SOURCE: CONFIRMED as `notifications` table via global client. Scoping semantics: UNCONFIRMED. |
| Interaction | Bell opens `NotificationDrawer` (sheet): list, mark-read, mark-all-read, refresh. Unread count badge caps display at "99+". |

Classification: **STAY**.

#### S9. Audit trail / activity history

No audit region exists on the dashboard. Audit surfaces live in document views (`AuditTrailPanel`, per-document `ActivityCard` components) and Compliance Hub. Classification: **STAY** as non-dashboard capability. Whether the dashboard should gain an audit region (Glass Mesh has one) is a downstream decision — INVESTIGATE, low confidence, see V6.

#### S10. Global search

`GlobalSearch` in the dashboard header; backed by `useGlobalSearch` which consumes `useEntity().tenantClient`. Classification: **STAY**.

### 4.3 Explicit legacy/redundancy findings

| Finding | Evidence | Class |
|---|---|---|
| Orphaned desktop dashboard component | Zero imports of `DashboardDesktopView.tsx` | REMOVE candidate |
| Dead hero-stats props | `heroStats`/`summary` accepted but unused in `DashboardOverview.tsx` | INVESTIGATE |
| Non-tenant BOQ feed | `listBoqs()` local storage inside tenant-scoped merge (`useDashboardData.ts` lines 354, 466) | INVESTIGATE (pre-multitenancy leftover) |
| Non-tenant dashboard cache key | Cache key `bd:dashboard:{variant}:v1` contains no workspace/entity id (`useDashboardData.ts` line 287; `dashboardCache.ts`) | INVESTIGATE (stale cross-workspace data risk) |
| Pre-multitenancy approval gate removed | `src/pages/PendingApproval.tsx` deleted (working tree); superseded by workspace-level `WorkspacePendingApproval.tsx` | Legacy concept superseded; commit intent UNCONFIRMED |
| Structurally overloaded page | `DashboardRedesign.tsx` owns page composition, FAB markup, and create-sheet wiring inline; acceptable size (106 lines) but FAB is not a reusable component | Note only |
| Mixed responsibilities in header | Identity line doubles as page title and user greeting | Note only |

---

## 5. FAB / Quick-Create Structural Comparison

### 5.1 What BIGDROPS currently does

Source: `src/pages/DashboardRedesign.tsx` lines 78–103; `src/components/actions/UnifiedActionSheet.tsx`; `src/config/quickTiles.js`.

- Trigger: fixed circular button, 52×52 px, bottom-right (`bottom-24 right-5`), Plus icon, `aria-label="Create new record"`. Mobile-only (`md:hidden`).
- Popup: `UnifiedActionSheet` rendered as a Radix bottom Sheet with `layout="list-compact"`.
- Actions: `getCreateActions()` returns 7 document creates: New Invoice, New Project, New RFQ, New Quotation, New CSR, New Waybill, New Letter. Client creation is deliberately filtered out.
- Arrangement: single flat vertical list of compact rows (28 px icon chip, bold 12 px label, chevron). One implicit group; optional grouped mode exists in the component but is unused here. Handle bar + "Create" title header.
- Footprint: near-full-width bottom sheet capped by `--bd-overlay-sheet-max-height`; respects `env(safe-area-inset-bottom)`; scrollable content area.
- Dismissal: selecting an action (closes after navigate), backdrop tap, or Escape — standard Radix dialog behavior.
- Desktop behavior: no FAB. Creation paths are the Quick Actions tiles and module pages.
- Accessibility: button has aria-label; sheet uses Radix focus handling; icons are decorative.
- Correspondence to current document architecture: yes. All seven actions map to live routes (`/invoices/new`, `/projects/new`, `/rfqs/new`, `/quotations/new`, `/csr/new`, `/waybills/new`, `/letters/new`). No obsolete actions.

### 5.2 What Glass Mesh structurally does

Compact 180 px popup anchored directly above the FAB, opening upward; six label-only actions in a single stack; scrim + Escape + re-tap dismissal; page stays visible behind a scrim; mutually exclusive with other overlay surfaces.

### 5.3 Structural comparison

| Dimension | BIGDROPS current | Glass Mesh |
|---|---|---|
| Trigger position | Fixed bottom-right, mobile-only | Fixed bottom-right, both breakpoints |
| Surface type | Bottom sheet, ~full width | Compact anchored popup (180 px) |
| Anchor relationship | Detached from button (sheet rises from screen edge) | Attached; opens directly above the button |
| Direction | Up from bottom edge | Up from button |
| Item format | Icon + label row | Label-only row |
| Grouping | Flat list (group support exists, unused) | Flat list |
| Page visibility | Obscured by sheet backdrop | Page visible behind scrim |
| Dismissal | Selection / backdrop / Esc | Selection / scrim / re-tap / Esc |
| Exclusive overlays | Managed per-component | Single global openPanel exclusivity |
| Desktop equivalent | Quick tiles (no FAB) | Same FAB pattern at all widths |

### 5.4 Answers required by the task

1. **Current BIGDROPS behavior:** mobile-only FAB opens a compact-list bottom sheet with seven valid document-create actions.
2. **Glass Mesh structural behavior:** compact anchored popup above the FAB with minimal stacked actions.
3. **Potentially worth carrying forward (structure only):** small-footprint anchored presentation; attachment of the menu to the trigger; strict mutual exclusivity of overlay surfaces; keeping the action set short and flat. These are candidates only.
4. **What remains unchanged:** the FAB capability itself, the seven-action set mapped to real routes, mobile placement, and the UnifiedActionSheet's role as the platform action-sheet primitive (it serves many other surfaces).
5. **Later decisions:** whether any Glass Mesh structural trait is adopted; whether desktop gains a create affordance beyond tiles; whether priority items become dismissible like the smart banner. None decided here.

No FAB code was modified.

---

## 6. Architectural Changes Since UI/UX PRD

The PRD inspection base is June 2026 (`architecture-inspection.md`, `product-inspection.md`, `component-inventory.md`), revised August 2026 for Divine Blood tokens. Multi-tenancy landed after the original inspection: git shows tenant frontend infrastructure on 2026-08-08, the onboarding gate on 2026-08-16, and workspace create/join/selection on 2026-08-17 (`git log -- src/lib/tenant/contexts.tsx`).

### D1. Multi-tenancy introduced (Workspace → Entity → per-entity schema)

| Field | Content |
|---|---|
| OLD ASSUMPTION | Single business per account. Company name from settings drives context. No workspace concept anywhere in the PRD. |
| CURRENT REALITY | Three-layer provider stack: `WorkspaceProvider` (workspaces, `workspace_members` roles, `workspace_invitations`), `EntityProvider` (entities within a workspace; expected schema `entity_{workspace.slug}_{entity.slug}`; provisioning status gate), `AuthorizationProvider` (per-entity `entity_permissions` resource/action checks). All app routes render only after `TenantGate` resolves the workspace lifecycle. |
| EVIDENCE | `src/lib/tenant/contexts.tsx` (full read); `src/App.tsx` provider nesting; `src/components/app/TenantGate.tsx` imports of WorkspaceCreation/Selection/Invitation/PendingApproval/CompanyCreation/ProvisioningProgress; `docs/Reports/multi-tenancy/` (51 reports); git dates above. |
| IA CONSEQUENCE | The dashboard is now entity-data-driven through `tenantClient`. Shell chrome must express tenant context. Any new dashboard region must be tenant-scoped by default. |

### D2. Business/entity switching exists in shell chrome

| Field | Content |
|---|---|
| OLD ASSUMPTION | Static business context in the sidebar footer (PRD asked to make it sticky). |
| CURRENT REALITY | `BusinessSwitcher` component consumes `useEntity` and is mounted in `DesktopSidebar`, `MobileSidebar`, and `Layout`. |
| EVIDENCE | Import greps in `src/components/layout/DesktopSidebar.tsx` (line 155 mount), `MobileSidebar.tsx`, `Layout.tsx`; `BusinessSwitcher.tsx`. |
| IA CONSEQUENCE | Switching context is a shell concern, not a dashboard concern. The resolved IA keeps switching in navigation chrome. |

### D3. Approval/onboarding moved to workspace lifecycle

| Field | Content |
|---|---|
| OLD ASSUMPTION | Account-level `PendingApproval` auth page gates access (PRD lists it among auth screens). |
| CURRENT REALITY | Workspace-level gates: pending own workspace (`workspaces.status = 'pending_approval'`), invitations, entity provisioning progress/failure. Legacy `src/pages/PendingApproval.tsx` is removed; commit `dc5ba0f7` ("remove legacy signup approval gate") confirms intentional deletion. |
| EVIDENCE | `TenantGate.tsx` routing table; `contexts.tsx` pending-workspace query; `Test-Path` result. |
| IA CONSEQUENCE | The dashboard renders only for fully provisioned entities. No approval-state branching belongs in dashboard IA. |

### D4. Document form consolidation progressed

| Field | Content |
|---|---|
| OLD ASSUMPTION | Four divergent form architectures; New/Edit pairs duplicated per module. |
| CURRENT REALITY | Unified form pages exist (`InvoiceFormPage.tsx`, `QuotationFormPage.tsx`, `WaybillFormPage.tsx`, `CsrFormPage.tsx` present in `src/pages/`). However `AppShell.tsx` routes still lazy-import `New*` / `Edit*` pages for most modules. Migration completion state: UNCONFIRMED. |
| EVIDENCE | File existence via earlier greps; `AppShell.tsx` route table read. |
| IA CONSEQUENCE | Minimal for dashboard IA; affects create-entry stability only. |

### D5. Data scoping is inconsistent on the dashboard

| Field | Content |
|---|---|
| OLD ASSUMPTION | All dashboard data comes from one Supabase dataset (implicit in PRD era). |
| CURRENT REALITY | Five document types load through `tenantClient` (schema-scoped). BOQs load from device-local storage via `listBoqs()`. Notifications load from the global `notifications` table (user-scoped). The dashboard cache key has no tenant component. |
| EVIDENCE | `useDashboardData.ts` (queries at lines 334–347 / 446–459; `listBoqs()` at 354/466; cache key at 287); `useNotifications.ts` (global client); `dashboardCache.ts`. |
| IA CONSEQUENCE | "Recent Activity" mixes tenant and non-tenant sources. Cache can show stale data across workspace switches. Both need resolution before consolidation. |

### D6. FAB now exists (PRD said it did not)

| Field | Content |
|---|---|
| OLD ASSUMPTION | Dashboard uses quick tiles only; "No FAB present (intentional)" (`screenshots.md`, issue K10). Decision D-005 proposed adopting an animated FAB template. |
| CURRENT REALITY | A functional mobile FAB opens `UnifiedActionSheet` with seven create actions. The motion-library-based FloatingDisclosureBase was not adopted; the shipped primitive is CSS-transition-based. |
| EVIDENCE | `DashboardRedesign.tsx` lines 78–103; AGENTS.md UI constraint forbidding framer-motion in production; governance rule in `11-implementation-roadmap.md` §9.2 ("No framer-motion introduction"). |
| IA CONSEQUENCE | Create-entry model changed post-PRD: tiles + FAB coexist. Resolved IA must define both roles. |

### D7. Dead-code cleanup partly executed

| Field | Content |
|---|---|
| OLD ASSUMPTION | `Dashboard.tsx`, `ui/sidebar.tsx`, `App.css`, `FormNavigation*` flagged dead. |
| CURRENT REALITY | `src/pages/Dashboard.tsx`, `src/components/ui/sidebar.tsx`, `src/App.css` confirmed absent. New dead weight appeared: `DashboardDesktopView.tsx` is orphaned. |
| EVIDENCE | Test-Path results; grep for `DashboardDesktopView` importers (none in src). |
| IA CONSEQUENCE | Consolidation should delete the orphan rather than maintain two dashboard layouts. |

---

## 7. UI/UX Consolidation PRD Reconciliation

Classifications apply to requirements as they affect dashboard IA and shell structure. REJECT is used only where concrete architectural/product evidence exists. Visual-language items (Divine Blood token work) remain valid but belong to the separate later design phase.

| # | Requirement (source) | Class | Rationale |
|---|---|---|---|
| R1 | Adopt Divine Blood as sole design language; 2 modes (D-017/D-018; README, 00-index, design-system-roadmap) | KEEP | Active decision, unaffected by tenancy. Visual phase — explicitly out of this investigation's scope. |
| R2 | Unify New/Edit pages per module (R1/04-architecture) | UPDATE | Goal valid. Unified form page files now exist, but route cutover state is UNCONFIRMED (`AppShell` still imports New*/Edit*). Tenancy added tenant-scoped save paths that the original plan did not know about. |
| R3 | Consolidate CSS Module patterns; prune tokens; remove App.css (R2–R4) | KEEP | Still-valid cleanup goals. App.css already gone. Unrelated to tenancy. |
| R4 | Resolve sidebar ambiguity: adopt shadcn `ui/sidebar.tsx` primitive (R5, D-003) | REJECT | Concrete evidence: the primitive was deleted from the repository (`src/components/ui/sidebar.tsx` absent). The custom `DesktopSidebar`/`MobileSidebar` pair is the implemented standard, now carrying BusinessSwitcher. The "Option B" branch won de facto. |
| R5 | Sign-out confirmation dialog (K4, D-008) | KEEP | Implemented in `Layout.tsx` AlertDialog (lines 281–296). Requirement remains valid as a standing rule. |
| R6 | Sticky business context in desktop sidebar (product-inspection, Q-02) | UPDATE | Underlying goal persists, but the context is now the tenant-aware `BusinessSwitcher`. Stickiness in current `DesktopSidebar` was not verified. |
| R7 | Reduced-motion support (D-010, Q-03) | KEEP | `prefers-reduced-motion` now appears in `index.css` and three components. Coverage completeness not audited here. |
| R8 | Safe-area insets for Capacitor (D-016) | KEEP | Partially implemented (`--safe-area-inset-bottom` in MobileBottomNav; env() inset in UnifiedActionSheet). Remaining-surface audit deferred. |
| R9 | Column locking / sticky first column in DataGrid (K5, D-009/D-015) | KEEP | List-layer UX requirement; still valid; outside dashboard IA scope. |
| R10 | Sortable columns UI wiring (K6) | VERIFY | No evidence found either way during this investigation. |
| R11 | CSR form migration to SharedDocumentForm (D-007) | UPDATE | Goal stands; a `CsrFormPage.tsx` exists; completion UNCONFIRMED. Tenancy did not invalidate the goal. |
| R12 | Adopt framer-motion FloatingDisclosureBase as FAB standard (D-005, platform recommendations "Adopt") | REJECT | Concrete conflicts: AGENTS.md forbids framer-motion in production; roadmap §9.2 rule 3 bans introducing framer-motion; a CSS-based FAB + UnifiedActionSheet already ships. Adoption of that specific animated template is obsolete. The underlying "dashboard needs fast create entry" goal is satisfied differently (see NEW-N2). |
| R13 | Route transition animations via AnimatePresence (D5/Z-01) | UPDATE | Goal may stand only as CSS transitions per the roadmap's own governance rule; framer-motion variant is barred by AGENTS.md. |
| R14 | aria-live loading regions (Z-03) | VERIFY | Not audited in this investigation. |
| R15 | Dashboard quick tiles as intentional primary creation path (K10, screenshots.md "No FAB present") | UPDATE | Tiles remain, but the "no FAB" premise is factually superseded — a FAB now exists alongside tiles. The resolved IA must define both. |
| R16 | Testing checklist per module (07-testing-checklist) | KEEP | Process requirement; still applicable; add tenant-switch cases (see NEW-N4). |
| R17 | Progress tracker / decision workflow (09-progress, 08-decisions) | KEEP | Governance scaffolding remains valid. |
| R18 | Component primitives: InputGroup/ButtonGroup/sortable adoption (D-014 etc.) | VERIFY | Component-layer items; not assessed for current validity here. |
| NEW-N1 | Tenant-aware dashboard identity and scoping | NEW | Post-PRD reality: dashboard identity line ignores workspace/entity; cache key lacks tenant scope; BOQ feed bypasses tenant schema. No PRD item covers this. |
| NEW-N2 | Define coexisting create-entry model (tiles + FAB) | NEW | The PRD knew only tiles. Today both exist and need explicit roles. |
| NEW-N3 | Permission-gated dashboard actions | NEW | `AuthorizationProvider` exists and is unused by the dashboard; future IA should state where permissions gate quick actions/tasks. |
| NEW-N4 | Multi-workspace regression testing (switch, invitation, provisioning states) | NEW | TenantGate lifecycle screens are new test surfaces absent from the PRD checklist. |
| NEW-N5 | Notification scoping semantics | NEW | `scope_type`/`scope_id` columns exist; dashboard/notification scoping rules are undefined in the PRD. |

---

## 8. Resolved Current Dashboard Information Architecture

This target uses only confirmed evidence. It preserves current function, removes only evidence-backed obsolescence, and defers all visual choices.

### 8.1 Global shell

- `Layout.tsx` remains the single shell orchestrator for all routes including `/`.
- Desktop: persistent `DesktopSidebar` rail hosting primary navigation and the tenant-aware `BusinessSwitcher`.
- Mobile: `MobileBottomNav` (Home / Projects / Sales / Clients / More) plus `MobileSidebar` drawer and the Sales / More sheets.
- Workspace/entity switching stays in navigation chrome, never inside dashboard content.

### 8.2 Primary navigation

- Desktop rail: Dashboard, Projects, Clients, Item Library + Sales picker (Invoices, Quotations, CSR, Waybills) + utility groups (Letters; Reports, Compliance Hub, Receipts, Item Library; Settings, Sign Out with confirmation).
- Mobile: 5-tab bar; Sales opens the four-module sheet; More opens correspondence/finance/system sheets.
- Pre-sales modules (RFQ, BOQ) remain reachable through existing picker structures. (Their exact picker placement is current behavior; no change proposed.)

### 8.3 Dashboard content hierarchy (single responsive flow, `DashboardOverview`)

Order and role, top to bottom:

1. **Sticky identity header** — menu toggle (mobile), user/business identity line, NotificationBell, GlobalSearch.
2. **Quick Actions** — four configurable module tiles (localStorage-persisted selection, editable in Settings → Dashboard).
3. **Tasks** — up to three derived priority items with pending-count indicator; type-level navigation.
4. **Recent Activity** — up to six mixed recent documents with skeleton loading state; deep links to document views.

### 8.4 Region definitions

- **KPI/stat region:** none rendered today. `heroStats`/`summary` computations stay alive. Surfacing a KPI region (Glass Mesh style) is a downstream design option, not a structural commitment.
- **Priority/attention region:** the Tasks section fulfils this role. A dismissible single-focus banner (Glass Mesh smart-banner structure) is a possible downstream evolution; not committed.
- **Recent activity/document region:** Recent Activity section; must become fully tenant-scoped once the BOQ storage question resolves.
- **Audit/activity region:** remains out of the dashboard; audit trails live in document views and Compliance Hub. Adding a dashboard audit region is a downstream option.
- **Notification access:** header bell → drawer over the global `notifications` table. Stays user-facing; scoping semantics to be settled separately.

### 8.5 Quick-create / FAB role

- The FAB capability is preserved exactly as implemented: mobile-only trigger, `UnifiedActionSheet` compact list, seven document-create actions matching live routes.
- The Glass Mesh compact anchored popup is recorded as a possible structural reference for footprint and trigger attachment. Adoption is a later implementation decision.
- Quick tiles remain the desktop (and configurable) creation/discovery entry. Tiles = navigation + discovery; FAB = fast creation on mobile.

### 8.6 Responsive structural behavior

- Breakpoint `md:` (768 px) unchanged.
- Mobile: bottom nav visible; FAB positioned above it; dashboard is the single-column flow; sheets/drawers for secondary navigation.
- Desktop: sidebar persistent; same content flow at constrained max width; no separate desktop dashboard component.

### 8.7 Removals and exclusions

- `DashboardDesktopView.tsx`: REMOVE (orphaned; zero importers; responsibilities fully covered by the live flow).
- Glass Mesh STEWARD/AI assistant surface: EXCLUDED. Not part of BIGDROPS target architecture.
- No visual styling, colors, typography, shadow, blur, or animation decisions are made in this IA.

### 8.8 Constraints carried into implementation

- Financial math stays in `src/lib/Calculations.ts`; dashboard remains a renderer of prepared aggregates.
- Framer-motion must not be introduced.
- All dashboard data paths must be tenant-scoped before consolidation (resolves D5).

---

## 9. Unresolved Questions / VERIFY Items

| ID | Question | Why unresolved |
|---|---|---|
| V1 | Should the computed heroStats/summary be surfaced as a dashboard KPI region? | Data pipeline live; rendering absent; product decision pending. |
| V2 | Should the dashboard identity line show active workspace/entity names instead of raw company/user metadata? | Tenant context exists in providers; dashboard does not consume it; design decision pending. |
| V3 | Will BOQ move to tenant-scoped storage? | Local-storage read confirmed; migration plans exist under `docs/Reports/multi-tenancy/` but outcome not verified. |
| V4 | Should the dashboard cache key include workspace/entity identifiers? | Risk identified (stale cross-workspace data); fix approach is implementation work, not investigation. |
| V5 | Are notifications intended to be entity-scoped via `scope_type`/`scope_id`? | Columns exist; write-side semantics not traced. |
| V6 | Does the dashboard need an audit-trail region (Glass Mesh parity)? | Current audit surfaces live elsewhere; product decision pending. |
| V7 | Is the New*/Edit* → FormPage route cutover complete? | Unified page files exist; `AppShell` still lazy-imports old pages; mid-migration state UNCONFIRMED. |
| V8 | ~~Was the working-tree deletion of `src/pages/PendingApproval.tsx` intentional upstream?~~ | RESOLVED during investigation: commit `dc5ba0f7` confirms intentional removal. |
| V9 | Sortable-columns UI (PRD K6): implemented or still missing? | Not audited in this investigation. |
| V10 | Is reduced-motion coverage complete across all animated surfaces? | Present in `index.css` + three components; exhaustive audit not performed. |
| V11 | Are priority-item navigations meant to deep-link to records rather than module lists? | Current behavior is type-level navigation; intent undocumented. |
| V12 | Does desktop need a create affordance beyond quick tiles? | Product question surfaced by the comparison; not decided. |

---

## 10. Investigation Conclusion

Three sources reconcile into one coherent picture:

1. **The current dashboard is structurally sound and tenant-aware at the query layer.** Route `/` → `DashboardRedesign` → `DashboardOverview` delivers a four-section flow (identity header, quick actions, tasks, recent activity) over schema-scoped `tenantClient` queries. This flow is the resolved IA baseline.

2. **Multi-tenancy invalidated the PRD-era context model, not its goals.** Workspaces, entities, per-entity schemas, permissions, and lifecycle gating arrived after the PRD inspection. Navigation chrome absorbed switching via `BusinessSwitcher`; the dashboard itself has not yet expressed tenant identity, its cache is not tenant-keyed, and its BOQ feed bypasses tenant storage. These are the highest-value fixes for the coming consolidation phase.

3. **The FAB question is settled by reality.** A mobile FAB with a seven-action compact sheet already ships alongside configurable quick tiles. The PRD's "tiles only" stance and its framer-motion FAB proposal are both superseded. The preserved capability stands; the Glass Mesh compact popup survives only as an optional structural reference for footprint and trigger attachment.

4. **Removals are narrow and evidence-backed:** the orphaned `DashboardDesktopView.tsx`, dead hero-stat props (pending the KPI-region decision), and the legacy account-level approval concept already displaced by workspace gating.

5. **Exclusions hold:** no Steward/AI surface, no visual design commitments, no FAB modification, zero code changes.

Verification:
- git status --short (before): pre-existing unrelated modifications/deletions present; recorded in section 1
- Concurrent commits by another session landed mid-investigation (`dc5ba0f7`, `9978bf46`, `d732cac1`); no conflict with this task
- git status --short (after): exactly one new file, `docs/Reports/dashboard-ia-reconciliation.md`; no application source modified by this task
- Application source files modified: none
- bun run build / typecheck / lint: skipped — zero-code documentation task per instruction
