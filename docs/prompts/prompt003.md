====================================================================
PRECONDITION

Read AGENTS.md before commencing this task. All applicable protocols and standards defined therein must be observed throughout this work.

====================================================================

You are working on the BIGDROPS business platform.

Stack:
- React 19
- Vite 7
- TypeScript 5.9
- Tailwind CSS 3.4
- Supabase
- Vercel
- Runtime: Bun only (never npm, yarn or pnpm)

Load all relevant skills from `docs/PROJECTSKILLINDEX.md` before implementation, particularly those covering:

- frontend-design
- design-system
- react
- typescript
- animations
- accessibility
- UX patterns

---

# Objective

Design and implement a **Global Operation Experience** for BIGDROPS.

This is **NOT** a spinner project.

This is **NOT** a loading text replacement project.

This is a UX architecture project.

BIGDROPS currently has fragmented loading experiences:

- page corner "Loading..."
- button spinners
- confirmation dialog loading
- isolated loading indicators
- inconsistent behaviour between modules

The goal is to replace these disconnected experiences with a single premium operation experience suitable for a modern ERP.

---

# REQUIRED FIRST STEP

Before writing any code, inspect the internal React template library:

`docs/templates/React-temps/reui/`

Study the available templates and identify whether there is already a suitable interaction pattern for:

- operation feedback
- progress surfaces
- loading experiences
- transition overlays
- activity cards
- workflow indicators
- command palettes
- floating status components
- animated feedback

Do NOT blindly copy templates.

Instead:

- extract interaction ideas
- reuse architecture where appropriate
- adapt patterns into the BIGDROPS Clinical Design System

If no suitable pattern exists, design a new reusable solution.

---

# Current UX Problems

Example:

Quotation
↓
Click Convert to Invoice
↓
Dialog closes
↓
Nothing happens for 5 seconds
↓
Invoice appears

The user receives no reassurance that work is happening.

Likewise, many pages still display:

Loading...

This feels like placeholder UI rather than a polished business application.

---

# Vision

BIGDROPS should feel like a professional operating system.

Operations should feel intentional.

Users should immediately understand:

- what is happening
- what operation is running
- that the application accepted their action
- that navigation or completion will happen automatically

The interface should communicate work—not simply display a spinner.

---

# Design Principles

Avoid:

❌ Generic "Loading..."

❌ Tiny spinner in page corners

❌ Random toast messages

❌ Browser-style loading indicators

❌ Fake percentage progress

❌ Artificial progress bars

Instead create an elegant operation surface.

Examples:

━━━━━━━━━━━━━━━━━━━━━━

Creating Invoice

Transferring quotation information...

━━━━━━━━━━━━━━━━━━━━━━

Generating PDF

Preparing print-ready document...

━━━━━━━━━━━━━━━━━━━━━━

Opening Customer

Loading customer workspace...

━━━━━━━━━━━━━━━━━━━━━━

Archiving Document

Updating company records...

The wording should describe business operations, not technical loading.

---

# Architecture

Design a reusable global operation infrastructure.

It should become the standard for every long-running business operation.

Examples:

- Creating Invoice
- Creating Quotation
- Creating Waybill
- Creating Letter
- Creating Receipt
- Generating PDF
- Uploading Logo
- Importing Clients
- Exporting Data
- Archiving
- Restoring
- Synchronizing Settings

Every module should use the same experience.

No bespoke loading implementations.

---

# Behaviour

The operation experience should:

- appear immediately
- acknowledge user input instantly
- remain visible throughout the operation
- disappear naturally when complete
- survive component rerenders where appropriate
- support route transitions when necessary
- support both light and dark themes
- use Clinical Design System tokens
- avoid hardcoded colours
- use tasteful motion
- respect reduced-motion accessibility preferences
- avoid excessive animation

Do not fabricate progress.

Do not fake percentages.

Only communicate real application state.

---

# API Goal

The implementation should expose reusable infrastructure rather than page-specific code.

A simple API similar to:

operation.start()

operation.update()

operation.finish()

operation.error()

or another architecture that better fits the codebase.

The implementation choice is yours.

The result must be reusable across the application.

---

# Migration Strategy

Prioritise migration of the most visible long-running operations:

1. Document conversions
2. PDF generation
3. Document creation
4. Imports
5. Exports
6. Uploads
7. Archive / Restore
8. Synchronisation

Do not replace loading patterns that already provide an excellent experience unless consistency requires it.

Leave page skeleton loading untouched unless there is a strong UX reason to improve it.

---

# Constraints

Do NOT:

- change business logic
- change backend behaviour
- change permissions
- change routing
- modify numbering systems
- change audit behaviour
- introduce unrelated refactors

Focus only on operation feedback architecture and UX.

---

# Required Deliverable

Build a reusable system—not a one-off component.

The goal is for every future operation in BIGDROPS to adopt the same premium interaction pattern with minimal code.

The implementation should feel like a first-class platform capability rather than another loading widget.

---

# Verification

Run:

```bash
bun run typecheck
```

Run:

```bash
git status
```

Run:

```bash
bun run audit:load
```

only if any data-layer, schema, query or Supabase logic is modified.

Do NOT run:

```bash
bun run build
```

(Builds are prohibited due to AGENTS.md hardware policy.)

---

# Acceptance Criteria

- Investigated `docs/templates/React-temps/reui/` before implementation.
- Reused or adapted suitable interaction patterns where appropriate.
- Created a reusable Global Operation Experience.
- Eliminated fragmented loading UX for targeted operations.
- No operation appears frozen or unresponsive.
- Users receive immediate visual acknowledgement.
- The experience feels modern, cohesive and premium.
- No fake progress indicators are introduced.
- Supports both light and dark themes.
- Existing business behaviour remains unchanged.
- Type safety passes.
- No unintended files are modified.