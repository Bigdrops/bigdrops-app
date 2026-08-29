# App Entry, Onboarding, and Launch Experience

> Status: Authoritative
> Last updated: 2026-08-29
> Depends on: `Design.md`, `03-design-system.md`, `04-theme-system.md`, `05-navigation-shell.md`, `10-loading-and-refresh.md`, `11-accessibility.md`, `12-capacitor-native.md`, `15-interaction-model.md`, `16-context-switchers.md`
> References (do not modify): `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` §8, §10, §12

---

## 1. Purpose

Define the authoritative UX specification for the BIGDROPS app entry experience. The specification covers the complete journey from application launch through the dashboard.

This document defines two journeys:

- A new user's journey from sign-up to the dashboard.
- An existing user's journey from app open to the dashboard.

This document does NOT define backend lifecycle, authentication implementation, provider architecture, or database queries. It references the multi-tenancy PRD as the source of truth for workspace and entity lifecycle rules.

---

## 2. Scope

The specification covers:

```
Cold launch
    ↓
Launch state
    ↓
Authentication state
    ↓
Sign in / Sign up
    ↓
Account verification (where applicable)
    ↓
New-user onboarding OR returning-user launch
    ↓
Workspace / company context resolution
    ↓
Dashboard
```

This document does NOT modify:

- The multi-tenancy PRD.
- Authentication backend logic.
- Provider architecture.
- Routing implementation.
- Database schema.

---

## 3. First Principle

A returning user MUST NOT see the onboarding experience again because the app starts. The application MUST recognise the user's existing authenticated or session state and continue to the appropriate destination.

### Launch Decision Model

```
App opened
    │
    ▼
Restore session
    │
    ├── No valid session
    │       ↓
    │    Authentication
    │
    └── Valid session
            ↓
       Resolve user state
            │
            ├── New / incomplete setup
            │
            ├── Pending invitation
            │
            ├── Workspace pending approval
            │
            ├── No company
            │
            └── Ready
                    ↓
                 Dashboard
```

The multi-tenancy PRD §8 defines the authoritative startup and tenant resolution flow. This UX specification translates that flow into screen-level experience. It does NOT redefine the flow.

---

## 4. Launch Experience

### 4.1 What the User Sees

The launch state is lightweight and intentional. It is NOT a decorative splash screen. It does NOT delay the application.

| Element | Spec | Source |
|---------|------|--------|
| Background | `var(--bg)` | `Design.md` §4, `04-theme-system.md` |
| Brand presence | 32×32px gradient square (`var(--gradient)`), centered, with subtle pulse | `05-navigation-shell.md` brand mark |
| Loading treatment | Level 1 (inline) or Level 3 (page transition) — see §10 | `10-loading-and-refresh.md` §3 |
| Session restoration | No visible loading UI if restoration is fast. Page skeleton if context resolution takes longer. | `10-loading-and-refresh.md` §3 Level 2/3 |
| Transition behaviour | Fade to next state (0.2s ease-out) | `05-navigation-shell.md` page transitions |
| Minimum visual information | Brand mark + application name "BIGDROPS" | `03-design-system.md` type scale |
| Error handling | If session restoration fails, show error state with retry. See §19. | — |

### 4.2 Rules

- The launch state MUST NOT add an artificial delay.
- The launch state MUST disappear as soon as the next state is determined.
- The launch state MUST respect `prefers-reduced-motion`. The brand pulse stops. The fade becomes instant.
- The launch state MUST set `aria-busy="true"` on the root container.
- The launch state MUST announce "Starting BIGDROPS" to screen readers.
- The launch state MUST NOT show a tip. Tips appear only at Level 4/5 per `10-loading-and-refresh.md` §8.

### 4.3 Capacitor Native Integration

The native splash screen (configured in `12-capacitor-native.md`) MAY show briefly before the web view loads. The web launch state replaces the native splash seamlessly. The transition MUST NOT flash white or show a blank screen.

---

## 5. Authentication Entry

### 5.1 When Authentication Appears

Authentication appears ONLY when session restoration finds no valid session. If a valid session exists, the application MUST NOT show authentication.

### 5.2 Authentication Surface

The authentication entry is a full-screen page. It is NOT a bottom sheet. It is the first interactive surface for unauthenticated users.

| Property | Value | Source |
|----------|-------|--------|
| Background | `var(--bg)` | `Design.md` §4 |
| Surface (form card) | `var(--surface)`, 18px radius, `var(--shadow)`, `1px solid var(--line)` | `Design.md` §12, `03-design-system.md` |
| Layout | Centered column, max-width 340px, 14px horizontal padding | `02-mobile-first-model.md` phone width |
| Brand presence | 32×32px gradient brand mark + "BIGDROPS" name | `05-navigation-shell.md` |
| Safe areas | `env(safe-area-inset-top)` top padding, `env(safe-area-inset-bottom)` bottom padding | `12-capacitor-native.md` |

### 5.3 Authentication Methods

The authentication entry MUST preserve the methods supported by the existing product and backend. This document does NOT invent new authentication methods. If the existing implementation supports email and password, the entry shows email and password. If OAuth providers are added later, they appear here.

| Method | Presentation |
|--------|-------------|
| Email + password | Email input, password input, primary action button |
| Password recovery | Link below the password field, navigates to recovery flow (§5.6) |
| Sign up link | Link below the form, navigates to sign-up flow (§6) |

### 5.4 Sign In

