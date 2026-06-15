# Phase 1 — Prompt Trim and Roadmap Report

- **Date:** 2026-06-15
- **Agent:** opencode

## Files Touched

| File | Action |
|---|---|
| `src/domain/waybill/externalWaybillPrompt.ts` | Replaced |
| `src/domain/waybill/internalWaybillPrompt.ts` | Replaced |
| `src/domain/waybill/externalWaybillImportAdapter.ts` | Fixed import name |
| `src/domain/waybill/internalWaybillImportAdapter.ts` | Fixed import name |
| `docs/Json-import-roadmap.md` | Added 2 bullets |

## What Was Done

### Part 1 — Trim Waybill Prompts

Replaced both waybill prompt files with trimmed versions:

- **External:** Removed `JSON_IMPORT_DISCIPLINE_SPEC` import, alias lists, excluded fields list, signature rules, duplicate rules. Now self-contained with 7 rules + JSON shape only.
- **Internal:** Same trim. No po_number, no client fields, no purpose.
- Export names changed from `EXTERNAL_WAYBILL_PROMPT` / `INTERNAL_WAYBILL_PROMPT` to `externalWaybillPrompt` / `internalWaybillPrompt`.
- Adapter imports updated to match new export names.

### Part 2 — Roadmap Bullets

- Bullet 1 appended to Section 0 (Global Prompt Discipline Layer): "Groups are an Invoice and Quotation concern only..."
- Bullet 2 appended to Section 13 (Phase 1 — Waybill Rewrite): "Prompt discipline: source is never locked to a specific input type..."

## Verification

- `bun run typecheck` — 2 errors after initial edit (export name mismatch), fixed in follow-up.
- Final state: both adapter files import correct lowercase names.
- No other files modified.
