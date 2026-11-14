# Thinking Orbs integration into Design Lab AI Chat

This commit wires the `thinking-orbs` library into the existing Design Lab AI Chat as Bolu's animated activity indicator. A new `bolu-thinking-orb.tsx` acts as the single integration point, translating the existing `ClerkState` lifecycle into `OrbState` values. `assistant-chat-thread.tsx` uses the two wrapper components in the thinking placeholder and in the empty-state slot. Supporting CSS lands in `assistant-chat-clerk.css` (layout container for the orb-avatar stack) and `assistant-chat-preview.css` (canvas sizing rule). No production files were touched.

Watch for: **(confirmed)** `BoluOrbIdentity` is called with `paused={false}` hardcoded in the empty-state slot. The orb never actually renders during idle because `CLERK_TO_ORB` returns `null` first — but if a future state is added to that map, the hardcoded `false` will leave it permanently animating. The lifecycle-derived pattern used in `BoluOrbInline` (`paused={!latest}`) is the safer approach.

**Verdict**: APPROVED

---

## High-level view

The `CLERK_TO_ORB` mapping covers three of the five `ClerkState` values (`listening → listening`, `thinking → solving`, `responding → composing`) and returns `null` for `idle` and `success`. The five unmapped OrbState values (`searching`, `working`, `weaving`, `connecting`, `shaping`) are correctly absent because the scripted demo has no tool-calling, search, or multi-source phases. No capability is fabricated.

Both `ThinkingOrb` calls use the `theme` string prop (`'light' | 'dark'`) sourced from the `tone` prop threaded down from `AssistantChatPreview`. The prohibited `dark` boolean does not appear.

The layout shift strategy is a fixed 96×96 `.ac-empty-clerk-slot` container stacking the orb canvas and the `ClerkAvatar` at the same absolute center, with `.ac-empty-clerk--orb-active` hiding the avatar via `visibility: hidden` rather than removing it from the DOM. The avatar's `aria-label` is suppressed when the orb is showing to avoid duplicate screen-reader announcements. Slot dimensions are stable regardless of which element is visible.

The inline orb is CSS-constrained to 17px inside `.ac-status-icon`. This is within the library's documented 3px tolerance from the 20px preset and is explained in the CSS comment.

The `paused={false}` on `BoluOrbIdentity` is currently dead — the `null` early-return fires before the prop is consumed for all currently mapped states — but it is a maintenance hazard if the mapping grows.

---

<details>
<summary>Issues (1)</summary>

1. **`paused={false}` dead prop on `BoluOrbIdentity`** — hardcoded in `assistant-chat-thread.tsx` at the empty-state call site. Safe today because `CLERK_TO_ORB` returns `null` for all states that should be paused, but will leave any future mapped state permanently animating. Change to `paused={!busy}` or derive from the same lifecycle pattern as `BoluOrbInline`.

</details>

<details>
<summary>Details</summary>

### State mapping: honest coverage, no fabricated capabilities

The `CLERK_TO_ORB` table maps three states and deliberately omits two (`idle`, `success`). The three mapped states align correctly with the scripted demo:

- `listening` fires when `awaiting` is true (pending cards or the `awaiting` flag). The demo's card-confirmation phase is a real lifecycle event.
- `thinking` fires when `busy` is true and no text blocks have been written — maps to `solving`.
- `responding` fires when `busy` and text is being streamed — maps to `composing`.

### Paused prop lifecycle

`BoluOrbInline` receives `paused={!latest}`: only the bottom-most assistant message in the thread keeps its canvas animating; all prior turns freeze. This satisfies the requirement that completed turns must not keep running.

`BoluOrbIdentity` in the empty-state slot receives `paused={false}` unconditionally. The `null` early-return in `BoluOrbIdentity` means no canvas is ever constructed for `idle` or `success`, so the hardcoded `false` has no visible effect today. The risk is forward-looking: `paused` is never derived from the conversation lifecycle at this call site, so a new `CLERK_TO_ORB` entry that maps an idle-adjacent state would animate continuously in the empty-state slot. Changing to `paused={!busy}` closes that gap without touching the current behavior.

### Inline canvas sizing

`.ac-status-icon canvas { width: 17px !important; height: 17px !important; }` shrinks the 20px canvas to fit the status row. The `!important` is needed because the library sets its dimensions via inline styles. The 3px reduction is explicitly within the library's stated tolerance; the commit message and the CSS comment both document the reasoning.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/components/design-lab/bolu-thinking-orb.tsx` | New — `BoluOrbInline` (size 20) and `BoluOrbIdentity` (size 64) wrapping `ThinkingOrb` with `ClerkState → OrbState` mapping |
| `src/components/design-lab/assistant-chat-thread.tsx` | Replaced `Loader2` with `BoluOrbInline`; replaced `AssistantMark` in empty-state with orb-avatar stack; added `clerkState` and `tone` props |
| `src/components/design-lab/assistant-chat-clerk.css` | New — Bolu vector portrait animations, launcher, dock, and `.ac-empty-clerk-slot` layout container |
| `src/components/design-lab/assistant-chat-preview.css` | Added `.ac-status-icon canvas` 17px rule; glassmorphism and composer style updates |
| `src/components/design-lab/assistant-chat-preview.tsx` | Passes `clerkState` and `tone` to `AssistantThread`; wires `ClerkDock`, `ClerkLauncher`, `LauncherCoexistence` |

Full diff: `git diff HEAD~1..HEAD`
</details>
