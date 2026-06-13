# Waybill Table / Table Settings Copy Report (prompt 43)

## Summary
The Waybill form now reuses the shared form primitives from the invoice stack — particularly `FormLineItems` as the embedded table and `ColumnManager` as the settings surface.

## Technique
Rather than forcing `WaybillForm` to carry every prop that `NewInvoice` supplies, the shared `FormLineItems` trailer call was exchanged for a direct `<WaybillItemsEditor />` bridge rendered inside `WaybillForm`. That bridge owns its own column state via `useInvoiceColumns()` and then renders the same `FormLineItems` component the invoice form already uses. The custom local table was removed in the process.

## Invoice components now used by the Waybill form

| Component | Import |
|---|---|
| `FormLineItems` | `@/components/document/FormLineItems` |
| `ColumnManager` | `@/components/ColumnManager` |

Same `ColumnConfig`/`ColumnVisibilityMode` rules apply on both sides.

## Waybill-specific behavior
- Default columns: S/N, Description, Qty, Unit.
- Extra built-in columns (Make, Part No, Condition) are present in the editor column list but start hidden.
- Custom column support kept; waybill-specific `condition` field/option is preserved below the table.
- The on-screen table itself renders as `FormLineItems + MobileItemCard` (not the open-grid mobile pattern used on invoices).
- Description is still locked: it cannot be moved or disabled.
- All other reordering only affects the PDF column sequence via the same `moveColumn` hook.

## Deliberately excluded
- Row override section in `ColumnManager` (invoice-only).
- Group rows / MobileGroupCard paths (not needed for waybills).

## Verification
- Critical path tests pass (`bun run test` — 7/7).
- Manual UI checks: open a waybill, use Table Settings, toggle columns, drag handles on/off, confirm Description is locked.
