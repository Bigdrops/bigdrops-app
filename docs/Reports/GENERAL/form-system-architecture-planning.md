# Form System Architecture — Planning Report

This report was written by opencode on 2026-09-02 via Local Runner.

**Objective:** Decide what to share, what to keep separate, and how Invoice/CSR/Waybill/RFQ/BOQ forms should be structured before any production migration begins.

**Status:** Planning only — no code changes.

---

## 1. Architecture Audit

### 1.1 Current Component Map

| Page Component | Form Component | Lines | Props | Domain Model |
|---|---|---|---|---|
| `InvoiceFormPage.tsx` | `SharedDocumentForm` | 549 → 368 | ~60 | `InvoiceItem[]`, `InvoiceCustomFields` |
| `QuotationFormPage.tsx` | `SharedDocumentForm` | 774 → 368 | ~60 | `QuotationEditorState`, normalized to `invoiceLikeQuotation` |
| `CsrFormPage.tsx` | `CsrFormScreen` | 535 → 891 | 11 | `CsrRecord`, `CsrMeta`, `MaterialRow[]` |
| `WaybillFormPage.tsx` | `WaybillForm` | 192 → 752 | 6 | `Waybill`, `WaybillItem[]`, `WaybillCustomFields` |

### 1.2 SharedDocumentForm — The Existing Consolidation

`SharedDocumentForm` (368 lines) is already a consolidated form used by both Invoice and Quotation. Key observations:

- **60+ props** — the heaviest prop interface in the codebase
- **Sections:** `FormHeader`, `FormLineItems`, `FormCommercialTerms`, `FormTotals`, `FormNotesTerms`, `FormFooter`, `ClientSelector`, `ColumnManager` (lazy), `JsonItemsImportSheet` (lazy)
- **State management is external** — the parent page owns all state; SharedDocumentForm is pure render
- **Quotation normalizes** its data to an `invoiceLikeQuotation` object before passing to SharedDocumentForm
- **No domain awareness** — SharedDocumentForm does not know if it renders an Invoice or a Quotation; it reads `document_type` only to toggle UI labels

### 1.3 CSR and Waybill — Fully Independent

CSR (`CsrFormScreen`, 891 lines) and Waybill (`WaybillForm`, 752 lines) each implement their own:

- Form layout and sections
- Field types and domain-specific inputs
- Save logic and domain validation
- Import adapters

**They do not share `SharedDocumentForm`.** This is correct and intentional — their domain models are structurally incompatible with the Invoice/Quotation line-item grid pattern.

### 1.4 Save Layer

| Document | Save Hook | Strategy Interface |
|---|---|---|
| Invoice | `useInvoiceSave` → `useDocumentSave` | `DocumentSaveStrategy<TInput>` |
| Quotation | `useQuotationSave` → `useDocumentSave` | `DocumentSaveStrategy<TInput>` |
| CSR | Inline in `CsrFormPage` | Direct `createCsr`/`updateCsr` calls |
| Waybill | Inline in `WaybillFormPage` | Direct `saveWaybill` calls |

Invoice and Quotation share the `useDocumentSave` strategy pattern. CSR and Waybill do not.

### 1.5 Existing Standards

**`document-form-consolidation-standard.md`** mandates:
- Single `*FormPage.tsx` per document with `mode` prop
- `NewX` and `EditX` are ~3-line delegators
- All form UI in `SharedDocumentForm`

**`document-transformation-standard.md`** (the 3 Laws) covers:
- Identity immutability after save (Law 1)
- Duplication as recovery path (Law 2)
- Revert for Invoice only (Law 3)
- Applies to: Invoice, Quotation, Waybill, CSR, BOQ, RFQ

**`document-save-orchestration.md`** defines:
- `useDocumentSave` hook with `DocumentSaveStrategy<TInput>`
- validate → buildPayload → persist → afterSave → getNavigationTarget

### 1.6 Prototypes (Reference Material)

- `invoice-form-popup-slate-navy.html` — Mobile-first popup/sheet Invoice form
- `invoice-form-inline-slate-navy.html` — Desktop inline Invoice form
- `invoice-form-popup.html`, `invoice-form-inline.html` — Earlier variants
- `form-overlays-android.html` — Android overlay patterns

These are **design references**, not immutable specs.

---

## 2. Target Architecture

### 2.1 What to Share

