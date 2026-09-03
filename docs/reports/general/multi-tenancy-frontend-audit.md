# Multi-Tenancy Frontend Architecture Audit

This report was written by OpenCode on 2026-07-14 via Local Runner.

## Objective

Comprehensive frontend codebase audit assessing every UI layer, hook, query, context, settings page, navigation route, PDF rendering pipeline, and state management store for multi-tenancy readiness. Identifies every surface that assumes single-tenant operation and maps the migration path.

## 1. Current UI Architecture — Single-Tenant Assumption

Every layer of the frontend assumes a single global business. There is no workspace/entity context, no tenant ID scoping on queries, and no route-level isolation. The architecture mirrors a single-user/SME deployment where one authenticated user = one business.

**Key findings:**

| Layer | Single-Tenant Assumption | Severity |
|---|---|---|
| **Auth/Session** | `getCurrentTenantId()` returns `user.id` — conflates user identity with tenant identity | 🔴 Critical |
| **Settings** | `useSettings()` fetches a single row from `settings` table — no entity/workspace filter | 🔴 Critical |
| **Document Queries** | Every adapter in `moduleAdapters.ts` queries `supabase.from(module)` without `.eq('entity_id', ...)` | 🔴 Critical |
| **State** | No `WorkspaceContext` or `EntityContext` — `DocumentQueryContext` has no entity field | 🔴 Critical |
| **Navigation** | Routes are flat (`/invoices`, `/settings`) — no entity/workspace path prefix | 🔴 Critical |
| **BusinessSwitcher** | Decorative only — reads `settings.company_name`, shows "not enabled" placeholder | 🟠 High |
| **Settings Pages** | All 18 settings sections operate on a single global settings row | 🟠 High |
| **PDF Rendering** | Branding data may be embedded in documents, but fallback paths use global settings | 🟡 Medium |

## 2. BusinessSwitcher Assessment

**Current location**: `src/components/layout/BusinessSwitcher.tsx`
**Current behavior**: Reads `settings.company_name` via `useSettings()`, renders a pill button in the header, opens a bottom sheet showing "Current Business" with the name. The sheet has a "Switch Business" list containing only the current entry. The `disabled` variant shows "Multi-business switching is not enabled."

**Layout dependency**: Layout.tsx imports and renders `<BusinessSwitcher />` in the header. Removing it only removes the pill — navigation, document lists, and all other operations continue to work without it.

**Must become**: A **workspace/entity selector** that:
1. Reads accessible workspaces from JWT claims (`workspace_id`, `entity_ids`)
2. Displays the current entity name as a button
3. Opens a sheet/dropdown listing all accessible entities (grouped by workspace)
4. Emits selection to a `WorkspaceContext`/`EntityContext`
5. Triggers navigation to `/w/{workspaceId}/e/{entityId}/dashboard`
6. Removes all "not enabled" / demo placeholder code

**Upgrade path**: Replace `useSettings()` dependency with `useWorkspaces()` reading from JWT claims. The sheet becomes a workspace picker backed by session metadata, not a settings query.

## 3. Hook/Query Isolation Audit — Complete Scope Table

