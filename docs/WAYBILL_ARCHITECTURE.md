# Waybill Module System Architecture Documentation (`WAYBILL_ARCHITECTURE.md`)

---

## 1. Executive Summary & Design Philosophy

The Waybill module is a logistical tracking mechanism designed for physical custody management, item verification, and transit tracking. It maps real-world operational workflows—such as field deliveries, gate security checks, and facility relocations—directly into application state primitives.

Unlike financial modules (e.g., Invoices), the Waybill module strips commercial metrics (rates, prices, subtotals, or taxes) to protect profit margins from field laborers, transit carriers, and third-party logistics handlers. Its single objective is inventory accountability during transit.

---

## 2. Global Core Layouts & Component Behaviors

### 2.1 The Waybill List View & The Three-State Segmented Modifier

To structure the workflow between client-facing shipments and internal relocations, the landing page includes a persistent three-state segmented filter control (`[ All ] | [ External ] | [ Internal ]`). The default state is `All`.

1. **`[ All ]` State (System Default):** Displays a combined chronological stream of every waybill entry (`SAWB-ME-*` and `SAWB-MI-*`). Selecting a client from the parent navigation filter automatically filters out internal documents, as they lack an associated client entity.
2. **`[ External ]` State (Client Delivery Notes):** Isolates outbound logistical shipments assigned to client accounts. Item cards display the destination client name, purpose badges (`Supply`, `Return`, or `Third-Party Custody`), and linked invoice association metrics.
3. **`[ Internal ]` State (Internal Transfer Notes):** Isolates tool allocation, material routing, and staff custody changes. The "Client" field is removed from the list layout cards, replacing it with an explicit routing trail: `[Releasing Location/Staff] ➔ [Receiving Location/Custodian]`. The primary client drop-down filter is disabled (`N/A`) in this view state.

### 2.2 The Waybill View Page & Field-Masking Engineering

The View Page uses conditional template masking rules to balance clean, high-contrast digital displays with functional paper backups.

* **On-Screen Display Rule:** Generic horizontal dash fallbacks (`—`) or empty row values are completely omitted from the layout tree. If an optional text parameter (such as a Driver Name or P.O. Number) is missing or blank, its structural layout container and border dividers unmount entirely from the DOM to maximize vertical scrolling real estate on mobile screens.
* **Printed PDF Copy Rule:** If fields are left blank within the creation workspace when generating the PDF copy, the rendering engine explicitly prints open, spacious pen-and-ink lines (e.g., `Delivery Location: ___________________________`). This layout optimization ensures field handlers can manually correct, update, or append real-time transit deviations directly on-site using a pen.

---

## 3. Data Flow & Lifecycle State Machine

### 3.1 Status Transitions

Waybills operate within a three-state machine optimized for immediate action. Because a waybill creation implies immediate logistical transit, there is no delayed operational footprint:

1. **`[ Dispatched ]` (Default Creation State):** Cargo has left the facility yard and is currently active on the road. The generated document serves as the official transit verification for security clearance and highway checkpoint audits.
2. **`[ Delivered ]`:** Cargo has reached its destination, and verification has been captured.
3. **`[ Returned / Rejected ]`:** The shipment was turned away at the destination gate due to incorrect specifications, site delays, or transit damages. This state flags warehouse personnel to inventory the returned items back into stock immediately, preventing asset leakage.

### 3.2 Dual-Action Custody Sign-Off Protocol

To maintain data integrity despite connectivity issues at remote sites or industrial zones, the custody verification pipeline uses a distributed dual-action validation model:

* **The Field Execution:** The carrier arrives at the destination zone. The recipient signs the physical, printed document using a standard pen.
* **The System Closure:** The driver or field engineer returns the signed physical copy to the central office (or captures and transmits a photograph via messaging channels). The system admin then updates the record state from `Dispatched` to `Delivered`, closing the custody verification trail.

---

## 4. Creation Workspace: Forms, Positioning, & Context Spawning

### 4.1 UI Layout Architecture

The Waybill Form Workspace groups information into fixed, native layout cards to structure entry flows without relying on dynamic custom headers. The fields for **DOCUMENT DETAILS**, **CLIENT & DELIVERY ADDRESS**, and **TRANSPORT DETAILS** are permanent layout cards positioned sequentially at the top of the workspace form.

### 4.2 Transport Details Interlocking Component Mutex

The `TRANSPORT DETAILS` panel contains native input fields (Driver Name, Vehicle Plate, Transport Mode, and Purpose) that use visibility interlocking rules based on the selected mode:

* **Mode: `Courier` or `Hand-Delivered`:** The `Vehicle Plate` text entry container unmounts from the view layer.
* **Mode: `Self Pick-Up`:** Both `Driver Name` and `Vehicle Plate` form fields are removed from the workspace. A structural notice updates the display: `⚠️ FORWARDING DESTINATION VIA CUSTOMER SELF-PICKUP`.

### 4.3 Form Visibility Controls (The Inline Eye 👁 Toggle)

Inline visibility overrides (`👁` / `👁‍🗨`) are positioned adjacent to the **Linked Invoice** and **P.O. Number** fields.

* Tapping the icon toggles its state to `👁‍🗨`, which keeps the field visible to the administrator within the application form but strips it from the generated PDF template and print views.

### 4.4 Invoice-To-Waybill Spawning Pipeline

When triggered via the context action menu on an active Invoice row, the application extracts data using a transformation pipeline:

* **Extraction:** Ingests the `Client ID/Name`, `P.O. Number` (if present), and the raw text strings for `Description`, `Qty`, and `Unit` from the line-item checklist table.
* **Stripping Filter:** Automatically strips out and drops all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, and `grand_total`).
* **Binding Mechanism:** The new waybill automatically assigns a reference label: `Linked Invoice: SASINV-B043`. A functional `(✕ Unlink)` text token is placed next to this label to clear the relational link if needed.

### 4.5 The Automated Incremental Blank Document Route

For emergency field tracking or network outages, the system provides a `[ Download Blank Waybill Template ]` action bypass.

1. The user selects either `[ External Delivery Note ]` or `[ Internal Transfer Note ]`.
2. The database sequence manager automatically increments the tracking index ($+1$), locking down a permanent chronological identifier prefix string (e.g., `SAWB-ME-000290` or `SAWB-MI-000291`). Whether this physical sheet is used or discarded, **the tracking number is consumed and cannot be reused**.
3. The system outputs a standard PDF layout containing the generated tracking number, clear header lines for manual writing, an open checklist grid with pre-numbered structural serial numbers (`S/N 1, 2, 3...`), and empty signature blocks at the bottom.

---

## 5. Automated Table Settings & Custom Column Logic

The Waybill table relies on automated layout definitions, dropping the user-configurable column visibility checkboxes used by the invoice system.

### 5.1 Field Classifications

* **Mandatory Columns:** `S/N` (pre-numbered structural index calculation starting at 1), `QTY`, `UNIT`, and `ITEM DESCRIPTION` are fixed system components. They cannot be hidden, deleted, or toggled.
* **Optional Logistics Columns:** `Part Number` and `Item Condition`.

### 5.2 The Automated Scanning Visibility Rule

The `Condition` column stays hidden by default on clean initialization. The system uses an automatic checker loop to manage optional column layout blocks:

```typescript
// Evaluates the presence of data properties across all line items
const showConditionColumn = items.some(item => item.item_condition && item.item_condition.trim() !== '');
const showPartNumberColumn = items.some(item => item.part_number && item.part_number.trim() !== '');

```

These boolean states are applied directly to the table layout columns (`<th />` and `<td />`). If an optional column contains only empty strings or null properties across all rows, the system automatically strips that entire column from the grid layout on both the preview page and the printed PDF, preventing table cell crowding.

---

## 6. Document Validation Gates

Before a document can save to either local SQLite storage or the remote Supabase database, it must pass through one of two distinct validation gates:

### 6.1 External Waybill Gate (Client Delivery Note)

The transaction is rejected and throws a validation alert unless it meets the following three conditions:

1. **Client Account Selected:** Must link to an active client record identifier (`client_id` or `client_name`).
2. **At Least One Valid Item:** The items array must contain at least one row entry with a description and a quantity count greater than zero.
3. **Transport Mode Selected:** A valid option must be explicitly declared within the `Transport Mode` selector.

### 6.2 Internal Waybill Gate (Internal Transfer Note)

The client account requirement is removed. The system blocks saving unless it meets the following conditions:

1. **Source Origin Declared:** The `sender_name` field must contain a valid origin workshop, store location, or releasing staff name.
2. **Target Destination Declared:** The `receiver_name` field must specify a target destination yard, job site, or receiving staff name (using inline text auto-suggestions based on historic tracking rows).
3. **At Least One Valid Item:** The checklist array must contain at least one physical item entry with a valid quantity count.

---

## 7. Concrete Relational Database Schema (Supabase DDL)

The remote Supabase schema stores all logistical records under these strict Postgres database constraints, utilizing a standard `jsonb` array format for line items to support automatic field-hiding rules:

```sql
-- DDL Migration Script: Finalizing Waybills Schema
CREATE TABLE IF NOT EXISTS public.waybills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    waybill_number text NOT NULL,
    type text NOT NULL DEFAULT 'external'::text, -- 'external' or 'internal'
    date date NOT NULL DEFAULT CURRENT_DATE,
    time time without time zone NOT NULL DEFAULT CURRENT_TIME,
    sender_name text NOT NULL,
    receiver_name text NOT NULL,
    receiver_signature_url text,
    receiver_description text,
    client_id uuid,
    client_name text,
    project_id uuid,
    invoice_id uuid,
    po_number text,
    vehicle_plate text,
    delivery_location text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array holding sn, qty, unit, description, part_number, item_condition
    notes text,
    status text NOT NULL DEFAULT 'dispatched'::text, -- 'dispatched', 'delivered', 'returned'
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    archived_at timestamp with time zone,
    CONSTRAINT waybills_pkey PRIMARY KEY (id),
    CONSTRAINT waybills_waybill_number_key UNIQUE (waybill_number),
    CONSTRAINT waybills_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
    CONSTRAINT waybills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
    CONSTRAINT waybills_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
    CONSTRAINT check_waybill_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_waybill_status CHECK (status IN ('dispatched', 'delivered', 'returned'))
);

-- Indexing for fast search execution performance across lists and state changes
CREATE INDEX IF NOT EXISTS idx_waybills_number ON public.waybills(waybill_number);
CREATE INDEX IF NOT EXISTS idx_waybills_type ON public.waybills(type);
CREATE INDEX IF NOT EXISTS idx_waybills_status ON public.waybills(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;

-- Access Control Policies
CREATE POLICY waybills_authenticated_select ON public.waybills FOR SELECT TO authenticated USING (true);
CREATE POLICY waybills_authenticated_insert ON public.waybills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY waybills_authenticated_update ON public.waybills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY waybills_authenticated_delete ON public.waybills FOR DELETE TO authenticated USING (true);

```