| Aspect | Spec |
|--------|------|
| Purpose | Authenticate an existing user |
| Primary action | "Sign In" button — submits credentials |
| Secondary action | "Forgot password?" link — navigates to password recovery |
| Required information | Email, password |
| Validation behaviour | Inline validation on blur. Email format check. Empty field check. |
| Loading state | Level 1 — button spinner + "Signing in..." text + button disabled |
| Error state | Inline error message below the form. `var(--attention)` border on failed field. See §19. |
| Success transition | Fade to launch state → context resolution → dashboard |
| Back behaviour | Back exits the app. There is no previous screen. |
| Accessibility | Email input: `label="Email"`, password input: `label="Password"`. Error announced via `aria-live="polite"`. |

### 5.5 Sign Up

| Aspect | Spec |
|--------|------|
| Purpose | Create a new account |
| Primary action | "Create Account" button — submits registration |
| Secondary action | "Already have an account? Sign In" link — returns to sign in |
| Required information | Email, password, confirm password (minimum for account creation) |
| Validation behaviour | Inline validation on blur. Email format, password strength, password match. |
| Loading state | Level 1 — button spinner + "Creating account..." + button disabled |
| Error state | Inline error message. See §19. |
| Success transition | If verification is required: navigate to verification screen. If verification is not required: navigate to onboarding (§7). |
| Back behaviour | Back returns to sign in. |
| Accessibility | All inputs labelled. Errors announced. |

### 5.6 Password Recovery

| Aspect | Spec |
|--------|------|
| Purpose | Initiate password reset |
| Primary action | "Send Reset Link" button |
| Required information | Email |
| Validation behaviour | Email format check on blur |
| Loading state | Level 1 — button spinner |
| Success state | "Check your email" confirmation screen with return-to-sign-in action |
| Error state | Inline error if email is invalid or not found. Do NOT expose whether the email exists in the system. Show the same "Check your email" message. |
| Back behaviour | Back returns to sign in. |

### 5.7 Relationship Between Sign In and Sign Up

Sign in and sign up are separate screens. They link to each other via text links below the form. The user can navigate between them with back. The primary action on each screen is clear and singular.

### 5.8 Return to Application After Authentication

After successful authentication, the application transitions to context resolution (§11). The transition uses a fade (0.2s ease-out). The authentication screen does NOT remain in the back stack. The user cannot navigate back to the authentication screen after successful sign in.

---

## 6. Sign-Up Experience

### 6.1 Flow

```
Sign up
   ↓
Account creation
   ↓
Verification / confirmation (where required)
   ↓
Authenticated state
   ↓
Onboarding (§7)
```

### 6.2 Screen Definitions

#### Sign Up Screen

See §5.5.

#### Verification Screen (if required)

| Aspect | Spec |
|--------|------|
| Purpose | Confirm the user's email or identity |
| Primary action | "Verify" button or auto-verification on link click |
| Secondary action | "Resend verification" link |
| Required information | Verification code (if code-based) or none (if link-based) |
| Loading state | Level 1 — button spinner |
| Error state | "Verification failed" message with resend option |
| Success transition | Fade to onboarding (§7) |
| Back behaviour | Back returns to sign up. The user can abandon verification. |
| Accessibility | Code input: `label="Verification code"`. Status announced. |

### 6.3 Rules

- Keep the number of steps low. Account creation requires only the minimum fields needed to create an account.
- Do NOT request information that is not required at this stage. Workspace name, company name, and profile details are collected during onboarding, not during sign up.
- Do NOT block the user with optional configuration during sign up.

---

## 7. Onboarding Principles

BIGDROPS onboarding is progressive setup, NOT a long tutorial.

### What Onboarding Is

- A short sequence of steps that help the user reach useful application state.
- Each step collects information or performs an action that is required to use the application.

### What Onboarding Is NOT

- Long introductions.
- Unnecessary questionnaires.
- Forced product tours.
- Decorative slides with no functional value.
- Asking for information that can be collected later.
- Blocking the user with optional configuration.

### Onboarding Step Test

Every onboarding step MUST answer the question: "Why does BIGDROPS need this information now?"

If the answer is "it can be collected later," the step MUST NOT be in onboarding.

---

## 8. New User Without a Workspace

After authentication, the application resolves the user's workspace membership. The multi-tenancy PRD §8 defines the authoritative flow. This section defines the UX presentation.

### 8.1 Decision Branch

```
No workspace membership
        │
        ├── Pending invitation
        │       ↓
        │   Invitation acceptance (§15)
        │
        └── No pending invitation
                │
                ├── Create a Workspace (§9)
                │
                └── Join a Workspace (§8.3)
```

### 8.2 New-User Choice Screen

| Aspect | Spec |
|--------|------|
| Purpose | Let the user choose between creating or joining a workspace |
| Primary actions | Two equally weighted options: "Create a Workspace" and "Join a Workspace" |
| Layout | Two cards or two action rows, stacked vertically |
| Card style | `var(--surface)` bg, 18px radius, `1px solid var(--line)` border, `var(--shadow)`, icon + title + description |
| Icon (Create) | Lucide `building-2` or `plus`, 34×34px, `var(--primary-soft)` bg, `var(--primary)` colour |
| Icon (Join) | Lucide `user-plus` or `mail`, 34×34px, `var(--secondary-soft)` bg, `var(--secondary)` colour |
| Back behaviour | Back returns to sign in (if the user just authenticated) or exits the app |
| Accessibility | Each card is a button with `aria-label`. Choice announced. |

### 8.3 Join a Workspace

The multi-tenancy PRD §12.4 establishes that joining is invitation-based only. There is NO join-by-code flow. Invitation codes do NOT exist.

| Aspect | Spec |
|--------|------|
| Purpose | Guide the user to request an invitation from a workspace administrator |
| Content | "Ask a workspace administrator to send an invitation to your email." |
| Secondary content | The user's registered email is displayed so they know which email to share. |
| Primary action | "Back to Sign In" or "Done" (if the user was already authenticated) |
| Loading state | None — this is an informational screen |
| Back behaviour | Back returns to the new-user choice screen |
| Prohibition | Do NOT show a code entry field. Do NOT invent a join-by-code flow. |

