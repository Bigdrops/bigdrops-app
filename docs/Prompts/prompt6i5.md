You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKILLINDEX.md` first.
2. Load the following skills:
   - Karpathy
   - frontend-design
   - typescript-advanced-types
3. For each skill: Attempt to load via the skill system. If it fails, fallback to direct file read from disk (e.g. `.claude/skills/...`).
4. If any critical skill is unreadable, stop and report the error immediately.
5. Read `AGENTS.md` before any editing or implementation work.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save a full detailed report to:

`docs/Reports/invoice-toolbar-restoration-and-group-behaviour.md`

The report MUST include:

- Architecture summary
- Files read
- Files modified
- Root cause
- Before/After UI comparison
- Before/After movement logic
- Decisions taken
- Risks
- Verification
- Screenshots/ASCII layouts where useful

---
Restore the invoice/quotation line-item toolbar to the exact behaviour before the regression, while keeping only the requested addition (Clear All). This is a restoration task, not a redesign.

CONTEXT

Use commit:

"33628b19b2d8485584010dfcc8b0827b31dfabd9"

as the visual and behavioural baseline for the toolbar.

The recent implementation introduced layout regressions.

---

GOAL

Restore the original toolbar layout exactly as it was before the regression.

Do NOT redesign the toolbar.

Do NOT introduce any new toolbar actions.

---

TASK 1 — Restore Original Toolbar

Compare the current implementation against commit:

"33628b19b2d8485584010dfcc8b0827b31dfabd9"

Restore:

- spacing
- sizing
- alignment
- padding
- icon sizes
- button sizes
- visual hierarchy

The toolbar should look visually identical to the baseline commit.

---

TASK 2 — Keep Only One New Button

The only new toolbar button that should exist is:

Clear All

Nothing else.

Do NOT add:

- Add
- Group
- any extra shortcuts
- any additional toolbar actions

Those actions already exist below as the large dotted buttons.

They must remain there only.

---

TASK 3 — Button Order

Restore the original order.

When rows exist:

Import     Settings     Clear All

Requirements:

- Import stays in its original position.
- Settings stays exactly where it originally was.
- Clear All is appended as the third and last action.
- Clear All must sit on the far right.
- Clear All must NEVER appear between Import and Settings.
- Clear All must NEVER become the centred button.
- Do NOT use layout tricks (such as ml-auto on Clear) that split existing controls.

The existing relationship between Import and Settings must remain untouched.

Think of Clear All as an extra action appended after the original toolbar—not inserted into the middle of it.

---

TASK 4 — Remove Duplicate Counter

There are currently two counters describing the same thing.

Current:

Line Items (3 items)

3 rows

This is redundant.

Remove only:

3 rows

Keep:

Line Items (3 items)

The Line Items title already communicates the count.

There should only be one visible counter.

---

TASK 5 — Preserve Empty State

When there are no rows:

Keep exactly the original behaviour:

- Import
- Settings

Large dotted buttons remain:

- Add Item
- Add Group

Do not change this layout.

---

TASK 6 — Preserve Existing Behaviour

Do not modify:

- import workflow
- settings menu
- Clear All confirmation dialog
- add item
- add group

Only restore the toolbar layout.

---

TASK 7 — Drag-and-Drop Investigation Only

Inspect:

"docs/TEMPLATES/React-temps/sortable.tsx"

Compare it against the current implementation.

Determine why dragging is still not functioning correctly.

Do NOT redesign it yet.
TASK 8 — Investigate Group "Escanor" Behaviour (Root Cause Only)

There is a long-standing grouping bug in both Invoice and Quotation forms.

Current behaviour:

Suppose the user creates:

1  Item A
2  Item B
3  Item C
4  Group A
5  Item D
6  Item E

or

Item A
Item B
Group A
Item C
Item D

The visual enumeration clearly shows the group's current position.

However, after regrouping, moving, saving, importing, editing, or other state updates, the group ignores that position and moves itself to another location (typically the beginning or the bottom), bringing its children with it.

The group behaves as if it owns the list instead of behaving like a normal row.

This is referred to as the Escanor effect.

---

Objective

Perform a complete root-cause investigation.

Do NOT implement a fix yet.

---

Trace the entire lifecycle of group ordering

Inspect every place where item order may be rebuilt, including:

- moving items
- moving groups
- addGroup
- deleteGroup
- ungroup
- commitGrouping
- normalizeGrouping
- normalize
- import adapters
- save adapters
- load adapters
- sorting by "sort_order"
- sorting by "group_id"
- any automatic array sorting
- any reconciliation after save/load

Determine where the user's manual ordering is lost.

---

Determine whether ordering is driven by:

- array index
- sort_order
- group_id
- group header position
- normalization
- commitGrouping
- database ordering
- import/export pipeline

Identify the single source of truth.

---

Explain why the visual numbering disagrees with the final rendered position.

If the UI says the group is Row 4, explain why the next render moves it elsewhere.

---

Deliverables

Answer:

1. What exactly causes the Escanor effect?
2. Which function is responsible?
3. Is the problem in UI state, normalization, persistence, or rendering?
4. Does the same root cause affect both Invoice and Quotation?
5. What is the smallest architectural fix that preserves free-form ordering without breaking grouping?

Do not implement the fix during this task.

This is an investigation and architecture report only.

Answer:

1. What is missing?
2. What differs from the template?
3. Why do Up/Down work while drag does not?
4. Is the current implementation incomplete, incorrectly wired, or blocked elsewhere?

Produce a root-cause report only.

Do not implement further drag changes during this task.

---

OUT OF SCOPE

Do NOT modify:

- grouping behaviour
- Escanor/group movement logic
- invoice calculations
- quotation calculations
- import pipeline
- save pipeline
- mobile item layout
- suggestion engine

---

REQUIRED VERIFICATION

Run:

bun run audit:load
bun run typecheck
bun run build

---

SUCCESS CRITERIA

Done only when:

- Toolbar visually matches commit "33628b19b2d8485584010dfcc8b0827b31dfabd9".
- Button sizes match the original.
- Import and Settings remain adjacent.
- Clear All appears as the last action on the far right.
- No duplicate row counter exists.
- No redundant toolbar buttons exist.
- Drag-and-drop investigation report is produced without making additional drag changes.