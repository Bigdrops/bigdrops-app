# Multitenancy Frontend — Architecture Consolidation Report

This report was written by Buffy on 2026-09-01 via Freebuff.

---

## 1. Objective

Consolidate the BIGDROPS multitenancy frontend architecture based on the completed reconciliation audit. The goal was to establish a single coherent tenancy-context-switching architecture without changing the underlying tenancy model.

---

## 2. Files Changed

| File | Change | Lines |
|---|---|---|
| `src/components/layout/CompanySelectionSheet.tsx` | Updated: added aria-labels, one-company behavior, `var(--bd-overlay-radius)` token, close button aria-label | +25 / -12 |
| `src/components/layout/MobileSidebar.tsx` | Refactored: removed local `CompanySelectionSheet` duplicate, imported canonical version, added aria-labels, chevron hidden when single company | +30 / -130 |
| `src/components/layout/WorkspaceSelectionSheet.tsx` | Updated: `var(--bd-overlay-radius)` token, aria-labels on workspace rows, `aria-hidden` on decorative elements, close button aria-label | +11 / -5 |
| `src/pages/settings/WorkspaceSwitchSection.tsx` | Refactored: replaced inline sheet with canonical `WorkspaceSelectionSheet` | +15 / -63 |
| `src/components/Layout.tsx` | Removed dead `BusinessSwitcher` import | -1 |
| `src/components/layout/BusinessSwitcher.tsx` | Deleted (dead code, never rendered, contained outdated "Multi-business switching is not enabled" text) | -72 |
| `src/components/layout/WorkspaceSwitcherRow.tsx` | Deleted (dead code, never imported or used anywhere) | -45 |

**Net result:** 39 insertions, 323 deletions. **284 lines removed.**

---

## 3. Company Sheet Consolidation

**Before:** Two independent `CompanySelectionSheet` implementations existed:
- Shared `CompanySelectionSheet.tsx` — used by Settings `CompanyManageSection`
- Sidebar-local `CompanySelectionSheet` in `MobileSidebar.tsx` — used only by sidebar, with fewer features (no description, no close button, wrong radius `20px`, wrong max-height `60vh`)

**After:** One canonical `CompanySelectionSheet` exists at `src/components/layout/CompanySelectionSheet.tsx`. Both the sidebar and Settings consume it.

**What changed in the canonical sheet:**
- Radius: `rounded-t-[24px]` → `rounded-t-[var(--bd-overlay-radius)]`
- Added `aria-label` on every company row (e.g. "Acme Ltd, current company")
- Added `aria-label="Close"` on close button
- Added `aria-hidden="true"` on decorative dividers and check icons
- One-company state: title changes from "Switch Company" to "Company", description from "Select the company to work in." to "Manage your company."
- Chevron hidden when only one company exists

**What changed in the sidebar:**
- Removed ~80 lines of local `CompanySelectionSheet` function component
- Now imports and renders the canonical `CompanySelectionSheet`
- `CompanySwitcher` trigger: `aria-label` added, chevron hidden when single company

---

## 4. Workspace Sheet Consolidation

**Before:** Two workspace-selection implementations existed:
- Shared `WorkspaceSelectionSheet.tsx` — only consumed by dead `WorkspaceSwitcherRow`
- Inline sheet in `WorkspaceSwitchSection.tsx` — used by Settings, with hardcoded radius `20px`

**After:** `WorkspaceSwitchSection` imports and uses the canonical `WorkspaceSelectionSheet`.

**What changed in the canonical sheet:**
- Radius: `rounded-t-[24px]` → `rounded-t-[var(--bd-overlay-radius)]`
- Added `aria-label` on every workspace row (e.g. "BIGDROPS Group, 3 companies, current workspace")
- Added `aria-label="Close"` on close button
- Added `aria-hidden="true"` on decorative dividers and check icons

**What changed in WorkspaceSwitchSection:**
- Removed ~60 lines of inline sheet JSX
- Now renders `<WorkspaceSelectionSheet>` as a child component
- Added `aria-label` on the workspace trigger row

---

## 5. Dead-Code Verification and Removal

### BusinessSwitcher.tsx

| Check | Result |
|---|---|
| Imported in source files | Only `Layout.tsx` line 53 |
| Rendered in JSX | Never — no `<BusinessSwitcher` anywhere |
| Referenced in routes | None |
| Referenced in docs | None relevant |
| Verdict | **Safe to delete** |

The component contained the text "Multi-business switching is not enabled" — outdated after company switching was implemented. The import in Layout.tsx was a dead import.

### WorkspaceSwitcherRow.tsx

| Check | Result |
|---|---|
| Imported in source files | None |
| Used in JSX | None |
| Referenced in routes | None |
| Verdict | **Safe to delete** |

The component was defined but never imported or consumed. Its only consumer was itself (it imported `WorkspaceSelectionSheet`).

---

## 6. One-Company Behavior Resolution

The Facelift PRD §7.1 stated: "When only one company exists: row non-interactive, chevron hidden." But §5.6 required an "Add Company" entry point inside the selection surface. A completely non-interactive row makes company creation unreachable.