---

## 9. Create Workspace Onboarding

### 9.1 Flow

```
Create a Workspace
   ↓
Workspace details (name, slug)
   ↓
Submission
   ↓
Pending approval state
   ↓
(Platform Office approves — not in this PRD)
   ↓
Workspace becomes active
   ↓
Transition to company creation (§10)
```

### 9.2 Create Workspace Screen

| Aspect | Spec |
|--------|------|
| Purpose | Collect workspace name and slug |
| Primary action | "Create Workspace" button |
| Required information | Workspace name, workspace slug |
| Validation behaviour | Name: non-empty. Slug: alphanumeric, auto-generated from name, editable. |
| Loading state | Level 1 — button spinner + "Creating..." + button disabled |
| Error state | Inline error if slug is taken or name is invalid. See §19. |
| Success transition | Navigate to Pending Approval screen (§9.3) |
| Back behaviour | Back returns to the new-user choice screen |
| Accessibility | Inputs labelled. Errors announced. |

### 9.3 Pending Approval Screen

The multi-tenancy PRD §12.1 establishes that a new workspace has status `pending_approval` and a platform operator approves it in the Platform Office.

| Aspect | Spec |
|--------|------|
| Purpose | Inform the user that the workspace is waiting for approval |
| Content | "Your workspace is waiting for approval. We will notify you when it is ready." |
| Secondary content | Workspace name displayed so the user can confirm what they submitted |
| Visual treatment | Centered content, brand mark, `var(--surface)` card, 18px radius |
| Loading state | None — this is a waiting state, not a loading state |
| Action | "Refresh" or "Check Status" button — re-checks workspace status. Level 1 loading on button tap. |
| Auto-refresh | The app MAY poll for status changes in the background. Do NOT show a loading spinner for background polling. |
| Back behaviour | Back returns to the new-user choice screen. The user can leave and return later. |
| Prohibition | Do NOT design the Platform Office approval UI. Do NOT call `approve_workspace`. |

### 9.4 After Approval

When the workspace becomes `active`, the application detects the status change and transitions to company creation (§10). The transition uses a fade (0.2s ease-out).

---

## 10. First Company Setup

### 10.1 Flow

```
Workspace active, no company
   ↓
Create your first Company
   ↓
Company details (name, slug, type)
   ↓
Provisioning
   ↓
Ready
   ↓
Dashboard
```

The multi-tenancy PRD §12.2 defines the authoritative company creation flow.

### 10.2 Create First Company Screen

| Aspect | Spec |
|--------|------|
| Purpose | Collect company name, slug, and type |
| Primary action | "Create Company" button |
| Required information | Company name, company slug, company type |
| Validation behaviour | Name: non-empty. Slug: alphanumeric, auto-generated, editable. Type: selection from available types. |
| Loading state | Level 1 — button spinner + "Creating..." + button disabled |
| Error state | Inline error if slug is taken or name is invalid. See §19. |
| Success transition | Navigate to Company Provisioning screen (§10.3) |
| Back behaviour | Back returns to the previous screen. The user can leave company creation and return later. |
| Accessibility | All inputs labelled. Errors announced. |

### 10.3 Company Provisioning

The multi-tenancy PRD §12.2 establishes that the app polls `get_entity_provisioning_status` until the status is `ready` or `failed`.

| Aspect | Spec |
|--------|------|
| Purpose | Show the user that the company is being provisioned |
| Loading level | Level 5 (long-running operation) |
| Loading treatment | Full loading surface per `10-loading-and-refresh.md` §10. Brand mark with pulse. Status-based progress: Preparing → Processing → Generating → Finalizing → Complete. |
| Tip | Yes — MAY display a tip. Contextual tip with `context: "provisioning"` or general product knowledge tip. |
| Cancel | The provisioning operation does NOT support cancellation. No cancel button is shown. |
| Success transition | Fade to dashboard (§11) |
| Error transition | Fade to Provisioning Failed screen (§10.4) |
| Accessibility | `aria-busy="true"`, `role="status"`, status stages announced on change |

### 10.10 Provisioning Failed Screen

The multi-tenancy PRD §12 establishes that on `failed`, the app shows a provisioning failure page.

| Aspect | Spec |
|--------|------|
| Purpose | Inform the user that company provisioning failed |
| Content | "We could not set up your company. Please try again." |
| Primary action | "Retry" button — re-calls `provision_entity` or re-checks status |
| Secondary action | "Contact Support" link |
| Visual treatment | `var(--attention)` icon, `var(--surface)` card, error styling per `Design.md` §12 |
| Loading state | Level 1 on retry button |
| Back behaviour | Back does NOT return to company creation. The user must retry or contact support. |
| Accessibility | Error announced via `aria-live="assertive"`. |

---

## 11. Dashboard Arrival

### 11.1 First Arrival

The first moment the user reaches the dashboard. The transition MUST make it clear that onboarding is complete.

| Aspect | Spec |
|--------|------|
| Transition | Fade from provisioning or context resolution to dashboard (0.2s ease-out) |
| Dashboard loading | Level 2 — KPI card skeletons, activity row skeletons. Page structure visible. Per `10-loading-and-refresh.md` §15. |
| First dashboard state | When data loads, the dashboard shows the KPI grid, activity list, and navigation. |
| Empty dashboard state | If the user has no invoices, quotations, or activity, empty states appear in the relevant sections. Empty states follow `06-component-patterns.md` empty state spec. |
| Navigation availability | Bottom nav is visible immediately. All 5 tabs are accessible. |
| Company identity | The top bar shows the workspace label and owner name. The drawer Company Switcher row shows the current company. |
| Workspace context | The drawer shows the brand area and company switcher. The workspace name is visible in the drawer. |
| Loading tips | Tips do NOT appear during Level 2 dashboard loading. Tips appear only at Level 4/5. |

