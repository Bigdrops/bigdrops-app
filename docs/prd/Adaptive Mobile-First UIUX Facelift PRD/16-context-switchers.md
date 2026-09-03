# Context Switchers — Company & Workspace

> Status: Specified
> Last updated: 2026-08-29
> Implements: Multi-tenancy PRD §10.7 switcher placement decisions
> Depends on: `05-navigation-shell.md` (drawer), `15-interaction-model.md` (Android patterns), `03-design-system.md` (tokens), `04-theme-system.md` (colour), `11-accessibility.md` (a11y)

---

## 0. Purpose

Define the UX specification for the Company Switcher and Workspace Switcher in the BIGDROPS Adaptive Mobile-First UI/UX Facelift.

This document translates the architectural decisions from the multi-tenancy PRD (`docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md`) into the facelift design language and navigation experience.

This document does NOT modify the multi-tenancy PRD. Its architectural decisions are treated as constraints.

---

## 1. Architectural Constraints (Reference Only)

The multi-tenancy PRD establishes these constraints. This UX specification must obey them.

| Constraint | Source | Effect on UX |
|------------|--------|--------------|
| A workspace can contain multiple companies | Multi-tenancy §10.7 | Company list is scoped to the active workspace |
| A user can belong to multiple workspaces | Multi-tenancy §10.6 | Workspace list is scoped to the current user |
| One workspace is active at a time | Multi-tenancy §10.6 | Workspace Switcher changes the active workspace |
| One company is active inside the active workspace | Multi-tenancy §10.7 | Company Switcher changes the active company |
| Workspace resolution precedes entity resolution | Multi-tenancy §7, Principle 3 | Changing workspace may change available companies |
| Entity Provider owns active company context | Multi-tenancy §10 | Switcher UI consumes provider state; it does not own state |
| Workspace Provider owns active workspace context | Multi-tenancy §10 | Switcher UI consumes provider state; it does not own state |
| UI surfaces consume provider state | Multi-tenancy §6 | Switcher UI reads from providers; it does not resolve schemas |
| UI must not independently resolve tenant context or schemas | Multi-tenancy §6, Invariant 5 | Switcher UI never queries tenant schemas |
| Workspace switching is a Settings-level concern | Multi-tenancy §10.7 | Workspace Switcher lives in Settings |
| Company switching is a navigation concern | Multi-tenancy §10.7 | Company Switcher lives in the mobile drawer |
| Phase 1 activates one workspace per session | Multi-tenancy §10.6 | Switcher UI is future work; this spec prepares for it |

These constraints are not renegotiable in this document.

---

## 2. Conceptual Distinction

Workspace and Company are different concepts. The UI must not collapse them into a single selector.

| Concept | Level | What It Represents | Location |
|---------|-------|-------------------|----------|
| Workspace | Higher | Organisational context (a group of companies) | Settings |
| Company | Lower | Active operational/business context | Navigation drawer |

**Workspace** answers: "Which organisation am I working inside?"

**Company** answers: "Which business am I operating right now?"

The interface must make this distinction visible through placement, labelling, and visual weight. A user must not conclude that "workspace" and "company" are two names for the same thing.

---

## 3. Information Hierarchy

The hierarchy is fixed:

```
USER
 │
 ├── WORKSPACE (active)
 │      │
 │      ├── COMPANY A
 │      ├── COMPANY B
 │      └── COMPANY C
 │
 └── OTHER WORKSPACES
        │
        ├── COMPANY X
        └── COMPANY Y
```

At any moment, exactly one workspace and one company are active. The active company belongs to the active workspace. A company cannot be selected independently of the active workspace.

The interface must communicate both active states without overwhelming the user.

---

## 4. Company Switcher — Drawer Placement

### 4.1 Location

The Company Switcher is a primary navigation-level context control. It lives in the left-hand hamburger side drawer, not in Settings.

Rationale: changing the active company is part of normal daily ERP navigation. Burying it in Settings would add friction to a frequent action.

