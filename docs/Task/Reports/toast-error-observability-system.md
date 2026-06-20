# Toast Error Observability System — Verification Report

## Summary

Implemented three new modules and one modification to add expandable error details to Goey Toast error notifications and a global frontend error registry with localStorage persistence.

## Files Created

### `src/lib/errorMessages.ts`
- `toUserSafeError(error, fallback)` — extracts a user-safe message from any error type (Error, Response, string)
- `extractDiagnostic(error)` — captures full diagnostic info including stack traces, HTTP status/URL, or JSON dump
- `normalizeError(error)` — returns `{ userSafe, diagnostic }` tuple
- Status code mapping for common HTTP errors (400–503)

### `src/lib/errorRegistry.ts`
- Singleton module (no React context needed) using module-level state
- `errorRegistry.add(title, diagnostic)` → string ID — adds entry with timestamp + route, persists to localStorage
- `errorRegistry.getAll()` — returns copy of all entries (newest first)
- `errorRegistry.getById(id)` — lookup single entry
- `errorRegistry.clear()` — wipe all entries
- 200-entry FIFO limit enforced on add
- localStorage auto-persist on add/clear
- Lazy hydration — reads from localStorage only on first access
- Storage key: `bd-error-registry`

### `src/components/ui/toast/ExpandableErrorDetails.tsx`
- Internal `useState` for expanded/collapsed toggle
- "View details" / "Hide details" button with `aria-expanded`
- `<pre>` block with `white-space: pre-wrap`, monospace font, auto-scroll for overflow
- Displays full diagnostic text followed by registry ID
- No framer-motion — pure React state

## Files Modified

### `src/lib/feedback.ts`
- Added imports for `errorRegistry`, `normalizeError`, `ExpandableErrorDetails`
- `feedback.error()` now:
  1. Normalizes the error into user-safe title + diagnostic
  2. Logs to `errorRegistry.add()` before showing toast
  3. Injects `ExpandableErrorDetails` component as `description`
  4. Preserves any existing `description` from caller options by stacking both

### `src/styles/formTheme.css`
- `.bd-error-details` — flex column container with 8px gap
- `.bd-error-details-toggle` — subtle underlined button, opacity 0.7 → 1 on hover
- `.bd-error-details-diagnostic` — pre block with monospace font, `pre-wrap`, `overflow-x: auto`, semi-transparent background
- `.bd-error-toast-description-stack` — flex column for stacked user description + expandable toggle
- `@media (max-width: 480px)` — overrides `.gooey-contentExpanded` max-width to `85vw !important` for mobile

## Verification

| Check | Result |
|---|---|
| `bun run audit:load` | Pass (no new warnings) |
| `bun run typecheck` | Pass (zero errors) |
| `bun run lint` | No new errors (all 1290 errors are pre-existing in codebase) |
| No framer-motion in new components | ✅ |
| No Tailwind v4 syntax | ✅ |
| Bun runtime only | ✅ |
| Goey Toast source code untouched | ✅ |

## Architecture Notes

- `errorRegistry.ts` uses module-level state with lazy hydration — no React context provider needed, works outside component tree
- Registry entries include `route` via `window.location.pathname` — works in browser, graceful in SSR/SSG (code is client-side only)
- ExpandableErrorDetails uses `ReactNode` for `description` — compatible with GoeyToastOptions type (`description?: ReactNode`)
- Auto-dismiss pauses on hover (Goey Toast internals confirmed) — user can hover to read expandable content without timeout
- `pointer-events: auto` on wrapper — all interactive elements in description work

## Edge Cases Handled

- **Non-string title:** `normalizeError` handles Error/Response/string/unknown gracefully
- **Caller-provided description:** Preserved by stacking both the caller's description and ExpandableErrorDetails
- **localStorage full:** Silently catches quota errors during persist
- **Corrupt localStorage data:** Silently discards on hydration failure
- **Mobile viewport:** `.gooey-contentExpanded` max-width overridden to `85vw` below 480px
- **Registry overflow:** 200-entry FIFO — oldest entry dropped on each add beyond limit
