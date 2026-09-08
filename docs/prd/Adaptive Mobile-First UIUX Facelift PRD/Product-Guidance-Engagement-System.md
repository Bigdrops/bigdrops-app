# BIGDROPS Product Guidance and Engagement System — Plan

Status: Draft plan for review. Planning only. No implementation.

Author: Muse Spark, 2026-09-08, via OpenCode.

Authority: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/10-loading-and-refresh.md`
remains authoritative for loading behavior. This plan extends it. It does not
override it. Where the two conflict, the loading PRD wins.

Related code (current state, read-only reference):

- `src/hooks/useLoadingTip.ts` — per-loading-instance tip state. Resets all
  history on deactivate. This reset is the repetition defect.
- `src/lib/tipContent.ts` — tip library with id, category, message, context,
  priority, audience, repeatPolicy, active.
- `src/components/app/QuickTipCard.tsx` — plain-text tip card.
- `src/components/app/SplashOverlay.tsx`, `src/App.tsx` — current consumers.

Skills applied: mobile-app-ui-design, mobile-android-design, shadcn,
tailwind-capacitor, material-3.

---

## 1. Problem Statement

The current tips implementation ties tip state to individual loading instances.
Each loading pass starts fresh, so the same first tip repeats. Login takes
5–7 seconds but a tip may show for only 2 seconds. A second loading pass
destroys the visible tip. Presentation is plain text with no animation.
Guidance exists only inside loading, so empty states, first use, inactivity,
and workflow context carry no guidance at all.

## 2. Product Goal

Build a Guidance Engine that continuously evaluates context and selects
appropriate guidance, presents it proportionally, preserves workflow,
remembers exposure, rotates intelligently, and works with or without loading.

Conceptual shift:

- OLD: Loading shows text tip. Loading ends. Tip disappears.
- NEW: Guidance Engine evaluates context, selects guidance, presents it
  proportionally, preserves workflow, remembers exposure, rotates
  intelligently, and uses text, animation, character, or contextual
  presentation with or without loading.

## 3. Design Principles

1. Workflow safety first. Guidance never navigates, submits, mutates data,
   closes forms or sheets, resets state, steals focus, or discards work.
2. Proportionality. Disruption matches context. Active form work gets almost
   nothing. Idle empty states may get more.
3. Loading never waits for guidance. Operation duration controls display.
   No artificial delays. No fake progress.
4. Status and errors outrank guidance. Guidance yields or hides.
5. Memory over randomness. Selection uses context and exposure history.
6. One engine, many surfaces. Loading is one trigger among many.
7. Respect attention. Cooldowns, caps, and suppression are mandatory.
8. Accessibility is non-negotiable. Reduced motion, screen readers, focus
   safety, 44px targets, safe areas.

## 4. Relationship to Loading States and Refresh

The loading PRD keeps full authority over levels 0–5, progress models,
anatomy, motion, refresh behavior, and error handling. This plan adds:

- A session-scoped guidance state that survives individual loading
  operations. Loading start and end must not reset rotation history,
  cooldowns, or exposure records.
- Loading as one trigger source feeding the engine, alongside inactivity,
  empty states, first use, workflow context, milestones, and long operations.
- Presentation levels below for non-loading surfaces. Loading surfaces keep
  their PRD anatomy. The guidance slot inside Level 4 and 5 keeps its
  position, size cap, and dismiss control.

## 5. Guidance Engine Concept

A single session-scoped engine with four duties: observe context, score
eligible items, present at the right level, and record exposure. Engine state
lives at app or session scope, never inside a loading component. Loading,
inactivity, navigation, and record changes emit events. The engine decides.

Engine keeps: exposure log per item (count, last shown time, dismissed flag,
learned flag), per-category cooldowns, session caps, and current context
(route, record type, record state, form-dirty flag, idle time, operation in
progress).

## 6. Guidance Trigger Sources

| Source | Signal | Intensity ceiling |
|---|---|---|
| Loading Level 4/5 | Operation start, duration estimate | Contextual |
| Long-running operation | Elapsed time past read threshold | Contextual |
| Inactivity | No input for threshold (see §10) | Contextual, then Attention only if idle persists outside forms |
| Empty state | Zero-record list or new module | Contextual |
| First use | First visit to module or feature | Contextual |
| Workflow context | Route plus record state (e.g. unpaid invoice open) | Passive or Contextual |
| Record context | Status flags (overdue, unconverted quotation) | Passive |
| Unused features | Never-used important feature, low frequency | Contextual, capped |
| Business opportunity | Unrecorded payment, unconverted document | Contextual |
| Feature education | New or changed capability | Passive |
| Productivity | Faster path exists for repeated manual flow | Passive |
| Milestone | First invoice paid, tenth client, quota reached | Attention (celebratory, brief) |

## 7. Eligibility and Selection

An item is eligible when: active flag is true, context matches or is null,
category cooldown has passed, item cooldown has passed, repeat policy allows
another session exposure, item is not dismissed-locked, and no suppression
rule fires (active form input, blocking operation needing status, error
visible, guidance already visible).

Selection order: contextual match first, then priority value, then
least-recently-shown, then lowest session view count. Deterministic. No pure
random. Ties break by stable item id order.

Suppression always wins over eligibility. Active typing or focused form input
suppresses everything above Passive. Visible errors suppress everything.
A visible guidance item suppresses all others until dismissed or expired.

## 8. Rotation and History

- Engine records every exposure with timestamp, trigger, and outcome
  (expired, dismissed, acted upon where observable without navigation).
- Recent-history exclusion window: last 5 shown, matching current PRD rule.
- Session view cap per item from its repeatPolicy (current default 3).
- Dismissed items enter a long cooldown (recommended: rest of session for
  Passive and Contextual, shorter for milestone corrections).
- Learned items (user performed the guided action in any later session)
  retire permanently or drop to lowest priority.
- Loading start, loading end, refresh, and route change must not clear
  history. History clears only on session end and on explicit user reset
  (recommended: a settings control in a later phase).

## 9. Presentation Levels

- Passive. Inline hint inside existing layout. Example: muted helper line
  under a section, or a status-dot annotation. No overlay. No motion beyond
  fade-in. Default for active workflows.
- Contextual. Anchored card, bottom sheet, or loading-slot tip. Dismiss
  control required. 44px target. This is the normal maximum during any
  form or record work.
- Attention. Prominent card or character moment with entrance motion.
  Allowed only when the user is idle outside unsaved work, on empty states,
  at milestones, or during long waits with no status competition.
- Intervention. Reserved for blocking consequences the user must resolve
  (errors, destructive confirmations, failed operations). Guidance content
  must not use this level for education. Errors already own it.

Automatic guidance must never exceed Contextual while a form is dirty or an
input is focused. Attention requires idle plus clean state.

## 10. Contextual Guidance

Context is a tuple the engine maintains: route module, record type and
status, form-dirty flag, input-focus flag, idle seconds, operation status,
tenure and usage counters. Guidance items declare a context filter using the
same module names as routing (`invoices`, `quotations`, `clients`, and so
on) plus record predicates (unpaid, overdue, unconverted, empty).

Examples: invoice form dirty → only Passive hints, if any. Unpaid invoice
open and idle 60 seconds outside the form → Contextual payment reminder
without navigation. Empty dashboard on first login → Contextual starter
guidance. Never-used Compliance Hub after 10 sessions → Contextual single
prompt with session lock on dismiss.

## 11. Inactivity Guidance

- Meaningful inactivity means no pointer, key, touch, or scroll input for
  the threshold. Active typing resets the timer on every keystroke. Focused
  inputs double the threshold. Dirty forms cap presentation at Passive.
- Recommended thresholds: 45 seconds passive viewing, 90 seconds with
  focused input, 120 seconds with dirty form (Passive only).
- Cooldown after any inactivity prompt: 10 minutes minimum. Maximum 2
  inactivity prompts per session. Escalation from Contextual to Attention is
  forbidden while form state is unsaved.
- Suppression: any input during presentation grace period cancels it.
  Dismissal locks the item for the session.

## 12. Workflow-Safety Rules

Automatically surfaced guidance is informational and contextual by default.
It must not navigate, route, close, submit, mutate, reset, discard,
change tabs, interrupt input, or steal focus. Dismissal returns the user to
the exact prior state with zero side effects.

Any navigation or deep help action must be a separate explicit user tap on a
clearly labeled control, and on dirty forms it must first confirm unsaved
work through the existing unsaved-changes pattern. Focus stays where the
user left it. Screen-reader announcements use `aria-live="polite"`.
Guidance never uses `assertive` except true errors, which belong to the
error system, not guidance.

## 13. Animation System

Animation is a presentation capability of the engine, not decoration.

- Entrance and exit: fade plus small translate, 200ms ease-out, instant
  under reduced motion.
- Looping: subtle idle motion only at Attention level and above, maximum
  3 loops or 6 seconds, then static frame.
- Character motion (see §14) reuses the same timing tokens as the loading
  PRD surface transitions.
- Mobile budget: transform and opacity only. No layout animation. Pause
  when off-screen or tab hidden.
- Every animated item ships a static reduced-motion frame that carries the
  full message. Message must read completely without animation.

## 14. Character and Mascot Framework

A reusable presentation layer with fixed slots: identity, expression or
action state, message, trigger, intensity, and reduced-motion fallback.
Content authors fill slots. Engineers build one renderer.

Design test (proves expressiveness, not a mandate): a character bows deeply
and taps its forehead to the floor, cracking the ground, while pleading for
payment recording so the app runs at full power. Slots used: identity
(helper character), action (bow plus floor-crack loop), message (record
payments), trigger (unpaid invoices plus idle), intensity (Attention, idle
only, never on dirty forms), fallback (static bowing frame plus full text).

Character appears at Attention level only, maximum once per session, never
during active work, never with sound by default, always dismissible with a
44px control.

## 15. Loading Integration

- Tips remain allowed only at Level 4 and 5, per the loading PRD.
- The Level 4/5 tip slot becomes a renderer for engine-selected items. The
  engine supplies the item. The surface keeps PRD anatomy, size, position,
  and dismiss control.
- Operation shorter than read time shows no tip. Status information
  replaces the tip slot whenever the operation needs it. Errors hide the
  slot immediately.
- Level 5 rotation keeps the 8-second minimum and 3-tip cap. Rotation
  draws from engine history, so a refresh or second loading pass continues
  the sequence instead of restarting it.
- Fast operations, refresh, Level 0–3: unchanged, no guidance.

## 16. Accessibility

Screen-reader announcements for guidance use `aria-live="polite"`.
Decorative character motion is `aria-hidden`. Dismiss and advance controls
are focusable with visible focus rings and accessible labels. Focus never
moves into Passive or Contextual guidance automatically. Reduced motion
stops all loops and reduces transitions to near-instant while keeping the
message. Contrast follows WCAG 2.2 AA (4.5:1 text). Guidance surfaces use
theme tokens only.

## 17. Mobile and Android Behavior

Dismiss and advance targets are minimum 44×44px. Sheets respect safe-area
insets. Guidance never covers primary actions, FABs, or the bottom nav.
On small phones, one guidance item visible at a time, maximum 3 lines plus
title before truncation with expansion on tap. Foldables and tablets may
use anchored panels instead of full-width sheets. Desktop may use popovers.
Landscape keeps guidance clear of the keyboard. System back dismisses
Contextual guidance first, never the underlying form.

## 18. Content Architecture

A guidance item carries: identity (stable id), message (title plus body),
category (controlled taxonomy from the loading PRD, extendable), context
filter, trigger source, priority, presentation ceiling, animation or
character slot reference, cooldown, eligibility predicate, dismissal
behavior, and learning condition. This is a product contract, not a
database schema. No data model is prescribed in this plan.

## 19. Attention and Cooldown Rules

- Maximum 3 automatic guidance exposures per session at Contextual or
  above. Passive hints are uncapped but must stay inline and quiet.
- Per-item cooldown after expiry: 15 minutes. After dismissal: rest of
  session. After Attention character: rest of session, maximum once.
- Inactivity prompts: maximum 2 per session, 10-minute gap.
- Active typing, focused input, dirty form, visible error, visible
  guidance, or blocking status each suppress new presentations.
- Priority arbitration: at most one visible item. Higher intensity never
  preempts a visible lower item. It queues behind dismissal or expiry.

## 20. Example Scenarios

### Payment-recording example

User creates an invoice, then goes idle 90 seconds with the form dirty.
Engine selects the payment-recording item (context `invoices`, trigger
inactivity). Dirty form caps presentation at Passive: a quiet inline line
under the totals section reads “Record payments against invoices to clear
balances automatically.” No navigation. No focus change. Dismissal locks it
for the session. If the same user later idles on the dashboard with no
unsaved work, the same item may appear at Contextual with the character
moment, maximum once per session.

### Second loading pass

Provisioning runs status stages, completes a phase, and triggers a refresh
loading state. Engine history persists. The tip slot continues the rotation
sequence from history instead of restarting at the first tip. If the
operation finishes before read time, no tip appears.

### Empty dashboard first login

First session, zero records. Engine selects starter guidance at Contextual
in a dismissible sheet. Dismissal records exposure and suppresses repeats
for the session. The user reaches an empty Clients list later and gets a
different item because history excludes the shown one.

## 21. Payment-Recording Worked Detail

Trigger: unpaid invoice exists plus idle threshold met, or invoice saved
without payment and user returns to dashboard. Message states the benefit
(automatic balance clearing) in one line plus one supporting line.
Presentation: Passive on dirty forms, Contextual on idle clean surfaces,
Attention character only on prolonged idle outside work, once per session.
Learning condition: user records any payment. Outcome retires the item to
lowest priority permanently.

## 22. Open Architectural Questions

1. Where should engine state live (app context versus dedicated store)
   given the existing tenant and layout architecture?
2. Should exposure history persist across sessions via local storage, and
   what privacy implications apply on shared devices?
3. How are usage counters (never-used feature, repeated workflow) computed
   without new analytics infrastructure?
4. Does the existing toast and snackbar system host Contextual guidance,
   or does guidance need its own surface?
5. What asset format carries character animation within the mobile
   performance budget (CSS/SVG versus Lottie versus video)?
6. Who authors and reviews guidance copy, and where does the content
   library live long term?

## 23. Implementation Phases and Recommended Order

- Phase 1: Session-scoped engine state plus history persistence across
  loading passes. Keep current tip UI. Fixes repetition with minimal risk.
- Phase 2: Workflow-safety rules plus suppression wiring (dirty form,
  focus, error, idle detection). Unlocks non-loading triggers safely.
- Phase 3: Presentation levels. Passive inline hints and Contextual sheet
  renderer. Dismissal and cooldown enforcement.
- Phase 4: Inactivity trigger and milestone triggers with caps.
- Phase 5: Animation capability and character framework with the payment
  design test. Reduced-motion fallbacks mandatory.
- Phase 6: Learning conditions, cross-session history, authoring workflow,
  and copy review pass.

## 24. Explicit Non-Goals

- No artificial delays or extended loading to show guidance.
- No fake progress or staged percentages.
- No navigational tips that move the user without explicit consent.
- No second loading system and no second toast system.
- No database schema in this plan.
- No game-like loading visuals, jokes as a category, or marketing copy.
  The character moment is expressive product communication, not a game
  screen. The loading PRD anti-pattern list (§17) stays in force.
- No changes to loading levels, refresh behavior, or error handling.
