# CSR Live Form — Forensic Wireframe Specification

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## 1. Form Identity

| Property | Value |
|---|---|
| Form name | CSR Form (Customer Service Report) |
| Route entry (create) | `/csr/new` → `NewCSR` → `CsrFormPage(mode='create')` |
| Route entry (edit) | `/csr/:id/edit` → `EditCSR` → `CsrFormPage(mode='edit')` |
| Primary component | `src/components/csr/CsrFormScreen.tsx` |
| Page wrapper | `src/pages/CsrFormPage.tsx` |
| Domain model | `CsrObject` (defined in `src/components/csr/csrUtils.ts`) |
| Service layer | `src/domain/csr/csrService.ts` |
| CSR types | Normal (standard) or Field (`?type=field` query param) |
| Offline support | Android Capacitor: offline draft creation via `csrOffline.ts` |
| Max-width | `max-w-md` (narrower than waybill/invoice) |

---

## 2. Create vs Edit: Gateway

CSR has no gateway overlay. In create mode, the form renders directly.

**Field mode:** Accessed via `/csr/new?type=field`. Sets default status to "Field Entry Pending" instead of "Complete". On save in field mode, auto-generates and downloads PDF.

---

## 3. Complete Section Inventory (in order)

| # | Section | Dot Color | Description |
|---|---|---|---|
| 1 | Document Details | slate-900 | Title, client selector, CSR number, date, customer name, PO number |
| 2 | Item Controls | slate-700 | Import button |
| 3 | Main Details | violet | Call type, service basis, system down |
| 4 | Equipment | slate-600 | Equipment type, location, make, capacity, model, serial no, engine no |
| 5 | Problem & Service | rose | Problem reported, service rendered, defects found, engineer remarks |
| 6 | Service Execution | slate-900 | Start date/time, end date/time, status after service |
| 7 | Operational Readings | amber-500 | Voltage, frequency, battery, temperature, pressure, hours (collapsible via toggle) |
| 8 | Materials Used | emerald | Material rows (item, qty, unit) with editable section title, add/remove |
| 9 | Technician | sky-500 | Technician name, signatory selection (collapsible via toggle) |
| 10 | Acknowledgement | slate-900 | Recipient name/title, comment, recipient signature upload (collapsible via toggle) |
| 11 | Save FAB / Download Blank | — | Floating save button + download blank button (desktop) |

---

## 4. Complete Field Inventory

### 4.1 Document Details Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| C-01 | Doc Details | Client Selector | Client | Editable (create), Locked (edit) | Yes (except field mode) | Click opens ClientSelector overlay | In edit mode: locked with lock icon, click opens IdentityLockDialog |
| C-02 | Doc Details | TextInput | CSR Number | Editable (create), Locked (edit) | Yes | Auto-generated, mono font. In edit: display-only span. | — |
| C-03 | Doc Details | Date Input | Date | Editable | Optional | Date picker (native), defaults to today | — |
| C-04 | Doc Details | TextInput | Customer Name | Editable (create), Locked (edit) | Optional | Text input. In edit: locked display. | — |
| C-05 | Doc Details | TextInput | PO Number | Editable | Optional | Text input. Sets `show_po` to true when non-empty. | — |

### 4.2 Item Controls Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| IC-01 | Item Controls | Button | Import | Editable | — | Opens CsrImportSheet (bottom sheet) | — |

### 4.3 Main Details Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| M-01 | Main | Select | Call Type | Editable | Optional | Options: "Breakdown", "Preventive Maintenance", "Installation", "Commissioning", "Inspection", "Emergency Repair", "Other" | — |
| M-02 | Main | Select | Service Basis | Editable | Optional | Options: "Paid Service", "AMC", "Warranty" | — |
| M-03 | Main | Select | System Down | Editable | Optional | Options: "Yes", "No". Stored as boolean in DB (true/false/null). | — |

