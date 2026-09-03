# Onboarding Prototype Reconciliation Report

This report was written by OpenCode on 2026-08-29 via Local Runner.

---

## A. Objective

Reconcile and correct the onboarding prototype (`onboarding-flow.html`) against authoritative BIGDROPS documentation. Three corrections were required:

1. Dark mode must use existing wireframe variant tokens, NOT the rejected blue Liquid Onyx palette.
2. The `TEAM_INVITES` screen must reflect the real BIGDROPS invitation model (multi-tenancy PRD §12), not arbitrary admin-sends-email behaviour.
3. Fix confirmed defects (step indicator, dead code).

---

## B. Scope

**Files changed:**

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/onboarding-flow.html` — prototype corrections

**Files read but not modified:**

- `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` — invitation model source (§8, §12, §19)
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` — invitation RPCs and table schema
- `docs/TEMPLATES/htmltemps/wireframe-variants/dashlane-midnight-vault.html` — dark mode reference
- `docs/TEMPLATES/htmltemps/wireframe-variants/nuri-earth-dark.html` — dark mode reference
- `docs/TEMPLATES/htmltemps/wireframe-variants/batch-9/ifttt-darkroom.html` — dark mode reference
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design.md` — design system

**Not in scope:**

- App source code (not modified)
- Supabase (not modified)
- Multi-tenancy PRD (read only)

---

## C. Skills Used

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

---

## D. Changes Made

### 1. Dark Mode Tokens (High Priority)

**Problem:** Dark mode used grey-black (#000000) with muted steel-blue (#5a8bbf). The user explicitly rejected the "blue Liquid Onyx" dark theme and directed that dark mode must come from existing wireframe variants.

**Solution:** Sourced tokens from `dashlane-midnight-vault.html` wireframe variant:

| Token | Before | After |
|-------|--------|-------|
| `--bg` | `#000000` | `#200F0A` |
| `--surface` | `#1a1a1a` | `#2B2538` |
| `--surface-raised` | `#242424` | `#3A3348` |
| `--primary` | `#5a8bbf` | `#A2F6F5` |
| `--secondary` | `#8a8a8a` | `#858DF9` |
| `--attention` | `#e57373` | `#FF6B6B` |
| `--ink` | `#f5f5f5` | `#FCFAF9` |
| `--ink-2` | `#b0b0b0` | `#A69F9D` |
| `--ink-3` | `#808080` | `#6B6560` |

Updated all dark-mode-specific overrides (`.entry .brand-mark`, `.entry-btn.primary`, `.btn-primary`, `.ls-brand`, `.stage-dot svg`, `.ctx-brand`, `.dash-ai-btn`, `.proto-controls summary::before`) to use the new warm dark background `#200F0A` instead of `var(--ink)`.

Updated body gradient to warm dark: `radial-gradient(ellipse at top, #2B2538, #200F0A 60%, #150A06)`.

**Note:** `Design.md` §3 defines dark theme as `--bg:#1a1a2e; --surface:#16213e`. This conflicts with the accepted wireframe variant direction. Flagged as a documentation-level inconsistency — `Design.md` was not modified per user directive.

### 2. Invitation Screen Replaced (High Priority)

**Problem:** The old `TEAM_INVITES` screen showed an admin email input + "Add Member" button — arbitrary admin-sends-invitation behaviour not aligned with the real BIGDROPS invitation model.

**Real invitation model** (ERP frontend PRD §12.3–12.5):

- Pending invitations are auto-detected at startup (§19).
- The invitation screen shows: workspace name, who invited them, **Accept invitation** / **Pass for now**.
- Accept calls `accept_workspace_invitation()` RPC, resolves workspace, continues startup.
- Pass is NOT a rejection. The invitation stays `pending`. It may reappear next startup (§12.3: "the pending invitation might also reappear the next time the user opens the application").
- A pending invite always takes precedence over the Create Workspace action (§8).

**Solution:**

