```
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
Before writing any code, you MUST:

1. Read the project skills index: `docs/PROJECTSKIILINDEX.md`
2. Load the skills relevant to this task:
   - `Karpathy` — coding discipline, surgical changes, no scope creep
   - `frontend-design` — UI quality standards
   - `shadcn` — shadcn/ui Button component
3. If a skill fails to load via tool, FALL BACK to reading the SKILL.md file directly using the path from the index.
4. If SKILL.md cannot be read, STOP IMMEDIATELY. Task = FAILED.
5. Read AGENTS.md at project root before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save a markdown work report to `Task/reports/phase-6-csr-and-phase-8-clipboard.md` including: date, agent, files touched, what was done per change, verification results, done-criteria checklist, any deviations.

==================================================
TASK: Phase 6 (CSR) + Phase 8 (Clipboard Detector)
==================================================

Two independent modules. Both are surgical.

PHASE 6 — CSR: Remove CSV path entirely. Rename misleading function. Migrate to Zod. Prepend discipline spec.
PHASE 8 — Clipboard Detector: Add a "Paste from clipboard" button to the shared JSON import layout. Best-effort, silent-fail.

READ FIRST (mandatory, before editing):
- `src/components/csr/csrImport.ts` (read fully — find `parseCsvImport` and all its usages)
- `src/components/csr/CsrImportSheet.tsx` (read fully — find the import button row and the textarea)
- `src/components/import/JsonImportLayout.tsx` (read fully — find where the textarea and the "Open in AI" button are rendered)
- `src/domain/import/schema.ts` (read fully — find existing Zod schema patterns to mirror)
- `AGENTS.md`
- `docs/PROJECTSKIILINDEX.md`

==================================================
PHASE 6 — CSR
==================================================

SCOPE — Touch ONLY these 2 files:
- `src/components/csr/csrImport.ts`
- `src/components/csr/CsrImportSheet.tsx`

### 6.1 — Remove CSV path entirely

The CSR import supports both JSON paste and CSV file upload. Remove the CSV file upload support entirely. This module is JSON-only going forward.

In `CsrImportSheet.tsx`:
- Remove the file input for CSV upload (if present)
- Remove any "Upload CSV" or "Choose file" button
- Remove any drag-and-drop handlers for CSV files
- Remove any CSV-specific state, refs, or parser calls
- Keep only the JSON paste textarea + apply/cancel buttons

In `csrImport.ts`:
- Remove any `parseCsvText` or CSV-specific parser function
- Remove any CSV-related types
- Remove any CSV-related constants

### 6.2 — Rename `parseCsvImport` → `parseCsrJson`

In `csrImport.ts`:
- Rename the function `parseCsvImport` to `parseCsrJson` (it always handled JSON despite the name)
- Update all internal references within `csrImport.ts`

In `CsrImportSheet.tsx`:
- Update the import statement and all call sites to use `parseCsrJson`
- Confirm there is only one call site in this file (if there are more, update all of them)

### 6.3 — Migrate to Zod

In `csrImport.ts`:
- Create a new Zod schema named `csrJsonSchema` for the CSR JSON payload shape:
  ```
  {
    customer_name: string,
    report_type: string | null,
    description: string,
    amount_due: number | null,
    amount_paid: number | null,
    product_serial_number: string | null,
    status: "pending" | "resolved" | null
  }
  ```
- The CSR import is a single-record import (one object, not an array) — the schema validates one object
- Use Zod (already a project dependency). Match the existing pattern in `src/domain/import/schema.ts` (e.g. `simpleItemSchema`)
- Replace the manual field checks inside `parseCsrJson` with `csrJsonSchema.safeParse(json)`
- Return a result shape consistent with the other modules' `parseImportText` return type: `{ ok: true, data: T } | { ok: false, error: { stage, message } }`

### 6.4 — Prepend discipline spec

In `csrImport.ts`, find the `CSR_IMPORT_PROMPT` constant (or wherever the prompt string is defined). Prepend the following lean discipline block at the start:

```
Extract only what is explicitly present in the source document.

RULES:
1. Return null for any missing field — never guess or infer.
2. Return valid JSON only. No markdown, no explanation.
3. Wrap the JSON in a code block.
4. After the code block write: "Copy the JSON above and paste it back into the app."
5. This document type is isolated. Do not reuse logic from any other document type.
6. Do not create groups. CSR is a single-record import.