### 4.4 Equipment Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| E-01 | Equipment | TextInput | Equipment Type | Editable | Optional | Text input | — |
| E-02 | Equipment | TextInput | Equipment Location | Editable | Optional | Text input | — |
| E-03 | Equipment | TextInput | Make | Editable | Optional | Text input | — |
| E-04 | Equipment | TextInput | Capacity | Editable | Optional | Text input | — |
| E-05 | Equipment | TextInput | Model | Editable | Optional | Text input | Label comes from `csrMeta.modelLabel` (default: "Model") |
| E-06 | Equipment | TextInput | Serial No. | Editable | Optional | Text input | Label comes from `csrMeta.serialLabel` (default: "Serial No.") |
| E-07 | Equipment | TextInput | Engine No | Editable | Optional | Text input | — |

### 4.5 Problem & Service Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| P-01 | Problem | TextArea | Problem Reported | Editable | Optional | Multiline textarea (min-height 84px) | — |
| P-02 | Problem | TextArea | Service Rendered | Editable | Optional | Multiline textarea (min-height 96px) | — |
| P-03 | Problem | TextArea | Defects Found | Editable | Optional | Multiline textarea | — |
| P-04 | Problem | TextArea | Engineer Remarks | Editable | Optional | Multiline textarea | — |

### 4.6 Service Execution Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| SE-01 | Execution | Date Input | Start Date | Editable | Optional | Date picker, defaults to today | — |
| SE-02 | Execution | Time Input | Start Time | Editable | Optional | Time picker | — |
| SE-03 | Execution | Date Input | End Date | Editable | Optional | Date picker, defaults to today | — |
| SE-04 | Execution | Time Input | End Time | Editable | Optional | Time picker | — |
| SE-05 | Execution | Select | Status After Service | Editable | Optional | Options: "Complete", "Incomplete", "Pending for spares", "Under observation", "Working solution provided" | — |

### 4.7 Operational Readings Section (collapsible)

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| OR-01 | Readings | Toggle Button | Show/Hide section | — | — | "Show section" / "Hide section" button toggles visibility | Default: section visible (`showOperationalReadings: true`) |
| OR-02 | Readings | TextInput | Voltage | Editable | Optional | Text input | Only rendered when section visible |
| OR-03 | Readings | TextInput | Frequency | Editable | Optional | Text input | Only rendered when section visible |
| OR-04 | Readings | TextInput | Battery | Editable | Optional | Text input | Only rendered when section visible |
| OR-05 | Readings | TextInput | Temperature | Editable | Optional | Text input | Only rendered when section visible |
| OR-06 | Readings | TextInput | Pressure | Editable | Optional | Text input | Only rendered when section visible |
| OR-07 | Readings | TextInput | Hours | Editable | Optional | Text input | Only rendered when section visible |

### 4.8 Materials Used Section

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| MT-01 | Materials | Editable Title | Section title | Editable | — | User can rename (default: "Materials Used"). Input rendered in section header. | — |
| MT-02 | Materials | Item count badge | — | Computed | — | Shows count of non-empty material rows | — |
| MT-03 | Materials | TextInput (per row) | Material | Editable | Optional | Text input per row | — |
| MT-04 | Materials | NumericInput (per row) | Qty | Editable | Optional | Numeric input per row | — |
| MT-05 | Materials | UnitInput (per row) | Unit | Editable | Optional | Custom unit selector per row | — |
| MT-06 | Materials | Button | Remove (per row) | — | — | Removes row. Only shown when > 1 row. | — |
| MT-07 | Materials | Button | Add material | — | — | Appends new empty material row | — |

### 4.9 Technician Section (collapsible)

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| T-01 | Technician | Toggle Button | Include/Exclude | — | — | "Include" / "Included" button toggles section | Default: section visible (`showTechnicianSignLine: true`) |
| T-02 | Technician | TextInput | Technician Name | Editable | Optional | Text input (stored in `csrMeta.technicianName`) | Only rendered when section visible |
| T-03 | Technician | Signatory display | Technician Signature | — | — | Shows selected signatory name or "Leave blank for offline sign." | Only rendered when section visible |
| T-04 | Technician | Button | Choose/Change signatory | — | — | Opens signatory picker bottom sheet | Only rendered when section visible |
| T-05 | Technician | Button | Leave blank | — | — | Clears `technician_signatory_id` | Only rendered when section visible |

