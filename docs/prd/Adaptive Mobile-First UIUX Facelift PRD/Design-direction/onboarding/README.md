# BIGDROPS Onboarding Flow Prototype

> Status: Design prototype — not production code
> Created: 2026-08-29

---

## Purpose

This prototype demonstrates the intended UX for the BIGDROPS app-entry and onboarding experience before implementation. It simulates two complete user journeys:

1. **New user** — sign-up, verification, onboarding, workspace setup, company setup, provisioning, dashboard arrival.
2. **Existing user** — app open, session restoration, context restoration, dashboard.

The prototype is a visual and interaction specification tool. It does not implement backend logic, authentication, providers, or database queries.

---

## How to Use

Open `onboarding-flow.html` directly in a browser. No server or build step is required.

### Prototype Controls

A control panel in the top-right corner (labelled "Prototype Controls") allows jumping directly to any state in the flow. Use this to rapidly explore different scenarios without walking through the entire flow.

### Theme Toggle

A theme toggle button in the top-left corner switches between the default light theme (Slate Navy) and the dark theme (Liquid Onyx). The toggle demonstrates that the design system changes through semantic CSS custom properties, not duplicated component styling.

---

## Scenarios Available

| Scenario | How to Reach |
|----------|-------------|
| New user entry | Prototype Controls → "Entry / Sign Up" |
| Sign in | Prototype Controls → "Sign In" |
| Email verification | Prototype Controls → "Verification" |
| Onboarding choice (Create/Join) | Prototype Controls → "Onboarding Choice" |
| Create workspace | Prototype Controls → "Create Workspace" |
| Pending approval | Prototype Controls → "Pending Approval" |
| Create company | Prototype Controls → "Create Company" |
| Company provisioning (with tips) | Prototype Controls → "Provisioning" |
| Provisioning failed | Prototype Controls → "Provisioning Failed" |
| First dashboard (empty state + hint) | Prototype Controls → "First Dashboard" |
| Existing user session restore | Prototype Controls → "Session Restore" |
| Returning dashboard (with data) | Prototype Controls → "Returning Dashboard" |
| Dark theme | Prototype Controls → "Dark" or theme toggle |
| Light theme | Prototype Controls → "Light" or theme toggle |

### Interactive Walk-Through (New User)

1. Start at Entry → click "Create Account"
2. Fill in email, password, confirm password → click "Create Account"
3. Loading state appears briefly → transitions to Verification
4. Click "I've Verified - Continue" → Onboarding choice
5. Click "Create a Workspace" → fill in workspace name → click "Create Workspace"
6. Loading → Pending Approval → click "Simulate Approval" (prototype control)
7. Company setup → fill in company name and type → click "Create Company"
8. Provisioning screen with status stages and loading tips
9. On success → First dashboard with empty state and first-run hint

### Interactive Walk-Through (Existing User)

1. From Entry screen → click "Simulate Existing User"
2. Or use Prototype Controls → "Session Restore"
3. Context restoration screen shows workspace and company
4. Transitions to returning dashboard with populated data

---

## Source PRDs

| PRD | Relationship |
|-----|-------------|
| `Design.md` | Primary visual authority — all tokens, colours, typography, spacing, radii, shadows, gradients |
| `17-app-entry-and-onboarding.md` | Primary behavioural and flow authority — launch decision model, screen definitions, back navigation, loading integration |
| `10-loading-and-refresh.md` | Loading system authority — loading levels, tip system, progress rules |
| `16-context-switchers.md` | Context display rules — company switcher in drawer, workspace in settings |
| `03-design-system.md` | Structural tokens (typography scale, spacing, radius, elevation) |
| `04-theme-system.md` | Colour token definitions for light and dark themes |
| `05-navigation-shell.md` | Navigation shell structure (top bar, bottom nav, drawer) |
| `15-interaction-model.md` | Android interaction conventions (ripple, back stack, bottom sheets) |

---

## Simulated States

The prototype implements a client-side state machine with these states:

| State | Description |
|-------|-------------|
| `ENTRY` | App entry screen with Sign In / Create Account |
| `SIGN_UP` | Account creation form |
| `SIGN_IN` | Sign-in form |
| `SIGN_UP_LOADING` | Account creation loading (Level 1) |
| `VERIFICATION` | Email verification screen |
| `PW_RECOVERY` | Password reset request |
| `PW_SENT` | Password reset confirmation |
| `ONBOARDING` | Create/Join workspace choice |
| `JOIN_WORKSPACE` | Join workspace guidance (invitation-based) |
| `WORKSPACE_SETUP` | Workspace creation form |
| `WORKSPACE_SUBMITTED` | Workspace creation loading |
| `WORKSPACE_PENDING` | Pending approval waiting screen |
| `COMPANY_SETUP` | Company creation form |
| `COMPANY_PROVISIONING` | Level 5 loading with status stages and tips |
| `PROVISIONING_FAILED` | Provisioning error with retry |
| `DASHBOARD_FIRST_RUN` | First dashboard with empty state and hint |
| `DASHBOARD_RETURNING` | Returning dashboard with populated data |
| `CONTEXT_RESTORING` | Session/context restoration for existing user |

---

## What Is Intentionally Not Implemented

- No backend calls, API requests, or database queries
- No real authentication or session management
- No real workspace/company creation or provisioning
- No React components, hooks, or production code
- No routing library — navigation is simulated via JavaScript state
- No real invitation acceptance flow
- No Platform Office approval UI
- No persistent state — the prototype resets on page reload
- The provisioning success/failure is randomly simulated (85% success rate)
- The "Simulate Approval" button is a prototype control only

---

## Loading Tips

The prototype includes a pool of 10 loading tips across categories defined by `10-loading-and-refresh.md`:

- Feature Tips
- Document Tips
- Shortcut Tips
- Productivity Tips
- Business Operations Tips
- Workflow Tips
- Navigation Tips

Tips are displayed during the Level 5 provisioning state. The tip system implements:
- Anti-repetition (tracks shown tips, avoids immediate repeats)
- Next tip action (manual advancement)
- Dismiss action (tip dismissed without dismissing the loading state)
- Tip rotation during long operations (rotates at stage 2)

---

## Design System Integration

The prototype uses CSS custom properties (semantic design tokens) from `Design.md`:

- **Light theme**: `--bg: #f0f4f8`, `--surface: #ffffff`, `--primary: #1e3a5f` (Slate Navy)
- **Dark theme**: `--bg: #0f172a`, `--surface: #1e293b`, `--primary: #60a5fa` (Liquid Onyx)
- **Typography**: Manrope (body) + DM Mono (numbers)
- **Gradient**: `linear-gradient(135deg, var(--primary), var(--secondary))`
- **Shadows**: Primary-tinted in light, pure black in dark
- **Spacing**: 2–14px scale
- **Radii**: 18px cards, 12px buttons, 24px sheets, 20px nav
- **Touch targets**: 44px minimum on mobile

Theme switching changes only the CSS custom property values. Component structure, spacing, typography, and interaction behaviour remain identical across themes.

---

## Responsive Behaviour

The prototype adapts across breakpoints:

| Width | Behaviour |
|-------|-----------|
| < 560px | Full-width mobile app, edge-to-edge |
| ≥ 560px | Centered 430px phone frame with border (desktop preview) |
| ≥ 900px | Slightly wider frame (480px) |

The flow and information architecture remain the same at all breakpoints.

---

## Accessibility

The prototype demonstrates:

- Semantic HTML (`<section>`, `<label>`, `<button>`, `<aside>`)
- Labelled inputs (`for`/`id` association)
- `aria-label` on icon-only buttons
- `aria-live="polite"` on loading status
- `aria-busy="true"` on loading screens
- `role="status"` on loading states
- `role="main"` on content sections
- Keyboard navigation (Tab, Enter to submit, Escape to go back)
- Visible focus (`outline: 2px solid var(--primary)`)
- 44px minimum touch targets on form inputs and buttons
- `prefers-reduced-motion` support (animations disabled)
- No information conveyed only through colour (icons + text accompany status)

---

## Back Navigation

The prototype implements Android-style back navigation:

| Screen | Back Goes To |
|--------|-------------|
| Sign Up | Entry |
| Sign In | Entry |
| Verification | Sign Up |
| Password Recovery | Sign In |
| Onboarding Choice | Entry |
| Join Workspace | Onboarding |
| Create Workspace | Onboarding |
| Pending Approval | Onboarding |
| Company Setup | Pending Approval |
| Provisioning | (blocked — cannot go back) |
| Provisioning Failed | Company Setup (via retry) |
| Dashboard | (back exits app — no action in prototype) |

Escape key triggers back navigation. The drawer is closed by Escape or scrim tap before back navigates away from the current screen.
