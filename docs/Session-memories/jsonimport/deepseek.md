Deepsek speaking. Here's the complete architect-level session log, designed to give any AI (or me in a future session) instant full context on everything we built, decided, debugged, and shipped.

```markdown
# JSON Import Improvement — Complete Architect Session Log

> **Purpose:** This document captures the full architectural journey of the BIGDROPS JSON Import Improvement Roadmap. It is written for an architect — not an agent. Any AI reading this should be able to resume the conversation with complete context.
> **Date Range:** 2026-06-14 to 2026-06-15
> **Final Status:** Complete (all phases shipped or formally deferred)

---

## 1. Project Context

**BIGDROPS** is a Nigerian B2B invoicing and business management platform. Stack: React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase (Postgres), Vite 7, Bun runtime, Vercel deployment.

The JSON Import system allows operators to paste AI-generated JSON into document forms (Invoices, Waybills, CSRs, etc.) to populate line items and header fields. The "Open in AI" button sends a structured prompt to an external AI provider (Gemini, ChatGPT, Claude, etc.) with instructions on how to convert a source document into the correct JSON shape.

---

## 2. Initial State (Before Roadmap)

An audit was conducted across all 10 modules. Key findings:

### 2.1 Shared Infrastructure
- `src/domain/import/` — types, schema, utils, parser, promptGenerator
- `src/components/import/JsonImportLayout.tsx` — shared Sheet wrapper used by most modules

### 2.2 Module-by-Module State

| Module | Prompt Source | Parser | Validation | Uses Shared Pipeline? |
|---|---|---|---|---|
| Invoice | Shared `generateImportPrompt()` | Shared `parser.ts` | Shared Zod | Yes |
| Quotation | Shared `generateImportPrompt()` | Shared `parser.ts` | Shared Zod | Yes |
| RFQ | Hardcoded inline | Inline `parseJson()` | Inline checks | No |
| CSR | Hardcoded constant | Inline | Inline checks | No |
| Waybill | Hardcoded inline | Shared `parser.ts` | Shared Zod | Partial (parser only) |
| Compliance Hub | Hardcoded per contract (3 prompts) | Per-contract custom | Per-contract Zod | No |
| Item Library | N/A (no prompt) | Inline function | Inline checks | No |
| Project Document | Hardcoded per sub-type (4 prompts) | Inline `JSON.parse()` | Inline type checks | No |
| BOQ | No import system | — | — | N/A |
| Reports | No import system | — | — | N/A |

### 2.3 Critical Problems Identified

1. **"Open in AI" only exposed Gemini** — despite `openInAI.ts` supporting ChatGPT and Claude.
2. **5 of 8 import-capable modules used bespoke validation** (no Zod).
3. **6 of 8 modules hardcoded prompts** — only Invoice/Quotation used the dynamic prompt generator.
4. **No global discipline rules** — AI could hallucinate values, infer groups, or fill in missing fields.
5. **CSV support existed alongside JSON in CSR** — inconsistent with other modules.
6. **Waybill import had inline logic in UI components** — violating separation of concerns.
7. **Project Documents had calculated financial fields in AI prompts** (subtotal, total) that the app recalculates.
8. **No `po_number` identifier discipline** — AI would set it for any document number.

---

## 3. The Roadmap

The `docs/Json-import-roadmap.md` defined 13 phases:

| Phase | Module | Status After Completion |
|---|---|---|
| 0 | Open in AI System | ✅ Done |
| 1 | Waybill Rewrite | ✅ Done |
| 2 | Invoice Add Mode (Anti-Inference) | ✅ Done |
| 2b | Invoice/Quotation Update Mode | ✅ Done |
| 3 | Quotation Parity | ✅ Inherited |
| 4 | Compliance Hub | ✅ Done |
| 5 | RFQ | ✅ Done |
| 6 | CSR | ✅ Done |
| 7a | Project Documents | 🔀 Moved to PDF Roadmap |
| 7b | Project PDF | 🔀 Moved to PDF Roadmap |
| 8 | Clipboard Detector | ✅ Done |

### 3.1 Global Prompt Discipline Layer (Section 0 of Roadmap)

A system-wide enforcement layer applied to ALL AI-generated import prompts:
- Return ONLY data explicitly present in the source document
- Never infer, guess, or fabricate values
- Missing values MUST be null
- Do not rename or reorder fields
- Output MUST be valid JSON only
- Groups are allowed ONLY if explicitly present in the source document
- Never create groups from layout, indentation, or spacing
- Each document type is independent (no cross-domain inference)
- `po_number` MUST be null unless source explicitly labels it as PO/Voucher
- JSON MUST be wrapped in a code block
- MUST end with: "Copy the JSON above and paste it back into the app"

---

## 4. Phase-by-Phase Execution

### 4.1 Phase 0 — Open in AI System

**Goal:** Replace Gemini-only UI with a 6-provider dropdown, add silent clipboard copy, add toast feedback.

**Files Modified:**
- `src/lib/openInAI.ts` — Added 6 providers (Gemini, ChatGPT, Claude, DeepSeek, Qwen, Kimi)
- `src/components/ui/OpenInAIDropdown.tsx` — Replaced single button with provider dropdown
- `src/domain/import/promptGenerator.ts` — Appended code-block and paste-back instructions

**Bugs Encountered & Fixed:**

1. **Dropdown not opening (first attempt):** Agent used shadcn DropdownMenu, but it conflicted with the parent Sheet's focus trap. Console showed `[Violation] 'pointerdown' handler took 200-400ms`. The dropdown technically opened but clicks never reached menu items. **Fix:** Switched from DropdownMenu to Radix Popover.

2. **Popover still not opening (second attempt):** Popover swap didn't fix it. New violations showed `'message' handler took 2081ms`. Root cause was a YouTube iframe in `JsonImportLayout.tsx` (tutorial section) firing continuous `postMessage` events, blocking the main thread. **Fix:** Made the iframe lazy — only rendered when `showTutorial` is true.

3. **Popover broken on mobile (third attempt):** Popover inside Sheet failed on touch devices because Sheet overlay intercepted touch events before Radix could process them. **Fix:** Replaced Popover with a native HTML `<select>` element. This was a pragmatic decision — functional but not polished. The user accepted it to unblock progress.

4. **Missing Global Discipline Spec:** Initial implementation only appended code-block and paste-back lines. The full anti-inference discipline block was not prepended. **Fix:** Added a follow-up task to inject the full discipline spec into `generateImportPrompt()` via a `DISCIPLINE_SPEC` constant prepended to every generated prompt.

**Final State:** 6-provider selector working (native `<select>`), silent clipboard write on selection, toast with provider name, all prompts include discipline spec + code-block/paste-back instructions.

---

### 4.2 Phase 1 — Waybill Rewrite

**Goal:** Complete isolation of External and Internal waybill import systems. Zero shared logic.

**Architectural Decision:** External and Internal waybills have different field sets:
- External: `client_id`, `client_name`, `po_number`, `purpose` (DB-enforced)
- Internal: `purpose` must be NULL (DB CHECK constraint), no client fields

**Files Created:**
- `src/domain/waybill/externalWaybillPrompt.ts`
- `src/domain/waybill/internalWaybillPrompt.ts`
- `src/domain/waybill/externalWaybillSchema.ts`
- `src/domain/waybill/internalWaybillSchema.ts`
- `src/domain/waybill/externalWaybillImportAdapter.ts`
- `src/domain/waybill/internalWaybillImportAdapter.ts`

**Files Modified:**
- `src/components/waybill/WaybillForm.tsx` — Restored `delivery_location` field, wired adapters
- `src/components/waybill/WaybillImportSheet.tsx` — Removed hardcoded prompt, delegates to adapter
- `src/domain/import/promptGenerator.ts` — Exported `JSON_IMPORT_DISCIPLINE_SPEC`

**Gap Decisions (from audit):**

| Gap | Decision |
|---|---|
| Gap 1: `delivery_location` in DB but no form field | Restore to form (was removed during invoice form import refactor) |
| Gap 2: `purpose` no form selector | Dropped — user to revisit separately |
| Gap 4: `driver_name` missing from import prompt | Add to import prompt |
| Gap 5: `transport_mode` missing from import prompt | Add to import prompt |
| Gap 7: `partyNotes` imported but never displayed | Delete from import prompt |
| Gap 8: `linkedProjectName`, `sourceDocumentNumber` imported but no form UI | Delete from import prompt |

**Prompt Bloat Fix (Post-Implementation):**
The initial waybill prompts were bloated — included "photographed or handwritten" (locking out PDF sources), signature detection rules (not relevant to import), alias lists (5+ per field), and group rules (only Invoice/Quotation support groups). The user called this out. **Fix:** Replaced both prompts with lean 7-rule versions. Removed all aliases, signature rules, source-type restrictions. Added isolation statements. Used exact JSON shapes as instructions.

**Final State:** Two fully isolated import systems. No shared schemas, prompts, or adapters. UI is a thin shell that picks the right adapter based on `waybill.type`. `quantity` → `qty` mapping handled in `applyResult`.

---

### 4.3 Phase 2 — Invoice Add Mode (Anti-Inference Layer)

**Goal:** Prevent AI from creating groups that don't exist in the source document.

**Two-layer protection:**

1. **Prompt layer:** Added 2 anti-inference rules to Add mode rules array:
   - "Create groups ONLY if the source document contains explicit section header labels"
   - "Never infer groups from indentation, indentation depth, bullet style, or visual spacing"
   - "Preserve the exact item order from the source document"

2. **Apply layer:** Added `hasScatteredGroups()` guard in `apply.ts`. If the AI creates groups but they're clustered (all at start, all at end, or all in one block), silently strip the groups and apply items in original JSON array order. Only preserve groups if they're genuinely scattered across the items (indicating real section structure).

**Test cases verified:**
- All items in one group → stripped
- Groups clustered at start → stripped
- Groups clustered at end → stripped
- Groups scattered → preserved
- No groups → normal flow

**Quotation:** Inherits automatically via shared pipeline. No separate changes needed.

---

### 4.4 Phase 2b — Invoice/Quotation Update Mode

**Goal:** Safe, bounded, row-based mutation system.

**Five changes:**

1. **Prompt layer:** `generateImportPrompt()` now accepts `currentItemCount` parameter. Update mode prompt includes: "Valid row_numbers for this document are 1 through {N}. Row {N+1} or higher will be REJECTED." Uses `getStandardRowEntries(items).length` to exclude group headers from count.

2. **Schema layer:** `buildImportSchema()` now accepts `maxRow` parameter. `row_number` validated as `.int().positive()` with range refinement. Duplicate `row_number` caught at parse time via `.superRefine()`. Redundant checks removed from `validate.ts`.

3. **Overwrite confirmation dialog:** `detectOverwriteTargets()` wired to an AlertDialog. Shows list of fields being overwritten with old→new values. Cancel aborts import. Confirm proceeds. All-or-nothing v1 — no per-item exempt.

4. **Empty-field retention warning:** Small text under textarea in Update mode: "Fields you leave empty will stay unchanged. Only include the columns you want to overwrite."

5. **Overflow toast:** If import exceeds 200 rows (`MAX_IMPORTED_ROWS`), warning toast fires and items truncated to 200.

**Architectural Decision:** Groups continue to be ignored in Update mode. Update is a row-level patch tool, not a structural tool. If user wants to restructure groups, they use Add mode.

---

### 4.5 Phase 3 — Quotation Parity

**Decision:** Marked complete by inheritance. Quotation reuses the Invoice pipeline 100% (`generateImportPrompt`, `schema.ts`, `apply.ts`). All Phase 2/2b changes apply automatically. No separate code needed.

---

### 4.6 Phase 4 — Compliance Hub

**Goal:** Inject discipline spec into all 3 contract type prompts.

**Files Modified:** `src/domain/compliance/import/contracts.ts`

**Three contract types:**
- `vat_input` — supplier VAT records
- `tax_filing` — tax filing data
- `wht_receipt` — withholding tax receipts

**Changes:** Prepended the 6-rule lean discipline block to all 3 prompts. No Zod schema changes. No WHT payment linking changes. No group rules added (Compliance Hub doesn't support groups).

---

### 4.7 Phase 5 — RFQ

**Goal:** Replace bloated inline prompt with disciplined 3-field extract.

**Files Modified:** `src/domain/rfq/importAdapter.ts`

**Changes:** Replaced hardcoded prompt with lean version. Only extracts `item_name`, `quantity`, `specification`. No group rules. No Zod migration (deferred — manual parser remains but prompt is now disciplined).

---

### 4.8 Phase 6 — CSR

**Goal:** Remove CSV support, rename misleading function, migrate to Zod, inject discipline spec.

**Files Modified:**
- `src/components/csr/csrImport.ts` — Removed CSV path, renamed `parseCsvImport` → `parseCsrJson`, added `csrJsonSchema` Zod schema, prepended discipline spec to `CSR_IMPORT_PROMPT`
- `src/components/csr/CsrImportSheet.tsx` — Removed CSV file upload UI, updated import to `parseCsrJson`

**Key Decisions:**
- CSR is a single-record import (one object, not an array)
- Backward-compatible types (`ParsedCsrImport`, `CsrImportMaterial`) retained to avoid breaking `CsrFormScreen.tsx`
- Zod v4 used (project dependency), `.nullable()` without `.optional()`

---

### 4.9 Phase 8 — Clipboard Detector

**Goal:** Add "Paste from clipboard" button to shared JSON import layout.

**Files Modified:** `src/components/import/JsonImportLayout.tsx`

**Implementation:**
- Button placed alongside "Step 1: Paste JSON" label
- Uses `navigator.clipboard.readText()` inside try/catch
- Silent-fail on all error paths (no toast, no alert)
- Only fires on explicit user click — NEVER on focus or mount
- This avoids Android 12+ system toast on every clipboard read

**Design Constraint:** Auto-read on focus is forbidden. Android 12+ fires a system toast on every programmatic clipboard read, causing repeated alerts every time the import modal opens. Clipboard read must only happen on explicit user tap.

---

### 4.10 Phase 7a & 7b — Deferred

**Decision:** Project Documents (7a) and Project PDF (7b) moved to a new standalone roadmap at `docs/Pdf-improvement-roadmap.md`. JSON Import Roadmap marked Complete.

**Reasoning:** Project Documents has deeper architectural implications (company identity injection, `po_number` fix, financial field removal) that need separate detailed planning. PDF work is a cross-document quality audit, not JSON import.

---

## 5. Key Architectural Decisions Summary

| Decision | Rationale |
|---|---|
| DropdownMenu → Popover → native `<select>` | Radix conflicts with Sheet focus trap; pragmatic fallback |
| YouTube iframe lazy loading | Main thread blockage; deferred iframe rendering |
| Global Discipline Spec as canonical constant | Single source of truth; shared by Invoice/Quotation; tailored versions for other modules |
| External/Internal Waybill complete isolation | Different field sets; DB-level constraints differ; zero shared logic |
| Groups ignored in Update mode | Update is a row-level patch tool, not a structural tool |
| `hasScatteredGroups()` silent strip | UX decision — no warning for clustered groups, just silently correct |
| CSV removal from CSR | JSON-only standard across all modules |
| Clipboard read on explicit tap only | Android 12+ system toast avoidance |
| `quantity` → `qty` mapping in adapters | DB field name differs from frontend; adapter handles transparently |
| Project Documents deferred to PDF roadmap | Needs deeper planning; not a pure JSON import concern |

---

## 6. Standard Codification

Created `docs/json-import-standard.md` — a prescriptive standard for all future document modules. Covers:
- Global Prompt Discipline (verbatim block)
- Adapter pattern (prompts, schema, applyResult)
- Zod validation requirement
- UI integration via `JsonImportLayout`
- Module isolation rules
- Group rules (Invoice/Quotation only)
- Update mode requirements
- 10-point checklist for new modules

Added hard reference in `AGENTS.md`:
> "New document modules that support JSON import MUST follow the standard defined in `docs/json-import-standard.md`."

---

## 7. File Inventory (All Phases)

### Created
- `src/domain/waybill/externalWaybillPrompt.ts`
- `src/domain/waybill/internalWaybillPrompt.ts`
- `src/domain/waybill/externalWaybillSchema.ts`
- `src/domain/waybill/internalWaybillSchema.ts`
- `src/domain/waybill/externalWaybillImportAdapter.ts`
- `src/domain/waybill/internalWaybillImportAdapter.ts`
- `docs/json-import-standard.md`
- `docs/Pdf-improvement-roadmap.md`

### Modified
- `src/lib/openInAI.ts` — 6 providers
- `src/components/ui/OpenInAIDropdown.tsx` — native `<select>` replacement
- `src/components/import/JsonImportLayout.tsx` — clipboard button + iframe lazy load
- `src/domain/import/promptGenerator.ts` — discipline spec + row range + anti-inference rules
- `src/domain/import/schema.ts` — strict row_number validation
- `src/domain/import/apply.ts` — `hasScatteredGroups()` guard
- `src/domain/import/validate.ts` — removed redundant checks
- `src/domain/invoice/importAdapter.ts` — updated `prompts()` signature
- `src/domain/quotation/importAdapter.ts` — updated `prompts()` signature
- `src/components/items/JsonItemsImportSheet.tsx` — overwrite dialog + warning + overflow toast
- `src/components/waybill/WaybillForm.tsx` — `delivery_location` field + adapter wiring
- `src/components/waybill/WaybillImportSheet.tsx` — adapter delegation
- `src/domain/compliance/import/contracts.ts` — discipline spec prepended
- `src/domain/rfq/importAdapter.ts` — prompt replaced
- `src/components/csr/csrImport.ts` — CSV removed, Zod migration, discipline spec
- `src/components/csr/CsrImportSheet.tsx` — CSV UI removed
- `docs/Json-import-roadmap.md` — marked complete
- `AGENTS.md` — added standard reference

---

## 8. Lessons Learned

1. **Radix inside Sheet is fragile.** Both DropdownMenu and Popover had issues with focus traps and touch events inside Sheet overlays. Native `<select>` was the pragmatic fallback.

2. **YouTube iframes block the main thread.** The tutorial iframe in `JsonImportLayout` was the root cause of a multi-hour debugging session. Always lazy-load iframes.

3. **Prompt discipline is load-bearing.** The Global Discipline Spec is the most important change we made. Without it, AI hallucinates groups, fills in missing fields, and misclassifies identifiers.

4. **Isolation prevents regression.** Separating External and Internal Waybill adapters completely (zero shared logic) means a bug in one cannot affect the other.

5. **Agent reports must be verified manually.** Multiple agents claimed verification they couldn't possibly have performed (browser-based UI checks without a dev server). Always run manual tests before accepting.

6. **Template literal nesting in prompt strings causes TypeScript errors.** When prepending strings to existing template literals, use string concatenation, not nested backticks.

---

## 9. How to Resume This Conversation

If you (the architect) are reading this in a new session, here's what you need to know:

- The JSON Import Improvement Roadmap is **complete**.
- Project Documents and PDF work are **deferred** to `docs/Pdf-improvement-roadmap.md`.
- All new document modules must follow `docs/json-import-standard.md`.
- The `AGENTS.md` file has a hard reference to this standard.
- The codebase is in a clean state: typecheck passes, lint is clean on all changed files.
- Any future work on import should reference the standard, not reverse-engineer from existing code.

If you're picking up a bug in the import system, check:
1. The module's adapter file in `src/domain/<module>/`
2. The `JsonImportLayout.tsx` for shared UI issues
3. The `promptGenerator.ts` for Invoice/Quotation prompt issues
4. This document for the original decisions and trade-offs
```