### 4.10 Acknowledgement Section (collapsible)

| ID | Section | Control | Label | State | Required | Interaction | Conditional Behavior |
|---|---|---|---|---|---|---|---|
| ACK-01 | Ack | Toggle Button | Include/Exclude | — | — | "Include" / "Included" button toggles section | Default: section visible (`showAcknowledgement: true`) |
| ACK-02 | Ack | TextInput | Recipient name/title | Editable | Optional | Text input | Only rendered when section visible |
| ACK-03 | Ack | TextArea | Comment | Editable | Optional | Multiline textarea (stored in `customer_feedback`) | Only rendered when section visible |
| ACK-04 | Ack | Signature display | Recipient Signature | — | — | Shows uploaded filename or "Leave blank for offline sign." | Only rendered when section visible |
| ACK-05 | Ack | Button | Upload signature | — | — | Opens native file picker (image files). Reads file as dataURL, stores in `recipient_signature_uri`. | Only rendered when section visible |
| ACK-06 | Ack | Button | Leave blank | — | — | Clears `recipient_signature_uri` and filename | Only rendered when section visible |

---

## 5. Complete Action Inventory

| ID | Location | Action | Trigger | Result | Confirmation | Conditional |
|---|---|---|---|---|---|---|
| A-01 | FAB (mobile) / FAB (desktop) | Save | Click save button | Validates, saves CSR, navigates to view page | No | — |
| A-02 | Desktop FAB area | Download Blank | Click download button | Generates blank CSR PDF, downloads it, logs to `blank_csr_logs` | No | Only in create mode |
| A-03 | Item Controls | Import | Click "Import" button | Opens CsrImportSheet (bottom sheet) | No | — |
| A-04 | Materials | Add Material | Click "Add material" | Appends new empty material row | No | — |
| A-05 | Materials | Remove Material | Click "Remove" on row | Removes row. If last row, resets to default. | No | Only when > 1 row |
| A-06 | Operational Readings | Toggle section | Click "Show/Hide section" | Shows/hides operational readings fields | No | — |
| A-07 | Technician | Toggle section | Click "Include/Included" | Shows/hides technician section | No | — |
| A-08 | Technician | Choose signatory | Click "Choose/Change signatory" | Opens signatory picker bottom sheet | No | — |
| A-09 | Technician | Leave blank | Click "Leave blank" | Clears technician_signatory_id | No | — |
| A-10 | Acknowledgement | Toggle section | Click "Include/Included" | Shows/hides acknowledgement section | No | — |
| A-11 | Acknowledgement | Upload signature | Click "Upload signature" | Opens native file picker, reads as dataURL | No | — |
| A-12 | Acknowledgement | Leave blank | Click "Leave blank" | Clears recipient_signature_uri | No | — |
| A-13 | Client (edit) | Identity Lock | Click locked client | Opens IdentityLockDialog | No | Only in edit mode |
| A-14 | CSR Number (edit) | Identity Lock | Click locked number | Opens IdentityLockDialog | No | Only in edit mode |

---

## 6. Overlay Inventory

