# Waybill Layout & Numbering Fixes

## Defects Fixed

### P1 — Blank number duplication on repeated downloads
- **Root cause:** `handleBlankDownload` in `NewWaybill.tsx` queried both `waybills` and `blank_waybill_logs` and generated the next number correctly, but when the `blank_waybill_logs` insert failed (unique constraint violation `23505`), it only `console.warn`ed and proceeded to download with the duplicate number.
- **Fix:** Wrapped the insert in a retry loop (up to 3 additional attempts). On `23505` with remaining attempts, re-queries both tables and regenerates the number. On other errors, throws and aborts the download.

### P1 — Signature overflow past single A4 page
- **Root cause:** Total content min-heights exceeded the available A4 content area (~794pt with 24pt padding).
- **Fix:** Reduced padding (24 → 20) and all min-heights:
  - `sigCard`: 140 → 100pt
  - `sigMetaCell` / `sigMetaCellBorder`: 32 → 24pt
  - `sigArea`: 64 → 48pt
  - `topBox`: 70 → 56pt
  - `secondBox`: 35 → 28pt
  - `modeBox`: 50 → 40pt
  - `notesBox`: 50 → 35pt

### P2 — Waybill number and date now stacked vertically
- Changed `metaPillRow` to `flexDirection: 'column'` (pills stack instead of side-by-side).

### P2 — Date label restored
- Added `"Date"` label above the date entry area in the metadata pill, with handwriting-suitable entry space.

### P2 — Tagline placement corrected
- Moved tagline to display *after* address and contact info.

### P2 — Footer layout fixed
- Changed footer from centered single-line to `flexDirection: 'row'` with `justifyContent: 'space-between'`. Left: company name. Right: waybill number.

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/NewWaybill.tsx` | Retry loop for blank log insert; pass `date` to download |
| `src/components/waybill/waybillMinimalStyles.ts` | Reduced min-heights, column metaPillRow, row footer, new `dateLabel`/`dateValue` styles |
| `src/components/waybill/blankWaybillTemplate.tsx` | Reordered tagline, added Date label, stacked metadata pills, left/right footer, single-page contract comment |

## Verification
- `bun run audit:load` — passes (no new warnings)
- `bunx eslint` on all changed files — no errors
