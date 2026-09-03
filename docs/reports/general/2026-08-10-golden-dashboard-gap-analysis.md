# Audit & Gap Analysis — Golden Dashboard Template vs. Production Dashboard

This report was written by Kiro on 2026-08-10 via Kiro IDE.

---

## Objective & Scope

**Objective:** Compare `docs/TEMPLATES/React-temps/Golden-dashboard.tsx` against the live production dashboard (`src/pages/DashboardRedesign.tsx`, `src/components/dashboard/DashboardOverview.tsx`, `src/components/dashboard/DashboardDesktopView.tsx`) and produce a prioritized upgrade plan.

**Included:** Data bindings, state management, widget inventory, layout, responsiveness, UX patterns.

**Excluded:** Multi-preset theme engine comparison. This review assumes a single unified theme model per the task mandate.

**Files inspected:**
- `docs/TEMPLATES/React-temps/Golden-dashboard.tsx`
- `src/pages/DashboardRedesign.tsx`
- `src/components/dashboard/DashboardOverview.tsx`
- `src/components/dashboard/DashboardDesktopView.tsx`
- `src/hooks/useDashboardData.ts`
- `src/config/quickTiles.js`

---

## 1. Architectural & Component Gaps

### 1.1 Real Data Bindings Present in Production but Absent in the Template

| Data Concept | Production Implementation | Template Status |
| --- | --- | --- |
| Tenant-scoped invoice queries | `tenantClient.from('invoices')` with `archived_at` null filter, limit 20 | **Absent.** Template uses static `MOCK_KPIS` and `INITIAL_DOCUMENTS`. |
| Supabase RPC financial metrics | `supabase.rpc('get_dashboard_financial_metrics', { p_now, p_end_of_week, p_start_of_month })` — returns overdue, due this week, monthly collections, pending follow-up, awaiting payment count | **Absent.** No server-side financial aggregation. |
| Multi-table recent docs pipeline | 7 parallel Supabase queries (invoices, quotations, CSRs, waybills, RFQs, BOQs, projects), merged and sorted by date via `buildRecentDocs` | **Absent.** Template filters a static `INITIAL_DOCUMENTS` array typed only as `DocumentItem`. |
| Dashboard cache layer | `readDashboardCache` / `writeDashboardCache` with 2-minute TTL and stale-while-revalidate | **Absent.** No persistence or cache. |
| `useEntity` / tenant context | Company-scoped queries via `tenantClient` from `@/lib/tenant/contexts` | **Absent.** Template manages company state in local `useState`. |
| Priority item builder | `buildOverviewPriorityItems` derives live tasks from real project, quotation, and `has_past_due` RPC flag | **Absent.** Template generates alerts from static `INITIAL_ALERTS`. |
| In-transit waybill counter | `waybills.filter(row => row.status === 'dispatched').length` | **Absent.** |
| `heroStats.awaitingPaymentCount` | Live count from `awaiting_payment_count` column in RPC response | **Absent.** |
| React Router navigation | `useNavigate()` with typed `pathByType` maps for all document types | **Absent.** Template uses `setActiveTab()` and `triggerToast()` stubs. |
| `useSettings` hook | Reads `settings.company_name` for the workspace identity line | **Absent.** Template uses `activeCompany.name` from local state. |

### 1.2 State Management Structural Difference

The production dashboard page (`DashboardRedesign.tsx`) is stateless for data. All loading is delegated to `useDashboardData`. The template owns its entire data model in 10+ local `useState` declarations. Migrating the template requires replacing all of them with the existing hooks.

### 1.3 Operational Widgets Present in Production but Omitted in the Template

| Widget | Production | Template |
| --- | --- | --- |
| Hero stats row (Collections / Open Work / Awaiting Payment / In Transit) | Rendered from live `heroStats` object | Not rendered in the home tab |
| Desktop financial summary grid (Past Due / Due This Week / Collected / Pending Follow-up) | `DashboardDesktopView` — 4-tile grid with real Naira amounts | Absent |
| `UnifiedActionSheet` FAB (7 create actions, bottom sheet) | Rendered in `DashboardRedesign.tsx` | Template has a 4-button `quickCreateOpen` popover with no routing |
| `GlobalSearch` component | Wired to full search pipeline | Template has a plain `<input>` with no logic |
| `NotificationBell` (live Supabase notification count) | Real component with live data | Template uses a local static `notifications` array |
| Layout-level sidebar via `MobileChromeContext` | Bound to `<Layout>` context | Template manages sidebar in local `useState(false)` |
| `DashboardDesktopView` — dedicated desktop layout | `md:block` breakpoint split | Template is mobile-only; no desktop breakpoint |
| BOQ documents in recent activity | `listBoqs()` called alongside Supabase queries | No BOQ concept |
| RFQ documents in recent activity | Included via `rfqs` query | No RFQ concept |
| Letters module quick tile | Registered in `QUICK_TILE_REGISTRY` | Absent from template sidebar and quick actions |