The drawer structure is owned by `05-navigation-shell.md`. The Company Switcher occupies the region between the brand area and the navigation rows.

### 4.2 Drawer Region Map

```
┌──────────────────────────────┐
│ BRAND AREA                   │
│ [mark] BIGDROPS              │
│         subtitle             │
├──────────────────────────────┤
│ COMPANY SWITCHER REGION      │
│                              │
│ Current Company          ›   │
│ Sun & Shield Power Solutions │
├──────────────────────────────┤
│ NAVIGATION ROWS              │
│ Dashboard                    │
│ Invoices                     │
│ Quotations                   │
│ Projects                     │
│ ...                          │
├──────────────────────────────┤
│ FOOTER                       │
│ user avatar + name + role    │
└──────────────────────────────┘
```

### 4.3 Company Switcher Row

The Company Switcher row sits directly below the brand area and above the navigation rows. A divider separates it from both.

| Property | Value |
|----------|-------|
| Role | Button (`<button>`) |
| Touch target | Minimum 44×44px (per `11-accessibility.md`) |
| Padding | 10px 12px (matches `--space-lg` / `--space-xl`) |
| Border radius | 12px |
| Background | `var(--surface-muted)` — visually distinct from navigation rows |
| Layout | Flex, space-between |
| Left content | Label + company name (see below) |
| Right content | Chevron icon (`ChevronRight`, 17×17px, `var(--ink-3)`) |
| Ripple | Yes — per `15-interaction-model.md` §1 |
| Active state (tap) | `scale(0.965)` + `var(--surface-strong)` background |

### 4.4 Company Switcher Row Content

```
┌──────────────────────────────┐
│  CURRENT COMPANY         ›   │
│  Sun & Shield Power Solutions│
└──────────────────────────────┘
```

| Element | Typography | Token Reference |
|---------|-----------|-----------------|
| Label "CURRENT COMPANY" | 7px, 800 weight, uppercase, 0.075em letter-spacing, `var(--ink-3)` | Matches workspace label in `03-design-system.md` |
| Company name | 13px, 800 weight, -0.045em letter-spacing, `var(--ink)` | Matches owner name in `03-design-system.md` |
| Chevron | 17×17px, `var(--ink-3)` | Matches top bar icon size |

The label and company name reuse the existing type scale. No new typography tokens are introduced.

### 4.5 Behaviour

- Tapping the Company Switcher row opens the Company Selection Surface (§5).
- The drawer remains open underneath the selection surface.
- The current company is always displayed in the row, even when only one company exists.
- When only one company exists, the chevron may be hidden and the row may be non-interactive (see §7.1).

### 4.6 Relationship to Brand Area

The brand area shows the BIGDROPS brand mark and name. The Company Switcher row sits below it. The brand area identifies the application. The Company Switcher row identifies the active business context.

These are separate regions. The Company Switcher must not replace or merge with the brand area.

### 4.7 Relationship to Navigation Rows

Navigation rows (Dashboard, Invoices, etc.) sit below the Company Switcher row. A divider separates the two regions.

The Company Switcher row uses `var(--surface-muted)` background. Navigation rows use transparent background with `var(--primary-soft)` on active. This visual difference distinguishes context control from navigation.

---

## 5. Company Selection Experience

### 5.1 Flow

```
Side Drawer (open)
    ↓
Tap Current Company row
    ↓
Company Selection Surface (bottom sheet)
    ↓
Select Company
    ↓
Return to drawer with new company context
```

### 5.2 Selection Surface

The Company Selection Surface is a bottom sheet. It follows the bottom sheet specification in `05-navigation-shell.md` and the interaction model in `15-interaction-model.md` §2.

