# Client Detail Implementation Specification

This report was written by Opencode on 2026-09-08 via Local Runner.

Status: Specification only. No source code changed.

Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Scope

Replace the 6-tab Client Detail page with a single prioritized scroll page.
Preserve every existing destination, data query, and route. Change only the
composition and rendering layer in `ClientDetail.tsx` and its child components.

## 2. Current → New Mapping

| Current element | Disposition | New location |
|---|---|---|
| `ClientActionHeader` (sticky back, title, edit, 5 pills) | Replace | `ClientIdentityBar` — sticky, name + status line + overflow |
| 6-tab bar (Overview, Projects, Invoices, Quotations, CSRs, Waybills) | Remove | Replaced by grouped sections |
| `ClientOverviewTab` | Decompose | Splits into 5 sections below |
| Identity block (name, category, contact person) | Move | Top of scroll, inside `ClientIdentityBar` |
| 4 metric cards (Total Invoiced, Collected, Outstanding, Activity Count) | Restructure | `MoneyPositionStrip` — 3 values, no Activity Count |
| `NeedsAttentionGroup` | Extract | Below money strip, conditional |
| Quick-create pills (Invoice, Quotation, CSR, Waybill, Project) | Restructure | `ClientQuickActions` — primary create + contact row |
| Recent Streams (mixed chronology) | Replace | `GroupedHistory` — per-type collapsible groups |
| Contact & Account aside card | Replace | `ContactDisclosure` — progressive disclosure section |
| `ClientDocumentsTab` (invoice, quotation, CSR, waybill lists) | Inline | First 3 rows per group in `GroupedHistory`, rest via drill-down |
| `ClientProjectsTab` | Inline | Project group in `GroupedHistory` |
| Delete/archive | None (deferred) | `ClientDangerZone` — needs product decision first |
| Activity Count metric | Remove | Not a decision input |
| "None listed" rows | Remove | Show only populated fields |
| Card-inside-card nesting | Remove | One surface per section |

## 3. Page Hierarchy

Top to bottom on a phone viewport:

1. **ClientIdentityBar** (sticky)
   - Back button, client name, status chip (balance or "Settled"), overflow menu
2. **MoneyPositionStrip**
   - Outstanding (primary, danger tone if > 0), Total Invoiced, Collected
   - All three values visible above the fold on 360px screens
3. **NeedsAttentionGroup** (conditional — hidden when empty)
   - Overdue invoices, unconverted quotations, idle drafts
   - Per-item row: document number, amount, action button
4. **ClientQuickActions**
   - Primary: context-aware create (New Invoice by default)
   - Contact row: call, mail, directions (one tap each)
5. **GroupedHistory**
   - Group: Money Documents (invoices, quotations)
     - First 3 rows, count badge, "See all" link to `/clients/:id/invoices`
   - Group: Service & Logistics (CSRs, waybills)
     - First 3 rows, count badge, "See all" link to `/clients/:id/csrs`
   - Group: Projects
     - First 3 rows, count badge, "See all" link to `/clients/:id/projects`
   - Each group collapsible. Empty groups collapse to a single row with create action.
6. **ContactDisclosure** (collapsed by default)
   - Populated fields only: contact person, phone, email, address
   - One tap to expand full address
7. **ClientDangerZone** (collapsed, confirmation-gated)
   - Delete or archive — needs product decision before implementation
   - If no decision: omit this section entirely

## 4. Section Specifications

### 4.1 ClientIdentityBar

**Sticky**: top:0, z:20, same as current `ClientActionHeader`.

**Contents**:
- Left: back arrow (min 44px target)
- Center: client name (truncate with ellipsis), status chip below
  - Status chip: "₦X outstanding" (danger tone) or "Settled" (success tone)
- Right: overflow menu (Pencil icon, opens bottom sheet with: Edit, View full history)

**Remove**: The 5 quick-create pills. They move to `ClientQuickActions`.

**Tokens**: Reuse `border-border bg-background` from current header. No new tokens.

### 4.2 MoneyPositionStrip

**Layout**: Horizontal row, 3 equal columns on phone. Below 480px: stack to vertical with outstanding first.

**Contents**:
- Column 1: "Outstanding" label (10px, uppercase, muted), value (18px, black, tabular-nums). Danger tone if > 0.
- Column 2: "Invoiced" label, value. Default tone.
- Column 3: "Collected" label, value. Success tone if collected > 0.

**Data source**: `invoices` array. Compute `summary` the same way the current `ClientOverviewTab` does (`calculateSummary` from `src/domain/clientWorkspace.ts`).

**Remove**: Activity Count card.

### 4.3 NeedsAttentionGroup

**Condition**: Render only when `overdue.length > 0` or unconverted quotations exist.

