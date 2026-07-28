# ViewInvoice & ViewCSR — Documented Issues

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

---

## ViewInvoice Issues

### INV-1: Advance Invoice Quarantine Guard Has No Test Coverage
- **File:** `src/pages/ViewInvoice.tsx` (lines 91–105)
- **Severity:** Low
- **Description:** The quarantine guard redirects advance child invoices to their parent invoice. Uses `isAdvanceInvoiceChild()` from `@/domain/invoice/advanceMetadata.ts`. If `parentId` is missing from the advance config, it navigates to `/invoices` with an error state. No test coverage visible for this redirect logic.
- **Evidence:** Code inspection of `ViewInvoice.tsx` lines 91–105.

### INV-2: `isRedirecting` State Is a Manual Flag
- **File:** `src/pages/ViewInvoice.tsx` (line 22)
- **Severity:** Low
- **Description:** `isRedirecting` state (`useState(false)`) prevents re-triggering the redirect effect. It is set to `true` manually before each `navigate()` call but never reset. If the component re-renders after navigation but before unmount, the flag works — but if navigation fails silently, the invoice will never render.
- **Evidence:** Code inspection: `setIsRedirecting(true); navigate(...)` — no error recovery path.

### INV-3: `useInvoiceDetailData` Mutates Invoice Status from Computed View
- **File:** `src/hooks/useInvoiceDetailData.js` — inside `fetchInvoiceFinancials()`
- **Severity:** Medium
- **Description:** `fetchInvoiceFinancials()` performs `setInvoice(current => ({ ...current, status: data.computed_status }))`. This overwrites the raw DB `status` with the computed status from the `invoice_financials_v` view. If the computed status diverges from the DB status for any reason (e.g., a payment is voided but the view hasn't updated), the page could display inconsistent status.
- **Evidence:** `useInvoiceDetailData.js` `fetchInvoiceFinancials` function.

### INV-4: `handleSaveCustomization` Uses `useCallback` with Many Dependencies
- **File:** `src/components/document-view/invoice/useInvoiceActions.ts`
- **Severity:** Low
- **Description:** `handleSaveCustomization` depends on `customFields`, `invoice?.id`, `pdfOutput`, `pdfTemplateId`, `refresh`, `setPdfOutput`. Any change to these creates a new function reference. This could cause unexpected re-renders in consuming components.
- **Evidence:** `useInvoiceActions.ts` — `handleSaveCustomization` useCallback declaration.

### INV-5: InvoiceWorkspace Has 36 Props (19 Data + 17 Action Callbacks)
- **File:** `src/components/document-view/invoice/InvoiceWorkspace.tsx`
- **Severity:** Low (maintainability)
- **Description:** The workspace component has 36 props. This is a high prop count that makes the component hard to reason about and refactor. Many of these are pass-through from ViewInvoice.
- **Evidence:** `InvoiceWorkspaceProps` interface in `InvoiceWorkspace.tsx`.

### INV-6: `InvoiceActionRow` Hides "Record Payment" When Status Is "paid"
- **File:** `src/components/document-view/invoice/InvoiceActionRow.tsx`
- **Severity:** Low
- **Description:** The Record Payment button is hidden when `isPaid` is true (invoice.status === 'paid'). This is passed from `InvoiceWorkspace` which checks `invoice?.status === "paid"`. However, status "partially_paid" shows the button, which is correct, but there is no check for status "overpaid" or other edge cases.
- **Evidence:** `InvoiceActionRow.tsx` line: `{!isPaid && (<button .../>)}`

### INV-7: Payment Sheet Uses WHT Deducted as Hardcoded `₦0.00`
- **File:** `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- **Severity:** Medium
- **Description:** The settlement preview panel shows `WHT Deducted: ₦0.00` as a hardcoded value. WHT is noted in a separate banner ("Verify tax credit receipt in Compliance Hub") rather than being calculated in the payment entry flow.
- **Evidence:** `InvoiceRecordPaymentSheet.tsx`: `<span className="font-mono font-bold text-bd-text-muted">₦0.00</span>` — this is static text.

### INV-8: Payment Attachment Upload UI Handles `uploadResults` After Recorded
- **File:** `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- **Severity:** Low
- **Description:** The payment sheet sets `paymentRecorded = true` immediately after `recordInvoicePayment()` succeeds, but then separately handles `uploadResults` from the service call. If `uploadResults` is non-null, saving is set to `false` but the sheet doesn't auto-close — it waits for the user to manually close. If `uploadResults` is null, it calls `onSaved()` and `onClose()` immediately.
- **Evidence:** `InvoiceRecordPaymentSheet.tsx` `handleSave` function.

---

## ViewCSR Issues

### CSR-V-1: `onDuplicate` and `onCopyNumber` Are Dead Props on CsrViewPage
- **File:** `src/components/document-view/csr/CsrViewPage.tsx` (lines 29–30)
- **Severity:** Low (dead code)
- **Description:** The component accepts `onDuplicate` and `onCopyNumber` as props but never uses them in the component body. They are handled through `CsrMoreSheet` via the parent `ViewCSR` component. These props are passed but ignored.
- **Evidence:** `CsrViewPage.tsx` — destructured props never referenced in JSX or logic.

### CSR-V-2: No Dedicated Data Hook
- **File:** `src/pages/ViewCSR.tsx`
- **Severity:** Medium
- **Description:** Unlike ViewInvoice which uses `useInvoiceDetailData` with offline cache fallback and a `refresh()` function, ViewCSR fetches data directly inside a `useEffect` with no dedicated hook. There is no offline fallback, no `refresh()` exposed to child components, and no cache mechanism.
- **Evidence:** `ViewCSR.tsx` `loadCsr` function inside `useEffect`.

### CSR-V-3: `comments` State Has No UI
- **File:** `src/pages/ViewCSR.tsx` (line 92)
- **Severity:** Low (dead state / future feature)
- **Description:** `comments` state is initialized as `''` and passed to `getCsrPdfDocument()` in the PDF generation pipeline, but there is no UI element (input, textarea, or field) for the user to edit or set comments. The state is effectively dead or intended for a future feature.
- **Evidence:** `ViewCSR.tsx`: `const [comments, setComments] = useState('')` — no UI binding found.

### CSR-V-4: CSR Customize Sheet Has Dual Event Handlers on Ink Color Switch
- **File:** `src/pages/ViewCSR.tsx` (CSR Customize Sheet section)
- **Severity:** Low (potential double-fire)
- **Description:** The Ink Color toggle switch uses both `onCheckedChange` (on the Switch component) AND `onClick` on the parent div with `e.stopPropagation()`. This dual handling could cause the toggle to fire twice in some environments.
- **Evidence:** `ViewCSR.tsx` Customize Sheet JSX: `<div onClick={...}><Switch onCheckedChange={...} onClick={(e) => e.stopPropagation()} /></div>`

### CSR-V-5: Template Defaults Only Defined for IDs '2', '3', '4'
- **File:** `src/pages/ViewCSR.tsx`
- **Severity:** Low
- **Description:** `CSR_TEMPLATE_DEFAULTS` only has entries for template IDs '2', '3', and '4'. If template '1' is selected (or any other value), the font/color sync effects fall back to `CSR_TEMPLATE_DEFAULTS['3']`. This may be intentional if template '1' uses the default system styling, but it's not documented.
- **Evidence:** `CSR_TEMPLATE_DEFAULTS` definition and `CSR_TEMPLATE_DEFAULTS[template] || CSR_TEMPLATE_DEFAULTS['3']` fallback pattern.

### CSR-V-6: No Auto-Refresh Mechanism
- **File:** `src/pages/ViewCSR.tsx`
- **Severity:** Medium
- **Description:** Unlike ViewInvoice which passes a `refresh()` function from `useInvoiceDetailData` to its overlays, ViewCSR has no exposed refresh mechanism. After actions like status updates or project linking, child components cannot trigger data refresh. The page relies on local state updates (e.g., `setCsr(curr => ({ ...curr, status }))`).
- **Evidence:** `ViewCSR.tsx`: `handleUpdateStatus` updates local state only; no `refresh()` function created or passed.

### CSR-V-7: `handleCopyNumber` Does Not Close More Sheet
- **File:** `src/pages/ViewCSR.tsx`
- **Severity:** Low
- **Description:** The `handleCopyNumber` handler does not call `ui.closeSheet()`. However, `CsrMoreSheet`'s `Action` component wraps every `onClick` with `onClose()`, so the sheet closes regardless. This is redundant behavior — the handler works fine but the sheet close is dependent on the child component rather than the handler itself.
- **Evidence:** `CsrMoreSheet.tsx` `Action` onClick: `() => { onClick(); onClose(); }`.

### CSR-V-8: ViewCSR Does Not Handle `system_down` Type Mismatch
- **File:** `src/pages/ViewCSR.tsx`
- **Severity:** Low
- **Description:** The CSR form saves `system_down` as a text field (from a Yes/No select mapped to 'Yes'/'No' strings). The DB column is `text`, so there's no constraint violation. However, `viewCSRActions.ts` `duplicateCSRRecord` has a `toBoolean()` helper that converts it — suggesting awareness that this field should perhaps be boolean. ViewCSR displays it as text with no special handling.
- **Evidence:** `viewCSRActions.ts` `toBoolean()` helper + DB schema `system_down text`.

---

## Cross-Cutting Issues

### X-1: Inconsistent Architecture Pattern Between ViewInvoice and ViewCSR
- **Severity:** Medium
- **Description:** ViewInvoice uses a dedicated data hook (`useInvoiceDetailData`) + actions hook (`useInvoiceActions`) + separate service files. ViewCSR handles everything inline with no hooks, no refresh mechanism, and no offline fallback. These two pages serve different business functions but share the same `DocumentPage` layout, yet their architecture is significantly different.
- **Evidence:** Compare `src/pages/ViewInvoice.tsx` vs `src/pages/ViewCSR.tsx`.

### X-2: Both Pages Lack Error Boundaries
- **Severity:** Medium
- **Description:** Neither ViewInvoice nor ViewCSR wraps content in an error boundary. If the data hook throws or the render crashes, the page may show a blank screen or the parent layout's error state.
- **Evidence:** Both page files — no `<ErrorBoundary>` usage found.

### X-3: Activity Card Has No Real-Time Updates
- **Severity:** Low
- **Description:** Both ActivityCard components (Invoice and CSR) only load audit data when the section is opened (lazy loading via `enabled: isOpen`). They do not poll or subscribe to changes. If another user updates the document, the activity history will not reflect it until the page is refreshed.
- **Evidence:** Both `ActivityCard.tsx` files — uses `useAuditTrail` with `enabled: isOpen`, no polling/subscription.