### 11.2 What the User Sees

```
┌─────────────────────────────┐
│  Top Bar                    │  workspace + actions
├─────────────────────────────┤
│  Dashboard content          │  KPI grid, activity, alerts
│  (skeletons → real data)    │
├─────────────────────────────┤
│  Bottom Nav                 │  5 tabs
└─────────────────────────────┘
```

### 11.3 Rules

- The dashboard MUST NOT become a mandatory tutorial.
- The dashboard MUST remain a working business interface.
- The user MUST be able to navigate immediately using the bottom nav.
- The user MUST be able to open the drawer immediately.
- The user MUST be able to identify the current company and workspace.

---

## 12. First-Run Experience

### 12.1 First Visit vs Normal Visit

The first dashboard visit MAY include lightweight guidance. Normal dashboard visits do NOT include guidance.

### 12.2 Progressive Disclosure

If guidance is required, prefer:

| Method | When | Dismissible? | Shown Once? |
|--------|------|-------------|-------------|
| Contextual hints | When the user first encounters a feature | Yes | Yes (once per feature) |
| Feature tips | When a feature is relevant to the current context | Yes | Yes (once per feature) |
| Lightweight coach marks | When a navigation path is not obvious | Yes | Yes |
| Empty-state guidance | When a section has no data | Persistent until data exists | No (shows until data exists) |
| Loading tips | During Level 4/5 loading operations | Yes | No (per loading rules) |

### 12.3 What Is Mandatory

- Nothing in the first-run experience is mandatory. The user MUST be able to dismiss all guidance and use the dashboard immediately.

### 12.4 What Is Optional

- All contextual hints, feature tips, and coach marks are optional. The system MAY show them. The user MAY dismiss them.

### 12.5 What Is Dismissible

- All first-run guidance is dismissible. A close button or "Got it" action MUST be present on every guidance element.

### 12.6 What Is Shown Only Once

- Contextual hints and coach marks are shown only once per feature. The system tracks which hints have been dismissed and does not show them again.

### 12.7 Prohibition

- Do NOT force a multi-screen product tour unless the existing product requirements require it.
- Do NOT block the dashboard with a tutorial overlay.
- Do NOT prevent navigation during first-run guidance.

---

## 13. Existing User App Open

### 13.1 Expected Experience

A user who already has an account, workspace membership, company membership, and an established application context.

```
App opened
    ↓
Restore authenticated session
    ↓
Restore active workspace/company context
    ↓
Resolve required application state
    ↓
Show dashboard
```

### 13.2 Rules

- The user MUST NOT be forced through onboarding again.
- The application MUST NOT show sign up, workspace creation, or first-company setup unless the user's actual state requires one of those flows.
- The application MUST NOT show unnecessary splash screens.
- The transition from launch to dashboard MUST be as fast as session restoration allows.
- If session restoration is fast, the user sees: launch state → dashboard (with Level 2 skeleton loading).
- If session restoration requires context resolution, the user sees: launch state → brief context resolution → dashboard.

### 13.3 What the User Does NOT See

- Sign up screen
- Sign in screen (unless the session is expired)
- Workspace creation
- First-company setup
- Introductory onboarding
- Product tour
- Unnecessary splash screens

---

## 14. Returning User With Incomplete State

### 14.1 Exception Handling

An existing authenticated user MAY have an incomplete state. The application MUST handle these exceptions without forcing full onboarding.

| State | UX Treatment | Source |
|-------|-------------|--------|
| Authenticated, workspace unavailable | Show "Workspace Unavailable" screen with retry and contact-support actions. | Multi-tenancy §11 |
| Authenticated, workspace pending approval | Show Pending Approval screen (§9.3). The user can leave and return. | Multi-tenancy §12.1 |
| Authenticated, workspace ready, no company | Show Create First Company flow (§10). | Multi-tenancy §12.2 |
| Authenticated, company provisioning | Show Company Provisioning screen (§10.3). Level 5 loading. | Multi-tenancy §12.2 |
| Authenticated, company provisioning failed | Show Provisioning Failed screen (§10.4). | Multi-tenancy §12 |
| Authenticated, company unavailable (purged) | Show "Company Unavailable" screen with contact-support action. | Multi-tenancy §11, §12 |

### 14.2 Rules

- The application MUST NOT create a new workspace or company automatically.
- The application MUST NOT reset the user's state.
- Each exception state MUST tell the user what happened and what they can do next.
- The application MUST use the established backend states. It MUST NOT invent new lifecycle states.

---

## 15. Pending Invitation

### 15.1 When This Appears

The multi-tenancy PRD §8 and §12.3 establish that pending invitations are detected automatically during startup. A user with a pending workspace invitation MUST accept it before creating a workspace or resolving entities.

### 15.2 Invitation Acceptance Screen

| Aspect | Spec |
|--------|------|
| Purpose | Let the user accept or pass on a pending workspace invitation |
| Content | Invitation information available under the existing security model (`invite_visibility`) |
| Primary action | "Accept Invitation" button |
| Secondary action | "Pass for Now" link |
| Loading state | Level 1 — button spinner on accept |
| Error state | If acceptance fails, show inline error with retry. See §19. |
| Success transition | Accept: resolve workspace → continue to entity resolution → dashboard. |
| Pass transition | Pass: dismiss invitation screen → continue startup without changing the invitation. The invitation remains pending. |
| Back behaviour | Back does NOT dismiss the invitation. The user must choose Accept or Pass. |
| Prohibition | Do NOT create a workspace automatically. Do NOT reject the invitation. Do NOT delete the invitation. Do NOT invent invitation codes. |

