You are working on the BIGDROPS business platform.

Stack:
- React 19
- Vite 7
- TypeScript 5.9
- Tailwind CSS 3.4
- Supabase
- Bun runtime

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================

1. Read docs/PROJECTSKILLINDEX.md.
2. Load:
   - Karpathy
   - typescript-advanced-types
   - frontend-design
3. Read AGENTS.md.
4. Run:

bun run audit:load

before any implementation.

==================================================
REPORTING PROTOCOL
==================================================

Save report to

docs/Task/reports/state-update-isolation-phase1.md

Include

- architecture summary
- files modified
- reference graph before
- reference graph after
- render flow
- risks
- verification

==================================================
OBJECTIVE
==================================================

Implement Phase 5:

State Update Isolation.

Previous phases already introduced:

- keyboard architecture cleanup
- React.memo isolation
- callback stabilization
- computeDocument memoization
- suggestion engine consolidation

Do NOT modify any of those systems.

==================================================
GOAL
==================================================

Reduce unnecessary reference churn.

The objective is NOT to change business logic.

The objective is to preserve object identity wherever data has not changed.

==================================================
AUDIT
==================================================

Trace:

NewInvoice

EditInvoice

updateItem()

setItems()

group updates

item insertion

item deletion

moveItem

group operations

Identify every place where entire arrays or objects are recreated unnecessarily.

==================================================
IMPLEMENTATION
==================================================

Where safe:

• preserve existing object references

• preserve existing group references

• preserve existing item references

• avoid cloning untouched objects

• avoid rebuilding collections unless structure actually changes

Do NOT redesign the application.

Do NOT introduce Redux.

Do NOT introduce Zustand.

Do NOT introduce Immer.

Do NOT change APIs.

Do NOT change calculations.

Do NOT change computeDocument.

Do NOT change document behaviour.

==================================================
DO NOT TOUCH
==================================================

Calculations.ts

Suggestion Engine

NumericInput

KeyboardAwareness

Rendering architecture

Capability profiles

Financial logic

Operational document logic

==================================================
VERIFY
==================================================

Run

bun run audit:load

bun run typecheck

bun run build

bun run test

==================================================
SUCCESS
==================================================

Done when:

• unchanged items retain reference equality

• unchanged groups retain reference equality

• updateItem changes only affected objects

• insert/delete only affect required collections

• no UI changes

• no behavioural changes

• all verification passes