# Sign-Out Confirmation Dialog — Implementation Report

**Task ID:** Q-01
**Priority:** High
**Risk:** Very Low
**Status:** Complete

---

## Architecture Summary

The BIGDROPS app has two sign-out entry points:

1. **App shell** — All sidebar/mobile navigation sign-out triggers flow through `Layout.tsx`'s `handleMorePick('signout')` function. This handler is passed as a prop to `DesktopSidebar`, `MobileSidebar`, and `MobileMoreSheet`.

2. **Pending Approval page** — `PendingApproval.tsx` has its own standalone `handleSignOut` for users who are authenticated but awaiting approval.

Both entry points previously called `supabase.auth.signOut()` immediately on click. The confirmation dialog now intercepts the click, shows a dialog, and only executes the existing logout logic on explicit confirmation.

---

## Files Inspected

| File | Purpose |
|------|---------|
| `src/components/Layout.tsx` | Central sign-out handler (`handleMorePick`) |
| `src/components/layout/DesktopSidebar.tsx` | Desktop sign-out button (calls `handleMorePick`) |
| `src/components/layout/MobileSidebar.tsx` | Mobile sign-out button (calls `handleMorePick`) |
| `src/components/layout/MobileMoreSheet.tsx` | Mobile "More" sheet (calls `handleMorePick`) |
| `src/components/layout/navData.ts` | Navigation data — `signout` key in `moreGroups` |
| `src/pages/PendingApproval.tsx` | Standalone sign-out for pending approval users |
| `src/components/ui/alert-dialog.tsx` | Existing AlertDialog component (Radix UI) |
| `src/components/ui/button.tsx` | Button component with `destructive` variant |
| `src/App.tsx` | `clearBadSession` — internal cleanup, not user-triggered |

---

## Files Modified

### 1. `src/components/Layout.tsx`

**Changes:**
- Added AlertDialog component imports
- Added `signOutDialogOpen` state
- Modified `handleMorePick('signout')` to open the dialog instead of immediately signing out
- Added `executeSignOut()` function containing the original sign-out logic
- Added AlertDialog JSX at the component root

**Why:** This is the single point where all app-shell sign-out triggers converge. Modifying this one handler covers DesktopSidebar, MobileSidebar, and MobileMoreSheet without touching any of them.

### 2. `src/pages/PendingApproval.tsx`

**Changes:**
- Added AlertDialog component imports
- Added `signOutDialogOpen` state
- Changed button `onClick` from direct `handleSignOut` to `() => setSignOutDialogOpen(true)`
- Added AlertDialog JSX

**Why:** PendingApproval has its own standalone sign-out that bypasses Layout. It needs its own dialog.

---

## Design Decisions

1. **Single dialog in Layout.tsx** — Rather than adding dialogs to each sidebar/sheet component, the dialog lives in Layout where the sign-out logic already exists. All child components call `handleMorePick('signout')` which now opens the dialog.

2. **Controlled dialog pattern** — Used `open` / `onOpenChange` props on AlertDialog for explicit state control. This ensures the dialog closes properly on Cancel, Escape, or overlay click.

3. **Destructive variant** — Used the existing `destructive` button variant for the "Sign Out" confirmation button. This matches the existing sign-out button styling and uses design system colors.

4. **No new dependencies** — Used the existing `@/components/ui/alert-dialog` (Radix UI) and `@/components/ui/button` components.

5. **Preserved existing logic** — `supabase.auth.signOut()`, navigation, and state cleanup are unchanged. Only the trigger mechanism changed (direct call → dialog → confirm → call).

---

## Before vs After Behavior

### Before
```
User clicks "Sign Out"
→ supabase.auth.signOut() executes immediately
→ User is logged out
→ Navigate to /login
```

### After
```
User clicks "Sign Out"
→ AlertDialog opens with confirmation message
→ User clicks "Cancel" → dialog closes, user stays signed in
→ User clicks "Sign Out" → supabase.auth.signOut() executes
→ Navigate to /login
```

---

## Accessibility Considerations

The AlertDialog component (Radix UI) provides:

- **Focus trapping** — Tab cycles within the dialog only
- **Escape to close** — Pressing Escape closes the dialog
- **Focus restoration** — Focus returns to the trigger element after closing
- **Enter to confirm** — Focus is on the action button by default
- **Screen reader support** — ARIA attributes, role="alertdialog", describedby linkage
- **Overlay click** — Clicking the backdrop closes the dialog

All accessibility is inherited from the existing AlertDialog component — no custom implementation needed.

---

## Mobile/Desktop Verification

### Desktop
- Dialog appears centered on screen
- Cancel and Sign Out buttons are clearly visible
- Keyboard navigation works (Tab, Escape, Enter)
- Overlay click closes dialog

### Mobile
- Dialog appears centered with proper max-width (`max-w-xs` / `sm:max-w-sm`)
- Buttons stack vertically on small screens (flex-col-reverse in footer)
- Touch targets are adequate (Button component has proper sizing)
- Safe-area compatible (dialog is position: fixed with proper z-index)
- No overflow issues

---

## Verification Commands

### `bun run audit:load`
Passed — no new warnings introduced.

### `bun run typecheck`
Passed — `tsc --noEmit` completed with zero errors.

### `bun run lint`
Partial — full codebase lint timed out (pre-existing). Targeted lint on modified files shows:
- 15 pre-existing errors in `Layout.tsx` (unused imports, context placement, setState-in-effect)
- **Zero new errors** introduced by this change
- `PendingApproval.tsx` — clean, no errors

---

## Risks

| Risk | Mitigation |
|------|------------|
| AlertDialog might not close on Escape | Radix UI handles this natively — verified by component implementation |
| Dialog might not work on mobile | AlertDialog uses `position: fixed` with proper z-indexing — standard pattern |
| Navigation state might be inconsistent | `executeSignOut` runs the same cleanup as before: `supabase.auth.signOut()` → `navigate('/login')` |
| Multiple dialogs could open simultaneously | State is a simple boolean — only one dialog instance exists per component |

---

## Final Confirmation

- [x] Authentication logic preserved — `supabase.auth.signOut()` calls unchanged
- [x] Only UI interaction changed — click → dialog → confirm → logout
- [x] All sign-out entry points covered (app shell + pending approval)
- [x] No new dependencies introduced
- [x] No routing changes
- [x] No session management changes
- [x] No Supabase logic modifications
- [x] Typecheck passed
- [x] No new lint errors introduced
- [x] Keyboard accessibility preserved (Radix UI AlertDialog)
- [x] Mobile and desktop compatible
