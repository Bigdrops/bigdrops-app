# PRD Update — Prefix Engine Settings

**Date:** 2026-06-15
**Commit:** `2ee30b4`
**Prompt source:** `Prompts/prompt679.md`

---

## Summary

Updated the prefix engine PRD and created an execution plan based on audit findings. Key correction: storage model changed from `organizations` table to existing `settings` table (singleton row).

---

## Files Changed

### Modified: `docs/prd/PREFIX_ENGINE_SETTINGS.md`

| Section | Change |
|---|---|
| Section 3 — Storage & Migration | Replaced `organizations` table with `settings` table singleton. Added `blank_waybill_logs` already-exists note. Added 3.4 Settings Access sub-section documenting `useSettings()` hook pattern. |
| Section 5.3 — Call Chain | Simplified to `useSettings() → settings.document_prefixes → prefix value → existing generator` |
| Section 5.6 — Generator Status | New. Table of all 9 generators with prefix source, dynamic flag, and action required. |
| Section 9 — Implementation Order | Replaced 8 steps (org-table based) with 13 steps (settings-table based). |
| Section 10 — Out of Scope | New. Documents offline modules, blank template PDF rendering as deferred/deprecated. |

### Created: `docs/execution/prefix-engine.md`

New execution plan covering:
- Key design decisions (settings table, useSettings, offline out of scope)
- Both required migrations (document_prefixes column, blank_csr_logs table)
- Generator status table
- 13-step implementation order
- Out of scope items

---

## Path Corrections Made from Prompt

| Prompt Reference | Actual Path |
|---|---|
| `docs/PREFIX_ENGINE_SETTINGS.md` | `docs/prd/PREFIX_ENGINE_SETTINGS.md` |
| `docs/execution` (no file) | Created `docs/execution/prefix-engine.md` |
| `Reports/settings-table-audit.md` | Does not exist — skipped |
| `Reports/...` (lowercase r) | `Reports/...` (uppercase R) |

---

## Verification

- `git log -1 --oneline` shows `2ee30b4` pushed to `origin/main`
- Both files read back correctly after editing
- No source code files modified