| ID | Overlay | Trigger | Contents | Confirm | Cancel | Dismiss |
|---|---|---|---|---|---|---|
| O-01 | ClientSelector | Click client button (create mode) | Searchable list of clients from database. Compact mode. | Selecting client (sets client_id, client_name, and auto-fills address from client record) | Close | Click outside |
| O-02 | CsrImportSheet (bottom sheet) | Click "Import" button | JSON import sheet. Title: "Import CSR". Description: "Update CSR fields from a JSON document extraction." Tutorial with steps and video. Paste area. | "Preview" + "Save" buttons (both apply) | Close / swipe down | Swipe down |
| O-03 | Signatory Picker (bottom sheet) | Click "Choose/Change signatory" | List of saved signatories from DB. Title: "Choose Signatory". Shows name and role. Active signatory highlighted. | Selecting signatory (sets `technician_signatory_id`) | Close / swipe down | Swipe down |
| O-04 | IdentityLockDialog | Click locked field in edit mode | Alert dialog: "Identity Fields Locked". Description: client/number can't change. Buttons: Cancel, "Duplicate Current Changes". | "Duplicate" navigates to create mode with prefilled data (client/number cleared) | Cancel | Click outside |
| O-05 | Native file picker | Click "Upload signature" (acknowledgement) | OS file picker for image files | Selecting file (reads as dataURL, stores in `recipient_signature_uri`) | Cancel | — |

---

## 7. Dropdown/Selector Inventory

| ID | Dropdown | Trigger | Current Value | Options | Search | Multi | Clear | Result |
|---|---|---|---|---|---|---|---|---|
| D-01 | Client Selector | Click client button | Empty or client_name | Database clients | Yes | No | No | Sets client_id, client_name, auto-fills address |
| D-02 | Call Type | Click select | csr.call_type | "Breakdown", "Preventive Maintenance", "Installation", "Commissioning", "Inspection", "Emergency Repair", "Other" | No | No | Yes (blank option) | Sets call_type |
| D-03 | Service Basis | Click select | csr.service_basis | "Paid Service", "AMC", "Warranty" | No | No | Yes (blank option) | Sets service_basis |
| D-04 | System Down | Click select | csr.system_down | "Yes", "No" | No | No | Yes (blank option) | Sets system_down as boolean (true/false/null) |
| D-05 | Status After Service | Click select | csr.status | "Complete", "Incomplete", "Pending for spares", "Under observation", "Working solution provided" | No | No | Yes (blank option) | Sets status |
| D-06 | Signatory Picker | Click "Choose signatory" | technician_signatory_id | Saved signatories list (name + role) | No | No | Yes ("Leave blank") | Sets technician_signatory_id |

---

## 8. Repeatable Row Inventory

### Materials Rows

Each material row contains:

| Column | Field | Control | Default | Notes |
|---|---|---|---|---|
| Material | `item` | TextInput | `''` | Text input, placeholder "Material" |
| Quantity | `quantity` | NumericInput | `''` | Numeric input, placeholder "Qty", center-aligned |
| Unit | `unit` | UnitInput | `''` | Custom unit selector component |

**Row actions:**
- **Remove:** Button "Remove" below each row (only shown when > 1 row)
- **Add:** "Add material" button appends new empty row

**Serialization:** Materials are serialized to a JSON string stored in `materials_used` column with prefix `__CSR_META_V1__`. The JSON contains `materialsRows`, `materialsText`, and `meta` (including section toggles).

**Empty state:** When all rows are empty, the form still shows 1 default row. The materials section title is editable (default: "Materials Used").

---

## 9. Conditional Logic

| Condition | Effect |
|---|---|
| `type=field` query param | Status defaults to "Field Entry Pending" instead of "Complete". On save, auto-generates PDF and downloads it. |
| Client selected (create) | Auto-fills `address` from client record (address + city + state) |
| PO number entered | `show_po` set to true automatically |
| `showOperationalReadings === true` | Operational readings fields visible (voltage, frequency, battery, temperature, pressure, hours) |
| `showOperationalReadings === false` | Operational readings fields hidden |
| `showTechnicianSignLine === true` | Technician name and signatory picker visible |
| `showTechnicianSignLine === false` | Technician section hidden |
| `showAcknowledgement === true` | Recipient name, comment, and signature upload visible |
| `showAcknowledgement === false` | Acknowledgement section hidden |
| Materials rows > 1 | "Remove" button appears on each row |
| Materials rows = 1 | "Remove" button hidden on single row |
| Offline (Android Capacitor) | Save button disabled. Amber offline indicator bar shown. Save creates local draft for later sync. |
| `mode === 'edit'` | Client, CSR number, and customer name are locked (IdentityLockDialog on click). |
| `mode === 'create'` | All fields editable. CSR number auto-generated. Download blank button available. |
| `!isOnline` | Save disabled. Offline indicator shown at bottom. |
| CSR number empty on blur | Restored to last known good value (`lastGoodCsrNumber` ref) |
| Import has operational readings data | `showOperationalReadings` set to true automatically |

