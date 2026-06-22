# Phase 2: Table Resolver & Assembly — Waybill Render Engine

## Summary

Built the table resolver (`resolveColumns` + `buildRows`) and the top-level assembly function (`buildWaybillRenderModel`) to complete the `WaybillRenderModel` production pipeline.

## Files Changed

| File | Action | Description |
|---|---|---|
| `src/domain/waybill/engine/types.ts` | Modified | Added `RawWaybillItem` interface; added `items: RawWaybillItem[]` to `RawWaybill` |
| `src/domain/waybill/engine/resolvers/table.ts` | Created | `resolveColumns` (1:1 map) + `buildRows` (cell construction with forbidden-field stripping + qtyLabel) |
| `src/domain/waybill/engine/assembly.ts` | Created | `buildWaybillRenderModel` — orchestrates all resolvers in strict order |
| `src/domain/waybill/engine/resolvers/index.ts` | Modified | Re-exports `resolveColumns` and `buildRows` |
| `src/domain/waybill/engine/index.ts` | Modified | Exports `RawWaybillItem`, `resolveColumns`, `buildRows`, `buildWaybillRenderModel`, `normalizeBlank` |

## Design Decisions

- **`RawWaybillItem`** includes both canonical fields (`description`, `qty`, `unit`, `condition`, `custom_data`) and forbidden fields (`item_id`, `id`, `created_at`, `updated_at`, `unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`) — `buildRows` strips forbidden fields via explicit construction rather than spreading or deleting.
- **`resolveColumns`** is a pure 1:1 map of `ResolvedColumn[]` → `PrintColumn[]` — no logic, no filtering.
- **`buildRows`** constructs `cells` in order: (A) base fields from item (`description`, `quantity`, `unit`, `condition`), (B) custom columns from `item.custom_data`, (C) computed `qtyLabel`.
- **`buildWaybillRenderModel`** freezes input (no mutation), then resolves sections in strict order: branding → header → parties → logistics → notes → signatures → table → footer → pagination.
- **`normalizeBlank`** is the exclusive blank handler — no `|| ''` shortcuts.
- **`richTextToPlainText(normalizeBlank(rawNotes))`** pattern reused from notes resolver.

## Verification

- `bun run typecheck` — **passed** (zero errors)
- `bun run lint` on engine files — **passed** (zero warnings)