- Renamed screen from `TEAM_INVITES` to `INVITE_ACCEPTANCE`.
- Replaced HTML: removed email input + add member form. Added invitation card showing workspace name, inviter email, Accept invitation button, Pass for now link.
- Added two JS functions: `acceptInvitation()` (routes to ONBOARDING) and `passInvitation()` (routes to ONBOARDING, invitation stays pending).
- Removed old functions: `addTeamMember()`, `renderTeamList()`, `removeTeamMember()`.
- Removed `teamMembers` variable and all saveState/loadState references to it.
- Updated `simulateInvitation()` to navigate to `INVITE_ACCEPTANCE` instead of showing an alert.

**Routing change:**

- VERIFICATION "I've Verified" button now routes to `INVITE_ACCEPTANCE` instead of `ONBOARDING`.
- `startProvisioning()` success now routes to `DASHBOARD_FIRST_RUN` instead of `TEAM_INVITES`.
- Added `INVITE_ACCEPTANCE → ENTRY` to `BACK_MAP`.

### 3. Step Indicator Removed (Medium Priority)

**Problem:** The prototype showed "Step 1 of 3", "Step 2 of 3", "Step 3 of 3" across ONBOARDING, WORKSPACE_SETUP, and COMPANY_SETUP screens. The PRD does not define a numbered three-step wizard. The PRD treats workspace creation and company creation as independent activities within a broader entry flow.

**Solution:** Removed all three step-indicator HTML blocks from ONBOARDING, WORKSPACE_SETUP, and COMPANY_SETUP screens. Removed the dead `.step-indicator`, `.step-dot`, `.step-dot.active`, `.step-dot.done`, `.step-label` CSS rules.

### 4. Dead Code Removed (Medium Priority)

Removed the following dead code:

- `let teamMembers = []` — variable no longer exists
- `addTeamMember()` — function replaced by `acceptInvitation()`
- `renderTeamList()` — function removed (no team list UI)
- `removeTeamMember()` — function removed
- `teamMembers` references in `saveState()` and `loadState()`

---

## E. Verification

Verification was not run. The prototype is a self-contained HTML file with no build step, no typecheck, and no lint. Manual inspection confirms:

- All `TEAM_INVITES` references removed from HTML and JS.
- `INVITE_ACCEPTANCE` screen exists with correct role, aria-label, and content.
- State machine `BACK_MAP` includes `INVITE_ACCEPTANCE → ENTRY`.
- `startProvisioning()` success routes to `DASHBOARD_FIRST_RUN`.
- VERIFICATION "I've Verified" routes to `INVITE_ACCEPTANCE`.
- Dark mode tokens match `dashlane-midnight-vault.html` wireframe variant.
- No orphaned `teamMembers` references remain.
- Step indicator CSS and HTML removed from all three screens.

---

## Risks and Limitations

1. **Prototype is simulation only.** The `INVITE_ACCEPTANCE` screen always shows a pending invitation. The real app detects pending invitations at startup (§19) and only shows the screen when one exists. The prototype cannot simulate conditional startup routing without Supabase.

2. **Dark mode is wireframe-sourced, not Design.md-sourced.** `Design.md` §3 defines dark tokens as `--bg:#1a1a2e; --surface:#16213e`. The applied tokens come from `dashlane-midnight-vault.html` wireframe variant. If `Design.md` is later updated to match the accepted wireframe direction, the prototype will already be aligned.

3. **Invitation expiry not simulated.** The real model includes `expires_at` checks (multi-tenancy PRD §12.5: `accept_workspace_invitation` enforces `expires_at > now()`). The prototype does not simulate expired invitations.

---

## Deferred Work

- Update `README.md` to reflect the new INVITE_ACCEPTANCE screen and corrected flow.
- Update `ONBOARDING-PROTOTYPE-AUDIT.md` to mark findings as resolved.
- Consider adding a "Simulate expired invitation" control to the prototype controls panel.
