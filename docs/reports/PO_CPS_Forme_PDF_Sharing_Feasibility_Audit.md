# BOURXE Business Platform — Supplier PO & CPS Forme PDF Sharing Feasibility & PRD Compliance Audit

- **Document Identifier:** `PO_CPS_FORME_PDF_SHARING_FEASIBILITY_AUDIT_2026_11_08`
- **Audit Date:** 2026-11-08
- **Audit Scope:** Strict Read-Only Feasibility and PRD Compliance Audit for Supplier Purchase Order (PO) and Cost & Pricing Sheet (CPS) PDF Integration with Forme Architecture
- **Status:** APPROVED AUDIT BASELINE
- **Target Rendering Engine:** Forme (`@formepdf/react` and `@formepdf/core` v0.20.1)
- **Target Presentation Layer:** `pdfcn` Document Design System
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Authoritative PRD Suite:** `docs/prd/pdf-rendering-migration/` and `docs/prd/cost-pricing-sheet/`

---

## 1. Executive Summary

This audit investigates the feasibility, architectural constraints, and PRD compliance requirements for integrating **Supplier Purchase Order (PO)** and **Cost & Pricing Sheet (CPS)** PDF generation into the newly migrated Forme PDF architecture (`@formepdf/react` v0.20.1).

### 1.1 Core Audit Findings

1. **PO Cannot Directly Reuse Invoice/Quotation Templates Without Adaptation:**
   - Existing commercial Forme templates (`IndustryFormeDocument.tsx`, `IndustrialFormeDocument.tsx`, `EvergreenFormeDocument.tsx`, `ArchitecturalFormeDocument.tsx`, `ExecutiveFormeDocument.tsx`, `HeritageHouseFormeDocument.tsx`, `LandscapeFormeDocument.tsx`, `MinimalFormeDocument.tsx`) contain hardcoded client-facing presentation elements:
     - Hardcoded titles and party labels (`"BILL TO · CLIENT"`, `"From"` / `"To"`, `"Client PO Ref"`).
     - Hardcoded company bank receiving accounts. A PO is an outgoing Accounts Payable (AP) procurement commitment; printing company receiving bank details violates procurement semantics.
     - Hardcoded signature blocks (`"Client Receiving Acknowledgement"` / `"Client Acceptance"`).
     - Sales line-item columns (`Unit Price`, `Install Rate`) rather than procurement semantics (`Unit Cost`).
     - Withholding Tax (WHT) deduction logic, which is strictly prohibited on outgoing PO commitments.
   - However, PO **can and should** share the commercial design language, color palettes, typography, layout geometry, media resolution, and delivery pipeline through a dedicated or parameterized commercial Forme document component.

2. **CPS Cannot Reuse Invoice/Quotation Templates At All:**
   - CPS is an internal engineering costing schedule with dual pricing per line (`CP` and `SP`), margin analysis (`Gross Profit`, `Margin %`), structural grouping boundaries, and project site metadata.
   - Forcing CPS into an Invoice/Quotation template is strictly forbidden by the PRD (`Waterfall-roadmap.md` M11 and `architecture.md` Sec 1.2 "No Universal Table or Layout Abstraction"). It would either expose sensitive cost pricing (CP) on a sales layout or destroy the dual-column cost schedule required by engineering estimators.
   - CPS already possesses an independent, active Forme implementation (`LedgerCpsDocument.tsx`, `CpsIndustryDocument.tsx`, `CpsFormeDocument.tsx`) driven by `buildCpsFormeModel()`.

3. **Shared Infrastructure vs. Document-Specific Isolation:**
   - **Safe to Share:** TrueType font registry (`fonts.ts`), glyph substitution and Naira rendering (`glyphs.tsx`), rich text parser (`formeRichText.tsx`), canonical media loaders (`resolveCanonicalLogoUrl`), Forme layout primitives (`View`, `Text`, `Table`, `Fixed`, `Image`), and delivery subsystem (`CompositePdfDelivery`).
   - **Must Remain Independent:** Domain preparation contracts (`preparePurchaseOrderDocument.ts` vs `cpsPreparedModel.ts` vs `industryAdapter.ts`), table column definitions, financial calculations, party semantics (`Supplier` vs `Client`), and ancillary blocks (`Bank Details` vs `Delivery Instructions`).

4. **Recommended Execution Sequence:**
   - Complete **Milestone M1C** (`preparePurchaseOrderDocument.ts` canonical model) as a mandatory prerequisite.
   - Execute **Milestone M10** (PO Template Integration) using an adapted commercial Forme document architecture.
   - Execute **Milestone M11** (CPS Template Integration) by consolidating existing CPS Forme documents onto the centralized font registry, master resolver, and delivery pipeline.

---

## 2. PRD and Roadmap Requirements

### 2.1 Master PDF Migration PRD (`docs/prd/pdf-rendering-migration/`)

#### A. Document Scope and Core Principles (`Readme.md`, lines 13–29, 89–90)
- **Scope:** Eight in-scope document types: Invoice, Quotation, PO, CPS, RFQ, Waybill, Receipt, CSR. (BOQ is explicitly excluded).
- **Critical Commercial Infrastructure Group:** Invoice, Quotation, and PO share unified infrastructure (fonts, media resolution, glyph diagnostics, low-level Forme primitives, and delivery pipeline).
- **Independent Semantics:** Each document retains independent layouts, fields, and business semantics. Existing PO templates are strictly preserved; PO is an outgoing supplier-facing document, not a client invoice.
- **No Universal Layout Abstraction:** Shared infrastructure must never force identical layouts or table abstractions onto different document families.
- **Text & Financial Immutability:** Financial math remains strictly in domain layers (`src/domain/` and `src/lib/Calculations.ts`). Render layers perform zero mathematical recalculation or state mutation.

#### B. Architectural Roles (`architecture.md`, lines 94–141)
- **Subsystem Separation:**
  1. *Domain Preparation Layer:* Resolves data, runs locked math, emits renderer-neutral prepared models.
  2. *Master Template Resolver:* Sits in `src/domain/pdf/resolver/`, discovers and validates registered templates, constructs envelopes.
  3. *PDF Customization Engine:* Evaluates user preferences (accents, fonts, density) against template capabilities.
  4. *`pdfcn` Presentation Layer:* Provides design tokens and low-level rendering primitives.
  5. *Forme Engine Backend:* Compiles React JSX components into vector PDF bytes.
  6. *Composite Delivery Subsystem:* Manages dispatch, caching, download, and printing.
