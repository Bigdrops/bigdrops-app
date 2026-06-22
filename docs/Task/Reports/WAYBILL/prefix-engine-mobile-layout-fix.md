# Prefix Engine — Mobile Layout Fix Report

**Date:** 2026-06-16
**Status:** Complete
**Files Modified:** `src/pages/settings/DocumentPrefixesSettingsSection.tsx`

---

## Changes Applied

### CHANGE 1: Prefix Row Layout Restructure

**Problem:** Preview strings were positioned beside the input in a `flex items-center justify-between gap-3` wrapper, causing collision on narrow screens.

**Solution:**
- Removed the `flex items-center justify-between gap-3` wrapper
- New vertical stacking layout per prefix row:
  - Row 1: Label + Reset button (inline, `flex items-center gap-2`)
  - Row 2: Input field (`w-full max-w-[120px]`)
  - Row 3: Preview container with responsive Waybill variants (`flex-col sm:flex-row`)
- Input now takes full width within its max constraint
- Preview container is a sibling below the input, not beside it
- Waybill's 4 variants stack vertically on mobile, horizontally on `sm:` breakpoint

**Result:** Clean vertical flow on all screen sizes. No horizontal overflow on mobile.

### CHANGE 2: Sticky Contextual Action Bar

**Problem:** Static "Unsaved changes" badge near the title was not actionable and wasted space.

**Solution:**
- Removed static `<span>` badge (was at lines 208-212)
- Added sticky action bar that renders only when `isDirty === true`:
  - `sticky top-0 z-10` positioning (sticks below the page header)
  - `-mx-6` negative margin to bleed into card padding
  - Amber background with dark mode support
  - "Unsaved changes" label + Dismiss button + Save Changes button
  - `animate-in slide-in-from-top-2 fade-in duration-200` entrance animation
- Added `handleDismissChanges` callback that reverts `draft` to `savedPrefixes` without saving
- Bottom "Save Prefixes" button removed (redundant with sticky bar)
- "Reset All to Defaults" button kept at bottom of card

**Result:** Save action is always visible when changes are pending. Users can dismiss or save from the sticky bar without scrolling.

### CHANGE 3: Bottom Action Area Simplified

**Before:** Two buttons — "Reset All to Defaults" (left) + "Save Prefixes" (right)
**After:** Single "Reset All to Defaults" button (left-aligned)

The Save button was removed because the sticky action bar provides the primary save mechanism. The Reset All button remains for full revert without confirmation dialog.

---

## Verification

- `eslint src/pages/settings/DocumentPrefixesSettingsSection.tsx` — passed (no output = no errors)
- `bun run audit:load` — passed (no new warnings in our file)
- Typecheck (`bun run typecheck`) — timed out at 180s (known performance issue, not related to our changes)

---

## Constraints Maintained

- No changes to validation logic (`sanitizePrefixInput`, `maxLength={6}`, `.slice(0, 6)`)
- No changes to save logic (`executeSave`, `executeSoloReset`, `executeFullReset`)
- No changes to reset logic
- Only `DocumentPrefixesSettingsSection.tsx` modified
- No new dependencies added
- No Tailwind v4 syntax used
- AlertDialog pattern unchanged
- `isDirty` state derived from existing `hasChanges()` — no new state for bar visibility
