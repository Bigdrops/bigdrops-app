You are working on the BIGDROPS business platform.

Stack:
- React 19
- Vite 7
- TypeScript 5.9
- Tailwind CSS 3.4
- Capacitor
- Android WebView
- Bun runtime

====================================================================
CRITICAL: READ AGENTS.md
====================================================================

This is a STRICTLY READ-ONLY INVESTIGATION.

DO NOT modify any code.
DO NOT create patches.
DO NOT implement fixes.
DO NOT change CSS.
DO NOT change TypeScript.
DO NOT run bun run build.
DO NOT run bun run typecheck.

This is an evidence-gathering architecture audit only.

====================================================================
BACKGROUND
====================================================================

Two mobile-only rendering problems have been observed.

They may share a root cause, or they may be completely independent.

Do NOT assume they are related.

Your task is to determine the actual root cause(s) using evidence only.

====================================================================
ISSUE A — FORM BACKGROUND TURNS WHITE
====================================================================

Observed behaviour:

- On Android APK, document forms render correctly.
- When an input gains focus and the software keyboard appears, part of the active form becomes white.
- The application theme is no longer respected in that focused region.
- The issue is visible on document forms.

Investigate whether this originates from:

• shared Input component
• shared Textarea component
• shared Select component
• global form CSS
• theme variables
• Tailwind utilities
• color-scheme
• appearance
• accent-color
• :-webkit-autofill
• browser default styling
• Android WebView behaviour
• parent form container backgrounds

Determine exactly which layer owns the white background.

If the browser is painting a native layer instead of CSS, state that explicitly.

====================================================================
ISSUE B — POPUP / DIALOG KEYBOARD GLITCH
====================================================================

Observed behaviour:

When the Android keyboard opens while interacting with dialogs containing inputs, the popup becomes unstable.

Examples include:

- Import dialog
- Table Settings dialog
- Document View Customisation dialog
- Hex colour input dialog
- Any large popup containing text inputs

Observed pattern:

- Small dialogs jump once then stabilise.
- Larger dialogs continuously jump while the keyboard is open.

Investigate the shared overlay architecture.

Locate every reusable implementation for:

- Dialog
- Modal
- Sheet
- Drawer
- Popover
- Portal

Determine:

- positioning strategy
- centering logic
- scroll locking
- viewport calculations
- resize listeners
- visualViewport usage
- window resize handling
- overflow handling
- body locking
- fixed positioning
- transform positioning

Search for:

- 100vh
- h-screen
- min-h-screen
- max-h-screen
- 100dvh
- 100svh
- visualViewport
- env(safe-area-inset-*)
- overflow:hidden
- position: fixed

Determine whether keyboard viewport changes can explain the observed instability.

====================================================================
SHARED ARCHITECTURE REVIEW
====================================================================

Investigate whether both issues originate from the same shared infrastructure.

Specifically determine whether they converge inside:

- Layout
- Theme system
- Shared Input primitives
- Shared Dialog system
- Mobile shell
- Global CSS
- Browser/WebView behaviour

Do NOT assume they are connected.

Provide evidence either way.

====================================================================
REQUIRED OUTPUT
====================================================================

Write a markdown report to:

docs/Reports/GENERAL/mobile-keyboard-rendering-investigation.md

The report must contain:

# Executive Summary

State whether the two issues are:

- Same root cause
- Related but independent
- Completely independent

Explain why.

---

# Issue A Investigation

Root cause candidates.

Evidence.

File paths.

Line numbers.

Confidence ranking:

HIGH

MEDIUM

LOW

---

# Issue B Investigation

Root cause candidates.

Evidence.

File paths.

Line numbers.

Confidence ranking.

---

# Shared Component Inventory

List every shared component involved.

Examples:

- Input
- Textarea
- Dialog
- Sheet
- Popover
- Layout
- Theme

Explain their role.

---

# Architectural Findings

Explain:

- how keyboard appearance changes the rendering pipeline

- whether Android WebView behaves differently from Chrome

- whether Capacitor changes behaviour

- whether viewport resizing contributes

- whether browser-native styling contributes

Support every conclusion with evidence.

---

# Recommended Fix Strategy

DO NOT implement fixes.

Recommend the safest architectural approach for each issue.

If they should be fixed separately, state that.

If they share infrastructure, explain which component should be corrected first.

====================================================================
VERIFICATION
====================================================================

Before investigation:

Run git status.

After investigation:

Run git status again.

The working tree must remain unchanged except for the generated markdown report.

No application source files may be modified.

This is a zero-code architectural investigation.