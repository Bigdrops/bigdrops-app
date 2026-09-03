# Frontend Company Management — Implementation Report

This report was written by Buffy on 2026-09-01 via Freebuff.

---

## Objective

Complete the missing frontend multitenancy lifecycle: allow an authenticated user to create another company inside an existing workspace and switch between companies from the frontend.

## Scope

- Create company within current workspace (P0)
- Complete company switcher with "Create Company" action (P0)
- Sidebar company switcher integration (P0)
- Settings company management section (P0)
- Entity refresh after creation (P0)

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/CreateCompanySheet.tsx` | New — bottom sheet form for creating a company |
| `src/components/layout/CompanySelectionSheet.tsx` | Added "Create Company" button, always shows sheet |
| `src/components/layout/MobileSidebar.tsx` | Made CompanySwitcher always interactive, added "Create Company" button |
| `src/pages/settings/CompanyManageSection.tsx` | New — Settings section for company management |
| `src/pages/settings/settings-config.ts` | Added `company-manage` section to settings config |
| `src/pages/settings/index.ts` | Exported `CompanyManageSection` |
| `src/pages/Settings.tsx` | Wired `CompanyManageSection` into section renderer |

## Skills Used

NONE

## Documentation Standard

ADS-STE100 Simplified Technical English

## Existing Tenancy Architecture Discovered

| Component | Location | Purpose |
|-----------|----------|---------|
| `WorkspaceProvider` | `src/lib/tenant/contexts.tsx` | Workspace state, selection, resolution |
| `EntityProvider` | `src/lib/tenant/contexts.tsx` | Entity/company state, selection, schema resolution |
| `createEntity()` | `src/domain/tenant/tenantCreation.ts` | Inserts entity under active workspace via Supabase |
| `provisionEntity()` | `src/domain/tenant/tenantCreation.ts` | Kicks off schema provisioning via RPC |
| `CompanyCreation.tsx` | `src/pages/CompanyCreation.tsx` | Full-page onboarding flow for first company |
| `CompanySelectionSheet.tsx` | `src/components/layout/CompanySelectionSheet.tsx` | Bottom sheet for switching companies |
| `MobileSidebar.tsx` | `src/components/layout/MobileSidebar.tsx` | Drawer with CompanySwitcher |
| `BusinessSwitcher.tsx` | `src/components/layout/BusinessSwitcher.tsx` | Legacy — shows "Multi-business switching is not enabled" |
| `WorkspaceSwitcherRow.tsx` | `src/components/layout/WorkspaceSwitcherRow.tsx` | Settings workspace switch row |
| `WorkspaceSwitchSection.tsx` | `src/pages/settings/WorkspaceSwitchSection.tsx` | Settings workspace switch section |

## Changes Made

### 1. CreateCompanySheet (New Component)

Created `src/components/layout/CreateCompanySheet.tsx` — a bottom sheet form for creating a company within the current workspace.

- Uses existing `createEntity()` and `provisionEntity()` from `tenantCreation.ts`
- Resets form state on open
- Validates required fields (company name)
- Shows loading state during creation
- Prevents duplicate submissions
- Calls `refreshEntity()` after creation to update canonical state
- Shows success toast via `feedback.success()`
- Mobile-first: bottom sheet, 44×44px touch targets, safe areas
- Uses existing `Sheet` component from the shared overlay architecture

### 2. Sidebar Company Switcher

Modified `src/components/layout/MobileSidebar.tsx`:

- **CompanySwitcher always interactive**: Removed the `hasMultiple ? onOpenSheet : undefined` guard. The switcher now always opens the company sheet, even with a single company. This allows users to access "Create Company" without needing multiple companies first.
- **Chevron always visible**: The dropdown chevron now always shows, signaling the row is interactive.
- **"Create Company" button**: Added a `Plus` icon button at the bottom of the company list in the sidebar's `CompanySelectionSheet`. Tapping it closes the sidebar sheet and opens `CreateCompanySheet`.

### 3. Shared CompanySelectionSheet

Modified `src/components/layout/CompanySelectionSheet.tsx`:

- **Always shows**: Removed the `if (entities.length <= 1) return null` guard. The sheet now always renders, allowing access to "Create Company" even with a single company.
- **"Create Company" button**: Added a divider and "Create Company" row at the bottom of the company list. Tapping it closes the selection sheet and opens `CreateCompanySheet`.

### 4. Settings Company Management

Created `src/pages/settings/CompanyManageSection.tsx`:

- Shows current workspace context (name, company count)
- Lists all companies in the workspace with active indicator
- Allows switching company by tapping
- "Create Company" dashed-border button opens `CreateCompanySheet`
- Added to settings config as `company-manage` section in the Workspace group

### 5. Settings Integration

- Added `company-manage` to `ActiveSectionId` type in `settings-config.ts`
- Added "Company Management" section to the Workspace settings group
- Wired `CompanyManageSection` into `Settings.tsx` section renderer
- Exported from `settings/index.ts`

## Verification Result

- `bun run typecheck`: passed
- `git status`: scoped to intended files only
- `bun run build`: skipped per hardware policy

## Risks or Limitations

- **Provisioning delay**: After creating a company, `provisionEntity()` is called which may take time. The entity appears in the switcher immediately via `refreshEntity()`, but schema provisioning runs asynchronously. The existing `TenantGate` handles provisioning states.
- **Single-company UX**: With a single company, the company switcher now opens a sheet showing just that company + "Create Company". This is intentional — it provides access to creation without requiring multiple companies.
- **BusinessSwitcher.tsx**: The legacy `BusinessSwitcher.tsx` component still shows "Multi-business switching is not enabled". It is not used in the main navigation flows (sidebar uses its own `CompanySwitcher`). No changes were made to avoid breaking any remaining consumers.

## Deferred Work

- Workspace creation (P1) — backend support exists (`createWorkspace()` in `tenantCreation.ts`), frontend flow can be added next
- Company deletion/archive from frontend
- Company renaming from frontend
- Multi-member company management (invite, roles, permissions)

## Verification

- bun run typecheck: passed
- git status: clean scope — 7 modified/new files for this task
- bun run build: skipped due to hardware policy