### 15.3 Pass for Now

The multi-tenancy PRD §12.3 establishes that "Pass for now" is NOT a rejection. It leaves the invitation pending. It never rejects, deletes, or revokes the invitation. The user MAY see the invitation again on a later startup.

### 15.4 Cross-References

- Invitation lifecycle: multi-tenancy PRD §12.5
- Invitation acceptance RPC: multi-tenancy PRD §9 (`accept_workspace_invitation`)
- Context switcher placement: `16-context-switchers.md`

---

## 16. Android Conventions

### 16.1 Back Navigation

Back MUST return to the previous logical step. Back MUST NOT create inconsistent onboarding state.

| Screen | Back Behaviour |
|--------|---------------|
| Launch | Back exits the app. There is no previous screen. |
| Sign in | Back exits the app. |
| Sign up | Back returns to sign in. |
| Verification | Back returns to sign up. The user can abandon verification. |
| Password recovery | Back returns to sign in. |
| New-user choice | Back returns to sign in (if just authenticated) or exits the app. |
| Create Workspace | Back returns to new-user choice. |
| Pending Approval | Back returns to new-user choice. The user can leave and return. |
| Join Workspace guidance | Back returns to new-user choice. |
| Invitation Acceptance | Back does NOT dismiss. The user must choose Accept or Pass. |
| Create First Company | Back returns to the previous screen. |
| Company Provisioning | Back does NOT dismiss. The operation is blocking. |
| Provisioning Failed | Back does NOT return to company creation. The user must retry or contact support. |
| Dashboard | Back exits the app (or shows confirm-exit if applicable). |

### 16.2 System Back Stack

The back stack follows `15-interaction-model.md` §3: `search > drawer > sheet > page`. During onboarding, the back stack is a linear sequence of onboarding screens. The user can go back to the previous step but cannot skip forward.

### 16.3 Touch Targets

All interactive elements MUST meet the 44×44px minimum on phone, foldable, and tablet. Desktop uses 32×32px minimum. Per `11-accessibility.md`.

### 16.4 Keyboard

| Rule | Detail |
|------|--------|
| Keyboard-aware layouts | When the keyboard opens, the layout adjusts. The primary action button remains visible above the keyboard. |
| Focus movement | Focus moves to the first input on form screens. Tab order follows visual order. |
| Form submission | "Enter" on the last field submits the form. "Enter" on intermediate fields moves to the next field. |
| Avoiding hidden fields | The keyboard MUST NOT cover the primary action button. Use `viewport-fit=cover` and scroll adjustment. |
| Appropriate keyboard types | Email input: `type="email"`. Password input: `type="password"`. Code input: `type="tel"` or `inputmode="numeric"`. |

### 16.5 Sheets and Dialogs

| Surface | When to Use |
|---------|-------------|
| Bottom sheet | For selection or action surfaces within a flow (e.g. company type selection). Per `15-interaction-model.md` §2. |
| Dialog | For confirmations (e.g. "Are you sure you want to leave?"). |
| Full page | For primary flow steps (sign in, sign up, create workspace, create company). Do NOT convert every screen into a bottom sheet. |

### 16.6 System Bars and Safe Areas

| Area | Handling | Source |
|------|----------|--------|
| Status bar | `env(safe-area-inset-top)` on all screens. Transparent/translucent system bars. | `12-capacitor-native.md`, `15-interaction-model.md` §4 |
| Navigation bar | `env(safe-area-inset-bottom)` on all screens. | `12-capacitor-native.md` |
| Gesture navigation | Edge-to-edge layout. Content draws behind system bars. | `15-interaction-model.md` §4 |
| Display cut-outs | `env(safe-area-inset-left/right)` on foldable hinge. | `02-mobile-first-model.md` |
| Edge-to-edge | All screens use edge-to-edge layout. Safe areas respected via `env()`. | `15-interaction-model.md` §4 |

### 16.7 Motion

All motion follows `Design.md` §6 and `10-loading-and-refresh.md` §10. Motion respects `prefers-reduced-motion` per `11-accessibility.md`.

| Transition | Duration | Easing |
|------------|----------|--------|
| Screen to screen | 0.2s | ease-out |
| Form to loading | 0.25–0.3s | opacity fade |
| Loading to dashboard | 0.2s | ease-out |
| Keyboard open/close | System-managed | — |

---

## 17. Responsive Behaviour

The flow remains the same product flow across all breakpoints. Layout adapts. Product logic does NOT change.

| Platform | Layout Adaptation |
|----------|-------------------|
| Phone portrait | Single column. Centered form card. Full-screen flow steps. |
| Phone landscape | Single column with adjusted height. Form card remains centered. Safe areas respected. |
| Large phones | Same as phone. Wider form card max-width (up to 400px). |
| Foldables | Same as phone when folded. When unfolded, form card MAY center in a wider panel. Flow unchanged. |
| Tablets | Form card MAY center in a wider content area. Side-by-side panels MAY be used for review steps. Flow unchanged. |
| Desktop | Form card centers in the content area. Sidebar (if present) does not appear during authentication. Flow unchanged. |

### Rules

- The information architecture MUST remain consistent across breakpoints.
- Desktop MUST NOT change the fundamental product flow.
- Authentication, onboarding, and context resolution steps are the same on all platforms.
- Form layouts adapt width but maintain the same field order and validation.

---

## 18. Accessibility

### 18.1 Semantic Headings

- Each screen has a single `h1` heading that identifies the screen purpose.
- Section titles within a screen use `h2`.
- Heading hierarchy does not skip levels.

### 18.2 Form Labels

- Every input has a visible `<label>` associated via `for`/`id`.
- Placeholder text is NOT a label.
- Error messages are associated with the input via `aria-describedby`.

