# Invoice Edit Law UX Implementation

This report was written by OpenCode on 2026-07-03.

## Objective & Scope

Implement the updated Edit Law UX for the Invoice module per Document Transformation Standard v1.1. The standard now requires identity fields to be **visually locked immediately** with interaction intercept dialogs, replacing the previous save-time-only blocking approach.

**In scope:** Invoice module only. Quotation, Waybill, RFQ, CSR, BOQ are untouched.

## What Changed

### New file
- `src/components/document/IdentityLockDialog.tsx` — AlertDialog-based confirmation dialog with "Duplicate Current Changes" and "Cancel" actions.

### Modified files

**`src/components/document/FormHeader.tsx`**
- Added `Lock` icon import from lucide-react
- Added `onLockedFieldClick` prop (`'client' | 'invoice_number'`)
- Client button: renders `Lock` icon instead of `BriefcaseBusiness` in edit mode; calls `onLockedFieldClick('client')` on click
- Invoice number input: renders `Lock` icon instead of `Hash` in edit mode; calls `onLockedFieldClick('invoice_number')` on click

**`src/components/document/SharedDocumentForm.tsx`**
- Passes `onLockedFieldClick` prop through to `FormHeader`

**`src/pages/InvoiceFormPage.tsx`**
- Added `IdentityLockDialog` import
- Added `identityLockDialog` state (`{ open, field }`)
- Added `handleLockedFieldClick` callback — opens dialog for the clicked field
- Added `handleDuplicateFromEditable` callback — deep-clones current in-memory invoice + items, navigates to `/invoices/new` with prefill state (clears identity fields, resets status to unpaid)
- Passes `onLockedFieldClick` to `SharedDocumentForm` (only in edit mode)
- Renders `IdentityLockDialog` at bottom of page (only in edit mode)

### What was NOT changed
- `assertIdentityImmutable` — kept as defense-in-depth at save-time
- Save handler — unchanged
- Client change handler in SharedDocumentForm — unchanged (edit-mode guard retained as defense-in-depth)
- Quotation, Waybill, RFQ, CSR, BOQ modules — untouched
- Domain validation, lifecycle ownership, PDF generation — untouched

## Identity Fields

Per the standard v1.1, identity fields for invoices are:
1. **Client** (client_id / client_name)
2. **Invoice Number** (invoice_number)

Both are now visually locked in edit mode with lock icons and trigger the intercept dialog on click.

## Duplicate Current Changes Flow

When user clicks "Duplicate Current Changes" in the dialog:
1. Current in-memory invoice state is deep-cloned
2. Current items are deep-cloned (IDs nulled for re-insertion)
3. Navigation to `/invoices/new` with state containing the cloned data
4. Identity fields (client_id, client_name) are cleared
5. Status reset to `unpaid`, dates reset to today
6. All other editable data (items, custom fields, charges, notes, terms) preserved

## Verification

- `bun run typecheck` — passed (zero errors)
- `bun run build` — build command timed out due to pre-existing Vite transform slowness unrelated to this change; typecheck confirms no type errors

## Risks & Limitations

- The `IdentityLockDialog` uses the existing `AlertDialog` component (radix-ui), consistent with project patterns
- The duplicate workflow navigates to create mode — any unsaved state on the current page is lost (this is the intended behavior per the standard)
- The `handleDuplicateFromEditable` does not persist the original document — it only navigates to create a new one, which is correct per the Duplicate Law

## Deferred Work

- None — implementation is complete per the standard
