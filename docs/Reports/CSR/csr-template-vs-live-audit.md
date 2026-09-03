# CSR Full-Page Template vs Live CSR Form — Functional & UX Audit

This report was written by Buffy on 2026-09-02 via Codebuff.

Skills used: redesign-existing-projects, mobile-app-ui-design, appllama-app-design-skill
Documentation standard: ASD-STE100 Simplified Technical English

---

## Objective

Compare the candidate CSR form template (`CSR Full-Page Live Form.jsx`) against the actual live CSR form implementation to determine which is the better foundation for the CSR redesign.

## Scope

- Candidate template: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/CSR Full-Page Live Form.jsx` (1567 lines)
- Live form: `src/pages/CsrFormPage.tsx` + `src/components/csr/CsrFormScreen.tsx` + all child components
- Design authority: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design.md`

## Files Changed

- Created: `docs/Reports/csr/csr-template-vs-live-audit.md` (this report)

---

## 1. Candidate Template — Structural Summary

### Page Architecture

The template is a single 1567-line React component with inline state, mock data stores, and hardcoded icons. It uses no project design tokens, no shared UI components, and no backend integration.

### Section Hierarchy (10 sections)

| # | Section | Fields |
|---|---------|--------|
| 01 | Document Details | Client selector, CSR number, date, customer contact, PO number |
| 02 | Item Controls | JSON import button |
| 03 | Service Parameters | Call type, service basis, system down (3-column grid) |
| 04 | Equipment Specifications | Type, location, make, capacity, model, serial no, engine no |
| 05 | Problem & Service Details | Problem reported, service rendered, defects found, engineer remarks |
| 06 | Execution Timeline & Status | Start/end date+time, status after service |
| 07 | Operational Readings | Voltage, frequency, battery, temperature, pressure, hours (toggle included/excluded) |
| 08 | Materials Used | Editable title, material rows (item/qty/unit), add/remove |
| 09 | Technician Endorsement | Technician name, signatory picker, toggle included/excluded |
| 10 | Customer Acknowledgement | Recipient name, feedback/endorsement note, recipient signature upload |

### Interaction Surfaces

| Surface | Trigger | Type |
|---------|---------|------|
| Client selector | Tap client field | Bottom sheet with search |
| Signatory picker | Tap "Choose"/"Change" | Bottom sheet with list |
| Import JSON | Tap "Import JSON Payload" | Bottom sheet with textarea |
| Identity lock dialog | Tap locked field in edit mode | Centered modal |
| Toast notifications | Various actions | Fixed bottom toast |
| Validation alert | Save with missing required fields | Scroll-to-field + error pulse |

### State Model

- `formMode`: 'create' | 'edit'
- `isFieldMode`: boolean (field mode toggle)
- `isOnline`: boolean (hardcoded true)
- 30+ individual `useState` hooks for form fields
- No backend integration; all data is mock/hardcoded

### Design System Alignment

- Uses Manrope font (matches Design.md)
- Uses DM Mono for monospace fields (matches Design.md)
- Colors are hardcoded hex values, not design tokens
- Spacing uses arbitrary Tailwind values, not the 2-14px token scale
- No component library usage; all elements are custom inline components

---

## 2. Live CSR Form — Complete Functional Inventory

### Architecture

The live form uses a page-level controller (`CsrFormPage.tsx`, 285 lines) and a presentation component (`CsrFormScreen.tsx`, 570 lines). State flows through props. Backend integration uses Supabase via `tenantClient`. The form uses shared UI components (`Select`, `TextInput`, `TextArea`, `Sheet`, `Dialog`, `Combobox`, `MobileFab`, `NumericInput`, `UnitInput`).

### Header / Navigation

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Page title | "New CSR" / "Edit CSR" via Layout component | `CsrFormPage.tsx` |
| Back navigation | Handled by Layout component (router-based) | `Layout.tsx` |
| Overflow menu | MoreHorizontal button (placeholder, no actions wired) | `CsrFormScreen.tsx` |
| Save button (mobile) | MobileFab floating action button | `MobileFab.tsx` |
| Save button (desktop) | Fixed bottom-right button | `CsrFormScreen.tsx` |
| Download blank | Fixed bottom-right button (create mode only) | `CsrFormScreen.tsx` |

### Client Section

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Client selector | Combobox with search, drawer on mobile | `ClientSelector.tsx` |
| Client search | Integrated in Combobox component | `ClientSelector.tsx` |
| Client creation | "Add New Client" button opens full ClientForm dialog | `ClientSelector.tsx` → `ClientForm.tsx` |
| Client details card | Shows name, contact, phone, email, address after selection | `ClientSelector.tsx` |
| Clear client | X button on selected client | `ClientSelector.tsx` |
| Edit-mode lock | Click triggers IdentityLockDialog | `IdentityLockDialog.tsx` |

### Document Details

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| CSR number (create) | TextInput with auto-number from DB, onBlur restore | `CsrFormScreen.tsx` |
| CSR number (edit) | Locked span with lock icon, click opens IdentityLockDialog | `CsrFormScreen.tsx` |
| Date | TextInput (date type) | `CsrFormScreen.tsx` |
| Customer name (create) | TextInput, synced from client selection | `CsrFormScreen.tsx` |
| Customer name (edit) | Locked display with lock icon | `CsrFormScreen.tsx` |
| PO number | TextInput with show_po flag | `CsrFormScreen.tsx` |

