# PR-X: Global Long-Running Action Feedback System

You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.

Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

==================================================================== 
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

Read AGENTS.md before making any changes.

Load the appropriate skills from docs/PROJECTSKILLINDEX.md before implementation:

- react-dev
- typescript-advanced-types
- tailwind-css-patterns
- shadcn
- requirements-clarity

==================================================================== OBJECTIVE

Eliminate "silent waiting" throughout BIGDROPS.

Whenever an operation takes longer than a brief moment, users must receive immediate visual feedback that work is in progress.

This applies to operations such as:

Converting Quotation → Invoice

Converting Documents

Creating documents

PDF generation

Archive / Restore

Imports

Exports

Uploads

Long-running saves

Other asynchronous business actions

==================================================================== UX PRINCIPLE

Never allow the application to appear frozen.

Every long-running action should immediately acknowledge user input.

Users should always know:

• something started

• what is happening

• that interaction is temporarily disabled

• when it finishes

==================================================================== TARGET EXPERIENCE

Immediately after the user clicks an action:

• Disable the triggering button.

• Replace the button label with an activity state.

Examples:

"Creating Invoice..."

"Converting..."

"Generating PDF..."

"Uploading Logo..."

"Saving Changes..."

Display a spinner beside the text.

Prevent duplicate clicks while the operation is active.

==================================================================== LONG OPERATIONS

For operations lasting more than roughly one second, display an application-level loading indicator.

Examples:

"Creating Invoice..."

"Preparing Waybill..."

"Generating PDF..."

"Importing Data..."

The indicator should clearly communicate that processing is occurring without blocking the entire application unless the action is destructive or navigation-critical.

==================================================================== BUTTON STATES

Buttons should support:

Idle

Hover

Pressed

Loading

Success (when appropriate)

Disabled

Loading buttons must:

disable interaction

show spinner

preserve width to avoid layout shift

prevent repeated submissions

==================================================================== NO SILENT NAVIGATION

If an action will navigate after completion:

Show progress before navigation.

Example:

User clicks

Convert to Invoice

↓

Button becomes

Creating Invoice...

↓

Processing

↓

Navigation occurs

==================================================================== ERROR HANDLING

If an operation fails:

Return controls immediately.

Restore button state.

Display existing error handling.

Do not leave controls disabled.

==================================================================== DESIGN SYSTEM

Implement using existing BIGDROPS Clinical Design System.

Use:

existing loading primitives where available

semantic theme tokens

existing spinner component if one exists

Do not introduce hardcoded colors.

Do not introduce inconsistent loading animations.

==================================================================== ARCHITECTURE

Audit the codebase for existing loading implementations.

If multiple loading patterns exist:

Standardize them.

Avoid creating multiple spinner systems.

Prefer a reusable loading button/component over duplicated logic.

==================================================================== CONSTRAINTS

Preserve:

business logic

APIs

navigation flow

permissions

validation

Only improve user feedback.

No backend changes.

==================================================================== REQUIRED VERIFICATION

Run:

bun run typecheck

git status

Run audit commands only if required by AGENTS.md.

Do NOT run:

bun run build

==================================================================== ACCEPTANCE CRITERIA

No long-running action appears unresponsive.

Loading state appears immediately after user interaction.

Duplicate submissions are prevented.

Buttons clearly communicate progress.

Existing behavior is preserved.

Loading UX is consistent across the application.

Changes are minimal, reusable, and backward compatible.