- **Specific PO Architectural Definition (`architecture.md`, lines 135–141):**
  - Outgoing procurement contract sent to vendor/supplier (Accounts Payable).
  - Requires supplier snapshot (`supplier_name`, contact, address), procurement delivery terms, `unit_cost` (procurement cost, never sales price), and management authorization signatures.
  - Does **not** include receiving bank accounts (BOUXRE is paying, not receiving).
  - Does **not** deduct Withholding Tax (WHT).
  - Existing PO templates must be preserved.
  - Canonical Preparation Gap: PO preparation contract (`preparePurchaseOrderDocument.ts`) is recorded as outstanding requirement **Milestone M1C**.

#### C. Milestone Definitions & Sequencing (`Waterfall-roadmap.md`, lines 40, 48–50, 91–99, 304–338)
- **Milestone M1C (PO Canonical Preparation Contract):** Implement `preparePurchaseOrderDocument.ts` in `src/domain/pdf/resolver/commercial/`, adapt PO domain entity (`types.ts`), adapt supplier snapshot, map `unit_cost`, preserve buyer authorization signatures, hide receiving bank blocks.
- **Milestone M9 (Migrate Three Commercial HTML Templates):** ✅ **100% Complete** (Architectural, Executive, Heritage House live on Forme).
- **Milestone M10 (Purchase Order Template Integration):** ⛔ **Pending**. Objective: Extend migrated commercial template system to support Purchase Orders; reuse shared Forme rendering architecture; respect PO-specific data, terminology, supplier relationships; verify supported PO templates. *Dependency: Follows completion of commercial template migrations.*
- **Milestone M11 (Cost Pricing Sheet Template Integration):** ⛔ **Pending**. Objective: Extend migrated template system to support CPS; preserve CPS-specific data structures, calculations, and locked pricing rules; reuse shared Forme infrastructure without forcing CPS into an unsuitable commercial layout; verify representative CPS documents. *Dependency: Follows commercial template migrations and must not compromise existing CPS document architecture.*

#### D. Commercial Specification (`invoice-quotation-po-template-spec.md`, lines 63–91, 157–185)
- [PRD REQUIREMENT] Comparison between Invoice, Quotation, and PO:
  - Document Title: Fixed system title `"PURCHASE ORDER"`.
  - Numbering: `po_number` (e.g. `PO-2026-0089`).
  - Counterparty: `"Order From · Supplier / Vendor"` (`supplier_name`, contact, address, TIN).
  - Pricing: `Unit Cost` (`unit_cost`), flat items without groups (`grouped: false`).
  - Totals Formula: $\text{Total} = \text{Net Subtotal} + \text{VAT} + \text{Extra Charges}$.
  - WHT Rule: Strictly omitted on PO.
  - Banking: Strictly omitted. Replaced by delivery instructions and vendor payment terms.
  - Signatures: Purchasing Officer + Management Authorization.

### 2.2 Authoritative CPS PRD Suite (`docs/prd/cost-pricing-sheet/`)

#### A. Domain Architecture (`01-cost-pricing-sheet-product-domain-architecture.md`, lines 11–52)
- Canonical name: Cost & Pricing Sheet (CPS).
- Internal commercial schedule for costing, selling price review, margin review, and quotation preparation.
- Locked Commercial Invariants:
  - $\text{Total Cost} = \sum(\text{CP} \times \text{Quantity})$
  - $\text{Selling Total} = \sum(\text{SP} \times \text{Quantity})$
  - $\text{Gross Profit} = \text{Selling Total} - \text{Total Cost}$
  - $\text{Margin} = \frac{\text{Gross Profit}}{\text{Selling Total}}$
  - CP is confidential internal cost data; SP is customer-facing commercial price upon conversion. CP must never transfer to Quotation.

#### B. Presentation and PDF Contract (`02-cost-pricing-sheet-presentation-pdf-view-contract.md`, lines 134–208)
- Normative PDF Renderer: Forme/pdfcn architecture. React-PDF is prohibited.
- Forme is active production architecture for CPS (not an unresolved gate).
- Approved Templates: `schedule` (full commercial schedule) and `compact` (condensed business document).
- PDF Structure Requirements:
  - Company identity and logo.
  - CPS document identity (`cps_number`, `issue_date`, `status`).
  - Client and approved document context (`client_name`, `project_name` / site).
  - Commercial schedule table with group walls and item membership.
  - Summary totals: Total Cost, Selling Total, Gross Profit, Margin %.
  - Running footer with document number and dynamic page numbering.

---

## 3. Existing Commercial Forme Architecture

### 3.1 Template Inventory and Analysis

Inspection of `src/components/pdf/forme/` reveals eight active commercial Forme documents:

| Component File | Lines | Palette / Design Identity | Counterparty Label | Bank Details | Signatures |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `IndustrialFormeDocument.tsx` | 870 | Dark Graphite (`#1D2528`), Orange (`#DC5A21`), Off-white | Hardcoded `BILL TO / CLIENT` (L335) | Full-width boxed bank card (L711) | Prepared By + Client Ack |
| `IndustryFormeDocument.tsx` | 573 | Slate Grey (`#7D8A88`), Ice Blue (`#F8FAFC`) | Hardcoded `"To"` / Client (L195) | Bank Card with Sort Code (L428) | Issuer + Client Ack |
| `EvergreenFormeDocument.tsx` | 592 | Deep Forest (`#1F6E5C`), Mint (`#2A8A73`) | Hardcoded `"Bill To"` (L284) | Boxed Bank Card (L460) | Issuer + Client Ack |
| `ArchitecturalFormeDocument.tsx` | 583 | Charcoal (`#1E2427`), Copper (`#A4663F`), Ivory | Hardcoded `BILL TO · CLIENT` (L276) | Technical Bank Block (L451) | 3-col: Prep, Auth, Client Ack (L557) |
| `ExecutiveFormeDocument.tsx` | 558 | Forest Green (`#173A2C`), Gold (`#A9854F`), Cream | Hardcoded `CLIENT INFORMATION · BILL TO` (L251) | Executive Bank Card (L439) | Dual: Exec + Client Ack (L544) |
| `HeritageHouseFormeDocument.tsx` | 570 | Burgundy (`#5C1A26`), Bronze (`#9A7B45`), Warm Ivory | Hardcoded `Bill To · Client` (L262) | Boxed Bank Particulars (L458) | 3-col: Prep, Auth, Client Ack (L542) |
| `LandscapeFormeDocument.tsx` | 884 | Navy (`#07192B`), Steel Blue (`#1D568A`), A4 Wide | Hardcoded `ClientBlock` (L134) | Bank Details Card | Issuer + Client Ack |
| `MinimalFormeDocument.tsx` | 569 | Monochrome Black/Grey (`#1A1A1A`, `#E8E8E8`) | Hardcoded `"Bill To"` (L437) | Minimal Bank Block (L304) | Issuer + Client Ack |

