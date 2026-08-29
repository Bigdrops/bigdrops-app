# Loading States and Refresh

> Status: Authoritative
> Last updated: 2026-08-29
> Supersedes: batch-10 wireframe loading concept (historical reference only — see §22)
> Depends on: `03-design-system.md`, `04-theme-system.md`, `05-navigation-shell.md`, `11-accessibility.md`, `15-interaction-model.md`

---

## 1. Purpose

Define the BIGDROPS loading experience as a progressive, proportional system. Loading UI MUST match the operation. The system MUST NOT apply one loading treatment to every operation.

When a loading operation gives the user enough waiting time, the system MAY display a useful tip. The tip teaches the user something about BIGDROPS. The tip MUST NOT be the purpose of the loading state. The loading operation controls the duration. The tip MUST NEVER force an artificial delay.

This document is a design contract. A future frontend implementation agent MUST be able to determine which loading treatment to use, when to use it, when to display tips, how tips are selected, and how loading transitions into success or error.

---

## 2. Core Principle

BIGDROPS uses a progressive loading experience. The loading UI MUST be proportional to the operation.

| Operation Speed | Loading Treatment |
|----------------|-------------------|
| Fast | Avoid unnecessary loading UI. Do not delay a successful operation to display a tip. |
| Local | Lightweight local feedback: button loading state, inline spinner, skeleton, disabled action state. The surrounding interface SHOULD remain usable where safe. |
| Section or page | Contextual loading states that preserve the page structure where possible. |
| Transitional | Loading treatment for navigation, page transitions, and context changes. |
| Long-running | A more prominent loading surface. The loading-tip experience becomes relevant here. |

The system MUST NOT treat every operation as a full-screen loading event. The system MUST NOT add artificial delays to make a loading experience visible.

---

## 3. Loading Levels

BIGDROPS defines six loading levels. Each level specifies the visual treatment and when it applies.

### Level 0 — No Visible Loading

**When:** An operation normally completes within a very short period. The user does not perceive a wait.

**Treatment:** No loading UI. The result appears immediately. A success confirmation (toast or snackbar) MAY appear after completion.

**Rule:** Do not show a loading indicator for operations that complete instantly. Do not delay the result to display a loading state.

---

### Level 1 — Inline Loading

**When:** A control or small operation is in progress. The user triggered an action and expects feedback on the control itself.

**Treatment:**

| Pattern | Usage |
|---------|-------|
| Button spinner | A spinner replaces or overlays the button icon. The button text MAY change to "Saving..." or "Processing...". |
| Save state | The button shows a loading state while the save operation runs. |
| Refresh icon state | A refresh icon rotates while the refresh runs. |
| Inline status | A small spinner or status text appears next to the affected control. |
| Disabled action state | The triggering control is disabled to prevent duplicate actions. |

**Rules:**

- The surrounding interface MUST remain usable.
- The control MUST communicate that work is occurring.
- The control MUST prevent duplicate submissions.
- No tip is displayed at this level.
- No full-screen overlay is used.

---

### Level 2 — Component or Section Loading

**When:** An isolated page region is loading. The rest of the page is visible or already loaded.

**Treatment:**

| Pattern | Usage |
|---------|-------|
| Table skeleton | Skeleton rows fill the table area while data loads. |
| Card skeleton | Skeleton blocks fill the card area while content loads. |
| Form section loading | A form section shows a skeleton or inline spinner while its data loads. |
| List skeleton | Skeleton rows fill a list area while items load. |

**Rules:**

- The page structure MUST remain visible. The user sees where content will appear.
- Skeletons MUST match the shape and spacing of the real content.
- No tip is displayed at this level.
- No full-screen overlay is used.
- The section MUST set `aria-busy="true"` while loading.

---

### Level 3 — Page or Transition Loading

**When:** A page-level transition or context change requires a visible transition. The user navigated to a new page or the application changed context.

**Treatment:**

- A page-level loading state fills the content area.
- The top bar and bottom nav MAY remain visible to preserve navigation context.
- A page skeleton MAY fill the content area.
- A brief transition animation MAY run (0.2s ease-out per `05-navigation-shell.md` page transition).

**Rules:**

- The loading state MUST NOT block navigation away from the page. The user MUST be able to navigate elsewhere or press back.
- No tip is displayed at this level unless the transition is known to be long-running.
- The loading state MUST disappear as soon as the page content is ready.
- `aria-busy="true"` MUST be set on the main content area.

---

### Level 4 — Full Loading Experience

**When:** An operation requires the user to wait and the application needs a prominent loading surface. The user cannot proceed until the operation completes.

**Treatment:**

- A full-screen or large overlay loading surface.
- The surface includes: brand presence, loading indicator, status or progress area, and optional tip area.
- The loading-tip experience becomes relevant at this level.

**Rules:**

- This level MUST NOT be used for operations that could use Level 1 or Level 2.
- The loading operation controls the duration. The tip MUST NOT extend the duration.
- The surface MUST respect `prefers-reduced-motion`.
- The surface MUST set `aria-busy="true"` and `role="status"` or `aria-live="polite"`.
- The user MUST NOT be able to interact with the underlying interface while this surface is active, unless the operation is non-blocking.

**When to use this level:**

- PDF generation
- Large document processing
- Data import
- Substantial data refresh that blocks the interface
- Operations where the user must wait and cannot proceed

---

### Level 5 — Long-Running Operation

**When:** An operation may take significantly longer than an ordinary loading state. The user is expected to wait for an extended period.

**Treatment:**