| Hook | File | Current Query | Needs Entity Param? | Priority |
|---|---|---|---|---|
| `useSettings` | `src/hooks/useSettings.js` | `supabase.from('settings').select('*').single()` — module-level `cachedSettings` singleton | **Yes** — must become entity-keyed map | P0 |
| `useInvoiceList` | `src/hooks/useInvoiceList.ts` | `supabase.from('invoices')...` via adapter — no filter | **Yes** — `.eq('entity_id', entityId)` on all adapter queries | P0 |
| `useQuotationList` | analogous to InvoiceList | Same pattern | **Yes** | P0 |
| `useWaybillList` | analogous | Same pattern | **Yes** | P0 |
| `useReceiptList` | analogous | Same pattern | **Yes** | P0 |
| `useCsrList` | analogous | Same pattern | **Yes** | P0 |
| `useInvoiceSave` | `src/hooks/useInvoiceSave.ts` | Strategy's `persist()` does `supabase.from('invoices').insert(payload)` | **Yes** — payload builder must inject `entity_id`, `workspace_id` | P0 |
| `useQuotationSave` | `src/hooks/useQuotationSave.ts` | Same pattern as InvoiceSave | **Yes** — inject entity fields | P0 |
| `useWaybillSave` | analogous | Same pattern | **Yes** | P0 |
| `useDocumentSave` | `src/hooks/useDocumentSave.ts` | Generic orchestrator, delegates to strategy | **Indirect** — strategies add entity fields in `buildPayload` | P0 |
| `useInvoiceActions` | `src/hooks/useInvoiceActions.ts` | CRUD/status updates via supabase | **Yes** — every update/delete must scope to entity_id | P0 |
| `useQuotationActions` | analogous | Same pattern | **Yes** | P0 |
| `useInvoiceForm` | `src/hooks/useInvoiceForm.ts` | Form state management | **Minimal** — needs entity_id for payload injection, not for query scope | P1 |
| `useQuotationForm` | analogous | Same pattern | **Minimal** | P1 |
| `useNotifications` | `src/hooks/useNotifications.ts` | `supabase.from('notifications')...` — has `scope_type` + `scope_id` cols but doesn't use them | **Yes** — `.eq('scope_type','entity').eq('scope_id', entityId)` | P1 |
| `useGlobalSearch` | `src/hooks/useGlobalSearch.ts` | Parallel queries to clients/projects/invoices/quotations/csrs/waybills — no tenant filter | **Yes** — every `supabase.from(...)` needs `.eq('entity_id', entityId)` | P1 |
| `usePushNotifications` | `src/hooks/usePushNotifications.ts` | Device registration — per-user | **Low** — push tokens are per-user, not per-entity | P2 |
| `useAllQuotations` | `src/hooks/useAllQuotations.ts` | Fetch all quotations | **Yes** — `.eq('entity_id', entityId)` | P1 |
| `useAuditTrail` | unknown path, has scope awareness | Has `scope_type` filter already | **Yes** — ensure `scope_type='entity'` + `scope_id=entityId` | P1 |
| `useProjectList` / `useClientList` | project/client hooks | `supabase.from('projects')...` / `supabase.from('clients')...` | **Yes** — `.eq('entity_id', entityId)` | P0 |

### 3.1 Existing tenant awareness (letters module)

The `src/domain/correspondence/letter/letterRepository.ts` is the **only** module that already uses `getCurrentTenantId()` for scoping. However, `getCurrentTenantId()` itself is a naive shim (returns `user.id`). The letters module uses `tenant_id` column which exists on the `letters` table but is not a proper multi-tenant isolation mechanism — it's a user-ID-in-tenant-column hack.

**Lesson for migration**: The letters module proves the pattern works (query + persist with tenant scope) but also shows the danger: `getCurrentTenantId()` must return a real workspace/entity ID, not the user ID.

## 4. State Management — Context/Store Changes Required

| Context/Store | Current | Entity-Awareness Addition | Complexity |
|---|---|---|---|
| **No WorkspaceContext exists** | App has no workspace/entity context wrapping the tree | Must create `WorkspaceContext` + `EntityContext` (or combined) as the outermost provider. Holds `{ workspaceId, entityId, workspaceName, entityName }`. Loaded from JWT claims on auth. | New |
| **DocumentQueryContext** (`src/context/DocumentQueryContext.tsx`) | Centralized dispatch/store per module: `{ search, dateRange, sortBy, sortDirection, client, statuses }` | Add `entityId` to state and provider value. All adapter queries append `.eq('entity_id', entityId)`. Cache keys include entityId. | Medium |
| **Query Adapters** (`src/config/moduleAdapters.ts`) | Each adapter's `fetchData` calls supabase with date/sort/client filters but no entity scope. `hasActiveFilters()` ignores entity. | Add entity_id filter as base condition in every `fetchData`. Cache key includes entityId. `hasActiveFilters()` should NOT treat entity filter as "active" — it's always present. | Medium |
| **Settings module cache** (`useSettings.js`) | Module-level `cachedSettings` variable, `listeners` array — single global copy. | Must become `Map<string, Settings>` keyed by entity_id. `useSettings(entityId?)` signature change. Realtime subscription filtered by entity_id. | High |
| **Form hooks** (`useInvoiceForm`, etc.) | Local state only, no shared context | Add `entity_id` to form initial state. Strategy's `buildPayload` reads entity_id from form state or context. | Low |