### 3.2 Adapter and Data Pipeline (`src/components/pdf/industryAdapter.ts`)

- **Current Implementation:** `adaptCommercialDocumentData(model: PdfDocumentModel): CommercialDocumentData` maps incoming models into a single commercial structure.
- **Architectural Findings:**
  1. `getDocumentNumberLabel`: Checks `kind === 'invoice' ? 'Invoice Number' : 'Quotation Number'` (line 130). It has no branch for `'purchase_order'`.
  2. `getDateLabel`: Checks `kind === 'invoice' ? 'Due Date' : 'Valid Until'` (line 134). It has no branch for `'purchase_order'` (`PO Date`).
  3. `client`: Maps directly from `model.recipient` (lines 62–69). There is no concept of a supplier/vendor party descriptor.
  4. `paymentDetails`: Unconditionally extracts `model.bankDetails` (lines 95–100, 420–428).
  5. `table.columns`: Default columns hardcode `unit_price`, `install_rate`, `vat_rate`, `discount_rate` (lines 26–28).

### 3.3 Resolver Routing (`src/components/pdf/index.ts`)

- `resolveCommercialPdfRoute(templateId)` supports eight routes:
  - `industrial-forme`
  - `industry-forme`
  - `landscape-forme`
  - `minimal-forme`
  - `evergreen-forme`
  - `architectural-forme`
  - `executive-forme`
  - `heritage-forme`
- `generatePdfAsset` compiles the selected component with `renderPdfcnToBytes` and delivers via `CompositePdfDelivery`.
- `generateInvoicePdf`, `generateQuotationPdf`, and `generateCpsFormePdf` are exported. There is **no** `generatePurchaseOrderPdf` exported from `src/components/pdf/index.ts`.

### 3.4 Font and Primitives Infrastructure

- `src/components/pdf/forme/fonts.ts`: Single font authority registering 9 TrueType families (`Inter`, `Archivo Black`, `Caveat`, `Noto Sans`, `Plus Jakarta Sans`, `Figtree`, `Work Sans`, `Public Sans`, `PT Serif`) via `public/fonts/*.ttf`.
- `src/components/pdf/forme/glyphs.tsx`: `glyphRuns` utility providing automatic runtime font switching to `Noto Sans` for Nigerian Naira (`₦`, `U+20A6`) and Greek mathematical symbols (`Noto Sans Greek`).
- `src/components/pdf/forme/formeRichText.tsx`: Converts user HTML/rich text to Forme `<Text>` and `<View>` nodes.

---

## 4. Supplier PO Current-State Findings

### 4.1 Domain Model & Business Rules (`src/domain/purchase-order/`)

1. **Strict Supplier Authority (`types.ts`, lines 10–21, 105–129):**
   - [AUDIT FINDING] `PurchaseOrder` contains: `po_number`, `po_date`, `supplier_id`, `supplier_name`, `status`, `currency`, `subtotal`, `discount`, `vat`, `extra_charges`, `total`, `calculation_inputs`, `notes`, `terms`, `items`.
   - [AUDIT FINDING] There is **no** `client_id` in the PO domain. The PO counterparty is strictly a supplier (`supplier_id`, `supplier_name`).
   - [AUDIT FINDING] `unit_cost` represents procurement cost per unit; it is never a sales `unit_price` (line 93).
   - [AUDIT FINDING] Items are flat: `PurchaseOrderItem` has no `group_id` or `row_type` (lines 87–100).

2. **Locked Calculations (`calculations.ts`, lines 8–45):**
   - [AUDIT FINDING] Calculations wrap canonical `computeDocument()` in `src/lib/Calculations.ts`.
   - `install_rate` is force-hidden (`visibilityMode: 'hide_full'`).
   - WHT deduction is hardcoded to zero: `whtAmount = 0`.
   - Formula: $\text{Total} = \text{Subtotal} - \text{Discount} + \text{VAT} + \text{Extra Charges}$.

3. **Form Descriptor (`src/components/document/documentDescriptor.ts`, lines 199–220):**
   - `PURCHASE_ORDER_DESCRIPTOR` defines:
     - `family: 'purchase_order'`
     - `title: 'Purchase Order'`
     - `numberLabel: 'PO No.'`
     - `issueDateLabel: 'PO Date'`
     - `party`: Terminology `Supplier`, role hint `Order from · Supplier`, `idField: 'supplier_id'`, `nameField: 'supplier_name'`.
     - `hiddenSections`: `titleField`, `clientPoNumberField`, `dueDateField`, `paymentStage`, `whtSection`, `additionalFieldsSection`, `headerFieldsSection` are all `true`.

### 4.2 PO PDF Generation & Export Status

- [AUDIT FINDING] **PO PDF Generation is 0% Implemented in Application Code:**
  - `src/pages/PurchaseOrderDetail.tsx` contains actions for edit, transition status (draft $\to$ issued $\to$ closed/cancelled), archive, and audit history. It has **no** PDF preview, no PDF download button, and no print handler.
  - `src/pages/PurchaseOrderFormPage.tsx` handles form state and persistence via `savePurchaseOrder`. It has no PDF export handler.
  - `src/components/pdf/types.ts` defines `PdfDocumentKind = 'invoice' | 'quotation'`. It does **not** include `'purchase_order'`.
  - `src/domain/pdf/resolver/commercial/preparePurchaseOrderDocument.ts` (Milestone M1C) does **not** exist.
  - `src/lib/pdf/types.ts` defines `PdfDocumentType = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'cps_sheets' | 'rfq' | 'receipt'`. It does **not** include `'purchase_order'`.

### 4.3 Reference Design Artifacts

- [EXISTING IMPLEMENTATION] Reference specifications and QA mockups exist in the repository:
  - `docs/templates/html-temps/invoice-templates/commercial-fixture.js`: Lines 1025–1471 define the canonical PO fixture (`"po": { "kind": "po", "title": "PURCHASE ORDER", "number": "PO-2026-0089", ... }`).
  - `docs/templates/html-temps/invoice-templates/qa-renders/portrait-po.pdf` and `landscape-po.pdf`: Validated visual reference renders.
  - `docs/prd/pdf-rendering-migration/invoice-quotation-po-template-spec.md`: Complete structural specification.