### 1.4 Widgets Present in the Template but Absent in Production

| Widget | Template | Production Note |
| --- | --- | --- |
| Multi-workspace switcher | Full workspace list with plan labels (Enterprise / Professional / Starter) and region | Production is single-workspace; no switcher exists |
| Inline company creation form | `newCompanyModalOpen` form writing to local state | Not present; handled in Settings |
| Settings modal (tabbed workspace / company / general) | Overlay modal | Production has a dedicated `/settings` route |
| Projects tab with progress bars | Static progress bar mockups | Production has a dedicated `/projects` route |
| Analytics tab with bar chart meters | Static bars (82% / 18% hardcoded) | Production has a dedicated `/reports` route |
| Activity Trail section with timeline dots | Scoped audit events rendered as timeline | No equivalent section in `DashboardOverview` |
| Dark/light toggle in header | Inline `toggleTheme` button | Production theme via Settings page |
| Company color gradient avatars in switcher | Per-company gradient chips (`SSP`, `PYG`, `CMC`) | No visual company identity in production header |

---

## 2. Layout & UX Opportunities

### 2.1 Template Patterns Worth Porting to Production

**Horizontal snap-scroll action items carousel.**
The template renders priority/alert items in a horizontal `snap-x` carousel. Production uses a vertical stack. The carousel handles 4+ items on small screens without collapsing content.

**Dark hero KPI card.**
The template anchors the financial summary with a dark gradient "Cash Received" card. Production renders `heroStats` without visual differentiation between metric importance.

**Company code avatar chip in header.**
Gradient letter-code chips (e.g., `SSP`) give strong per-company identity cues. Production has no visual company identity element in the header.

**Entity confirmation in FAB popover.**
The template displays "Action Entity: [Company Name]" before create buttons. This confirms document creation context. Production's `UnifiedActionSheet` omits this.

**Activity trail timeline.**
Border-left + dot connector pattern communicates event sequence clearly. Production's recent activity is a simple divided list.

### 2.2 Layout Defects in the Template

**Mobile-only device frame.**
The root element uses `max-w-[430px]` and `sm:rounded-[36px]`. This is a demo frame. It will not adapt to desktop. The production container is `max-w-[var(--bd-layout-content-max,1200px)]` with a `md:` breakpoint split.

**Inline `<style>` keyframe block.**
The template injects `@keyframes slideInLeft`, `scaleUp`, and `fadeIn` inside a `<style>` tag in the component. This conflicts with the project's CSS variable and Tailwind animation system.

**No `md:` responsive breakpoints.**
Every layout value is hardcoded for mobile. No grid reflow exists at `md:` or `lg:`. The `w-[80%] sm:w-[230px]` partial overrides do not cover desktop.

**Non-standard Tailwind spacing tokens.**
`w-7.5`, `h-7.5`, and `py-0.2` are not in the default Tailwind v3 scale. Without a `tailwind.config` extension these classes produce no output and will silently break layout dimensions.

**Absolute-positioned notification dropdown.**
`absolute top-14 right-3` will be clipped inside overflow containers in production. The production `NotificationBell` uses a proper popover/portal.

**`font-serif` dependency.**
`font-serif font-black` is used for all KPI figures. The project does not import a serif typeface via its Tailwind config. Applying this class without the corresponding font-face registration falls back to the browser default serif.

**Fixed toast may collide with bottom nav.**
The context toast renders at `fixed top-3`. On small screens with the bottom nav at `bottom-0` and FAB at `bottom-16`, toast actions triggered from bottom UI can overlap on narrow viewports.

---

## 3. Recommended Upgrades & Action Plan

### Priority 1 — Replace mock data with production hooks (Blocker)

