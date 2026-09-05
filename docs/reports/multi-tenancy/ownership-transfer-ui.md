# Ownership Transfer UI Wiring Report

This report was written by opencode on 2026-09-05 via Local Runner.

## Objective

Wire the ownership transfer RPC into the AdminSettingsSection UI and audit remaining workspace/team management actions against the multi-tenancy PRD.

## Scope

- `src/domain/tenant/tenantCreation.ts` — add `transferWorkspaceOwnership` domain function
- `src/pages/settings/AdminSettingsSection.tsx` — add transfer ownership button + confirmation modal

## Skills used

NONE

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

### 1. `transferWorkspaceOwnership` domain function

Added to `src/domain/tenant/tenantCreation.ts:186-200`. Calls the `transfer_workspace_ownership` RPC (SECURITY DEFINER). Validates that the caller is the current owner. Atomically demotes the old owner to member and promotes the target — never a two-owner or zero-owner state.

### 2. Ownership transfer UI in AdminSettingsSection

Added to `src/pages/settings/AdminSettingsSection.tsx`:

- **TransferConfirmModal** component (lines 56-115): Email-confirmation modal matching the pattern of `RemoveConfirmModal`. Requires typing the target member's email to confirm. Purple color scheme to distinguish from the destructive red "Remove" action.
- **Transfer Ownership button**: Appears next to the "Remove" button for each non-self, non-owner member. Only visible to the current workspace owner.
- **handleTransfer handler**: Calls `transferWorkspaceOwnership`, then `refreshWorkspace()` (from `useWorkspace`) to immediately update the UI. The owner's role badge and action buttons update on the next render.

### 3. Report relocation

Moved `docs/Reports/general/workspace-management-gaps-audit.md` to `docs/Reports/multi-tenancy/workspace-management-gaps-audit.md`.

## PRD audit: Administrative action status

| Action | PRD Section | Implementation | Status |
|---|---|---|---|
| Invite member | §3.2 | `createWorkspaceInvitation` RPC + UI dialog | Complete |
| Revoke invitation | §3.2 | `revokeWorkspaceInvitation` RPC + UI button | Complete |
| Remove member | §3.2 | Direct `workspace_members.delete()` + email-confirm modal | Complete |
| Grant role template | §3.2 | `assignRoleToCompanyMember` RPC + UI toggle | Complete |
| Remove role template | §3.2 | `removeRoleFromCompanyMember` RPC + UI toggle | Complete |
| Transfer ownership | §7 | `transferWorkspaceOwnership` RPC + UI modal | **Complete (this task)** |
| Workspace switching | §3.5 | `WorkspaceSelection.tsx` + `WorkspaceSwitchSection.tsx` | Complete |
| Role template CRUD | §12.8 | No UI; preloaded templates seeded via DB | Deferred |
| Role edit semantics | §20 | Not implemented | Deferred per PRD |

## Deferred work

- **Role template CRUD UI**: PRD §12.8 defines a Role Builder with create/edit/duplicate/delete. Preloaded templates (Company Admin, Manager, Engineer, Viewer) cover current needs. PRD §20 explicitly defers the live-vs-snapshot semantics question. Add when role templates need to be user-defined.
- **Workspace settings editing**: No UI to rename workspace or edit workspace-level settings. Low priority — workspaces are created once and rarely renamed.

## Verification

- `bun run audit:load`: passed (no new issues)
- `bun run typecheck`: passed
- `git status`: clean (no pre-existing files reverted)