### Main Details (Service Parameters)

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Call type | Select with 7 options | `CsrFormScreen.tsx` |
| Service basis | Select with 3 options | `CsrFormScreen.tsx` |
| System down | Select (Yes/No/null) with boolean conversion | `CsrFormScreen.tsx` |

### Equipment

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Equipment type | TextInput | `CsrFormScreen.tsx` |
| Equipment location | TextInput | `CsrFormScreen.tsx` |
| Make | TextInput | `CsrFormScreen.tsx` |
| Capacity | TextInput | `CsrFormScreen.tsx` |
| Model | TextInput (dynamic label from csrMeta) | `CsrFormScreen.tsx` |
| Serial No. | TextInput (dynamic label from csrMeta) | `CsrFormScreen.tsx` |
| Engine No | TextInput | `CsrFormScreen.tsx` |

### Problem & Service

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Problem reported | TextArea | `CsrFormScreen.tsx` |
| Service rendered | TextArea (min-h 96px) | `CsrFormScreen.tsx` |
| Defects found | TextArea | `CsrFormScreen.tsx` |
| Engineer remarks | TextArea | `CsrFormScreen.tsx` |

### Service Execution

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Start date | TextInput (date type) | `CsrFormScreen.tsx` |
| Start time | TextInput (time type) | `CsrFormScreen.tsx` |
| End date | TextInput (date type) | `CsrFormScreen.tsx` |
| End time | TextInput (time type) | `CsrFormScreen.tsx` |
| Status after service | Select with 5 options | `CsrFormScreen.tsx` |

### Operational Readings

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Show/hide toggle | HeaderActionButton toggles csrMeta.showOperationalReadings | `CsrFormScreen.tsx` |
| Voltage | TextInput | `CsrFormScreen.tsx` |
| Frequency | TextInput | `CsrFormScreen.tsx` |
| Battery | TextInput | `CsrFormScreen.tsx` |
| Temperature | TextInput | `CsrFormScreen.tsx` |
| Pressure | TextInput | `CsrFormScreen.tsx` |
| Hours | TextInput | `CsrFormScreen.tsx` |

### Materials

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Editable section title | Input replacing title text | `CsrFormScreen.tsx` |
| Material count badge | Green pill showing count | `CsrFormScreen.tsx` |
| Material item | TextInput per row | `CsrFormScreen.tsx` |
| Material quantity | NumericInput per row | `CsrFormScreen.tsx` |
| Material unit | UnitInput with autocomplete dropdown | `UnitInput.tsx` |
| Add material | Button adds new row | `CsrFormScreen.tsx` |
| Remove material | "Remove" text button per row | `CsrFormScreen.tsx` |
| Unit autocomplete | 60+ predefined units + custom unit creation | `UnitInput.tsx` |
| Materials serialization | __CSR_META_V1__ prefix + JSON | `csrUtils.ts` |

### Technician

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Show/hide toggle | HeaderActionButton toggles csrMeta.showTechnicianSignLine | `CsrFormScreen.tsx` |
| Technician name | TextInput (meta field) | `CsrFormScreen.tsx` |
| Signatory selection | Bottom sheet with signatories from DB | `CsrFormScreen.tsx` |
| Signatory list | Loaded from `signatories` table via Supabase | `CsrFormScreen.tsx` |
| Active signatory highlight | Primary-colored border on selected | `CsrFormScreen.tsx` |
| Clear signatory | "Leave blank" button | `CsrFormScreen.tsx` |

### Acknowledgement

| Element | Live Implementation | Location |
|---------|-------------------|----------|
| Show/hide toggle | HeaderActionButton toggles csrMeta.showAcknowledgement | `CsrFormScreen.tsx` |
| Recipient name/title | TextInput (acknowledgement_name) | `CsrFormScreen.tsx` |
| Comment | TextArea (customer_feedback) | `CsrFormScreen.tsx` |
| Recipient signature upload | File input with image validation | `CsrFormScreen.tsx` |
| Signature file validation | isSupportedImageFile + getUnsupportedImageErrorMessage | `documentImageUploadPolicy.ts` |
| Clear signature | "Leave blank" button | `CsrFormScreen.tsx` |

### Save Flow

| Step | Live Implementation | Location |
|------|-------------------|----------|
| CSR number validation | Checks csrNumberPopulated ref + trim | `CsrFormPage.tsx` |
| Client validation (create) | Requires client_id in non-field mode | `CsrFormPage.tsx` |
| Client validation (edit) | Requires client_id | `CsrFormPage.tsx` |
| Project assignment validation | validateProjectAssignment check | `CsrFormPage.tsx` |
| Duplicate prevention (create) | withUniqueRetry auto-retries with next number | `CsrFormPage.tsx` |
| Duplicate prevention (edit) | Queries existing CSRs by number | `CsrFormPage.tsx` |
| Offline save | createOfflineCsrDraft (Android SQLite) | `csrOffline.ts` |
| Online save (create) | createCsr via domain service | `csrService.ts` |
| Online save (edit) | updateCsr via domain service | `csrService.ts` |
| PDF generation (field mode) | Builds preview, generates PDF blob, auto-downloads | `CsrFormPage.tsx` |
| Navigation on success | navigate to /csr/:id | `CsrFormPage.tsx` |
| Error handling | feedback.error with getUserFacingMutationMessage | `CsrFormPage.tsx` |
| Save disabled states | saving, offline, !csrNumberReady, empty csr_number | `CsrFormScreen.tsx` |