---

## 10. Create vs Edit Differences

| Aspect | Create | Edit |
|---|---|---|
| Entry | Direct form render | Loading state → hydrated form from DB |
| Client | Selectable via ClientSelector | Locked (IdentityLockDialog on click) |
| CSR number | Auto-generated (or offline draft number) | Locked (IdentityLockDialog on click) |
| Customer Name | Editable text input | Locked (IdentityLockDialog on click) |
| Initial data | Default empty CSR + today's date | Loaded from DB via `parseCsrMaterials()` |
| Materials | 1 default empty row | Loaded from `materials_used` JSON field |
| Meta state | Default CSR_META | Loaded from materials_used JSON prefix |
| Save action | `createCsr()` with retry logic | `updateCsr()` with retry logic |
| Download blank | Available (generates blank PDF) | Not available |
| Field mode | Status = "Field Entry Pending", auto-PDF on save | N/A |
| Identity lock | N/A | Client, CSR number, customer name locked |

---

## 11. Validation and Error States

| Validation | Error Message | Trigger |
|---|---|---|
| CSR number not ready | "CSR number not ready" + description | Save attempt before number generated |
| Missing client (create, non-field) | "Client required" + "Please select a client before saving" | Save attempt |
| Missing client (edit) | "Client required" + "Please select a client before saving" | Save attempt |
| Duplicate CSR number (edit) | "Duplicate CSR number" + "CSR number already exists" | Save attempt |
| Invalid project assignment | "Project link invalid" + error message | Save attempt (create) |
| Server error | User-facing mutation error message | Save attempt |
| Offline save failure | "Offline save failed" + error | Save attempt while offline |
| Import JSON parse failure | "Import failed" + error message | Import sheet apply |
| Unsupported image file | "Unsupported file" + error message | Signature upload |

---

## 12. Attachment/Image/Signature Behavior

### Recipient Signature (Acknowledgement section)

- **Entry point:** "Upload signature" button in acknowledgement section
- **Picker:** Native file picker (accepts image files per `IMAGE_ACCEPT_ATTRIBUTE`)
- **Processing:** FileReader reads file as dataURL
- **Storage:** Stored in `recipient_signature_uri` field (dataURL string)
- **Preview:** Shows uploaded filename
- **Clear:** "Leave blank" button clears `recipient_signature_uri`
- **Note:** This is stored locally in form state and sent to DB on save. NOT uploaded to cloud storage (unlike Waybill signatures).

### Technician Signature

- **Entry point:** "Choose signatory" / "Change signatory" button in technician section
- **Picker:** Signatory picker bottom sheet (queries `signatories` table)
- **Storage:** `technician_signatory_id` stored in CSR record
- **Display:** Shows selected signatory name. If no signatory selected: "Leave blank for offline sign."
- **Clear:** "Leave blank" button clears `technician_signatory_id`
- **Note:** Technician signature is a reference to a saved signatory, not a file upload. The signatory's `signature_url` is used in PDF generation.

---

## 13. Data Flow / Dependencies

