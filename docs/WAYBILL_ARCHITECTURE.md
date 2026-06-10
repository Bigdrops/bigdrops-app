# Waybill Module System Architecture Documentation (`WAYBILL_ARCHITECTURE.md`)

---

## 1. Executive Summary & Design Philosophy

The Waybill module is a logistical tracking mechanism designed for physical custody management, item verification, and transit tracking. It maps real-world operational workflows—such as field deliveries, gate security checks, and facility relocations—directly into application state primitives.

Unlike financial modules (e.g., Invoices), the Waybill module strips commercial metrics (rates, prices, subtotals, or taxes) to protect profit margins from field laborers, transit carriers, and third-party logistics handlers. Its single objective is inventory accountability during transit.

---

## 2. Global Core Layouts & Component Behaviors

### 2.1 The Waybill List View & The Three-State Segmented Modifier

To structure the workflow between client-facing shipments and internal relocations, the landing page includes a persistent three-state segmented filter control (`[ All ] | [ External ] | [ Internal ]`). The default state is `All`.

1. 
**`[ All ]` State (System Default):** Displays a combined chronological stream of every waybill entry. Selecting a client from the parent navigation filter automatically filters out internal documents, as they lack an associated client entity.


2. 
**`[ External ]` State (Client Delivery Notes):** Isolates outbound logistical shipments assigned to client accounts. Item cards display the destination client name , **Waybill Purpose** badges (`Supply`, `Return`, or `Third-Party Custody`), and linked invoice association metrics.


3. 
**`[ Internal ]` State (Internal Transfer Notes):** Isolates tool allocation, material routing, and staff custody changes. The "Client" field is removed from the list layout cards, replacing it with an explicit routing trail: `[Releasing Location/Staff] ➔ [Receiving Location/Custodian]`. The primary client drop-down filter is disabled (`N/A`) in this view state.



### 2.2 The Waybill View Page & Field-Masking Engineering

The View Page uses conditional template masking rules to balance clean, high-contrast digital displays with functional paper backups.

* 
**On-Screen Display Rule:** Generic horizontal dash fallbacks (`—`) are explicitly rendered when optional parameters are empty or unassigned (such as an empty `driver_name` or `vehicle_plate` from a manual entry bypass). If an entire optional text container is completely missing from the schema context, it unmounts from the DOM to maximize mobile screen space.


* **Printed PDF Copy Rule:** If fields like `Driver's Name` or `Vehicle Reg. [cite_start]No.` are left blank within the workspace (common in manual entry bypasses), the PDF rendering engine explicitly prints open, spacious pen-and-ink lines (e.g., `Driver's Name: ___________________________`). This optimization ensures handlers on-site can write real-time transit deviations directly on the physical document with a pen.



---

## 3. Data Flow & Lifecycle State Machine

### 3.1 Status Transitions

Waybills operate within a four-state machine optimized for immediate physical transit while accounting for real-world office processing delays:

1. 
**`[ Dispatched ]` (Default Creation State):** Cargo has left the facility yard and is active on the road. The generated document serves as the official transit verification for security clearance and highway checkpoint audits.


2. 
**`[ Pending Confirmation ]` (Intermediate Custody State):** The carrier has successfully arrived at the destination site and secured a physical, written ink-and-pen signature from the receiving agent. The physical custody loop is executed on-site, but the document waits for an administrator to review the physical or digitized copy back at the operating office.


3. 
**`[ Delivered ]` (Closed Lifecycle State):** The administrator verifies the signature copy, files the physical slip, and locks the database row state. This closes the custody verification trail permanently.


4. 
**`[ Returned / Rejected ]`:** The shipment was turned away at the destination gate due to incorrect specifications, site delays, or transit damages. This state flags warehouse personnel to inventory the returned items back into stock immediately, preventing asset leakage.



### 3.2 Dual-Action Custody Sign-Off Protocol

To maintain data integrity despite connectivity issues at remote sites or industrial zones, the custody verification pipeline uses a distributed dual-action validation model:

* 
**The Field Execution:** The carrier arrives at the destination zone. The recipient signs the physical, printed document using a standard pen.


