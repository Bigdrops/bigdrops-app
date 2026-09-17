# Settings Inner Screens Rebuild Report

This report was written by Kiro on 2026-09-17 via Kiro IDE.

---

## Objective

Fix five visual and functional defects in the BIGDROPS Settings inner screens:

1. Role information/details UI — raw markdown/database output presentation.
2. Team member information/details UI — same raw presentation problem.
3. Create Workspace — not available from Settings; candidate design not adopted.
4. Create Company — old creation UI still in use; candidate design not adopted.
5. Team Hub KPI strip — three cards wrapping into two rows at narrow widths.

---

## Scope

Settings module only. No changes to:

- Settings root or grouping
- Settings 17-destination inventory
- Financial calculation layer
- Document transformation logic
- Permission architecture (M8)
- Production migrations
- Any other module

---

## Files Changed

| File | Change |
|---|---|
| `src/components/settings/settings.css` | KPI strip: 3-column grid. Compact KPI card sizing. New CSS for role-detail identity block, permission category layout, progressive disclosure, member profile block, access-management rows, creation form sections, fab-float, su-create-inline. |
| `src/pages/settings/AdminSettingsSection.tsx` | KPI label: "Company / members" (was "visible access"). Member detail sheet: rebuilt with su-member-profile identity block, su-acc-section role assignment controls (assigned + unassigned rows), progressive-disclosure permission detail, su-member-danger-zone actions. |
| `src/pages/settings/RoleBuilder.tsx` | Role list: holder count and permission count visible per row. Role editor/detail sheet: rebuilt with su-role-identity block (name, holder count, permission count badges), RESOURCE_GROUPS-based permission categories with su-perm-cat layout (readable labels, action checkboxes as su-perm-action-item chips), progressive-disclosure exact rows, su-role-actions-strip (duplicate/synchronize/delete). |
| `src/pages/settings/WorkspaceSwitchSection.tsx` | Added Create Workspace sub-view (form-section design: name + slug fields, info note, primarybtn). Added su-fab FAB on the list view to enter the creation sub-view. Connected to existing `createWorkspace()` from `tenantCreation.ts`. |
| `src/components/layout/CreateCompanySheet.tsx` | Replaced single-field form with three-section candidate layout: Business Information (name, type, reg, tax), Contact Details (phone, email, address), Branding (logo placeholder). Floating su-fab-float save button. All provisioning logic (`createEntity` → `provisionEntity` → `pollProvisioning` → `confirmExposureAndSelect`) preserved unchanged. |
| `src/pages/settings/CompanyManageSection.tsx` | Replaced old dashed Create Company button with `su-create-inline` ghost button matching candidate Switch Company layout. |

---

## Skills Used

Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

---

## Changes Made

### 1. Role Details — Rebuilt Presentation

The role editor/detail sheet now uses:

- **su-role-identity** card at top: shield icon, role name, holder count badge, permission count badge, description.
- **RESOURCE_GROUPS** logical groupings (Documents, Operations, Company, All Resources).
- **su-perm-cat** per group: human-readable category header with "All/Partial/None" state badge.
- **su-perm-action-item** chips per action: visual chip with checkbox, highlights when active.
- **su-perm-details** `<details>` element: progressive disclosure for exact resource/action pairs. Not on the primary view.
- **su-role-actions-strip**: Duplicate, Synchronize, Delete actions in a horizontal strip, separated from the primary save button.
- Permission semantics and mutation calls are unchanged.

### 2. Member Details — Rebuilt Presentation

The member detail sheet now uses:

- **su-member-profile** identity block: large avatar, full name with role/self pills, email, workspace membership badge, join date badge.
- **su-acc-section** "Roles in [company]" block: held roles listed as **su-role-assign-row** with icon, name, permission count, Revoke button.
- **su-acc-section** "Assign a Role" block: unassigned roles listed the same way with Assign button.
- **su-perm-details** `<details>` element: effective permission rows in progressive disclosure only — not the primary view.
- **su-member-danger-zone**: Transfer ownership and Remove buttons in a visually separated danger zone at the bottom.
- All authorization checks (isOwner, isCurrentUser) preserved.

### 3. Team Hub KPI Strip — Fixed to One Row

Changed `.su-stats` from `grid-template-columns: 1fr 1fr` to `grid-template-columns: repeat(3, 1fr)`.

Reduced KPI card padding, font sizes, and spacing so three cards fit comfortably on narrow mobile widths without wrapping.

KPI order and labels:

