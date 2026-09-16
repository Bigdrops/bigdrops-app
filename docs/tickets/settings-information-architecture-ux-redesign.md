# Settings Information Architecture & UX Redesign — Audit Ticket

Ticket created by Buffy on 2026-09-14 via Freebuff.

Type: Audit ticket (evidence-based redesign direction). No code changes are included.
Status: OPEN — awaiting a separate implementation task.
Domain: Settings / multi-tenancy UX

---

## 1. Problem

The Settings surface has grown into 17 sections spread across 4 categories
(Account, Workspace, Preferences, System). Audit evidence shows that the
category boundaries do not match the underlying tenancy model, two section
names are near-duplicates, and Team sits in a category where users will not
look for people management. Users cannot predict where a setting lives, and
the Team section displays role state that contradicts itself.

---

## 2. Audit Findings

### 2.1 Current category and section structure

Source of truth: `src/pages/settings/settings-config.ts`
(`SETTINGS_GROUPS`, `SYSTEM_GROUP`, `buildGroups`). Rendering order is
config order; `SettingsNav` renders groups as-is.

Current runtime structure:

| Group | Section (label) | Section id | Scope of data actually controlled | Gated |
|---|---|---|---|---|
| Account | User Profile | `user` | Account-level: `auth.users` password, `profiles.has_password`, device hydration | — |
| Workspace | Switch Workspace | `workspace-switch` | Workspace-level: active workspace pick + pending workspace invitation accept | — |
| Workspace | Company Management | `company-manage` | Company-level lifecycle: entity list, switch active entity, archive/restore entity, create entity (`entities` table, public schema) | — |
| Workspace | Company Info | `company` | Company-level identity: `settings` row in the active entity schema | — |
| Workspace | Logo & Branding | `branding` | Company-level identity: `company_logo_url`, `footer_text` in entity `settings` | — |
| Workspace | Banking | `banking` | Company-level: `bank_accounts` rows via `tenantClient` | — |
| Workspace | Signatories | `signatories` | Company-level: `signatories` rows via `tenantClient` | — |
| Preferences | Theme & Appearance | `theme` | Mixed: theme preset/mode are user-level (`useUserThemePreferences`); custom background/card colors are entity-level (`app_background_color`, `app_card_color` in entity `settings`) | — |
| Preferences | Notifications | `notifications` | Account-level per-user preference surface | — |
| Preferences | Dashboard Layout | `dashboard` | Account-level: `loadStoredKpiCards()`/`saveStoredKpiCards()` local storage | — |
| Preferences | Document Controls | `documents` | Company-level: `document_fillable_settings` in entity `settings` | — |
| Preferences | Document Prefixes | `prefixes` | Company-level: `document_prefixes` in entity `settings` | — |
| Preferences | App Lock | `security` | Device-level: local biometric lock only (`isBiometricLockEnabled`), no server state | — |
| System | Team | `team` | Mixed: workspace membership (`workspace_members`, invitations) + company roles (`entity_permissions` via templates on the ACTIVE entity) | role badge (owner/member) visible to all; role management owner-only |
| System | Devices | `devices` | Workspace-level: `device_installations` across the workspace | `adminOnly` (owner) |
| System | Archives | `archives` | Company-level: archived rows across 7 tenant tables via `tenantClient` | — |
| System | Tenant Debug | `tenant-debug` | Platform-level diagnostics; navigates to `/debug/tenant` | `adminOnly` + `operatorOnly` |

`Settings.tsx` maps the legacy id `admin` to `team`; `AdminSettingsSection`
is a compatibility alias for `TeamSettingsSection`. This is dead weight from
an earlier IA iteration.

### 2.2 Misplaced and mixed-scope sections

Confirmed problems, each tied to a data source:

1. **Document Controls and Document Prefixes sit under Preferences but are
   company-scoped.** Both persist to the active entity's `settings` row via
   `tenantClient` (`DocumentsSettingsSection.tsx`,
   `DocumentPrefixesSettingsSection.tsx`). A second company gets different
   prefixes and controls. Users reading "Preferences" expect user-level
   choices.

2. **Theme & Appearance mixes two scopes in one section.** Preset and
   Light/Dark mode save to user-scoped preferences
   (`useThemePreferenceContext`); custom background/card colors save to the
   entity `settings` row (`AppThemeSettingsSection.tsx`,
   `handleSaveCustom`). One switch changes "my" view; the other changes
   everyone's view of that company's app colors. The section itself even
   admits it: "Each user's choice is independent."

