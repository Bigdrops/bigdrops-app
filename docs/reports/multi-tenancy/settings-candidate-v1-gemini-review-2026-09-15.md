# Settings Candidate v1-gemini Review Report

This report was written by Buffy on 2026-09-15 via Freebuff.

---

## Objective

Review `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/settings/New-settings-candidate-v1-gemini.html` (Team Hub & Access Manager v5.3, Settings Embedded) against:

- `docs/tickets/settings-information-architecture-ux-redesign.md` (IA audit ticket).
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` §3.4, §3.6, §3.10, §3.11 (permission and role model).
- `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` §12.8–§12.9 (Role Builder and Teams UX rules).
- `docs/reports/multi-tenancy/engineer-permission-matrix-audit-2026-09-14.md` (canonical resource/action matrix).
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/00-index.md` and the settings live wireframe (locked design system, 17-section inventory).

This task is a review. It changes no product code, no SQL, and no PRD.

## Scope

- One design candidate HTML file, read in full.
- The four context documents above.
- Spot checks in `src` and `supabase/migrations` to confirm which candidate features exist in code today.
- No migration. No push. No UI implementation.

## Verdict

The candidate is the strongest settings IA artifact so far. It adopts every naming fix from the IA ticket and preserves all 17 current capabilities. It fails 3 group-placement rules from the ticket, and its permission vocabulary does not match the canonical resource × action model. It adds suspension and banish features that have no backend. Do not implement it as drawn without the corrections in this report.

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Files changed

- `docs/reports/multi-tenancy/settings-candidate-v1-gemini-review-2026-09-15.md` (new, this report).

## Changes made

None outside this report.

---

## 1. IA and naming versus the audit ticket

### 1.1 Group structure as drawn

| Candidate group | Sections |
|---|---|
| Account | Profile & Security, Notifications |
| Workspace | Switch Workspace, Team Hub, Switch Company, Devices |
| Company | Business Information, Logo & Branding, Payment Destinations, Signatories, Document Numbering |
| Preferences | Theme & Appearance, Dashboard Layout, Document Controls |
| System | Archives, Tenant Debug |

### 1.2 Conformity with ticket §4

| Item | Ticket rule | Candidate | Status |
|---|---|---|---|
| Team placement | Workspace group | Workspace group | CORRECT |
| Devices placement | Workspace group | Workspace group | CORRECT |
| Tenant Debug | System only | System only | CORRECT |
| One switcher per scope, first in its group | Switch Company first in COMPANY | Switch Company sits in WORKSPACE | DEVIATION |
| Company lifecycle in switcher section | Create/archive/restore in Switch Company | Not visible (stub-level detail) | UNRESOLVED |
| Archives scope | Company group (tenant-scoped data) | System group | DEVIATION |
| Document Controls scope | Company group (entity `settings` persistence) | Preferences group | DEVIATION |
| Theme user-scoped part | Account group | Preferences group (stub) | DEVIATION |
| Dashboard Layout | Account group (local, per device) | Preferences group | MINOR DEVIATION |
| Notifications | Account group | Account group | CORRECT |

The ticket states the invariant: grouping must match the persistence scope of each section's data. Document Controls persists `document_fillable_settings` to the entity `settings` row through `tenantClient`. Archives queries 7 tenant tables through `tenantClient`. Both violate the invariant in the candidate.

### 1.3 Naming

All five ticket recommendations are adopted:

| Ticket recommendation | Candidate label | Status |
|---|---|---|
| Switch Company | Switch Company | ADOPTED |
| Business Information | Business Information | ADOPTED |
| Document Numbering | Document Numbering | ADOPTED |
| Fix "Payment Destinantions" typo | Payment Destinations (full rename) | ADOPTED, goes further than the ticket |
| Team under Workspace, keep label | Team Hub | ADOPTED with a label change |

Notes:

- "Team Hub" versus "Team": the codebase section is `team`, ERP PRD §12.9 calls the surface Teams. Pick one label before implementation. "Team" is the lower-cost choice.
- The two worst labels from the audit ("Company Management" / "Company Info") are gone. No two labels now differ by one generic word. PASS on ticket §10 criterion 5.
- The candidate renames "Banking" to "Payment Destinations". This is clearer but changes a label the ticket did not ask to change. Confirm the rename is wanted.