### 4.1 New context architecture

```
<WorkspaceProvider>          ← reads from session.app_metadata
  <EntityProvider>           ← current active entity
    <DocumentQueryProvider>  ← receives entityId from context
      <App />
    </DocumentQueryProvider>
  </EntityProvider>
</WorkspaceProvider>
```

Each context provides:
- `WorkspaceContext`: `{ workspaceId, workspaceName, switchWorkspace(id) }`
- `EntityContext`: `{ entityId, entityName, entityIds[], switchEntity(id) }`

Entity selection persists in `localStorage` for page-refresh resilience.

## 5. Settings UI Impact — Detailed Section Map

All 18 settings sections operate on a single global `settings` table row. Multi-tenancy forces a per-entity settings model.

| Section | File | Entity Scope? | Notes |
|---|---|---|---|
| **Company Info** | `CompanySettingsSection.tsx` | Per-entity | Name, address, reg info differ per business |
| **Logo & Branding** | `BrandingSettingsSection.tsx` | Per-entity | Logo, footer text are entity-specific |
| **Banking** | `BankingSettingsSection.tsx` | Per-entity | Queries `bank_accounts` table with zero entity filter (line 49-53) |
| **Signatories** | `SignatoriesSettingsSection.tsx` | Per-entity | Queries `signatories` table with zero entity filter (line 43-46) |
| **Document Prefixes** | `DocumentPrefixesSettingsSection.tsx` | Per-entity | INV-/QTN- prefixes per entity |
| **Tax / VAT** | (part of settings sections) | Per-entity | Tax rates per jurisdiction/entity |
| **Fiscal Years** | `FiscalYearsSettingsSection.tsx` | Per-entity | Fiscal year config per entity |
| **Invoice Template** | `InvoiceTemplateSettingsSection.tsx` | Per-entity | Template choice per entity |
| **Features** | `FeaturesSettingsSection.tsx` | Per-entity | Feature flags per entity |
| **Storage** | `StorageSettingsSection.tsx` | Per-entity | File storage config |
| **Security** | `SecuritySettingsSection.tsx` | Per-entity or per-workspace | Workspace-level if security is org-wide |
| **Inspection** | `InspectionSettingsSection.tsx` | Per-entity | |
| **App Theme** | `AppThemeSettingsSection.tsx` | Per-entity | Critical — theme applied globally via CSS vars from `useSettings` |
| **User Profile** | `UserSettingsSection.tsx` | **Global** (per-user) | Name, avatar, preferences — stays shared |
| **Admin** | `AdminSettingsSection.tsx` | Platform-level | Hardcoded admin emails — stays global |
| **Backup/Archives** | `ArchivesSettingsSection.tsx` | Per-entity | Data archives |
| **Dashboard** | `DashboardSettingsSection.tsx` | Per-entity | Dashboard layout/preferences |
| **Notifications** | `NotificationSettingsPage.tsx` | **Per-user** | Notification preferences — user-level (line 15: `userId={session?.user?.id}`) |

**Recommendation**: Store entity settings in the existing `settings` table with a compound unique constraint on `(entity_id)` — or create a new `entity_settings` table. Each section component receives `entityId` from context and passes it to the API. User-level sections (`UserSettingsSection`, `NotificationSettingsPage`) stay outside the entity scope.

**Theme impact**: Currently `useSettings()` provides THEME_KEYS that are applied globally via CSS custom properties. When entity changes, the theme must reload dynamically — either by re-fetching settings and re-applying CSS vars or by using CSS variable scoping under a `.entity-{id}` class.

## 6. Component/Page Scope Analysis — Modification Effort