---

## 5. CPS Current-State Findings

### 5.1 Domain Model & Business Rules (`src/domain/cps/`)

1. **Dual-Price Commercial Model (`calculateCpsTotals.ts`, `types.ts`):**
   - Each row has `cp` (cost price), `sp` (selling price), `quantity`, `unit`, `make_brand`, and `specification`.
   - Totals calculation produces: `total_cost`, `total_selling_price`, `gross_profit`, `margin_percent`.
2. **Structural Grouping (`viewData.ts`, `cpsPreparedModel.ts`):**
   - Hierarchical structure with `section` (group header), `item` rows, and `group-subtotal` rows.

### 5.2 Existing CPS Forme Implementation

- [EXISTING IMPLEMENTATION] **CPS is Already Forme-Native:**
  - Unlike PO, CPS PDF generation is already fully implemented on Forme!
  - `src/domain/cps/pdfDownloadHandler.ts`:
    - `buildCpsFormeModel()` (L122–256) constructs `CpsPdfModel`.
    - `getCpsPdfBlob()` (L258–312) and `handleDownloadCpsPdf()` (L314–383) dynamically import Forme renderers and fonts.
    - Template selection: `selectCpsFormeDocument(prefs.templateId)` routes between `CpsIndustryDocument` and `LedgerCpsDocument`.
  - `src/components/pdf/index.ts`:
    - `generateCpsFormePdfBlob()` (L243–260) and `generateCpsFormePdf()` (L262–298) compile the Forme element using `@formepdf/core/browser` `renderDocument()` and deliver through `CompositePdfDelivery`.
  - `src/pages/ViewCps.tsx`:
    - Directly invokes `handleDownloadCpsPdf` and `getCpsPdfBlob` via primary action buttons and `DocumentShareSheet`.
  - `src/tests/critical/cpsPdf.test.js` (539 lines):
    - Comprehensive unit test suite verifying model serialization, column visibility, and totals correctness.

### 5.3 Outstanding CPS Issues and Debt

1. **Font Fallback Inconsistency (PR-07 / M5 Step 5.1):**
   - Historical code used `.woff` paths from `pdfSharedFonts.ts`, causing Forme to silently fall back to `Helvetica`.
   - `src/components/pdf/forme/fonts.ts` now supports TrueType fonts, but `pdfDownloadHandler.ts` still defaults `fontFamily` to `'Helvetica'` (L134) if not explicitly set in preferences.
2. **Resolver Decoupling:**
   - CPS generation bypasses the Master Template Resolver in `src/domain/pdf/resolver/registry.ts`. It invokes `generateCpsFormePdf` directly rather than through `resolvePdfcnDocument()`.
3. **Template Customization:**
   - Supports `schedule` (`LedgerCpsDocument`) and `compact` (`CpsIndustryDocument`), but does not participate in the visual style choices of the 8 commercial themes.

---

## 6. PO Sharing Feasibility Matrix

| Architecture Layer | Feasibility Classification | Repository Evidence & Technical Rationale |
| :--- | :--- | :--- |
| **Forme Core Integration** | **DIRECT REUSE** | `renderPdfcnToBytes` in `src/components/pdf/pdfcn/adapter.ts` and `@formepdf/react` compile standard Forme trees into PDF bytes without document-type assumptions. |
| **Shared PDF Utilities** | **DIRECT REUSE** | `splitAddressLines` (`industryAdapter.ts` L145), `formatPdfMoney` (L164), `sanitizeFilename` (`index.ts` L60) operate on neutral data primitives. |
| **Shared Typography / Fonts** | **DIRECT REUSE** | `ensureFormeFontFamily` in `src/components/pdf/forme/fonts.ts` provides TrueType SFNT binaries (`Inter`, `Archivo Black`, `Noto Sans`, etc.) shared across all commercial documents. |
| **Glyph & Special Characters** | **DIRECT REUSE** | `glyphs.tsx` (`glyphRuns`, `NAIRA_RUN`) safely injects `Noto Sans` runs for `₦` and engineering characters across all templates. |
| **Header Components** | **ADAPTABLE REUSE** | Commercial header layout geometry (logo + company info + document title/meta) can be shared, but title must be `"PURCHASE ORDER"` and metadata must render `"PO Date"` (not `"Issue Date"` or `"Due Date"`). |
| **Company Identity / Logo** | **DIRECT REUSE** | `resolveCanonicalLogoUrl` (`src/domain/documentMedia.ts`) provides consistent issuer identity, CAC/RC registration, address, and logo. |
| **Document Metadata** | **ADAPTABLE REUSE** | PO uses `po_number` and `po_date`. Must suppress `dueDate` / `validUntil` and `poNumber` (Client PO Reference) which are meaningless on an outgoing PO. |
| **Party Information Blocks** | **DOCUMENT-SPECIFIC** | Invoice/Quotation templates hardcode `"BILL TO · CLIENT"` and expect `data.client`. PO strictly requires `"Order From · Supplier / Vendor"` (`supplier_name`, contact, address, TIN) and optional `"Deliver To · Site"`. |
| **Line-Item Tables** | **ADAPTABLE REUSE** | Table geometry, repeating headers, and column budgeting are reusable. However, PO requires column header `"Unit Cost"` (not `"Unit Price"`), suppresses `install_rate`, and renders a flat table without category group headers (`grouped: false`). |
| **Totals and Summaries** | **DOCUMENT-SPECIFIC** | Commercial templates assume sales totals with optional WHT deductions and balance due. PO totals require procurement calculation: `Subtotal - Discount + VAT + Extra Charges`. WHT deduction is strictly forbidden. Main label is `"Total Order Amount"`. |
| **Payment / Bank Details** | **DOCUMENT-SPECIFIC** | Invoice bank settlement cards (`paymentDetails`) MUST BE OMITTED. On a PO, BOUXRE is paying the vendor. Rendering buyer bank accounts violates procurement integrity. This area is replaced by Supplier Payment Terms or Delivery Instructions. |
| **Notes and Terms** | **DIRECT REUSE** | `formeRichText.tsx` and rich text rendering primitives cleanly render PO procurement notes and terms. |
| **Signatures and Approvals** | **DOCUMENT-SPECIFIC** | Commercial templates render Issuer + Client Acceptance acknowledgement. PO requires dual internal authorization: Requisitioner / Purchasing Officer + Management / Finance Authorization. |
| **Pagination & Fixed Footers** | **DIRECT REUSE** | `<Fixed position="footer">` dynamic reservation, running footers, and `Page {{pageNumber}} of {{totalPages}}` are 100% reusable. |
| **Commercial Template Layouts** | **ADAPTABLE REUSE** | The visual aesthetic (colors, borders, fonts) of Industrial, Evergreen, Architectural, Executive, Heritage, Landscape, and Minimal can be adapted for PO via parameterized subcomponents. Direct unadapted reuse is impossible. |
| **Preview Miniatures** | **ADAPTABLE REUSE** | Miniature cards can show PO variations or reuse the existing theme miniatures in `CommercialTemplatePicker.tsx` once PO is integrated into the commercial family. |
| **Template Picker** | **ADAPTABLE REUSE** | `CommercialTemplatePicker.tsx` can be mounted in PO View/Edit pages to let users choose between commercial design themes. |
| **Export Infrastructure** | **DIRECT REUSE** | `CompositePdfDelivery`, `WebPdfDelivery`, `NativePdfDelivery`, and `DefaultFeedbackBus` (`src/lib/pdf/`) provide full cross-platform export and caching. |

