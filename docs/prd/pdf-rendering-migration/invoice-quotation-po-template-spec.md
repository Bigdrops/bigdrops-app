# Consolidated Commercial Document Template Specification: Invoice, Quotation & Purchase Order

**Document Version:** 1.0.0  
**Baseline Date:** October 30, 2026  
**Status:** Approved Specification Baseline (historical design spec; implementation milestone references below reflect the 2026-11 milestones)
**Scope:** BOUXRE Business Platform - Forme (`@formepdf/react`) & `pdfcn` Unified Document Template System
**Status note (2026-11-12):** Invoice/Quotation/PO Forme implementations are live through the commercial pipeline. See `Waterfall-roadmap.md` for current milestones, and `decision-log.md` (DEC-28…DEC-39) for what is certified vs merely migrated vs retired.
**Source Repository:** `c:\Users\DELL\Desktop\bigdrops-app`  

---

## 1. Executive Summary & Architecture Principles

### 1.1 Purpose and Business Roles
The BOUXRE platform serves Nigerian SMEs across commerce, engineering, contracting, logistics, and professional services. Within the platform, three core commercial transaction documents share the same operational DNA:

1. **Invoice (`invoice`)**:
   - **Business Role:** Outgoing legally-binding billing demand sent to a customer/client for goods delivered or services rendered.
   - **Financial Flow:** Accounts Receivable (AR). The issuing company expects payment from the recipient.
   - **Critical Elements:** Payment due date, company bank receiving accounts, statutory tax breakdown (VAT, Withholding Tax / WHT), balance due, payment terms.

2. **Quotation (`quotation`)**:
   - **Business Role:** Outgoing commercial offer or sales estimate submitted to a prospective or existing client for evaluation.
   - **Financial Flow:** Pre-transaction pipeline / Sales enablement. Non-binding until formally accepted.
   - **Critical Elements:** Quotation validity period ("Valid Until"), client acceptance signature block, commercial scope of works/materials, payment schedule notes.

3. **Purchase Order (`purchase_order`)**:
   - **Business Role:** Outgoing procurement contract and formal purchase commitment sent to a vendor/supplier for goods or services.
   - **Financial Flow:** Accounts Payable (AP). The issuing company authorizes an expenditure and commits to pay the supplier upon fulfillment.
   - **Critical Elements:** Supplier snapshot (vendor identity), procurement delivery terms, `unit_cost` (procurement cost, never sales price), purchasing agent / management authorization signature.

### 1.2 Core Architectural Principle: Single Shared Engine
In the BOUXRE platform frontend, all three documents are governed by a shared abstraction:
- Form Layer: [`src/components/document/SharedDocumentForm.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/SharedDocumentForm.tsx) driven by [`src/components/document/documentDescriptor.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/documentDescriptor.ts).
- Domain Calculations: Standardized calculation engines ([`src/lib/Calculations.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/Calculations.ts) and [`src/domain/purchase-order/calculations.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/purchase-order/calculations.ts)).
- Target PDF Pipeline: A single, configurable Forme / `pdfcn` template engine that dynamically renders all three documents with strict type-safety, zero data-mutation in render layers, and clean visual differentiation.

### 1.3 Inspection Evidence Sources
This specification is directly grounded in the audited production code:
- **Form Pages:**
  - [`src/pages/InvoiceFormPage.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/InvoiceFormPage.tsx)
  - [`src/pages/QuotationFormPage.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/QuotationFormPage.tsx)
  - [`src/pages/PurchaseOrderFormPage.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/PurchaseOrderFormPage.tsx)
- **Form Components:**
  - [`src/components/document/SharedDocumentForm.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/SharedDocumentForm.tsx)
  - [`src/components/document/documentDescriptor.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/documentDescriptor.ts)
  - [`src/components/document/FormHeader.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/FormHeader.tsx)
  - [`src/components/document/FormLineItems.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/FormLineItems.tsx)
  - [`src/components/document/FormCommercialTerms.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/FormCommercialTerms.tsx)
  - [`src/components/document/FormTotals.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/FormTotals.tsx)
  - [`src/components/document/FormNotesTerms.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document/FormNotesTerms.tsx)
