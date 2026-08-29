# Onboarding Prototype Audit

| Audit Date | 2026-08-28 |
|-----------|-----------|
| Prototype | `Design-direction/onboarding/onboarding-flow.html` |
| Scope | Prototype fidelity against authoritative PRD and design-system documents |

## 1. Executive Summary

The onboarding prototype is **structurally complete** — it covers every major entry, auth, onboarding, provisioning, context-restoration, and dashboard state from `17-app-entry-and-onboarding.md`. It demonstrates the full flow as a single-file HTML/CSS/JS interactive proof.

However, the prototype drifts from the authoritative documents in **four areas** that a developer must address before treating the prototype as a code-generation source:

1. **Dark-theme tokens are wrong.** The dark palette does not match `Design.md` Liquid Onyx values. This is the single highest-severity finding.
2. **An invented `TEAM_INVITES` step** exists in the state machine but not in the PRD screen inventory (§24). It also introduces a third provisioning step that is not in the spec.
3. **FAB radius and size** contradict `Design.md` §12.
4. **Accessibility gaps** — no `aria-busy`, no `role="status"`, no visible focus styles, no `aria-live` on coach marks.

All four are fixable without changing the prototype's structure.

---

## 2. Dark-Theme Token Mismatch (P0)

| Property | Prototype value | `Design.md` Liquid Onyx value | Verdict |
|----------|----------------|------------------------------|---------|
| `--bg` | `#000000` (pure black) | `#0f172a` (deep navy) | WRONG |
| `--surface` | `#1a1a1a` | `#1e293b` | WRONG |
| `--surface-raised` | `#242424` | `#253448` | CLOSE (incidental) |
| `--surface-muted` | `#2a2a2a` | `#334155` | WRONG |
| `--surface-strong` | `#3d3d3d` | `#475569` | WRONG |
| `--ink` | `#f5f5f5` | `#f1f5f9` | WRONG (small delta) |
| `--ink-2` | `#b0b0b0` | `#cbd5e1` | WRONG (too muted) |
| `--ink-3` | `#808080` | `#64748b` | WRONG (too neutral) |
| `--primary` | `#5a8bbf` (muted steel) | `#60a5fa` (bright blue) | WRONG |
| `--gradient` | `linear-gradient(135deg, #5a8bbf, #8fb4d9)` | `linear-gradient(135deg, #60a5fa, #93c5fd)` | WRONG |

**Impact:** A developer who copies these tokens into `04-theme-system.md` will introduce a third visual identity that conflicts with both the approved dark theme and the light theme. The prototype's dark mode reads as "generic grayscale dark mode" rather than the approved Liquid Onyx deep-navy identity.

**Body gradient also missing:** The dark-mode body uses `radial-gradient(ellipse at top, #1a1a1a, #000000 60%, #0a0a0a)` which is a grey vignette. `Design.md` §4 says "The dark body uses a radial gradient mixing secondary and primary into near-black." The prototype should use the navy primary as the radial gradient tint, not grey.

**README contradiction:** The `README.md` claims dark-theme values match Liquid Onyx (`--bg: #0f172a, --surface: #1e293b, --primary: #60a5fa`) but the actual CSS uses different values. The README is correct per `Design.md`; the HTML is wrong.

**Fix:** Replace the `@media (prefers-color-scheme: dark)` block with the exact Liquid Onyx values from `Design.md` §5.

---

## 3. Invented TEAM_INVITES State (P0)

The prototype's state machine contains a `TEAM_INVITES` state (screen `onb-team-invites`, lines 532–546) with:
- Heading: "Add your team"
- Description: "You can invite people or skip for now."
- Primary action: "Skip"
- Secondary action: "Send invites"
- Displayed as Step 3 of 3

**PRD §24 screen inventory does not include a "Team Invites" screen.** The complete provisioning flow in §10 is:

```
Create First Company (§10.2)
    ↓
Company Provisioning (§10.3)
    ↓
Provisioning Failed (§10.4)  ← OR →  Dashboard (§11)
```

The prototype instead routes:

