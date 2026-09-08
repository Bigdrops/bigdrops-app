Ticket: Replace BatchActionFooter Hardcoded Destructive Red
Objective
Remove the remaining hardcoded destructive red styling from BatchActionFooter and make it consume the canonical BIGDROPS destructive/danger colour system.
Context
The canonical destructive Button variant was recently corrected from a pale bg-destructive/10 treatment to a solid destructive treatment.
BatchActionFooter still contains a separate hardcoded bg-red-600 treatment.
This creates a visual inconsistency because the component does not inherit the canonical destructive colour system.
Requirements

Locate the hardcoded bg-red-600 usage in BatchActionFooter.
Replace it with the appropriate existing canonical destructive/danger token or Button variant.
Preserve the component's existing behaviour, layout, dimensions, actions, loading state, disabled state, and responsive behaviour.
Do not introduce a new red colour token.
Do not perform unrelated refactoring.
Follow AGENTS.md.
Load relevant skills from docs/PROJECTSKILLINDEX.md.

Verification

Run bun run typecheck.
Do not run bun run build.
Run git status before and after.
Confirm the final diff is limited to the requested component and report file.

