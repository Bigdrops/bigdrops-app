# Workspace Settings + Company Switcher / Side Drawer Architecture Report

This report was written by Buffy on 2026-08-31 via Freebuff.

---

## Objective

Implement the Workspace Settings + Company Switcher experience inside the mobile side drawer and Settings page, following the BIGDROPS Adaptive Mobile-First UIUX Facelift PRD and multi-tenancy architecture.

## Scope

- Extend EntityProvider to support multiple entities with session-only selection
- Add Company Switcher to the mobile side drawer (between brand area and navigation rows)
- Add Company Selection Surface as a bottom sheet
- Add Workspace Switcher to Settings page (top of hierarchy)
- Update DesktopSidebar with company context
- Reorganize drawer navigation hierarchy per PRD §5

## Files Changed

### Modified

| File | Change |
|------|--------|
| `src/lib/tenant/contexts.tsx` | Extended EntityProvider with `entities` list, `selectEntity` function, and session-only entity selection via `useRef` |
| `src/components/layout/MobileSidebar.tsx` | Added CompanySwitcherRow between brand area and nav rows; split "Workspace tools" into "Management" and "Workspace" sections; imported CompanySelectionSheet |
| `src/components/layout/DesktopSidebar.tsx` | Added `useEntity` import; extended WorkspaceRoleInfo with company name and entity count display |
| `src/components/settings/SettingsShell.tsx` | Added `headerSlot` optional prop for rendering Workspace Switcher above settings navigation |
| `src/pages/Settings.tsx` | Imported and rendered `WorkspaceSwitcherRow` in the `headerSlot` |

### Created

| File | Purpose |
|------|---------|
| `src/components/layout/CompanySelectionSheet.tsx` | Bottom sheet for switching between companies/entities within the active workspace |
| `src/components/layout/WorkspaceSelectionSheet.tsx` | Bottom sheet for switching between workspaces in Settings |
| `src/components/layout/WorkspaceSwitcherRow.tsx` | Workspace switcher row component for Settings page header |

## Skills Used

- `redesign-existing-projects`
- `mobile-app-ui-design`
- `appllama-app-design-skill`

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

### 1. EntityProvider Multi-Entity Support

The EntityProvider was extended to track all active entities for the current workspace, not just auto-select a single one. Key additions:

- `entities: ActiveEntity[]` — full list of active entities
- `selectEntity: (id: string) => void` — session-only entity switch function
- `selectedEntityId` ref — persists entity selection across re-renders within a session
- Auto-select logic: single entity = auto-select; multiple = restore session pick or select first

Backward compatibility is preserved. Existing code that destructures `entity` or `tenantClient` from `useEntity()` continues to work unchanged.

### 2. Company Switcher in Mobile Drawer

Per PRD §4.2, the Company Switcher row sits between the brand area and the navigation rows:

```
┌──────────────────────────────┐
│ BRAND AREA                   │
│ [mark] BIGDROPS              │
│         subtitle             │
├──────────────────────────────┤
│ COMPANY SWITCHER ROW         │
│ Current Company          ›   │
│ Sun & Shield Power Solutions │
├──────────────────────────────┤
│ NAVIGATION ROWS              │
│ ...                          │
├──────────────────────────────┤
│ FOOTER                       │
│ user avatar + name + role    │
└──────────────────────────────┘
```

The Company Switcher row uses `var(--surface-muted)` background to visually distinguish it from navigation rows. When only one entity exists, the row is non-interactive and the chevron is hidden. When multiple entities exist, tapping opens the Company Selection Sheet.

### 3. Company Selection Sheet

A bottom sheet following the PRD §5.2 specification:

- Grab handle (34x3px)
- Title "Switch Company" + description
- Close button (28x28px)
- Company rows with: initials icon (34x34px), company name, check indicator for selected state
- Selected state uses `var(--primary-soft)` background + `var(--primary)` text + Check icon
- Row dividers between companies

Selection updates the EntityProvider state immediately. The sheet closes after a 150ms delay so the selected state is visible.

### 4. Workspace Switcher in Settings

Per PRD §6.2, the Workspace Switcher sits at the top of the Settings hierarchy:

```
Settings
├── Workspace (switcher row)
├── Account
│   └── User Profile
├── Workspace
│   ├── Company Info
│   ├── Logo & Branding
│   └── ...
├── Preferences
│   └── ...
└── System
    └── ...
```

The Workspace Switcher row follows the same pattern as the Company Switcher: label + name + chevron, with the same `var(--surface-muted)` background treatment.

### 5. Drawer Navigation Hierarchy

The "Workspace tools" section was split into two sections per the PRD §5 hierarchy:

- **Management** — Reports, Compliance Hub, Item Library
- **Workspace** — Settings

The "Workspace" label on primary navigation was changed to "Navigation" for clarity.

### 6. DesktopSidebar Company Context

The Business Context section at the bottom of the desktop sidebar now shows:

- Workspace name + role (existing)
- Company name (new)
- Entity count when multiple entities exist (new)

This serves as the secondary exposure point for company context per PRD §8.

## Verification Result

- `bun run audit:load`: passed (no new warnings from this change)
- `bun run typecheck`: passed (zero errors)
- `git status`: clean relative to changes (only expected modified/new files)

## Risks and Limitations

1. **Phase 1 entity resolution** — The EntityProvider auto-selects when exactly one entity exists. Multi-entity switching is now functional but requires multiple entities in the database to test. The PRD §9.1 states that workspace switching may change available entities; this is handled by the workspace change triggering entity re-resolution.

2. **Workspace switching** — The WorkspaceSelectionSheet component is created and integrated into Settings, but the WorkspaceProvider's `selectWorkspace` is session-only (resets on reload). This matches the PRD's Phase 1 constraint (§10.6: "Phase 1 activates one workspace per session").

3. **Legacy company_name fallback** — The `settings.company_name` field is still used as a fallback in many document rendering paths (invoices, waybills, letters). This is expected and documented as a legacy path. The entity-based identity is the canonical source; `company_name` is a settings-level convenience field.

## Deferred Work

- **Workspace Switcher snackbar confirmation** — Per PRD §7.4, workspace switching should show a snackbar confirmation ("Switched to [Workspace Name]"). This is a polish item deferred to a follow-up.
- **Company metadata display** — Per PRD §5.7, company type and other metadata may be shown in selection rows if available from the provider. Currently only name and initials are shown.
- **Desktop Company Switcher interactive behavior** — The desktop sidebar shows company context as information only. An interactive company switcher for desktop (dropdown or side panel per PRD §11.4) is deferred.
- **"Add Company" entry in selection surface** — Per PRD §5.6, the company selection surface may include an "Add Company" entry linking to the existing company creation flow. Deferred.
