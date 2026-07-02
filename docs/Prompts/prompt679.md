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

# CONTEXT

A previous implementation introduced regressions into the shared Invoice/Quotation line item toolbar.

Invoice and Quotation both use the same shared form components.

Any toolbar or grouping modification affects BOTH forms simultaneously.

The objective is to restore the original UX while preserving only the requested improvements.

Use commit:

`33628b19b2d8485584010dfcc8b0827b31dfabd9`

as the visual and behavioural reference for the toolbar.

Do NOT redesign the toolbar.

Restore it.

Then apply only the requested additions.

---

# OBJECTIVE

Complete FOUR tasks.

1. Restore the toolbar to its original design.
2. Remove duplicate row-count information.
3. Investigate and repair the "Escanor effect" in grouping behaviour.
4. Investigate drag-and-drop by completing the existing template before introducing new architecture.

---

# SCOPE

Modify only the components directly involved in:

- shared line item toolbar
- invoice line item movement
- quotation line item movement
- drag/drop integration

Do not redesign unrelated UI.

Do not change invoice calculations.

Do not change imports.

Do not change PDF generation.

Do not change database schemas.

Do not invent new workflows.

Do not introduce new concepts.

---

# TASK 1 — RESTORE TOOLBAR

Compare the current toolbar against commit:

`33628b19b2d8485584010dfcc8b0827b31dfabd9`

Restore:

- spacing
- alignment
- sizing
- icon sizing
- padding
- button order

Exactly.

The toolbar should contain only:

- Import
- Clear All (NEW)
- Settings

Requirements:

- Import keeps its original size.
- Settings keeps its original size.
- Clear uses identical sizing and styling.
- Clear must NOT become the visual centrepiece.
- Settings remains right-aligned.
- No horizontal overflow.
- No scrolling.
- No oversized buttons.
- No new toolbar buttons.

The large dotted buttons below remain exactly as before:

- Add Item
- Add Group

Do not duplicate those actions in the toolbar.

---

# TASK 2 — REMOVE DUPLICATE ROW COUNTER

Current UI displays:

Line Items (5 items)

AND

5 rows

These communicate the same information.

Remove ONLY the secondary "Rows" counter.

Keep:

Line Items (X items)

This becomes the single source of truth.

Do not replace it with another counter.

Do not introduce badges.

Do not move the existing header.

---

# TASK 3 — INVESTIGATE THE "ESCANOR EFFECT"

Current behaviour:

Groups behave as though they cannot have anything above them.

Examples:

Rows:

1
2
3

Create group from:

4
5

Leave:

6

Expected:

1
2
3

Group
4
5

6

Actual:

The group jumps to the beginning or bottom despite its internal ordering.

Investigate why.

Do NOT patch symptoms.

Find the architectural cause.

Questions to answer:

- Is movement operating on the group header only?
- Is insertion position calculated incorrectly?
- Is normalization relocating headers?
- Is commitGrouping responsible?
- Is invoice behaviour different from quotation?
- Which function ultimately reorders the array?

Produce an architecture diagram.

Then repair the logic.

Goal:

Treat a group as one movable block.

Not as a special row.

Moving a group should move:

Header

+

Every child

as one contiguous block.

Groups must no longer "fight" surrounding rows.

---

# TASK 4 — DRAG & DROP INVESTIGATION

Before adding any dependency:

Inspect

`docs/TEMPLATES/React-temps/sortable.tsx`

Determine:

- Is it unfinished?
- Is it disconnected?
- Is it outdated?
- Is it already compatible?
- Why isn't it currently working?

Do NOT introduce dnd-kit or any new dependency until proving the existing template cannot be completed.

If existing infrastructure can be finished:

Use it.

Only if impossible:

Document exactly why.

Then justify introducing any dependency.

---

# MOVEMENT BEHAVIOUR REQUIREMENTS

Dragging or moving must eventually support:

✓ Item above a group

✓ Item below a group

✓ Item into a group

✓ Item out of a group

✓ Moving an entire group

✓ Preserving contiguous group blocks

No jumping.

No teleporting.

No automatic relocation.

No forced movement to the beginning.

No forced movement to the bottom.

Movement should feel similar to Excel row manipulation.

---

# FILES TO READ

Minimum:

- `src/components/document/FormLineItems.tsx`
- `src/components/document/SharedDocumentForm.tsx`
- `src/pages/NewInvoice.tsx`
- `src/pages/EditInvoice.tsx`
- `src/components/quotation/QuotationForm.tsx`
- `src/components/quotation/useQuotationLineItems.ts`
- `src/components/invoice/MobileItemCard.tsx`
- `src/components/invoice/MobileGroupCard.tsx`
- `docs/TEMPLATES/React-temps/sortable.tsx`

Also inspect any movement utilities discovered during tracing.

---

# CONSTRAINTS

- Preserve backward compatibility.
- No feature regressions.
- Keep modules under project limits.
- No duplicated movement logic.
- Do not redesign the toolbar.
- Do not redesign grouping.
- Repair behaviour rather than replacing architecture.
- Invoice and Quotation must remain behaviourally identical.

---

# REQUIRED VERIFICATION

Run in order:

```
bun run audit:load
bun run typecheck
bun run build
```

Additionally verify manually:

- Toolbar matches commit reference.
- Settings never disappears.
- Clear All appears only when appropriate.
- No duplicate row counter exists.
- Groups remain where placed.
- Moving a group no longer causes jumping.
- Drag handle behaviour verified.
- Invoice and quotation remain synchronized.

---

# OUTPUT

Provide:

1. Root cause for the Escanor effect.

2. Root cause for drag-and-drop not functioning.

3. Toolbar comparison:

- Before
- After
- Commit reference

4. Files modified.

5. Behaviour comparison.

6. Any architectural debt discovered.

7. Verification results.

Do not omit failures.

If something cannot be completed, explain exactly why.

---

# STOP CONDITION

Stop immediately if the existing sortable template can be completed without introducing new dependencies.

Do not replace existing architecture until that investigation is complete.

---

# SUCCESS CRITERIA

Done when:

- Toolbar visually matches the pre-regression version.
- Clear All is the only new toolbar action.
- Duplicate row counter is removed.
- Settings is always visible.
- Group movement no longer exhibits the Escanor effect.
- Groups behave as contiguous movable blocks.
- Drag-and-drop has been repaired using the existing template where possible, or a documented justification exists for any new dependency.
- Invoice and Quotation remain fully synchronized.