**Layout**: Vertical list inside a danger-toned container (reuse current `rounded-2xl border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))]` pattern).

**Contents**:
- Header: "Needs Attention (N)" with AlertCircle icon
- Per-item row: document number (mono, danger tone), amount, "View" button (min 44px target)
- Max 3 rows shown. "See all" link if > 3.

**Empty state**: Do not render. No placeholder gap.

### 4.4 ClientQuickActions

**Layout**: Single row with primary action prominent, contact actions as icon buttons.

**Contents**:
- Primary: "New Invoice" button (full width or dominant). Navigate to `/invoices/new` with `{ clientId, clientName }` prefill state.
- Contact row: 3 icon buttons — Phone (tel: link), Mail (mailto: link), Map (open address in maps). Each min 44px target.

**Tokens**: Reuse current pill button styles (`rounded-full border-border bg-muted/30`).

### 4.5 GroupedHistory

**Layout**: Vertical stack of collapsible groups. Each group:
- Header row: group label (10px, uppercase, muted), count badge, chevron toggle, "See all" link
- First 3 rows visible, expandable to show more
- Divider between groups (reuse `divide-y divide-bd-border/50`)

**Groups**:

| Group | Types | Count source | Drill-down route |
|---|---|---|---|
| Money Documents | invoices, quotations | `invoices.length + quotations.length` | `/clients/:id/invoices` |
| Service & Logistics | csrs, waybills | `csrs.length + waybills.length` | `/clients/:id/csrs` |
| Projects | projects | `projects.length` | `/clients/:id/projects` |

**Row renderer**: Reuse `ClientDocumentsTab` row markup. Each row: icon (type-colored), number, date, status badge, amount (if applicable), chevron (min 44px target).

**Empty state**: Compact single row: "No [type] yet" + create button. No illustration card.

**Collapse behavior**: Groups collapsed by default. Tap header to expand. Expanded state persists in component state (not URL). Reduced motion: instant toggle, no animation.

**Note**: Drill-down routes (`/clients/:id/invoices`, etc.) do not exist yet. The "See all" link should navigate to the existing per-type tab content. Options:
  - (a) Create these routes as thin wrappers around existing `ClientDocumentsTab`, or
  - (b) Navigate to the document module list with client filter pre-applied.

Recommendation: (a) — minimal new routes, reuse existing components.

### 4.6 ContactDisclosure

**Layout**: Collapsed by default. Tap to expand.

**Collapsed state**: Single row: "Contact & account" label + chevron.

**Expanded state**: List of populated fields only:
- Contact Person (if set)
- Phone (if set, with tap-to-call)
- Email (if set, with tap-to-mail)
- Address (if set, with tap-to-open-in-maps)

**Remove**: "None listed" placeholder rows. If a field is empty, omit the row.

**Tokens**: Reuse `rounded-2xl border border-bd-border bg-bd-surface p-5 shadow-sm` from current aside card.

### 4.7 ClientDangerZone

**Status**: Deferred. Requires product decision on:
- Delete semantics (soft delete? archive?)
- Permission model (who can delete?)
- Data integrity rules (what happens to linked documents?)
- Confirmation flow text

**Implementation**: If deferred section is omitted, do not render anything. If implemented later:
- Collapsed by default
- Confirmation dialog (bottom sheet on mobile, modal on desktop)
- Focus trapped in dialog
- Canonical destructive treatment (danger tokens)

## 5. Responsive Composition

### 5.1 Phone (< 480px)

Single column. Order per Section 3. Money strip stacks vertically (outstanding first). All sections full width.

### 5.2 Tablet (480px–768px)

Two columns for GroupedHistory: Money Documents left, Service & Logistics right. Money strip remains horizontal. Contact disclosure full width below.

### 5.3 Desktop (> 768px)

Same as tablet but max-width constrained (`max-w-5xl`). Sticky identity bar spans full width. Money strip horizontal. History groups in 2-column grid. Contact disclosure full width.

### 5.4 Foldable

Folded: phone layout. Unfolded: tablet layout.

## 6. Navigation / Destination Map

| Current destination | Status | Route |
|---|---|---|
| Client list | Keep | `/clients` |
| Client edit | Keep | `/clients/edit/:id` |
| New Invoice (prefilled) | Keep | `/invoices/new` (state: clientId, clientName) |
| New Quotation (prefilled) | Keep | `/quotations/new` (state) |
| New CSR (prefilled) | Keep | `/csr/new` (state) |
| New Waybill (prefilled) | Keep | `/waybills/new` (state) |
| New Project (prefilled) | Keep | `/projects/new` (state) |
| Invoice detail | Keep | `/invoices/:id` |
| Quotation detail | Keep | `/quotations/:id` |
| CSR detail | Keep | `/csr/:id` |
| Waybill detail | Keep | `/waybills/:id` |
| Project detail | Keep | `/projects/:id` |
| Client invoices list | New | `/clients/:id/invoices` |
| Client CSRs list | New | `/clients/:id/csrs` |
| Client projects list | New | `/clients/:id/projects` |