```
Company Setup → Provisioning → TEAM_INVITES → Dashboard
```

This inserts an extra step between provisioning completion and dashboard arrival that has no PRD equivalent.

**Also:** The step indicator shows "Step 1 of 3" on `ONBOARDING` and `WORKSPACE_SETUP`, then "Step 2 of 3" on `COMPANY_SETUP`, then "Step 3 of 3" on `TEAM_INVITES`. The PRD does not define a three-step onboarding wizard with this grouping. The PRD treats workspace creation and company creation as independent activities within a broader entry flow, not as numbered steps in a single wizard.

**Fix:** Remove `TEAM_INVITES`. Route `startProvisioning()` success directly to `DASHBOARD_FIRST_RUN`. Adjust the step indicator or remove it, since the PRD does not specify one.

---

## 4. Back Navigation Violation (P1)

The prototype's `BACK_MAP` defines:

```javascript
const BACK_MAP = {
  'ONBOARDING': 'SIGN_IN',
  'WORKSPACE_SETUP': 'ONBOARDING',
  'COMPANY_SETUP': 'ONBOARDING',
  'PENDING_APPROVAL': 'WORKSPACE_SETUP',
  'TEAM_INVITES': 'ONBOARDING',
  'PROVISIONING_FAILED': 'COMPANY_SETUP',
  // ...
};
```

`PROVISIONING_FAILED → COMPANY_SETUP` violates §10.4: "Back does NOT return to company creation. The user must retry or contact support."

The prototype mitigates this by not showing a back button on the `PROVISIONING_FAILED` screen (two `tb-spacers` in the toolbar instead of a `btn-back`). However, the `BACK_MAP` still allows Escape-key navigation to `COMPANY_SETUP`, which would be a runtime bug in production code that reads this map.

**Fix:** Set `BACK_MAP['PROVISIONING_FAILED'] = null` (or remove the entry). The back button absence on screen is correct; the map entry is the leak.

---

## 5. FAB Design Token Violations (P1)

| Property | Prototype | `Design.md` §12 | Verdict |
|----------|-----------|-----------------|---------|
| Size | `width:52px; height:52px` | 50×50px | Wrong (+2px) |
| Radius | `border-radius:50%` (circle) | 18px radius | Wrong (circle ≠ 18px) |
| Position bottom | `bottom: calc(80px + ...)` | `calc(82px + ...)` | Wrong (−2px) |
| Shadow | `0 2px 10px rgba(0,0,0,.5)` | "Large elevation: 0 8px 24px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08)" | Wrong (single shadow, not dual) |

**Fix:** Change FAB CSS to `width:50px; height:50px; border-radius:18px; bottom:calc(82px + env(safe-area-inset-bottom)); box-shadow:var(--shadow-lg)`.

---

## 6. Missing Grain Texture (P2)

`Design.md` §2 lists grain texture as a recognisable trait: "Grain texture: A subtle SVG noise overlay (opacity 0.035) on the app shell." The prototype has no grain overlay.

The README correctly notes this is absent but does not flag it as a deliberate omission. For a prototype intended to demonstrate visual fidelity, this is a meaningful omission.

**Fix:** Add a `.grain-overlay` pseudo-element with the SVG noise filter at `opacity:0.035` behind the app shell.

---

## 7. Missing Body Radial Gradient — Light Mode (P2)

`Design.md` §4: "The body uses a radial gradient that mixes the secondary and primary colours into white." The light-mode body is `background: var(--bg)` — a flat colour with no gradient.

**Fix:** Apply `background: radial-gradient(ellipse at top, var(--secondary), var(--bg) 60%, var(--bg))` to the body in light mode.

---

## 8. Notification Panel Position (P2)

The notification panel slides from the **right** (`transform: translateX(105%)`, positioned top-right). `05-navigation-shell.md` §17 specifies that bottom sheets are the default overlay per `15-interaction-model.md` §2. Notifications should be a bottom sheet, not a right-side panel.

**Fix:** Reposition the notification panel to slide up from the bottom as a bottom sheet, matching the shell specification.

---