3. **Team sits under System.** Its primary object is people: workspace
   members and invitations. Data lives in `workspace_members` and
   `workspace_invitations` (workspace scope) plus per-company roles
   (`entity_permissions`). "System" in this config means diagnostics and
   device hardware; people management is not a diagnostics concern. Users
   looking for "who works here" scan Account or Workspace first.

4. **Archives sits under System but is company-scoped.** All queries run
   through `tenantClient` (`ArchivesSettingsSection.tsx`). It is a data
   lifecycle surface for the active company, not a system control.

5. **Switch Workspace and Company Management are both "switchers" in one
   group but address different layers.** `WorkspaceSwitchSection` picks the
   active workspace; `CompanyManageSection` picks, creates, and archives
   companies inside the workspace. Nothing in the labels tells the user
   these are two levels of the same hierarchy.

6. **Dashboard Layout is account-level but sits in a group that users may
   read as shared** (Workspace-adjacent naming and ordering make scope
   ambiguous).

### 2.3 Ordering findings

- Current order: Account → Workspace → Preferences → System.
- All six identity/lifecycle surfaces (workspace switching + company
  switching + 4 company data groups) sit in one flat "Workspace" group.
  The two switchers (most frequent actions) are sandwiched between
  Account and the company data sections; nothing separates "pick what I
  am working on" from "edit what this business is".
- Team is the last group, listed after devices and before debug — the
  least prominent position for a section the PRD calls a primary
  governance surface (ERP Frontend PRD v1.5 §12.9).

### 2.4 Naming findings

| Label | What it actually contains | Problem |
|---|---|---|
| Company Management | Switch active company, create company, archive/restore company | Does not say "switch" or "create". Reads like "edit company details". |
| Company Info | Edit business name, tagline, address, phone, email, custom fields | Reads like a read-only "view". Overlaps verbally with "Company Management". |
| Logo & Branding | Company logo + PDF footer text | Fine on its own; buried under the two "Company" labels above it. |
| Banking | Bank accounts for receiving payments | Section header inside says "Payment Destinantions" (typo). |
| Document Controls vs Document Prefixes | Fillable-writing toggles vs numbering prefixes | Both start with "Document"; differ only by second word. |
| Team | Members, invitations, per-company role grants | Name is fine; placement and internal scope-mixing are the issue. |
| App Lock | Biometric device lock | Label is clear, but id is `security`, and it lives in Preferences next to company-scoped items. |

The two "Company" labels are the confirmed worst pair: they differ by one
word, describe different actions (switching/lifecycle vs editing details),
and neither label states its action.

### 2.5 Team Hub state findings (role display)

Observed behavior under audit: a member can hold a role (for example
Engineer) while Team Hub shows the role as off/inactive.

Confirmed facts from the implementation:

1. **Where Team Hub gets role information.** `TeamSettingsSection`
   (`src/pages/settings/AdminSettingsSection.tsx`) reads:
   - members: `useTeamMembers(workspaceId, currentUserId)` →
     `workspace_members` + `profiles` (workspace role: owner/member only).
   - roles: `usePermissionTemplates(workspaceId, entityId)` →
     `permission_templates` (+ items) for the workspace and
     `entity_permissions` for the **active entity**.

2. **Authoritative role state.** `entity_permissions` rows on a specific
   entity, evaluated as effective permission pairs. There is no stored
   "role assignment" row. This matches PRD v2.1 §3.6/§3.11: templates are
   conveniences; only expanded `entity_permissions` rows exist.

3. **How the display state is computed.** `coversTemplate()` in
   `usePermissionTemplates.ts` returns true only when the member's
   effective pairs **cover every ability of the template**. The function's
   own doc comment states coverage does not prove the template was
   assigned, because grants from different roles or sources overlap and
   the database has no grant-source column.

4. **The confirmed mismatch mechanism.** The UI presents
   `coversTemplate()` as an on/off state for the role
   (badge + Grant/Remove button). If a member's effective pairs cover the
   template's items, the UI shows "on"; if they cover even one item less,
   it shows "off" — **even when the member holds the named role's
   permissions through another overlapping grant or a modified template**.
   Concrete path: PRD v2.1 §3.6 says editing a template never retroactively
   changes anyone's permissions, and the
   2026-09-14 Engineer matrix fix
   (`docs/reports/multi-tenancy/engineer-permission-matrix-audit-2026-09-14.md`)
   confirms existing members keep old expanded rows until an owner
   reassigns the role. Such a member can simultaneously hold the role in
   spirit (or hold extra rows) while `coversTemplate()` flips to false,
   showing "Engineer: off" for a member who was granted Engineer.