- A prominent loading surface (same anatomy as Level 4).
- The surface MAY expose operation status stages (see §9).
- The surface MAY expose meaningful progress if reliable.
- Tips MAY rotate during the operation (see §8).
- The surface MAY expose an estimated state if the system can provide one reliably.
- A cancel action MAY be offered if the operation supports cancellation.

**How this differs from Level 4:**

- Level 4 is for operations that block the user but are expected to complete within a moderate period.
- Level 5 is for operations that may take significantly longer. The loading surface becomes a waiting surface with richer status information.
- Level 5 MAY allow the user to navigate away if the operation can run in the background. If the user navigates away, a notification (snackbar or toast) MUST inform the user when the operation completes or fails.

**Examples:**

- Company provisioning (schema creation, table cloning, RLS installation)
- Large data import
- Bulk document generation
- Substantial data migration or synchronization

---

## 4. Loading Tips System

### Purpose

Tips turn unavoidable waiting time into useful product education. Tips teach users about BIGDROPS features, workflows, shortcuts, and business operations.

A tip is a supplement to the loading state. The loading operation controls the duration. The tip MUST NEVER force an artificial delay.

### When Tips Apply

Tips apply ONLY at Level 4 and Level 5. Tips MUST NOT appear at Level 0, Level 1, Level 2, or Level 3 unless the transition is known to be long-running.

### Tip Format

```
QUICK TIP
You can convert an approved quotation directly into an invoice.
```

| Element | Spec |
|---------|------|
| Label | "QUICK TIP" — uppercase, 8px, weight 800, 0.11em letter-spacing, `var(--ink-3)` (matches eyebrow from `03-design-system.md`) |
| Message | 12px, weight 600, `var(--ink-2)`, line-height 1.4, max-width 280px, centered |
| Container | `var(--surface)` background, 18px radius, `1px solid var(--line)` border, 12px padding |

### What Tips Teach

- BIGDROPS features
- Useful workflows
- Shortcuts
- Document capabilities
- Productivity techniques
- Business-operation knowledge
- Lesser-known functionality
- Contextual actions available elsewhere in the application

### What Tips Are Not

- Tips are NOT random trivia.
- Tips are NOT marketing messages.
- Tips are NOT jokes or entertainment.
- Tips are NOT game-specific content.
- Tips MUST NOT copy the visual design, wording, interaction model, or presentation of game loading screens.

---

## 5. Tip Categories

The system uses a controlled taxonomy. The taxonomy MAY grow without requiring a redesign of the loading system.

| Category | Purpose | Example |
|----------|---------|---------|
| Feature Tips | Teach a BIGDROPS feature the user may not know about. | "You can convert an approved quotation directly into an invoice." |
| Workflow Tips | Teach a multi-step workflow. | "Record a payment against an invoice to update your outstanding balance automatically." |
| Productivity Tips | Teach a technique that saves time. | "Use the search overlay to find any document by number, client, or project." |
| Shortcut Tips | Teach a keyboard or gesture shortcut. | "Ctrl+S saves a draft. Ctrl+Enter finalizes a document." |
| Document Tips | Teach document-specific capabilities. | "Waybills strip monetary values by design — rates and totals live on invoices." |
| Business Operations Tips | Teach business-operation knowledge relevant to BIGDROPS. | "Overdue flags recalculate every time the dashboard loads." |
| Navigation Tips | Teach navigation or context switching. | "Tap the menu button to open the drawer and switch between modules." |
| Contextual Tips | Teach something relevant to the current module or operation. | "While you wait for this PDF, you can queue multiple documents for download." |

### Taxonomy Growth

New categories MAY be added. Each new category MUST have:

- A clear purpose
- At least one example tip
- A defined relationship to the existing priority order (see §6)

---

## 6. Tip Priority and Selection

### Selection Priority Order

The system MUST select tips in this order:

```
1. Contextually relevant tip (matched to current module or operation)
        ↓
2. Feature or workflow tip relevant to the current module
        ↓
3. General BIGDROPS productivity tip
        ↓
4. General product knowledge tip
```

A contextual tip MUST always override a generic tip when one is available.

### Behaviour Rules

| Situation | Rule |
|-----------|------|
| No contextual tip exists | Select the next priority level. |
| Multiple contextual tips exist | Select the highest-priority contextual tip. If priorities are equal, select the least-recently-shown tip. |
| The same tip was recently shown | Do not show the same tip twice in a row. Track recently shown tips and exclude them from selection. |
| The user has seen a tip many times | Deprioritise tips the user has seen frequently. The system MAY track view counts and lower the selection weight of high-view tips. |
| A loading operation is too short to display a tip | Do not display a tip. The loading operation controls the duration. |
| A long-running operation requires status information | Status information MUST take priority over tips. If the operation needs to show stages or progress, the tip area MAY be replaced by status information. |

### Anti-Repetition Strategy

The system MUST avoid showing the same tip repeatedly.

| Rule | Detail |
|------|--------|
| Immediate repetition | The same tip MUST NOT appear twice in a row. |
| Recent history | Track the last 5 tips shown. Exclude them from the next selection when alternatives exist. |
| View count | Tips shown more than 3 times in a session SHOULD be deprioritised. |
| Exhaustion | If all tips have been shown recently, the system MAY repeat from the start of the pool. The system MAY also show no tip if the pool is exhausted and the operation is short. |

The system MUST NOT require a random tip on every loading event. Tip selection SHOULD be deterministic where possible, using context and history rather than pure randomness.

---

## 7. Tip Content Model

