You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE

OpenCode has full repository access. Read AGENTS.md immediately.
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.

A. CONTEXT & OBJECTIVE

Address two related UI tasks.

1. Recent Alerts

The Dashboard Recent Alerts horizontal carousel is currently not scrolling correctly.

Before modifying it, inspect:

"docs/TEMPLATES/React-temps/reui"

Use the carousel implementations there as reference material. Identify which existing carousel pattern best matches the intended Recent Alerts interaction.

Also inspect Git history and the current implementation where useful. Do not assume there was ever a fully working committed version.

The required behavior is simple:

- Multiple alerts must render when multiple alerts exist.
- The user must be able to horizontally swipe/scroll through all alerts.
- Swiping must not prematurely stop or bounce back before the real end.
- The user must be able to move forward and backward.
- Narrow Android/mobile widths must work.
- Do not introduce a carousel library merely for visual similarity if native horizontal scrolling is the safer architecture.
- Preserve existing alert data, navigation, read/unread behavior, loading state, and empty state.

Determine the actual cause of the current scrolling failure before changing the implementation.

2. List-page Filter Icon

Audit the filter icon currently used across BIGDROPS list pages.

The desired direction is an actual funnel/filter icon similar to this Phosphor-style SVG:

<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256"><path d="M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z"></path></svg>

Also inspect:

"docs/TEMPLATES/React-temps/filter-button-reference.tsx"

This contains a Lucide "FilterIcon" implementation and button-group reference.

Search the repository and "docs/TEMPLATES/React-temps/reui" for additional filter/funnel icon candidates.

DO NOT immediately choose an icon.

Instead, create a standalone HTML comparison artifact showing the viable filter icon candidates, including the two candidates supplied above.

The HTML must make it easy for the user to visually compare and select one.

B. TARGET COMPONENTS / FILES

Identify the actual current Recent Alerts component and its supporting carousel implementation.

Inspect:

- Current Recent Alerts component
- Any carousel primitives it currently uses
- Relevant carousel examples under "docs/TEMPLATES/React-temps/reui"
- Git history relevant to Recent Alerts scrolling

For the filter work, identify:

- Current list-page filter button/icon implementation
- Shared filter button/icon components if they exist
- "docs/TEMPLATES/React-temps/filter-button-reference.tsx"
- Relevant icon candidates under "docs/TEMPLATES/React-temps/reui"
- Existing icon libraries already installed in the project

Create the icon comparison artifact under the project's established Design-direction/template artifact location, following existing repository conventions.

Do not create a new production icon component yet.

C. CONSTRAINTS

Recent Alerts

Make the smallest safe production change that restores genuine horizontal scrolling.

Preserve:

- alert data flow
- alert card content
- navigation
- read/unread behavior
- loading/skeleton behavior
- empty state
- existing responsive behavior unless the carousel architecture requires correction

Do not touch unrelated carousel consumers.

Do not redesign the alert cards.

Do not add a dependency unless repository evidence proves it is necessary.

Do not force a carousel abstraction simply because the component is called a carousel.

Filter Icon

Do NOT replace the production filter icon yet.

The first deliverable is the comparison HTML so the user can choose.

The comparison must include:

1. The supplied Phosphor-style funnel SVG.
2. Lucide "FilterIcon" from "filter-button-reference.tsx".
3. Any other strong candidates discovered in the repository/templates.

Show candidates at useful sizes and in realistic button contexts.

Include the icon name/source and enough information for the user to identify their preferred option.

The HTML must be self-contained and editable.

Do not alter production filter buttons while the icon choice is unresolved.

D. REQUIRED VERIFICATION (HARD HARDWARE GATE)

Do NOT run:

"bun run build"

For the Recent Alerts production change:

- Run "bun run typecheck".
- Run "bun run audit:load" only if schema/query/data-layer logic was touched.
- Run "git status" before and after.
- Confirm the diff is limited to the intended Recent Alerts implementation plus the requested HTML artifact.

For the filter icon work:

- No production source changes.
- Confirm the HTML artifact exists.
- Confirm the candidate set includes both supplied icons plus any strong candidates discovered.

Do not claim runtime/device validation unless actually available.

E. REQUIRED BEHAVIOR

Recent Alerts success condition

If there are 5 alerts:

1. Alert 1 is visible initially.
2. User can swipe horizontally.
3. User can reach alerts 2, 3, 4, and 5.
4. The scroll does not falsely bounce back after the first movement.
5. User can swipe back toward alert 1.
6. The real end stops naturally.
7. Multiple alerts remain rendered simultaneously in the DOM.

Investigate geometry/state causes such as:

- track width
- card width
- "flex-shrink"
- "flex-nowrap"
- overflow container
- viewport width
- snap behavior
- scroll bounds
- refs
- effects resetting scroll position
- conditional rendering
- resize/reinitialization behavior
- carousel engine initialization
- stale slide-count state
- "scrollIntoView"
- transforms or positioning that interfere with native scrolling

Use the simplest architecture supported by repository evidence.

Filter icon HTML success condition

The HTML comparison must let the user answer:

«"Which filter icon do I want across the list pages?"»

It must not silently make that decision.

F. ACCEPTANCE CRITERIA

Recent Alerts:

- Multiple alerts render.
- Horizontal scrolling genuinely works across the full alert collection.
- No premature end/bounce.
- Forward and backward movement work.
- Existing alert behavior is preserved.
- No unrelated components are changed.
- Typecheck passes.
- No build is run.

Filter icon:

- Production filter icon remains unchanged.
- HTML comparison artifact is created.
- Both supplied candidates are included.
- Additional credible candidates found in the repository/templates are included.
- Each candidate is clearly labeled.
- The artifact is suitable for visual selection on mobile.

G. REPORT

Provide a concise report covering:

Recent Alerts

- Root cause
- Relevant template/history findings
- Chosen implementation
- Why it is safer than alternatives
- Files changed
- Verification

Filter Icon

- Current implementation
- Candidates discovered
- HTML artifact location
- No production icon change made pending user selection

Do not perform the final filter icon replacement until the user selects a candidate.