| Property | Value | Source |
|----------|-------|--------|
| Surface type | Bottom sheet (`vaul` `Drawer`) | `15-interaction-model.md` §2 |
| Max height | 78% | `05-navigation-shell.md` |
| Border radius | 24px 24px 0 0 | `05-navigation-shell.md` |
| Background | `var(--surface)` | `05-navigation-shell.md` |
| Shadow | `0 -16px 40px rgba(0,0,0,.24)` | `05-navigation-shell.md` |
| Transform (closed) | `translateY(106%)` | `05-navigation-shell.md` |
| Transform (open) | `translateY(0)` | `05-navigation-shell.md` |
| Transition | 0.3s cubic-bezier(.2,.9,.24,1) | `05-navigation-shell.md` |
| z-index | 43 (above drawer at 42) | `05-navigation-shell.md` |
| Drag handle | 34×3px, `var(--surface-strong)` | `15-interaction-model.md` §2 |
| Scrim | `rgba(14,12,10,.38)` + `blur(2px)` | `05-navigation-shell.md` |
| Swipe-to-dismiss | Yes (velocity-aware snap) | `15-interaction-model.md` §2 |
| Focus trap | Yes (`vaul` handles `aria-modal`, focus trap, scroll lock) | `15-interaction-model.md` §2 |

### 5.3 Selection Surface Content

```
┌──────────────────────────────┐
│  grab handle                 │
├──────────────────────────────┤
│  Switch Company          [×] │
│  Select the company to work  │
│  in.                         │
├──────────────────────────────┤
│  [icon] Sun & Shield Power  ✓│
│         Solutions             │
│  ──────────────────────────  │
│  [icon] Shield Energy Ltd     │
│  ──────────────────────────  │
│  [icon | +] Add Company       │
└──────────────────────────────┘
```

| Element | Spec |
|----------|------|
| Sheet title | "Switch Company" — 17px, 800 weight, -0.05em, `var(--ink)` (sheet title from `03-design-system.md`) |
| Sheet description | "Select the company to work in." — 9px, 700 weight, `var(--ink-3)` |
| Close button | 28×28px, 50% radius, `var(--ink-3)` (dismiss button from `03-design-system.md`) |
| Company row | Same structure as sheet action item (`06-component-patterns.md`) |
| Company row padding | 8px (8px 8px 8px 10px) |
| Company row radius | 14px |
| Company icon | 34×34px, `var(--primary-soft)` background, `var(--primary)` color |
| Company name | 11px, 800 weight, -0.025em, `var(--ink)` (activity primary from `03-design-system.md`) |
| Selected indicator | Check icon (`Check`, 13×13px, `var(--primary)`) on the right |
| Row divider | `1px solid var(--line)` between rows |
| Row tap | Ripple per `15-interaction-model.md` §1, `var(--surface-muted)` active background |

### 5.4 Company Row — Selected State

The currently active company has a visible selected state:

| Property | Selected | Unselected |
|----------|----------|------------|
| Check indicator | Visible (`Check` icon, `var(--primary)`) | Hidden |
| Row background | `var(--primary-soft)` | `var(--surface)` |
| Company name color | `var(--primary)` | `var(--ink)` |
| Icon background | `var(--primary)` with `var(--bg)` icon | `var(--primary-soft)` with `var(--primary)` icon |

Color is not the only indicator. The check icon provides a non-color signal. This satisfies the color independence rule in `11-accessibility.md`.

### 5.5 Selection Action

1. User taps a company row.
2. The sheet closes (slides down).
3. The active company context updates through the Entity Provider.
4. The drawer updates to show the new company name in the Company Switcher row.
5. Navigation state refreshes to reflect the new company context.

The visual feedback is immediate. The company name in the drawer updates before the sheet close animation completes if possible.

### 5.6 Add Company Entry

The selection surface may include an "Add Company" entry point at the bottom of the company list. This entry point links to the existing company creation flow (multi-tenancy §12.2). It is not part of the switcher itself. It is a navigation shortcut to an existing flow.

The "Add Company" row is visually distinct from company rows:

| Property | Value |
|----------|-------|
| Icon | `Plus` icon, 34×34px, `var(--surface-muted)` background, `var(--ink-3)` color |
| Label | "Add Company" — 11px, 800 weight, `var(--ink-3)` |
| Row background | `var(--surface)` |
| No check indicator | Yes |