### Other Interactions

| Interaction | Live Implementation | Location |
|-------------|-------------------|----------|
| Offline indicator | Fixed bar at bottom when offline | `CsrFormScreen.tsx` |
| Online/offline tracking | window event listeners | `CsrFormScreen.tsx` |
| CSR number blur restore | Restores last good number if cleared | `CsrFormScreen.tsx` |
| Blank CSR download | Generates blank PDF with next number, logs to blank_csr_logs | `CsrFormPage.tsx` |
| Duplicate draft | Navigates to /csr/new with duplicateState | `CsrFormPage.tsx` |
| JSON import | CsrImportSheet with Zod validation | `CsrImportSheet.tsx` |
| Import field mapping | Maps parsed JSON to CSR fields + materials | `CsrImportSheet.tsx` |
| Project prefill | From route state (projectId, clientId, clientName) | `CsrFormPage.tsx` |
| Invoice prefill | From route state sourceInvoice | `CsrFormPage.tsx` |

---

## 3. Functional Completeness Matrix

| Live Function | Live Location | Candidate Template | Present? | Fidelity | Recommendation |
|---------------|--------------|-------------------|----------|----------|----------------|
| **HEADER** | | | | | |
| Back navigation | Layout component | Not present (standalone) | No | — | Add: must use Layout |
| Page title | Layout component | "Customer Service Report" inline | Partial | Low | Replace with Layout title |
| Overflow menu | MoreHorizontal button | Not present | No | — | Add or remove (currently placeholder) |
| Save button (mobile) | MobileFab | FAB with halo animation | Yes | Partial | Use MobileFab component |
| Save button (desktop) | Fixed button | Not differentiated | Partial | Low | Add desktop variant |
| Download blank | Fixed button | Download icon in header | Yes | Partial | Keep, use component |
| **CLIENT** | | | | | |
| Client selector (Combobox) | ClientSelector.tsx | Custom bottom sheet | Yes | Partial | Use ClientSelector component |
| Client search | Combobox in ClientSelector | Basic string filter | Yes | Partial | Use Combobox |
| Client creation | ClientForm dialog | Not present | No | — | Add: live has inline creation |
| Client details card | ClientSelector.tsx | Not present | No | — | Add: shows contact/address |
| Clear client | X button | Not present | No | — | Add: allowClear prop |
| Edit-mode lock | IdentityLockDialog | Custom inline lock | Yes | Full | Use IdentityLockDialog |
| **DOCUMENT DETAILS** | | | | | |
| CSR number (create) | TextInput with auto-number | TextInput (mock number) | Yes | Partial | Use live auto-number logic |
| CSR number (edit) | Locked span | Locked div with icon | Yes | Full | Keep pattern |
| Date | TextInput (date) | TextInput (date) | Yes | Full | Keep |
| Customer name (create) | TextInput (synced from client) | TextInput (manual) | Yes | Partial | Sync from client selection |
| Customer name (edit) | Locked display | Locked div | Yes | Full | Keep |
| PO number | TextInput + show_po | TextInput | Yes | Full | Keep |
| **SERVICE PARAMETERS** | | | | | |
| Call type | Select (7 options) | Select (7 options) | Yes | Full | Keep |
| Service basis | Select (3 options) | Select (3 options) | Yes | Full | Keep |
| System down | Select (Yes/No/null) | Select (Yes/No) | Yes | Partial | Add null state |
| **EQUIPMENT** | | | | | |
| Equipment type | TextInput | TextInput | Yes | Full | Keep |
| Equipment location | TextInput | TextInput | Yes | Full | Keep |
| Make | TextInput | TextInput | Yes | Full | Keep |
| Capacity | TextInput | TextInput | Yes | Full | Keep |
| Model | TextInput (dynamic label) | TextInput | Yes | Partial | Add dynamic label |
| Serial No. | TextInput (dynamic label) | TextInput | Yes | Partial | Add dynamic label |
| Engine No | TextInput | TextInput | Yes | Full | Keep |
| **PROBLEM & SERVICE** | | | | | |
| Problem reported | TextArea | TextArea | Yes | Full | Keep |
| Service rendered | TextArea | TextArea | Yes | Full | Keep |
| Defects found | TextArea | TextArea | Yes | Full | Keep |
| Engineer remarks | TextArea | TextArea | Yes | Full | Keep |
| **SERVICE EXECUTION** | | | | | |
| Start date | TextInput (date) | TextInput (date) | Yes | Full | Keep |
| Start time | TextInput (time) | TextInput (time) | Yes | Full | Keep |
| End date | TextInput (date) | TextInput (date) | Yes | Full | Keep |
| End time | TextInput (time) | TextInput (time) | Yes | Full | Keep |
| Status after service | Select (5 options) | Select (6 options) | Yes | Full | Keep |
| **OPERATIONAL READINGS** | | | | | |
| Show/hide toggle | HeaderActionButton | ToggleIncluded/ToggleExcluded buttons | Yes | Full | Keep |
| Voltage | TextInput | TextInput | Yes | Full | Keep |
| Frequency | TextInput | TextInput | Yes | Full | Keep |
| Battery | TextInput | TextInput | Yes | Full | Keep |
| Temperature | TextInput | TextInput | Yes | Full | Keep |
| Pressure | TextInput | TextInput | Yes | Full | Keep |
| Hours | TextInput | TextInput | Yes | Full | Keep |
| **MATERIALS** | | | | | |
| Editable title | Input replacing title | Input replacing title | Yes | Full | Keep |
| Material count | Green pill badge | Mono text count | Yes | Partial | Use badge |
| Material item | TextInput | TextInput | Yes | Full | Keep |
| Material quantity | NumericInput | HTML number input | Yes | Partial | Use NumericInput |
| Material unit | UnitInput (autocomplete) | Plain text input | No | — | Add: UnitInput critical |
| Add material | Button | Button | Yes | Full | Keep |
| Remove material | "Remove" text | Close icon button | Yes | Partial | Keep text pattern |
| Unit autocomplete | 60+ units + custom | Not present | No | — | Add: UnitInput |
| Custom unit creation | "Add Unit" in dropdown | Not present | No | — | Add: via UnitInput |
| **TECHNICIAN** | | | | | |
| Show/hide toggle | HeaderActionButton | ToggleIncluded/ToggleExcluded | Yes | Full | Keep |
| Technician name | TextInput | TextInput | Yes | Full | Keep |
| Signatory selection | Bottom sheet from DB | Bottom sheet (mock data) | Yes | Partial | Use real DB |
| Active signatory highlight | Primary border | Primary-soft bg | Yes | Full | Keep |
| Clear signatory | "Leave blank" button | "Clear" button | Yes | Full | Keep |
| **ACKNOWLEDGEMENT** | | | | | |
| Show/hide toggle | HeaderActionButton | ToggleIncluded/ToggleExcluded | Yes | Full | Keep |
| Recipient name/title | TextInput | TextInput | Yes | Full | Keep |
| Comment | TextArea | TextArea | Yes | Full | Keep |
| Recipient signature upload | File input + validation | File input + preview | Yes | Full | Keep, add validation |
| Clear signature | "Leave blank" button | Close icon on preview | Yes | Full | Keep |
| **SAVE** | | | | | |
| CSR number validation | Ref check + trim | Trim check | Yes | Partial | Use ref-based |
| Client validation | Client ID check | Client object check | Yes | Partial | Use ID-based |
| Project validation | validateProjectAssignment | Not present | No | — | Add: required |
| Duplicate prevention | withUniqueRetry | Not present | No | — | Add: required |
| Offline save | createOfflineCsrDraft | Toast message only | No | — | Add: real offline |
| Online save | createCsr/updateCsr | Toast message only | No | — | Add: real save |
| PDF generation (field) | Auto-download on field save | Not present | No | — | Add: required |
| Navigation on success | navigate to /csr/:id | Toast only | No | — | Add: required |
| Error handling | feedback.error | Toast only | No | — | Add: proper errors |
| Save disabled states | saving/offline/!ready | No disabled states | No | — | Add: required |
| **OTHER** | | | | | |
| Offline indicator | Fixed amber bar | Fixed amber bar | Yes | Full | Keep |
| Blank CSR download | PDF generation + log | Download icon (mock) | No | — | Add: real implementation |
| Duplicate draft | Route navigation with state | State reset (mock) | No | — | Add: route-based |
| JSON import | CsrImportSheet + Zod | Inline textarea (mock) | Partial | Low | Use CsrImportSheet |
| Project prefill | Route state | Not present | No | — | Add: route state |
| Invoice prefill | Route state + DB query | Not present | No | — | Add: route state |