---

## 7. CPS Sharing Feasibility Matrix

| Architecture Layer | Feasibility Classification | Repository Evidence & Technical Rationale |
| :--- | :--- | :--- |
| **Forme Core Integration** | **DIRECT REUSE** | CPS already uses `@formepdf/react` and `@formepdf/core/browser` `renderDocument()`. Can cleanly migrate to `renderPdfcnToBytes`. |
| **Shared PDF Utilities** | **DIRECT REUSE** | Shared filename sanitization, currency formatting, and date helpers. |
| **Shared Typography / Fonts** | **DIRECT REUSE** | CPS must migrate from its fallback `Helvetica` to the M1B TrueType font registry (`src/components/pdf/forme/fonts.ts`) supporting `Inter`, `Noto Sans`, etc. |
| **Glyph & Special Characters** | **DIRECT REUSE** | `glyphs.tsx` resolves Naira symbol (`₦`) and technical notation on CPS cost sheets. |
| **Header Components** | **DOCUMENT-SPECIFIC** | CPS headers require internal document branding, title `"COST & PRICING SHEET"`, sheet title, internal status, and project site context. Commercial invoice headers do not fit. |
| **Company Identity / Logo** | **DIRECT REUSE** | Canonical logo resolution (`resolveCanonicalLogoUrl`) is already used in `pdfDownloadHandler.ts` (L275). |
| **Document Metadata** | **DOCUMENT-SPECIFIC** | CPS metadata includes `cps_number`, internal versioning, site/project name, and calculation timestamps. |
| **Party Information Blocks** | **DOCUMENT-SPECIFIC** | CPS displays client/project site context in an internal layout (e.g. `IndustryParties` in `CpsIndustryDocument.tsx` L82–100). |
| **Line-Item Tables** | **DOCUMENT-SPECIFIC** | CPS schedule table is structurally unique: 6–7 columns (`No`, `Description / Specification`, `Qty`, `Unit CP`, `Unit SP`, `Total Cost`, `Total Sell`), group boundary walls (`groupedItemKeys`), and group subtotals. Cannot use commercial table components. |
| **Totals and Summaries** | **DOCUMENT-SPECIFIC** | Cost breakdown ledger: `Total Cost (CP × Qty)`, `Selling Total (SP × Qty)`, `Gross Profit`, `Margin %`. Incompatible with commercial invoice totals. |
| **Payment / Bank Details** | **NOT APPLICABLE** | CPS is an internal costing document. It contains zero banking or settlement details. |
| **Notes and Terms** | **ADAPTABLE REUSE** | Internal estimation notes and contingencies render using shared rich-text helpers. |
| **Signatures and Approvals** | **NOT APPLICABLE** | CPS PRD Sec 3 explicitly specifies that approval workflows and signature stamps are omitted from current CPS View/PDF contracts. |
| **Pagination & Fixed Footers** | **DIRECT REUSE** | Page footer with document number, internal confidentiality note, and `Page {{pageNumber}} of {{totalPages}}`. |
| **Template Layouts** | **SHARED INFRASTRUCTURE ONLY** | CPS maintains dedicated layouts (`LedgerCpsDocument.tsx`, `CpsIndustryDocument.tsx`). It shares Forme layout primitives and tokens, but cannot adopt commercial invoice template layouts. |
| **Preview Miniatures** | **DOCUMENT-SPECIFIC** | Requires CPS-specific miniature representations showing the dual-column cost schedule and group bands. Commercial invoice miniatures do not reflect CPS layouts. |
| **Template Picker** | **DOCUMENT-SPECIFIC** | CPS template picker toggles between `schedule` (Ledger) and `compact` (Industry), distinct from the 8-theme commercial picker. |
| **Export Infrastructure** | **DIRECT REUSE** | Fully compatible with `CompositePdfDelivery` (already partially integrated in `src/components/pdf/index.ts` L286). |

---

## 8. PRD Compliance and Gap Analysis

### 8.1 Supplier Purchase Order (PO) Gap Analysis

