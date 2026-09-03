# CSR Design Template vs Live CSR Form — Design Re-Audit

This report was written by Buffy on 2026-09-03 via Freebuff.

Skills used: redesign-existing-projects, mobile-app-ui-design, appllama-app-design-skill
Documentation standard: ASD-STE100 Simplified Technical English

---

## Objective

Compare the candidate CSR form template against the actual live CSR form to determine which provides a better design direction for the CSR redesign. The candidate is a design prototype. The live form is the functional baseline. The goal is a fresh, high-quality CSR form design direction — not a reskin of either implementation.

---

## Sources Inspected

### Design Authority
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/01-design-vision.md`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design.md`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/07-forms.md`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/15-interaction-model.md`

### Candidate Template
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/CSR Full-Page Live Form.jsx` (1567 lines)

### Live CSR Form (complete component tree)
- `src/pages/CsrFormPage.tsx` — page controller (285 lines)
- `src/pages/NewCSR.tsx` — create entry point
- `src/pages/EditCSR.tsx` — edit entry point
- `src/components/csr/CsrFormScreen.tsx` — form presentation (570 lines)
- `src/components/csr/csrUtils.ts` — utilities, serialization, preview building
- `src/components/csr/CsrImportSheet.tsx` — JSON import sheet
- `src/components/csr/csrImport.ts` — import prompt and Zod schema
- `src/components/csr/CSRPreviewContent.js` — reading fields, status options, template config
- `src/components/csr/CSRPreviewPanel.tsx` — preview panel
- `src/components/csr/CsrTemplateCarousel.tsx` — template selector
- `src/components/csr/preview-templates/*.tsx` — PDF templates (Minimal, IndustryCsr, Sentinel, Nexus)
- `src/components/ClientSelector.tsx` — client combobox with search and creation
- `src/components/UnitInput.tsx` — unit autocomplete with 60+ predefined units
- `src/components/NumericInput.tsx` — numeric-only input
- `src/components/layout/MobileFab.tsx` — floating action button
- `src/components/document/IdentityLockDialog.tsx` — identity lock alert dialog
- `src/components/ui/sheet.tsx` — bottom sheet (shadcn/vaul)
- `src/components/ui/select.tsx` — select dropdown (shadcn)
- `src/domain/csr/csrService.ts` — Supabase CRUD operations
- `src/domain/csr/csrRenderModel.ts` — render model builder
- `src/lib/native/csrOffline.ts` — offline draft creation (Android SQLite)
- `src/lib/native/csrSync.ts` — offline-to-online sync
- `src/pages/viewCSRActions.ts` — archive, delete, status update, duplicate

---

## 1. Complete Live Functional Inventory

### 1.1 Header / Navigation

| Element | Control Type | Create Behavior | Edit Behavior | Notes |
|---------|-------------|----------------|---------------|-------|
| Back navigation | Router (Layout) | Back to /csr | Back to /csr/:id | Provided by Layout component |
| Page title | Layout title prop | "New CSR" | "Edit CSR" | Dynamic based on mode |
| Overflow menu | Icon button (MoreHorizontal) | Visible, no actions wired | Visible, no actions wired | Placeholder — no onClick handler |
| Mode display | Text in section header | "New CSR" / "Create CSR" | "Edit CSR" / "Update CSR" | Large text in Document Details section |

### 1.2 Document Details Section

| Field | Control Type | Required | Default | Create | Edit | Validation | Locked |
|-------|-------------|----------|---------|--------|------|------------|--------|
| Client | ClientSelector (Combobox → drawer mobile / popover desktop) | Yes (except field mode) | Empty | Full search, creation, clear | Locked, click opens IdentityLockDialog | client_id must be non-empty | Yes (edit) |
| CSR Number | TextInput (mono font, auto-number) | Yes | Auto-generated from DB sequence | Editable, onBlur restores last good | Locked display, click opens IdentityLockDialog | Must be non-empty, unique | Yes (edit) |
| Date | TextInput (date type) | Optional | Today's date | Editable | Editable | — | No |
| Customer Name | TextInput | Optional | Empty | Editable, synced from client | Locked display, click opens IdentityLockDialog | — | Yes (edit) |
| PO Number | TextInput | Optional | Empty | Editable | Editable | Sets show_po=true when non-empty | No |

### 1.3 Item Controls Section

| Field | Control Type | Create | Edit | Notes |
|-------|-------------|--------|------|-------|
| Import | Button → CsrImportSheet | Full-width button | Same | Opens Zod-validated import sheet |

### 1.4 Main Details Section

| Field | Control Type | Options | Default | Required |
|-------|-------------|---------|---------|----------|
| Call Type | Select (shadcn) | Breakdown, Preventive Maintenance, Installation, Commissioning, Inspection, Emergency Repair, Other | Empty | Optional |
| Service Basis | Select (shadcn) | Paid Service, AMC, Warranty | Empty | Optional |
| System Down | Select (shadcn) | Yes, No | Empty (null) | Optional |

### 1.5 Equipment Section

| Field | Control Type | Dynamic Label | Notes |
|-------|-------------|---------------|-------|
| Equipment Type | TextInput | No | — |
| Equipment Location | TextInput | No | — |
| Make | TextInput | No | — |
| Capacity | TextInput | No | — |
| Model | TextInput | Yes (csrMeta.modelLabel) | Label changes from imported metadata |
| Serial No. | TextInput | Yes (csrMeta.serialLabel) | Label changes from imported metadata |
| Engine No | TextInput | No | — |

### 1.6 Problem & Service Section

| Field | Control Type | Min Height | Notes |
|-------|-------------|------------|-------|
| Problem Reported | TextArea | 84px | — |
| Service Rendered | TextArea | 96px | Larger default |
| Defects Found | TextArea | 84px | — |
| Engineer Remarks | TextArea | 84px | — |

### 1.7 Service Execution Section

| Field | Control Type | Default | Notes |
|-------|-------------|---------|-------|
| Start Date | TextInput (date) | Today | — |
| Start Time | TextInput (time) | Empty | — |
| End Date | TextInput (date) | Today | — |
| End Time | TextInput (time) | Empty | — |
| Status After Service | Select (shadcn) | Complete / Field Entry Pending (field mode) | 5 options |

### 1.8 Operational Readings Section (collapsible)

| Field | Control Type | Toggle | Default |
|-------|-------------|--------|---------|
| Show/Hide | HeaderActionButton | showOperationalReadings | Visible |
| Voltage | TextInput | — | Empty |
| Frequency | TextInput | — | Empty |
| Battery | TextInput | — | Empty |
| Temperature | TextInput | — | Empty |
| Pressure | TextInput | — | Empty |
| Hours | TextInput | — | Empty |

### 1.9 Materials Section

| Field | Control Type | Notes |
|-------|-------------|-------|
| Editable title | Input (default: "Materials Used") | User can rename |
| Count badge | Green pill (computed) | Non-empty row count |
| Material item | TextInput per row | — |
| Material quantity | NumericInput per row | Numeric-only |
| Material unit | UnitInput per row | 60+ predefined units, autocomplete, custom creation |
| Add material | Button | Appends new row |
| Remove material | "Remove" text button per row | Only shown when >1 row |

### 1.10 Technician Section (collapsible)

| Field | Control Type | Toggle | Notes |
|-------|-------------|--------|-------|
| Include/Exclude | HeaderActionButton | showTechnicianSignLine | Default: visible |
| Technician Name | TextInput | — | Stored in csrMeta |
| Choose/Change signatory | Button → Bottom sheet | — | Loads from signatories table |
| Active signatory | Highlighted row | — | Primary-colored border |
| Leave blank | Button | — | Clears technician_signatory_id |

### 1.11 Acknowledgement Section (collapsible)

| Field | Control Type | Toggle | Notes |
|-------|-------------|--------|-------|
| Include/Exclude | HeaderActionButton | showAcknowledgement | Default: visible |
| Recipient name/title | TextInput | — | acknowledgement_name field |
| Comment | TextArea | — | customer_feedback field |
| Recipient Signature | Signature display + file upload | — | Image validation via documentImageUploadPolicy |
| Upload signature | Button → Native file picker | — | Reads as dataURL |
| Leave blank | Button | — | Clears recipient_signature_uri |

### 1.12 Save Flow

| Step | Behavior |
|------|----------|
| CSR number validation | Checks csrNumberPopulated ref + trim |
| Client validation (create) | Requires client_id in non-field mode |
| Client validation (edit) | Requires client_id |
| Project assignment validation | validateProjectAssignment check |
| Duplicate prevention (create) | withUniqueRetry auto-retries with next number |
| Duplicate prevention (edit) | Queries existing CSRs by number |
| Offline save | createOfflineCsrDraft (Android SQLite) |
| Online save (create) | createCsr via domain service |
| Online save (edit) | updateCsr via domain service |
| PDF generation (field mode) | Builds preview, generates PDF blob, auto-downloads |
| Navigation on success | navigate to /csr/:id |
| Error handling | feedback.error with getUserFacingMutationMessage |
| Save disabled states | saving, offline, !csrNumberReady, empty csr_number |

### 1.13 Other Interactions

| Interaction | Behavior |
|-------------|----------|
| Offline indicator | Fixed amber bar at bottom when offline |
| Online/offline tracking | window event listeners |
| CSR number blur restore | Restores last good number if cleared |
| Blank CSR download | Generates blank PDF with next number, logs to blank_csr_logs |
| Duplicate draft | Navigates to /csr/new with duplicateState |
| JSON import | CsrImportSheet with Zod validation and field mapping |
| Project prefill | From route state (projectId, clientId, clientName) |
| Invoice prefill | From route state sourceInvoice + optional DB query |
| Field mode | Status defaults to "Field Entry Pending", auto-PDF on save |

---

## 2. Candidate Template Inventory

### 2A. Actual User-Facing Functionality Represented

| Function | Representation | Notes |
|----------|---------------|-------|
| Client selector | Bottom sheet with search filter | Static mock data (4 clients) |
| CSR number input | Text input with mock value | No auto-number logic |
| Date input | Date input | Default to hardcoded date |
| Customer contact | Text input | Manual entry only |
| PO number | Text input | — |
| Call type select | Select with 7 options | Matches live options |
| Service basis select | Select with 3 options | Matches live options |
| System down select | Select with Yes/No | Missing null state |
| Equipment fields (7) | Text inputs | All present |
| Problem/service textareas (4) | Textareas | All present |
| Start/end date+time (4) | Date/time inputs | All present |
| Status after service | Select with 6 options | One extra option vs live |
| Operational readings (6) | Text inputs with toggle | All present |
| Materials rows | Item/qty/unit with add/remove | Basic text inputs, no autocomplete |
| Technician name | Text input | — |
| Signatory selection | Bottom sheet (mock data) | 3 mock signatories |
| Recipient name | Text input | — |
| Customer feedback | Textarea | — |
| Recipient signature upload | File input with preview | Basic image type check |
| Import JSON | Bottom sheet with textarea | Raw JSON parse, no Zod |
| Field mode toggle | Header button | Explicit toggle |
| Save | FAB with toast feedback | No real backend |
| Download blank | Icon button in header | Toast only |
| Identity lock dialog | Centered modal | In-place modal |
| Validation | Scroll-to-field + error pulse | CSR number + client required |
| Offline indicator | Fixed amber bar | Hardcoded isOnline=true |
| Include/exclude toggles | Icon buttons (operational readings, technician, acknowledgement) | Green/red color coding |
| Editable materials title | Input replacing section title | — |
| Material count | Mono text count | — |

### 2B. Pure Visual/Layout Decisions

| Decision | Description | Design.md Compliance |
|----------|-------------|---------------------|
| Numbered sections (01-10) | Section titles with ordinal numbers | Not specified — novel pattern |
| Continuous form flow | Flat divide-y layout without card surfaces | Non-compliant (Design.md requires cards) |
| Background decoration | Industrial clipboard, hardhat SVGs, radial gradients | Non-compliant (anti-pattern #9) |
| FAB halo animation | Pulsing glow around save button | Decorative, performance risk |
| Ambient shape drift | Floating decorative shapes | Decorative, no UX value |
| Custom inline SVG icons | 80+ lines of Lucide-style SVGs | Non-compliant (project uses Lucide) |
| Hardcoded hex colors | Every color is a literal hex value | Non-compliant (must use tokens) |
| Compact spacing (2-6px) | Very tight field spacing | Partially compliant (density philosophy correct, but below minimum touch targets) |
| Smaller type sizes (7-13px) | Compact typography | Partially compliant (matches density, but 7px is below 6px minimum) |
| Toggle buttons with icons | Included/Excluded with up/down arrows | Not specified — novel pattern |
| 10px rounded inputs | Consistent border radius | Non-compliant (Design.md: 12-13px for inputs) |
| 3-column service params grid | Call type, service basis, system down in one row | Not specified for forms |

### 2C. Interaction Patterns

| Pattern | Description | Quality |
|---------|-------------|---------|
| Scroll-to-field validation | Scrolls to offending field with error pulse | Strong — better than live |
| Field mode toggle | Explicit button in header | Strong — more discoverable than URL param |
| Toggle included/excluded | Color-coded icon buttons | Good — clear visual state |
| Bottom sheets | Client, signatory, import | Consistent with Design.md |
| Inline identity lock | Click locked field → modal → duplicate | Functional but less polished than AlertDialog |
| Toast notifications | Fixed bottom toast with error variant | Basic — no action support |

### 2D. Mock/Backend-Independent Behavior

| Behavior | Description |
|----------|-------------|
| Mock client database | 4 hardcoded Nigerian companies |
| Mock signatory database | 3 hardcoded engineers |
| Mock form data | Pre-filled with realistic demo data |
| Hardcoded CSR number | "CSR-2026-0084" |
| isOnline = true | Always online |
| Save → toast only | No persistence |
| Import → field population | JSON parsed and applied to state |

### 2E. Decorative Elements (No Meaningful UX Value)

| Element | Description | Verdict |
|---------|-------------|---------|
| Background clipboard SVG | Top-right industrial clipboard illustration | Remove — decorative noise |
| Background hardhat SVG | Mid-left safety helmet illustration | Remove — decorative noise |
| Background dashed circle | Bottom-left dashed circle border | Remove — decorative noise |
| Background radial gradient circle | Bottom-left green tint | Remove — decorative noise |
| FAB halo pulse | Animated glow around save button | Remove — decorative, performance risk |
| FAB float animation | Bouncing save button | Remove — decorative |
| Ambient shape drift | Floating decorative elements | Remove — no UX value |

---

## 3. Functional Completeness Matrix

| Live Function | Candidate Representation | Coverage | Correctness | UX Notes |
|---------------|------------------------|----------|-------------|----------|
| **HEADER** | | | | |
| Back navigation (Layout) | Not present (standalone) | MISSING | — | Must wrap in Layout |
| Page title (Layout) | "Customer Service Report" inline | PARTIAL | Low | Live uses dynamic mode-based title |
| Overflow menu | Not present | MISSING | — | Live has placeholder; acceptable omission |
| Save FAB (mobile) | FAB with halo animation | PARTIAL | Partial | Live uses MobileFab component; candidate adds decorative animation |
| Save FAB (desktop) | Not differentiated | MISSING | — | Live has separate desktop buttons |
| Download blank | Icon in header | PARTIAL | Low | Live generates real PDF; candidate shows toast |
| **CLIENT** | | | | |
| Client selector (Combobox) | Custom bottom sheet with string filter | PARTIAL | Partial | Live has Combobox with search, creation, details card |
| Client creation (inline) | Not present | MISSING | — | Live opens ClientForm dialog from selector |
| Client details card | Not present | MISSING | — | Live shows name, contact, phone, email, address |
| Clear client | Not present | MISSING | — | Live has X button on selected client |
| Edit-mode lock | Click → inline modal | PARTIAL | Partial | Live uses AlertDialog with proper accessibility |
| **DOCUMENT DETAILS** | | | | |
| CSR number (create) | Text input with mock value | PARTIAL | Partial | Live auto-numbers from DB sequence |
| CSR number auto-number | Not present | MISSING | — | Live queries DB for next number |
| CSR number (edit) | Locked div with lock icon | FULL | Full | Matches live pattern |
| Date | Date input | FULL | Full | — |
| Customer name (create) | Text input | PARTIAL | Partial | Live syncs from client selection |
| Customer name (edit) | Locked div | FULL | Full | — |
| PO number | Text input | FULL | Full | — |
| **SERVICE PARAMETERS** | | | | |
| Call type | Select (7 options) | FULL | Full | — |
| Service basis | Select (3 options) | FULL | Full | — |
| System down | Select (Yes/No) | PARTIAL | Partial | Live allows null (unset) |
| **EQUIPMENT** | | | | |
| Equipment type | Text input | FULL | Full | — |
| Equipment location | Text input | FULL | Full | — |
| Make | Text input | FULL | Full | — |
| Capacity | Text input | FULL | Full | — |
| Model (dynamic label) | Text input (static label) | PARTIAL | Partial | Live uses csrMeta.modelLabel |
| Serial No. (dynamic label) | Text input (static label) | PARTIAL | Partial | Live uses csrMeta.serialLabel |
| Engine No | Text input | FULL | Full | — |
| **PROBLEM & SERVICE** | | | | |
| Problem reported | Textarea | FULL | Full | — |
| Service rendered | Textarea | FULL | Full | — |
| Defects found | Textarea | FULL | Full | — |
| Engineer remarks | Textarea | FULL | Full | — |
| **SERVICE EXECUTION** | | | | |
| Start date | Date input | FULL | Full | — |
| Start time | Time input | FULL | Full | — |
| End date | Date input | FULL | Full | — |
| End time | Time input | FULL | Full | — |
| Status after service | Select (6 options) | FULL | Full | Candidate has 1 extra option |
| **OPERATIONAL READINGS** | | | | |
| Show/hide toggle | Icon toggle buttons | FULL | Full | — |
| Voltage | Text input | FULL | Full | — |
| Frequency | Text input | FULL | Full | — |
| Battery | Text input | FULL | Full | — |
| Temperature | Text input | FULL | Full | — |
| Pressure | Text input | FULL | Full | — |
| Hours | Text input | FULL | Full | — |
| **MATERIALS** | | | | |
| Editable title | Input replacing title | FULL | Full | — |
| Material count | Mono text count | PARTIAL | Partial | Live uses green badge pill |
| Material item | Text input per row | FULL | Full | — |
| Material quantity | HTML number input | PARTIAL | Partial | Live uses NumericInput component |
| Material unit | Plain text input | MISSING | — | Live uses UnitInput with 60+ units |
| Add material | Button | FULL | Full | — |
| Remove material | Close icon button | PARTIAL | Partial | Live uses "Remove" text (larger touch target) |
| Unit autocomplete | Not present | MISSING | — | Live has 60+ predefined units |
| **TECHNICIAN** | | | | |
| Include/exclude toggle | Icon toggle buttons | FULL | Full | — |
| Technician name | Text input | FULL | Full | — |
| Signatory selection | Bottom sheet (mock data) | PARTIAL | Partial | Live loads from DB |
| Active signatory highlight | Primary-soft background | FULL | Full | — |
| Clear signatory | "Clear" button | FULL | Full | — |
| **ACKNOWLEDGEMENT** | | | | |
| Include/exclude toggle | Icon toggle buttons | FULL | Full | — |
| Recipient name/title | Text input | FULL | Full | — |
| Comment/feedback | Textarea | FULL | Full | — |
| Recipient signature upload | File input with preview | PARTIAL | Partial | Live has image validation policy |
| Clear signature | Close icon on preview | FULL | Full | — |
| **SAVE** | | | | |
| CSR number validation | Trim check | PARTIAL | Partial | Live uses ref-based restore |
| Client validation | Client object check | PARTIAL | Partial | Live checks client_id |
| Project validation | Not present | MISSING | — | Live validates project assignment |
| Duplicate prevention | Not present | MISSING | — | Live uses withUniqueRetry |
| Offline save | Not present | MISSING | — | Live creates SQLite draft |
| Real save (create) | Toast only | MISSING | — | Live persists to Supabase |
| Real save (edit) | Toast only | MISSING | — | Live updates Supabase |
| PDF generation (field) | Not present | MISSING | — | Live auto-downloads PDF |
| Navigation on success | Not present | MISSING | — | Live navigates to /csr/:id |
| Error handling | Toast only | MISSING | — | Live uses getUserFacingMutationMessage |
| Save disabled states | Not present | MISSING | — | Live disables when saving/offline/not ready |
| **OTHER** | | | | |
| Offline indicator | Fixed amber bar | FULL | Full | — |
| Blank CSR download (real) | Toast only | MISSING | — | Live generates PDF + logs |
| Duplicate draft (real) | State reset | MISSING | — | Live navigates with route state |
| JSON import (Zod) | Inline textarea | PARTIAL | Low | Live uses CsrImportSheet with Zod |
| Project prefill | Not present | MISSING | — | Live prefills from route state |
| Invoice prefill | Not present | MISSING | — | Live prefills from route state |
| Identity lock dialog | Custom inline modal | PARTIAL | Partial | Live uses AlertDialog |
| Image upload validation | Basic file.type check | PARTIAL | Partial | Live validates against policy |
| CSR number blur restore | Not present | MISSING | — | Live restores last good number |

### Summary Counts

| Coverage | Count |
|----------|-------|
| FULL | 34 |
| PARTIAL | 18 |
| MISSING | 22 |
| NOT APPLICABLE | 0 |

---

## 4. UX / Design Comparison

### 4.1 Information Architecture

**Candidate is stronger.** The numbered section hierarchy (01-10) creates a clear mental map: "I am at section 5 of 10." This is critical for a 10-section form with 40+ fields. The live form uses card-based sections with colored dots, which are functional but less structured. The numbered approach reduces cognitive load by providing explicit progress markers.

**Live form weakness:** Section titles use only colored dots and uppercase text. On a long scroll, users lose context about where they are in the form.

### 4.2 Section Hierarchy

**Candidate is stronger.** The candidate organizes sections with clear ordinal prefixes and visual separators (divide-y). Each section has a consistent format: number + title + content. The live form's card-based sections are visually heavier (rounded-[20px] borders, shadows, padding) but provide better visual separation between sections.

**Recommendation:** Combine both approaches. Use numbered sections with card surfaces for visual separation. The numbering provides mental mapping; the cards provide visual hierarchy.

### 4.3 Visual Hierarchy

**Candidate is weaker.** The candidate uses a flat layout with divide-y separators. There is no visual depth between sections. The live form's card-based sections create clear visual grouping: each section is a distinct white card on a gray background. This aligns with Design.md's card component rules (18px radius, subtle shadow, border).

**Design.md alignment:** The live form follows Design.md's card treatment. The candidate does not use cards at all — it uses a flat divide-y layout that contradicts the design system.

### 4.4 Form Discoverability

**Candidate is stronger.** The numbered sections and explicit section titles make the form more discoverable. Users can scan section titles to find specific fields. The live form's sections are equally titled but the card-based layout creates more visual noise, making scanning slightly harder.

### 4.5 Completion Flow

**Candidate is stronger.** The continuous form flow (no card boundaries) creates a sense of momentum. Users flow through sections without visual interruptions. The live form's card boundaries create visual "stops" that can feel like natural break points — which is good for pausing but bad for completion speed.

**Recommendation:** Use a continuous flow with subtle section separators (not full cards) for most sections, but use card surfaces for the most important sections (Document Details, Save area).

### 4.6 Cognitive Load

**Candidate is stronger.** The smaller type sizes (7-13px) and tighter spacing (2-6px) create higher information density. Users see more fields per screen scroll. This reduces the perceived length of the form. The live form's larger type (10-14px) and looser spacing make the form feel longer and more tedious.

**Design.md alignment:** Both approaches are partially compliant. Design.md says "compact density" with type sizes from 6-17px. The candidate's 7px is close to the minimum. The live form's 10px is comfortable but less dense.

### 4.7 Long-Form Navigation

**Candidate is stronger.** The numbered sections provide explicit navigation markers. Users can say "I need to go to section 4 (Equipment)." The live form lacks this — users must remember section names or visual positions.

**Live form weakness:** No section numbering. On a 10-section form, users lose context about position and progress.

### 4.8 Interaction Density

**Candidate is stronger.** The compact layout fits more fields per viewport. The 3-column service parameters grid (call type, service basis, system down) is more efficient than the live form's 2-column layout. The candidate's materials grid (12-column) is more compact than the live form's fixed-width columns.

### 4.9 Touch Ergonomics

**Live form is stronger.** The live form's touch targets are consistently 44px+ (h-8 to h-11). The candidate's touch targets are frequently below 30px (h-[28-30px] buttons, w-6 h-6 material remove). This violates Design.md's 44×44px minimum touch target requirement.

**Critical issue:** The candidate's material remove button (24×24px) is unusable on Android. The live form's "Remove" text button provides a much larger tap area.

### 4.10 Android Integrity

**Live form is stronger.** The live form uses proper Android patterns:
- MobileFab component for FAB (correct position, size, disabled states)
- Bottom sheet (vaul) with swipe-to-dismiss
- Layout component with back navigation
- Safe area handling via env() CSS functions
- Offline indicator with proper z-index stacking

The candidate lacks:
- Proper FAB positioning (no bottom nav offset)
- Swipe-to-dismiss on sheets
- Safe area handling
- Back navigation
- Keyboard avoidance

### 4.11 One-Handed Usability

**Live form is stronger.** The live form's FAB is positioned at `bottom-[94px]` (above bottom nav), making it reachable with one thumb. The candidate's FAB is at `bottom-6 right-5`, which may overlap with bottom navigation or be too low.

### 4.12 Keyboard/Input Ergonomics

**Neither is strong.** Neither form explicitly handles keyboard avoidance (pushing content up when keyboard appears). The live form relies on the Layout component's scroll behavior. The candidate has no keyboard handling.

### 4.13 Bottom-Sheet/Dialog Usage

**Candidate is stronger in visual design.** The candidate's bottom sheets use backdrop-blur-xs and max-h-[78vh], which matches Design.md. The toggle included/excluded buttons with color coding are clearer than the live form's text-only "Included"/"Include" buttons.

**Live form is stronger in implementation.** The live form uses the shared Sheet component (shadcn/vaul) with proper swipe-to-dismiss, focus trapping, and aria-modal. The candidate's sheets are custom implementations without these accessibility features.

### 4.14 Selector Usability

**Live form is stronger.** The live form's ClientSelector is a full Combobox with:
- Real-time search filtering
- Client creation (Add New Client)
- Client details card (name, contact, phone, email, address)
- Clear button

The candidate's client selector is a basic bottom sheet with string matching on 4 mock clients. It lacks search sophistication, creation, details display, and clear functionality.

### 4.15 Error and Validation UX

**Candidate is stronger.** The candidate implements scroll-to-field with error pulse animation on validation failure. This is a superior pattern for long forms — users see exactly which field needs attention. The live form uses feedback.error toast messages that do not scroll to the offending field.

**Live form weakness:** Toast-only validation errors are easy to miss on a long form. Users must scroll to find the problem field themselves.

### 4.16 Required/Optional Field Clarity

**Candidate is stronger.** The candidate uses a red asterisk (*) on required fields (CSR number, client). The live form uses no visual indicators for required fields — users must infer which fields are required from the validation behavior.

### 4.17 Create vs Edit Clarity

**Both are equal.** Both forms clearly distinguish create and edit modes through locked fields, IdentityLockDialog, and mode labels. The candidate's explicit "CREATE"/"EDIT" toggle button is slightly more discoverable than the live form's URL-based mode detection.

### 4.18 Locked Field Communication

**Both are equal.** Both forms use lock icons and IdentityLockDialog. The candidate's inline lock modal is slightly less polished than the live form's AlertDialog, but both communicate the same information.

### 4.19 Destructive Action Safety

**Live form is stronger.** The live form's IdentityLockDialog uses AlertDialog with explicit Cancel and "Duplicate Current Changes" buttons, following the shadcn AlertDialog pattern. The candidate's inline modal has less visual hierarchy between actions.

### 4.20 Loading/Empty/Error State Design

**Neither is strong.** Neither form has a loading skeleton or empty state for the form itself. The live form has a "Loading CSR..." text state for edit mode. The candidate has no loading state at all (mock data is always present).

### 4.21 Offline-State Communication

**Both are equal.** Both show a fixed amber bar when offline. The live form additionally disables the save button. The candidate hardcodes isOnline=true.

### 4.22 Accessibility

**Live form is stronger.** The live form uses:
- Proper ARIA labels on buttons
- Focus management via Radix primitives
- Keyboard navigation via shadcn components
- Screen reader support via aria-label on FAB

The candidate lacks:
- ARIA labels
- Focus management
- Keyboard navigation
- Screen reader support

### 4.23 Responsive Behavior

**Neither is strong.** Both forms are single-column mobile layouts. The live form has a desktop save button (hidden on mobile, shown on sm+). The candidate has no responsive differentiation.

### 4.24 Design-System Conformity

**Live form is stronger.** The live form uses:
- Semantic CSS variables (bd-text, bd-surface, bd-border, bd-button-primary-bg)
- Shared UI components (Select, Sheet, AlertDialog)
- Consistent radius scale (12px inputs, 16px cards, 20px sections)
- Proper typography scale (10-14px range)

The candidate uses:
- Hardcoded hex colors throughout
- Custom inline components (no shared UI)
- Inconsistent radius (10px everywhere)
- Compressed typography (7-13px)

### 4.25 Consistency with Design.md

**Live form is stronger.** The live form follows Design.md's:
- Card-based sections with proper shadows and borders
- Input heights (44px via h-11)
- Focus ring patterns
- Semantic color tokens
- Component patterns (Sheet, Select, AlertDialog)

The candidate deviates from Design.md's:
- Card requirements (uses flat divide-y instead)
- Input heights (38px, below 44px)
- Color system (hardcoded hex instead of tokens)
- Radius scale (10px instead of 12-13px for inputs)
- Touch targets (24-30px instead of 44px)

### 4.26 Visual Restraint

**Live form is stronger.** The live form has minimal decorative elements. The candidate has significant decorative noise: background SVGs, ambient shape drift, FAB halo animation, FAB float animation. These violate Design.md's anti-pattern #9: "no decorative elements that reduce usability."

### 4.27 Ability to Handle Complete CSR Without Becoming Overwhelming

**Candidate is stronger.** The numbered section hierarchy and compact density make the 10-section, 40+ field form feel manageable. The live form's card-based sections with larger type make the same form feel longer and more tedious.

---

## 5. Design.md Compliance

| Design Decision | Candidate | Live Form |
|----------------|-----------|-----------|
| **Mobile-first behavior** | Compliant — single column, stacked layout | Compliant — single column, stacked layout |
| **Android interaction patterns** | Non-compliant — no ripple, no predictive back, no swipe-to-dismiss | Partially compliant — uses shadcn but no explicit ripple |
| **Spacing** | Non-compliant — 2-6px below Design.md's 2-14px scale (on the edge) | Compliant — uses 8-14px range |
| **Typography** | Partially compliant — uses Manrope + DM Mono but sizes below 6px minimum | Compliant — uses Manrope + DM Mono, 10-14px range |
| **Surfaces/cards** | Non-compliant — uses flat divide-y, no card surfaces | Compliant — uses card-based sections with shadows |
| **Radius system** | Non-compliant — 10px everywhere instead of 5-40px hierarchy | Compliant — 12px inputs, 16px cards, 20px sections |
| **Controls** | Non-compliant — 38px inputs, 24-30px buttons | Compliant — 44px inputs, 32-44px buttons |
| **Sheets/overlays** | Partially compliant — max-h 78%, 24px radius, but no swipe-to-dismiss | Compliant — uses shared Sheet component |
| **Touch targets** | Non-compliant — 24-30px buttons below 44px minimum | Compliant — 44px+ targets |
| **Safe-area handling** | Non-compliant — no env() usage | Partially compliant — Layout handles some |
| **Responsive behavior** | Non-compliant — no desktop adaptation | Partially compliant — desktop save button |
| **Information density** | Compliant — compact layout, more fields per viewport | Partially compliant — larger type reduces density |
| **Navigation** | Non-compliant — no back navigation, no Layout wrapper | Compliant — Layout with router-based back |
| **Visual hierarchy** | Non-compliant — flat layout, no card depth | Compliant — card-based sections create hierarchy |
| **Design tokens** | Non-compliant — all hardcoded hex values | Compliant — uses semantic CSS variables |
| **Avoidance of unnecessary decorative UI** | Non-compliant — background SVGs, FAB animation, ambient shapes | Compliant — minimal decoration |

**Summary:** The candidate is compliant on 2 of 16 Design.md categories. The live form is compliant or partially compliant on 13 of 16 categories. The live form is significantly more aligned with Design.md.

---

## 6. Android / Mobile Integrity Audit

### Touch Target Sizes

| Element | Candidate | Live | Design.md Requirement | Verdict |
|---------|----------|------|----------------------|---------|
| FAB | 50×50px | 56×56px (h-14 w-14) | 44×44px min | Both pass |
| Section toggle buttons | 30×30px | 32px (h-8) | 44×44px min | Both fail |
| Material remove | 24×24px | Text button (~32px height) | 44×44px min | Both fail (candidate worse) |
| Header action buttons | 28-30px | 32px (h-8) | 44×44px min | Both fail |
| Import button | 30×30px | 42px (h-[42px]) | 44×44px min | Candidate fails, live nearly passes |

### Thumb Reach

**Live form is stronger.** The live form's FAB is positioned at `bottom-[94px]` (above bottom nav), within thumb reach on most phones. The candidate's FAB at `bottom-6` (24px) may be too low — below the home indicator on modern phones.

### Bottom Action Placement

**Live form is stronger.** The live form uses MobileFab which accounts for bottom nav offset. The candidate's FAB does not account for safe-area-inset-bottom.

### Keyboard Avoidance

**Neither is strong.** Neither form explicitly handles keyboard push-up. On Android, the keyboard covers the bottom portion of the form. Users must scroll to see the focused field.

### Safe-Area Handling

**Live form is stronger.** The live form inherits safe-area handling from the Layout component. The candidate has no safe-area handling — content may render under the notch or home indicator.

### Sheet Behavior

**Live form is stronger.** The live form uses vaul (via shadcn Sheet) with swipe-to-dismiss, focus trapping, and aria-modal. The candidate's sheets are custom implementations without these features.

### Scroll Behavior

**Neither is strong.** Neither form explicitly sets `overscroll-behavior: contain` to prevent scroll chaining. The live form relies on Layout's scroll containment.

### Nested Scrolling

**Both are equal.** Both handle nested scrolling adequately (sheets have overflow-y-auto).

### Modal Stacking

**Live form is stronger.** The live form uses Radix AlertDialog with proper z-index stacking. The candidate's inline modals use arbitrary z-index values (z-60).

### Input Focus

**Neither is strong.** Neither form manages focus progression (tab order) across fields. On Android, the default focus behavior is adequate but not optimized.

### Field Progression

**Neither is strong.** Neither form implements logical field progression (e.g., auto-advance from date to time input). Users must manually tap each field.

### Back Navigation Expectations

**Live form is stronger.** The live form provides back navigation via Layout. The candidate has no back navigation — on Android, pressing back may exit the app.

### Destructive Action Confirmation

**Live form is stronger.** The live form uses AlertDialog for identity lock (with Cancel and Duplicate buttons). The candidate's inline modal has less clear action hierarchy.

### Long-Form Navigation

**Candidate is stronger.** The numbered section hierarchy provides better navigation context for a 10-section form. The live form lacks section numbering.

### Dense Data Entry

**Candidate is stronger.** The compact density allows more fields per viewport, reducing scroll distance for data entry.

### Landscape/Foldable Behavior

**Neither is strong.** Neither form has explicit landscape or foldable behavior. Both are single-column layouts.

### Tablet Adaptation

**Neither is strong.** Neither form has tablet-specific layouts.

### Desktop Expansion

**Live form is slightly stronger.** The live form has desktop save buttons. The candidate has no desktop-specific behavior.

### Accessibility

**Live form is stronger.** The live form uses proper ARIA labels, focus management via Radix, and keyboard navigation via shadcn. The candidate lacks all of these.

### Accidental Tap Prevention

**Live form is stronger.** The live form's larger touch targets (44px+) reduce accidental taps. The candidate's small targets (24-30px) increase accidental tap risk.

### Items That Only LOOK Mobile

The candidate has several elements that look mobile but do not demonstrate strong mobile interaction design:
1. **FAB halo animation** — decorative, not functional; wastes battery on low-end devices
2. **Ambient shape drift** — decorative background that adds visual noise on small screens
3. **Custom inline SVG icons** — adds 80+ lines of code when Lucide is available
4. **Backdrop-blur-xs on sheets** — glassmorphism effect that Design.md explicitly forbids
5. **Small touch targets** — looks compact but fails Android interaction requirements

---

## 7. Candidate Strengths

| Strength | Description | Why It Matters |
|----------|-------------|---------------|
| Numbered section hierarchy | Sections labeled 01-10 with ordinal prefixes | Creates mental map for long form navigation |
| Scroll-to-field validation | Scrolls to offending field with error pulse animation | Reduces cognitive load when form is long |
| Explicit field mode toggle | "Field"/"Standard" button in header | More discoverable than URL query param |
| Toggle included/excluded | Color-coded icon buttons (green/red) | Clearer visual state than text-only buttons |
| Compact density | Smaller type, tighter spacing | More fields per viewport, reduces perceived form length |
| Continuous form flow | No card boundaries between sections | Creates sense of momentum through form |
| 3-column service params grid | Call type, service basis, system down in one row | More efficient use of horizontal space |
| Materials grid efficiency | 12-column grid (6/3/3) | More compact than live form's fixed-width columns |
| Required field indicators | Red asterisk on required fields | Clearer than live form's implicit requirements |
| Pre-filled demo data | Realistic Nigerian business data | Shows how the form looks with actual content |

---

## 8. Candidate Weaknesses

| Weakness | Description | Impact |
|----------|-------------|--------|
| Monolithic 1567-line component | No component extraction | Impossible to maintain or test |
| No backend integration | Toast-only save | Cannot evaluate real user flow |
| Hardcoded colors | Every color is a hex literal | Violates Design.md token architecture |
| No design tokens | No CSS variable usage | Cannot support theming |
| Decorative background elements | Clipboard SVG, hardhat SVG, ambient shapes | Violates Design.md anti-pattern #9 |
| FAB animation | Halo pulse + float animation | Decorative, performance risk on low-end Android |
| Small touch targets | 24-30px buttons | Violates Design.md 44px minimum |
| No safe-area handling | No env() CSS functions | Content renders under notch/home indicator |
| No back navigation | Standalone component | Android back button exits app |
| No swipe-to-dismiss on sheets | Custom sheet implementations | Violates Android interaction model |
| Custom SVG icons | 80+ lines of inline SVGs | Project uses Lucide; adds maintenance burden |
| Backdrop-blur on sheets | glassmorphism effect | Explicitly forbidden by Design.md |
| No accessibility features | No ARIA labels, no focus management | Fails WCAG requirements |
| No responsive design | Single-column mobile only | No desktop adaptation |
| No loading/empty states | Mock data always present | Cannot evaluate real form behavior |
| Missing UnitInput | Plain text for material units | Loses 60+ predefined unit autocomplete |
| Missing NumericInput | HTML number input | Loses numeric-only validation |
| Missing client creation | No inline client creation | Users cannot add clients from form |
| Missing project validation | No project assignment check | Cannot validate data integrity |
| Missing duplicate prevention | No withUniqueRetry | CSR number conflicts not handled |
| Missing offline save | Hardcoded isOnline=true | No offline support evaluation |

---

## 9. Live-Form UX Weaknesses

| Issue | Current Behavior | UX Problem | Why It Matters | Recommended Direction |
|-------|-----------------|------------|----------------|----------------------|
| No section numbering | Sections use only colored dots and names | Users lose position context on long form | 10-section, 40+ field form is hard to navigate | Add numbered section prefixes (01-10) |
| Toast-only validation | feedback.error shows toast | Users must scroll to find problem field | On a long form, the error is off-screen | Add scroll-to-field with error pulse (candidate pattern) |
| No required field indicators | No visual markers for required fields | Users guess which fields are required | Unnecessary validation failures | Add red asterisk on required fields |
| Card-heavy sections | Each section is a white card with shadow | Visual noise on long form | Too many cards create visual fatigue | Use lighter separators for most sections; reserve cards for key sections |
| Larger type sizes | 10-14px throughout | Less information per viewport | Users scroll more to find fields | Reduce to 8-12px for labels, keep 12-14px for inputs |
| Text-only toggle buttons | "Included" / "Include" text buttons | State is not visually distinct | Users cannot quickly see section status | Use color-coded toggle with icons (candidate pattern) |
| Field mode via URL param | ?type=field in URL | Not discoverable | Users must know the URL pattern | Add explicit field mode toggle (candidate pattern) |
| MoreHorizontal placeholder | Overflow menu with no actions | Button exists but does nothing | Confusing — users expect it to do something | Either wire actions or remove the button |
| Materials count as plain text | "3 items" text in mono font | Not visually prominent | Count is easy to miss | Use green badge pill (like live form's other badges) |
| No section collapse animation | Sections show/hide instantly | No transition feedback | Jarring visual jump | Add smooth height transition |

---

## 10. Keep / Change / Reject Decisions

### KEEP FROM CANDIDATE (Design Patterns to Preserve)

| Pattern | Rationale |
|---------|-----------|
| Numbered section hierarchy (01-10) | Genuine improvement for long-form navigation. Creates mental map. |
| Scroll-to-field validation with error pulse | Superior UX for long forms. Reduces cognitive load. |
| Explicit field mode toggle | More discoverable than URL param. Should be in header. |
| Toggle included/excluded with color coding | Clearer visual state than text-only buttons. Use green/red icons. |
| Required field indicators (red asterisk) | Essential for form discoverability. Live form lacks this. |
| Compact information density | More fields per viewport reduces perceived form length. |
| 3-column service params grid | Efficient use of horizontal space for related selects. |
| Continuous form flow with subtle separators | Creates momentum without visual stops. |

### KEEP FROM LIVE FORM (Functionality That Must Survive)

| Function | Rationale |
|----------|-----------|
| ClientSelector with Combobox search | Full-featured: search, creation, details card, clear. Critical for data entry. |
| UnitInput with 60+ predefined units | Essential for materials section. Custom unit creation is a key feature. |
| NumericInput for material quantities | Proper numeric-only input prevents invalid entries. |
| Real save flow (create/edit) | Full Supabase integration with validation, retry, offline support. |
| IdentityLockDialog (AlertDialog) | Proper accessibility pattern with Cancel/Duplicate actions. |
| Layout wrapper with back navigation | Essential mobile chrome: back, title, immersive mode. |
| Design token usage | Semantic CSS variables enable theming and consistency. |
| MobileFab component | Proper FAB with disabled states, bottom nav offset. |
| Blank CSR download (real PDF) | Generates actual PDF with auto-number and logging. |
| Duplicate draft (route-based) | Navigates to create mode with prefilled data. |
| JSON import with Zod validation | Validates import data against schema before applying. |
| Project assignment validation | Ensures data integrity before save. |
| Duplicate number prevention (withUniqueRetry) | Prevents CSR number conflicts automatically. |
| Offline draft support (Android SQLite) | Real offline capability for field technicians. |
| PDF generation on field save | Auto-downloads PDF after field mode save. |
| Image upload validation policy | Validates file types against document policy. |
| CSR number blur restore | Prevents accidental clearing of auto-generated number. |
| Online/offline tracking | Real network status detection. |
| Edit-mode data loading | Loads existing CSR from DB with proper parsing. |
| Status-dependent behavior | Field mode auto-sets "Field Entry Pending" status. |

### CHANGE (Candidate Patterns Needing Modification)

| Pattern | Change | Rationale |
|---------|--------|-----------|
| Flat divide-y layout | Add card surfaces for key sections (Document Details, Equipment, Materials) | Design.md requires card-based sections |
| Hardcoded hex colors | Replace with semantic CSS variables | Design.md token architecture |
| Custom SVG icons | Replace with Lucide React | Project standard; reduces 80+ lines |
| Inline IdentityLockDialog | Replace with shared AlertDialog component | Consistent dialog pattern |
| Inline toast | Replace with feedback (Sonner) | Consistent toast behavior |
| 38px input height | Increase to 44px (h-11) | Design.md touch target minimum |
| 10px input radius | Change to 12px | Design.md radius scale |
| 24-30px buttons | Increase to 44px minimum | Design.md touch target minimum |
| backdrop-blur-xs on sheets | Remove glassmorphism | Design.md explicitly forbids |
| System down Yes/No only | Add null/unset option | Live form supports 3 states |
| Static model/serial labels | Use dynamic labels from metadata | Live form supports imported labels |
| Basic client selector | Replace with ClientSelector component | Live form has search, creation, details |
| Plain unit input | Replace with UnitInput component | Live form has 60+ units |
| HTML number input | Replace with NumericInput component | Live form has numeric-only validation |
| Basic file type check | Replace with image upload policy validation | Live form has proper validation |
| Toast-only import | Replace with CsrImportSheet + Zod | Live form has validated import |
| No save disabled states | Add saving, offline, !csrNumberReady states | Prevent invalid saves |
| No navigation on success | Add navigate to /csr/:id after save | Required user flow |
| Decorative background shapes | Remove all decorative SVGs and animations | Design.md anti-pattern #9 |
| FAB halo animation | Remove decorative animation | Performance risk, decorative |
| Ambient shape drift | Remove decorative background movement | No UX value, visual noise |

### REJECT (Candidate Patterns Not Suitable)

| Pattern | Reason |
|---------|--------|
| Decorative background SVGs (clipboard, hardhat) | Visual noise. Design.md anti-pattern #9. No business context. |
| FAB halo pulse animation | Decorative. Performance risk on low-end Android devices. |
| FAB float/bounce animation | Decorative. Distracts from primary action. |
| Ambient shape drift animation | Decorative. No functional purpose. |
| backdrop-blur-xs on sheets | Glassmorphism. Explicitly forbidden by Design.md. |
| Monolithic 1567-line component | Unmaintainable. Must extract into composable pieces. |
| isOnline = true hardcoded | Masks real offline behavior. Must use live detection. |
| Custom inline SVG icon set | Project uses Lucide. Custom icons add maintenance burden. |

---

## 11. Recommended Fresh Design Direction

### Recommended Information Architecture

```
┌─────────────────────────────────────┐
│  HEADER (Layout)                    │
│  ← Back  |  New CSR / Edit CSR     │
├─────────────────────────────────────┤
│  01. DOCUMENT DETAILS               │
│  ┌─ Client Selector (Combobox)      │
│  ├─ CSR Number | Date               │
│  ├─ Customer Name | PO Number       │
│                                     │
│  02. ITEM CONTROLS                  │
│  ┌─ [Import JSON]                   │
│                                     │
│  03. SERVICE PARAMETERS             │
│  ┌─ Call Type | Service Basis       │
│  ├─ System Down                     │
│                                     │
│  04. EQUIPMENT                      │
│  ┌─ Type | Location                 │
│  ├─ Make | Capacity                 │
│  ├─ Model | Serial No.              │
│  ├─ Engine No                       │
│                                     │
│  05. PROBLEM & SERVICE              │
│  ┌─ Problem Reported                │
│  ├─ Service Rendered                │
│  ├─ Defects Found | Engineer Rmks   │
│                                     │
│  06. SERVICE EXECUTION              │
│  ┌─ Start Date | Start Time         │
│  ├─ End Date | End Time             │
│  ├─ Status After Service            │
│                                     │
│  07. OPERATIONAL READINGS [toggle]  │
│  ┌─ Voltage | Frequency | Battery   │
│  ├─ Temperature | Pressure | Hours  │
│                                     │
│  08. MATERIALS [toggle]             │
│  ┌─ Material rows (item/qty/unit)   │
│  ├─ [Add material]                  │
│                                     │
│  09. TECHNICIAN [toggle]            │
│  ┌─ Name | Choose Signatory         │
│                                     │
│  10. ACKNOWLEDGEMENT [toggle]       │
│  ┌─ Recipient Name | Comment        │
│  ├─ Signature Upload                │
│                                     │
│  ─────────────────────────────────  │
│  [Save FAB]  [Download Blank]       │
└─────────────────────────────────────┘
```

### Recommended Section Structure

| Section | Surface | Rationale |
|---------|---------|-----------|
| 01. Document Details | Card (18px radius, shadow) | Primary identity section — needs visual prominence |
| 02. Item Controls | Inline (no card) | Single button — card adds unnecessary weight |
| 03. Service Parameters | Inline (no card) | 3 fields — card is excessive |
| 04. Equipment | Card (18px radius, shadow) | 7 fields — card groups them visually |
| 05. Problem & Service | Card (18px radius, shadow) | 4 textareas — card provides visual container |
| 06. Service Execution | Inline (no card) | 5 fields — lighter treatment |
| 07. Operational Readings | Collapsible section | Optional — collapse when not needed |
| 08. Materials | Card (18px radius, shadow) | Repeatable rows — card groups them |
| 09. Technician | Collapsible section | Optional — collapse when not needed |
| 10. Acknowledgement | Collapsible section | Optional — collapse when not needed |

### Recommended Navigation Model

- **Mobile:** Layout component with back arrow + title
- **Desktop:** Same header with additional context actions
- **Numbered sections:** 01-10 prefixes on all section titles
- **Section scrolling:** Smooth scroll to section when tapping section number

### Recommended Field Grouping

- **2-column grids** for related short fields (date/time, make/capacity, start/end)
- **Full-width** for textareas and single fields
- **3-column grid** only for service parameters (call type, service basis, system down)
- **Compact material rows** with 12-column grid (item 6/3/3)

### Recommended Mobile Interaction Model

- **FAB:** MobileFab component at bottom-right, offset for bottom nav
- **Sheets:** vaul (shadcn Sheet) with swipe-to-dismiss for all overlays
- **Validation:** Scroll-to-field with error pulse animation
- **Offline:** Real online/offline detection, disabled save when offline
- **Field mode:** Explicit toggle in header (not URL param)

### Recommended Inline/Desktop Model

- **Phone:** Single column, bottom FAB, bottom sheets
- **Desktop:** Same layout with fixed save button at bottom-right
- **Tablet:** Same layout (no multi-column form — form is narrow by design)

### Recommended Sheets/Dialogs

| Overlay | Trigger | Pattern |
|---------|---------|---------|
| Client selector | Tap client field | Bottom sheet (vaul) with Combobox search |
| Signatory picker | Tap "Choose signatory" | Bottom sheet (vaul) with list |
| Import JSON | Tap "Import" | Bottom sheet (vaul) with Zod validation |
| Identity lock | Tap locked field (edit) | AlertDialog (shadcn) |
| Confirmation | Destructive actions | AlertDialog (shadcn) |

### Recommended Sticky Actions

- **Mobile:** FAB fixed at bottom-right, `bottom-[94px]` (above bottom nav)
- **Desktop:** Fixed buttons at bottom-right
- **Disabled states:** FAB disabled when saving, offline, or CSR number not ready

### Recommended Validation UX

- **Required fields:** Red asterisk (*) on label
- **On save failure:** Scroll to first invalid field, apply error pulse animation (1.2s)
- **Error message:** Inline below field (8px, --attention color, 600 weight)
- **Toast:** For non-field errors (network, server)

### Recommended Edit-Mode Behavior

- **Locked fields:** Client, CSR number, customer name — lock icon + click opens IdentityLockDialog
- **IdentityLockDialog:** AlertDialog with Cancel + "Duplicate Current Changes"
- **Duplicate:** Navigates to /csr/new with prefilled data (client/number cleared)

### Recommended Upload/Signature Interactions

- **Technician signature:** Signatory picker (bottom sheet) from DB
- **Recipient signature:** Native file picker with image validation policy
- **Preview:** Show uploaded filename or signature image
- **Clear:** "Leave blank" button

### Recommended Import Interactions

- **Import sheet:** CsrImportSheet with Zod validation
- **Tutorial:** Brief explanation of how import works
- **Paste area:** Monospace textarea for JSON
- **Apply:** Preview → Apply flow

### Recommended Offline States

- **Detection:** window online/offline event listeners
- **Indicator:** Fixed amber bar at bottom (mobile) or top (desktop)
- **Save behavior:** Disabled when offline (except Android SQLite draft)
- **Draft sync:** Automatic when back online

### Recommended Accessibility Behavior

- **ARIA labels:** On all buttons and interactive elements
- **Focus management:** Focus trap in sheets and dialogs
- **Keyboard navigation:** Tab order follows field sequence
- **Screen reader:** Section titles as headings, field labels associated with inputs
- **Reduced motion:** Respect prefers-reduced-motion for all animations

---

## 12. Final Verdict

### ADOPT WITH SUBSTANTIAL REDESIGN

The candidate provides a better **design direction** than the current live CSR form in these specific areas:

1. **Section numbering** — genuine improvement for long-form navigation
2. **Scroll-to-field validation** — superior UX for error recovery
3. **Explicit field mode toggle** — more discoverable than URL param
4. **Toggle included/excluded** — clearer visual state communication
5. **Required field indicators** — essential form discoverability
6. **Compact density** — more efficient use of viewport space

However, the candidate **cannot serve as-is**. It requires the following redesign:

**What survives from the candidate:**
- Section numbering (01-10)
- Scroll-to-field validation with error pulse
- Explicit field mode toggle
- Toggle included/excluded with color coding
- Required field indicators
- Compact density philosophy (adjusted to meet touch target minimums)
- Continuous form flow concept

**What must be redesigned:**
- Replace flat divide-y with card surfaces for key sections
- Replace hardcoded colors with design tokens
- Replace custom SVG icons with Lucide
- Increase all touch targets to 44px minimum
- Increase input height to 44px
- Add safe-area handling
- Add back navigation (Layout wrapper)
- Add swipe-to-dismiss on sheets
- Add accessibility features (ARIA, focus management)
- Remove all decorative elements (background SVGs, FAB animation, ambient shapes)
- Remove backdrop-blur from sheets
- Replace monolithic component with composable pieces
- Wire real backend integration (save, offline, PDF, navigation)
- Replace basic client selector with ClientSelector component
- Replace plain unit input with UnitInput component
- Replace HTML number input with NumericInput component

**What is rejected from the candidate:**
- Decorative background SVGs
- FAB halo/float animations
- Ambient shape drift
- backdrop-blur on sheets
- Monolithic architecture
- Hardcoded isOnline

The result should be a fresh design that combines the candidate's structural innovations with the live form's functional maturity and Design.md compliance.

---

## 13. Evidence / File References

| Category | Files |
|----------|-------|
| Design authority | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design.md`, `01-design-vision.md`, `07-forms.md`, `15-interaction-model.md` |
| Candidate template | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/CSR Full-Page Live Form.jsx` |
| Live form entry points | `src/pages/CsrFormPage.tsx`, `src/pages/NewCSR.tsx`, `src/pages/EditCSR.tsx` |
| Live form presentation | `src/components/csr/CsrFormScreen.tsx` |
| Live form utilities | `src/components/csr/csrUtils.ts`, `src/components/csr/csrImport.ts` |
| Live form sheets | `src/components/csr/CsrImportSheet.tsx` |
| Live form child components | `src/components/ClientSelector.tsx`, `src/components/UnitInput.tsx`, `src/components/layout/MobileFab.tsx` |
| Live form dialogs | `src/components/document/IdentityLockDialog.tsx` |
| Live form domain | `src/domain/csr/csrService.ts`, `src/domain/csr/csrRenderModel.ts` |
| Live form offline | `src/lib/native/csrOffline.ts`, `src/lib/native/csrSync.ts` |
| Live form actions | `src/pages/viewCSRActions.ts` |
| Live form previews | `src/components/csr/CSRPreviewContent.js`, `src/components/csr/preview-templates/*.tsx` |
| Existing audit | `docs/Reports/CSR/csr-template-vs-live-audit.md` |

---

## 14. Verification

```
git status (before): Pre-existing staged and untracked files noted
git status (after): Only new file docs/Reports/CSR/csr-template-vs-live-design-reaudit.md created
Production source files modified: NONE
src/ files modified: NONE
Migrations modified: NONE
```

**No production code was modified during this audit.**

---

## 15. Risks and Limitations

1. The candidate template is 1567 lines in a single component. Any refactoring will require significant extraction work.
2. The live form's component tree includes 6+ shared components that the template does not use. Integration will require import changes throughout.
3. The candidate's decorative elements may indicate a visual-first design approach that conflicts with Design.md's principles.
4. The template does not account for the Layout component, which provides essential mobile chrome.
5. The live form's save flow involves 10+ steps. The template's toast-only approach hides this complexity.
6. This audit evaluates design direction, not implementation readiness. The recommended design still requires full implementation planning.

---

## 16. Deferred Work

1. Implementation of the redesigned CSR form combining candidate strengths with live form maturity
2. Component extraction and shared form primitive development
3. Backend integration wiring
4. Offline draft support implementation
5. PDF generation integration
6. Dark mode compliance testing
7. Desktop responsive layout
8. Accessibility audit and remediation
9. Touch target compliance verification
10. Performance testing on low-end Android devices

---

*End of report.*