### 18.3 Validation Announcements

- Validation errors are announced via `aria-live="polite"`.
- The error message appears immediately below the affected field.
- The error is announced when it appears, not on every keystroke.

### 18.4 Focus Management

- Focus moves to the first input on form screens.
- Focus moves to the primary action after a selection screen.
- Focus returns to the trigger element when a sheet or dialog closes.
- Focus is trapped inside blocking loading surfaces (Level 4/5).

### 18.5 Screen-Reader Loading States

- `aria-busy="true"` is set on loading containers.
- Loading start is announced via `role="status"` or `aria-live="polite"`.
- Loading completion is announced.
- Loading errors are announced via `aria-live="assertive"`.

### 18.6 Accessible Progress

- Determinate progress uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- Indeterminate progress uses `role="progressbar"` without `aria-valuenow`.
- Status-based progress announces stage changes via `aria-live="polite"`.

### 18.7 Error Announcements

- Errors are announced via `aria-live="assertive"`.
- The error message tells the user what happened and what they can do next.
- Backend implementation details are NOT exposed to the user.

### 18.8 Keyboard Navigation

- All interactive elements are focusable.
- Tab order follows visual order.
- Enter/Space activates the focused element.
- Escape closes sheets and dialogs (if non-blocking).

### 18.9 Touch Target Sizes

- Phone, foldable, tablet: 44×44px minimum.
- Desktop: 32×32px minimum.
- Per `11-accessibility.md`.

### 18.10 Contrast

- All text meets WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text).
- Interactive elements meet 3:1.
- Focus indicators meet 3:1.
- Per `11-accessibility.md` and `Design.md` §4.

### 18.11 Reduced Motion

- All animations stop.
- All transitions reduce to near-instant.
- Loading surfaces appear and disappear via instant opacity change.
- Tips remain readable without animation.
- Per `11-accessibility.md` and `10-loading-and-refresh.md` §13.

### 18.12 Primary Action Clarity

- The primary action on every screen MUST be visually distinct.
- The primary action uses `var(--gradient)` background per `Design.md` §12.
- The primary action is the most prominent interactive element on the screen.

---

## 19. Error Recovery

### 19.1 Principles

Every error state MUST tell the user:

1. What happened.
2. What they can do next.

The application MUST NOT expose backend implementation details to the user.

### 19.2 Error States

| Error | UX Treatment | Recovery Action |
|-------|-------------|-----------------|
| Invalid credentials | Inline error on sign-in form. "Incorrect email or password." | User retries. |
| Failed sign-up | Inline error on sign-up form. "Could not create account. Please try again." | User retries. |
| Verification problem | "Verification failed." with resend option. | User resends or contacts support. |
| Workspace creation failure | Inline error on create-workspace form. "Could not create workspace." | User retries. |
| Workspace still pending | Pending Approval screen persists. "Your workspace is still waiting for approval." | User can refresh or leave. |
| Company creation failure | Inline error on create-company form. "Could not create company." | User retries. |
| Provisioning failure | Provisioning Failed screen (§10.4). "We could not set up your company." | User retries or contacts support. |
| Session expiration | Redirect to sign in. "Your session has expired. Please sign in again." | User signs in. |
| Network interruption | Inline error or snackbar. "Connection lost. Please check your network." | User retries when network returns. |

### 19.3 Error Visual Treatment

| Element | Spec | Source |
|---------|------|--------|
| Error icon | `var(--attention)` colour, Lucide `triangle-alert` or `x-circle` | `Design.md` §12 |
| Error border | `1px solid var(--attention)` on affected input | `Design.md` §12 |
| Error background | `var(--attention-soft)` tint | `Design.md` §4 |
| Error message | 8px, weight 600, `var(--attention)`, below the field | `03-design-system.md` type scale |
| Error announcement | `aria-live="assertive"` | `11-accessibility.md` |

---

## 20. Session Restoration

### 20.1 Conceptual Launch Sequence

```
Launch
 ↓
Restore session
 ↓
Dashboard (if successful)
```

Or:

```
Launch
 ↓
Resolve state
 ↓
Required action
 ↓
Continue
```

### 20.2 Rules

- The experience MUST avoid showing a chain of unnecessary screens while context is being restored.
- If restoration is successful, the user goes directly to the dashboard.
- If restoration requires user action (e.g. pending invitation, missing company), the user sees the appropriate action screen.
- Session restoration uses the loading system from `10-loading-and-refresh.md`. It does NOT create a new loading architecture.
- If the session is expired, the user is redirected to sign in.

### 20.3 Loading Integration

| Restoration Phase | Loading Level | Treatment |
|-------------------|--------------|-----------|
| Session check | Level 0 or 1 | No visible UI or brief launch state |
| Context resolution | Level 2 or 3 | Page skeleton if resolution takes longer than instant |
| Dashboard data load | Level 2 | KPI card skeletons, activity row skeletons |

---

## 21. Context Restoration

### 21.1 Hierarchy

```
Workspace
    ↓
Company
    ↓
Dashboard
```

The multi-tenancy PRD §7 establishes that workspace resolution precedes entity resolution. The UX MUST follow this order.

### 21.2 Context Identification

After reaching the dashboard, the user MUST be able to identify:

- The current workspace (visible in the drawer brand area and Settings workspace row).
- The current company (visible in the drawer Company Switcher row and top bar identity block).

### 21.3 Cross-References

- Company Switcher: `16-context-switchers.md` §4
- Workspace Switcher: `16-context-switchers.md` §6
- Drawer structure: `05-navigation-shell.md` drawer content
- Top bar identity: `05-navigation-shell.md` top bar left side

### 21.4 Rules