## 9. Coach Mark Not Dismissible (P2)

The first-run coach mark on the dashboard (lines 570–583) has no close button or "Got it" action. §12.5 of `17-app-entry-and-onboarding.md` requires: "All first-run guidance is dismissible. A close button or 'Got it' action MUST be present on every guidance element."

**Fix:** Add a small × dismiss button or a "Got it" text button to the coach mark.

---

## 10. Accessibility Gaps (P2)

| Gap | Location | PRD Requirement | Impact |
|-----|----------|-----------------|--------|
| No `aria-busy` on loading screens | `show()` function | §18.5: "aria-busy=true is set on loading containers" | Screen readers announce content before loading completes |
| No `role="status"` on loading containers | Same | §18.5: "Loading start is announced via role=status" | Loading not announced |
| No `aria-live="polite"` on error messages | `setErrors()` function | §18.3: "Validation errors are announced via aria-live=polite" | Errors not announced |
| No visible focus indicators on inputs | Global CSS | §18.8: "All interactive elements are focusable" | Keyboard navigation invisible |
| No `aria-describedby` on error fields | `setErrors()` function | §18.2: "Error messages are associated with the input via aria-describedby" | Errors not linked to inputs |
| Coach mark not announced | First-run hint | §18.5 | Hint not surfaced to screen readers |
| No `role="progressbar"` on provisioning | Provisioning screen | §18.6: "Determinate progress uses role=progressbar" | Progress not announced |

**Fix:** Add the required ARIA attributes to the relevant elements in the `show()` function and `setErrors()` function.

---

## 11. Tips Content Model Incomplete (P3)

`10-loading-and-refresh.md` §7 specifies the full tip content model:

| Field | Prototype | Required |
|-------|-----------|----------|
| `id` | ✅ present | `id` |
| `message` | ✅ present | `message` |
| `category` | ❌ missing | `category` |
| `context` | ❌ missing | `context` |
| `priority` | ❌ missing | `priority` |
| `audience` | ❌ missing | `audience` |
| `repeatPolicy` | ❌ missing | `repeatPolicy` |
| `active` | ❌ missing | `active` |

The prototype only has `{ id, message }` per tip. A developer porting tips to the real system would need to add these fields. The prototype's tips pool also contains only 10 tips; `10-loading-and-refresh.md` §8 recommends a minimum of 20.

**Fix:** Expand the tips array to include all content-model fields. Add at least 10 more tips.

---

## 12. Missing PRD States (P3)

The following screens from §24 are not represented in the prototype:

| Screen | §24 # | Prototype treatment | Acceptable? |
|--------|-------|---------------------|-------------|
| Verification | 4 | Not shown (post-sign-up flow) | Partial — sign-up simulates success without showing verification |
| Authentication Error | 6 | Shown as inline error only | Acceptable for prototype — inline is the specified treatment |
| Invitation Acceptance | 11 | Replaced by alert on JOIN_WORKSPACE | Needs at minimum a simulated accept/pass screen |
| Session Expired | 15 | Not present | Needs at minimum a simulated redirect-to-sign-in |
| Network / Recovery | 16 | Not present | Needs at minimum a simulated snackbar error |
| Workspace Unavailable | 17 | Not present | Acceptable — the provisioning-failure screen covers the error pattern |
| Workspace Pending Approval | 9 | ✅ Present | — |

The prototype focuses on the happy paths and the primary error (provisioning failure). The remaining error states are lower priority for an HTML prototype but should be noted.

---

## 13. localStorage Persistence vs. README Claim (P3)

The `README.md` states: "No persistent state — the prototype resets on page reload." However, the `saveState()` function (line 647) writes to `localStorage` under `bd-onboarding-prototype`. State is actually persisted across reloads.

**Fix:** Either remove the `saveState()` / `loadState()` functions (true prototype reset), or update the README to reflect persistence.

---

## 14. Password Strength Hardcoded Colour (P3)

The password strength meter (line 766) uses `background: #f59e0b` — a hardcoded amber value not drawn from the design system. `Design.md` prohibits: "Do NOT hardcode colour values in component CSS. Always use the theme variables."