| PRD Requirement | Existing Repository State | Compliance / Gap Status | Impact & Required Work |
| :--- | :--- | :--- | :--- |
| **Canonical PO Prepared Model (`preparePurchaseOrderDocument.ts`)** | Not implemented. `src/domain/pdf/resolver/commercial/` does not exist. | ❌ **CRITICAL GAP (M1C)** | Must author `preparePurchaseOrderDocument.ts` adapting `PurchaseOrder` to renderer-neutral contract. |
| **PO Document Type in PDF System** | `PdfDocumentKind` in `src/components/pdf/types.ts` is `'invoice' \| 'quotation'`. `PdfDocumentType` in `src/lib/pdf/types.ts` lacks `'purchase_order'`. | ❌ **CRITICAL GAP** | Extend type definitions to include `'purchase_order'` / `'po'`. |
| **Supplier Party Semantics** | Commercial templates hardcode `"BILL TO · CLIENT"` and map from `data.client`. | ❌ **ARCHITECTURAL CONFLICT** | Render layer must support dynamic party role (`"Order From · Supplier"`) and supplier snapshot. |
| **Procurement Line Item Semantics** | Commercial templates display `"Unit Price"`; PO requires `"Unit Cost"`. PO items are flat (`grouped: false`). | ❌ **SEMANTIC CONFLICT** | Column headers and row renderers must adapt for procurement terminology. |
| **Omission of Company Bank Details** | All 8 commercial Forme templates render company bank receiving cards. | ❌ **CRITICAL DEFECT IF REUSED** | Bank block must be conditionally replaced by Delivery Instructions / Supplier Terms on PO documents. |
| **Zero WHT on PO** | Commercial calculations and totals support WHT. Domain PO calculation engine enforces `wht = 0`. | ⚠️ **POTENTIAL RISK** | Ensure rendering layer totals do not display WHT rows when rendering PO. |
| **Procurement Signatory Block** | Templates render Client Receiving Acknowledgement. PO requires Requisitioner + Management Authorization. | ❌ **SEMANTIC CONFLICT** | Signature component must render dual internal management lines instead of client acknowledgement. |
| **PO PDF Generation & Export** | `PurchaseOrderDetail.tsx` has no PDF preview, download, or print actions. | ❌ **MISSING FEATURE (M10)** | Wire PDF actions, download handlers, and template selection into `PurchaseOrderDetail.tsx`. |

### 8.2 Cost & Pricing Sheet (CPS) Gap Analysis

| PRD Requirement | Existing Repository State | Compliance / Gap Status | Impact & Required Work |
| :--- | :--- | :--- | :--- |
| **Forme Renderer Architecture** | `LedgerCpsDocument.tsx` and `CpsIndustryDocument.tsx` active in `src/components/pdf/forme/`. | ✅ **COMPLIANT** | Production PDF generation already runs on Forme. React-PDF is not used. |
| **Approved Templates (`schedule` & `compact`)** | Both implemented and mapped in `pdfDownloadHandler.ts` (`selectCpsFormeDocument`). | ✅ **COMPLIANT** | `LedgerCpsDocument` serves `schedule`; `CpsIndustryDocument` serves `compact`. |
| **Dual-Pricing & Margin Calculations** | Computed via `calculateCpsTotals.ts` and verified in `cpsPdf.test.js`. | ✅ **COMPLIANT** | Financial calculations remain locked in domain layer; zero math in renderers. |
| **Group Walls and Item Membership** | Handled via `groupedItemKeys` and `buildCpsViewSegments`. | ✅ **COMPLIANT** | Group boundaries and subtotals render accurately across page splits. |
| **TrueType Font Fallback Defect (PR-07)** | `fonts.ts` has TrueType fonts, but `pdfDownloadHandler.ts` still defaults to `'Helvetica'`. | ⚠️ **PARTIAL DEFECT** | Update `pdfDownloadHandler.ts` to request and verify registered TrueType fonts (`Inter`). |
| **Master Deterministic Resolver Integration** | CPS bypasses `src/domain/pdf/resolver/registry.ts`, calling `generateCpsFormePdf` directly. | ⚠️ **ARCHITECTURAL DEBT** | Register CPS templates in the master resolver to unify document envelope lifecycle. |
| **View and PDF Parity** | Both View and PDF consume canonical `viewData.ts` and `calculateCpsTotals.ts`. | ✅ **COMPLIANT** | High mathematical and structural parity confirmed. |

---

## 9. Recommended Architecture for Supplier Purchase Order (PO)

### 9.1 Recommended Architecture: Adapted Commercial Template Architecture

Direct reuse of Invoice/Quotation templates is rejected due to hardcoded client semantics. Completely isolated PO templates from scratch are also rejected, as they would duplicate hundreds of lines of identical visual styling across the 8 commercial themes.

The optimal, PRD-compliant architecture is an **Adapted Commercial Template Architecture**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PO PDF GENERATION PIPELINE                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Domain Layer: src/domain/purchase-order/                            │
│    • Entity: PurchaseOrder (types.ts)                                  │
│    • Financial Engine: computePurchaseOrderTotals (calculations.ts)    │
│    • Canonical Contract: preparePurchaseOrderDocument.ts (NEW - M1C)  │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Master Resolver & Types: src/components/pdf/                        │
│    • Extend PdfDocumentKind to include 'purchase_order'               │
│    • Extend CommercialDocumentData to support party descriptors:       │
│      - partyHeaderLabel: "ORDER FROM · SUPPLIER"                       │
│      - priceColumnLabel: "UNIT COST"                                   │
│      - isProcurement: true                                             │
│      - deliveryInstructions: string (replaces paymentDetails)          │
│      - signatories: { requisitioner, authorizer }                      │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Forme Commercial Templates: src/components/pdf/forme/               │
│    • Commercial templates (Industrial, Architectural, Executive, etc.) │
│      consume generalized subcomponents:                                │
│      - <CommercialPartyBlock mode={data.mode} party={...} />           │
│      - <CommercialAncillaryBlock mode={data.mode} ... />               │
│      - <CommercialSignatoryBlock mode={data.mode} ... />               │
│    • When mode === 'purchase_order':                                   │
│      - Renders "Order From · Supplier" instead of "Bill To · Client"   │
│      - Renders Delivery Instructions instead of Bank Receiving Details │
│      - Suppresses WHT deduction rows in financial summary              │
│      - Renders Purchasing Officer + Management Authorization sign-offs │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Delivery & UI:                                                      │
│    • generatePurchaseOrderPdf() via CompositePdfDelivery               │
│    • PurchaseOrderDetail.tsx gains Download PDF & Template Picker      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Recommended Architecture for Cost & Pricing Sheet (CPS)

### 10.1 Recommended Architecture: Preserved Dedicated Forme Architecture with Shared Infrastructure

CPS must **not** adopt commercial invoice templates. Its engineering cost structure requires retaining its dedicated Forme documents while harmonizing with shared platform infrastructure:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       CPS PDF GENERATION PIPELINE                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Domain & Calculation Layer:                                         │
│    • Authoritative Totals: calculateCpsTotals.ts                       │
│    • Structural Segments: viewData.ts                                  │
│    • Model Preparation: buildCpsFormeModel() (cpsPreparedModel.ts)     │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Dedicated Forme Document Components (Preserved):                    │
│    • LedgerCpsDocument.tsx (Primary "Schedule" Template)               │
│    • CpsIndustryDocument.tsx ("Compact" Template)                      │
│    • cpsScheduleGeometry.ts (Responsive column budgets)                │
├────────────────────────────────────────────────────────────────────────┤
│                                  │                                     │
│                                  ▼                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Infrastructure Harmonization (M11 Enhancements):                   │
│    • Fonts: Route through ensureFormeFontFamily('Inter') (M1B TTF)     │
│    • Glyphs: Wrap text cells with glyphRuns() for clean Naira (₦)      │
│    • Rich Text: Normalize notes with formeRichText.tsx                 │
│    • Resolver: Register definitions in src/domain/pdf/resolver/        │
│    • Delivery: Standardize on CompositePdfDelivery in index.ts         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Recommended M10/M11 Implementation Sequence

