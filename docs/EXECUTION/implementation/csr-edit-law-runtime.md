# CSR Edit Law (Law 1 — Identity Immutability)

> Implemented on 2026-07-09.

## Objective

Apply Law 1 (Edit Law — Identity Immutability) to CSR documents, matching the Invoice/Quotation pattern: runtime interception of identity field mutations in edit mode, IdentityLockDialog on first interaction, no temporary mutation, no dirty state, save-time validation as defense-in-depth.

Identity fields for CSR: `client_id`, `client_name`, `csr_number`.

## Files Changed

### `src/pages/EditCSR.tsx`
- Added `useCallback` to React import, `IdentityLockDialog` import
- Added `identityLockDialog` state: `{ open: boolean; field: 'client' | 'csr_number' | null }`
- Added `IDENTITY_FIELDS` constant: `['client_id', 'client_name', 'csr_number']`
- Added `guardedUpdate` wrapper: intercepts identity field mutations in edit mode, opens dialog instead; delegates non-identity fields to original `update`
- Added `handleLockedFieldClick`: opens dialog from locked UI clicks
- Added `handleDuplicateFromEditable`: navigates to `/csr/new` with current CSR state (identity fields zeroed) in `duplicateState` route state
- Changed `onUpdate={update}` → `onUpdate={guardedUpdate}`
- Added `onLockedFieldClick={handleLockedFieldClick}` to CsrFormScreen
- Renders `<IdentityLockDialog>` when dialog is open

### `src/components/csr/CsrFormScreen.tsx`
- Added `Lock` to lucide-react import
- Added `onLockedFieldClick?: (field: 'client' | 'csr_number') => void` to Props
- Client selector: in edit mode, renders a locked button with Lock icon instead of interactive ClientSelector; click calls `onLockedFieldClick?.('client')`
- CSR number field: in edit mode, renders a locked `<span>` with Lock icon instead of TextInput; click calls `onLockedFieldClick?.('csr_number')`
- Customer Name field: in edit mode, renders a locked `<div>` with Lock icon instead of TextInput; click calls `onLockedFieldClick?.('client')`

### `src/pages/NewCSR.tsx`
- Extracts `duplicateState` from `routeState`
- Initializes `csr`, `csrMeta`, `materialsRows` state from `duplicateState` if present, falling back to defaults

## Verification

- `bun run audit:load`: passes (no new issues)
- `bun run typecheck`: 18 pre-existing errors (waybill templates), no new errors
- `git status`: only the 3 target files modified

## Non-Regression

- Invoice, Quotation, Waybill, Receipt: not touched
- Duplicate/Revert/Conversion Law: not touched
- Audit Trail: not touched
- Prefix Engine, number generation: not touched
- Financials, tax, routing: not touched
- DB schema, PDF generation: not touched