- **Domain & Adapter Types:**
  - [`src/domain/invoice/types.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/invoice/types.ts)
  - [`src/domain/quotation/types.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/quotation/types.ts)
  - [`src/domain/purchase-order/types.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/purchase-order/types.ts)
  - [`src/domain/purchase-order/formAdapter.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/purchase-order/formAdapter.ts)
  - [`src/domain/purchase-order/calculations.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/purchase-order/calculations.ts)
- **Forme PDF Template & Adaptations (current):**
  - [`src/components/pdf/forme/IndustryFormeDocument.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/IndustryFormeDocument.tsx)
  - [`src/components/pdf/industryAdapter.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/industryAdapter.ts)
  - *Historical reference (pre-migration):* legacy React-PDF `IndustryTemplate.tsx` retired 2026-11-08.

---

## 2. Document Structure Comparison Matrix

The following matrix compares the structural sections and behaviors across the three document types:

| Document Section | Invoice (`invoice`) | Quotation (`quotation`) | Purchase Order (`purchase_order`) |
| :--- | :--- | :--- | :--- |
| **Document Badge / Title** | "INVOICE" (or custom `invoice_title`) | "QUOTATION" (or custom `quotation_title`) | "PURCHASE ORDER" (fixed system title) |
| **Document Identifier** | `invoice_number` (e.g. `INV-2026-0012`) | `quotation_number` (e.g. `QUOT-2026-0045`) | `po_number` (e.g. `PO-2026-0089`) |
| **Issuer Information** | Issuing Company (Name, RC/CAC, Address, Phone, Email, TIN) | Issuing Company (Name, RC/CAC, Address, Phone, Email, TIN) | Issuing Company / Buyer (Name, RC/CAC, Address, Phone, Email, TIN) |
| **Counterparty Section** | **Bill To · Client** (`client_name`, contact, address, TIN) | **Bill To · Client** (`client_name`, contact, address, TIN) | **Order From · Supplier / Vendor** (`supplier_name`, contact, address) |
| **Primary Date** | **Issue Date** (`issue_date`) | **Quotation Date** (`issue_date`) | **PO Date** (`po_date`) |
| **Secondary Date** | **Due Date** (`due_date`) | **Valid Until** (`valid_until`) | **N/A** (hidden in descriptor) |
| **Client Reference / PO #** | Optional `po_number` (Customer PO reference) | Optional `po_number` (Customer RFP/PO reference) | **N/A** (hidden in descriptor) |
| **Payment Terms** | Select (Net 7, 14, 30, Due on Receipt, Custom) | Commercial term / validity schedule | Procurement Payment Terms (in notes/terms) |
| **Header Custom Fields** | Supported (`custom_fields.header`) | Supported (`custom_fields.header`) | Hidden in descriptor (`hasHeaderCustomFields: false`) |
| **Line Items Grouping** | Supported (`groups`: category title + items) | Supported (`groups`: category title + items) | Flat array only (`items`: no item grouping) |
| **Pricing Model** | Sales Unit Price (`unit_price`) | Sales Unit Price (`unit_price`) | Procurement Unit Cost (`unit_cost`) |
| **Item Rates** | `install_rate`, `vat_rate`, `discount_rate` | `install_rate`, `vat_rate`, `discount_rate` | Stored in `calculation_inputs` |
| **Subtotals & Installations** | Raw Subtotal + Installation Rate Subtotal | Raw Subtotal + Installation Rate Subtotal | Net Materials/Items Subtotal |
| **Discounts** | Subtotal Discount (`subtotal_discount`) | Subtotal Discount (`subtotal_discount`) | PO Discount (`discount_value`, `discount_type`) |
| **Value Added Tax (VAT)** | Order-level standard 7.5% (or exempt/custom) | Order-level standard 7.5% (or exempt/custom) | Order-level standard 7.5% (or exempt/custom) |
| **Extra Charges** | Transportation, Workmanship, Shipping, etc. | Transportation, Workmanship, Shipping, etc. | `extra_charges: PurchaseOrderExtraCharge[]` |
| **Withholding Tax (WHT)** | Deducted (e.g. 5% or 10% deducted from payable) | Deducted (estimated deduction) | **N/A by design** (no WHT deduction on outgoing PO) |
| **Total Calculation** | `subtotal - discount + vat + extra - wht` | `subtotal - discount + vat + extra - wht` | `subtotal - discount + vat + extra` |
| **Amount in Words** | Prominently displayed under totals | Prominently displayed under totals | Prominently displayed under totals |
| **Bank Payment Details** | Issuing Company Bank Accounts (Mandatory) | Issuing Company Bank Accounts (Optional) | **Hidden** (Issuing company is paying, not receiving) |
| **Commercial Terms & Notes** | Payment terms, warranties, delivery notes | Validity terms, delivery timeline, payment notes | Vendor delivery terms, quality inspection, penalties |
| **Signatures & Approvals** | Single/Dual authorized sign-off + Stamp | Company signatory + Client acceptance block | Purchasing Officer + Authorized Approval Sign-off |

---

## 3. Detailed Field-Level Specification & Mapping

| Field Identifier | Source Model / Path | Form Descriptor Property | Invoice Label & Behavior | Quotation Label & Behavior | Purchase Order Label & Behavior | Format / Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `doc_number` | `invoice_number` / `quotation_number` / `po_number` | `numberField` | **INVOICE #** (Mandatory) | **QUOTATION #** (Mandatory) | **PO NUMBER** (Mandatory) | String (e.g. `INV-001`) |
| `doc_title` | `invoice_title` / `quotation_title` | `hasDocumentTitle` | Optional project subtitle | Optional proposal title | Hidden (`hasDocumentTitle: false`) | String |
| `primary_date` | `issue_date` / `po_date` | `dateLabel` | **Issue Date** (Mandatory) | **Quotation Date** (Mandatory) | **PO Date** (Mandatory) | ISO Date `DD/MM/YYYY` |
| `secondary_date` | `due_date` / `valid_until` | `secondaryDateLabel` | **Due Date** (Mandatory) | **Valid Until** (Mandatory) | Not Applicable (`hasSecondaryDate: false`) | ISO Date `DD/MM/YYYY` |
| `payment_terms` | `payment_terms` | `hasPaymentTerms` | **Payment Terms** (Net 30, etc.) | Commercial terms | Hidden in header; placed in notes | Enum / String |
| `po_reference` | `po_number` (Client reference) | `hasPoNumber` | **Client PO Ref** (Optional) | **Client RFQ Ref** (Optional) | Hidden (`hasPoNumber: false`) | String |
| `party_id` | `client_id` / `supplier_id` | `counterpartyType` | Client UUID | Client UUID | Supplier UUID | UUID |
| `party_name` | `client.name` / `supplier_name` | `counterpartyLabel` | **Bill To:** Client Name | **Bill To:** Client Name | **Order From:** Supplier Name | String (Bold) |
| `party_address`| `client.address` / `supplier_address` | Counterparty block | Client physical address | Client physical address | Supplier physical address | Multi-line text |
| `party_contact`| `client.phone`, `client.email` | Counterparty block | Client phone & email | Client phone & email | Supplier phone & email | Phone / Email string |
| `party_tax_id` | `client.tax_id` / `client.tin` | Counterparty block | Client TIN / VAT Reg | Client TIN / VAT Reg | Supplier TIN (if registered) | Tax ID string |
| `item_number` | Line item index (1-based) | Table index | `#` | `#` | `#` | Integer (1, 2, 3...) |
| `item_desc` | `item.description` | Line item description | Description + specifications | Description + specifications | Description + part numbers | Multi-line text |
| `item_make` | `item.make` | Make / Model | Make / Brand / Model | Make / Brand / Model | Make / Manufacturer / Model | Short string |
| `item_qty` | `item.quantity` | Quantity | Quantity ordered | Quantity quoted | Quantity ordered | Numeric (formatted) |
| `item_unit` | `item.unit` | Unit of measure | Unit (pcs, m, hrs, kg) | Unit (pcs, m, hrs, kg) | Unit (pcs, bags, coils) | Short string |
| `item_price` | `item.unit_price` / `item.unit_cost` | Price column | **Unit Price** (Sales price) | **Unit Price** (Sales price) | **Unit Cost** (Procurement cost) | Currency `₦ #,##0.00` |
| `item_amount` | `item.amount` | Computed line total | Line Amount | Line Amount | Line Amount | Currency `₦ #,##0.00` |
| `subtotal` | `subtotal` | `totals.subtotal` | Gross Subtotal | Gross Subtotal | Procurement Subtotal | Currency `₦ #,##0.00` |
| `install_total`| `installation_amount` | `totals.installation` | Installation / Labour (Optional) | Installation / Labour (Optional) | N/A | Currency `₦ #,##0.00` |
| `discount` | `subtotal_discount` / `discount_value` | `totals.discount` | Discount (Percentage or Fixed) | Discount (Percentage or Fixed) | Discount (Percentage or Fixed) | Negative Currency |
| `vat` | `vat_amount` | `totals.vat` | VAT (7.5% standard) | VAT (7.5% standard) | VAT (7.5% standard) | Currency `₦ #,##0.00` |
| `extra_charges`| `extra_charges` (Workmanship, etc.) | `totals.extraCharges` | Additional Charges (Itemized) | Additional Charges (Itemized) | Additional Charges (Itemized) | Currency `₦ #,##0.00` |
| `wht` | `wht_amount` | `totals.wht` | Withholding Tax Deducted | Withholding Tax Deducted | **N/A** (PO has no WHT deduction) | Deducted Currency |
| `grand_total` | `total_amount` | `totals.grandTotal` | **Total Amount Due** | **Total Quoted Amount** | **Total Order Amount** | Currency (Prominent) |
| `words_amount` | `amount_in_words` | `totals.inWords` | Amount in words (Naira & Kobo) | Amount in words (Naira & Kobo) | Amount in words (Naira & Kobo) | Formatted string |
| `bank_accounts`| `company_bank_details` | Banking block | Issuing Company Bank Accounts | Issuing Company Bank Accounts | **Omitted** (Issuing company pays) | Card / Table block |
| `notes` | `notes` | Notes & Instructions | Customer notes / Instructions | Proposal notes / Exclusions | Delivery instructions / Warehouse | Multi-line text |
| `terms` | `terms` | Terms & Conditions | Payment terms & late fees | Proposal validity & scope terms | Procurement terms & inspections | Multi-line text |
| `signatures` | `signatories` / approval | Authorization block | Authorized Officer + Client Ack | Authorized Sales Executive | Purchasing Officer + Managing Dir | Dual signature lines |

---

## 4. Line-Item Table Structure & Pagination Logic

### 4.1 Column Definitions and Responsive Widths
The line-item table must maintain clear column budget allocation across an A4 printable width ($180\text{ mm}$ printable width assuming $15\text{ mm}$ side margins):

| Column # | Column Key | Column Header (Inv / Quo) | Column Header (PO) | Width Allocation | Alignment | Content Constraints |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | `item_num` | `#` | `#` | 5% (~9mm) | Center | Monospace integer, vertically centered |
| **2** | `description` | Item & Description | Item & Description | 45% (~81mm) | Left | Primary item name in bold, specs/make in lighter secondary line |
| **3** | `quantity` | Qty | Qty | 10% (~18mm) | Right | Formatted number, optional unit suffix |
| **4** | `unit` | Unit | Unit | 10% (~18mm) | Center | Standard unit string (pcs, sets, hrs, m, lot) |
| **5** | `rate` | Unit Price | Unit Cost | 15% (~27mm) | Right | Formatted Nigerian Naira (`₦ #,##0.00`) |
| **6** | `amount` | Amount | Amount | 15% (~27mm) | Right | Formatted Nigerian Naira (`₦ #,##0.00`), bold |

### 4.2 Grouping and Category Behavior
- **Invoice & Quotation:** Support hierarchical line items via `groups`. Each group possesses a `group_title` (e.g. "Phase 1: Civil Works" or "Hardware Procurement") and an optional `group_subtotal`. Group headers must never be left as orphans at the bottom of a page (`break-after: avoid`).
- **Purchase Order:** Flat list of procurement line items without groups. Clean, dense tabular rendering.

### 4.3 Natural Pagination & Table Splitting
- **Repeat Header:** On continuation pages, the table header row MUST automatically repeat at the top of the content area.
- **Atomic Rows:** Individual line-item rows must have `break-inside: avoid` to prevent description text from being split awkwardly across page boundaries.
- **Row Padding:** Minimum $6\text{ pt}$ ($2.1\text{ mm}$) vertical padding per row, reducing to $4\text{ pt}$ ($1.4\text{ mm}$) under dense/compact presentation.

---

## 5. Financial Summary / Totals Structure & Calculation Rules

### 5.1 Mathematical Ordering of Rows
Financial calculations must strictly follow the verified domain rules in [`src/lib/Calculations.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/Calculations.ts) and [`src/domain/purchase-order/calculations.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/purchase-order/calculations.ts):

$$\text{Subtotal} = \sum (\text{Quantity} \times \text{Unit Price/Cost})$$

$$\text{Net Subtotal} = \text{Subtotal} + \text{Installation Subtotal} - \text{Subtotal Discount}$$

$$\text{VAT Amount} = \text{Net Subtotal} \times \text{VAT Rate (e.g. 7.5\%)}$$

$$\text{Extra Charges} = \sum (\text{Transportation} + \text{Workmanship} + \text{Other Surcharges})$$

$$\text{Withholding Tax (WHT)} = \text{Net Subtotal} \times \text{WHT Rate (e.g. 5\% or 10\%) } \quad \text{[Invoice/Quotation Only]}$$

$$\text{Total (Invoice/Quotation)} = \text{Net Subtotal} + \text{VAT Amount} + \text{Extra Charges} - \text{WHT Amount}$$

$$\text{Total (Purchase Order)} = \text{Net Subtotal} + \text{VAT Amount} + \text{Extra Charges}$$

### 5.2 Explicit Withholding Tax (WHT) Rule
> [!IMPORTANT]
> **WHT Asymmetric Rule:**
> - In Nigerian corporate transactions, Withholding Tax is an advance payment of income tax that the client deducts from an invoice before remitting the net amount to the vendor. Therefore, on **Invoices** and **Quotations**, WHT is a deduction that reduces the final payable amount.
> - On a **Purchase Order**, the issuing company is the buyer placing an order to purchase goods from a vendor. Standard PO totals reflect the gross purchase commitment (`Subtotal + VAT + Extra Charges`). WHT deductions are handled downstream at invoice settlement and are **excluded** from the PO total calculation.

### 5.3 Amount in Words
- Every document must display the grand total formatted in legal words immediately below or adjacent to the totals block (e.g., *"Seven Million, Four Hundred and Fifty-Two Thousand, Five Hundred Naira Only"*).
- If kobo is present: `... Naira and Fifty Kobo Only`.

---

## 6. Supporting & Ancillary Sections

### 6.1 Banking & Settlement Details
- **Invoice:** Highly prominent bank settlement card. Displays Issuing Company Name, Primary Bank Name, Account Number, and Account Name. An optional secondary bank account may be listed.
- **Quotation:** Optional/informative bank block. May display banking details for advance payment deposits, or simply note *"Payment terms: 70% advance, 30% upon completion"*.
- **Purchase Order:** **Omitted**. The issuing company does not receive money on a PO. Instead, this area is allocated to **Supplier Payment Terms** (e.g., *"Payment within 30 days upon receipt of delivery and verified invoice"*) or **Delivery Instructions** (e.g., *"Deliver to Warehouse 4, Ikeja Industrial Estate"*).

### 6.2 Notes, Scope & Commercial Terms
- **Notes Block:** Freeform text for project descriptions, delivery windows, warranty periods, or special instructions.
- **Terms & Conditions:** Formal legal conditions (payment milestones, title transfer, late payment interest, dispute resolution).

### 6.3 Signatures & Authorization Blocks
- **Invoice:**
  - Column 1: Issuer Authorized Signatory (Name, Title, Signature Line, Company Stamp).
  - Column 2: Client Receiving / Confirmation Acknowledgement (Received By, Date, Signature).
- **Quotation:**
  - Column 1: Prepared By / Sales Representative Signatory.
  - Column 2: Client Acceptance Block (*"Accepted & Approved by Client"* with Date & Signature).
- **Purchase Order:**
  - Column 1: Purchasing Officer / Requisitioner (Name, Signature, Date).
  - Column 2: Management / Finance Authorization Approval (Managing Director / CFO Signature & Stamp).

---

## 7. Print & Page Layout Specifications

### 7.1 Geometry & Dimensions
- **Page Size:** ISO A4 ($210\text{ mm} \times 297\text{ mm}$, $595.28\text{ pt} \times 841.89\text{ pt}$).
- **Orientation:** Portrait.
- **Page Margins:** $15\text{ mm}$ ($42.5\text{ pt}$) top, bottom, left, and right.
- **Usable Printable Width:** $180\text{ mm}$ ($510.28\text{ pt}$).
- **Usable Printable Height:** $267\text{ mm}$ ($756.89\text{ pt}$).

### 7.2 Multi-Page Continuation & Pagination Rules
1. **Running Header on Page 2+:**
   - Displays compact document number, document badge, client/vendor name, and page number indicator.
   - Height: $12\text{ mm}$ ($34\text{ pt}$).
2. **Table Header Continuation:**
   - Must automatically repeat at the start of continuation pages (`thead { display: table-header-group; }`).
3. **Running Footer:**
   - Positioned at the bottom margin ($15\text{ mm}$ from page edge).
   - Contains: Confidentiality note, company registration (RC Number), software tag ("Powered by BOUXRE"), and page number indicator (`Page X of Y`).
4. **Orphan & Widow Prevention:**
   - Totals and Signatures block must be kept together (`break-inside: avoid`).
   - If fewer than 2 line items fit on the first page above the totals block, the totals block cleanly transitions to the continuation page with proper breathing room.

---

## 8. Two Distinct HTML Reference Templates Design Strategy

To provide flexible, production-grade visual choices for the upcoming Forme implementation, exactly two distinct reference templates are constructed:

### Template 1: "Modern Executive" (Ref: `commercial-document-template-1.html`)
- **Aesthetic:** Corporate, authoritative, high-contrast executive styling.
- **Color Palette:**
  - Primary Brand: Deep Navy (`#0F172A`)
  - Accent / Highlights: Steel / Cobalt Blue (`#0284C7`)
  - Neutral Base / Text: Dark Slate (`#1E293B`)
  - Card & Table Backgrounds: Subtle Ice / Off-White (`#F8FAFC`)
  - Borders: Crisp Light Slate (`#E2E8F0`)
- **Structural Layout:**
  - Header: Asymmetrical executive layout. Left side hosts brand logo and issuer metadata; right side features a bold deep-navy document badge chip with prominent document number and dates.
  - Counterparty Block: Two clean cards side-by-side with subtle backgrounds and top accent borders.
  - Line Items Table: Clean bordered grid with alternating zebra striping on even rows and bold numeric right-alignment.
  - Lower Section: Decoupled two-column layout. Left column houses the Bank Card (or Delivery Instructions for PO) and Notes; right column houses the stacked financial summary with a prominent Grand Total callout.

### Template 2: "Technical Industrial" (Ref: `commercial-document-template-2.html`)
- **Aesthetic:** Clean architectural blueprint, high-density industrial engineering.
- **Color Palette:**
  - Primary Brand: Warm Charcoal / Onyx (`#18181B`)
  - Accent / Badges: Industrial Warm Amber / Ochre (`#D97706`)
  - Neutral Base / Text: Deep Zinc (`#27272A`)
  - Card & Header Fills: Warm Stone Tint (`#F4F4F5`)
  - Borders: Structured Charcoal Dividers (`#D4D4D8`)
- **Structural Layout:**
  - Header: Full-width industrial masthead with an uppercase tracked title band, top thick rule, and structured metadata badge chips.
  - Counterparty Block: Heavy-divider metadata grid with explicit labeled section badges ("BUYER / CLIENT" vs "VENDOR / SUPPLIER").
  - Line Items Table: High-density technical table with clear vertical column dividers, uppercase micro-typography headers, and monospace quantity/amount formatting.
  - Lower Section: Horizontal rail layout. Bank/Payment details and authorization stamps are enclosed in boxed specification modules, flanked by a high-contrast dark total box.

### Dynamic Switching Capability
Both HTML reference templates incorporate an interactive preview controller:
- Instant switcher buttons for **Invoice**, **Quotation**, and **Purchase Order**.
- Real-time switching updates all terminology, counterparty headers, specific date fields, banking vs delivery blocks, WHT deduction vs gross total calculations, and signatory titles.
- Fully print-ready via browser Print (`Ctrl+P` / `Cmd+P` $\to$ Save as PDF) at exact A4 dimensions.

---

## 9. Forme & `pdfcn` Implementation Mapping

When implementing these templates in Milestone M1/M2 using `@formepdf/react` and `pdfcn`:

1. **Tokens (`pdfcn`):**
   - Spacing: `pdfcn.space.xs` ($4\text{ pt}$), `pdfcn.space.sm` ($8\text{ pt}$), `pdfcn.space.md` ($12\text{ pt}$), `pdfcn.space.lg` ($16\text{ pt}$).
   - Typography: Inter font family (`Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`, `Inter-Bold`) loaded via `@formepdf/react` Font registry.
   - Borders: $0.5\text{ pt}$ hairline and $1\text{ pt}$ standard borders.
2. **Component Architecture:**
   - `<DocumentHeader mode={docType} />`
   - `<PartyBlock mode={docType} counterparty={party} />`
   - `<LineItemsTable mode={docType} items={items} />`
   - `<FinancialTotals mode={docType} totals={totals} />`
   - `<AncillaryDetails mode={docType} bank={bank} notes={notes} terms={terms} />`
   - `<SignatoryBlock mode={docType} signatories={signatories} />`
   - `<DocumentFooter pageNumber={page} totalPages={total} />`
3. **Data Immutability:**
   - Templates receive a pre-calculated, frozen `PdfDocumentModel`.
   - Render layers perform zero mathematical recalculation or state mutation.