- Replace all `useState` data arrays with `useDashboardData()` and `useSettings()`.
- Remove `INITIAL_WORKSPACES`, `INITIAL_COMPANIES`, `INITIAL_ALERTS`, `INITIAL_DOCUMENTS`, `MOCK_KPIS`, `INITIAL_NOTIFICATIONS`, `INITIAL_AUDIT_EVENTS` and all associated handlers.
- Production is single-workspace. Remove the multi-workspace switcher entirely.
- Replace `triggerToast()` navigation stubs with `useNavigate()`.
- Wire `activeCompany` to `useEntity()` or `useSettings()`.

### Priority 2 — Strip the device frame (Blocker)

- Remove `max-w-[430px]`, `sm:rounded-[36px]`, and `sm:my-4`.
- Replace with the production `max-w-[var(--bd-layout-content-max,1200px)]` container.
- Place the component inside the existing `<Layout>` shell, not as a standalone root.
- Remove the inline `<style>` animation block. Use existing Tailwind `animate-*` utilities.

### Priority 3 — Map hardcoded colors to design tokens (Required)

All hex literals must map to the project's CSS variable system:

| Template value | Production token |
| --- | --- |
| `bg-[#FAF6EF]` | `bg-background` |
| `bg-[#0A0A0E]` | `bg-background` (dark) |
| `text-[#B8860B]` | `var(--tone-accent)` |
| `border-[#EADBB8]` | `border-border` |
| `bg-[#EFE6D5]` | `bg-muted` |
| `dark:bg-[#121216]` | `dark:bg-background` |

Remove the local `darkMode` / `toggleTheme` state. Use the project's theme provider.

### Priority 4 — Replace inline UI with production components (Required)

- Sidebar `<aside>` → `<Layout>` + `MobileChromeContext`.
- Inline notification panel → `<NotificationBell>`.
- Inline search input → `<GlobalSearch>`.
- FAB popover → `<UnifiedActionSheet>`.

### Priority 5 — Add missing production KPIs (High value)

Integrate the following widgets absent from the template's home tab:

- Hero stats row: Collections / Open Work / Awaiting Payment / In Transit, sourced from `heroStats`.
- RFQ and BOQ icons in recent document rendering (`recentRecordMeta` in `DashboardOverview.tsx` already defines both).

### Priority 6 — Port template UX improvements to production (Enhancement)

- Horizontal snap-scroll carousel for priority/action items.
- Dark hero KPI card anchoring the financial summary.
- Company code gradient avatar chip in header context.
- Entity confirmation label in FAB quick-create.
- Activity trail timeline section (border-left + dot connector for recent docs or audit events).

### Priority 7 — Fix non-standard Tailwind tokens (Required)

Audit all `w-7.5`, `h-7.5`, `py-0.2` usages. Either extend `tailwind.config.ts` under `extend.spacing` or replace with nearest standard values (`w-8` / `h-8`).

### Priority 8 — Restore desktop layout (Required after mobile completion)

After mobile wiring is complete, add a `hidden md:block` branch replicating the `DashboardDesktopView` pattern: 4-tile financial summary grid, wider document list, `recentProjects` quick-access sheet.

---

## 4. Risks & Limitations

- The template's multi-workspace architecture has no production equivalent. Any attempt to port the workspace switcher requires a new backend schema and is out of scope for a dashboard migration.
- `font-serif` usage will silently degrade to browser default serif if a serif typeface is not registered in `tailwind.config.ts`.
- The inline `<style>` animations may conflict with Tailwind's JIT purging if not migrated.
- `w-7.5` and similar non-standard tokens will produce zero output without config extension — sizing bugs will be invisible until visual testing.

---

## 5. Verification Gate

| Check | Status |
| --- | --- |
| `bun run typecheck` | Not run — read-only task per mandate |
| `bun run audit:load` | Not run — read-only task per mandate |
| `bun run build` | Not run — prohibited by AGENTS.md hardware policy |
| `git status` | ✅ Confirmed — zero files modified by this review |

---

## 6. Deferred Work

- **Workspace switching UI** — Future feature, no production equivalent. Out of scope for this migration phase.
- **Analytics tab (bar charts)** — Static meters in template. Real analytics served via `/reports`. No dashboard-level equivalent needed.
- **Company creation flow** — Belongs in Settings, not the dashboard.
- **Header theme toggle** — Deferred to unified theme refactor.