- The UX MUST be compatible with the existing workspace/company context model.
- The switcher specifications remain authoritative for their respective surfaces.
- This document does NOT move the switchers.
- This document does NOT change switcher behaviour.

---

## 22. Design System Integration

The entire entry and onboarding experience MUST use `Design.md` as the authoritative visual contract.

### 22.1 What This Means

| Aspect | Source |
|--------|--------|
| Colours | `Design.md` §3–§5, `04-theme-system.md` |
| Typography | `Design.md` §7, `03-design-system.md` |
| Spacing | `Design.md` §8, `03-design-system.md` |
| Radius | `Design.md` §9, `03-design-system.md` |
| Elevation | `Design.md` §10, `03-design-system.md` |
| Gradients | `Design.md` §11 |
| Component visual language | `Design.md` §12 |
| Motion | `Design.md` §6, `05-navigation-shell.md` |
| Responsive | `Design.md` §14, `02-mobile-first-model.md` |

### 22.2 Prohibitions

- Do NOT create a separate onboarding colour system.
- Do NOT create a separate authentication theme.
- Do NOT create a separate loading theme.
- Do NOT introduce arbitrary new gradients.
- Do NOT introduce unrelated typography.
- Do NOT introduce unrelated spacing.
- Do NOT introduce unrelated component shapes.
- Do NOT introduce new design tokens without design-system justification.

### 22.3 Theme Behaviour

- Light mode uses the approved default theme (Slate Navy Light from `mobile-dashboard-v6.html`).
- Dark mode uses the approved dark theme (Liquid Onyx from `liquid-onyx.html`).
- Authentication and onboarding screens respect the user's theme preference.
- Theme switching during onboarding is NOT required but MUST NOT break the flow if it occurs.

---

## 23. Loading Integration

Use `10-loading-and-refresh.md` as the loading authority.

### 23.1 Loading Level Assignment

| Operation | Loading Level | Treatment |
|-----------|--------------|-----------|
| App launch | Level 0 or 1 | Launch state with brand mark. No tip. |
| Session restoration | Level 0 or 2 | No visible UI if fast. Page skeleton if context resolution takes longer. |
| Sign-up submission | Level 1 | Button spinner + "Creating account..." + button disabled. |
| Sign-in submission | Level 1 | Button spinner + "Signing in..." + button disabled. |
| Workspace creation | Level 1 | Button spinner + "Creating..." + button disabled. |
| Company creation | Level 1 | Button spinner + "Creating..." + button disabled. |
| Company provisioning | Level 5 | Full loading surface. Status-based progress. Tip MAY appear. |
| Dashboard loading | Level 2 | KPI card skeletons, activity row skeletons. Page structure visible. |
| Invitation acceptance | Level 1 | Button spinner + "Accepting..." + button disabled. |

### 23.2 Rules

- The entry and onboarding experience MUST NOT duplicate the loading-system rules.
- The entry and onboarding experience MUST NOT create a second loading architecture.
- All loading states use tokens from `Design.md` and `04-theme-system.md`.
- All loading states respect `prefers-reduced-motion`.

---

## 24. Screen Inventory

### 24.1 Complete Screen/State List

| # | Screen | Purpose | Flow Position | Source |
|---|--------|---------|---------------|--------|
| 1 | Launch | Brand presence, session restoration | Start | This document §4 |
| 2 | Sign In | Authenticate existing user | Unauthenticated | This document §5.4 |
| 3 | Sign Up | Create new account | Unauthenticated | This document §5.5, §6 |
| 4 | Verification | Confirm email or identity | Post sign-up | This document §6.2 |
| 5 | Password Recovery | Initiate password reset | From sign in | This document §5.6 |
| 6 | Authentication Error | Show authentication failure | During auth | This document §19 |
| 7 | New-User Choice | Choose Create or Join workspace | Post auth, no workspace | This document §8.2 |
| 8 | Create Workspace | Collect workspace details | New-user, Create branch | This document §9.2 |
| 9 | Pending Workspace Approval | Wait for Platform Office approval | Post workspace creation | This document §9.3 |
| 10 | Join Workspace Guidance | Guide user to request invitation | New-user, Join branch | This document §8.3 |
| 11 | Invitation Acceptance | Accept or pass on pending invitation | Pending invitation detected | This document §15.2 |
| 12 | Create First Company | Collect company details | Workspace active, no company | This document §10.2 |
| 13 | Company Provisioning | Show provisioning progress | Post company creation | This document §10.3 |
| 14 | Provisioning Failed | Show provisioning failure | Provisioning error | This document §10.4 |
| 15 | Dashboard First Arrival | First dashboard view | After provisioning or context resolution | This document §11 |
| 16 | Dashboard Returning User | Normal dashboard view | After session restoration | This document §13 |
| 17 | Session Expired | Redirect to sign in | Session invalid | This document §19 |
| 18 | Network / Recovery | Show network error and retry | Network interruption | This document §19 |

### 24.2 Rules

- Only screens justified by the existing product architecture are included.
- If an existing screen is specified elsewhere in the PRD set, this document references it rather than duplicating its specification.
- The dashboard is specified in `06-component-patterns.md` and `05-navigation-shell.md`. This document defines the arrival experience, not the dashboard itself.

---

## 25. Flow Diagrams

### 25.1 New User Flow

```
App Open
    ↓
Launch (session restore — no valid session)
    ↓
Authentication
    ↓
Sign Up
    ↓
Verification (if required)
    ↓
Resolve workspace membership
    ↓
No workspace membership?
    ├── Pending invitation?
    │       ↓
    │   Invitation Acceptance
    │       ↓
    │   Resolve workspace
    │
    └── No pending invitation
            ↓
        New-User Choice
            ├── Create a Workspace
            │       ↓
            │   Create Workspace
            │       ↓
            │   Pending Approval
            │       ↓
            │   (approved)
            │       ↓
            │   Workspace active
            │
            └── Join a Workspace
                    ↓
                Join Workspace Guidance
                    ↓
                (user leaves and returns when invited)
    ↓
Workspace active, no company
    ↓
Create First Company
    ↓
Company Provisioning (Level 5 loading)
    ├── Ready
    │       ↓
    │   Dashboard First Arrival
    │
    └── Failed
            ↓
        Provisioning Failed
            ↓
        Retry or Contact Support
```

