# Phase 3 — Integration Test: Waybill Render Engine

**Date:** 2026-06-21
**Status:** ✅ Complete

## Summary

Created `src/tests/critical/waybillRenderEngine.test.ts` with 11 integration-test assertions that exercise the full `buildWaybillRenderModel` pipeline end-to-end. All 11 pass, `bun run typecheck` passes with zero errors, `bun run lint` passes with zero warnings.

## Test Payload

- 3 items (Oil Filter Element, Fuel Injector, Air Intake Gasket)
- `type: "external"` — forces literal type via `as const` to satisfy the union `"internal" | "external"`
- `time: null` — blank input for blank-preservation check
- `notes: "<p>Handle with care. <strong>Fragile</strong> items.</p>"` — rich text for HTML-stripping check
- Signatures: sender with `image_url`, receiver `null`
- 5 columns: description, qtyLabel, condition, part_no, make — mixing base fields, computed column, and custom columns

## Assertions

| # | Assertion | What it verifies |
|---|---|---|
| 1 | All 9 top-level keys present | Pipeline completeness |
| 2 | Blank preservation | `null → ""`, non-null stays, `null` sig stays |
| 3 | HTML stripped from notes | `<p>`/`<strong>` tags removed |
| 4 | Signature normalization | `{ url, width: 110, height: 42 }`, `null` preserved |
| 5 | Forbidden fields excluded | No monetary/ID fields in any cell |
| 6 | `qtyLabel` computed correctly | `"2 pcs"`, `"4 pcs"`, `"1 kit"` |
| 7 | Custom columns from `custom_data` | `part_no`/`make` mapped; missing → `""` |
| 8 | Table columns match input | Count, keys, labels |
| 9 | Footer values | `waybillNumber`, `companyName` |
| 10 | Pagination defaults | All three `true` |
| 11 | Determinism | `JSON.stringify` equality on two runs |

## Files

| File | Lines |
|---|---|
| `src/tests/critical/waybillRenderEngine.test.ts` | 156 |

## Verification

- `bun run typecheck` — 0 errors
- `bun run lint src/tests/critical/waybillRenderEngine.test.ts` — 0 warnings
- `bun test src/tests/critical/waybillRenderEngine.test.ts` — 11 pass, 0 fail
