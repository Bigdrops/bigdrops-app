# Assistant Chat UX Redesign — Completion Report

This report was written by Kiro on 2026-11-13 via workflow step.

---

## Objective

Redesign the Design Lab Assistant Chat experience to resolve desktop UX and information-architecture weaknesses. Establish a coherent, intentional workspace in which the conversation is the primary surface and secondary elements have distinct, non-competing roles.

## Scope

Design Lab assistant chat surface only. No production Bolu assistant, no global application chat architecture, no other Design Lab experiments were modified.

---

## Component Hierarchy Map

Discovered from source, not assumed.

```
AssistantChatPreview (src/components/design-lab/assistant-chat-preview.tsx)
├── AssistantChatHeader          ← page-level chrome (compact strip)
├── AssistantChatControls        ← viewport switcher, appearance, family, clerk mode
│     ├── Segmented<ViewportId>
│     ├── Segmented<PhotoHeroAppearance>
│     ├── FamilyPicker
│     └── ClerkStatePicker
└── .ac-device wrapper
      ├── AssistantWorkspace     ← layout router (src/components/design-lab/assistant-chat-layouts.tsx)
      │     Routes to one of:
      │     ├── FoldClosed       — phone, 390×812, single column + sheets
      │     ├── FoldOpen         — fold open, 828×700, chat + side panel split
      │     ├── TabletShell      — tablet, 1024×740, rail + chat + drawer
      │     └── DesktopShell     — desktop, 1280×800, rail + canvas + artifact column
      │
      │     Each shell receives these slots:
      │     ├── modelPill        → ModelPill (provider/model selector)
      │     ├── thread           → AssistantThread (conversation log + empty state)
      │     │     ├── BoluOrbIdentity (empty state, 64px)
      │     │     ├── ClerkAvatar (turn avatar, 32px)
      │     │     ├── ChangeCardView per approval card  ← AUTHORITATIVE rendering
      │     │     └── BoluOrbInline (thinking state, 20px)
      │     ├── composer         → AssistantComposer (text input + send/stop)
      │     ├── panel            → InvoicePanel (invoice preview only — no duplicate cards)
      │     ├── settings         → ProviderSettings (overlay/sheet/panel)
      │     ├── clerk            → ClerkLauncher (floating character button)
      │     └── clerkDock        → ClerkDock (expandable identity card)
      │
      └── LauncherCoexistence    ← lab coexistence overlay (not product UI)
```

**State ownership:** `AssistantChatPreview` owns all state. No duplicate state management. The `pending` array is derived from `messages` state; it flows into both `AssistantThread` (renders the actionable cards) and `InvoicePanel` (shows only the count as a status label).

---

## Architectural Decisions

### A. Compact chrome (2A)

**Decision:** Remove the full sticky `<header>` band with `h1 "Assistant Chat"` and subtitle. Replace with a compact inline strip (back link, inline experiment name, reset button). No `sticky`, no `border-b`, no `bg-card/95`.

**Rationale:** The original header consumed significant fixed vertical space and competed visually with the device simulation below. Onboarding V5 (`ob5-dock`) demonstrates the correct restraint: controls in a minimal fixed row, the experiment content taking full available height. The experiment title is preserved as inline text, small and unobtrusive.

**How:** `AssistantChatHeader` in `assistant-chat-chrome.tsx` changed from a `<header>` with full block layout to a simple flex row using `div`. The outer container padding in `assistant-chat-preview.tsx` was tightened from `py-5` to `pb-5 pt-2` to close the gap.

### B. Single authoritative card rendering (2B)

**Decision:** Approval cards appear in the conversation thread only. Removed the `ChangeCardView` block from `InvoicePanel`.

**Rationale:** The original panel rendered `ChangeCardView` components for all pending cards via its "Waiting on you" section. Those same cards were also rendered in `AssistantThread`. This created two simultaneous decision surfaces for the same action — users could accept/reject in either place, with no clear primary surface.

**What is in the panel now:** Only the invoice metadata (client, due date, total, line items). When pending cards exist, the panel shows a lightweight count label ("1 decision in conversation") that directs the user back to the thread. This is status information only, not a decision surface.

**How:** Removed the `ChangeCardView` import, the `onManageProviders` prop (unused in the pre-existing preview call), and the `provider` prop. The `onDecide` and `pending` props are retained in the type signature for interface compatibility but prefixed `_pending` and `_onDecide` internally to indicate they are read-only references.

### C. Panel as structured document preview (2C)

**Decision:** Retain the right-hand panel. It provides genuinely distinct information: a live structured view of the invoice state (client, due, total, line items). This is different from the conversation — the conversation shows the narrative of changes; the panel shows the resulting document state.