5. **Refresh behavior.** After Grant/Remove,
   `handleToggleRole` calls `refreshRoles()`, which re-queries both
   templates and `entity_permissions`. There is no stale local cache of
   role state and no divergence between Team Hub and other consumers:
   `AuthorizationProvider` (`src/lib/tenant/contexts.tsx`) reads the same
   `entity_permissions` table for the active entity. Confirmed: the
   problem is not a stale-state refresh bug; it is a
   representation problem — a coverage heuristic displayed as a binary
   role state.

6. **Scope confusion inside the same panel.** The panel header reads
   "Roles & Access · {active company}". The member list above it is
   workspace-wide. Grant/Remove acts on the active company only. A member
   with Engineer in Company A shows "off" rows when Company B is active.
   The UI states this only in a small caption ("Shows effective access for
   this company").

7. **Reload behavior.** The mismatch persists after reload because it is
   computed the same way on every load; it is not a transient state.

8. **Terminology contribution.** The UI calls these "Roles" with
   on/off-style badges and Grant/Remove actions. Per PRD §3.11 a role has
   no authority of its own; what is displayed is *effective permission
   coverage on the active company*. The label "Role" plus an on/off visual
   implies a stored, toggleable assignment, which does not exist in the
   data model.

### 2.6 Duplicated or conflicting concepts

- Two switchers (workspace vs company) with parallel row UIs in one group.
- Two "Company …" sections with different actions.
- Two "Document …" preference sections.
- Team duplicates part of Company Management's governance story (roles are
  assigned per company, but company and team surfaces never cross-link).
- `admin` section id, `AdminSettingsSection` alias, and the
  `active === 'admin' ? 'team'` mapping in `Settings.tsx` are leftover
  IA concepts.
- Role grant surface exists only inside Team; Company Management (the
  company being granted on) has no entry point to it.

---

## 3. User Impact

- A user who wants to change their invoice number prefix opens
  Preferences, not "the company", and cannot predict that the change
  affects only the currently active company.
- A user who wants to edit the business name must choose between
  "Company Management" and "Company Info" — two labels that differ by one
  word and neither says "edit details" or "switch company".
- A user looking for colleagues, invites, or roles opens Workspace or
  Account first; Team under System is a discovery dead end.
- A workspace owner granting a role sees an "off" state for a member who
  holds the role's permissions, concludes the grant failed, and either
  re-grants (harmless) or distrusts the screen (harmful).
- Multi-company owners cannot see, from Team, which company's roles they
  are editing without reading a small caption; wrong-company grants are a
  realistic mistake.
- Nothing in Settings communicates the Workspace → Company containment
  that the tenancy model is built on.

---

## 4. Recommended Information Architecture

Recommendation (3-scope model, matching PRD v2.1 §2 boundaries: workspace
= who can access; entity = which business):

```
ACCOUNT (user-scoped)
  Profile & Security      — password, signed-in email, device hydration
  Notifications           — per-user alert preferences
  App Appearance          — theme preset + light/dark/system (user-scoped part)
  Dashboard Layout        — KPI tiles (local, user device)

WORKSPACE (workspace-scoped)
  Switch Workspace        — active workspace pick + pending invitations
  Team                    — members, invitations, ownership transfer
  Devices                 — workspace device administration (owner)

COMPANY (company/entity-scoped, acts on the ACTIVE company)
  Switch Company          — pick active company, create, archive/restore
  Business Information    — legal name, address, contacts, custom fields
  Logo & Branding         — logo + PDF footer
  Banking                 — receiving accounts
  Signatories             — authorized signers
  Document Numbering      — prefixes
  Document Controls       — fillable-writing toggles
  Archives                — company data lifecycle

SYSTEM (platform/operator-scoped)
  Tenant Debug            — operator diagnostics only
```

Rules the future model must keep:

- Every section names its scope by the group it sits in; no section
  straddles two scopes. The user-scoped part of Theme moves to Account;
  the entity-scoped custom colors either move to a company section or
  are explicitly labeled as company-wide.
- One switcher per scope, named "Switch …", placed first in its group.
- Company lifecycle (create/archive/restore) lives in the company
  switcher section because it operates on the company list, not on one
  company's data.
- The active company must be visible whenever a company-scoped section is
  open (the shell already shows a workspace+company context card;
  company-scoped sections should inherit it).
- If a different grouping is chosen, keep this invariant: grouping must
  match the persistence scope of each section's data (auth/users,
  public-schema workspace tables, entity-schema tenant tables, device
  local storage, platform diagnostics).

