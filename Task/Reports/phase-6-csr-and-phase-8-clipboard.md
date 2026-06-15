# Phase 6 + Phase 8 — CSR Import Refactor & Clipboard Button

## Files Modified

| File | Changes |
|---|---|
| `src/components/csr/csrImport.ts` | Removed old data model (ALLOWED_SCALAR_KEYS, normalize helpers, `parseCsrImportText`). Added Zod v4 schema (`csrJsonSchema`), `CsrJson` type, `ParseCsrJsonResult` discriminated union, `parseCsrJson()` function. Prepended discipline spec to `CSR_IMPORT_PROMPT`. Retained backward-compat types (`CsrImportMaterial`, `ParsedCsrImport`). |
| `src/components/csr/CsrImportSheet.tsx` | Switched from `parseCsrImportText` (throw-based) to `parseCsrJson` (result-union-based). Adapter converts `CsrJson` → `ParsedCsrImport` for parent components. |
| `src/components/import/JsonImportLayout.tsx` | Added `ClipboardPaste` button using `navigator.clipboard.readText()` in the "Step 1: Paste JSON" section, alongside the existing label. |

## Verification

- `bun run typecheck` — **passed** (zero errors)
- `bun run lint` — **passed** (zero new errors added; the 1274 pre-existing errors are unchanged)

## Design Decisions

1. **Backward-compat types kept** — `ParsedCsrImport` and `CsrImportMaterial` remain exported to avoid breaking `CsrFormScreen.tsx` (which uses `ParsedCsrImport` as a prop type). Only three files were modified per DONE WHEN rule.
2. **Zod v4** — Project uses zod ^4.3.6. Schema uses `.nullable()` without `.optional()` since `"strict": false` in tsconfig.
3. **Discriminated union** — `ParseCsrJsonResult` uses `ok: true` / `ok: false` with matching narrow. The check requires `parseResult.ok === false` (not `!parseResult.ok`) for proper narrowing.
4. **Discipline prepend** — Follows same pattern as Phase 4/5 (inline discipline rules at top of prompt, matching `JSON_IMPORT_DISCIPLINE_SPEC` from `promptGenerator.ts`).
5. **ClipboardPaste** — Icon verified present in lucide-react v0.577.0. Button placed inline with the "Step 1: Paste JSON" label row.
