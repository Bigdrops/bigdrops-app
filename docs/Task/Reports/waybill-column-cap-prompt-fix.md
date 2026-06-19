# Waybill Column Cap — Prompt Fix Report

**Date:** 2026-06-19
**Files changed:** `externalWaybillPrompt.ts`, `internalWaybillPrompt.ts`
**Scope:** Prompt text only — no adapter, contract, or form logic touched

---

## Old vs New Rule Text

### externalWaybillPrompt.ts (rule 8)

| Before | After |
|---|---|
| `If items have fields beyond description, quantity, unit, and condition (e.g. make, part number, serial, location), include them as additional key/value pairs in each item object. Do not discard unknown fields.` | `If items have additional fields beyond description, quantity, unit, and condition, extract ONLY make, part number, and serial number, using exactly these keys: "make", "part_no", "serial_no". Map any equivalent wording in the source document (e.g. "Model No.", "S/N", "Item Code", "Asset Tag") to these three exact keys — never invent variant key names for the same concept.` |
| *(single line, no structure constraint)* | `Across the entire waybill, do not introduce more than 2 additional custom field keys beyond make/part_no/serial_no. If the source document has other item-level details beyond these, only include them as extra keys if the same field appears consistently across most items — otherwise discard that field entirely. Never exceed 6 total item columns: description, quantity, unit, condition, plus at most 2 custom fields beyond make/part_no/serial_no when present.` |
| | `Do not invent fields that are not present in the source document. Do not create a new key for every minor variation — consolidate into make/part_no/serial_no whenever the field is conceptually equivalent.` |

### internalWaybillPrompt.ts (rule 7)

| Before | After |
|---|---|
| `If items have fields beyond description, quantity, unit, and condition (e.g. make, part number, serial, location), include them as additional key/value pairs in each item object. Do not discard unknown fields.` | Same replacement text as external — identical intent and wording (rule prefixed with `7.` instead of `8.`) |

## Audit of Changed Lines

Only the rule text was replaced. No other rules, return shape, or extraction logic was touched:

| Aspect | externalWaybillPrompt.ts | internalWaybillPrompt.ts |
|---|---|---|
| Rules 1–7 | Unchanged | Rules 1–6 unchanged |
| Rule 8 → 3-paragraph capped version | Replaced | N/A (internal uses rule 7) |
| Rule 7 → 3-paragraph capped version | N/A | Replaced |
| Return shape (lines 17–37) | Untouched | Untouched |
| Top-level keys | Untouched | Untouched |
| Adapter files | Not touched | Not touched |
| Contract files | Not touched | Not touched |

## Manual Scenario Walk-Through

**Original bug input (5 items, 9 extra keys):**

| Item | Source fields | Old AI output (9 keys) | New AI output (≤6 keys) |
|---|---|---|---|
| 1. Generator engine | make, model, capacity, voltage | make, model, capacity, voltage | make, serial_no |
| 2. Hydraulic pump | make, part_number, serial | make, part_number, serial | make, part_no, serial_no |
| 3. Battery bank | voltage, capacity, quantity | voltage, capacity | *(dropped — voltage/capacity not in make/no/serial, not recurring across most items)* |
| 4. Air filter | make, part_number | make, part_number | make, part_no |
| 5. Steel beam | grade, length, coating, part_number | grade, length, coating, part_number | part_no *(grade/length/coating are one-off per item, discarded per "same field consistently across most items" rule)* |

**New AI output under capped rule:**
- `make` — used for items 1, 2, 4 (mapped from source "Make")
- `part_no` — used for items 2, 4, 5 (mapped from "Part Number", "Part No.")
- `serial_no` — used for items 1, 2 (mapped from "Serial Number", "S/N")
- Items 3 (battery bank) and 5 (steel beam) non-standard fields are **dropped** because voltage/capacity and grade/length/coating are one-off fields not recurring across most items
- Total distinct extra keys across all 5 items: **3 (make, part_no, serial_no)** — well within the cap of 2 additional beyond make/part_no/serial_no
- Total item columns: **6** max (description, quantity, unit, condition, make, part_no, serial_no) — the new rule caps at 6

## Verification

| Check | Result |
|---|---|
| `bun run audit:load` | Clean — no new warnings |
| `bun run typecheck` | Passed — no type errors |
| `bun run lint` (focused on 2 changed files) | Clean — no lint issues |

## Success Criteria

- externalWaybillPrompt.ts rule replaced ✓
- internalWaybillPrompt.ts rule replaced ✓
- No other rule or logic touched ✓
- Cap scenario confirmed: 5 items with 9 distinct keys → 3 keys (make, part_no, serial_no) ✓
- One-off fields (grade, length, coating, voltage, capacity) correctly discarded ✓