Alternative considered and rejected: keeping 4 groups and only renaming.
Rejected because the misplacement is scope-based, not cosmetic; renaming
alone leaves company-scoped items under Preferences and Team under
System.

---

## 5. Naming Recommendations

| Current | Recommended | Reason |
|---|---|---|
| Company Management | **Switch Company** (or "Companies") | It switches, creates, archives. "Management" says none of that. Grouping it under COMPANY already says "company". |
| Company Info | **Business Information** | Removes the second "Company" prefix; "Business" matches the field copy ("Legal Business Name") users already see. |
| Team | **Team** (keep), placed under WORKSPACE | Membership data is workspace-scoped. Company role grants become an explicit sub-surface labeled "Roles in {company}". |
| Document Prefixes | **Document Numbering** | "Prefixes" is engineering vocabulary; "numbering" matches the user goal (what numbers my documents get). |
| Document Controls | **Fillable Writing** (or merge into Document Numbering under one "Documents" section) | The section only toggles fillable writing today. |
| Banking (inner header) | Fix typo: "Payment Destinantions" → "Payment Destinations" | Cosmetic but user-visible. |
| Devices | **Devices** (keep), under WORKSPACE | `device_installations` is workspace-wide; owner-only. |

Do not retain two sections whose names both start with "Company" unless a
future capability genuinely merges them.

---

## 6. Team Hub Findings (summary for the implementation ticket)

- Authoritative state: `entity_permissions` rows per (entity, user,
  resource, action). No assignment table exists; roles are labels over
  templates (PRD v2.1 §3.6, §3.11).
- Display state: `coversTemplate(effectiveByUser.get(userId), template)` —
  a coverage heuristic over effective pairs on the ACTIVE entity.
- Confirmed defect class: coverage ≠ assignment. Overlapping grants,
  template edits after assignment, or pre-fix expanded rows make the
  binary display wrong in both directions (shows off when covered by
  other sources; shows on when covered by a superset from other roles).
- Not a refresh bug: `refreshRoles()` re-queries both sources; the
  mismatch survives reload.
- Likely UI boundary for the future fix (product level):
  1. Stop presenting template coverage as a stored on/off role toggle, or
  2. Persist an explicit assignment record (template_id + entity + user)
     for display, while `entity_permissions` stays the authorization
     engine (PRD-compliant: templates remain conveniences), or
  3. Rename the surface to "Access in {company}" and show the member's
     effective ability list per resource, removing the role on/off
     metaphor.
- Terminology fix is part of any option: "Roles & Access" + Grant/Remove
  implies stored role rows; the data model has none.
- Any fix must keep the RPCs
  (`assign_role_to_company_member`, `remove_role_from_company_member`)
  authoritative and must not weaken the delegation ceiling.

Out of scope here: implementing any of the three options.

---

## 7. Future Implementation Scope (product/UX level)

A future implementation agent should:

1. Rebuild `settings-config.ts` group structure to the 4-scope model in
   §4 (Account, Workspace, Company, System), preserving every current
   capability listed in
   `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/wireframes/settings-live-wireframe.md`.
2. Rename the sections in §5 and remove the `admin` → `team` alias layer.
3. Add explicit active-company context to every company-scoped section.
4. Re-home the user-scoped part of Theme & Appearance and decide the
   company-scoped custom colors' home.
5. Restructure Team's role panel per §6 (choose option 1, 2, or 3 there).
6. Update mobile drill-down and desktop sidebar ordering to match the new
   groups.
7. Update the Settings-related PRD sections (ERP Frontend PRD v1.5 §12.9
   navigation note) if navigation placement changes.
8. Verify no regression: all 17 current sections must remain reachable,
   with identical persistence targets.

No code, migration, or data change belongs to this ticket.

---

## 8. Out of Scope

This audit does not change and must not trigger changes to:

- permissions, role definitions, or the permission model
- RLS policies
- workspace lifecycle (create/approve/archive/purge)
- company/entity lifecycle or provisioning
- tenant provisioning or schema management
- PostgREST configuration
- database structure (no migration)
- unrelated application UI outside Settings
- invitation semantics, expiry, or the two-level administration model

---

## 9. Evidence

Repository files inspected (read in full or in relevant part):

