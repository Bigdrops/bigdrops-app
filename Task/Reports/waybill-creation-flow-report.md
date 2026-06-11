# Waybill Creation Flow - Implementation Report

## Summary
Restructured `WaybillForm.tsx` from overlay dialog to page-level component with `onSave`/`onClose` callbacks. Updated `NewWaybill.tsx` and `EditWaybill.tsx` to use the new API.

## Changes Made

### `src/components/waybill/WaybillForm.tsx`
- New props: `type: WaybillType`, `onSave: (data: WaybillFormData) => Promise<void>`, `onClose: () => void`, `initialData?: Partial<WaybillFormData>`
- Sections: Document Details, Routing, Transport Details, Item List, Remarks & Signature, Terms
- Transport interlocking (air mode → disable land-only fields)
- External/internal field switching (invoice/PO visibility)
- Item rows with Part No. + Condition chip
- Blank template download, custom column management, add/remove/duplicate items
- Exit guard via `onClose`
- No router/navigation imports — fully delegated to consumers
- Exported `WaybillFormData` type

### `src/pages/NewWaybill.tsx`
- Shows `WaybillGatewayOverlay` on mount (no type selected)
- After selection, shows `WaybillForm` with selected type
- `onSave` → `saveWaybill({ mode: 'new', ... })`
- `onClose` → navigate to `/waybills`

### `src/pages/EditWaybill.tsx`
- Fetches waybill by `id` route param via `supabase`
- Maps via `mapDbWaybill`, `parseWaybillCustomFields`, `collectWaybillCustomColumns`
- Passes `initialData` to `WaybillForm`
- `onSave` → `saveWaybill({ mode: 'edit', waybillId: id, ... })`
- `onClose` → navigate to `/waybills`

## Verification
- `bun run typecheck` — **PASS**
- `bun run lint` — no new errors (pre-existing only)
- `bun run audit:load` — **PASS** (no regressions)