---

## 4. Missing From Candidate

### Critical Missing (blocks save/submission)

| Capability | What It Does | Live Location | Essential? | Where In Template | Interaction Type |
|------------|-------------|---------------|------------|-------------------|-----------------|
| Real save (Supabase) | Persists CSR to database | `CsrFormPage.tsx` handleSave | Yes | Replace toast with onSave prop | Function |
| Real edit (update) | Updates existing CSR record | `CsrFormPage.tsx` handleSave | Yes | Replace toast with onSave prop | Function |
| Project assignment validation | Validates project-client linkage | `CsrFormPage.tsx` | Yes | Before save validation | Function |
| Duplicate number prevention | Auto-retries with next number on conflict | `CsrFormPage.tsx` withUniqueRetry | Yes | During save flow | Function |
| Save disabled states | Disables FAB when offline/not ready | `CsrFormScreen.tsx` saveDisabled | Yes | On FAB button | State |
| Navigation on success | Navigates to view page after save | `CsrFormPage.tsx` | Yes | After save handler | Function |

### High-Priority Missing

| Capability | What It Does | Live Location | Essential? | Where In Template | Interaction Type |
|------------|-------------|---------------|------------|-------------------|-----------------|
| Client creation (inline) | Creates new client from form | `ClientSelector.tsx` ClientForm | Yes | In client sheet | Dialog |
| Client details card | Shows full client info after selection | `ClientSelector.tsx` | Yes | Below client selector | Card |
| Clear client (allowClear) | Removes client selection | `ClientSelector.tsx` | Yes | On client trigger | Button |
| UnitInput autocomplete | 60+ predefined units with search | `UnitInput.tsx` | Yes | Replace plain unit text input | Autocomplete |
| Custom unit creation | User can add new units | `UnitInput.tsx` | Yes | In UnitInput dropdown | Input |
| NumericInput | Proper numeric-only input for quantity | `NumericInput.tsx` | Yes | Replace number input | Input |
| Blank CSR download (real) | Generates blank PDF with auto-number | `CsrFormPage.tsx` handleDownloadBlankCsr | Yes | On download button | Function |
| Duplicate draft (real) | Navigates to new CSR with prefilled data | `CsrFormPage.tsx` handleDuplicateFromEditable | Yes | On identity lock dialog | Navigation |
| Offline save (real) | Saves draft to SQLite when offline | `csrOffline.ts` | Yes | Replace toast with real save | Function |
| PDF generation on field save | Auto-downloads PDF after field mode save | `CsrFormPage.tsx` | Yes | After save in field mode | Function |