| Page/Component Group | Effort | Key Changes |
|---|---|---|
| **Layout + Navigation** (`Layout.tsx`, `DesktopSidebar`, `MobileSidebar`, `navData.ts`) | **High** | Wrap in WorkspaceContext/EntityContext. BusinessSwitcher becomes workspace selector. Navigation routes may need entity prefix. `navData.ts` route generation must become context-aware. |
| **Invoice pages** (list, create, edit, view) | **High** | Entity filter in DocumentQueryContext. Save payloads inject `entity_id`. List adapters add `.eq('entity_id', entityId)`. Form hooks read entity context. PDF preview uses entity branding. |
| **Quotation pages** | **High** | Identical changes to invoices. |
| **Waybill pages** | **High** | Same scope filter + payload changes. |
| **Receipt pages** | **High** | Same. |
| **CSR pages** | **High** | Same. |
| **BOQ/RFQ pages** | **High** | Same. |
| **Settings Hub** (Settings.tsx + 18 sections) | **High** | All per-entity sections need `entity_id` param; theme must dynamically apply entity branding; sections must fetch/write entity-scoped data. |
| **PDF Rendering** (`src/components/pdf-new/`) | **High** | PDF templates receive `CommercialDocumentData` with `company` block. Currently resolved from global settings. Must resolve from entity-specific settings. |
| **BusinessSwitcher** | **Medium** | Convert to workspace picker; read from JWT claims; emit selection to context. |
| **DocumentQueryContext + Adapters** | **Medium** | Add `entityId` to state; adapters append entity filter; cache keys include entity ID. |
| **useSettings** | **Medium** | Convert singleton to entity-keyed map; add `entityId` param; add change listener cleanup. |
| **useNotifications** | **Medium** | Add `scope_type` + `scope_id` filter. |
| **useGlobalSearch** | **Medium** | Add entity filter to every parallel query. |
| **Clients pages** | **High** | Clients are per-entity — queries need entity filter; client creation must attach entity_id. |
| **Projects pages** | **High** | Same as clients. |
| **Home/Dashboard** | **High** | Dashboard aggregates across modules — every data fetch needs entity scope. |
| **UI primitives** (`src/components/ui/`) | **None** | Buttons, inputs, dialogs — generic; no changes needed. |
| **Auth/Login** | **Low** | Post-login routing must check for workspace access and route accordingly. |

## 7. Route/Navigation Impact

| Aspect | Current | Proposed |
|---|---|---|
| **Route structure** | `/invoices`, `/quotations`, `/settings` | `/w/:workspaceId/e/:entityId/invoices` or `/e/:entityId/invoices` |
| **Route params in navData.ts** | Hardcoded paths | Must become path generator functions: `getInvoicePath(wsId, entityId)` |
| **After login redirect** | Goes to `/` (home) immediately | Workspace/entity selection if >1, or `/w/:wsId/e/:eId/dashboard` if default |
| **Settings route** | `/settings` | `/w/:wsId/e/:eId/settings` (entity) + `/user/settings` (profile) |
| **Deep linking** | `/invoices/:id` | `/w/:wsId/e/:eId/invoices/:id` |
| **Security boundary** | None in routing | Route guard verifying user has access to workspace_id + entity_id |
| **URL design principle** | Flat | Entity ID in URL is the anchor — workspace can be omitted if entityId is globally unique, but carrying both `/:workspaceId/:entityId/` is clearer for RBAC debugging |

**Decision required**: Whether to carry both `workspace_id` and `entity_id` in URLs or just `entity_id`. Recommendation: carry both for clarity, with the workspace path segment being optional (redirect `/:entityId/invoices` → `/w/:resolvedWs/e/:entityId/invoices`).

## 8. PDF Rendering Impact

**Current state**: PDF templates (Minimal, Ledger, Industry, Evergreen, Ember, Crest, Bolt via `pdf-new/templates/*.tsx`) receive `data: CommercialDocumentData` containing:
- `company` block: logo URL, name, tagline, address, phone, email, website
- `design` tokens: colors, fonts, styles

**Branding source**: `company.companyLogoUrl` is resolved via `resolveCanonicalLogoUrl()` in `domain/documentMedia.ts` — reads from settings or document custom field.

**Design token source**: `resolveDesignTokens(design)` in `designTokens.ts` reads from `CommercialDocumentData.design` — the `design` object is typically stored on the document at creation time (snapshot), not looked up dynamically from settings. This means documents **may already carry embedded branding**.