**Rationale:** Deleting the panel would remove the structured artifact view. Its role is to let the user verify what the invoice looks like as a document, independent of the conversational narrative. This purpose is distinct enough to justify a persistent side column on wider viewports.

### D-H. Preserved functionality

All viewport modes, Thinking Orbs integration, clerk launcher/dock, theme/appearance controls, composer, model pill, and scripted conversation behavior are unchanged.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/design-lab/assistant-chat-chrome.tsx` | **New file.** Compact inline chrome strip replacing full sticky header band. |
| `src/components/design-lab/assistant-chat-panel.tsx` | Removed `ChangeCardView` rendering (duplicate approval cards). Added pending count status label. Removed unused `provider`, `onManageProviders` props from pre-existing working tree. |
| `src/components/design-lab/assistant-chat-preview.tsx` | Adjusted outer container spacing to match compact chrome. |
| `src/components/design-lab/assistant-chat-workspace.css` | Added `.ac-panel-label--pending` accent colour rule. |

---

## Preserved Functionality Checklist

| Item | Status |
|------|--------|
| Scripted invoice conversation (all turns) | Preserved — no changes to script, state, or play() |
| Four viewport simulation modes | Preserved — `AssistantWorkspace` and all four shell components unchanged |
| Viewport switcher (Segmented control) | Preserved — `AssistantChatControls` unchanged |
| Thinking Orbs integration (`BoluOrbIdentity`, `BoluOrbInline`) | Preserved — `bolu-thinking-orb.tsx` unchanged, orb connected to real `clerkState` |
| ClerkAvatar state animations | Preserved — `assistant-chat-clerk.css` and `assistant-chat-clerk.tsx` unchanged |
| Launcher / ClerkLauncher floating button | Preserved |
| ClerkDock expandable identity card | Preserved |
| Theme / appearance / family controls | Preserved — `AssistantChatControls` and `FamilyPicker` unchanged |
| Reset all functionality | Preserved — `resetAll()` still wired to chrome button |
| Provider settings (overlay/sheet) | Preserved |
| Mobile responsive layouts | Preserved — `FoldClosed` bottom sheet pattern unchanged |
| No horizontal overflow | Preserved — no layout width changes |
| Approval card decisions (accept/reject) | Preserved — `ChangeCardView` in thread, `decide()` wired correctly |
| `LauncherCoexistence` overlay | Preserved |

---

## TypeScript Verification

```
bun run audit:load: passed
bun run typecheck: 8 errors in 6 files (all pre-existing, none introduced by this task)
  - src/components/dashboard/DashboardOverview.tsx — pre-existing (useLayoutMode property mismatch)
  - src/lib/ai-assistant/keys.ts — pre-existing (Directory.Private missing)
  - src/lib/uiSoundEvent.ts — pre-existing (SoundCategory record incomplete)
  - src/tests/pdf/*.test.ts (3 files) — pre-existing (spread type error)
  Zero errors in any design-lab assistant-chat file.
bun run build: skipped due to hardware policy
supabase db push: not applicable (no SQL changes)
```

---

## Git Diff Summary

Commit: `26f5d85c`
Message: `feat: Assistant Chat UX redesign — compact chrome, no duplicate approval cards`
Files changed: 4 (1 created, 3 modified)
Insertions: 357, Deletions: 68

```
 src/components/design-lab/assistant-chat-chrome.tsx    | created
 src/components/design-lab/assistant-chat-panel.tsx     | modified
 src/components/design-lab/assistant-chat-preview.tsx   | modified
 src/components/design-lab/assistant-chat-workspace.css | modified
```

---

## Remaining Limitations and Open Issues

1. **Desktop artifact column always visible.** The `.ac-artifact` column (336px) in `DesktopShell` renders unconditionally. The panel is now genuinely distinct (invoice data only), so the column earns its presence once a conversation is in progress. At empty state it shows "No line items yet." A future improvement could conditionally show the column only after the first accepted card — but this would require a product decision about the initial blank-state experience.

2. **`AssistantChatControls` position.** The controls (viewport switcher, appearance, family, clerk mode) remain outside the device frame, sitting between the compact chrome strip and the device. This is the correct lab chrome pattern. If the user wants to move these inside the device or into an overlay, that is a separate product decision.

3. **Pre-existing TypeScript errors.** Eight TypeScript errors in unrelated files were present before this task. These are not introduced by this work. They are protected under concurrent-agent-safety rules and cannot be reverted.

Skills used: react-dev, vercel-react-best-practices, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English
