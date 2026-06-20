You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKIILINDEX.md`
2. Load: `Karpathy`, `supabase-postgres-best-practices`, `typescript-advanced-types`
3. Fallback to direct file read if skill fails. Stop if unreadable.
4. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save report to: `docs/Task/reports/waybill-table-settings-import-audit.md`

THIS IS A READ-ONLY AUDIT. DO NOT MODIFY ANY FILES.
DO NOT PROPOSE FIXES. DO NOT DESIGN AN ENGINE.

==================================================
CONTEXT
==================================================
The Waybill PDF system is being rebuilt. Before designing any engine,
we must understand exactly how three coupled systems currently work:

1. Table Settings (column visibility, custom columns, renaming)
2. JSON Import (prompt generation, column creation, data mapping)
3. Waybill data model (custom_fields shape, Supabase storage)

These systems currently fight for control of the column schema.
This audit maps them so we can lock stable boundaries.

==================================================
SYSTEM A — TABLE SETTINGS
==================================================
Read these files fully:
- `src/components/waybill/WaybillForm.tsx` — find Table Settings modal/panel
- `src/components/waybill/waybillUtils.ts` — types and state management
- Any file that exports `WaybillCustomColumn`, `columnVisibility`, or similar

Report EXACTLY:

A1. Where does Table Settings state LIVE?
    - React state in WaybillForm? Separate hook? Redux/context?
    - Variable name and type

A2. What is the EXACT shape of customColumns?
    - Type definition (quote it verbatim with line numbers)
    - How many entries exist by default?
    - What keys are allowed?

A3. How is column visibility stored?
    - Variable name, type, default values
    - How does it map to customColumns?

A4. How are column LABELS renamed?
    - What field holds the display name vs the internal key?
    - Where is renaming handled?

A5. How does Table Settings PERSIST?
    - Saved to Supabase? localStorage? Both?
    - Exact field name in the DB (e.g. custom_fields.columnVisibility)
    - What function writes it?

A6. Where does "Add custom column" logic live?
    - Function name, file, line
    - What validation exists (if any)?
    - Is there ANY limit on how many can be added?

A7. Is there any code that READS column state from custom_data at runtime
    and DERIVES new columns from it? (e.g. scanning items for unknown keys)
    - If yes: exact file, line, trigger condition

==================================================
SYSTEM B — JSON IMPORT
==================================================
Read these files fully:
- `src/domain/waybill/externalWaybillImportAdapter.ts`
- `src/domain/waybill/internalWaybillImportAdapter.ts`
- `src/domain/waybill/externalWaybillPrompt.ts`
- `src/domain/waybill/internalWaybillPrompt.ts`
- `src/components/waybill/WaybillImportSheet.tsx`
- `src/domain/import/` — shared import pipeline (normalize.ts, resolve.ts, apply.ts)

Report EXACTLY:

B1. How is the import prompt generated?
    - Does it read Table Settings (columnVisibility, customColumns)?
    - Or is it a static/hardcoded prompt?
    - Show the exact code that builds the prompt

B2. When JSON is pasted and applied, what EXACT steps happen?
    - Trace the call chain: parse → normalize → resolve → apply
    - Which functions from src/domain/import/ are called (if any)?
    - Or does Waybill have its own separate logic?

B3. Does the import adapter CREATE new columns?
    - If yes: show the exact code that adds to customColumns/columnVisibility
    - What function is called? (addCustomColumn, setColumns, etc.)
    - Is there any limit?

B4. How does the import handle a key it DOESN'T recognize?
    - Does it discard it? Map to custom_data? Create a new column?
    - Show the exact code path

B5. Does the import adapter MODIFY Table Settings state directly?
    - Does it call setColumns, setCustomColumns, or similar?
    - Show the exact call

B6. Does the import prompt ONLY reference columns currently visible
    in Table Settings? Or does it include all possible columns?
    - Show the prompt generation logic

==================================================
SYSTEM C — WAYBILL DATA MODEL
==================================================
Read these files fully:
- `src/components/waybill/waybillUtils.ts` — `WaybillCustomFields`, `parseWaybillCustomFields`, `buildWaybillCustomFields`
- `supabase/migrations/` — any migration that defines the waybills table
- `src/lib/database.types.ts` — waybill-related types

Report EXACTLY:

C1. What is the EXACT shape of custom_fields on a waybill?
    - Type definition (quote verbatim)
    - Every field it contains

C2. Which custom_fields entries are "UI metadata" vs "business data"?
    - UI metadata: columnVisibility, customColumns, pdfTemplateId, etc.
    - Business data: signatures, references, partyNotes, etc.

C3. How does custom_fields get WRITTEN to Supabase?
    - What function serializes it?
    - Is it JSON.stringify'd? Passed as an object?

C4. How does custom_fields get READ from Supabase?
    - What function parses it?
    - What defaults are applied if fields are missing?

C5. Is there ANY code path where custom_data keys from items
    get written INTO custom_fields (the column metadata)?
    - If yes: show exact code

C6. What is the current state of item_id in the system?
    - Does WaybillItem type include item_id?
    - Does normalizeWaybillItem handle it?
    - Does any import adapter add it?
    - Does the DB store it inside items JSONB?

==================================================
QUESTION D — THE ROGUE COLUMN
==================================================
The user reports a column appearing in Table Settings that they did not
create. It is "clearly from Supabase."

Search for:
- Any code that reads keys from items[].custom_data and adds them to
  customColumns or columnVisibility
- Any useEffect or state initializer that merges item data into
  column definitions
- Any import path that persists column state to the DB automatically

Report any code path that could cause a Supabase-stored value to
"appear" as a column in the UI without the user explicitly adding it.

==================================================
OUTPUT
==================================================
One section per system (A, B, C) plus section D. Within each section,
answer every question with exact file paths, line numbers, and quoted
code. No recommendations. No engine design. No fixes.

If a question cannot be answered from the code alone (e.g. requires
live DB query), state that explicitly — do not guess.