The implementation sequence must strictly respect approved waterfall milestone dependencies:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      RECOMMENDED EXECUTION SEQUENCE                    │
└────────────────────────────────────────────────────────────────────────┘

  [MILESTONE M9: Migrate 3 HTML Commercial Templates]
  Status: ✅ COMPLETE (Architectural, Executive, Heritage House live)
                         │
                         ▼
  [MILESTONE M1C: PO Canonical Preparation Contract]
  Status: ⛔ PENDING (Hard dependency for M10)
  1. Author src/domain/pdf/resolver/commercial/preparePurchaseOrderDocument.ts
  2. Adapt PurchaseOrder domain entity and supplier snapshots
  3. Map unit_cost, procurement totals, and delivery notes
  4. Author unit test suite: preparePurchaseOrderDocument.test.js
                         │
                         ▼
  [MILESTONE M10: Supplier PO Template Integration]
  Status: ⛔ PENDING (Depends on M1C & M9)
  1. Extend src/components/pdf/types.ts and lib/pdf/types.ts with 'purchase_order'
  2. Parameterize commercial adapter (industryAdapter.ts) for procurement mode
  3. Update Forme commercial templates to adapt Party, Bank, and Signatures for PO
  4. Export generatePurchaseOrderPdf() and generatePurchaseOrderPdfBlob()
  5. Add PDF Preview / Download actions to PurchaseOrderDetail.tsx
  6. Author unit tests: formePurchaseOrderTemplate.test.ts
                         │
                         ▼
  [MILESTONE M11: CPS Template Integration & Infrastructure Harmonization]
  Status: ⛔ PENDING (Depends on M10)
  1. Fix PR-07 font fallback: Wire Inter TrueType SFNT into pdfDownloadHandler.ts
  2. Register CPS templates (Schedule / Compact) into Master Resolver
  3. Harmonize generateCpsFormePdf with renderPdfcnToBytes and CompositePdfDelivery
  4. Verify natural multi-page flow and zero regression on cpsPdf.test.js
```

### 11.1 Dependency Justification: Why M10 Precedes M11

1. **Commercial Group Completeness:** The PRD groups Invoice, Quotation, and Purchase Order as the "Critical Commercial Group". Completing M10 closes out the commercial document family, stabilizing the shared commercial adapter, template picker, and commercial resolver routes before transitioning to non-commercial document families.
2. **CPS Is Already Partially Functional on Forme:** CPS already runs in production on Forme (`LedgerCpsDocument.tsx` and `CpsIndustryDocument.tsx`). Unlike PO (which has 0% PDF implementation), CPS users can already generate and download PDFs. Prioritizing M10 delivers complete net-new functionality (PO PDF export) to the platform.
3. **Infrastructure Stability:** M10 exercises the generalized commercial adapter and party parameterization. Once proven, the master resolver patterns can cleanly absorb CPS in M11 without risk of regression.

---

## 12. Risks and Unresolved Questions

### 12.1 Technical and Architectural Risks

| Risk ID | Description | Severity | Mitigation Strategy |
| :--- | :--- | :---: | :--- |
| **RSK-01** | **Bank Account Leakage on PO:** Accidental display of issuing company receiving bank accounts on supplier POs. | **HIGH** | Enforce strict TypeScript discriminator: in `preparePurchaseOrderDocument.ts`, `bankDetails` must be strictly `null`. Render layers must throw an invariant error if bank details are passed with `kind === 'purchase_order'`. |
| **RSK-02** | **Supplier Rename Mutation:** A later supplier rename altering past PO legal records. | **HIGH** | Already mitigated in PO domain: `supplier_name` is a frozen snapshot written at PO creation time (`types.ts` L14). PDF adapter must read the snapshot, never query live `suppliers` table. |
| **RSK-03** | **Withholding Tax Inversion:** Applying sales WHT deductions to procurement PO commitments. | **MEDIUM** | PO domain calculations enforce `wht = 0`. PDF totals adapter must suppress WHT rows whenever `kind === 'purchase_order'`. |
| **RSK-04** | **RAM Exhaustion on Low-Memory Host:** Compiling large multi-page PDFs exceeding 4GB RAM ceiling. | **CRITICAL** | Strictly respect memory guidelines: Never run `bun run build`. Use modular dynamic imports for template modules (`import('./forme/...')`). |
| **RSK-05** | **CPS Table Overflow:** High row counts with descriptions and image attachments exceeding single-page printable bounds. | **MEDIUM** | Verified Forme table pagination splits rows cleanly across pages; maintain `break-inside: avoid` on atomic rows. |

### 12.2 Unresolved Architectural Questions Requiring Project Lead Alignment

1. **PO Commercial Template Scope:** Should PO support all 8 commercial themes (`industrial`, `industry`, `minimal`, `evergreen`, `architectural`, `executive`, `heritage`, `landscape`), or should PO launch with a curated subset (e.g. `industrial`, `industry`, `architectural`)?
2. **Project Site Block Placement on PO:** On projects with site delivery, should the `"Deliver To · Site"` card render adjacent to `"Order From · Supplier"`, or stack below the header? (The reference HTML in `commercial-fixture.js` supports both).
3. **Master Resolver Consolidation Scope:** In M11, should CPS fully adopt `resolvePdfcnDocument()` envelope resolution, or continue using its dedicated `pdfDownloadHandler.ts` pipeline with upgraded TrueType fonts?

---

## 13. Exact Files Inspected

### Authoritative Documentation & PRD Files
- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `.agents/skills/pdf-rendering-correctness/SKILL.md`
- `docs/prd/pdf-rendering-migration/Readme.md`
- `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md`
- `docs/prd/pdf-rendering-migration/invoice-quotation-po-template-spec.md`
- `docs/prd/pdf-rendering-migration/architecture.md`
- `docs/prd/pdf-rendering-migration/functional-req.md`
- `docs/prd/cost-pricing-sheet/README.md`
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`
- `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md`
- `docs/reports/PURCHASE-ORDER/phase-c1-purchase-order-domain-and-persistence.md`
- `docs/templates/html-temps/invoice-templates/commercial-fixture.js`
- `docs/templates/html-temps/invoice-templates/commercial-document-portrait.html`