* 
**The System Closure:** The driver or field engineer returns the signed physical copy to the central office (or captures and transmits a photograph via messaging channels). The system admin then updates the record state from `Dispatched` to `Delivered`, closing the custody verification trail.



---

## 4. Document Numbering & Dynamic Prefix Engine

To prevent hardcoding vendor-specific identities within core database tables or application logic loops, the tracking serialization is driven by an abstract prefix generator configuration.

### 4.1 System Defaults & Structural Formatting

By default, the core engine produces a generic, standardized baseline sequence layout format. The absolute neutral structure represents:

* **External Delivery Note Default Format:** `AWB-E-000001`
* **Internal Transfer Note Default Format:** `AWB-I-000001`

### 4.2 The Manual Integration Override Matrix

The extra literal tracking token character `M` is structurally injected to distinctly denote a **Manual Entry / Printed Blank Bypass Document** that bypasses automated application item parsing. When an engine context initializes under a manual action handler, the generation pipeline splits:

| Transaction Mode | Standard Digital Generation | Manual / Blank Download Bypass |
| --- | --- | --- |
| **External Outbound Route** | `[PREFIX]-E-[SERIAL]` | `[PREFIX]-ME-[SERIAL]` |
| **Internal Relocation Route** | `[PREFIX]-I-[SERIAL]` | `[PREFIX]-MI-[SERIAL]` |

### 4.3 Dynamic Sequence Resolution Logic

The system evaluates sequence pattern definitions dynamically at runtime using an evaluation function, appending tracking updates into a permanent sequence state table to preserve transactional history:

```typescript
export const generateWaybillSequenceNumber = (
  currentSequence: number, 
  isManual: boolean, 
  isInternal: boolean, 
  configuredPrefix?: string
): string => {
  const basePrefix = (configuredPrefix || 'AWB').toUpperCase().trim();
  const routingToken = isInternal ? 'I' : 'E';
  const manualToken = isManual ? 'M' : '';
  
  const serializedNumber = String(currentSequence).padStart(6, '0');
  return `${basePrefix}-${manualToken}${routingToken}-${serializedNumber}`;
};

```

---

## 5. Creation Workspace: Forms & Delivery Mode Field Interlocking

The form cards for **DOCUMENT DETAILS**, **CLIENT & DELIVERY ADDRESS**, and **TRANSPORT DETAILS** are permanent layout blocks positioned sequentially at the top of the workspace form. Field displays adapt dynamically based on selection.

### 5.1 Form Fields Visibility Logic

* 
**`[ By Vehicle ]` Mode:** The system renders the complete vehicle transport layout container. Both `Driver Name` and `Vehicle Plate` are treated as core input layouts to track the operating vehicle's properties.


* 
**`[ By Hand ]` Mode:** The system strips vehicle asset properties from the form workflow. The `Driver Name` container stays active, but the `Vehicle Plate` text container unmounts completely from the UI layout tree to prevent clutter.


* 
**`[ Courier ]` or `[ Self Pick-Up ]` Modes:** These third-party transport channels still utilize vehicles. The form retains the layout structures for vehicle validation metrics, allowing operators to log dispatcher details, third-party carrier registration codes, or client pickup transport tags.


* 
**`[ Blank / Manual Unselected ]` Mode (Default State):** If left entirely blank (for manual field tracking entries), the form container displays fields natively as optional inputs. No UI save errors are thrown.



### 5.2 Form Visibility Controls (The Inline Eye 👁 Toggle)

Inline visibility overrides (`👁` / `👁‍🗨`) are positioned adjacent to the **Linked Invoice** and P.O. Number fields.

* Tapping the icon toggles its state to `👁‍🗨`, which keeps the field visible to the administrator within the application form but strips it from the generated PDF template and print views.



### 5.3 Invoice-To-Waybill Spawning Pipeline

When triggered via the context action menu on an active Invoice row, the application extracts data using a transformation pipeline:

* **Extraction:** Ingests the `Client ID/Name`, `P.O. [cite_start]Number` (if present), and the raw text strings for `Description`, `Qty`, and `Unit` from the line-item checklist table.


* 
**Stripping Filter:** Automatically strips out and drops all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, and `grand_total`).


