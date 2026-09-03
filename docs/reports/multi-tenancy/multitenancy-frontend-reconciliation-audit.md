# Multitenancy Frontend — Reconciliation Audit

This report was written by Buffy on 2026-09-01 via Freebuff.

---

## 1. Executive Finding

The recently implemented multitenancy frontend delivers the core product goal: a user can create a company inside the current workspace and switch between companies from the sidebar and Settings. The canonical tenancy architecture (`useEntity`, `useWorkspace`, `createEntity`, `provisionEntity`) is correctly reused. No tenancy boundaries are weakened.

However, the implementation introduces significant architectural duplication that must be resolved before this work is considered complete:

- Two independent `CompanySelectionSheet` implementations exist (sidebar-local vs shared).
- Two company creation implementations exist (onboarding page vs sheet).
- The legacy `BusinessSwitcher` component is imported but never rendered, contains outdated messaging, and duplicates company-switching intent.
- The legacy `WorkspaceSwitcherRow` component is defined but never imported or used.
- The `WorkspaceSwitchSection` in Settings uses its own inline sheet instead of the shared `WorkspaceSelectionSheet`.
- The Facelift PRD §16 context-switcher specification is partially violated (single-company behavior, sheet stacking, radius tokens).

The company creation lifecycle itself is architecturally sound. The defects are in the presentation/duplication layer, not in the tenancy business logic.

---

## 2. Multi-Tenancy PRD Reconciliation

Source: `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`

| Requirement | PRD Section | Status | Evidence |
|---|---|---|---|
| Company creation within workspace | §9, §12.2 | COMPLETE | `CreateCompanySheet.tsx` calls `createEntity()` + `provisionEntity()` + `entityCtx.refresh()` within current workspace |
| Entity scoped to workspace | §2, §5 | COMPLETE | `createEntity()` requires `workspaceId` from `useWorkspace()` context |
| Creator auto-grant on provisioning | §9.3 | COMPLETE (backend) | `provisionEntity()` calls the RPC; creator receives baseline permissions server-side |
| Provisioning status observability | §9.1 | PARTIAL | `getEntityProvisioningStatus()` exists in `tenantCreation.ts`; UI does not show provisioning status after creation |
| Company switching via provider | §10.7 | COMPLETE | `selectEntity()` from `useEntity()` used in both sidebar and Settings sheets |
| Workspace resolution precedes entity | §7 | COMPLETE | `EntityProvider` depends on `workspace` from `WorkspaceProvider` |
| Workspace switching in Settings | §10.7 | COMPLETE | `WorkspaceSwitchSection` renders in Settings with selection sheet |
| Workspace creation (frontend) | §12.2 | NOT IMPLEMENTED | `WorkspaceCreation.tsx` exists as onboarding page only; no authenticated workspace creation from Settings |
| Invitation management (frontend) | §4 | NOT IN SCOPE | Correctly deferred |
| Permission enforcement | §3 | PRESERVED | Frontend reads provider state; backend RLS/RPC remains authoritative |
| Workspace boundaries | §2 | PRESERVED | No cross-workspace entity leakage; `createEntity()` scoped to current workspace |

**Classification:**

| Item | Status |
|---|---|
| Company creation lifecycle | COMPLETE |
| Company switching | COMPLETE (with duplication) |
| Workspace preservation during creation | COMPLETE |
| Entity refresh after creation | COMPLETE |
| Workspace creation from Settings | DEFERRED (backend not ready for authenticated creation) |
| Invitation management | DEFERRED |

---

## 3. Adaptive Mobile-First PRD Reconciliation