## 7. Data Loading

No changes to data loading logic. `ClientDetail.tsx` keeps all current queries and state management. The `loadOverview` callback fetches the same data. Tab-specific lazy loaders (`loadProjects`, `loadQuotations`, `loadCsrs`, `loadWaybills`) remain and are called when groups expand or drill-down routes mount.

**Change**: Remove `padActivityCount` and `mergeActivity` usage for the mixed stream. Replace with per-type arrays passed directly to `GroupedHistory`.

**Change**: Remove `loaded`, `loading`, `error` state for individual tabs from the page-level composition. Groups handle their own loading/error inline.

## 8. Loading States

| Section | Loading state |
|---|---|
| Identity bar | Skeleton: name line (120px), status chip (80px) |
| Money strip | Skeleton: 3 value blocks |
| Needs Attention | Skeleton: 1 row |
| Quick actions | Skeleton: 1 button row |
| GroupedHistory | Skeleton: 3 rows per group |
| Contact disclosure | Skeleton: 2 field rows |

Skeletons use existing `SkeletonCard`, `SkeletonRow` from `src/components/loading/AppLoadingStates.tsx`.

## 9. Error States

| Section | Error state |
|---|---|
| Page-level (client not found) | Keep current: danger box with error message |
| Section-level (group fails) | Inline retry inside the group. Rest of page usable. |
| Network error | Existing `feedback.error` toast |

## 10. Accessibility

- 44px minimum on all interactive targets (buttons, rows, disclosures, overflow).
- Focus order follows visual order: identity → money → attention → actions → history → contact → danger.
- Disclosures use native `<button>` semantics with `aria-expanded`.
- Money values: plain text, no ARIA live region (values do not change after load).
- Reduced motion: all collapses instant, no animated counters.
- Screen readers: group headings as section landmarks, status announced once per group.
- Destructive confirmation: focus trapped in dialog, escape closes, cancel returns focus to trigger.

## 11. Tokens and Visual Treatment

- Reuse existing Divine Blood tokens only. No new palette.
- One surface per section (`bg-bd-surface`). Muted surface for grouping headers (`bg-bd-surface-muted/40`).
- Value-first numerals with tabular figures (`tabular-nums`). Labels muted and small (10px, uppercase, tracking-wider).
- Status meaning from existing status tokens (`bd-status-danger-*`, `bd-status-success-*`, etc.).
- No card-inside-card nesting.
- No new design tokens.

## 12. Deferred Decisions

| Item | Reason | Resolution needed |
|---|---|---|
| Delete/archive client | No existing capability | Product decision: semantics, permissions, data rules |
| Drill-down route structure | New routes needed | Implement thin wrappers around existing components |
| Default primary action | "New Invoice" assumed | Confirm with product |

## 13. Acceptance Criteria

1. No tab bar on Client Detail page.
2. All current destinations reachable via drill-down or preserved routes.
3. Outstanding balance and overdue items visible without scrolling past history on 360px viewport.
4. No record appears in two places on the same screen.
5. Empty groups collapse without placeholder gaps.
6. Contact actions reachable within two taps from page top.
7. 44px minimum on all interactive targets.
8. Data, queries, permissions unchanged. Only composition changes.
9. Typecheck passes on implementation.

## 14. Implementation Sequence

1. Create 3 thin drill-down routes (`/clients/:id/invoices`, `/clients/:id/csrs`, `/clients/:id/projects`) wrapping existing `ClientDocumentsTab` / `ClientProjectsTab`.
2. Build `ClientIdentityBar` replacing `ClientActionHeader`.
3. Build `MoneyPositionStrip` extracting summary logic from `ClientOverviewTab`.
4. Build `NeedsAttentionGroup` extracting overdue logic from `ClientOverviewTab`.
5. Build `ClientQuickActions` reordering pills into primary + contact row.
6. Build `GroupedHistory` reusing row renderers from `ClientDocumentsTab` and `ClientProjectsTab`.
7. Build `ContactDisclosure` extracting from `ClientOverviewTab` aside.
8. Compose all sections in `ClientDetailPage`, removing tab composition.
9. Verify: empty states, loading skeletons, error states, responsive breakpoints.
10. Remove dead code: `ClientOverviewTab`, `padActivityCount`, `mergeActivity` (if no other callers), tab state, tab loading/error state.