| Share | Components | Reason |
|---|---|---|
| `SharedDocumentForm` | Invoice + Quotation | Already shared. Structurally identical domain models (line items, groups, totals, charges, signatories). |
| `useDocumentSave` | Invoice + Quotation | Already shared via strategy pattern. Both persist to same table structure. |
| `FormHeader`, `FormLineItems`, `FormCommercialTerms`, `FormTotals`, `FormNotesTerms`, `FormFooter` | Invoice + Quotation | Sub-components of SharedDocumentForm. Already shared. |
| `IdentityLockDialog` | Invoice + Quotation | Already shared. Both implement Law 1 identity immutability. |
| `PdfOutputSettings` | Invoice + Quotation | Already shared. Both have PDF output configuration. |

### 2.2 What Stays Separate

| Keep Separate | Components | Reason |
|---|---|---|
| `CsrFormScreen` | CSR | Structurally incompatible domain model: materials, operational readings, call types, service basis, yes/no toggles. No line-item grid. No totals calculation. |
| `WaybillForm` | Waybill | Structurally incompatible domain model: purpose (internal/external), transport mode, driver details, reference documents. No pricing. No line-item grid. |
| `useInvoiceSave` | Invoice | Invoice-specific save logic (lineage, payment state, revert eligibility) |
| `useQuotationSave` | Quotation | Quotation-specific save logic (validity period, conversion tracking) |

### 2.3 The Decision Boundary

**Share if:** The domain model maps to the same form sections (client, line items with pricing, groups, totals, charges, notes/terms, signatories).

**Keep separate if:** The domain model requires different sections, different field types, or different input patterns that cannot be expressed as prop variations on SharedDocumentForm.

| Document | Shares `SharedDocumentForm`? | Domain Model Fit |
|---|---|---|
| Invoice | ✅ Yes | Client + line items + pricing + groups + totals + charges + signatories |
| Quotation | ✅ Yes | Client + line items + pricing + groups + totals + charges + signatories |
| Waybill | ❌ No | Client + items (no pricing) + transport + purpose. Structurally different. |
| CSR | ❌ No | Client + materials (no pricing) + operational readings + call metadata. Structurally different. |
| RFQ | ⚠️ TBD | Client + line items (no pricing, request-only). Close to Quotation but no totals. |
| BOQ | ⚠️ TBD | Client + line items + pricing + groups. Closest to Invoice. |

---

## 3. Invoice Form Concept

### 3.1 Two Experiences

The Invoice needs two presentation modes, not two components:

| Experience | Trigger | Layout |
|---|---|---|
| **Popup/Sheet** | Mobile (`isMobile === true`) or explicit route | Full-screen sheet overlay. Header collapsed. Line items scroll. Actions at bottom. |
| **Inline** | Desktop (`isMobile === false`) | Standard page layout. Header visible. Line items in grid. Actions in header bar. |

Both experiences use the **same `SharedDocumentForm`** component. The difference is CSS layout, not component structure.

### 3.2 Implementation Approach

- `SharedDocumentForm` already receives `isMobile` as a prop
- The mobile-first approach is already implemented via `pageCardCls` and mobile primitives
- The popup/sheet experience is an Android overlay pattern — `Sheet` component from `@/components/ui/sheet`
- The inline experience is the current default page layout

**Decision:** Use conditional rendering inside `SharedDocumentForm` based on `isMobile`, not two separate component trees. The prototypes confirm this is feasible — the popup and inline variants share the same field set.

### 3.3 What NOT to Change

- `useInvoiceSave` — already correct
- `useInvoiceHydration` — already correct
- `useInvoiceEditableState` — already correct
- `useInvoiceReferenceData` — already correct
- `useInvoiceColumns` — already correct
- Invoice domain model — already correct
- `DocumentSaveStrategy` pattern — already correct

---

## 4. CSR Form Concept

### 4.1 Structural Assessment

CSR (`CsrFormScreen`, 891 lines) is a fully custom form with:

- **Sections:** Client, Job Details (call type, status, service basis, model, serial), Operational Readings, Materials (item/qty/unit grid), Acknowledgement, Signatures
- **Domain model:** `CsrRecord` (flat), `CsrMeta` (UI state), `MaterialRow[]` (grid)
- **Field types:** Selects, text inputs, numeric inputs, yes/no toggles, date pickers
- **No line-item pricing grid** — materials are quantity-only
- **No totals calculation** — no VAT, discount, subtotal
- **No groups** — flat section layout

### 4.2 Recommendation

**Keep CSR as its own form.** Do not attempt to force it into `SharedDocumentForm`.

Rationale:
- The domain model has zero overlap with the line-item + pricing grid pattern
- The form sections are structurally different (operational readings vs. commercial terms)
- The field types are different (yes/no toggles, model/serial inputs vs. unit price, discount, VAT)
- Forcing CSR into SharedDocumentForm would require adding 20+ conditional props and degrading the component's clarity