**Fix:** Replace `#f59e0b` with `var(--attention)` or a dedicated `--strength-medium` token.

---

## 15. Edit Metrics `location.reload()` (P3)

The "Edit metrics" button (line 1171) calls `location.reload()` to simulate switching dashboard modes. This resets all prototype state, which contradicts the localStorage persistence and would confuse a developer who expects the button to toggle metrics in place.

**Fix:** Replace `location.reload()` with a function that toggles between skeleton and data states without reloading the page.

---

## 16. Positive Findings

The prototype does several things correctly:

| Area | Verdict | Source |
|------|---------|--------|
| Light-theme tokens | ✅ Match `Design.md` §5 Slate Navy values | Correct |
| State machine architecture | ✅ 15+ states, clean transitions, keyboard back-nav | Good structural foundation |
| Provisioning — no cancel button | ✅ Matches §10.3 requirement | Correct |
| Level 4/5 loading with tips | ✅ Tips rotate, status updates, progress stages | Matches §8–§9 of `10-loading-and-refresh.md` |
| Dashboard first-run empty state | ✅ "No invoices yet" + zero KPI values | Matches §11 |
| Dashboard data-loaded state | ✅ KPI grid, activity list, sales chart skeleton | Matches §11 |
| Sign-in validation | ✅ Inline error, aria-live, button disabled during submit | Matches §5.4 |
| Sign-up flow | ✅ Step 1 (credentials) → Step 2 (workspace) → Step 3 (company) | Good structural match |
| Android back navigation | ✅ Escape key, hardware back via Capacitor | Matches §14 Android conventions |
| Context restore | ✅ Workspace → Company → Dashboard hierarchy | Matches §21 |
| Theme toggle in controls | ✅ Light/dark switching works | Good prototype feature |
| Progressive disclosure | ✅ Full-screen loading → skeleton → data | Matches the progressive loading system |
| Responsive layout | ✅ Works at phone widths (340px) and desktop | Matches §14 |

---

## 17. Summary of Required Fixes

| Priority | Finding | Fix effort |
|----------|---------|------------|
| **P0** | Dark-theme tokens wrong | 10 min — replace CSS variables |
| **P0** | TEAM_INVITES state invented | 15 min — remove state, fix routing, fix step indicator |
| **P1** | Back nav from PROVISIONING_FAILED | 1 min — remove BACK_MAP entry |
| **P1** | FAB size/radius/position/shadow | 5 min — fix CSS |
| **P2** | Missing grain texture | 5 min — add pseudo-element |
| **P2** | Missing light-mode body gradient | 2 min — add CSS |
| **P2** | Notification panel from right not bottom | 10 min — reposition to bottom sheet |
| **P2** | Coach mark not dismissible | 5 min — add dismiss button |
| **P2** | Accessibility ARIA gaps | 15 min — add attributes to show()/setErrors() |
| **P3** | Tips content model incomplete | 10 min — add fields to TIPS array |
| **P3** | Missing PRD states (verification, session expired, etc.) | 30 min+ — add simulated screens |
| **P3** | localStorage vs. README contradiction | 2 min — pick one, update the other |
| **P3** | Hardcoded password strength colour | 1 min — use token |
| **P3** | `location.reload()` in edit metrics | 5 min — toggle state instead |

**Total estimated fix time for P0+P1+P2: ~73 minutes.**
**Total estimated fix time for all: ~119 minutes.**

---

## 18. Recommendation

The prototype is a **strong structural reference** for a developer building the real onboarding flow. The state machine, transition logic, and flow coverage are sound. However, the dark-theme token mismatch (P0) means a developer should **not** copy CSS variables directly from the prototype. The canonical token source remains `Design.md` §5 and `04-theme-system.md`.

The `TEAM_INVITES` state (P0) should be removed before the prototype is used as a flow reference, since it introduces a screen that does not exist in the PRD and would confuse implementation.

After the P0+P1+P2 fixes, the prototype can serve as the visual and interaction reference for the React implementation.