### 5.7 Company Metadata

If company metadata is available and useful, the design may display supporting information in each row. Do not invent backend fields to make the design look richer. The user is selecting a context, not managing companies.

Acceptable metadata (if already available from the provider):
- Company type (e.g. "Limited", "Sole Proprietor")
- Company initials as the icon fallback

Do not display:
- Financial data
- User counts
- Permission details
- Provisioning status (unless the company is not `ready`)

---

## 6. Workspace Switcher — Settings Placement

### 6.1 Location

The Workspace Switcher is a Settings-level context control. It lives within Settings, not in the primary navigation drawer.

Rationale: workspace switching is infrequent. It changes the organisational context and may change the available companies. It belongs in Settings because it is a configuration-level action, not a daily navigation action.

### 6.2 Settings Hierarchy

The Workspace Switcher sits at the top of the Settings hierarchy, above company-related settings:

```
Settings
│
├── Workspace
│   └── Switch Workspace
│
├── Company
│   └── Company-related settings
│
└── Other Settings
```

Workspace is listed first because it is the higher-level context. Changing workspace may change which companies are available. This ordering reflects the resolution hierarchy: workspace precedes entity.

### 6.3 Workspace Row in Settings

| Property | Value |
|----------|-------|
| Role | Button (`<button>`) or settings row |
| Touch target | Minimum 44×44px |
| Padding | 10px 12px |
| Border radius | 12px |
| Background | `var(--surface)` |
| Layout | Flex, space-between |
| Left content | Label + workspace name |
| Right content | Chevron icon (`ChevronRight`, 17×17px, `var(--ink-3)`) |
| Ripple | Yes |

```
┌──────────────────────────────┐
│  WORKSPACE               ›   │
│  BIGDROPS Group              │
└──────────────────────────────┘
```

| Element | Typography |
|---------|-----------|
| Label "WORKSPACE" | 7px, 800 weight, uppercase, 0.075em, `var(--ink-3)` |
| Workspace name | 13px, 800 weight, -0.045em, `var(--ink)` |

This matches the Company Switcher row typography. Consistency between the two switcher rows helps the user recognise them as context controls.

### 6.4 Company Context in Settings

Settings may also display the current company context. This is a secondary exposure point for the active company (see §8). It does not own company state. It reads the same provider state as the drawer Company Switcher.

The Company section in Settings shows company-related settings. It is not a second Company Switcher. If company switching is offered from Settings, it uses the same Company Selection Surface as the drawer (§5).

---

## 7. Workspace Selection Experience

### 7.1 Flow

```
Settings
    ↓
Workspace
    ↓
Workspace Selection Surface (bottom sheet)
    ↓
Select Workspace
    ↓
Resolve valid company context
    ↓
Return to Settings with new workspace + company context
```

### 7.2 Workspace Selection Surface

The Workspace Selection Surface is a bottom sheet. It uses the same bottom sheet specification as the Company Selection Surface (§5.2).

```
┌──────────────────────────────┐
│  grab handle                 │
├──────────────────────────────┤
│  Switch Workspace        [×] │
│  Select the workspace to     │
│  operate in.                 │
├──────────────────────────────┤
│  [icon] BIGDROPS Group    ✓  │
│  3 companies                  │
│  ──────────────────────────  │
│  [icon] Acme Holdings         │
│  2 companies                  │
│  ──────────────────────────  │
│  [icon] Solo Ventures         │
│  1 company                    │
└──────────────────────────────┘
```

| Element | Spec |
|----------|------|
| Sheet title | "Switch Workspace" — 17px, 800 weight |
| Sheet description | "Select the workspace to operate in." — 9px, 700 weight, `var(--ink-3)` |
| Workspace row | Same structure as company row (§5.3) |
| Workspace name | 11px, 800 weight, `var(--ink)` |
| Company count | 8px, 500 weight, `var(--ink-3)` — shown if available from provider |
| Selected indicator | Check icon, same as company selected state (§5.4) |

### 7.3 Workspace Selection Action