The specification defines the conceptual metadata for a tip. This is a data contract for future implementation. Do NOT implement the data model in this task.

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique identifier for the tip. | `tip.quotation.convert-to-invoice` |
| `category` | Category from the controlled taxonomy (§5). | `Feature Tips` |
| `message` | The tip text shown to the user. | "You can convert an approved quotation directly into an invoice." |
| `context` | The module or operation context where this tip is most relevant. `null` if general. | `quotations`, `invoices`, `pdf-generation` |
| `priority` | Numeric priority within the category. Lower numbers select first. | `1` |
| `audience` | The intended audience. `all` for all users. MAY be extended for role-based tips in the future. | `all` |
| `repeatPolicy` | How often this tip may repeat. | `session:3` (max 3 times per session) |
| `active` | Whether the tip is currently eligible for selection. | `true` |

### Model Rules

- Every tip MUST have a unique `id`.
- Every tip MUST have a `category` from the taxonomy.
- Every tip MUST have a `message`.
- `context` MAY be `null` for general tips.
- `priority` MAY be equal across tips in the same category.
- `audience` is `all` in the initial system. The model MAY be extended for role-based or workspace-based tips without redesigning the loading system.
- `repeatPolicy` controls how often a tip may appear. The anti-repetition strategy (§6) applies on top of this policy.
- `active` allows tips to be disabled without removing them from the pool.

---

## 8. Tip Display Rules

### When a Tip First Appears

A tip appears ONLY when:

1. The loading state is at Level 4 or Level 5.
2. The operation is expected to take long enough for a tip to be readable.
3. No status information is competing for the tip area.

### When a Tip MUST NOT Appear

A tip MUST NOT appear when:

- The loading level is 0, 1, 2, or 3.
- The operation is expected to complete before the user can read the tip.
- The loading surface is showing an error.
- The loading surface is showing a cancellation confirmation.
- The operation requires status stage information that fills the tip area.

### Tip Rotation During Long Operations

| Rule | Detail |
|------|--------|
| May rotate | Tips MAY rotate during a Level 5 long-running operation. |
| Rotation interval | Tips SHOULD NOT rotate more often than every 8 seconds. Faster rotation prevents the user from reading the tip. |
| Rotation limit | The system SHOULD NOT rotate more than 3 tips during a single operation. After 3 tips, the system MAY keep the last tip visible. |
| Level 4 | Tips SHOULD NOT rotate during a Level 4 operation. Show one tip for the duration. |

### Dismissal and Advancement

| Action | Rule |
|--------|------|
| Dismiss a tip | The user MAY dismiss a tip. A small close button (28×28px, per `03-design-system.md` dismiss button) MAY appear on the tip container. Dismissing a tip does NOT dismiss the loading state. |
| Manually advance a tip | The user MAY manually advance to the next tip. A small chevron or "Next tip" action MAY appear. Manual advancement uses the same selection rules (§6). |
| Same tip again | The anti-repetition strategy (§6) applies. The same tip SHOULD NOT appear again immediately after dismissal or advancement. |

### Contextual Override

A contextual tip MUST override a generic tip. If the loading operation is related to a specific module (e.g. PDF generation), the system MUST prefer tips with a matching `context` field.

### Operation Completes Before Tip Display

If the operation completes before the tip is displayed, the tip MUST NOT appear. The loading state MUST transition directly to the success state. The system MUST NOT delay the success state to show the tip.

---

## 9. Progress Rules

### Three Progress Models

| Model | When to Use | What It Shows |
|-------|-------------|---------------|
| Determinate | The system has meaningful progress information. | A percentage or filled bar representing real progress. |
| Indeterminate | The system knows work is occurring but cannot provide a reliable percentage. | A continuous animation (spinner, sliding bar) that communicates activity without a percentage. |
| Status-based | Staged progress is more truthful than a percentage. | Named stages: Preparing, Processing, Generating, Finalizing, Complete. |

### Determinate Progress

Use determinate progress ONLY when the system has meaningful progress information. Examples:

- A data import where the number of rows is known.
- A file upload where the byte count is known.
- A bulk operation where the total item count is known.

The progress value MUST reflect real system progress. The system MUST NOT display a fake percentage.

### Indeterminate Progress

Use indeterminate progress when the system knows work is occurring but cannot provide a reliable percentage. Examples:

- A database query with unknown row count.
- A network request with no progress header.
- A processing step with no measurable intermediate state.

The indicator MUST communicate that work is occurring. A spinner or sliding bar is appropriate.

### Status-Based Progress

Use status-based progress when staged progress is more truthful than a percentage. The system shows named stages:

| Stage | Meaning |
|-------|---------|
| Preparing | The system is setting up the operation. |
| Processing | The system is performing the main work. |
| Generating | The system is producing output (e.g. a PDF). |
| Finalizing | The system is completing the operation. |
| Complete | The operation is finished. |

The current stage MUST be displayed as text. The system MAY highlight the current stage and mark completed stages. The system MUST NOT assign fake percentages to stages.

### Prohibition

The system MUST NOT display fake progress percentages presented as if they represent real system progress. Random percentage increments are prohibited. Artificial progress bars that do not reflect real work are prohibited.

---

## 10. Full Loading Experience — Anatomy

This section defines the visual anatomy of the Level 4 and Level 5 full loading surface. The visual specification references the canonical design system. It does NOT introduce an independent visual language.

