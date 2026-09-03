# Invoice Form & ViewInvoice — PDF Output Settings Removal

This ticket was written by Claude on 2026-08-18.

---

## Form Issues (InvoiceFormPage.tsx)

### FORM-1: Remove Document Options Switches from PDF Output Settings

- **File:** Live invoice form — component TBD, agent to locate via `InvoiceFormPage.tsx`
  render tree (likely a `FormPdfOutputSettings`-style component; also touches
  `useInvoiceActions.ts` `handleSaveCustomization`, which currently depends on `pdfOutput`,
  `pdfTemplateId`, `setPdfOutput`)
- **Severity:** Low (UI removal, no data-loss risk if scoped correctly — see FORM-3)
- **Description:** The PDF Output Settings section currently exposes 7 switch toggles under
  Document Options: `showFooter`, `showTagline`, `showBalanceDue`, `showAmountInWords`,
  `showVatPercentage`, `showWhtPercentage`, `showDiscountPercentage`. Remove all 7 from the
  form UI. Leave the Bank Details subsection (`showBankDetails` switch, selected-account
  display, "Switch Account" picker) untouched.
- **Evidence:** Field names and defaults per `InvoicePdfOutput` type — confirmed via
  wireframe field annex (`docs/TEMPLATES/Wireframe/Forms/invoice-form-v1.html`),
  cross-check against live type definition before removal.

### FORM-2: Underlying InvoicePdfOutput Fields Still Read by PDF Renderer — Needs a Decision

- **File:** Wherever `InvoicePdfOutput` is consumed at render time (PDF generation
  pipeline — likely near `getInvoicePdfDocument()` or equivalent, same family as
  `getCsrPdfDocument()` referenced in the ViewCSR issues doc)
- **Severity:** Medium — silent behavior change risk if not resolved before FORM-1 ships
- **Description:** Removing the 7 switches from the form doesn't remove the 7 fields from
  the `InvoicePdfOutput` type or from what the PDF renderer reads. Without form controls,
  these fields either need hardcoded defaults baked into the renderer, or need to move to a
  company/workspace-level setting instead of disappearing outright.
  `showVatPercentage`, `showWhtPercentage`, `showDiscountPercentage` are now resolved —
  see VIEW-1: hardcode `true`, not optional. Still open: `showFooter`, `showTagline`,
  `showBalanceDue`, `showAmountInWords`.
- **Decision needed before FORM-1 ships (remaining 4 fields):**
  (a) Hardcode fixed defaults in the renderer — proposed: `showBalanceDue=true`,
      `showAmountInWords=true`, `showFooter=false`, `showTagline=false` (matches current
      form defaults; note ViewInvoice's own default for `showBalanceDue` is currently
      `false`, which disagrees with the form — resolve this discrepancy as part of the
      same decision, not separately), or
  (b) Promote to a workspace-level Settings page control instead of removing entirely.
- **Evidence:** `useInvoiceActions.ts` `handleSaveCustomization` — depends on `pdfOutput`,
  `setPdfOutput`; confirms these fields flow through save/customize logic, not just
  display. ViewInvoice wireframe Field Annex, "PDF Output Settings (pdfOutput)" table,
  `showBalanceDue` row note: "default differs from form."

### FORM-3: Existing Documents May Have Non-Default Values Saved

- **File:** N/A — data concern, not code location
- **Severity:** Low
- **Description:** Any invoice created before this change that had a Document Options
  switch explicitly toggled (e.g. Tagline turned on) has that value persisted. Once the UI
  is gone, there's no way for the user to see or change it again. Whichever resolution is
  chosen for FORM-2, verify it doesn't silently flip already-saved documents' PDF output to
  a different state than what the user last configured.
- **Evidence:** N/A — verify by generating a PDF from a pre-existing document with a
  non-default value after the change ships.

---

## View Issues (ViewInvoice.tsx)

### VIEW-1: Remove VAT/WHT/Discount Percentage-in-Brackets Toggles — Make Mandatory

- **File:** `DocumentOptionsCard` component, rendered from `src/pages/ViewInvoice.tsx`
  render tree (same `pdfOutput`/`handleSaveCustomization` flow as the create/edit form)
- **Severity:** Low (UI simplification)
- **Description:** `DocumentOptionsCard` currently exposes `showVatPercentage`,
  `showWhtPercentage`, and `showDiscountPercentage` as user-facing switches ("Show VAT % in
  Brackets", "Show WHT % in Brackets", "Show Discount % in Brackets"). These should not be
  optional — showing the percentage alongside VAT/WHT/discount line items is correct
  behavior in all cases, not a preference. Remove all three switches from the UI (in both
  ViewInvoice's `DocumentOptionsCard` and the create/edit form, per FORM-1) and hardcode the
  behavior to always show the percentage.
- **Evidence:** ViewInvoice wireframe, "DOCUMENT OPTIONS CARD" section — three `toggle-row`
  entries for VAT/WHT/Discount % in brackets, each currently `on` by default per the Field
  Annex PDF Output Settings table (`showVatPercentage: true`, `showWhtPercentage: true`,
  `showDiscountPercentage: true`).

### VIEW-2: Confirm Consistency Between Form and View — Single Source, Not Two Toggles

- **File:** `useInvoiceActions.ts` (`handleSaveCustomization`) and wherever the equivalent
  form-side save path lives
- **Severity:** Low
- **Description:** Since `showVatPercentage`/`showWhtPercentage`/`showDiscountPercentage`
  become hardcoded rather than editable, confirm there isn't a second code path (e.g. a
  form-side default vs. a ViewInvoice-side default) that could disagree once the switches
  are gone. One hardcoded value, read from one place, not two constants that could drift.
- **Evidence:** N/A — verify by tracing where `pdfOutput.showVatPercentage` (etc.) is
  initialized on the create/edit form vs. where `DocumentOptionsCard` reads/writes it on
  ViewInvoice; confirm both resolve to the same hardcoded `true` after VIEW-1 + FORM-1 ship.

---

## Cross-Cutting Issues

### X-1: Two Pages, One PDF Output Model — Changes Must Land Together

- **Severity:** Medium
- **Description:** `InvoicePdfOutput` is shared state read and written from two separate
  UIs — the create/edit form (FORM-1) and ViewInvoice's `DocumentOptionsCard` (VIEW-1). If
  FORM-1 and VIEW-1 ship independently (e.g. one PR merges before the other), there will be
  a window where one page still offers the switches and the other doesn't, for the same
  underlying fields. Ship FORM-1 and VIEW-1 together, or in immediate succession, not as
  independently scheduled work.
- **Evidence:** Both `FormPdfOutputSettings`-equivalent (form) and `DocumentOptionsCard`
  (view) write through the same `handleSaveCustomization` / `pdfOutput` state shape.

### X-2: One Combined Default Decision, Not Two

- **Severity:** Medium
- **Description:** FORM-2's open question (what happens to `showFooter`, `showTagline`,
  `showBalanceDue`, `showAmountInWords` once switches are removed) applies identically to
  both pages, since both read the same `InvoicePdfOutput` shape. Resolve it once, apply the
  same resolution in both FORM-1 and VIEW-1's implementation — don't let the form and view
  end up with independently-chosen defaults for the same field.
- **Evidence:** FORM-2, VIEW-2.