1. User taps a workspace row.
2. The active workspace context updates through the Workspace Provider.
3. The system resolves a valid company context within the new workspace (multi-tenancy §8: entity count determines behaviour).
4. If the new workspace has one company, it auto-selects.
5. If the new workspace has multiple companies, the Company Selection Surface opens (§5) so the user can choose.
6. If the new workspace has zero companies, the existing company creation flow is shown (multi-tenancy §12.2). This PRD does not invent a new empty-state workflow.
7. The Workspace Selection Surface closes.
8. Settings updates to show the new workspace name and company context.

### 7.4 Workspace Change Acknowledgement

Changing the workspace is a significant context switch. The UI should provide clear feedback:

- The workspace name in Settings updates immediately.
- A snackbar confirms the switch: "Switched to [Workspace Name]" (per `15-interaction-model.md` §6 snackbar spec).
- If the company context also changed, the snackbar includes: "Switched to [Workspace Name]. Now working in [Company Name]."

---

## 8. Multiple Exposure Points — Same Context

The Company Switcher may be exposed in more than one UI surface:

| Surface | Type | Primary? |
|---------|------|----------|
| Hamburger side drawer | Company Switcher row | Yes — primary exposure |
| Settings → Company section | Company context display | No — secondary exposure |

Both surfaces read the same active-company context from the Entity Provider. They do not own separate company state.

```
                  Active Company (Entity Provider)
                       │
          ┌────────────┴────────────┐
          │                         │
   Hamburger Drawer            Settings
   Company Switcher        Company Context
   (primary)               (secondary)
```

The same principle applies to the Workspace Switcher if future surfaces expose it. All exposures read from the Workspace Provider.

**Invariant:** No UI surface owns tenant state. All surfaces consume provider state.

---

## 9. States

### 9.1 Company States

| State | Drawer Behaviour | Selection Surface Behaviour |
|-------|------------------|---------------------------|
| One company | Company name displayed in row. Chevron hidden. Row is non-interactive. Switching is not offered. | Not shown. |
| Multiple companies | Company name displayed in row. Chevron visible. Row is tappable. | Lists available companies. Current company marked as selected. |
| No available company | Drawer shows "No company" state. | Not shown. The existing company creation flow (multi-tenancy §12.2) is referenced. This PRD does not invent a new empty-state workflow. |

### 9.2 Workspace States

| State | Settings Behaviour | Selection Surface Behaviour |
|-------|-------------------|---------------------------|
| One workspace | Workspace name shown in Settings. Switching is not offered prominently. | Not shown. |
| Multiple workspaces | Workspace name shown. Switch entry point is visible. | Lists available workspaces. Current workspace marked as selected. Company count shown if available. |

### 9.3 Interaction Between States

When a workspace switch changes the available companies:

- The company state transitions automatically (auto-select, company selection surface, or company creation flow).
- The drawer Company Switcher row updates to reflect the new company context.
- The user does not need to manually re-select a company after a workspace switch unless multiple companies exist.

---

## 10. Android Interaction Model

The switchers follow the Android-idiomatic interaction model established in `15-interaction-model.md`. They do NOT use Material 3 or Material You. They use the BIGDROPS slate-navy visual identity with Android-expected behaviour.

| Pattern | Source | Application to Switchers |
|---------|--------|--------------------------|
| Ripple feedback | `15` §1 | Every tappable row in both switchers produces a ripple |
| Bottom sheets as default overlay | `15` §2 | Both selection surfaces are `vaul` bottom sheets |
| Predictive back / hardware back | `15` §3 | Back closes the selection surface first, then the drawer |
| Edge-to-edge with insets | `15` §4 | Sheets respect `env(safe-area-inset-bottom)` |
| Elevation via shadow | `15` §5 | Sheets use `--shadow-float`; no blur for elevation |
| Snackbars | `15` §6 | Workspace switch confirmation uses snackbar |

### 10.1 Back Stack

The back stack for switcher interactions:

```
Page (root) → Drawer (open) → Company Selection Surface (open)
```