### Medium-Priority Missing

| Capability | What It Does | Live Location | Essential? | Where In Template | Interaction Type |
|------------|-------------|---------------|------------|-------------------|-----------------|
| Dynamic model/serial labels | Labels change based on equipment type | `CsrFormScreen.tsx` csrMeta | No | In equipment section labels | Dynamic text |
| System down null state | Allows unset (not just Yes/No) | `CsrFormScreen.tsx` | No | In system down select | Select |
| CSR number blur restore | Restores last good number if accidentally cleared | `CsrFormScreen.tsx` | No | On CSR number input blur | Event |
| Project prefill from route | Prefills client/project from navigation state | `CsrFormPage.tsx` | No | On component mount | Function |
| Invoice prefill from route | Prefills fields from linked invoice | `CsrFormPage.tsx` | No | On component mount | Function |
| Signatories from DB | Loads real signatories from Supabase | `CsrFormScreen.tsx` | No | Replace mock data | Fetch |
| Material serialization format | __CSR_META_V1__ prefix for metadata | `csrUtils.ts` | No | In save flow | Serialization |
| CsrImportSheet (Zod) | Validates import JSON with Zod schema | `CsrImportSheet.tsx` | No | Replace inline textarea | Sheet |
| Layout wrapper | Uses shared Layout with title/back | `Layout.tsx` | No | Wrap entire form | Layout |
| Image upload validation | Validates file type against policy | `documentImageUploadPolicy.ts` | No | On signature upload | Validation |
| Status-dependent behavior | "Field Entry Pending" auto-set in field mode | `CsrFormPage.tsx` | No | On field mode toggle | State |

### Low-Priority Missing (nice-to-have)

| Capability | What It Does | Live Location | Essential? | Where In Template | Interaction Type |
|------------|-------------|---------------|------------|-------------------|-----------------|
| Online/offline event listeners | Tracks real online status | `CsrFormScreen.tsx` | No | On mount | Event |
| IdentityLockDialog component | Proper AlertDialog pattern | `IdentityLockDialog.tsx` | No | Replace inline modal | Dialog |
| Feedback toasts (Sonner) | Proper toast library | `feedback.ts` | No | Replace custom toast | Toast |
| Design token usage | Uses CSS variables not hardcoded | N/A | No | Throughout | Styling |

---

## 5. Template Improvements Over Live Form

### Information Hierarchy

**Template is better.** The template groups fields into a numbered section hierarchy (01-10) with clear visual separators. The live form uses card-based sections with colored dots, which is functional but less scannable for a long form. The numbered approach creates a mental map: "I'm at section 5 of 10."

### Section Title as Editable Input (Materials)

**Template matches live.** Both allow the materials section title to be edited. The live form does this via an input inside the Section title prop. The template does it via an inline input. Both work correctly.

### Toggle UX for Optional Sections

**Template is better.** The template uses visual toggle buttons with Included/Excluded icons and color-coded borders (green for included, red for excluded). The live form uses text-only HeaderActionButton ("Included" / "Include"). The template's visual toggle is more scannable.

### Validation UX

**Template is better.** The template implements scroll-to-field with error pulse animation on validation failure. The live form uses `feedback.error` toast messages that do not scroll to the offending field. The template's approach reduces cognitive load when the form is long.

### Field Mode Toggle

**Template is better.** The template has an explicit "Field" / "Standard" toggle button in the header, making the mode always visible. The live form determines field mode from URL search params (`?type=field`), which is less discoverable.

### Materials Row Layout

**Template is better.** The template uses a 12-column grid (6/3/3) for materials, which is more compact and efficient on mobile. The live form uses a 3-column grid with fixed widths (minmax(1.4fr)/88px/86px), which can waste space on narrow screens.

### Import Sheet UX

**Template is better.** The template provides a simpler, more focused import interface with a large textarea and clear Preview/Save buttons. The live form's CsrImportSheet has a tutorial section and video link that adds clutter.

### Density

**Template is better.** The template uses smaller type sizes (7-13px) and tighter spacing (2-6px), which aligns with Design.md's compact density philosophy. The live form uses larger type (10-14px) and looser spacing, which reduces information density.

---

## 6. What the Live Form Does Better

### Component Architecture

The live form uses a proper component hierarchy with reusable pieces (`TextInput`, `TextArea`, `SelectField`, `Section`, `FieldLabel`, `HeaderActionButton`). The template is a monolithic 1567-line component with no component extraction. The live form is more maintainable and testable.