| Interaction | Effect |
|---|---|
| Select client | Sets `client_id`, `client_name`. Auto-fills `address` from client record (address + city + state). |
| Enter PO number | Sets `show_po` to true |
| Change call type | Stored as enum value |
| Change service basis | Stored as enum value |
| Change system down | Stored as boolean (true/false/null) |
| Toggle operational readings | `showOperationalReadings` meta flag updated |
| Toggle technician section | `showTechnicianSignLine` meta flag updated |
| Toggle acknowledgement | `showAcknowledgement` meta flag updated |
| Edit materials rows | Serialized to JSON with meta prefix for `materials_used` field |
| Select technician signatory | `technician_signatory_id` set on CSR record |
| Upload recipient signature | `recipient_signature_uri` stored as dataURL in form state |
| Import JSON | Updates CSR fields and materials rows from parsed JSON. Auto-shows operational readings if present. |
| Save (create) | Validates, serializes materials + meta, calls `createCsr()` with retry. If field mode: generates and downloads PDF. |
| Save (edit) | Validates, serializes materials + meta, calls `updateCsr()` with retry. Checks for duplicate CSR number. |
| Save (offline, Android) | Creates local draft via `createOfflineCsrDraft()`. Navigates to list. Syncs when back online. |
| Duplicate (from IdentityLockDialog) | Navigates to `/csr/new` with prefilled data (client/number cleared) |

---

## 14. Responsive Behavior

- Max-width: `max-w-md` (narrow mobile-first layout)
- Padding: `px-3 sm:px-4`
- Save FAB: hidden on sm+ screens, shown as MobileFab on mobile
- Desktop: Fixed bottom-right floating buttons (Download Blank + Save)
- Mobile: Floating action button (MobileFab component)
- Offline indicator: Full-width bar at bottom (mobile) or top (sm+)
- No separate mobile/desktop layouts — single responsive column layout

---

## 15. Interaction State Matrix

| Action | State Change |
|---|---|
| Open form (create) | Empty form with auto-generated number, today's date |
| Open form (edit) | Loading state → hydrated form from DB |
| Select client | client_id, client_name, address set |
| Enter PO number | show_po = true |
| Toggle operational readings | Fields appear/disappear |
| Toggle technician section | Section appears/disappears |
| Toggle acknowledgement | Section appears/disappear |
| Add material row | New empty row appended |
| Remove material row | Row removed (min 1 row) |
| Choose signatory | Signatory picker opens → signatory_id set |
| Upload recipient signature | File picker → dataURL stored |
| Import JSON | Fields and materials updated from JSON |
| Save (valid) | Loading state → save → navigation to view page |
| Save (invalid) | Toast error with description |
| Save (offline) | Loading state → local draft saved → navigation to list |
| Save (field mode, create) | Save → PDF generated and downloaded → navigation to view page |
| Before unload (dirty) | Browser confirmation dialog (via beforeunload handler if implemented) |

---

## 16. Missing/Unclear Behavior

| Item | Status |
|---|---|
| Exact offline draft sync mechanism | `csrOffline.ts` creates local drafts. Sync details in `csrSync.ts` — UNKNOWN without deeper inspection. |
| PDF template selection on form | CSR uses a hardcoded template ('3') for field mode PDF generation. No template picker in the form. |
| Client address auto-fill exact source | Address is built from `client.address + client.city + client.state`. Exact client object shape from ClientSelector callback UNKNOWN without inspecting that component. |
| Duplicate button on MoreHorizontal | The "⋯" button in Document Details header has no `onClick` handler in the current code — appears to be a placeholder. |
| Work duration field | `work_duration` exists on the CsrObject type but is NOT rendered in the form. May be legacy or set elsewhere. |
| Linked invoice handling | `linked_invoice_id` is stored but no UI to link/unlink invoices exists in the CSR form. May be set from invoice→CSR conversion flow. |

---

## 17. Skills Used

Skills used: NONE (forensic documentation task, not a visual redesign)

Documentation standard: ASD-STE100 Simplified Technical English

---

## 18. Verification

- Source inspected: `CsrFormScreen.tsx`, `CsrFormPage.tsx`, `csrUtils.ts`, `CsrImportSheet.tsx`, `csrService.ts`, `IdentityLockDialog.tsx`
- All fields, overlays, actions, conditional logic, and validation derived from actual code inspection
- No assumptions made about unimplemented features
