# Tenancy Authority and Invitation Model Update Report

This report was written by opencode (deepseek-v4-flash-free) on 2026-08-16 via Local Runner.

## Objective

Formalize the resolved product decisions for administrative authority and the invitation lifecycle in the multi-tenancy PRD set.

The decisions are:

1. An invitation has one of four states: `pending`, `accepted`, `revoked`, or `expired`.
2. "Pass for now" is a session-only choice. It is not a state. It never rejects or revokes an invitation.
3. Administration has two levels: Workspace Admin and Company/Entity Admin.
4. Workspace Admin is the authority ceiling.
5. Company/Entity Admin is entity-scoped and bounded by the Workspace Admin.
6. Administrative authority is separate from business permissions.
7. A workspace can hold multiple companies and entities.
8. An admin scope does not cross entities.

The pass is documentation-only. It changes no application code and no database schema.

## Scope

The pass covers three files:

- `docs/prd/multi-tenancy/erp-frontend-prd-v1.4.md`
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- `docs/prd/Platform-god/platform-office-prd.md`
- `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`

## Files changed

- `docs/prd/multi-tenancy/erp-frontend-prd-v1.4.md`
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- `docs/prd/Platform-god/platform-office-prd.md`
- `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`
- `docs/Reports/multi-tenancy/tenancy-authority-and-invitation-model-update.md` (this report)

## Skills used

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Decisions added

### D3: Pass for now

The invitation acceptance flow is:

- Accept the invitation.
- Or pass for now.

"Pass for now" keeps the invitation `pending`. It never rejects or revokes the invitation. Acceptance is server-side only. The frontend never writes membership or permission rows. The invitation may be re-offered on a later startup.

### D4: Invitation lifecycle

An invitation has one of four states:

- `pending`
- `accepted`
- `revoked`
- `expired`

"Pass for now" is not a state. Only an authorized Workspace Admin can revoke an invitation. The administrator chooses the expiration. A `revoked` or `expired` invitation cannot be accepted.

### D5 and D7: Two-level administration model

Administration has two levels:

1. Workspace Admin. This is the authority ceiling. It is workspace-wide.
2. Company/Entity Admin. This is entity-scoped. It is bounded by the Workspace Admin.

A workspace can hold multiple companies and entities. An admin scope does not cross entities.

The two-level administration model is resolved at product level. The database representation is deliberately unresolved. It is the next reconciliation question. This pass does not claim that the existing schema fully represents the hierarchy. It does not introduce roles, new permission schemas, or fixed hierarchy tables.

### D6: Administrative authority versus business permissions

Administrative authority and business permissions are distinct.

The action-based, deny-by-default, entity-scoped permission model remains authoritative. It is described in Backend PRD sections 3.1 and 3.3. Administrative titles do not grant business permissions. Administrative titles do not create roles.

### D8: Multiple companies and entities per workspace

A workspace can hold multiple companies and entities. An admin scope is per entity. It does not cross entities.

## Invitation lifecycle

The backend schema already supports the lifecycle:

- `workspace_invitations.status` has a check constraint that allows `pending`, `accepted`, `revoked`, and `expired`.
- `workspace_invitations.expires_at` exists.

This pass claims no table changes.

The default rule `Invite expiry: 7 days` stays the established platform default. The administrator chooses expiration subject to platform validation.

## Multi-workspace membership model

A user can be a member of multiple workspaces. Exactly one workspace is active per session. This rule is unchanged.

## Two-level administration model

Backend PRD section 3.11 now describes the model:

- Level 1: Workspace administration. It is the authority ceiling.
- Level 2: Company or entity administration. It is scoped per entity and bounded by the ceiling.
- Administrative authority and business permissions are distinct.
- The reconciliation-phase note states that the existing schema is not claimed to fully represent the hierarchy.
- Platform Operators are platform-level staff. They are not tenant administrators.
- Approval never initiates entity or schema provisioning.

## Admin authority versus business permissions distinction

The action-based permission model is unchanged. It is deny-by-default and entity-scoped. Business permissions come from `entity_permissions` rows only. Administrative authority does not grant business permissions.

## Illustration changes

The illustration is `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`.

Changes made:

- Updated the header sub copy for multi-workspace, two-level administration, and pass for now.
- Updated the version tag to `Multi-Tenancy v2.1 · Frontend v1.5 · Office v1.3`.
- Added a `workspaces` array with two workspaces: `bigdrops-main` and `nova-logistics`.
- Added a `ws` field to every entity.
- Added the `ent_vega` entity for `nova-logistics`.
- Added an `adminLevel` field to every user.
- Added a `pendingInvite` status of `pending`.
- Added Aisha's `ent_vega` grants.
- Added mock invoices for `entity_novalogistics_vega`.
- Updated the ERP plane copy for the four-state lifecycle, pass for now, and two-level administration.
- Added a workspace selector for the active workspace.
- Restructured the invitation banner with invitation metadata and actions.
- Added the `Pass for now` button.
- Added a two-level administration card with the authority ceiling.
- Wired the workspace switch interaction.
- Wired the invitation lifecycle rendering for `pending`, `accepted`, `revoked`, and `expired`.
- Wired the accept and pass actions.
- Wired the entity selector to the active workspace.
- Updated the resolution steps to show the active workspace.
- Updated the onboarding flow for a user with no membership and no invitation.

## No application code modified

This pass modified documentation files and the documentation illustration only. It modified no application code, no Supabase migrations, no tables, no RPCs, no RLS policies, no permission functions, and no frontend components.

## Unresolved implementation questions

The following implementation questions remain:

- The database representation of the two-level administration model is unresolved. It is the next reconciliation question.
- The status of `docs/Reports/multi-tenancy/multi-tenancy-prd-content-pass.md` is unresolved. This report covers the same pass. The earlier report may be superseded.

## Verification result

- `bun run audit:load`: passed. The reported warnings are pre-existing and unrelated to this pass.
- `bun run typecheck`: not run. This pass changes documentation files only.
- `git status`: shows the edited documentation files. Staged source-code changes from earlier workstreams are untouched.
- Illustration script: `node --check` passed.
- Illustration runtime smoke test: passed. Workspace switching, pass for now, acceptance, and admin-level rendering work.

## Risks or limitations

- The illustration is not a spec. The PRD documents remain the source of truth.
- The illustration uses a local in-memory model. It does not connect to a database.
- The two-level administration database representation is unresolved. See the unresolved implementation questions section.

## Deferred work

- Resolve the database representation of the two-level administration model.
- Decide the status of `docs/Reports/multi-tenancy/multi-tenancy-prd-content-pass.md`.