Back presses pop layers in this order:
1. Company Selection Surface closes first.
2. Drawer closes second.
3. Page remains.

This follows the back stack rule in `15-interaction-model.md` §3: `search > drawer > sheet > page`.

### 10.2 Touch-Friendly Selection

- All company and workspace rows meet the 44×44px minimum touch target (`11-accessibility.md`).
- Row height is at least 44px. Icon (34×34px) + text fills the row.
- Spacing between rows: `1px solid var(--line)` divider. The tappable area extends to the full row width.
- No hover-dependent interactions. Tap is the primary interaction.

### 10.3 Immediate Visual Feedback

- Tapping a row produces a ripple immediately.
- The selected state updates on tap, not on a delayed confirmation.
- The sheet closes with the standard 0.3s transition.
- The drawer/Settings context row updates immediately after selection.

---

## 11. Responsive Behaviour

The information architecture remains consistent across breakpoints. The placement distinction does not change:

- **Workspace → Settings** on all breakpoints.
- **Company → Navigation drawer** on all breakpoints.

### 11.1 Phone (Primary)

| Switcher | Surface | Behaviour |
|----------|---------|-----------|
| Company | Left drawer | Company Switcher row in drawer. Selection surface = bottom sheet. |
| Workspace | Settings | Workspace row in Settings. Selection surface = bottom sheet. |

### 11.2 Foldable

Same as phone. When unfolded, the drawer and sheets are wider but the structure is identical. Side-by-side panels do not change the switcher placement.

### 11.3 Tablet

Same as phone. Bottom nav remains (locked per `02-mobile-first-model.md`). The drawer and sheets may be wider but the placement distinction is unchanged.

### 11.4 Desktop

| Switcher | Surface | Behaviour |
|----------|---------|-----------|
| Company | Sidebar (desktop equivalent of drawer) | Company Switcher row in sidebar. Selection surface may render as a dropdown, side panel, or modal instead of a bottom sheet. |
| Workspace | Settings | Same placement. Selection surface may render as a dropdown or modal. |

Desktop adapts the container, not the information architecture. The Company Switcher remains in the navigation surface. The Workspace Switcher remains in Settings.

Per `15-interaction-model.md` §2: "When sheet becomes panel — foldable expanded / tablet side-by-side and desktop: sheet may render as inline panel or side panel — same `vaul` content, different container."

---

## 12. Accessibility

### 12.1 Touch Targets

All switcher rows and selection surface rows meet the 44×44px minimum on phone, foldable, and tablet. Desktop uses 32×32px minimum. See `11-accessibility.md`.

### 12.2 Selected State

The selected company/workspace is communicated by:
- Check icon (non-color signal)
- Row background change (`var(--primary-soft)`)
- Text color change (`var(--primary)`)

Color is not the only indicator. This satisfies the color independence rule in `11-accessibility.md`.

### 12.3 Accessible Labels

| Element | `aria-label` or `aria-labelledby` |
|---------|----------------------------------|
| Company Switcher row (drawer) | `aria-label="Current company: [company name]. Tap to switch."` |
| Workspace row (Settings) | `aria-label="Current workspace: [workspace name]. Tap to switch."` |
| Company row (selection surface) | `aria-label="[company name]. [Selected/Not selected]"` |
| Workspace row (selection surface) | `aria-label="[workspace name], [company count] companies. [Selected/Not selected]"` |
| Selection surface (sheet) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to sheet title |

### 12.4 Screen Reader Identification

The screen reader must announce:
- The active workspace when the Settings workspace row receives focus.
- The active company when the drawer Company Switcher row receives focus.
- The selected state of each row in the selection surface.

### 12.5 Keyboard and Focus

| Rule | Implementation |
|------|----------------|
| Focus trap | Selection surface traps focus (`vaul` handles this per `15-interaction-model.md` §2) |
| Focus return | Focus returns to the trigger row when the selection surface closes |
| Escape | Closes the selection surface, then the drawer (back stack per §10.1) |
| Arrow keys | Navigate within the selection surface list |
| Enter/Space | Activates the focused row |
| Focus order | Follows visual order: trigger row → sheet title → list rows → close button |