### Backend Integration

The live form has full Supabase integration: client loading, signatory loading, CSR save/update, duplicate prevention, project validation, offline drafts, PDF generation. The template has zero backend integration. This is the most critical gap.

### Real Client Selector

The live form's `ClientSelector` is a full-featured component with Combobox search, client creation dialog, client details card, and clear functionality. The template's client selector is a basic bottom sheet with string matching.

### UnitInput

The live form's `UnitInput` provides 60+ predefined measurement units with autocomplete search and custom unit creation. The template has a plain text input for units.

### NumericInput

The live form uses a `NumericInput` component for material quantities that restricts to numeric values. The template uses a raw `type="number"` input.

### Image Upload Validation

The live form validates signature uploads against `IMAGE_ACCEPT_ATTRIBUTE` and `isSupportedImageFile`, providing user-friendly error messages. The template only checks `file.type.startsWith('image/')`.

### Save Flow Complexity

The live form handles: CSR number auto-generation, duplicate number retry, project validation, offline drafts, PDF generation on field save, proper error messages via `getUserFacingMutationMessage`, and post-save navigation. The template shows a toast.

### Offline Handling

The live form has real offline detection (window events), disabled save when offline, Android SQLite offline drafts, and an offline indicator. The template has a hardcoded `isOnline = true`.

### Design Token Usage

The live form uses semantic CSS variables (`bd-text`, `bd-surface`, `bd-border`, `bd-button-primary-bg`, etc.) that align with Design.md's token architecture. The template hardcodes every color value.

### Document Structure

The live form's sections use a card-based design (`rounded-[20px] border border-bd-border bg-bd-surface p-4 shadow-...`) that matches Design.md's card component rules. The template uses a flat `divide-y` layout without card surfaces.

---

## 7. Android Integrity Review

### Touch Targets

| Element | Template | Live | Design.md Requirement |
|---------|----------|------|----------------------|
| FAB | 50x50px | 56x56px (h-14 w-14) | 44x44px min |
| Buttons | h-[28-36px] | h-8 to h-11 (32-44px) | 44x44px min |
| Toggle buttons | h-[30px] | h-8 (32px) | 44x44px min |
| Material remove | w-6 h-6 (24px) | Text button | 44x44px min |

**Template problem:** Many touch targets are below the 44px minimum. The template uses 28-30px buttons which are too small for finger interaction on Android.

### Safe Areas

Neither the template nor the live form explicitly handles safe-area-inset-bottom for the FAB. The live form uses `bottom-[94px]` which accounts for bottom nav. The template uses `bottom-6 right-5` which may conflict with safe areas.

### Keyboard Avoidance

The template has no keyboard avoidance logic. The live form relies on Layout component's scroll behavior. Neither handles keyboard push-up explicitly.

### Bottom Sheet Behavior

The template uses `backdrop-blur-xs` and `max-h-[78vh]` which matches Design.md. The live form uses the shared `Sheet` component which handles swipe-to-dismiss. The template's sheets are custom implementations without swipe-to-dismiss.

### Back Navigation

The template has no back navigation (standalone component). The live form inherits back navigation from the Layout component. On Android, back button behavior is undefined in the template.

### Scroll Containment

The template uses `overflow-x-hidden` on the root div. The live form relies on Layout's scroll containment. Neither explicitly sets `overscroll-behavior: contain`.

### Nested Scrolling

The template's bottom sheets have `overflow-y-auto flex-1` which is correct. The live form's Sheet component handles this. Both are adequate.

---

## 8. Create/Edit Parity

| Behavior | Create Mode | Edit Mode | Template | Live |
|----------|------------|-----------|----------|------|
| Client selection | Full selector | Locked (click opens dialog) | Yes | Yes |
| CSR number | Editable (auto-number) | Locked (click opens dialog) | Yes | Yes |
| Customer name | Editable (synced from client) | Locked (display only) | Yes | Yes |
| All other fields | Editable | Editable | Yes | Yes |
| Save | Creates new record | Updates existing record | Mock | Real |
| PDF download | Blank CSR available | Not available | Partial | Real |
| Duplicate | Not available | Available via lock dialog | Yes | Yes |
| Status default | "Complete" / "Field Entry Pending" | Loaded from DB | Yes | Yes |
| Field mode | Explicit toggle | Not available (determined by route) | Toggle | Route param |

---

## 9. Secondary UI Inventory

| Interaction | Trigger | Live Behavior | Template Representation | Missing? |
|-------------|---------|---------------|------------------------|----------|
| Client selector sheet | Tap client field | Combobox → drawer (mobile) / popover (desktop) | Bottom sheet with search | Partial: no creation |
| Client creation dialog | "Add New Client" in selector | Full ClientForm dialog | Not present | Yes |
| Signatory sheet | Tap "Choose signatory" | Bottom sheet from DB | Bottom sheet (mock data) | Partial: no DB |
| Import sheet | Tap "Import" button | CsrImportSheet with Zod | Bottom sheet with textarea | Partial: no Zod |
| Identity lock dialog | Tap locked field in edit | AlertDialog with Duplicate action | Custom centered modal | Partial |
| Toast notifications | Various actions | Sonner via feedback lib | Custom fixed toast | Partial |
| Offline indicator | When offline | Fixed amber bar | Fixed amber bar | Full |
| Save FAB | Always visible | MobileFab (mobile) / fixed btn (desktop) | FAB with halo animation | Partial |
| Blank download | Header button (create) | PDF generation + blank_csr_logs | Toast only | Yes |
| More menu | Header button | Placeholder (no actions) | Not present | Yes |
| Validation error | Save with missing fields | feedback.error toast | Scroll-to-field + pulse | Template better |

