# Product Guidance — Intrusive Tips Suspended

Status: **SUSPENDED / DEFERRED**

## Reason for Suspension

The current Product Guidance inactivity tip surface is intrusive and does not provide enough value to justify the interruption.

Observed live UX issues:

- Floating rectangular guidance surface appears as a dismissible card fixed over the application
- Dismissal is not durable — interacting with the screen (touch, click, scroll, focus) resets dismissal and causes rapid reappearance
- The surface interrupts form filling and active workflow interaction
- Current guidance content is highly repetitive across contexts
- The present implementation does not provide enough value to justify the interruption

## Current Action

The `InactivityNudge` component (rendered by `NudgeMount` in `src/App.tsx`) is suspended via the `isGuidanceSurfaceSuspended()` flag exported from `src/domain/guidance/guidanceEngine.ts`. When suspended, `InactivityNudge` returns `null` immediately, preventing the floating card from rendering.

The following underlying infrastructure is preserved:

- `GuidanceEngine` — session singleton, deterministic selection, exposure history, dismiss locks, inactivity caps
- Tip definitions (`TIP_LIBRARY`)
- Deterministic selection infrastructure
- Loader slot system (`activateSlot`/`deactivateSlot`/`currentFor`)
- Connectivity resolution (`resolveEffectiveConnectivity`, `resolveLaunchStatus`)
- Loading-specific guidance embedded in dedicated loading/waiting states (e.g., `ProvisioningProgress`, `WorkspacePendingApproval`, `BiometricGate`, `TenantGate`)

The `suspendGuidanceSurface()` and `resumeGuidanceSurface()` functions provide explicit control.

## Requirements Before Re-Enabling

The feature must NOT be re-enabled until a future Product Guidance redesign addresses at least:

1. **Genuinely non-intrusive presentation** — the surface must not float over active application work
2. **Durable dismissal semantics** — dismissing must not be reset by normal interaction
3. **No immediate resurrection after user interaction** — interaction must not summon the surface
4. **Strict protection of active form/workflow interaction** — form focus and dirty state must fully suppress the surface
5. **Substantially richer guidance content** — current content is too repetitive
6. **Contextual relevance** — tips must be meaningfully specific to the user's current context
7. **Repetition control** — the engine must not repeat content aggressively
8. **Appropriate frequency/cooldowns** — longer cooldowns between prompts, stricter caps
9. **Clear separation between passive guidance and attention-seeking guidance** — different surface types for different intents
10. **Mobile-safe placement** — no overlap with navigation controls or form fields
11. **Accessibility** — screen-reader friendly, keyboard-navigable, respects reduced motion
12. **Reduced-motion behavior where applicable** — respect `prefers-reduced-motion`

## Important Boundary

This ticket concerns the intrusive Product Guidance Tips surface only. It does NOT authorize work on:

- Onboarding
- Cold launch
- Authentication
- Biometric flows
- Tenant/workspace resolution
- Provisioning
- Offline-access architecture

## Re-Enable Gate

Future agents must not simply remove the suspension flag or the `NudgeMount` conditional. Re-enabling requires an explicit Product Guidance redesign task and acceptance against this ticket. The `resumeGuidanceSurface()` function exists for controlled re-enablement but must not be called without a redesign task.
