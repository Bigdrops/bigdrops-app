# Assistant Chat UX — Desktop and IA Redesign

The commit replaces a full sticky `<header>` band (h1 title + subtitle) with a compact inline strip, removes duplicate approval-card rendering from the right-hand panel, and elevates the panel into a genuine read-only invoice document preview. Four supporting CSS files received concurrent cosmetic and structural updates — backdrop glass, ambient stage gradients, settings drawer, and the fold-open side column background. The TypeScript surface is clean; eight pre-existing errors in unrelated files are confirmed unchanged.

**Watch for:** The right-hand panel prop signature still exposes `pending` and `onDecide` via renamed underscored params (`_pending`, `_onDecide`). The count is correctly surfaced as a status label — but the type contract advertises a decision surface that the component no longer provides. If a future caller passes real callbacks expecting them to fire, the mismatch will be silent. *(confirmed — readable from the current `InvoicePanel` signature)*

**Verdict**: APPROVED

---

## High-level view

The header replacement is surgical: `AssistantChatHeader` is a new file producing a plain flex div with a back link, inline title, and reset pill. The old sticky `<header>` with `h1` and subtitle block is gone. Outer container padding was trimmed from `py-5` to `pb-5 pt-2` to close the gap the band used to occupy.

The dual approval-card problem is fully resolved. The `ChangeCardView` import, the `ChangeCardView` block, and the `provider`/`onManageProviders` props were removed from `InvoicePanel` in one clean pass. The pending count now flows into a lightweight accent-coloured label ("1 decision in conversation") that keeps the panel status-only. The authoritative decision surface is exclusively the conversation thread.

The workspace CSS commit is significantly larger than the panel logic change — 257 insertions. It moves the glass-panel treatment (border, backdrop-filter, ambient gradient) from `assistant-chat-preview.css` into `assistant-chat-workspace.css`, applies the liquid-glass aesthetic to `.ac-panel`, `.ac-doc`, and `.ac-main--canvas`, adds the settings drawer classes (`.ac-settings-drawer`, `.ac-settings-overlay`), and introduces the ambient stage halo (`.ac-stage::before`). These are visual refinements to the existing structure — no new components, no layout changes.

The four viewport shells (`FoldClosed`, `FoldOpen`, `TabletShell`, `DesktopShell`) in `assistant-chat-layouts.tsx` are untouched. All viewport-switching, scripted conversation, decision routing, and Thinking Orb integration are confirmed unchanged by the diff.

---

<details>
<summary>Issues (1)</summary>

1. **Dead `_pending`/`_onDecide` interface contract** — `InvoicePanel` accepts `pending: PendingCard[]` and `onDecide` in its public signature but aliases them with underscore prefixes to signal they are unused. Any caller that passes real `onDecide` callbacks expecting them to fire will silently lose those decisions. Document the props as deprecated or narrow the type to `pendingCount: number` only, removing the callback entirely.

</details>

<details>
<summary>Details</summary>

### Dead decision surface in the type contract

`InvoicePanel` today:

```ts
export function InvoicePanel({
  invoice,
  pending: _pending,
  onDecide: _onDecide,
}: {
  invoice: InvoiceState
  pending: PendingCard[]
  onDecide: (messageId: string, cardId: string, accepted: boolean) => void
})
```

The public prop type still promises a decision callback. The internal rename to `_onDecide` communicates developer intent but doesn't enforce it — TypeScript will accept any caller that passes those props without complaint, and the callbacks will never execute. The completion report acknowledges this as "Reserved for future use," but a decision callback that silently does nothing is a sharper trap than a missing prop. The clean fix is to drop `onDecide` from the type and pass only `pendingCount: number`, matching what the component actually uses.

### Viewport simulation integrity

The diff touches zero lines in `assistant-chat-layouts.tsx`. All four shells — `FoldClosed`, `FoldOpen`, `TabletShell`, `DesktopShell` — are intact. The stage scaling (`useStageScale`), caption labels, and viewport-id routing are unchanged. Confirmed.

### Thinking Orbs wiring

`bolu-thinking-orb.tsx` is untouched. `BoluOrbIdentity` (empty state, 64px) and `BoluOrbInline` (thinking state, 20px) remain connected to `clerkState` in `AssistantThread`. The `CLERK_TO_ORB` mapping (`listening → listening`, `thinking → solving`, `responding → composing`) is unmodified. The `ac-empty-clerk-slot` / `ac-empty-clerk--orb-active` stacking rules in `assistant-chat-clerk.css` are unchanged — avatar hides via `visibility: hidden` when the orb is active, keeping aria attributes in the DOM. Confirmed.

### CSS scope discipline

All new rules in the workspace CSS diff are scoped under `.ac-` prefixes. No global selector pollution. The `@supports not (backdrop-filter)` fallback block is correctly scoped to the design lab surface. The `prefers-reduced-motion` rule correctly picks up the new `.ac-settings-drawer` animation alongside the existing `.ac-drawer` and `.ac-sheet`. Phone-viewport model pill rules (`.ac-stage[data-viewport='fold-closed'] .ac-model`) are viewport-scoped and don't affect other breakpoints.

### Unrelated files

The diff is strictly four files: one new component (`assistant-chat-chrome.tsx`), one modified component (`assistant-chat-panel.tsx`), one layout adjustment (`assistant-chat-preview.tsx`, single line), and one CSS file (`assistant-chat-workspace.css`). No other Design Lab experiments, no production Bolu assistant, no global architecture files. Confirmed by `git show --stat HEAD`.

</details>

---

<details>
<summary>Files changed (4)</summary>

| File | Change |
|------|--------|
| `src/components/design-lab/assistant-chat-chrome.tsx` | **New.** Compact flex strip replacing the sticky `<header>` band. Back link, inline title, reset pill. No sticky, no border-b, no h1. |
| `src/components/design-lab/assistant-chat-panel.tsx` | Removed `ChangeCardView` block and `provider`/`onManageProviders` props. Pending count becomes an accent status label. Panel is now read-only invoice preview. |
| `src/components/design-lab/assistant-chat-preview.tsx` | Single-line spacing tweak: `py-5` → `pb-5 pt-2` on the outer container. |
| `src/components/design-lab/assistant-chat-workspace.css` | 257 insertions: ambient stage halo, glass treatment for panel/doc/canvas, settings drawer classes, fold-open side column background, phone model pill layout. |

Full diff: `git show 26f5d85c`

</details>