---

## 10. Template Architecture Review

### A. Is the section architecture better?

**Yes.** The numbered section hierarchy (01-10) creates a clear mental model for a long form. The live form's card-based sections are functional but less structured. The numbered approach is a genuine improvement.

### B. Is the information hierarchy better?

**Yes.** The template groups related fields more logically. Equipment fields are in a single section with consistent 2-column grids. The live form's equipment section uses inconsistent grid layouts (2-col, 2-col, 2-col, 2-col).

### C. Is the interaction model better?

**Partially.** The template's toggle buttons and validation UX are better. But the template lacks the live form's real interaction model (backend save, offline handling, navigation).

### D. Is the mobile architecture better?

**Partially.** The template's density and field sizing are more mobile-friendly. But it lacks safe-area handling, keyboard avoidance, and proper touch targets.

### E. Is the desktop architecture better?

**No.** The template is a single-column mobile layout with no desktop adaptation. The live form at least has a desktop save button and uses max-w-md. The template has no desktop-specific behavior.

### F. Can all live functionality fit into it?

**Yes, but with significant refactoring.** The section architecture can accommodate all live fields. The template would need: (1) component extraction, (2) backend integration props, (3) additional interaction surfaces (client creation, UnitInput, etc.), (4) proper design token usage.

### G. Does it create unnecessary complexity?

**Yes, in some areas.** The decorative background shapes (industrial clipboard, hardhat SVG) are visual noise that contradicts Design.md's "no decorative elements that reduce usability" rule. The FAB halo animation is decorative and may cause performance issues on low-end Android devices. The custom icon components add 80+ lines of SVG code when the project already uses Lucide.

### H. Does it align with Design.md?

**Partially.** It uses Manrope + DM Mono (correct). It uses compact density (correct). It uses bottom sheets (correct). But it hardcodes colors instead of using tokens, ignores the radius scale (uses 10px everywhere instead of 5-40px hierarchy), uses wrong touch target sizes, includes forbidden glassmorphism (backdrop-blur-xs on sheets), and adds decorative gradients on the FAB (Design.md says gradients are for high-emphasis only, not decoration).

### I. Does it provide a better foundation than the existing CSR form?

**Yes, for visual structure. No, for functionality.** The template's section hierarchy, validation UX, and density are improvements. But the live form's component architecture, backend integration, and interaction model are far more mature. The template would need 60-70% of its code replaced to match the live form's functionality.

---

## 11. Decision

### ACCEPT WITH REQUIRED CHANGES

The template's section hierarchy (numbered sections), validation UX (scroll-to-field + error pulse), field mode toggle, and density are genuine improvements over the live form. These should be preserved in the redesign.

However, the template cannot serve as-is. It requires structural changes before it becomes a viable foundation.

---

## 12. Required Changes (Priority Order)

### Priority 1: Architecture

| # | Change | Rationale |
|---|--------|-----------|
| 1 | Extract components: Section, FieldLabel, TextInput, TextArea, SelectField, HeaderActionButton | Matches live form's component architecture; enables reuse |
| 2 | Wrap in Layout component | Provides back navigation, title, page chrome |
| 3 | Replace hardcoded colors with design tokens (`--primary`, `--surface`, `--ink`, etc.) | Design.md compliance |
| 4 | Remove decorative background shapes (clipboard, hardhat SVGs) | Design.md anti-pattern #9: no decorative elements that reduce usability |
| 5 | Remove FAB halo animation | Performance risk on low-end Android; decorative per Design.md |

### Priority 2: Functionality

| # | Change | Rationale |
|---|--------|-----------|
| 6 | Replace mock client selector with ClientSelector component | Adds search, creation, details card, clear |
| 7 | Replace plain unit input with UnitInput component | Adds 60+ unit autocomplete |
| 8 | Replace number input with NumericInput component | Proper numeric-only input |
| 9 | Wire onSave prop instead of toast-only save | Enables real backend integration |
| 10 | Add save disabled states (saving, offline, !csrNumberReady) | Prevents invalid saves |
| 11 | Add offline save via createOfflineCsrDraft | Real offline support |
| 12 | Add PDF generation on field save | Required for field mode |
| 13 | Add navigation on save success | Required for user flow |
| 14 | Add project assignment validation | Required for data integrity |
| 15 | Add duplicate number prevention (withUniqueRetry) | Required for data integrity |

### Priority 3: Polish

| # | Change | Rationale |
|---|--------|-----------|
| 16 | Replace custom icons with Lucide React | Reduces code by 80+ lines; consistent icon set |
| 17 | Replace custom toast with feedback (Sonner) | Consistent toast behavior |
| 18 | Replace inline IdentityLockDialog with shared component | Consistent dialog pattern |
| 19 | Add proper touch targets (44px minimum) | Android integrity |
| 20 | Add safe-area-inset-bottom handling | Android/iOS compliance |
| 21 | Add overscroll-behavior: contain | Prevents scroll chaining |
| 22 | Add keyboard avoidance logic | Mobile usability |
| 23 | Use radius scale from Design.md (5-40px) | Design system compliance |
| 24 | Load signatories from DB instead of mock data | Real data |
| 25 | Add image upload validation | File type safety |

