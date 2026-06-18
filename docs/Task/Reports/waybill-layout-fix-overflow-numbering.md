# Waybill Layout & Numbering Fixes

## Defects Fixed

### P1 — Blank number duplication on repeated downloads (DEFECT 1)
- **Root cause:** `handleBlankDownload` in `NewWaybill.tsx` only queried the `waybills` table for existing numbers. It never queried `blank_waybill_logs`. So repeated blank downloads always saw the same highest number and produced the same sequence (e.g., always 000001).
- **Fix:** Added a parallel query to `blank_waybill_logs` via `Promise.all`. The `existingNumbers` array now includes numbers from both tables, ensuring sequence consumption is accounted for.

### P1 — Signature overflow past single A4 page (DEFECT 2)
- **Root cause:** Signature card `minHeight: 140` and `sigArea` `minHeight: 64` contributed to content exceeding A4 height.
- **Fix:** Reduced `sigCard` minHeight from 140 → 100, `sigArea` minHeight from 64 → 48, `notesBox` minHeight from 50 → 40, `modeBox` minHeight from 50 → 40.
- Added single-page contract comment at top of `blankWaybillTemplate.tsx`.

### P2 — Waybill number and date stacked vertically (DEFECT 3)
- **Root cause:** `metaPillRow` used `flexDirection: 'row'`, placing waybill number and date on the same horizontal line.
- **Fix:** Renamed to `metaPillCol`, changed to `flexDirection: 'column'` with `alignItems: 'flex-end'`. Waybill number is now Row 1, Date is Row 2.

### P2 — Date label restored (DEFECT 4)
- **Root cause:** Previous task removed the "Date" label (applied a blanket label ban).
- **Fix:** Restored visible "Date" text in the date pill: `Date{'  '}{date || ''}`.

### P2 — Tagline placement corrected (DEFECT 5)
- **Root cause:** Tagline rendered between company name and address, interrupting operational identity.
- **Fix:** Reordered brand zone: Company Name → Address → Contact → Tagline.

### P2 — Footer architecture fixed (DEFECT 6)
- **Root cause:** Footer was centered single-line company name only.
- **Fix:** Changed to `flexDirection: 'row'` with `justifyContent: 'space-between'`. Left: company name. Right: waybill number. Center: empty.
- Applied same footer layout to Minimal path in `WaybillPDF.tsx` (propagates via shared `WaybillMinimalContent`).

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/NewWaybill.tsx` | Added parallel query to `blank_waybill_logs` in `handleBlankDownload` |
| `src/components/waybill/waybillMinimalStyles.ts` | Column meta layout, reduced min-heights (sigCard, sigArea, notesBox, modeBox), row footer |
| `src/components/waybill/blankWaybillTemplate.tsx` | Contract comment, reordered tagline, stacked metadata, Date label, left/right footer |
| `src/components/waybill/WaybillPDF.tsx` | No changes needed — Minimal path uses shared `WaybillMinimalContent` |

## Verification

- `bun run audit:load` — passes (no new warnings)
- `bun run typecheck` — passes with zero errors
- `bun run lint` (changed files only) — passes with zero errors

### Manual checks (document):
- Three consecutive blank downloads should produce incrementing numbers (001, 002, 003)
- Single portrait A4 page — no overflow
- Date label visible and field is handwriting-sized
- Waybill number above Date field (separate rows)
- Tagline after address and contact line
- Footer: company name left, waybill number right, centre empty
- Same footer on blank template and Minimal WaybillPDF path