### 12.6 Sufficient Distinction

Selected and unselected rows must be distinguishable without color:
- Check icon present on selected, absent on unselected.
- Background difference (`var(--primary-soft)` vs `var(--surface)`).
- Text weight remains 800 on both; color changes from `var(--primary)` to `var(--ink)`.

---

## 13. Light/Dark Mode

The switchers use existing colour tokens from `04-theme-system.md`. No new tokens are introduced.

| Token | Light Mode | Dark Mode | Usage in Switchers |
|-------|-----------|-----------|-------------------|
| `--surface` | `#ffffff` | `#1e293b` | Selection surface background, unselected row background |
| `--surface-muted` | `#e2e8f0` | `#334155` | Company Switcher row background in drawer |
| `--primary` | `#1e3a5f` | `#60a5fa` | Selected row text, check icon, company icon |
| `--primary-soft` | 14% transparent | 20% transparent | Selected row background |
| `--ink` | `#0f172a` | `#f1f5f9` | Company/workspace name text |
| `--ink-3` | `#94a3b8` | `#64748b` | Labels, chevrons, company count |
| `--line` | `rgba(15,23,42,.07)` | `rgba(241,245,249,.08)` | Row dividers |
| `--shadow-float` | primary-tinted | pure black | Selection surface elevation |

Dark mode follows the same structure. Only colour values change. Layout, spacing, typography, and interaction remain identical. This satisfies the theme contract in `04-theme-system.md`: themes change colour only.

---

## 14. Navigation Shell Integration

The Company Switcher is part of the BIGDROPS application shell. It is not an isolated component.

### 14.1 Drawer Position

The Company Switcher row sits in the drawer between the brand area and the navigation rows. The drawer structure is defined in `05-navigation-shell.md`. This document specifies the Company Switcher region within that structure.

### 14.2 Drawer Open/Close Behaviour

- When the drawer opens, the Company Switcher row is visible immediately. The user does not need to scroll to find it.
- The current company name is displayed in the row before the drawer animation completes.
- When the drawer closes, the Company Switcher row disappears with the drawer. No separate animation.

### 14.3 Company Selection and Navigation State

- Selecting a company updates the navigation state to reflect the new company context.
- The current navigation destination is preserved. The user stays on the same page (e.g. Invoices) but the data refreshes to reflect the new company.
- If the current page is not available in the new company context (e.g. due to permissions), the user is routed to the dashboard. This follows the existing authorization model, not a switcher-specific rule.

### 14.4 Small vs Large Mobile Screens

- On small phones (320px–374px): the Company Switcher row uses the full drawer width. Company names truncate with an ellipsis if they exceed the available width.
- On larger phones (375px–429px): the same layout applies with more breathing room. No structural change.
- The drawer width is `min(84%, 340px)` per `05-navigation-shell.md`. The Company Switcher row fills this width.

---

## 15. Provider/Context Ownership Boundaries

The switcher UI has strict boundaries. It does not own tenant state.

### 15.1 What the Switcher UI Does

- Reads active workspace from the Workspace Provider.
- Reads active company from the Entity Provider.
- Reads available workspaces from the Workspace Provider.
- Reads available companies (scoped to active workspace) from the Entity Provider.
- Calls the provider's switch method when the user selects a new context.
- Displays the result of the provider's state change.

### 15.2 What the Switcher UI Does NOT Do

- Does not resolve tenant context.
- Does not resolve tenant schemas.
- Does not implement authorization logic.
- Does not query business tables.
- Does not construct schema names.
- Does not cache tenant context.
- Does not independently determine which companies are available.

### 15.3 Provider API Contract

The switcher UI expects these provider capabilities:

| Capability | Provider | Method (illustrative) |
|------------|----------|----------------------|
| Get active workspace | Workspace Provider | `activeWorkspace` |
| Get available workspaces | Workspace Provider | `workspaces` |
| Switch active workspace | Workspace Provider | `setActiveWorkspace(id)` |
| Get active company | Entity Provider | `activeEntity` |
| Get available companies | Entity Provider | `entities` (scoped to active workspace) |
| Switch active company | Entity Provider | `setActiveEntity(id)` |

The exact method names are implementation details. The contract is that the switcher UI calls a provider method and observes the resulting state change. It does not perform the state change itself.

---

## 16. Switching vs Administration

The switchers are for context selection only. They are not administration surfaces.

### 16.1 What the Switchers Are

- Company Switcher: selects the active company to work in.
- Workspace Switcher: selects the active workspace to operate in.

### 16.2 What the Switchers Are NOT

- Company administration (settings, branding, configuration).
- Workspace administration (members, roles, billing).
- Role management.
- Teams management.
- Invitation management.
- Provisioning management.
- Company creation (the "Add Company" entry is a shortcut to the existing creation flow, not a switcher feature).
- Workspace creation.

### 16.3 Visual Distinction

The selection surfaces show only:
- Identity (name, icon/initials)
- Selected state
- Company count (workspace selection only, if available)

They do not show:
- Settings controls
- Member lists
- Role assignments
- Permission details
- Billing information
- Edit buttons

A user selecting a company must feel like they are choosing a context, not entering a management workflow.

---

## 17. UX Invariants

These invariants must be preserved by any implementation of this specification.

| # | Invariant |
|---|-----------|
| 1 | Workspace and Company are different concepts with different placements |
| 2 | Workspace switching belongs in Settings |
| 3 | Company switching is exposed in the mobile navigation drawer |
| 4 | One active workspace exists at a time |
| 5 | One active company exists at a time |
| 6 | The active company belongs to the active workspace |
| 7 | Multiple UI exposures may exist, but they represent the same underlying context |
| 8 | The switcher UI does not own tenant state |
| 9 | The switcher UI does not resolve tenant schemas |
| 10 | The switcher UI does not implement authorization logic |
| 11 | Switching does not equal administration |
| 12 | Android mobile interaction conventions are the primary UX reference |

---

## 18. What This Document Is Not

- Not an implementation guide. It does not prescribe React components, hooks, or state management.
- Not a modification of the multi-tenancy PRD. That PRD remains authoritative for architecture.
- Not a design for company administration or workspace administration surfaces.
- Not a Material 3 or Material You specification. The visual identity is BIGDROPS slate-navy per `04-theme-system.md`.
- Not a new visual identity. All tokens come from `03-design-system.md` and `04-theme-system.md`.
- Not a desktop-first design. The primary reference is Android mobile interaction.

---

## 19. Traceability

| Task Requirement | Section | Cross-Reference |
|-----------------|---------|-----------------|
| Company Switcher | §4–§5 | `05-navigation-shell.md` (drawer) |
| Workspace Switcher | §6–§7 | Settings hierarchy (this document) |
| Mobile drawer placement | §4 | `05-navigation-shell.md` drawer content |
| Settings placement | §6 | This document establishes Settings hierarchy |
| Android interaction model | §10 | `15-interaction-model.md` |
| Company selection experience | §5 | Bottom sheet per `15` §2 |
| Workspace selection experience | §7 | Bottom sheet per `15` §2 |
| Active-state presentation | §5.4, §7.2 | Color independence per `11-accessibility.md` |
| Workspace → Company hierarchy | §3 | Multi-tenancy §7, §10.7 |
| Single/multiple context states | §9 | This document |
| Responsive behaviour | §11 | `02-mobile-first-model.md` |
| Accessibility | §12 | `11-accessibility.md` |
| Light/dark mode integration | §13 | `04-theme-system.md` |
| Navigation-shell integration | §14 | `05-navigation-shell.md` |
| Separation from administration | §16 | Multi-tenancy §12.6, §12.9 |
| Provider/context ownership boundaries | §15 | Multi-tenancy §6, §10, Invariants 5–8 |
| UX invariants | §17 | This document |