---

## 13. Recommended Final CSR Form Structure

### Header
- **Purpose:** Navigation, mode display, context actions
- **Live functionality:** Back, title, overflow menu, field mode indicator
- **Interaction pattern:** Layout component with title bar
- **Mobile:** Standard back + title
- **Desktop:** Same, with sidebar context

### 01. Document Details
- **Purpose:** Identity fields and metadata
- **Live functionality:** Client selector, CSR number, date, customer name, PO number
- **Interaction pattern:** ClientSelector Combobox (drawer mobile, popover desktop), TextInput, date input
- **Mobile:** Stacked fields, 2-column grid for date/name
- **Desktop:** Same layout, wider inputs

### 02. Item Controls
- **Purpose:** Import and bulk operations
- **Live functionality:** JSON import sheet
- **Interaction pattern:** Button → CsrImportSheet bottom sheet
- **Mobile:** Full-width button
- **Desktop:** Same

### 03. Service Parameters
- **Purpose:** Classify the service call
- **Live functionality:** Call type, service basis, system down
- **Interaction pattern:** Select dropdowns
- **Mobile:** 2-column grid (call type + service basis), full-width (system down)
- **Desktop:** Same

### 04. Equipment
- **Purpose:** Identify the equipment serviced
- **Live functionality:** Type, location, make, capacity, model, serial, engine
- **Interaction pattern:** TextInput fields in 2-column grids
- **Mobile:** 2-column grids
- **Desktop:** Same

### 05. Problem & Service
- **Purpose:** Narrative fields for the service report
- **Live functionality:** Problem reported, service rendered, defects found, engineer remarks
- **Interaction pattern:** TextArea fields
- **Mobile:** Stacked textareas
- **Desktop:** Same

### 06. Service Execution
- **Purpose:** Timeline and status
- **Live functionality:** Start/end date+time, status after service
- **Interaction pattern:** Date/time inputs, Select dropdown
- **Mobile:** 2-column grids for date/time pairs
- **Desktop:** Same

### 07. Operational Readings
- **Purpose:** Optional technical readings
- **Live functionality:** Voltage, frequency, battery, temperature, pressure, hours with show/hide toggle
- **Interaction pattern:** Toggle button + TextInput grid
- **Mobile:** 2-column grid
- **Desktop:** Same

### 08. Materials Used
- **Purpose:** Track materials consumed during service
- **Live functionality:** Editable title, material rows (item/qty/unit), add/remove, count badge
- **Interaction pattern:** TextInput + NumericInput + UnitInput per row, add/remove buttons
- **Mobile:** Full-width rows with compact grid
- **Desktop:** Same

### 09. Technician
- **Purpose:** Engineer identification and signature
- **Live functionality:** Name, signatory selection from DB, include/exclude toggle
- **Interaction pattern:** TextInput + bottom sheet signatory picker
- **Mobile:** Stacked fields with sheet picker
- **Desktop:** Same

### 10. Acknowledgement
- **Purpose:** Client receipt and feedback
- **Live functionality:** Recipient name, comment, signature upload with validation, include/exclude toggle
- **Interaction pattern:** TextInput + TextArea + file upload with validation
- **Mobile:** Stacked fields with upload button
- **Desktop:** Same

### Persistent Actions
- **Purpose:** Save and supplementary actions
- **Live functionality:** MobileFab (mobile), fixed save button (desktop), download blank (create mode)
- **Interaction pattern:** FAB with disabled states, secondary button for download
- **Mobile:** FAB at bottom-right, offset for bottom nav
- **Desktop:** Fixed bottom-right buttons

---

## 14. Verification

- git status (before): Pre-existing staged and untracked files noted
- git status (after): Only new file `docs/Reports/csr/csr-template-vs-live-audit.md` created
- Production source files modified: **None**
- bun run audit:load: skipped (no code changes)
- bun run typecheck: skipped (no code changes)
- bun run build: skipped per hardware policy

---

## 15. Risks and Limitations

1. The candidate template is 1567 lines in a single component. Any refactoring will require significant extraction work.
2. The live form's component tree includes 6+ shared components that the template does not use. Integration will require import changes throughout.
3. The template's decorative elements (background shapes, FAB halo) may indicate a visual-first design approach that conflicts with Design.md's "no decorative elements that reduce usability" rule.
4. The template does not account for the Layout component, which provides essential mobile chrome (back navigation, title, immersive mode). This is a fundamental architectural gap.
5. The live form's save flow involves 10+ steps including validation, retry, offline handling, PDF generation, and navigation. The template's toast-only approach hides this complexity.

## 16. Deferred Work

1. Actual implementation of the redesigned CSR form using the template's section hierarchy as a starting point
2. Component extraction from the template into shared form primitives
3. Backend integration wiring (Supabase client, save/update handlers)
4. Offline draft support
5. PDF generation integration
6. Dark mode compliance testing
7. Desktop responsive layout (the template is mobile-only)

---

*End of report.*