### 1.4 Capability preservation

The candidate preserves all 17 sections from `settings-live-wireframe.md`. Company Management merges into Switch Company, which the ticket recommends. All other sections appear, mostly as stubs. Two implementation requirements are not visible at stub level and must not be lost:

- Switch Company must include create, archive, and restore flows.
- Theme & Appearance must keep both scopes: user preset/mode and company custom colors, explicitly labeled.

---

## 2. Permission model versus PRD v2.1 and the matrix audit

### 2.1 Ability vocabulary does not exist in the system

The candidate's role editor defines these abilities:

`view_docs, edit_docs, dispatch, inventory, reports, invite, access, settings`

The canonical model (PRD v2.1 §3.4, confirmed by the 2026-09-14 matrix audit) is resource × action:

- Actions: `view`, `create`, `edit`, `delete`. No others exist in RLS, templates, seeders, or RPC gates.
- Resources: invoice, quotation, payment, receipt, `setting`, waybill, boq, rfq, csr, item, project, project_document, client, signatory, bank_account, letter, tax_setting, account, period, journal, source_transaction, audit, device.

Mismatch class by class:

| Candidate ability | Closest system concept | Problem |
|---|---|---|
| `dispatch` | none | No approve/dispatch action exists anywhere in code. The matrix audit explicitly excluded extended actions. |
| `inventory` | resource `item` | Wrong name; `item` covers stock records. |
| `reports` | none (resource-level `view`) | Reports visibility derives from `view` on accounting resources (account, period, journal), not a separate ability. |
| `invite`, `access`, `settings` | workspace_members.permissions toggles and resource `setting` | These are workspace governance toggles and company settings, not template abilities. Mixing them into role bundles breaks the two-scope rule in §12.9. |

A role built in the candidate's editor cannot round-trip to `permission_template_items` rows. This is the largest correction the candidate needs.

### 2.2 Engineer template regression risk

The candidate's Engineer template holds `view_docs, dispatch, inventory`. This drops create and edit on invoice and quotation — exactly the four pairs the 2026-09-14 audit added after confirming the omission broke the BOQ → RFQ → CSR → Waybill → Quotation → Invoice chain. Any designer or implementer copying this template regresses the matrix. The correct Engineer set is:

- (`*`, view)
- create + edit on project, waybill, boq, rfq, csr, item, invoice, quotation
- no delete anywhere

### 2.3 Role Builder UX gaps versus ERP PRD §12.8

| §12.8 requirement | Candidate | Status |
|---|---|---|
| Create, edit, duplicate, delete roles | Present | PASS |
| Name and describe a role | Present | PASS |
| Toggle abilities within a bundle | Present, wrong vocabulary | FAIL (see 2.1) |
| Preview exact `entity_permissions` rows the role expands into | Absent | FAIL |
| MARK ALL per category with Include Delete / Exclude Delete confirm | Absent | FAIL |
| None / Partial / All per-category indicator | Absent | FAIL |
| Abilities beyond the user's ceiling shown disabled | Absent | FAIL |
| Assign to existing company members only | Give/Take per company, member-gated | PASS in spirit |

The missing preview is the most important gap. It is the only control that shows a role is a convenience over expanded rows, which is the core mental model of §3.6 and §3.11.

### 2.4 Role display state

The candidate shows role chips per member and Give/Take per company ("Roles in {company}"). This matches §12.9's two-scope rule and keeps scopes visibly distinct. But the displayed state still implies a stored assignment. The data model has only expanded `entity_permissions` rows. The IA ticket §6 documents this exact defect (`coversTemplate()` coverage shown as on/off). The candidate re-presents the same metaphor with better visuals and does not resolve the defect. Any implementation must pick one of the ticket's three options; the candidate's Give/Take buttons map cleanly to `assign_role_to_company_member()` / `remove_role_from_company_member()`, so option 1 or 3 (drop the on/off metaphor) is the safer path.

### 2.5 Invite-time grants

The invite sheet says "Grant access in {company} (optional)" with role checkboxes. PRD §3.10 and §3.11 state invitations carry entity grants, never role payloads; role assignment is a separate post-acceptance step. Two readings:

- If the checkboxes create `workspace_invitation_entity_grants` rows, the design is compliant.
- If they create role assignments at accept time, it violates §3.11.