### Commercial Forme PDF Components & Infrastructure
- `src/components/pdf/forme/IndustryFormeDocument.tsx`
- `src/components/pdf/forme/IndustrialFormeDocument.tsx`
- `src/components/pdf/forme/EvergreenFormeDocument.tsx`
- `src/components/pdf/forme/ArchitecturalFormeDocument.tsx`
- `src/components/pdf/forme/ExecutiveFormeDocument.tsx`
- `src/components/pdf/forme/HeritageHouseFormeDocument.tsx`
- `src/components/pdf/forme/LandscapeFormeDocument.tsx`
- `src/components/pdf/forme/MinimalFormeDocument.tsx`
- `src/components/pdf/forme/fonts.ts`
- `src/components/pdf/forme/glyphs.tsx`
- `src/components/pdf/forme/formeRichText.tsx`
- `src/components/pdf/index.ts`
- `src/components/pdf/industryAdapter.ts`
- `src/components/pdf/table.ts`
- `src/components/pdf/types.ts`
- `src/components/pdf/engine/party.ts`
- `src/components/pdf/engine/totals.ts`
- `src/components/pdf/engine/group.ts`
- `src/components/pdf/pdfcn/adapter.ts`
- `src/lib/pdf/types.ts`
- `src/lib/pdf/CompositePdfDelivery.ts`
- `src/domain/documentMedia.ts`
- `src/components/document-view/shared/CommercialTemplatePicker.tsx`

### Supplier PO Application & Domain Files
- `src/domain/purchase-order/types.ts`
- `src/domain/purchase-order/calculations.ts`
- `src/domain/purchase-order/formAdapter.ts`
- `src/domain/purchase-order/numbering.ts`
- `src/domain/purchase-order/validation.ts`
- `src/domain/purchase-order/normalize.ts`
- `src/components/document/SharedDocumentForm.tsx`
- `src/components/document/documentDescriptor.ts`
- `src/pages/PurchaseOrderDetail.tsx`
- `src/pages/PurchaseOrderFormPage.tsx`
- `src/modules/purchase-order/purchaseOrderService.ts`
- `src/modules/purchase-order/purchaseOrderTransitions.ts`
- `src/tests/critical/purchaseOrderCalculations.test.js`

### CPS Application & Domain Files
- `src/components/pdf/forme/CpsFormeDocument.tsx`
- `src/components/pdf/forme/CpsIndustryDocument.tsx`
- `src/components/pdf/forme/LedgerCpsDocument.tsx`
- `src/components/pdf/forme/cpsScheduleGeometry.ts`
- `src/components/pdf/cpsPreparedModel.ts`
- `src/domain/cps/types.ts`
- `src/domain/cps/pdfDownloadHandler.ts`
- `src/domain/cps/calculateCpsTotals.ts`
- `src/domain/cps/columns.ts`
- `src/domain/cps/viewData.ts`
- `src/domain/cps/pdfPreferences.ts`
- `src/pages/ViewCps.tsx`
- `src/pages/view-cps-actions.ts`
- `src/tests/critical/cpsPdf.test.js`

---

## 14. Git Status Before and After

### Pre-Existing Working-Tree State
At audit start, unrelated in-progress work existed on the shared branch:
```
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Waterfall-roadmap.html
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/site-features-prd.md
 M docs/reports/Commercial_Template_Miniature_Source_And_Rendering_Audit.md
 M src/App.tsx
 M src/components/onboarding-v5/onboarding-v5-preview.tsx
 M src/components/pdf/forme/LandscapeFormeDocument.tsx
 M src/pages/Login.tsx
?? src/components/compliance/CookieConsentBanner.tsx
?? src/components/pdf/forme/landscape/
?? src/pages/PrivacyPolicy.tsx
```

### State After Audit Completion (`git status --short`)
```
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Waterfall-roadmap.html
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/site-features-prd.md
 M docs/reports/Commercial_Template_Miniature_Source_And_Rendering_Audit.md
 M src/App.tsx
 M src/components/onboarding-v5/onboarding-v5-preview.tsx
 M src/components/pdf/forme/LandscapeFormeDocument.tsx
 M src/pages/Login.tsx
?? docs/reports/PO_CPS_Forme_PDF_Sharing_Feasibility_Audit.md
?? src/components/compliance/CookieConsentBanner.tsx
?? src/components/pdf/forme/landscape/
?? src/pages/PrivacyPolicy.tsx
```

### Delta Produced Exclusively by This Audit
```
?? docs/reports/PO_CPS_Forme_PDF_Sharing_Feasibility_Audit.md
```

### Strict Zero-Code Gate Confirmation
- ✅ No application source files modified.
- ✅ No test files modified.
- ✅ No schemas, migrations, or database configurations modified.
- ✅ No packages installed or dependencies altered.
- ✅ No unauthorized commands (`bun run build`, `bun run typecheck`, `bun run lint`) executed.
- ✅ All pre-existing dirty and untracked files preserved intact without staging or modification.
- ✅ Exactly one new report file created: `docs/reports/PO_CPS_Forme_PDF_Sharing_Feasibility_Audit.md`.

---

## 15. Final Conclusion

1. **PO Integration (M10):** Direct reuse of existing Invoice/Quotation templates without adaptation is impossible due to hardcoded party terminology (`"Bill To · Client"`), client acknowledgement signatures, and company bank receiving details. However, PO can safely adopt the commercial visual design language by parameterizing commercial template subcomponents and implementing the dedicated canonical preparation contract `preparePurchaseOrderDocument.ts` (M1C).
2. **CPS Integration (M11):** Direct reuse of commercial templates is strictly prohibited by PRD invariants. CPS is an internal engineering schedule with dual pricing and margin breakdown. CPS must continue running its dedicated Forme templates (`LedgerCpsDocument.tsx` and `CpsIndustryDocument.tsx`), sharing underlying Forme fonts, media loaders, and delivery infrastructure without layout compromise.
3. **Execution Sequencing:** Milestone M1C must be authored first, followed by Milestone M10 (PO Template Integration), and subsequently Milestone M11 (CPS Template Harmonization).