### 4.3 What to Improve

- Adopt `useDocumentSave` strategy pattern for CSR save logic (currently inline in CsrFormPage)
- Standardize CSR form layout to match mobile-first patterns from `07-forms.md`
- Add `IdentityLockDialog` for CSR (already present in CsrFormPage)
- Standardize CSR offline draft pattern to match Quotation offline pattern

---

## 5. Waybill Recommendation

### 5.1 Structural Assessment

Waybill (`WaybillForm`, 752 lines) is a fully custom form with:

- **Type selection:** External (delivery, return, transfer) or Internal (relocation, dispatch, assignment)
- **Sections:** Type Picker, Client, Items (no pricing), Transport (vehicle, driver, mode), Purpose, Reference Documents, Signatures
- **Domain model:** `Waybill`, `WaybillItem[]`, `WaybillCustomFields`, `WaybillCustomColumn[]`
- **No pricing** — items have description, qty, unit only
- **No totals** — no financial calculation
- **Transport-specific** — vehicle number, driver name, driver phone, transport mode

### 5.2 Recommendation

**Keep Waybill as its own form.** Do not attempt to force it into `SharedDocumentForm`.

Rationale:
- No pricing grid — structurally incompatible
- Transport-specific fields have no equivalent in Invoice/Quotation
- Purpose selection (internal vs. external) is a top-level branching behavior
- Reference document attachment is unique to Waybill

### 5.3 What to Improve

- Adopt `useDocumentSave` strategy pattern for Waybill save logic (currently inline)
- Standardize Waybill form layout to match mobile-first patterns
- Add `IdentityLockDialog` for Waybill (already present in WaybillFormPage)
- Standardize Waybill offline draft pattern

---

## 6. RFQ/BOQ Integration

### 6.1 RFQ (Request for Quotation)

**Domain model:** Client + line items (no pricing, request-only) + notes/terms + validity.

**Decision:** RFQ should use `SharedDocumentForm`. It maps to the same line-item grid pattern as Invoice/Quotation, but without:
- Pricing columns (unit_price, discount, VAT, total)
- Totals calculation (subtotal, grand total)
- Commercial terms section (charges, discount settings)

RFQ is a subset of Quotation. The implementation should:
- Reuse `SharedDocumentForm` with a `documentType="rfq"` flag
- Hide pricing-related sections when `documentType="rfq"`
- Use `FormLineItems` with description + qty + unit only
- Skip `FormCommercialTerms` and `FormTotals`

### 6.2 BOQ (Bill of Quantities)

**Domain model:** Client + line items + pricing + groups + totals.

**Decision:** BOQ should use `SharedDocumentForm`. It maps directly to the Invoice/Quotation pattern:
- Client selection
- Line items with pricing (unit_price, qty, discount, VAT)
- Groups with subtotals
- Totals calculation
- Notes and terms

BOQ is structurally identical to Quotation. The implementation should:
- Reuse `SharedDocumentForm` with `documentType="boq"`
- Use the full line-item grid including pricing
- Use `FormCommercialTerms` and `FormTotals`
- BOQ-specific labels only (title says "Bill of Quantities" not "Quotation")

### 6.3 Integration Contract

| RFQ | BOQ |
|---|---|
| SharedDocumentForm | SharedDocumentForm |
| `documentType="rfq"` | `documentType="boq"` |
| `showPricing=false` | `showPricing=true` |
| `showTotals=false` | `showTotals=true` |
| `showCommercialTerms=false` | `showCommercialTerms=true` |
| `showGroups=true` | `showGroups=true` |
| `showSignatories=false` | `showSignatories=true` |
| Convertible to Quotation | Convertible to Invoice |

---

## 7. PRD/Standards Audit

### 7.1 `document-form-consolidation-standard.md` — Gaps

| Gap | Impact | Recommendation |
|---|---|---|
| Standard says "single SharedDocumentForm for all" | CSR and Waybill violate this | Update standard to allow structurally incompatible documents to use independent forms |
| No mention of two Invoice experiences (popup/inline) | Missing from standard | Add section for mobile-first presentation modes |
| No RFQ/BOQ guidance | Missing from standard | Add section for future document types and their form strategy |
| `NewX`/`EditX` delegators are 3-line wrappers | Correct, no change needed | Already implemented correctly |

### 7.2 `document-transformation-standard.md` — Gaps

| Gap | Impact | Recommendation |
|---|---|---|
| Revert Law only applies to Invoice | Correct per business rules | No change needed |
| No mention of RFQ → Quotation conversion | Missing lifecycle event | Add CONVERT_RFQ event type |
| No mention of BOQ → Invoice conversion | Missing lifecycle event | Add CONVERT_BOQ event type |
| Audit trail covers all types | Correct | No change needed |