| File | What it established |
|---|---|
| `src/pages/Settings.tsx` | Section rendering, `admin`→`team` mapping, workspace+company context card |
| `src/pages/settings/settings-config.ts` | Groups, order, labels, gating (`adminOnly`, `operatorOnly`) |
| `src/pages/settings/index.ts` | Exports incl. `AdminSettingsSection` alias |
| `src/pages/settings/AdminSettingsSection.tsx` | Team Hub: members, invitations, role grant/remove, `coversTemplate` usage, `refreshRoles()` |
| `src/pages/settings/CompanyManageSection.tsx` | Entity switch/create/archive/restore, workspace context header |
| `src/pages/settings/CompanySettingsSection.tsx` | Company Info fields, entity `settings` persistence |
| `src/pages/settings/WorkspaceSwitchSection.tsx` | Workspace pick + pending invitation accept |
| `src/pages/settings/BankingSettingsSection.tsx` | `tenantClient` scope; "Payment Destinantions" typo |
| `src/pages/settings/BrandingSettingsSection.tsx` | Logo + footer persistence target |
| `src/pages/settings/SignatoriesSettingsSection.tsx` | Signatory CRUD scope |
| `src/pages/settings/AppThemeSettingsSection.tsx` | Mixed user/entity persistence (`saveThemePref` vs `saveSettings`) |
| `src/pages/settings/DashboardSettingsSection.tsx` | Local KPI storage |
| `src/pages/settings/DocumentsSettingsSection.tsx` | `document_fillable_settings` in entity settings |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | `document_prefixes` in entity settings |
| `src/pages/settings/ArchivesSettingsSection.tsx` | Tenant-scoped archive restore across 7 tables |
| `src/pages/settings/DeviceSettingsSection.tsx` | `device_installations` workspace scope |
| `src/pages/settings/SecuritySettingsSection.tsx` | Device-only biometric lock |
| `src/pages/settings/UserSettingsSection.tsx` | Password + device hydration |
| `src/pages/settings/NotificationSettingsPage.tsx` | Per-user notification panel |
| `src/components/settings/SettingsShell.tsx` | Responsive nav, auto-select, context card placement |
| `src/components/settings/SettingsNav.tsx` | Group rendering |
| `src/hooks/usePermissionTemplates.ts` | `coversTemplate()` coverage heuristic; two-query read boundary |
| `src/hooks/useTeamMembers.ts` | `workspace_members` + `profiles` read |
| `src/hooks/useTeamInvitations.ts` | Pending invitation read |
| `src/hooks/useSettings.js` | Entity-keyed settings cache; tenant-scoped read/write |
| `src/lib/tenant/contexts.tsx` | WorkspaceProvider/EntityProvider/AuthorizationProvider; same `entity_permissions` source |
| `src/lib/tenant/settingsCache.ts` | Per-schema settings cache keys |
| `src/domain/tenant/tenantCreation.ts` | `assignRoleToCompanyMember`, `removeRoleFromCompanyMember`, ownership transfer, entity archive/restore RPC wrappers |

PRD/design sources inspected:

| Document | What it established |
|---|---|
| `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` | Tenancy hierarchy (§2), action-based authorization (§3), templates-as-convenience (§3.6), roles model (§3.11), entity lifecycle (§8A) |
| `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` §12.8–§12.9 | Teams UX two scopes; navigation placement is a frontend decision; scopes must stay visibly distinct |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/wireframes/settings-live-wireframe.md` | Full 17-section inventory and persistence targets (observed, not proposed) |
| `docs/reports/multi-tenancy/engineer-permission-matrix-audit-2026-09-14.md` | Confirms expanded rows persist after template fix until reassignment; canonical resource/action lists |
| `docs/tickets/pending-migrations-push.md` | Ticket naming/format convention reference |

---

## 10. Acceptance Criteria for Future Implementation

The future redesign is done when all of the following hold:

1. Settings categories match data scope: Account, Workspace, Company,
   System (or an alternative that provably maps 1:1 to persistence scope).
2. Workspace and Company groups are visibly distinct; every
   company-scoped section shows which company it acts on.
3. Company switching/management and company information are separate
   sections with unambiguous names (no shared "Company …" prefix pair).
4. Team lives in the Workspace group; per-company role surfaces are
   explicitly labeled with the company name.
5. All section labels pass a "predict-the-contents" reading; no two
   labels differ by one generic word.
6. Category and section ordering follows the model in §4 or a documented
   equivalent.
7. Team Hub reflects authoritative role state: the displayed state never
   contradicts `entity_permissions`, and the on/off metaphor is either
   backed by an assignment record or replaced by effective-access display.
8. No regression: all existing Settings capabilities remain reachable and
   keep their persistence targets; `bun run audit:load`,
   `bun run typecheck`, and `bun run test` pass after implementation; any
   schema change follows the AGENTS.md migration push rule.
