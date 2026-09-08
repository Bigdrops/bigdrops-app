Ticket: Remove Deprecated Toast Infrastructure
Objective
Remove toast infrastructure that has been proven to be unused or deprecated, while preserving the canonical BIGDROPS toast system.
Context
The current toast audit established that:

src/lib/feedback.ts + GoeyToaster is the active canonical toast path.
Radix use-toast infrastructure has no active imports.
useToastStack and DocumentToastViewport are deprecated compatibility shims over the canonical feedback system.

These unused layers increase architectural ambiguity and maintenance cost.
Requirements

Verify current imports/usages before deletion.
Remove only genuinely dead Radix toast infrastructure.
Remove deprecated no-op document-view toast shims if they have no active consumers.
Do not modify the canonical feedback/Goey toast implementation.
Do not change toast appearance or behaviour as part of this cleanup.
Do not remove anything still referenced by production code.
Follow AGENTS.md.
Load relevant skills from docs/PROJECTSKILLINDEX.md.
Keep the change narrowly scoped.

Verification

Run bun run typecheck.
Do not run bun run build.
Run git status before and after.
Confirm no production imports still reference removed infrastructure.