Resolve this before implementation. Recommended: label the picks "Access grants", not roles, and keep role assignment post-acceptance.

---

## 3. Features with no backend

| Candidate feature | Backend status |
|---|---|
| Member suspension, 1/7/30 day duration, restore | Does not exist. No table, no RPC, no UI. Only workspace-level `status = 'suspended'` exists (§6, workspaces table). |
| "Banish" with undo snackbar | Member removal exists in Team flows. The rename, the stronger copy, and undo-after-removal are new. |
| Ownership transfer | Exists (PRD §3.2, `src/domain/tenant/tenantCreation.ts`). Candidate matches, including single-owner invariant and self-protection. |
| Invitation expiry date display | Matches §4 `expires_at` lifecycle. |
| Workspace-wide membership + per-company roles | Matches §3.11 and §12.9. |
| Role deletion gated on zero holders | Stricter than the PRD. §3.11 permits deleting a role with holders (expanded rows survive). The stricter gate is safe but is a product decision, not a rule. |
| Custom role editing, duplication | Matches §12.8 create/edit/duplicate. Edit semantics stay deferred per §20. |

Suspension is the largest new scope item. It needs a schema decision (column or table), RPCs, RLS review, and an expiry job. It is a multi-tenancy change, not a facelift.

---

## 4. Design system conformity

| Locked rule | Candidate | Status |
|---|---|---|
| Palette: slate-navy, light `#f0f4f8`/`#1e3a5f`, dark `#0f172a`/`#60a5fa` | Exact match | PASS |
| Manrope + DM Mono | Exact match | PASS |
| 44px-class touch targets | Present (`min-height: 44px` rows) | PASS |
| Safe-area handling | `env()` insets on top, bottom, sheets | PASS |
| Reduced motion | `prefers-reduced-motion` kill switch | PASS |
| Focus visibility | `:focus-visible` outline | PASS |
| Device shell at 430px on wide screens | Matches v6 dashboard pattern | PASS |
| Sheets: grab handle, scrim, escape dismiss | Present | PASS |

No theme changes layout, per the theme power matrix. PASS.

---

## 5. Required corrections before implementation

1. Rebuild the ability picker on resource × action. Drop `dispatch`, `inventory`, `reports`. Move workspace toggles (invite, member governance) out of role bundles into the workspace scope where they already live.
2. Restore the four Engineer pairs: (invoice, create), (invoice, edit), (quotation, create), (quotation, edit).
3. Move Document Controls to the Company group, and Archives to the Company group, per the persistence-scope invariant.
4. Move Switch Company to the top of the Company group. Show create/archive/restore in the section.
5. Resolve Theme & Appearance split: user-scoped part to Account; company custom colors labeled company-wide.
6. Add the §12.8 Role Builder controls: row preview, MARK ALL with delete confirmation, None/Partial/All indicators, ceiling-disabled abilities.
7. Decide the role-display option from IA ticket §6 before building Give/Take UI.
8. Label invite-sheet picks as access grants, or move role picking to post-acceptance.
9. Confirm "Team Hub" versus "Team" and "Payment Destinations" versus "Banking".
10. Scope suspension and banish as a separate multi-tenancy task with schema, RPC, and RLS work. Do not bundle them into the facelift.

---

## Verification result

- `bun run audit:load`: passed (warnings only, all pre-existing).
- `bun run typecheck`: skipped. The user directed the skip. This task changed documentation only. No TypeScript file was touched.
- `git status`: this report added; all other modified and untracked files are pre-existing from other agents and untouched.
- `supabase db push`: not applicable (no SQL changed).
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- This review judges the candidate file as drawn. Stub rows hide section internals, so some judgements (Switch Company lifecycle, Theme split) are provisional until those sections are designed.
- The working tree contains a deletion of `settings-redesign-candidate-v4-android.html` made by another agent. This report does not assume the deletion is final and does not touch it.
- Live database state was not queried. Backend-existence claims come from code search and prior audit reports.

## Deferred work

- Correction of the candidate HTML itself, if the project lead accepts this review.
- The suspension/banish schema task (§3 above).
- The role-display option decision from IA ticket §6.
- PRD §3.4.1 spelling alignment (`settings` versus `setting`), carried from the 2026-09-14 audit.