### 25.2 Returning User Flow

```
App Open
    ↓
Launch (session restore — valid session)
    ↓
Restore active workspace/company context
    ↓
Resolve required application state
    ↓
Dashboard Returning User
```

### 25.3 Returning User Requiring Action

```
App Open
    ↓
Launch (session restore — valid session)
    ↓
Resolve user state
    │
    ├── Pending invitation
    │       ↓
    │   Invitation Acceptance (§15)
    │
    ├── Workspace pending approval
    │       ↓
    │   Pending Approval (§9.3)
    │
    ├── Workspace ready, no company
    │       ↓
    │   Create First Company (§10)
    │
    ├── Company provisioning
    │       ↓
    │   Company Provisioning (§10.3)
    │
    ├── Company provisioning failed
    │       ↓
    │   Provisioning Failed (§10.4)
    │
    ├── Workspace unavailable
    │       ↓
    │   Workspace Unavailable screen
    │
    ├── Company unavailable (purged)
    │       ↓
    │   Company Unavailable screen
    │
    └── Session expired
            ↓
        Session Expired → Sign In
```

---

## 26. UX Invariants

| # | Invariant |
|---|-----------|
| 1 | A returning authenticated user does NOT repeat onboarding. |
| 2 | Authentication state determines the authentication entry. |
| 3 | Workspace state determines workspace onboarding. |
| 4 | Company state determines company setup. |
| 5 | Loading UI never creates artificial waiting. |
| 6 | Loading tips never block required user actions. |
| 7 | Back navigation never creates invalid setup state. |
| 8 | The dashboard is the destination after successful setup. |
| 9 | Workspace and company context remain visibly identifiable. |
| 10 | Design follows `Design.md`. |
| 11 | Loading follows `10-loading-and-refresh.md`. |
| 12 | Existing multi-tenancy lifecycle rules remain authoritative. |
| 13 | No new backend lifecycle states are introduced by this UX specification. |
| 14 | The launch experience does NOT add artificial delays. |
| 15 | Authentication is shown ONLY when no valid session exists. |
| 16 | Join-by-code UI does NOT exist. |
| 17 | The switcher placements in `16-context-switchers.md` are NOT changed. |

---

## 27. Anti-Patterns

| # | Anti-Pattern | Why It Is Prohibited |
|---|-------------|----------------------|
| 1 | Repeated onboarding for returning users | A returning user has already completed setup. Do not force them through it again. |
| 2 | Unnecessary splash delays | The launch state must not delay the application. |
| 3 | Forced product tours | Onboarding is progressive setup, not a tutorial. |
| 4 | Excessive onboarding screens | Keep the number of steps low. Each step must justify its existence. |
| 5 | Asking for optional data before value is delivered | Do not collect information that can be collected later. |
| 6 | Fake loading progress | Fake progress percentages are prohibited per `10-loading-and-refresh.md` §9. |
| 7 | Duplicate loading systems | There is one loading system. Do not create a second one. |
| 8 | Conflicting workspace/company flows | The multi-tenancy PRD is authoritative. Do not create conflicting flows. |
| 9 | Join-by-code UI | Invitation codes do not exist. Joining is invitation-based only. |
| 10 | Exposing backend errors | Error states must tell the user what happened, not expose implementation details. |
| 11 | Hidden primary actions | The primary action on every screen must be visually distinct. |
| 12 | Desktop-first forms forced onto mobile | Forms are mobile-first. Desktop adapts the layout. |
| 13 | Non-Android interaction patterns | Follow `15-interaction-model.md` for Android conventions. |
| 14 | Inconsistent back behaviour | Back must return to the previous logical step. It must not create invalid state. |
| 15 | Onboarding that blocks normal application use without a product reason | Each blocking step must answer "Why does BIGDROPS need this now?" |
| 16 | Independent visual themes for authentication/onboarding | Use `Design.md` as the authoritative visual contract. |
| 17 | Introducing new design tokens without design-system justification | All tokens come from `Design.md` and `03-design-system.md`. |
| 18 | Showing sign-up or workspace creation to a returning ready user | The launch decision model determines the destination. Do not override it. |
| 19 | Navigation back to authentication after successful sign in | Authentication screens do not remain in the back stack. |
| 20 | Allowing back to dismiss a blocking provisioning state | Provisioning is blocking. Back must not dismiss it. |

---

## 28. Cross-References

| Topic | Document |
|-------|----------|
| Visual design system and theme contract | `Design.md` |
| Structural tokens (typography, spacing, radius, elevation) | `03-design-system.md` |
| Colour tokens and theme contract | `04-theme-system.md` |
| Navigation shell (top bar, bottom nav, drawer) | `05-navigation-shell.md` |
| Component patterns (empty states, cards) | `06-component-patterns.md` |
| Loading states and refresh | `10-loading-and-refresh.md` |
| Accessibility (WCAG, touch targets, screen readers, reduced motion) | `11-accessibility.md` |
| Capacitor native (safe areas, splash screen, status bar) | `12-capacitor-native.md` |
| Interaction model (Android patterns, back, ripple, sheets) | `15-interaction-model.md` |
| Context switchers (company/workspace) | `16-context-switchers.md` |
| Multi-tenancy startup and lifecycle rules (reference only) | `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` §8, §10, §12 |