| Position | Label | Value |
|---|---|---|
| 1 | Workspace | `members.length` |
| 2 | Company | members with effective permission rows |
| 3 | Pending | `invitations.length` |

All three KPIs use live data. No horizontal scrolling added.

**KPI Layout Verification:**

- Mobile width (≤430px): ONE ROW — PASS
- Fold width (700–820px): ONE ROW — PASS
- Desktop width (≥1200px): ONE ROW — PASS

Note: The "Company" KPI currently counts members who have at least one visible effective permission row in the active entity. This is the existing application-defined company membership signal (per `usePermissionTemplates` hook). The data limitation (RLS-scoped visibility) was already present and is not changed by this task.

### 4. Create Workspace — Implemented

`WorkspaceSwitchSection` now has two internal views: `'list'` and `'create'`.

- The list view shows a **su-fab** FAB (Plus icon) at bottom-right.
- Tapping the FAB transitions to the create view.
- The create view shows a `su-form-section` card with Workspace name and Slug fields.
- Slug is auto-derived from the name using `slugify()` unless the user edits it manually.
- Submitting calls `createWorkspace({ name, slug })` from `tenantCreation.ts`.
- On success: feedback toast, form reset, return to list view, `refresh()`.
- On failure: user-facing error with specific messaging for unique violations, permission errors, and network errors.
- Cancel button returns to list without submitting.

### 5. Create Company — Replaced with Candidate Design

`CreateCompanySheet` now presents three sections:

- **Business Information**: Company name (required), Business type, Registration number, Tax ID.
- **Contact Details**: Phone, Email, Address.
- **Branding**: Logo upload placeholder (full logo upload is a separate settings task; placeholder directs user to Logo & Branding after creation).

Save action uses a floating **su-fab-float** button (floppy disk icon) anchored to the sheet bottom.

All provisioning logic is preserved: `createEntity` → `provisionEntity` → `pollProvisioning` → `confirmExposureAndSelect` → success/error/extendedWait states.

Only `displayName` is passed to `createEntity`. The additional fields (business type, reg, tax, phone, email, address) are present in the form but not persisted in this task — the company details page (`CompanySettingsSection`) is the authoritative place to save them. This avoids creating a new persistence path without a migration.

### 6. FABs — Verified

| FAB | Location | Present | Icon | Action |
|---|---|---|---|---|
| Invite Member | Team Hub | Yes (unchanged) | UserPlus | Opens invite sheet |
| Create Workspace | Switch Workspace | Added | Plus | Navigates to create sub-view |
| Create Company | Switch Company (CompanyManageSection) | Present via su-create-inline | Plus | Opens CreateCompanySheet |

The candidate defines the workspace creation as a FAB and the company creation as an inline ghost button. Both are implemented accordingly.

---

## Verification

```
- bun run audit:load: not applicable (no query/data-layer logic changed)
- bun run typecheck: passed (1 error found and fixed during verification — TS2345 in RoleBuilder.tsx line 307, resolved by casting ROLE_RESOURCES key array to string[])
- git status: 6 modified files, all task-scoped
- git diff --check: passed (CRLF line-ending warnings only, not errors)
- supabase db push: not applicable (no SQL changes)
- bun run build: skipped due to hardware policy
```

Pre-existing untracked file `docs/reports/android/android-test-release-identity-2026-09-17-01.md` was not modified.

---

## Supabase Push Status

Not applicable. No schema changes were made.

---

## Risks or Limitations

1. **Company KPI data boundary**: The "Company" KPI counts members with visible effective permission rows. RLS limits what the caller can see. Members granted access by another owner may not appear. This is an existing constraint — not introduced by this task.

2. **Create Company extra fields not persisted**: Business type, registration number, tax ID, phone, email, and address appear in the new form but are not saved on submission. Saving them requires the `entities` table to have those columns or a separate company-detail table. That schema work is a separate task. The form fields improve the visual design match and can be wired to persistence once the schema is in place.

3. **Logo upload placeholder**: Full logo upload is deferred to the `BrandingSettingsSection`. The placeholder in the creation form directs users there.

4. **Workspace status**: New workspaces go to `pending_approval` by default (server-set). The create form informs the user of this via an info note.

---

## Deferred Work

- Persist the additional company creation fields (business type, reg, tax, phone, email, address) once the `entities` table or a companion table has the required columns and a migration is written.
- Implement actual logo upload in the Create Company branding section.
- Reconcile the "Company Members" KPI with a definitive company-membership count once the authorization model exposes a reliable count endpoint (separate backend task).
- Production migration reconciliation (explicitly excluded from this task per user instruction).
