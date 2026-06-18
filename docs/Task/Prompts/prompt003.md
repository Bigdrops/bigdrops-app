You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================

Before writing any code, you MUST:

1. Read `docs/PROJECTSKIILINDEX.md`
2. Load the following skills:
   - Karpathy
   - react-pdf
   - pdf-rendering-correctness
   - frontend-design
   - shadcn
3. If skill loading fails, read the corresponding SKILL.md directly.
4. If a required skill cannot be read, STOP and report task failure.
5. Read `AGENTS.md` before modifying any file.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================

Save report to:

docs/Task/reports/waybill-backlog-fixes.md

==================================================
TASK
==================================================

Resolve the confirmed Waybill backlog defects affecting:

- Form UI
- PDF rendering
- Import pipeline
- Persistence
- Mobile rendering

This task is defect-focused.

Do NOT redesign anything.
Do NOT introduce new architecture.
Do NOT add new libraries.

==================================================
ROOT CAUSE RULE (MANDATORY)
==================================================

For EACH issue:

1. Identify the actual source of failure.
2. Document the root cause in the report.
3. Fix the source, not the symptom.
4. Avoid duplicate state.
5. Avoid compatibility shims.
6. Reuse existing mechanisms whenever possible.

==================================================
READ FIRST (MANDATORY)
==================================================

Read completely before editing:

- src/components/waybill/WaybillForm.tsx
- src/components/waybill/WaybillPDF.tsx
- src/components/waybill/waybillUtils.ts
- src/domain/waybill/externalWaybillImportAdapter.ts
- src/domain/waybill/internalWaybillImportAdapter.ts
- src/components/waybill/WaybillImportSheet.tsx
- AGENTS.md
- docs/PROJECTSKIILINDEX.md

==================================================
FILE SCOPE LOCK
==================================================

Expected files:

- WaybillForm.tsx
- WaybillPDF.tsx
- waybillUtils.ts
- externalWaybillImportAdapter.ts
- internalWaybillImportAdapter.ts
- WaybillImportSheet.tsx

If additional files are required:

- document why
- minimize scope
- include justification in report

Do NOT modify unrelated modules.

==================================================
ISSUE 1 — CONDITION COLUMN VISIBILITY BYPASS
==================================================

Problem:

The Condition column ignores visibility settings.

Users disable it in Table Settings, but it still appears:

- in preview
- in generated PDF

Diagnose:

- Find where columnVisibility is managed.
- Trace visibility state through preview rendering.
- Trace visibility state into PDF rendering.
- Determine where the Condition column bypasses visibility checks.

Fix:

Ensure Condition behaves exactly like the other configurable columns.

Expected result:

When Condition is disabled:

- hidden in preview
- hidden in PDF

When enabled:

- visible in preview
- visible in PDF

Manual verification:

1. Disable Condition.
2. Confirm preview hides it.
3. Generate PDF.
4. Confirm PDF hides it.
5. Re-enable.
6. Confirm it returns everywhere.

==================================================
ISSUE 2 — PART NO. / MAKE DATA LOSS
==================================================

Problem:

Part No. and Make appear editable but their data disappears after reload/navigation.

Diagnose the FULL lifecycle:

- column definition
- UI state
- serialization
- persistence
- reload
- PDF mapping

Determine exactly where data is lost.

Do NOT assume serialization is the cause.

Fix:

Ensure Part No. and Make:

- persist correctly
- reload correctly
- remain enabled
- retain values

Expected result:

User can:

1. Enable Part No.
2. Enter data.
3. Save.
4. Reload.

And still see:

- column active
- values preserved

Manual verification:

Create data for:

- Part No.
- Make

Save.

Reload.

Generate PDF.

Confirm:

- columns visible
- values present in form
- values present in PDF

==================================================
ISSUE 3 — JSON IMPORT DOES NOT ACTIVATE COLUMNS
==================================================

Problem:

Imported JSON may contain:

custom_data

for columns that are not currently active.

Data imports correctly.

Columns remain hidden.

User must manually enable them.

Diagnose:

- Import adapters
- Import application flow
- Custom column activation mechanism

Determine why imported data does not activate corresponding columns.

Fix:

Ensure imported custom_data keys activate the corresponding custom columns automatically.

Reuse existing activation mechanisms whenever possible.

Do NOT create a parallel column activation system.

Expected result:

If imported data contains a custom column key:

- column becomes active automatically
- values become visible immediately
- PDF contains the imported values

Manual verification:

Import JSON:

```json
{
  "custom_data": {
    "part_no": "ABC123",
    "make": "Toyota"
  }
}

Confirm:

Part No. visible

Make visible

values shown

PDF shows values


================================================== ISSUE 4 — NOTES EDITOR NOT BOUND

Problem:

The Notes editor renders.

Typing does not update the waybill notes state.

Notes only appear when imported.

Diagnose:

Editor component

value binding

onChange binding

waybill state updates


Fix:

Make the editor a properly controlled component.

Expected result:

existing notes load into editor

typing updates waybill state

saved notes persist

PDF receives current notes


Manual verification:

1. Type notes.


2. Save.


3. Reload.


4. Generate PDF.



Confirm notes appear everywhere.

================================================== ISSUE 5 — MOBILE DOM BLEED ARTIFACT

Problem:

Mobile view displays stray text such as:

CLIENT ent

below the actions area.

These are believed to be legacy Invoice remnants.

Diagnose:

Identify the exact DOM element producing the artifact.

Fix:

Remove the source element.

Do NOT:

hide it further

move it off-screen

use negative margins

use transforms

use opacity tricks

use z-index tricks

use clipping


Delete the offending element if it is unused.

Manual verification:

Open mobile viewport.

Confirm:

no CLIENT artifact

no ent artifact

no visual bleed below action bar


================================================== VERIFICATION

Run:

1. bun run audit:load


2. bun run typecheck


3. bun run lint



Typecheck must pass with zero errors.

================================================== REPORT REQUIREMENTS

For each issue include:

1. Root cause


2. Files modified


3. Fix implemented


4. Verification performed



Include screenshots or observations if available.

================================================== DONE WHEN

[ ] Condition column respects visibility in preview and PDF [ ] Part No. persists correctly [ ] Make persists correctly [ ] Reload preserves custom columns [ ] JSON import activates matching columns automatically [ ] Imported custom column values appear in PDF [ ] Notes editor is fully bound to state [ ] Notes persist through save/reload [ ] Mobile bleed artifact removed at source [ ] bun run audit:load passes [ ] bun run typecheck passes with zero errors [ ] bun run lint passes on changed files [ ] Report saved to docs/Task/reports/waybill-backlog-fixes.md

================================================== DO NOT

Do NOT run bun run dev

Do NOT redesign the UI

Do NOT change table proportions

Do NOT modify the numbering system

Do NOT modify the prefix engine

Do NOT modify the download pipeline

Do NOT introduce new state management libraries

Do NOT create duplicate state

Do NOT create parallel column systems

Do NOT skip the report

Do NOT modify unrelated modules