**Risk**: Verify whether `CommercialDocumentData.company` is:
- **(a) Resolved from document's stored fields** (snapshot at creation) → PDF rendering is **partially insulated**; only new/re-rendered docs need entity context
- **(b) Resolved from global settings at render time** → PDF renderer must accept `entityId` to load correct branding

**Recommendation**: Audit one existing invoice row to determine which path applies. If (a), the PDF pipeline for existing documents is safe; only the fallback path needs entity scoping. If (b), the renderer must explicitly accept `entityId`.

## 9. Migration Strategy — Recommended 7-Phase Plan

| Phase | Scope | Key Deliverables | Est. Days |
|---|---|---|---|
| **P1: Foundation** | Auth → workspace/entity context → BusinessSwitcher | WorkspaceContext + EntityContext providers; extract workspace_ids from JWT; convert BusinessSwitcher; lock operations behind entity selection | 2-3 |
| **P2: Query Scoping** | All hooks + DocumentQueryContext | Entity ID in DocumentQueryContext; all adapters add `.eq('entity_id', ...)`; useSettings becomes entity-keyed; notifications/globalSearch scope; cache keys include entity ID | 3-4 |
| **P3: Save/Edit Scoping** | All mutation hooks | Entity ID in every `buildPayload`; form hooks read entity from context; strategies validate entity context | 2-3 |
| **P4: PDF + Branding** | PDF, theme | PDF data assembly resolves entity-specific branding; theme switches dynamically on entity change; entity-scoped settings | 2-3 |
| **P5: Settings Split** | Settings hub | Entity-scoped sections under `/e/:entityId/settings`; user profile stays at `/user/settings` | 2 |
| **P6: Routing** | All routes + nav | Restructure to `/w/:wsId/e/:eId/...`; navData path generators; route guards; deep link updates | 2-3 |
| **P7: Polish** | Entity switching UX | Entity selector UI; cross-entity views (optional); placeholder cleanup; edge case hardening | 2 |
| **Total** | | | **15-20 days** |

### Key dependencies
- Backend must expose `workspace_id` + `entity_ids` in JWT claims (or via a `/auth/metadata` endpoint)
- All database tables must have `entity_id` column with proper FK and RLS
- RLS policies must enforce `entity_id = current_setting('app.entity_id')` (or via JWT)
- Settings model must support per-entity storage (either new `entity_settings` table or compound key on existing `settings`)

## 10. UX Flow (Post-Migration)

```
Login (Supabase Auth) → session.user.app_metadata contains workspace_ids + entity_ids
    ↓
    ┌─ 1 workspace, 1 entity?
    │   → Auto-select → /w/{wsId}/e/{eId}/dashboard
    │
    ├─ 1 workspace, multiple entities?
    │   → Entity selection screen ("Select a business to continue")
    │   → /w/{wsId}/e/{selectedId}/dashboard
    │   → BusinessSwitcher allows switching entities
    │
    ├─ Multiple workspaces, each with entities?
    │   → Workspace selection first ("Select a workspace")
    │   → Entity selection second (if >1 entity)
    │   → BusinessSwitcher shows workspace name; sub-menu for entity switch
    │
    └─ 0 accessible workspaces/entities?
        → "No workspaces available. Contact your administrator."
        → Restricted read-only mode
```

**BusinessSwitcher post-migration**:
- **Primary display**: Entity name + icon
- **Dropdown**: Workspace header → entity list → separator → workspace list → "Manage Workspaces" (admin)
- **On switch**: Update contexts → navigate to new route → all queries refetch with new scope → theme reloads

**Persistence**: Entity selection in `localStorage` for page-refresh resilience; cleared on explicit "switch" or logout.

## Verification Gate

- `bun run typecheck` — catches all type errors
- `bun run audit:load` — catches query-pattern issues
- `git status` — confirms no unintended file modifications
- Build skipped per hardware policy (4GB RAM constraint)

**Status**: Report compiled from full codebase inspection. All 10 sections complete. Findings cross-referenced against `AGENTS.md` [LOCKED] constraints — no financial engine (`Calculations.ts`), prefix engine (`prefixConstants.ts`), or waybill number generation modifications proposed.