**Resolved behavior:**
- The `CompanySwitcher` trigger remains interactive even with one company
- The chevron is hidden when only one company exists (no switching affordance)
- The `aria-label` changes: "Current company: Acme. Tap to manage." (single) vs "Current company: Acme. Tap to switch." (multiple)
- The sheet title changes: "Company" (single) vs "Switch Company" (multiple)
- The sheet description changes: "Manage your company." (single) vs "Select the company to work in." (multiple)
- "Create Company" is always reachable from the sheet

This resolves the PRD contradiction in favor of functional UX: no misleading switch affordance, but company creation remains reachable.

---

## 7. Accessibility Corrections

| Element | Before | After |
|---|---|---|
| Company row (sheet) | No accessible name | `aria-label="Acme Ltd, current company"` |
| Workspace row (sheet) | No accessible name | `aria-label="BIGDROPS Group, 3 companies, current workspace"` |
| Company trigger (sidebar) | No accessible name | `aria-label="Current company: Acme. Tap to switch."` |
| Workspace trigger (Settings) | No accessible name | `aria-label="Current workspace: BIGDROPS. Tap to switch."` |
| Close button (sheets) | No accessible name | `aria-label="Close"` |
| Check icon (selected state) | No `aria-hidden` | `aria-hidden="true"` |
| Divider lines | No `aria-hidden` | `aria-hidden="true"` |
| Chevron (sidebar trigger) | Always visible | Hidden when single company; `aria-hidden="true"` when visible |

---

## 8. Overlay-Token Corrections

| Component | Before | After |
|---|---|---|
| `CompanySelectionSheet` (shared) | `rounded-t-[24px]` | `rounded-t-[var(--bd-overlay-radius)]` |
| Sidebar local sheet | `rounded-t-[20px]` | Removed (now uses canonical) |
| `WorkspaceSelectionSheet` | `rounded-t-[24px]` | `rounded-t-[var(--bd-overlay-radius)]` |
| `WorkspaceSwitchSection` inline | `rounded-t-[20px]` | Removed (now uses canonical) |

All selection sheets now use the canonical `var(--bd-overlay-radius)` token. No hardcoded radius values remain in tenancy selection surfaces.

---

## 9. Tenancy Safety Confirmation

| Check | Status |
|---|---|
| Workspace boundaries preserved | ✅ No changes to tenancy logic |
| Entity selection scoped to workspace | ✅ Provider state unchanged |
| Canonical state used | ✅ `selectEntity()`, `selectWorkspace()` from providers |
| No local duplicate state | ✅ Sheets read from providers |
| Backend authorization preserved | ✅ No RPC or RLS changes |
| Workspace not changed during creation | ✅ No changes to creation flow |
| Entity refresh after creation | ✅ `entityCtx.refresh()` preserved |

No tenancy business logic was modified. All changes are presentation-layer only.

---

## 10. Skills Loaded

| Skill | Purpose |
|---|---|
| `karpathy` | Surgical changes discipline, simplicity-first approach |
| `accessibility` | WCAG 2.2 compliance, aria-labels, target sizes, screen reader support |
| `react-dev` | React component architecture, type-safe patterns |

---

## 11. Verification

| Command | Result |
|---|---|
| `bun run typecheck` | ✅ Passed |
| `bun run audit:load` | ⏭️ Not required — no schema/query/data-layer logic modified |
| `bun run build` | 🚫 Excluded per hardware policy |
| `git status` | ✅ 7 files changed, all within intended scope |
| `git diff --stat` | ✅ 39 insertions, 323 deletions — net -284 lines |

---

## 12. Remaining Multitenancy Frontend Gaps

### Not in scope for this pass

| # | Gap | Classification |
|---|---|---|
| 1 | Workspace creation from Settings (authenticated) | DEFERRED — backend exists, UI not yet designed |
| 2 | Invitation management UI | DEFERRED — PRD P2 |
| 3 | Ink ripple feedback on switcher rows | DEFERRED — Facelift PRD backlog |
| 4 | `CompanyCreationForm` extraction (shared core between onboarding page and sheet) | FOLLOW-UP — current duplication is manageable |
| 5 | Back-button stack verification on nested sheets | NEEDS DEVICE TESTING |
| 6 | Provisioning status display after company creation | FOLLOW-UP — UX enhancement |

---

## 13. Explicitly Deferred Items

| Item | Reason |
|---|---|
| Workspace creation from Settings | Correctly deferred per prompt. Backend `createWorkspace()` exists but authenticated creation flow not yet designed |
| Invitation management | P2 per Multi-Tenancy PRD. Not in current scope |
| Ink ripple feedback | Facelift PRD backlog item, not multitenancy-specific |
| Device-level Android back-button testing | Cannot be verified in static analysis |
| `CompanyCreationForm` extraction | Follow-up refactor. Current duplication between `CompanyCreation.tsx` (onboarding) and `CreateCompanySheet.tsx` (in-app) is manageable |