### 7.3 `document-save-orchestration.md` — Gaps

| Gap | Impact | Recommendation |
|---|---|---|
| CSR and Waybill don't use `useDocumentSave` | Inconsistent save pattern | Migrate CSR and Waybill to use `useDocumentSave` strategy pattern |
| No RFQ/BOQ save strategies | Missing | Define `RfqSaveStrategy` and `BoqSaveStrategy` |

### 7.4 `07-forms.md` (PRD) — Gaps

| Gap | Impact | Recommendation |
|---|---|---|
| No guidance on popup vs. inline presentation | Missing | Add section on mobile-first presentation modes |
| No RFQ/BOQ form specs | Missing | Add form spec sections for each |
| CSR form spec may not match current implementation | Potential drift | Verify CsrFormScreen against 07-forms.md |

---

## 8. Migration Sequence

### Phase 1: Documentation Only (No Code)

1. Update `document-form-consolution-standard.md` to allow CSR/Waybill independent forms
2. Add RFQ/BOQ form strategy sections to the standard
3. Add mobile-first presentation mode guidance
4. Verify CSR form against `07-forms.md` PRD

### Phase 2: CSR/Waybill Save Standardization

1. Migrate CSR save logic to `useDocumentSave` strategy pattern
2. Migrate Waybill save logic to `useDocumentSave` strategy pattern
3. Add `IdentityLockDialog` to Waybill (if not already present)
4. Verify both use consistent offline draft patterns

### Phase 3: RFQ/BOQ Implementation

1. Add `documentType` prop to `SharedDocumentForm`
2. Implement RFQ variant (no pricing, no totals)
3. Implement BOQ variant (full pricing, full totals)
4. Add `RfqSaveStrategy` and `BoqSaveStrategy`
5. Add RFQ → Quotation conversion
6. Add BOQ → Invoice conversion

### Phase 4: Invoice Presentation Modes

1. Implement popup/sheet presentation mode in `SharedDocumentForm`
2. Use `isMobile` prop to switch between popup and inline
3. Verify both modes against prototypes
4. Test on Android via Capacitor

### Phase 5: Standards Alignment

1. Update `document-transformation-standard.md` with RFQ/BOQ lifecycle events
2. Update `document-save-orchestration.md` with RFQ/BOQ strategies
3. Update `07-forms.md` with RFQ/BOQ form specs

---

## 9. Risks

### 9.1 High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| SharedDocumentForm prop explosion (60+ props) | Maintainability | Consider prop grouping or context pattern. Not blocking. |
| CSR/Waybill save migration breaks existing behavior | Regression | Write integration tests before migration. Test offline draft paths. |
| RFQ/BOQ conversion logic not defined | Incomplete lifecycle | Define conversion contracts before implementation. |

### 9.2 Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Popup vs. inline rendering complexity | UI inconsistency | Use CSS layout switching, not component tree branching. |
| Offline draft pattern inconsistency across documents | Data loss | Standardize offline pattern in Phase 2 before adding new documents. |
| Quotation → Invoice conversion path may need RFQ/BOQ | Incomplete conversion chain | Define full conversion matrix before implementation. |

### 9.3 Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Prototype drift from implementation | Visual mismatch | Use prototypes as reference, not spec. Verify against PRD. |
| Standards become stale | Inconsistency | Update standards as part of each phase. |

---

## 10. Summary of Decisions

| Question | Answer |
|---|---|
| What to share? | Invoice + Quotation share `SharedDocumentForm`. RFQ and BOQ will also share it. |
| What stays separate? | CSR and Waybill keep their own forms. |
| Two Invoice experiences? | Same component, CSS layout switching via `isMobile` prop. |
| New CSR experience? | Keep `CsrFormScreen` as independent form. Migrate save to strategy pattern. |
| Waybill fate? | Keep `WaybillForm` as independent form. Migrate save to strategy pattern. |
| RFQ/BOQ integration? | Use `SharedDocumentForm` with `documentType` prop to control section visibility. |
| PRD/standards changes? | Update `document-form-consolution-standard.md` to allow independent forms for CSR/Waybill. Add RFQ/BOQ sections. |
| Migration order? | Documentation → CSR/Waybill save standardization → RFQ/BOQ → Invoice presentation modes → Standards alignment. |
| What must NOT change? | Invoice save logic, Quotation save logic, domain models, `useDocumentSave` strategy interface, identity lock behavior, offline draft patterns for existing documents. |

---

*End of report.*