* 
**Binding Mechanism:** The new waybill automatically assigns a reference label tracking the parent document ID. A functional `(✕ Unlink)` text token is placed next to this label to clear the relational link if needed.



### 5.4 The Automated Incremental Blank Document Route & Reconciliation Closure

For emergency field tracking or network outages, the system provides a `[ Download Blank Waybill Template ]` action bypass.

1. The user selects either `[ External Delivery Note ]` or `[ Internal Transfer Note ]`.


2. The sequence engine inserts a row tracking record into the `blank_waybill_logs` table, increments the counter ($+1$), and locks down a permanent tracking identifier sequence (e.g., `AWB-ME-000290`).


3. If the application crashes, files break mid-transit, or the paper is physically ruined, **this tracking number remains permanently consumed inside the database log history** and can never be recycled or duplicated.


4. 
**Reconciliation Loop:** When the physical paper waybill returns from the field, the operator creates a formal digital record. The user inserts the tracking number, and the database updates the corresponding `blank_waybill_logs` row by populating `linked_waybill_id` and stamping `reconciled_at`. This links the burned token back to a verifiable database document entity.



---

## 6. Automated Table Settings & Custom Column Logic

The Waybill table relies on automated layout definitions, dropping the user-configurable column visibility checkboxes used by the invoice system.

### 6.1 Field Classifications

* 
**Mandatory Columns:** `S/N` (pre-numbered structural index calculation starting at 1), `QTY`, `UNIT`, and `ITEM DESCRIPTION` are fixed system components. They cannot be hidden, deleted, or toggled.


* 
**Optional Logistics Columns:** `Part Number` and `Item Condition`.



### 6.2 The Automated Scanning Visibility Rule

The `Condition` column stays hidden by default on clean initialization. The system uses an automatic checker loop to manage optional column layout blocks:

```typescript
const showConditionColumn = items.some(item => item.item_condition && item.item_condition.trim() !== '');
const showPartNumberColumn = items.some(item => item.part_number && item.part_number.trim() !== '');

```

These boolean states are applied directly to the table layout columns (`<th />` and `<td />`). If an optional column contains only empty strings or null properties across all rows, the system automatically strips that entire column from the grid layout on both the preview page and the printed PDF, preventing table cell crowding.

---

## 7. Document Validation Gates

Before a document can save to either local SQLite storage or the remote Supabase database, it must pass through one of two distinct validation gates:

### 7.1 External Waybill Gate (Client Delivery Note)

The transaction is rejected and throws a validation alert unless it meets the following **four mandatory conditions**:

1. 
**`waybill_number`**: A unique tracking identifier generated by the prefix engine.


2. 
**Client Account Selected:** Must link to an active client record identifier (`client_id` or `client_name`).


3. 
**At Least One Valid Item:** The items array must contain at least one row entry with a description and a quantity count greater than zero.


4. 
**`type`**: Explicitly declared as `'external'`.
(Note: `transport_mode` is entirely optional at the database layer and during layout creation to safely support open manual processing loops.)



### 7.2 Internal Waybill Gate (Internal Transfer Note)

The client account requirement is removed. The system blocks saving unless it meets the following **five mandatory conditions**:

1. 
**`waybill_number`**: A unique tracking identifier generated by the prefix engine.


2. 
**Source Origin Declared:** The `sender_name` field must contain a valid origin workshop, store location, or releasing staff name.


3. 
**Target Destination Declared:** The `receiver_name` field must specify a target destination yard, job site, or receiving staff name.


4. 
**At Least One Valid Item:** The checklist array must contain at least one physical item entry with a valid text description and a numeric quantity count greater than zero.


5. 
**`type`**: Explicitly declared as `'internal'`.



---

## 8. Concrete Relational Database Schema (Supabase DDL)

The remote Supabase schema stores all logistical records under strict Postgres database constraints. It utilizes a custom JSONB array schema constraint to ensure structural conformity while natively preserving custom UI extension fields:

```sql
-- DDL Migration Script: Finalizing Waybills & Blank Token System Logging Tables
CREATE TABLE IF NOT EXISTS public.waybills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    waybill_number text NOT NULL,
    type text NOT NULL DEFAULT 'external'::text,             -- 'external' or 'internal'
    date date NOT NULL DEFAULT CURRENT_DATE,
    purpose text,                                            -- 'Supply', 'Return', 'Third-Party Custody' (Strictly NULL for internal)
    transport_mode text,                                     -- Optional: 'By Vehicle', 'By Hand', 'Courier', 'Self Pick-Up' (Nullable for manual sheets)
    sender_name text NOT NULL,
    receiver_name text NOT NULL,
    driver_name text,
    vehicle_plate text,
    delivery_location text,
    receiver_signature_url text,
    receiver_description text,
    client_id uuid,
    client_name text,
    project_id uuid,
    invoice_id uuid,
    po_number text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,                -- Array holding core line item metrics
    custom_fields jsonb,                                     -- Dynamic container to match application local storage extensions
    notes text,
    status text NOT NULL DEFAULT 'dispatched'::text,         -- 'dispatched', 'pending_confirmation', 'delivered', 'returned'
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    archived_at timestamp with time zone,
    
    CONSTRAINT waybills_pkey PRIMARY KEY (id),
    CONSTRAINT waybills_waybill_number_key UNIQUE (waybill_number),
    CONSTRAINT waybills_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
    CONSTRAINT waybills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
    CONSTRAINT waybills_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
    CONSTRAINT check_waybill_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_waybill_status CHECK (status IN ('dispatched', 'pending_confirmation', 'delivered', 'returned')),
    CONSTRAINT check_waybill_transport_mode CHECK (transport_mode IS NULL OR transport_mode IN ('By Vehicle', 'By Hand', 'Courier', 'Self Pick-Up')),
    
    -- BUSINESS MUTEX: Ensures purpose is assigned on external, and remains strictly NULL on internal relocations
    CONSTRAINT check_waybill_purpose_conditional CHECK (
        (type = 'external' AND purpose IN ('Supply', 'Return', 'Third-Party Custody')) OR
        (type = 'internal' AND purpose IS NULL)
    ),
    
    -- WATERPROOF STRUCTURAL CHECK: Forces array presence, blocks blank rows, and ensures numeric quantities > 0
    CONSTRAINT check_items_json_structure CHECK (
        jsonb_typeof(items) = 'array' AND 
        jsonb_array_length(items) > 0 AND 
        NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(items) AS elem
            WHERE NOT (elem ? 'description') 
               OR NOT (elem ? 'qty') 
               OR jsonb_typeof(elem->'qty') != 'number'
               OR (elem->>'qty')::numeric <= 0
        )
    )
);

-- BLANK DOCUMENT AUDIT LOG: Tracks burned bypass codes and connects back to reconciled identities
CREATE TABLE IF NOT EXISTS public.blank_waybill_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_waybill_number text NOT NULL,
    type text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_waybill_id uuid,
    reconciled_at timestamp with time zone,
    
    CONSTRAINT blank_waybill_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_waybill_logs_number_key UNIQUE (assigned_waybill_number),
    CONSTRAINT blank_waybill_logs_linked_waybill_id_fkey FOREIGN KEY (linked_waybill_id) REFERENCES public.waybills(id) ON DELETE SET NULL,
    CONSTRAINT check_blank_log_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_waybill_id IS NULL AND reconciled_at IS NULL) OR
        (linked_waybill_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);

-- Indexing for high-speed search performance across dashboard tracking metrics
CREATE INDEX IF NOT EXISTS idx_waybills_number ON public.waybills(waybill_number);
CREATE INDEX IF NOT EXISTS idx_waybills_type ON public.waybills(type);
CREATE INDEX IF NOT EXISTS idx_waybills_status ON public.waybills(status);
CREATE INDEX IF NOT EXISTS idx_blank_waybills_number ON public.blank_waybill_logs(assigned_waybill_number);
CREATE INDEX IF NOT EXISTS idx_blank_waybill_logs_linked_id ON public.blank_waybill_logs(linked_waybill_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blank_waybill_logs ENABLE ROW LEVEL SECURITY;

-- Access Control Policies (Scoped to Authenticated App Environment Sessions)
CREATE POLICY waybills_authenticated_all ON public.waybills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY blank_waybill_logs_authenticated_all ON public.blank_waybill_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

```