Return a single JSON object (not an array) with this exact shape:
{
  "customer_name": "",
  "report_type": null,
  "description": "",
  "amount_due": null,
  "amount_paid": null,
  "product_serial_number": null,
  "status": "pending | resolved"
}
```

Do NOT add the existing `CSR_IMPORT_PROMPT` field-list section if it conflicts with the shape above. The new shape is the source of truth.

==================================================
PHASE 8 — Clipboard Detector
==================================================

SCOPE — Touch ONLY this 1 file:
- `src/components/import/JsonImportLayout.tsx`

### 8.1 — Add "Paste from clipboard" button

Add a small button next to (or directly above) the JSON textarea. The button must:

- Use shadcn `Button` component, variant `outline`, size `sm`
- Label: "Paste from clipboard" with a `ClipboardPaste` lucide-react icon to the left
- No emoji
- Compact — does not dominate the layout
- 44×44px minimum tap target on mobile (use `min-h-[44px] min-w-[44px]` if needed)

### 8.2 — Button click behavior (BEST-EFFORT, SILENT-FAIL)

On click, execute in this exact order:

1. Wrap the entire handler body in a try/catch. On ANY error, return silently — do not show a toast, do not log, do not alert.
2. Call `await navigator.clipboard.readText()` inside the try block.
3. If the result is an empty string, return silently.
4. Attempt `JSON.parse(result)` inside its own try/catch. If it throws, return silently.
5. If `JSON.parse` succeeds, set the textarea state to the parsed string (use the same state setter the textarea uses for manual paste — find it in the component).
6. If `JSON.parse` succeeds but the result is not an object or array (e.g. a string or number), return silently.

CRITICAL CONSTRAINTS:
- The clipboard read MUST NOT happen on focus, on mount, or on any event other than explicit user click on the button
- This is to prevent Android 12+ from showing a system toast every time the import modal opens
- The button must be visible to screen readers with `aria-label="Paste JSON from clipboard"`

==================================================
VERIFICATION
==================================================

1. `bun run audit:load`
2. `bun run typecheck` — must pass with zero errors
3. `bun run lint` — focused on changed files is acceptable

Manual code verification (document in report):
- `csrImport.ts`: no CSV references remain, `parseCsrJson` is the new name, `csrJsonSchema` Zod schema exists, discipline spec is prepended
- `CsrImportSheet.tsx`: no CSV file input or upload UI, all references to `parseCsrJson`
- `JsonImportLayout.tsx`: button rendered, click handler is try/catch wrapped, no auto-read on focus/mount
- No other files modified

Test scenarios (mental trace):
- Test 1: User clicks Paste button with valid JSON in clipboard → textarea fills with JSON string
- Test 2: User clicks Paste button with non-JSON in clipboard → silent no-op, no error
- Test 3: User clicks Paste button with empty clipboard → silent no-op
- Test 4: `navigator.clipboard.readText()` throws (e.g. permission denied) → silent no-op
- Test 5: User opens import modal, does NOT click Paste → no clipboard read happens
- Test 6: User focuses the textarea → no clipboard read happens
- Test 7: CSR import with valid JSON → Zod validates, single record applied
- Test 8: CSR import with invalid JSON (e.g. amount_due is a string) → Zod rejects, error shown
- Test 9: CSR import with missing fields → those fields are null, validation passes
- Test 10: CSR import flow no longer shows CSV upload option

==================================================
DONE WHEN
==================================================
- [ ] CSV file upload removed from `CsrImportSheet.tsx`
- [ ] All CSV-related code removed from `csrImport.ts`
- [ ] `parseCsvImport` renamed to `parseCsrJson`
- [ ] All call sites updated to use new name
- [ ] `csrJsonSchema` Zod schema created and used
- [ ] Discipline spec prepended to `CSR_IMPORT_PROMPT`
- [ ] "Paste from clipboard" button added to `JsonImportLayout.tsx`
- [ ] Click handler is try/catch wrapped, silent-fail on all error paths
- [ ] No auto-read on focus or mount
- [ ] Button has 44×44px tap target on mobile
- [ ] `bun run audit:load` passes
- [ ] `bun run typecheck` passes with zero errors
- [ ] `bun run lint` shows zero new errors
- [ ] Work report saved to `Task/reports/phase-6-csr-and-phase-8-clipboard.md`
- [ ] No files outside `csrImport.ts`, `CsrImportSheet.tsx`, and `JsonImportLayout.tsx` modified

==================================================
DO NOT
==================================================
- Do NOT run `bun run dev`
- Do NOT auto-read clipboard on focus or mount
- Do NOT show error toasts/tooltips for clipboard read failures
- Do NOT add CSV support back
- Do NOT touch any invoice, quotation, waybill, compliance, or RFQ file
- Do NOT introduce a new icon library (use existing lucide-react)
- Do NOT use Tailwind v4 syntax
- Do NOT use framer-motion
- Do NOT add emoji
- Do NOT claim verification you did not perform
- Do NOT skip the work report
```

Target: Kilocode / Opencode / Any agent | Strategy: Two surgical modules in one pass — Phase 6 is cleanup (CSV removal + rename + Zod), Phase 8 is additive UI (single button with strict best-effort contract), scope: 3 files total.