### Layout

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         [Brand Mark]            │  32×32px gradient square
│                                 │
│         Loading indicator       │  spinner or progress bar
│                                 │
│         Status / progress text  │  optional
│                                 │
│      ┌─────────────────────┐    │
│      │  QUICK TIP           │   │  optional — Level 4/5 only
│      │  You can convert an  │   │
│      │  approved quotation  │   │
│      │  directly into an    │   │
│      │  invoice.            │   │
│      └─────────────────────┘    │
│                                 │
│         [Cancel]                │  optional — Level 5 only
│                                 │
└─────────────────────────────────┘
```

### Background

| Property | Value | Source |
|----------|-------|--------|
| Background | `var(--bg)` | `04-theme-system.md` |
| Position | Fixed or absolute, `inset: 0` | — |
| z-index | 80–100 (above all other overlays) | — |
| Display | Flex, centered column | — |
| Initial state | `opacity: 0`, `pointer-events: none` | — |
| Active state | `opacity: 1`, `pointer-events: auto` | — |
| Transition | `opacity 0.25–0.3s` | Matches `05-navigation-shell.md` transition scale |
| Padding | 32px (with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`) | — |

### Brand Presence

| Property | Value | Source |
|----------|-------|--------|
| Size | 32×32px | Matches drawer brand mark from `05-navigation-shell.md` |
| Border radius | 11px | Matches brand mark radius |
| Background | `var(--gradient)` | `04-theme-system.md` |
| Color | `#fff` (light) / `var(--ink)` (dark) | — |
| Icon | Lucide `sparkles` or `loader` (17×17px, stroke-width 1.9) | `03-design-system.md` icon sizing |
| Motion | Subtle pulse: `scale(1) → scale(1.06)`, 1.8s ease-in-out infinite. Respects `prefers-reduced-motion`. | — |

### Loading Indicator

The loading indicator depends on the progress model (§9).

| Progress Model | Indicator | Spec |
|----------------|-----------|------|
| Indeterminate | Spinner | 32×32px, `border: 2px solid var(--line)`, `border-top-color: var(--primary)`, `spin 0.9s linear infinite` |
| Indeterminate | Sliding bar | 200px wide, 5px tall, `var(--surface-muted)` track, `var(--primary)` fill, slides left to right continuously |
| Determinate | Progress bar | `min(280px, 80%)` wide, 5px tall, `var(--surface-muted)` track, `var(--primary)` fill, fill width matches real progress |
| Status-based | Stage list | Vertical list of named stages. Current stage: `var(--primary)` text, `var(--primary-soft)` background. Completed stages: `var(--ink-2)` text with check icon. Future stages: `var(--ink-3)` text. |

All indicators MUST respect `prefers-reduced-motion`. When reduced motion is active:

- Spinner: static `var(--primary)` circle, no rotation.
- Sliding bar: static `var(--primary)` fill at 50%, no sliding.
- Progress bar: no change (progress bar does not animate beyond width updates).
- Stage list: no change (stage list does not animate).

### Tip Area

| Property | Value | Source |
|----------|-------|--------|
| Container background | `var(--surface)` | `04-theme-system.md` |
| Container border | `1px solid var(--line)` | `03-design-system.md` |
| Container radius | 18px | `03-design-system.md` card radius |
| Container padding | 12px | — |
| Max width | 280px | — |
| Label | "QUICK TIP" — 8px, weight 800, 0.11em uppercase, `var(--ink-3)` | Matches eyebrow from `03-design-system.md` |
| Message | 12px, weight 600, `var(--ink-2)`, line-height 1.4 | — |
| Close button | 28×28px, 50% radius, `var(--surface-muted)` bg, `var(--ink-3)` color | Matches dismiss button from `03-design-system.md` |
| Advance button | Optional — chevron icon, 17×17px, `var(--ink-3)` | — |
| Spacing from indicator | 22px | — |

### Progress or Status Area

| Property | Value |
|----------|-------|
| Position | Below the loading indicator |
| Text | Status stage name or progress percentage (determinate only) |
| Font | `var(--number)` (DM Mono), 11px, weight 500, `var(--ink-3)` |
| Spacing from indicator | 10px |

### Hierarchy

1. Brand mark (top — identity)
2. Loading indicator (center — activity)
3. Status or progress text (below indicator — information)
4. Tip area (below status — education)
5. Cancel action (bottom — control, Level 5 only)

### Spacing

| Gap | Value | Source |
|-----|-------|--------|
| Brand mark to indicator | 22px | — |
| Indicator to status text | 10px | — |
| Status text to tip area | 22px | — |
| Tip area to cancel | 18px | — |
| Surface padding | 32px | — |

### Typography

All typography uses the established type scale from `03-design-system.md`. No new font sizes or weights are introduced.

| Element | Size | Weight | Source |
|---------|------|--------|--------|
| Tip label | 8px | 800 | Eyebrow scale |
| Tip message | 12px | 600 | Between activity primary (11px) and reminder title (12px) |
| Status text | 11px | 500 | Activity primary scale, monospace |
| Cancel button | 10px | 800 | Between body small (9px) and activity primary (11px) |

### Motion

| Element | Motion | Duration | Reduced Motion |
|---------|--------|----------|----------------|
| Surface fade in | `opacity 0 → 1` | 0.25–0.3s | Instant |
| Surface fade out | `opacity 1 → 0` | 0.25–0.3s | Instant |
| Brand pulse | `scale(1) → scale(1.06)` | 1.8s, ease-in-out, infinite | No animation |
| Spinner | 360° rotation | 0.9s, linear, infinite | Static |
| Sliding bar | `translateX(-100%) → translateX(350%)` | 1.4s, ease-in-out, infinite | Static at 50% |
| Progress bar fill | Width transition | 0.2s, ease-out | No transition |
| Tip rotation | `opacity 0 → 1` | 0.2s, ease-out | Instant |

