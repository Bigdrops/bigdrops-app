# PRD Tenancy Documentation Update Report

This report was written by opencode on 2026-08-16 via Local Runner.

## Objective

Update three PRD documents to fix one contradiction and two coverage gaps.
The changes are documentation-only.
They match behavior that the backend already implements.
No architecture, schema, or RPC changes were made.

## Scope

Three files were updated:

- `docs/prd/Platform-god/platform-office-prd.md`
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- `docs/prd/multi-tenancy/erp-frontend-prd-v1.1.md`

## Files changed

- `docs/prd/Platform-god/platform-office-prd.md` (FIX 1)
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` (FIX 2)
- `docs/prd/multi-tenancy/erp-frontend-prd-v1.1.md` (FIX 3)
- `docs/Reports/multi-tenancy/prd-tenancy-documentation-update.md` (this report)

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

### FIX 1 — Platform Office PRD (v1.2)

The document version changed from 1.1 to 1.2.
The date changed to 2026-08-16.

Section 6.2 was corrected:

- Approval via `approve_workspace()` transitions `pending_approval` to `active`.
- Approval never initiates schema provisioning.
- Provisioning is a separate, owner-initiated action from the ERP.
- The console observes provisioning read-only via `entity_provisioning_status`.
- Archiving is owner-initiated from the ERP, not a console action.
- The console can suspend workspaces.
- The console can observe purge read-only (`purging` to `purged`).
- One exception exists: the Platform Owner may restore `archived` to `active` before purge runs.

Section 9.2 success criterion 2 was aligned with the corrected section 6.2.

Section 12 received a changelog row for version 1.2.

### FIX 2 — Backend PRD v2.1

A top amendment note dated 2026-08-16 was added.
This note states that the update is documentation-only.

Section 9.3 was added after section 9.2:

- Creator Auto-Grant on Successful Provisioning.
- On reaching status `ready`, `create_entity_schema()` inserts baseline
  `entity_permissions` rows for the calling user.
- The grant covers resource `*` with actions view, create, edit, delete.
- The grant happens in the same SECURITY DEFINER transaction as provisioning.
- A `ready` entity never exists with zero permissioned users.

Section 13 received success criterion item 14:

- On successful provisioning, the creator receives baseline
  `entity_permissions` automatically.
- No `ready` entity exists with zero permissioned users.

Section 14 received an amendment table row for the change.

### FIX 3 — Frontend PRD (v1.3)

The document version changed from 1.2 to 1.3.
An amendment record row for v1.3 was added.

Section 8 received:

- A "Pending Invitation?" gate after workspace membership resolution.
- An Invite Acceptance branch that routes to "Resolve Workspace".
- A Create Workspace branch for users without pending invitations.
- Routing notes below the diagram.

The routing notes state:

- A user with a pending invitation matching their email must accept it first.
- Such a user never sees the Create Workspace flow.
- Acceptance is a single RPC call.
- The app never writes `workspace_members` or `entity_permissions` rows directly.

Section 9 received:

- A select on `workspace_invitations` scoped to the current user's email.
- The `accept_workspace_invitation` RPC dependency.
- A note that the app never writes `workspace_invitation_entity_grants` rows.

Section 12.3 was added after section 12.2:

- In-App Invite Acceptance flow.
- Trigger: pending invitation matching the user's email.
- Acceptance is a single RPC call.
- The RPC creates the membership and permissions server-side.
- A pending invite always takes precedence over Create Workspace.

Section 14 received:

- A "Pending Invitations" field under Membership.
- A multi-workspace note in the Notes block.

Section 16 received a non-goal:

- Switching between existing workspaces within a session.

Section 19 received two acceptance criteria:

- Accepting an invitation in-app routes the user into the target workspace.
- Accepting an invitation never requires or triggers workspace creation.

## Verification

Documentation-only changes. No code was changed.

Verification:

- git status: expected modified files present
- bun run audit:load: skipped (no code change)
- bun run typecheck: skipped (no code change)
- bun run build: skipped due to hardware policy

## Risks or limitations

The changes describe behavior that the backend already implements.
No implementation work is required to satisfy these documents.

## Deferred work

The backend resume work from the prior session remains pending:

- Seed `_prov_seed_default_permissions`.
- Plan D: backfill tenant `rfqs` and re-add the `rfq_items` foreign key.