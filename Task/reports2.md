## Bug Fixes: Invoice Duplication & Mobile Performance

### Bug 1: Groups not rendering on duplicated invoice

**Root cause**: The `groups` state in `NewInvoice.tsx` was initialized as `[]` and never populated from `prefillItems` when duplicating an invoice. The `FormLineItems` component renders group containers via `groupEntries`, which iterates over the `groups` prop — since it was empty, `MobileGroupCard` was never rendered despite `group_header` items being present.

**Fix**: Added a `useEffect` that recovers `InvoiceGroup[]` from `prefillItems` by extracting unique `group_header` entries, merged with display metadata from `initialCustomFields.groupMeta` (which is stored in the invoice's `custom_fields` JSON).

### Bug 2: Keyboard flash causing 2-second delay on mobile

**Root cause**: `background-attachment: fixed` on `body` in `index.css` forces the browser to repaint the full background on every viewport size change. When the mobile keyboard opens, the viewport shrinks, triggering a full repaint that blocks the layout adjustment for ~2 seconds.

**Fix**: Removed `background-attachment: fixed` from `body`. The ambient gradient backgrounds continue to work via the `.app-ambient` pseudo-elements which use `position: absolute` + `will-change: transform, opacity` for GPU-accelerated rendering.

### Bug 3: Discount type/timing defaults not restored on duplication

**Root cause**: `discountType` and `discountTiming` in `NewInvoice.tsx` were initialized with hardcoded defaults (`'percent'` and `'before'`) instead of reading from the prefill's `custom_fields`. When duplicating an invoice where the user had selected `discountType: 'amount'` and `discountTiming: 'after'`, these values were saved in `custom_fields` but ignored on restore.

**Fix**: Added a `useEffect` that initializes `discountType`, `discountTiming`, and `whtType` from `initialCustomFields` (parsed from `prefill?.custom_fields`) after mount, matching the pattern used in `QuotationForm.tsx`.

### Files modified
- `src/pages/NewInvoice.tsx` — Added two `useEffect` hooks: one for restoring discount defaults, one for recovering groups from prefill.
- `src/index.css` — Removed `background-attachment: fixed` from `body`.