All motion MUST respect `prefers-reduced-motion: reduce` per `11-accessibility.md`. When reduced motion is active, all animations stop and all transitions reduce to near-instant.

---

## 11. Light and Dark Mode

Loading states MUST work naturally with the application's established themes. The system MUST NOT create a separate loading theme. The system MUST NOT hard-code colours.

### Light Mode

| Element | Token | Source |
|---------|-------|--------|
| Background | `var(--bg)` = `#f0f4f8` | `04-theme-system.md` |
| Surface (tip container) | `var(--surface)` = `#ffffff` | `04-theme-system.md` |
| Border | `var(--line)` = `rgba(15,23,42,.07)` | `04-theme-system.md` |
| Primary text | `var(--ink)` = `#0f172a` | `04-theme-system.md` |
| Secondary text | `var(--ink-2)` = `#475569` | `04-theme-system.md` |
| Tertiary text | `var(--ink-3)` = `#94a3b8` | `04-theme-system.md` |
| Brand mark | `var(--gradient)` | `04-theme-system.md` |
| Spinner / progress fill | `var(--primary)` = `#1e3a5f` | `04-theme-system.md` |
| Shadow | `var(--shadow)` | `03-design-system.md` |

### Dark Mode

| Element | Token | Source |
|---------|-------|--------|
| Background | `var(--bg)` = `#0f172a` | `04-theme-system.md` |
| Surface (tip container) | `var(--surface)` = `#1e293b` | `04-theme-system.md` |
| Border | `var(--line)` = `rgba(241,245,249,.08)` | `04-theme-system.md` |
| Primary text | `var(--ink)` = `#f1f5f9` | `04-theme-system.md` |
| Secondary text | `var(--ink-2)` = `#cbd5e1` | `04-theme-system.md` |
| Tertiary text | `var(--ink-3)` = `#64748b` | `04-theme-system.md` |
| Brand mark | `var(--gradient)` (dark values) | `04-theme-system.md` |
| Spinner / progress fill | `var(--primary)` = `#60a5fa` | `04-theme-system.md` |
| Shadow | Pure black, higher opacity | `03-design-system.md` |

### Rules

- Dark mode MUST NOT be "black background + white text". It MUST use the established surface hierarchy (`--bg` → `--surface` → `--surface-raised`).
- Dark mode MUST preserve the same hierarchy, spacing, typography, and motion as light mode.
- Dark mode MUST preserve semantic colour meaning (success=green, danger=red).
- The loading surface MUST NOT introduce colours that do not exist in `04-theme-system.md`.
- Theme switching MUST NOT require a separate loading theme.

---

## 12. Mobile-First and Android Conventions

### Platform Behaviour

| Platform | Loading Behaviour |
|----------|-------------------|
| Phone | Full-screen loading for Level 4/5. Inline and section loading for Level 1/2. Bottom nav remains visible during Level 3. |
| Large phone | Same as phone. |
| Foldable | Same as phone when folded. When unfolded, Level 4/5 MAY use a centered panel instead of full-screen. |
| Tablet | Level 4/5 MAY use a centered panel or side panel instead of full-screen. Same content, different container (per `15-interaction-model.md` §2). |
| Desktop | Level 4/5 MAY use a centered modal or side panel. Level 1/2 unchanged. |

### Android Conventions

The loading system follows the Android-idiomatic interaction model from `15-interaction-model.md`.

| Convention | Application |
|------------|-------------|
| Touch targets | All loading-surface controls (cancel, dismiss tip, advance tip) MUST meet 44×44px minimum on mobile (`11-accessibility.md`). |
| System back | During Level 4/5, back SHOULD dismiss the loading surface ONLY if the operation is non-blocking. If the operation is blocking, back MUST NOT dismiss the surface. |
| Safe areas | The loading surface MUST respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`. |
| Bottom-sheet compatibility | If a bottom sheet is open when a Level 4/5 loading state begins, the sheet SHOULD close first to avoid z-index conflicts. |
| Interruption by navigation | If the user navigates away during a non-blocking Level 5 operation, the operation continues in the background. A snackbar notifies the user on completion or failure. |
| Orientation changes | The loading surface MUST work in both portrait and landscape. No orientation lock. |
| Reduced motion | All animations MUST stop. All transitions MUST reduce to near-instant. |

### Blocking vs Non-Blocking

| Type | Rule |
|------|------|
| Blocking | The user cannot interact with the underlying interface. The loading surface covers the full screen. Back does not dismiss. Used when the operation must complete before the user can proceed. |
| Non-blocking | The user MAY navigate away. The operation continues in the background. A notification informs the user on completion. Used for Level 5 operations that can run in the background. |

The system MUST NOT turn loading into a modal interaction unless blocking is required by the operation.

---

## 13. Accessibility

### Screen Readers

| Element | ARIA | Rule |
|---------|------|------|
| Loading container | `aria-busy="true"` | Set on the container that is loading. |
| Loading surface (Level 4/5) | `role="status"` or `aria-live="polite"` | The surface MUST announce that work is occurring. |
| Progress text | `aria-live="polite"` | Progress updates MUST be announced. Do not announce every percentage tick. Announce at meaningful intervals (e.g. every 25% or on stage change). |
| Tip text | `aria-live="polite"` | Tip content MUST be announced when it appears. |
| Error state | `aria-live="assertive"` | Error transitions MUST be announced immediately. |
| Cancel button | `aria-label="Cancel operation"` | If icon-only. |

### Loading Announcements

- A loading animation MUST NEVER be the only indication that work is occurring.
- The screen reader MUST announce the start of a loading operation.
- The screen reader MUST announce the completion of a loading operation.
- The screen reader MUST announce errors that occur during a loading operation.

### Progress Semantics

| Progress Model | ARIA |
|----------------|------|
| Determinate | `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` |
| Indeterminate | `role="progressbar"` without `aria-valuenow` (or `aria-valuenow` omitted) |
| Status-based | `role="status"` with stage text announced on stage change |

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- All loading animations MUST stop.
- All transitions MUST reduce to near-instant.
- The loading surface MUST still appear and disappear (via instant opacity change).
- The loading indicator MUST show a static state (e.g. a static spinner shape, a progress bar at its current fill).
- Tips MUST remain readable without animation.
- The system MUST still announce loading state to screen readers.

### Contrast

All loading-surface text and indicators MUST meet WCAG 2.2 AA contrast ratios per `11-accessibility.md`:

| Element | Minimum Ratio |
|---------|---------------|
| Tip message text | 4.5:1 |
| Status text | 4.5:1 |
| Loading indicator on background | 3:1 |
| Cancel button text | 4.5:1 |

### Non-Animation Alternatives

- A loading animation MUST NEVER be the only indication that work is occurring.
- Text status (e.g. "Generating PDF...", "Processing...") MUST accompany the animation.
- Tips MUST remain readable and understandable without animation.

### Keyboard Navigation

- On desktop, the loading surface MUST trap focus if it is blocking.
- The cancel button (if present) MUST be focusable.
- The tip dismiss and advance buttons (if present) MUST be focusable.
- Escape MUST close the loading surface ONLY if the operation is non-blocking.
- If the operation is blocking, Escape MUST NOT close the surface.

---

## 14. Error and Cancellation States

### State Transitions

```
Loading → Success