Source: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/16-context-switchers.md`

### 3.1 Company Switcher (Drawer)

| PRD Requirement | Section | Status | Evidence |
|---|---|---|---|
| Company Switcher in hamburger drawer | §4.1 | COMPLETE | `MobileSidebar.tsx` renders `CompanySwitcher` between brand area and nav rows |
| Drawer region map (brand → company → nav → footer) | §4.2 | COMPLETE | Layout matches PRD structure |
| Company Switcher row touch target ≥44×44px | §4.3, §12.1 | PARTIAL | Sidebar `CompanySwitcher` button: `px-2.5 py-2` ≈ 40px height. Inline padding is 8px top+bottom + content. Needs audit for exact 44px compliance |
| Current company always displayed | §4.5 | COMPLETE | `CompanySwitcher` shows `entity?.name` always |
| One company: row non-interactive | §7.1 | VIOLATION | Sidebar `CompanySwitcher` always calls `onOpenSheet()`, never disables interaction |
| One company: chevron hidden | §7.1 | VIOLATION | `ChevronDown` always renders regardless of entity count |
| Create Company in selection surface | §5.6 | COMPLETE | Both sidebar and shared `CompanySelectionSheet` include Create Company |
| Selection surface = bottom sheet | §5.2 | COMPLETE | Both use `Sheet` component with `side="bottom"` |
| Selection surface max height 78% | §5.2 | PARTIAL | Shared `CompanySelectionSheet` uses `max-h-[78vh]`. Sidebar local uses `max-h-[60vh]` |
| Selection surface radius = `var(--bd-overlay-radius)` | §5.2, §21 §5.2 | VIOLATION | Sidebar uses `rounded-t-[20px]`. Shared uses `rounded-t-[24px]`. PRD says use `var(--bd-overlay-radius)` |
| Sheet title "Switch Company" | §5.3 | COMPLETE | Both sheets show "Switch Company" |
| Sheet description | §5.3 | PARTIAL | Shared sheet has description. Sidebar local does not |
| Sheet close button (28×28px) | §5.3 | PARTIAL | Shared has close button. Sidebar local does not |
| Grab handle (34×3px) | §5.3 | COMPLETE | Both have grab handle |
| Company row selected state (Check + color) | §5.4 | COMPLETE | Both show `Check` icon and `primary-soft` background for selected |
| Ripple on row tap | §10, §15 §1 | NOT IMPLEMENTED | `active:scale-[0.985]` exists but no ink ripple. PRD §15 §1 specifies ripple feedback |
| Back button closes sheet then drawer | §10.1 | NEEDS VERIFICATION | Relies on `AndroidBackHandler.tsx` global handler; no explicit test evidence |
| Drawer stays open under selection surface | §5.1 | PARTIAL | Sidebar's `CompanySelectionSheet` is nested inside the `Sheet` (drawer), so drawer is technically still open. However, z-index stacking of nested sheets needs verification |

### 3.2 Workspace Switcher (Settings)

| PRD Requirement | Section | Status | Evidence |
|---|---|---|---|
| Workspace Switcher in Settings | §6.1 | COMPLETE | `WorkspaceSwitchSection` renders in Settings |
| Workspace row ≥44×44px | §6.3, §12.1 | PARTIAL | `py-3 px-3` + content ≈ 44px. Needs exact audit |
| Workspace name always displayed | §6.3 | COMPLETE | Always shows workspace name |
| One workspace: switching not prominent | §7.1 | PARTIAL | `WorkspaceSwitchSection` hides sheet when `activeWorkspaces.length <= 1`. Row is rendered but non-interactive (cursor-default). Acceptable |
| Workspace selection surface = bottom sheet | §7.2 | COMPLETE | Uses inline `Sheet` with `side="bottom"` |
| Workspace switch confirmation snackbar | §7.4 | NOT IMPLEMENTED | No snackbar/toast on workspace switch |
| Settings workspace context row | §6.3 | COMPLETE | `Settings.tsx` renders workspace context in `SettingsShell` |

### 3.3 Company in Settings (Secondary Exposure)

| PRD Requirement | Section | Status | Evidence |
|---|---|---|---|
| Settings shows company context | §6.4 | COMPLETE | `CompanyManageSection` shows current company with selection and creation |
| Settings company section ≠ second switcher | §6.4 | COMPLETE | `CompanyManageSection` is a management surface, not a duplicate switcher |
| Company management correctly scoped | §6.4 | COMPLETE | Shows workspace context, company list, create button |

### 3.4 Provider/Context Ownership

| PRD Requirement | Section | Status | Evidence |
|---|---|---|---|
| Switcher UI does not own tenant state | §15.2 | COMPLETE | Both sheets read from `useEntity()` and `useWorkspace()`; neither creates local entity state |
| Switcher UI does not resolve schemas | §15.2 | COMPLETE | No schema resolution in UI components |
| Switcher UI does not implement authorization | §15.2 | COMPLETE | No permission checks in switcher UI |

---

## 4. Company Creation Lifecycle Findings

### 4.1 Lifecycle Trace

```
User taps "Create Company"
→ CreateCompanySheet opens
→ Validates workspace.id exists (from useWorkspace)
→ Validates displayName is non-empty
→ Calls createEntity({ workspaceId, displayName, slug })
→ Calls provisionEntity(entity.id) — RPC
→ Calls entityCtx.refresh() — re-fetches entity list from DB
→ feedback.success() toast
→ Sheet closes
→ Entity list updates via provider
→ User can immediately select the new company
```

**Assessment:** The lifecycle is architecturally correct. All calls go through canonical domain operations. The current workspace is preserved (read from `useWorkspace()`, never modified). The new entity belongs to the current workspace. The canonical entity state refreshes via `entityCtx.refresh()`.

### 4.2 Defects in Lifecycle

| # | Defect | Severity | Fix Required |
|---|---|---|---|
| 1 | `provisionEntity()` failure after `createEntity()` success leaves entity in "creating" state with no UI feedback | MEDIUM | Show provisioning status or a retry prompt. Currently the error message is displayed, but the user may not understand the entity was created but not provisioned |
| 2 | No duplicate-submission prevention beyond `loading` state guard | LOW | The `disabled={loading}` on submit button is sufficient for single-tap prevention |
| 3 | Form resets on sheet close (`useEffect` on `open`), but if sheet closes during submission, the entity may have been created | LOW | Edge case. The `onOpenChange(false)` is only called after success. If the user swipes-dismisses during loading, the loading state continues until it completes. Acceptable |

---

## 5. Company Switcher Findings

### 5.1 Two Implementations

| Aspect | Sidebar Local (`MobileSidebar.tsx` lines 100-185) | Shared (`CompanySelectionSheet.tsx`) |
|---|---|---|
| File | `src/components/layout/MobileSidebar.tsx` | `src/components/layout/CompanySelectionSheet.tsx` |
| Used by | Sidebar only | Settings `CompanyManageSection` |
| Company list | ✅ | ✅ |
| Selected indicator | ✅ Check icon | ✅ Check icon |
| Create Company | ✅ | ✅ |
| Sheet description | ❌ Missing | ✅ "Select the company to work in." |
| Close button | ❌ Missing | ✅ 28×28px close button |
| Max height | `60vh` | `78vh` |
| Border radius | `rounded-t-[20px]` | `rounded-t-[24px]` |
| Grab handle | ✅ 34×3px | ✅ 34×3px |
| Accessible labels | ❌ No `aria-label` on rows | ❌ No `aria-label` on rows |

**Assessment:** These are two independent implementations of the same interaction. The PRD §8 §17 invariant 7 states: "Multiple UI exposures may exist, but they represent the same underlying context." The PRD does not prohibit different entry points, but the duplicated component code is unnecessary.

**Recommended resolution:** The sidebar should render the shared `CompanySelectionSheet` (or the shared component should be refactored to be the single source). The sidebar-local version has fewer features (no description, no close button, wrong max-height, wrong radius). The shared version is more complete and PRD-compliant.

### 5.2 Single-Company Behavior

The PRD §7.1 states:

> When only one company exists: Company name displayed in row. Chevron hidden. Row is non-interactive. Switching is not offered.

The current implementation:
- Sidebar `CompanySwitcher`: Always interactive, always shows chevron, always opens selection sheet
- `CompanySelectionSheet`: Always shows Create Company button (correct per §5.6)

**Violation:** The PRD says the row should be non-interactive with one company. However, the PRD also says "Add Company" is an entry point in the selection surface. If the row is non-interactive, the user cannot reach the Create Company button.

**Resolution needed:** The PRD's §7.1 one-company behavior contradicts §5.6's "Add Company" entry point. The PRD should be reconciled: when one company exists, the row should remain interactive to expose the Create Company action. The current implementation is actually the correct behavior. The PRD §7.1 needs amendment.

---

## 6. Sidebar Findings

### 6.1 Architecture

The sidebar (`MobileSidebar.tsx`) contains:
- A local `CompanySwitcher` component (compact button with avatar + name + chevron)
- A local `CompanySelectionSheet` function component (bottom sheet with company list + Create Company)
- Both are defined inline within the same file

The local `CompanySelectionSheet` duplicates the shared `CompanySelectionSheet.tsx` with fewer features.

### 6.2 Defects

| # | Defect | Severity |
|---|---|---|
| 1 | Local `CompanySelectionSheet` has `rounded-t-[20px]` instead of `var(--bd-overlay-radius)` | MEDIUM |
| 2 | Local `CompanySelectionSheet` has `max-h-[60vh]` instead of `max-h-[78vh]` | LOW |
| 3 | Local `CompanySelectionSheet` missing sheet description and close button | LOW |
| 4 | Local `CompanySelectionSheet` missing `aria-label` on company rows | MEDIUM |
| 5 | `CompanySwitcher` touch target may be below 44px | MEDIUM |
| 6 | Nested sheets: company selection sheet renders inside sidebar sheet — z-index stacking needs verification | LOW |

### 6.3 Dead Code

| Component | File | Status |
|---|---|---|
| `BusinessSwitcher` | `src/components/layout/BusinessSwitcher.tsx` | Imported in Layout.tsx but never rendered. Contains "Multi-business switching is not enabled" — outdated |
| `WorkspaceSwitcherRow` | `src/components/layout/WorkspaceSwitcherRow.tsx` | Defined but never imported or used anywhere |

---

## 7. Settings Findings

### 7.1 CompanyManageSection

`CompanyManageSection.tsx` correctly:
- Shows current workspace context (name, company count)
- Lists all companies with selection
- Shows "Create Company" button
- Uses `CreateCompanySheet` for creation

**No defects identified in CompanyManageSection.**

### 7.2 WorkspaceSwitchSection

`WorkspaceSwitchSection.tsx` contains its own inline bottom sheet for workspace switching instead of using the shared `WorkspaceSelectionSheet.tsx`. This is a third sheet implementation (alongside sidebar local and shared company selection).

| Aspect | WorkspaceSwitchSection (inline) | WorkspaceSelectionSheet (shared) |
|---|---|---|
| Used by | Settings only | WorkspaceSwitcherRow (dead code) |
| Radius | `rounded-t-[20px]` | `rounded-t-[24px]` |
| Max height | `60vh` | Not specified (no `max-h`) |
| Description | ❌ Missing | ✅ "Select the workspace to operate in." |
| Close button | ❌ Missing | ✅ |
| Company count per workspace | ❌ Missing | ❌ Missing (despite PRD §7.2 requiring it) |

**Assessment:** `WorkspaceSwitchSection` should consume `WorkspaceSelectionSheet`. The dead `WorkspaceSwitcherRow` should be removed.

### 7.3 Settings Hierarchy

The PRD §6.2 specifies:

```
Settings
├── Workspace
│   └── Switch Workspace
├── Company
│   └── Company-related settings
└── Other Settings
```

Current implementation in `settings-config.ts` has:
- "Company Management" (new section)
- "Company Settings" (existing section)
- "Workspace" (existing section with WorkspaceSwitchSection)

**Assessment:** The hierarchy is correct. Workspace comes before Company. Both exist as separate sections.

---

## 8. Workspace Creation Status

| Aspect | Status |
|---|---|
| `WorkspaceCreation.tsx` page | EXISTS — full-page onboarding flow only |
| Backend `createWorkspace()` | EXISTS in `tenantCreation.ts` |
| Authenticated workspace creation from Settings | NOT IMPLEMENTED |
| PRD requirement | §12.2 — workspace creation is secondary to company creation |
| Classification | DEFERRED — correctly deprioritized per prompt instructions |

**The backend supports workspace creation (`createWorkspace()` in `tenantCreation.ts`).** The frontend only exposes it during onboarding. Adding workspace creation to Settings is a straightforward follow-up once company creation is verified.

---

## 9. Duplication/Architecture Findings

### 9.1 Company Selection Duplication

| Implementation | File | Consumers |
|---|---|---|
| Shared `CompanySelectionSheet` | `src/components/layout/CompanySelectionSheet.tsx` | `CompanyManageSection.tsx` (Settings) |
| Sidebar-local `CompanySelectionSheet` | `src/components/layout/MobileSidebar.tsx` (line 100) | Sidebar only |

**Same function. Two implementations. Different quality.** The shared version is more PRD-compliant. The sidebar version is less featured.

**Recommended:** Remove the sidebar-local version. Have the sidebar import and use the shared `CompanySelectionSheet`.

### 9.2 Company Creation Duplication

| Implementation | File | Context |
|---|---|---|
| Onboarding page | `src/pages/CompanyCreation.tsx` | Full-page Card form during onboarding |
| Sheet form | `src/components/layout/CreateCompanySheet.tsx` | Bottom sheet for in-app creation |

Both contain:
- Same field: company name
- Same validation: non-empty, workspace check
- Same domain calls: `createEntity()` + `provisionEntity()`
- Same error handling pattern
- Same success handling (refresh + feedback)

**Assessment:** This is acceptable duplication IF the onboarding page and the in-app sheet serve genuinely different presentation contexts. The onboarding page is a standalone full-page experience (Card centered on screen). The sheet is an in-app contextual action. Extracting shared form logic into a `CompanyCreationForm` core component would be ideal but is not blocking.

**Recommended:** Extract `CompanyCreationForm` as a shared core component. Wrap it in `Card` for onboarding and in `Sheet` for in-app. This is a follow-up task, not a blocker.

### 9.3 Workspace Sheet Duplication

| Implementation | File | Consumers |
|---|---|---|
| Shared `WorkspaceSelectionSheet` | `src/components/layout/WorkspaceSelectionSheet.tsx` | `WorkspaceSwitcherRow.tsx` (dead code) |
| Inline workspace sheet | `src/pages/settings/WorkspaceSwitchSection.tsx` | Settings |

**The shared component exists but is consumed only by dead code.** The actual Settings usage implements its own inline sheet.

**Recommended:** Have `WorkspaceSwitchSection` consume `WorkspaceSelectionSheet`. Remove dead `WorkspaceSwitcherRow`.

### 9.4 BusinessSwitcher Dead Code

`BusinessSwitcher.tsx` is:
- Imported in `Layout.tsx` (line 53) but never rendered in JSX
- Contains "Multi-business switching is not enabled" — outdated after this implementation
- Has its own custom overlay (not using shared sheet infrastructure)
- Operates independently of `useEntity()` selection state

**Recommended:** Remove the import from `Layout.tsx`. Delete `BusinessSwitcher.tsx` or refactor it to consume the shared `CompanySelectionSheet` if desktop header needs a company control.

---

## 10. Tenancy Safety Findings

| Check | Status | Evidence |
|---|---|---|
| Workspace boundaries preserved | ✅ | `createEntity()` requires `workspaceId` from `useWorkspace()` — never user-supplied |
| Entity selection scoped to workspace | ✅ | `EntityProvider` resolves entities filtered by `workspace.id` |
| No cross-workspace entity leakage | ✅ | Entity list is workspace-scoped in provider |
| Canonical state used | ✅ | `selectEntity()` and `refresh()` from `useEntity()` |
| No local duplicate state | ✅ | Sheets read from providers, no independent entity store |
| Backend authorization preserved | ✅ | Frontend calls RPCs (`provision_entity`); RLS enforced server-side |
| Workspace not accidentally changed during creation | ✅ | `createEntity()` does not call `selectWorkspace()` or modify workspace state |
| Entity refresh after creation | ✅ | `entityCtx.refresh()` called after `provisionEntity()` completes |

**No tenancy safety violations identified.**

---

## 11. Android/Mobile Findings

| Check | Status | Evidence |
|---|---|---|
| Bottom sheet for company selection | ✅ | Both implementations use `Sheet` with `side="bottom"` |
| Grab handle present | ✅ | 34×3px handle in both |
| Swipe-to-dismiss | ✅ | Radix Sheet supports this by default |
| Touch targets ≥44px | ⚠️ | Sidebar `CompanySwitcher`: `py-2` + content height needs exact pixel audit. Rows in sheets: `py-2.5` + content ≈ 40-44px |
| No hover dependency | ✅ | All interactions are tap-based |
| Keyboard/IME safe | ⚠️ | `CreateCompanySheet` has `autoFocus` on input — should verify keyboard pushes content up correctly in bottom sheet |
| Android back behavior | ⚠️ | Relies on `AndroidBackHandler.tsx` global handler. No explicit per-sheet integration. Needs device verification |
| Safe area handling | ✅ | Sheet uses `max-h-[78vh]` or `60vh`, not full-screen |
| No horizontal overflow | ✅ | Company names truncate with `truncate` class |
| Loading state visible | ✅ | Spinner shown during creation |
| Success feedback | ✅ | `feedback.success()` toast shown |
| Error feedback | ✅ | Inline error message displayed |
| Disabled state during submission | ✅ | Submit button disabled when loading or empty |

**Foldable/Tablet/Desktop:** The implementation uses existing responsive sheet infrastructure. The sidebar sheet is always a left drawer. The selection sheet is always a bottom sheet. No tablet/desktop-specific adaptation is implemented, but the PRD allows this (§11: "Same as phone" for foldable and tablet).

---

## 12. Code Changes Made

### Files Modified (Previous Implementation)

| File | Change |
|---|---|
| `src/components/layout/CreateCompanySheet.tsx` | NEW — bottom sheet company creation form |
| `src/pages/settings/CompanyManageSection.tsx` | NEW — Settings company management section |
| `src/components/layout/CompanySelectionSheet.tsx` | MODIFIED — added Create Company button, removed early-return on single entity |
| `src/components/layout/MobileSidebar.tsx` | MODIFIED — added local CompanySwitcher + local CompanySelectionSheet with Create Company |
| `src/pages/Settings.tsx` | MODIFIED — wired CompanyManageSection |
| `src/pages/settings/settings-config.ts` | MODIFIED — added "Company Management" section |
| `src/pages/settings/index.ts` | MODIFIED — exported CompanyManageSection |

### Files Identified as Dead Code

| File | Issue |
|---|---|
| `src/components/layout/BusinessSwitcher.tsx` | Imported but never rendered. Outdated messaging |
| `src/components/layout/WorkspaceSwitcherRow.tsx` | Defined but never imported |

---

## 13. Remaining Multitenancy Frontend Gaps

### P0 (Should Be Fixed Now)

| # | Gap | Impact |
|---|---|---|
| 1 | Sidebar `CompanySelectionSheet` duplicates shared `CompanySelectionSheet` with fewer features and wrong tokens | Architecture debt, PRD token violation |
| 2 | `WorkspaceSwitchSection` duplicates workspace selection sheet instead of using shared `WorkspaceSelectionSheet` | Architecture debt |
| 3 | `BusinessSwitcher` dead import in `Layout.tsx` + dead component | Dead code, outdated messaging |
| 4 | `WorkspaceSwitcherRow` dead code | Dead code |
| 5 | No `aria-label` on company/workspace rows in selection sheets | Accessibility gap per PRD §12.3 |
| 6 | Radius tokens inconsistent across sheets (`20px`, `24px`, should be `var(--bd-overlay-radius)`) | PRD §21 §5.2 violation |

### P1 (Should Be Done in Next Pass)

| # | Gap | Impact |
|---|---|---|
| 7 | No workspace switch confirmation snackbar/toast | PRD §7.4 requirement |
| 8 | No provisioning status display after company creation | UX gap for slow provisioning |
| 9 | Company creation form duplicated between onboarding page and sheet | Maintenance burden |
| 10 | `CompanySwitcher` touch target may be below 44px | Android accessibility |

### P2 (Deferred)

| # | Gap | Impact |
|---|---|---|
| 11 | Workspace creation from Settings (authenticated) | PRD requirement, backend ready |
| 12 | Invitation management UI | PRD requirement, properly deferred |
| 13 | Ink ripple feedback on switcher rows | PRD §15 §1 specification |
| 14 | Back-button stack verification on nested sheets | Needs device testing |

---

## 14. Explicitly Deferred Items

| Item | Reason |
|---|---|
| Workspace creation from Settings | Backend `createWorkspace()` exists but authenticated creation flow not yet designed. P1 per prompt |
| Invitation management | P2 per PRD. Not in current scope |
| Ink ripple feedback | Facelift PRD backlog item, not multitenancy-specific |
| Device-level Android back-button testing | Cannot be verified in static analysis |
| `CompanyCreationForm` extraction | Follow-up refactor. Current duplication is manageable |

---

## 15. Verification Performed

| Command | Result |
|---|---|
| `git status` | ✅ Run before audit — 6 staged + 6 unstaged + 4 untracked files from previous work |
| `bun run typecheck` | ✅ Passed during previous implementation |
| `bun run audit:load` | ⏭️ Not required — no schema/query/data-layer logic modified in this audit |
| `bun run build` | 🚫 Excluded per hardware policy |

**Note:** This audit is documentation-only. No application source files were modified during this audit pass.

---

## 16. Final Verdict

**What is actually left:**

The company creation and switching lifecycle works correctly at the tenancy/business-logic layer. The defects are in the presentation layer: duplicated sheet implementations, dead code, inconsistent tokens, and missing accessibility labels.

**What should be removed:**

- `BusinessSwitcher.tsx` (dead component, outdated)
- `WorkspaceSwitcherRow.tsx` (dead component, never consumed)
- Sidebar-local `CompanySelectionSheet` function in `MobileSidebar.tsx`
- Inline workspace sheet in `WorkspaceSwitchSection.tsx`

**What should be added:**

- `aria-label` on all company/workspace selection rows
- Workspace switch confirmation toast
- Consistent use of `var(--bd-overlay-radius)` across all sheets
- Consistent `max-h-[78vh]` across all selection sheets

**What should be prioritized next:**

Consolidate the two `CompanySelectionSheet` implementations into one. The shared version (`CompanySelectionSheet.tsx`) should be the single source. The sidebar should import and use it. Then consolidate the workspace selection sheet. Then remove dead code. This is a focused cleanup pass that preserves all working behavior while eliminating duplication.