Loading
   ↓
Operation completes
   ↓
Loading surface fades out (0.25–0.3s)
   ↓
Content appears or toast/snackbar confirms success
```

```
Loading → Error

Loading
   ↓
Operation fails
   ↓
Loading surface fades out
   ↓
Error state appears (error message + retry action if applicable)
```

```
Loading → Cancelled (where supported)

Loading
   ↓
User taps Cancel
   ↓
Operation is cancelled
   ↓
Loading surface fades out
   ↓
Interface returns to its pre-operation state
```

### Error Rules

- A tip MUST NEVER obscure or compete with a critical error.
- If an operation fails, the loading experience MUST clearly give way to the error state.
- The error state MUST be visually distinct from the loading state.
- The error state MUST use `var(--attention)` for error indicators per the design system.
- The error state MAY offer a retry action.
- The error state MUST set `aria-live="assertive"` to announce the error immediately.
- The tip area MUST be hidden or replaced by the error message.

### Cancellation Rules

- Cancellation MAY be offered only at Level 5, and only if the operation supports cancellation.
- If cancellation is offered, a cancel button MUST be visible at the bottom of the loading surface.
- If the user cancels, the loading surface MUST fade out and the interface MUST return to its pre-operation state.
- If the operation cannot be cancelled, no cancel button MUST be shown.

---

## 15. Refresh Behaviour

Refresh is one use case of the loading system. The entire loading system MUST NOT be reduced to a dashboard-refresh system.

### Refresh Treatments by Surface

| Surface | Loading Level | Treatment |
|---------|--------------|-----------|
| Dashboard | Level 2 | KPI cards and activity rows show skeletons. The page structure remains visible. A refresh icon in the top bar shows a rotating state (Level 1). No full-screen overlay. |
| Lists (clients, invoices, quotations) | Level 2 | List rows show skeletons. The page structure remains visible. A refresh icon shows a rotating state. No full-screen overlay. |
| Individual records | Level 1 | The record area shows an inline spinner or skeleton. The surrounding interface remains usable. |
| Document data | Level 1 or 2 | The document area shows a skeleton or inline spinner. The surrounding interface remains usable. |
| Background refresh | Level 0 | No visible loading UI. The data updates silently. A snackbar MAY confirm the refresh. |
| Manual refresh | Level 1 | The refresh icon rotates. The affected area updates when the refresh completes. |

### Refresh Rules

- The system MUST NOT use a full-screen loading overlay for a dashboard refresh. A full-screen overlay is reserved for Level 4/5 operations.
- The system MUST NOT delay a refresh to display a tip.
- A refresh icon rotation (Level 1) is sufficient for most refresh operations.
- A toast or snackbar MAY confirm a successful refresh.
- Background refresh MUST NOT show any loading UI.

---

## 16. Contextual Examples

These examples are design guidance, not implementation instructions.

### Example 1: Dashboard Loading

| Aspect | Value |
|--------|-------|
| Operation | Initial dashboard load or refresh |
| Loading level | Level 2 |
| Loading treatment | KPI card skeletons, activity row skeletons, audit row skeletons. Page structure visible. Top bar refresh icon rotates. |
| Whether tip appears | No |
| Tip type | N/A |
| Progress model | Indeterminate (skeleton presence implies loading) |
| Completion behaviour | Skeletons replaced with real data. Refresh icon stops rotating. |
| Error behaviour | Skeleton replaced with error state in the affected section. Other sections remain functional. |

### Example 2: Client List Loading

| Aspect | Value |
|--------|-------|
| Operation | Open clients page |
| Loading level | Level 2 |
| Loading treatment | List row skeletons. Page structure visible. |
| Whether tip appears | No |
| Tip type | N/A |
| Progress model | Indeterminate |
| Completion behaviour | Skeletons replaced with client rows. |
| Error behaviour | Skeleton replaced with error state. Retry action offered. |

### Example 3: Invoice Loading

| Aspect | Value |
|--------|-------|
| Operation | Open a single invoice |
| Loading level | Level 1 or 2 |
| Loading treatment | Inline spinner or skeleton in the invoice content area. Surrounding interface usable. |
| Whether tip appears | No |
| Tip type | N/A |
| Progress model | Indeterminate |
| Completion behaviour | Spinner/skeleton replaced with invoice data. |
| Error behaviour | Spinner replaced with error state. Retry action offered. |

### Example 4: PDF Generation

| Aspect | Value |
|--------|-------|
| Operation | Generate invoice PDF |
| Loading level | Level 4 |
| Loading treatment | Full loading surface. Brand mark with pulse. Indeterminate spinner or status-based progress ("Generating..."). Tip area visible. |
| Whether tip appears | Yes |
| Tip type | Contextual tip with `context: "pdf-generation"` or document tip |
| Progress model | Status-based (Preparing → Generating → Finalizing → Complete) |
| Completion behaviour | Loading surface fades out. PDF opens or downloads. Toast confirms. |
| Error behaviour | Loading surface fades out. Error state appears with retry. Tip hidden. |

### Example 5: Document Save

| Aspect | Value |
|--------|-------|
| Operation | Save an invoice or quotation |
| Loading level | Level 1 |
| Loading treatment | Save button shows spinner and "Saving..." text. Button disabled to prevent duplicate saves. |
| Whether tip appears | No |
| Tip type | N/A |
| Progress model | Indeterminate (button spinner) |
| Completion behaviour | Button returns to normal state. Toast confirms "Saved". |
| Error behaviour | Button returns to normal state. Error toast appears. Form remains editable. |

### Example 6: Data Refresh

| Aspect | Value |
|--------|-------|
| Operation | Pull-to-refresh or manual refresh of a list |
| Loading level | Level 1 |
| Loading treatment | Refresh icon rotates. List updates in place. |
| Whether tip appears | No |
| Tip type | N/A |
| Progress model | Indeterminate (icon rotation) |
| Completion behaviour | Icon stops rotating. Updated list appears. Snackbar MAY confirm. |
| Error behaviour | Icon stops rotating. Error snackbar appears. |

### Example 7: Company or Workspace Context Change

| Aspect | Value |
|--------|-------|
| Operation | Switch active company or workspace |
| Loading level | Level 3 |
| Loading treatment | Page transition loading. Content area shows page skeleton. Top bar and bottom nav remain visible. |
| Whether tip appears | No (unless the context change is known to be long-running) |
| Tip type | N/A |
| Progress model | Indeterminate |
| Completion behaviour | Page skeleton replaced with new context data. |
| Error behaviour | Page skeleton replaced with error state. User returned to previous context. |
| Reference | See `16-context-switchers.md` for context switcher UX. |

### Example 8: Company Provisioning

| Aspect | Value |
|--------|-------|
| Operation | Create a new company (schema creation, table cloning, RLS installation) |
| Loading level | Level 5 |
| Loading treatment | Full loading surface. Brand mark with pulse. Status-based progress stages. Tip area visible. Cancel MAY be offered if the operation supports it. |
| Whether tip appears | Yes |
| Tip type | General product knowledge tip or navigation tip (contextual tips for provisioning MAY be sparse) |
| Progress model | Status-based (Preparing → Processing → Generating → Finalizing → Complete) |
| Completion behaviour | Loading surface fades out. User routed to the new company context. Snackbar confirms. |
| Error behaviour | Loading surface fades out. Error state appears with retry or support guidance. Tip hidden. |
| Reference | See multi-tenancy PRD §12.2 for company creation flow. |

---

## 17. What Not to Do

| # | Anti-Pattern | Why It Is Prohibited |
|---|-------------|----------------------|
| 1 | Artificial loading delays | Do not delay a successful operation to display a loading state or tip. |
| 2 | Fake progress percentages | Do not display random percentage increments as if they represent real progress. |
| 3 | Unnecessary full-screen overlays | Do not use Level 4/5 for operations that could use Level 1/2. |
| 4 | Random irrelevant tips | Do not show random trivia. Tips MUST teach BIGDROPS functionality. |
| 5 | Excessive animation | Motion is functional. Do not add decorative animation to loading states. |
| 6 | Tips that obscure errors | A tip MUST NEVER compete with a critical error. Error state takes priority. |
| 7 | Tips that block normal interaction | Tips are supplementary. They MUST NOT block the user from dismissing the loading state or cancelling. |
| 8 | Loading screens for operations that do not need them | If an operation completes instantly, do not show a loading screen. |
| 9 | Inconsistent loaders created independently by each module | All modules MUST use the same loading system and levels. Modules MUST NOT create their own loading UI. |
| 10 | Hard-coded theme colours | Loading states MUST use tokens from `04-theme-system.md`. Do not hard-code hex values. |
| 11 | Duplicate loading systems | There is one loading system. Do not create a second one for a specific module. |
| 12 | Game-like visual treatment | The loading experience MUST feel like a premium professional ERP product. Do not copy game loading-screen visuals, wording, or presentation. |
| 13 | Fixed loading duration | Do not enforce a fixed duration (e.g. "~2.2 seconds"). The operation controls the duration. |
| 14 | "Did you know" as mandatory content | The label and format of tips MAY vary. "Did you know" is not mandatory. |
| 15 | A single loading treatment for every operation | The loading treatment MUST be proportional to the operation. |
| 16 | Mandatory full-screen overlays | Full-screen overlays are reserved for Level 4/5 only. |
| 17 | Tips at Level 0–3 | Tips appear only at Level 4/5 (unless a Level 3 transition is known to be long-running). |

---

## 18. Design System Integration

Loading states are part of the canonical BIGDROPS design system. This document references `03-design-system.md` and `04-theme-system.md` for all visual tokens.

### Token Usage

| Token Category | Source | Usage in Loading States |
|----------------|--------|------------------------|
| Colour | `04-theme-system.md` | Background, surface, text, border, accent, shadow |
| Typography | `03-design-system.md` | Tip label, tip message, status text, cancel button |
| Spacing | `03-design-system.md` | Surface padding, gaps between elements |
| Radius | `03-design-system.md` | Tip container radius (18px), dismiss button (50%) |
| Elevation | `03-design-system.md` | Loading surface elevation |
| Motion | `05-navigation-shell.md` | Transition durations and easings |
| Iconography | `03-design-system.md` | Lucide icons, stroke-width 1.9 |

### Missing Tokens

Where the design system does not yet define a required loading token or component, this document defines the design requirement. Future implementation MUST add the token to the design system rather than hard-coding values in components.

| Design Requirement | Status | Action |
|-------------------|--------|--------|
| Spinner component | Not yet in `03-design-system.md` | Add to design system during implementation |
| Progress bar component | Not yet in `03-design-system.md` | Add to design system during implementation |
| Skeleton component | Not yet in `03-design-system.md` | Add to design system during implementation |
| Loading surface component | Not yet in `03-design-system.md` | Add to design system during implementation |
| Tip container component | Not yet in `06-component-patterns.md` | Add to component patterns during implementation |

### Compatibility with Design.md

This document is compatible with the `Design.md` visual design system contract. All loading-state visuals use tokens defined in `Design.md` and `04-theme-system.md`. No independent visual language is introduced.

---

## 19. Normative Language

This document uses the following normative terms:

| Term | Meaning |
|------|---------|
| MUST | The requirement is mandatory. |
| MUST NOT | The prohibition is mandatory. |
| SHOULD | The recommendation is strong. Deviations require justification. |
| SHOULD NOT | The discouragement is strong. Deviations require justification. |
| MAY | The option is permissible. Not required. |

---

## 20. Summary — Loading Level Quick Reference

| Level | Name | When | Tip? | Progress | Blocking? |
|-------|------|------|------|----------|-----------|
| 0 | No Visible Loading | Instant operations | No | None | No |
| 1 | Inline Loading | Control-level operations | No | Indeterminate (spinner) | No |
| 2 | Component or Section Loading | Isolated page regions | No | Indeterminate (skeleton) | No |
| 3 | Page or Transition Loading | Page transitions, context changes | No (unless long-running) | Indeterminate (page skeleton) | No |
| 4 | Full Loading Experience | User must wait, prominent surface needed | Yes | Indeterminate, determinate, or status-based | Yes (if blocking) |
| 5 | Long-Running Operation | Extended operations | Yes (may rotate) | Status-based or determinate | May be non-blocking |

---

## 21. Cross-References

| Topic | Document |
|-------|----------|
| Structural tokens (typography, spacing, radius, elevation) | `03-design-system.md` |
| Colour tokens and theme contract | `04-theme-system.md` |
| Navigation shell (transitions, overlays) | `05-navigation-shell.md` |
| Component patterns (toast, snackbar) | `06-component-patterns.md` |
| Accessibility (WCAG, touch targets, screen readers, reduced motion) | `11-accessibility.md` |
| Capacitor native (safe areas) | `12-capacitor-native.md` |
| Interaction model (Android patterns, ripple, back) | `15-interaction-model.md` |
| Context switchers (company/workspace change) | `16-context-switchers.md` |
| Visual design system and theme contract | `Design.md` |

---

## 22. Relationship to Existing Document

The previous version of this document (status: Established, last updated 2026-08-28) was a concept document derived from the batch-10 wireframe variants. It described a single loading flow: full-screen overlay, "Did you know" tip, progress bar, ~2.2 second duration, toast confirmation.

### What Changed

| Old Concept | New Specification |
|-------------|-------------------|
| Single loading treatment for every refresh | Six loading levels proportional to the operation |
| Fixed ~2.2 second duration | Operation controls duration. No artificial delays. |
| Random percentage increments (6–24% per tick) | Fake progress prohibited. Determinate, indeterminate, or status-based progress. |
| Mandatory full-screen overlay | Full-screen reserved for Level 4/5. Level 1/2 for most operations. |
| Mandatory "Did you know" content | Tips are optional, contextual, and appear only at Level 4/5. |
| Random tip selection | Priority-based selection with anti-repetition strategy. |
| Batch-10 visual variants (10 different mark styles) | One unified BIGDROPS visual identity from the canonical design system. |
| CSS/JavaScript implementation examples | Design contract only. No implementation code. |

### What Is Preserved

| Concept | Status |
|---------|--------|
| Tips teach useful product knowledge | Preserved and formalised in §4–§8 |
| Toast confirms refresh completion | Preserved for success states (§14) |
| Fade transition for overlay | Preserved (0.25–0.3s opacity transition) |
| Close all overlays before showing loading | Preserved as a rule for Level 4/5 (§12) |
| Respect reduced motion | Preserved and strengthened (§13) |

The new specification takes precedence over obsolete concepts. The batch-10 wireframe variants remain as historical reference material only. They do NOT define the current loading system.
