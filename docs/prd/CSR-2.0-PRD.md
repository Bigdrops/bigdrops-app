# CSR 2.0 — Product Requirements Document

**Document type:** Product Requirements Document (specification only)
**Version:** 1.1 — Draft for architecture review (editorial and architectural revision)
**Date:** 2026-11-01
**Product:** BOUXRE business platform — Customer Service Report (CSR)
**Primary evidence:** `docs/reports/CSR-2.0-Architecture-Audit.md`
**Repository:** `bigdrops-app` · branch `main` · HEAD `a1b4b4d9`
**Documentation standard:** ASD-STE100 Simplified Technical English
**Skills used:** `pdf-rendering-correctness`, `supabase-postgres-best-practices`, `typescript-advanced-types`, `react-pdf`, `accessibility` (registry: `docs/PROJECTSKILLINDEX.md`)

**Implementation status:** Nothing in this document is implemented. No application code, schema, migration, PDF template, asset, or configuration was changed by this task.

---

## Evidence labels

This document separates four kinds of statement:

| Label | Meaning |
| --- | --- |
| **Verified** | Observed in the current repository at HEAD. A source path is given. |
| **Product requirement** | Normative behaviour defined by this PRD. It becomes an approved requirement when the PRD is approved; it is not a statement about current code. |
| **Proposed** | A recommended product or architecture choice for CSR 2.0. Not approved and not implemented. |
| **Unresolved** | A decision or technical question that needs approval or further investigation. |

A `Must` requirement states required product behaviour. It does not approve a specific implementation mechanism. Where the mechanism is still open, the requirement names the decision that must resolve it.

Requirement priorities:

| Priority | Meaning |
| --- | --- |
| **Must** | Required for the CSR 2.0 release that claims the capability. |
| **Should** | Expected, but can ship in a later phase without breaking the capability. |
| **Could** | Optional improvement. |

---

## 1. Executive summary

CSR 2.0 introduces one shared CSR foundation with service-specific form experiences. The foundation keeps identity, numbering, client and job data, equipment data, lifecycle, narrative and measurement contracts, materials, sign-off, persistence, search, and document preparation. Service profiles change which sections appear, what guidance the technician sees, which measurements apply, which materials are suggested, and which validation rules run. Profiles do not create separate CSR systems.

Today, CSR is a flat 41-column row. Narratives are plain text. Measurements are six fixed text fields. Materials use an encoded text envelope. The PDF pipeline has a strict prepared-document contract and two rendering engines. Rich-text utilities exist for commercial documents, but CSR does not use them, and the CSR importer flattens structured blocks to plain text. Service profiles do not exist. These facts are verified in the architecture audit.

CSR 2.0 adds an **additive structured content layer**:

- Canonical narrative block documents.
- Canonical measurement group documents.
- Canonical materials documents.
- Derived plain-text projections for search and compatibility.
- Tenant-scoped service profiles with immutable copy-on-use snapshots.
- An extended prepared CSR contract consumed by both PDF engines.

Existing text columns and existing CSRs remain readable and printable. No historical record is rewritten. The commercial invoice/quotation/PDF migration is a separate workstream and is not part of this PRD.

The recommended delivery is eight phases (0–7), with Phase 1 (persistence and plain-text projection) required before any UI writes structured content. The highest risks are search regression, dual-engine PDF divergence, and projection drift between canonical content and legacy readers.

---

## 2. Current-state architecture

### 2.1 Verified structure

| Layer | Current implementation | Source |
| --- | --- | --- |
| Route and orchestration | Create/edit pages delegate to `CsrFormPage` | `src/pages/NewCSR.tsx`, `src/pages/EditCSR.tsx`, `src/pages/CsrFormPage.tsx` |
| Form | Ten sections in one screen; mobile and desktop presentations | `src/components/csr/CsrFormScreen.tsx` |
| List | Query provider with `csr` adapter | `src/pages/CSR.tsx`, `src/config/moduleAdapters.ts` (`csrAdapter`, line 533) |
| Detail | Load CSR, signatories, client; preview and PDF | `src/pages/ViewCSR.tsx` |
| Actions | Archive, delete, status, duplicate | `src/pages/view-csr-actions.ts` |
| CRUD and whitelist | `CSR_TABLE_COLUMNS`, `createCsr`, `updateCsr` | `src/domain/csr/csrService.ts` (line 67) |
| Numbering | Families, cursors, unique retry | `src/domain/csr/csrNumbering.ts`, `src/domain/documentNumbering.ts` |
| Materials envelope | `__CSR_META_V1__` + JSON | `src/components/csr/csrUtils.ts` (line 8) |
| Render model | Display resolution and `layoutDensity` | `src/domain/csr/csrRenderModel.ts` |
| Import | Block contract in prompt; flatten to plain text | `src/components/csr/csrImport.ts`, `src/components/csr/CsrImportSheet.tsx` |
| Legacy PDF | Three `@react-pdf/renderer` templates | `src/components/csr/preview-templates/` |
| PDFCN | Landscape blueprint and portrait reference | `src/components/pdf/pdfcn/csr/` |
| Prepared contract | Strict canonical model and validation | `src/domain/pdf/resolver/csr/csrPreparedContract.ts`, `prepareCsrDocument.ts` |
| Search | `csr_header` and `_search_csr_materials` | `supabase/migrations/20261014160000_document_search_phase3.sql` (line 188, 637) |
| Dashboard | Recent CSR documents | `src/hooks/useDashboardData.ts` |
| Database | `csrs` table | `supabase/migrations/20260520090004_csrs.sql`, `20260620000001_add_csr_engine_no.sql` |

### 2.2 Verified data flow

**Create or edit**

1. The form updates a CSR object in memory.
2. `CsrFormPage` serializes materials with `serializeCsrMaterials`.
3. `csrService` filters the payload through `CSR_TABLE_COLUMNS`.
4. `tenantClient` writes to the tenant's `csrs` table.
5. Cache invalidation and audit calls run.

**PDF**

1. `ViewCSR` builds a render model with `buildCsrPreviewData`.
2. The chosen engine reads the model.
3. PDFCN converts it with `prepareCsrDocument` into `CanonicalPreparedCsr`.
4. Templates render only from the prepared contract.

**Search**

1. The list adapter searches `csr_number`, `client_name`, and `equipment_type`.
2. Global search uses `csr_header` and `_search_csr_materials` with `ILIKE`.
3. `_search_csr_materials` decodes the materials envelope.

### 2.3 Architecture assessment

The layering is suitable for CSR 2.0. Business rules already live in `src/domain/`, and PDF templates already consume a prepared contract. **[Verified]** The limitation is the content model, not the separation of concerns. **[Proposed]** CSR 2.0 therefore extends the contract and the data model. It does not restructure the render pipeline.

---

## 3. Verified findings and technical constraints

### 3.1 Data model findings

| ID | Verified finding | Source | Implication |
| --- | --- | --- | --- |
| V-01 | `csrs` has 41 columns; all narrative, measurement, and material data is `text` | `20260520090004_csrs.sql` lines 11–50 | Structured content needs new storage |
| V-02 | `csrs` has no `updated_at` | Same migration | Change tracking and conflict detection need a new column |
| V-03 | `client_id` and `linked_invoice_id` default to `gen_random_uuid()` | Lines 14, 38 | A partial payload can create an orphan reference |
| V-04 | `date` is nullable; PDF validation rejects empty dates | Migration line 13; `prepareCsrDocument.ts:231` | Validation must stay aligned across layers |
| V-05 | `materials_used` stores `__CSR_META_V1__` + JSON with `materialsRows`, `materialsText`, `meta` | `csrUtils.ts:8–42`, 164–230 | The envelope is the compatibility floor for materials |
| V-06 | The envelope parser accepts unknown row keys because it spreads defaults | `csrUtils.ts:189` | Optional material fields can be added without breaking old data |
| V-07 | `MaterialRow` has only `item`, `quantity`, `unit` | `csrUtils.ts:10–14` | No part number, remarks, category, or billable flag |
| V-08 | `CsrMeta` has eight display fields | `csrUtils.ts:22–31` | Display metadata already exists, but only inside the envelope |
| V-09 | `materialsTitle` is component state only | `CsrFormScreen.tsx:213` | A custom materials title is lost on reload |
| V-10 | `recipient_signature_uri` is collected but not in `CSR_TABLE_COLUMNS` | `CsrFormScreen.tsx:911`; `csrService.ts:67–95` | Recipient signature is silently dropped on save |
| V-11 | Duplicate writes status `'in_progress'`, which is not in the form status list | `view-csr-actions.ts`; `CsrFormScreen.tsx:70` | Status vocabulary is inconsistent |
| V-12 | A new CSR defaults to status `'Complete'`; field mode defaults to `'Field Entry Pending'` | `csrUtils.ts:102–140` | A blank CSR claims completion before work is recorded |
| V-13 | `hours` is used as both the service-window operating hours and the engine-hours reading | `prepareCsrDocument.ts:110`, 140–143 | Two different meanings share one field |

### 3.2 Narrative and rich-text findings

| ID | Verified finding | Source | Implication |
| --- | --- | --- | --- |
| V-20 | CSR narratives are `<TextArea>` inputs | `CsrFormScreen.tsx:553–582` | No formatting or lists |
| V-21 | Every CSR renderer prints narratives as plain text | `preview-templates/*`; `CsrPortraitReferenceTemplate.tsx:368–377` | Raw HTML or JSON would print literally |
| V-22 | A shared block contract exists: `paragraph` (runs), `heading` (text, level), `ordered_list` / `unordered_list` (runs per item) | `src/lib/commercialRichText.ts:19–45` | CSR can adopt this shape |
| V-23 | The block contract is untracked and part of in-flight commercial work | `git status`; file not committed | CSR must not modify it; treat it as an external dependency |
| V-24 | The CSR import prompt emits block arrays | `csrImport.ts:29–30` | Import already understands structure |
| V-25 | The import sheet flattens blocks to plain text | `CsrImportSheet.tsx:64` | Structure is lost before persistence |
| V-26 | The editor supports bold, italic, underline, bullet list, ordered list | `src/components/RichTextEditor.tsx` | The requested formatting is already supported in the editor |
| V-27 | HTML rendering is sanitized with DOMPurify | `src/lib/richText.tsx` | Web rendering has a safe path |
| V-28 | `pdfRichText.ts` renders paragraphs, headings, and lists for `@react-pdf/renderer` | `src/components/pdf/core/pdfRichText.ts` | Legacy PDFs have a block path; CSR does not use it |
| V-29 | There is no HTML-to-block converter in the verified code | `richText.ts` parses HTML to a PDF document model, not to the shared block type | A canonicalization step must be designed and tested |
| V-30 | Search uses `ILIKE` on raw narrative columns | `document_search_phase3.sql:649–717` | Raw HTML/JSON degrades search |

### 3.3 Measurement findings

| ID | Verified finding | Source | Implication |
| --- | --- | --- | --- |
| V-40 | Six fixed reading fields exist in the form | `CsrFormScreen.tsx:671–676` | No configurable groups |
| V-41 | Units and labels are render-time constants | `csrPdfcnUtils.tsx:130` | Units are not data |
| V-42 | The prepared contract has exactly six reading keys | `csrPreparedContract.ts:7–15` | Contract must be extended without breaking defaults |
| V-43 | Values are text and are not parsed | `prepareCsrDocument.ts:114–143` | No numeric validation, precision, or range |
| V-44 | `showOperationalReadings` can hide the whole block only | `csrUtils.ts:23` | No per-item visibility |
| V-45 | No reference ranges, pass/fail, or grouped rows exist | No field or type in verified code | New model required |

### 3.4 Profile and PDF findings

| ID | Verified finding | Source | Implication |
| --- | --- | --- | --- |
| V-50 | No service-profile entity, type, or constant exists | Repository search | Profiles are new |
| V-51 | "Template" means a visual PDF template | `CSRPreviewContent.js`, `CsrTemplateCarousel.tsx`, `ViewCSR.tsx:47` | Do not reuse the word for service profiles |
| V-52 | Two PDF engines serve CSR | `preview-templates/index.tsx`; `pdfcn/csr/index.ts` | Rich text and pagination must work in both during transition |
| V-53 | The prepared contract exposes fixed fields and exactly two sign-off blocks | `csrPreparedContract.ts:87–112` | Contract extension is the primary PDF work |
| V-54 | Validation requires the exact label `Site / Equipment Location` | `prepareCsrDocument.ts:246` | New fields must not disturb this rule |
| V-55 | PDFCN uses fixed page footers with page counters | `CsrPortraitReferenceTemplate.tsx:451` | Pagination must preserve footer correctness |
| V-56 | `layoutDensity` is computed but not used by PDFCN | `csrRenderModel.ts:157–161`; PDFCN templates | Density logic cannot be the pagination strategy |
| V-57 | Empty defects default to "None reported" in the render model | `csrRenderModel.ts`; `csrRenderModel.test.js` | Historical display behaviour must stay |

### 3.5 Integration findings

| ID | Verified finding | Source | Implication |
| --- | --- | --- | --- |
| V-60 | List adapter selects 10 columns and searches three fields | `moduleAdapters.ts:533–584` | New structured columns are invisible to list search by default |
| V-61 | Global search decodes the materials envelope in SQL | `document_search_phase3.sql:188` | Materials structure is already understood at search time |
| V-62 | Dashboard expects `id`, `csr_number`, `client_name`, `status`, `created_at`, `date` | `useDashboardData.ts` | New fields must not break these reads |
| V-64 | Provisioning adds CSR tables to the tenant template | `20260810050000_csr_aggregate_provisioning.sql` | New tables or columns must join provisioning |

### 3.6 Constraints that govern the design

1. **Historical information is preserved.** Existing CSRs must keep their recorded content, meaning, and readability when opened, edited, or rendered. Historical output is not required to be byte-identical to an old PDF. **[Must]**
2. **PDF renderers are read-only.** No render layer may mutate source data. This follows the project PDF rule. **[Must]**
3. **Tenant isolation uses `tenantClient` and tenant schemas.** New objects must follow the same model. **[Must]**
4. **The commercial rich-text module is not owned by CSR.** CSR may reuse its types and pure functions but must not edit it. **[Must]**
5. **Numbering must not change.** CSR numbers are a legal and operational identifier. **[Must]**

### 3.7 Decision status by area

| Area | Status | Evidence or decision |
| --- | --- | --- |
| Flat `csrs` table, text columns, materials envelope | **Verified** | V-01 to V-13 |
| Both CSR PDF engines and the prepared contract | **Verified and supported in this PRD** | V-52, V-53; Section 12.2 |
| Canonical block narrative contract with derived plain text | **Product requirement; mechanism not approved** | Section 8; OD-17 |
| JSONB sidecar columns | **Recommended target, not approved** | Section 14.2; OD-18 |
| Database-trigger plain-text derivation | **Recommended option, not approved** | Section 13.3; OD-17 |
| Tenant-wide service profile scope | **Recommended default, unresolved** | Section 11.6; OD-02 |
| CSR-owned measurement snapshots | **Recommended, unresolved** | Section 9.4; OD-03 |
| Profile status restriction | **Proposed optional capability** | Section 11.5; FR-081 |
| Minimum readable PDF text size | **Unresolved** | Section 12.3; OD-19 |

No row marked Recommended or Unresolved is an implementation commitment. Each requires the named decision before the dependent phase starts.

---

## 4. Product vision and design principles

### 4.1 Vision

Give service teams one reliable CSR system. The system adapts to the service being performed, captures technical evidence in structured form, prints a clear professional report, and keeps every historical report stable and searchable.

### 4.2 Goals

| Goal | Measure of success |
| --- | --- |
| Faster, clearer reporting | A technician can complete a profiled CSR without irrelevant fields |
| Better technical evidence | Measurements are typed, grouped, unit-aware, and repeatable |
| Better narratives | Technicians can structure findings without a word processor |
| Reliable documents | Long reports paginate without clipping or overlap |
| Trustworthy history | A 2025 CSR still shows the same information, meaning, and readable content in 2027 |
| Searchable content | Global search finds words inside structured narratives |
| Maintainable platform | One content contract, one prepared document, no template business logic |

### 4.3 Principles

1. **Shared foundation first.** Service differences are configuration, not forks.
2. **Structure where it helps, text where it does not.** Measurements are structured. Work description stays narrative.
3. **Canonical data is not HTML.** The editor document is transient. HTML is a rendering and interchange projection, not the stored form.
4. **One projection authority.** Derived plain text is maintained in one place.
5. **Snapshots protect history.** Profiles and profile-driven configuration are copied when used.
6. **Additive change.** Existing columns, rows, and rendered reports remain valid and readable.
7. **No silent mutation.** Renderers read. Preparers derive. Only editors and services write.
8. **Fail loudly on malformed input.** Do not flatten or guess.
9. **Technician usability wins ties.** One-page preference yields to readability.
10. **No inventory coupling.** Materials records do not create stock, purchasing, or procurement dependencies.

---

## 5. User roles and workflows

### 5.1 Roles

| Role | Responsibilities | Permissions |
| --- | --- | --- |
| Service engineer / technician | Create and edit CSRs, enter measurements and materials, collect sign-off | Create, edit own drafts, print |
| Service supervisor | Review and correct reports, complete status, manage profiles | Edit team CSRs, author profiles (**Proposed**) |
| Tenant administrator | Configure profiles, labels, reference ranges, permissions | Full CSR and profile administration |
| Viewer / auditor | Read and print reports, search history | Read-only |
| Client representative | Receive and sign the report | No system account assumed; signs on paper or device (**Unresolved**) |

### 5.2 Primary workflows

**W1 — Create from a service profile (primary)**

1. Technician selects a service profile or starts from a call type.
2. System creates a CSR with a profile snapshot.
3. Only relevant sections appear. Guidance text explains each section.
4. Technician records equipment, narratives, measurements, materials, and service window.
5. Technician or supervisor validates. Sign-off is recorded.
6. System prints preview or PDF. Report is saved and searchable.

**W2 — Create a blank CSR**

1. Technician creates a CSR without a profile.
2. The common foundation sections appear.
3. Legacy six readings appear as the default measurement group.
4. Narrative fields are empty and plain-text compatible.

**W3 — Import from JSON**

1. User pastes or uploads a JSON service report.
2. System validates and previews mapped fields, narratives, measurements, and materials.
3. Structured narratives remain structured.
4. User applies the import and reviews the form before saving.

**W4 — Edit an existing CSR**

1. The CSR loads its stored content version.
2. V1 plain-text narratives load as plain text. The paragraph-splitting rule is decided in Phase 0 (Section 8.7).
3. V2 blocks load in the rich-text editor.
4. Saving writes the active canonical model and refreshes projections.

**W5 — Duplicate**

1. The system copies content documents and the profile snapshot.
2. Identity fields are cleared per current duplicate rules.
3. A new number is generated with existing numbering logic.

**W6 — Print or download**

1. The chosen template reads only the prepared contract.
2. Short reports may fit one page. Long reports paginate.
3. Sign-off blocks and page counters remain correct.

**W7 — Search**

1. List search behaves as today unless this PRD explicitly changes it.
2. Global search matches words inside narratives and materials using derived plain text.

---

## 6. Shared CSR foundation

### 6.1 Foundation ownership

| Concern | Owner | Notes |
| --- | --- | --- |
| CSR identity and numbering | Foundation | Existing numbering is unchanged |
| Client and job information | Foundation | Client snapshot plus optional links |
| Equipment identification | Foundation | Common equipment fields |
| Lifecycle and status | Foundation | One vocabulary across profiles |
| Narrative contract | Foundation | One block schema for all profiles |
| Measurement contract | Foundation | One group/row/item schema |
| Materials contract | Foundation | One row schema with legacy tolerance |
| Sign-off and acknowledgement | Foundation | Two sign-off blocks |
| Persistence and preparation | Foundation | One write model, one prepared contract |
| Search and history | Foundation | Derived projections and stable versions |

### 6.2 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-001 | CSR 2.0 SHALL use one shared CSR entity for all service types. Service differences SHALL be configuration, not separate tables or routes. | Must |
| CSR2-FR-002 | CSR numbering, numbering families, cursor advancement, duplicate retry, and blank-CSR logging SHALL remain unchanged unless a separate numbering PRD changes them. | Must |
| CSR2-FR-003 | Existing CSR routes, list behaviour, actions (archive, delete, status, duplicate), dashboard links, and project/client links SHALL remain valid. | Must |
| CSR2-FR-004 | The foundation SHALL expose a registered set of form section types. Profiles MAY enable, disable, reorder, and configure them. Profiles SHALL NOT define arbitrary code-driven sections. | Must |
| CSR2-FR-005 | The foundation SHALL define the canonical narrative, measurement, and materials documents and their validation. Profiles SHALL provide configuration within these contracts only. | Must |
| CSR2-FR-006 | A CSR SHALL always be interpretable without a profile. Missing or archived profiles SHALL NOT prevent opening, editing, printing, or searching a CSR. | Must |
| CSR2-FR-007 | Equipment identification SHALL keep the current fields (`equipment_type`, `equipment_location`, `make`, `model`, `serial_no`, `engine_no`, `capacity`) and MAY add structured job metadata without removing them. | Must |

---

## 7. Service-specific form experiences

### 7.1 Model

A service profile selects and configures these experience dimensions:

| Dimension | Configurable by profile | Limit |
| --- | --- | --- |
| Section visibility and order | Yes, within registered section types | Cannot remove required foundation sections |
| Narrative guidance | Yes | Guidance text and optional sentence stems, not facts |
| Measurement groups | Yes | Defined by the measurement contract |
| Material suggestions | Yes | Suggestions only; not auto-consumed |
| Validation overlays | Yes | Extra required fields; optional CSR status restriction (Section 11.5, FR-081) |
| Display metadata | Yes | Labels, titles, sign-off roles, section headings |

### 7.2 Initial example profiles

These six profiles are examples, not a closed list. **[Proposed]**

| Profile | Active focus | Example measurement groups | Typical materials | Validation emphasis |
| --- | --- | --- | --- | --- |
| Generator preventive maintenance | Routine service, consumables | Electrical output; engine; DC charging | Filters, oil, coolant, belts | Service window, running hours, consumables |
| Generator fault diagnosis and repair | Fault finding and repair | Electrical output; fuel system; engine; battery/DC | Replaced parts, fuses, sensors | Problem description, defects, resolution |
| Electrical installation | New work and wiring | Distribution board; cable; earthing; continuity | Cables, breakers, containment, accessories | Circuit schedule, isolation confirmation |
| Electrical inspection | Condition assessment | Insulation resistance; earth continuity; polarity; protective device | Usually none | Pass/fail results and observations |
| Commissioning | Prove system readiness | Functional tests; load tests; protection settings; phase sequence | Test consumables only | Test evidence, witness sign-off |
| General inspection | Visual and functional survey | Minimal or none | None by default | Observations, recommendations |

### 7.3 Measurement examples are not universal fields

The generator electrical example in this PRD illustrates grouping. It does not define universal CSR fields. Phase-to-phase voltage, phase-to-neutral voltage, frequency, phase sequence, voltage imbalance, load condition, DC charging, and engine readings SHALL be profile-configured group content. **[Must]**

No formula or reference range is defined by this PRD. The voltage-imbalance formula, acceptable bands, and pass/fail thresholds require validated domain definitions. **[Unresolved]**

### 7.4 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-010 | The form SHALL render sections from a profile configuration merged with foundation defaults. | Must |
| CSR2-FR-011 | Narrative guidance SHALL be displayed next to the relevant field and SHALL NOT be saved as narrative content. | Must |
| CSR2-FR-012 | Profiles SHALL be optional. A CSR without a profile SHALL use the default measurement group and all foundation sections. | Must |
| CSR2-FR-013 | Switching a profile on a draft SHALL require confirmation and SHALL preserve already-entered content where field identity is compatible. | Should |
| CSR2-FR-014 | Required sections SHALL be marked and enforced on save or status change according to Section 15. | Must |

---

## 8. Rich-text narrative specification

### 8.1 Canonical content contract

CSR narratives SHALL use the shared block shape that the existing import contract already emits. The shape is verified in `src/lib/commercialRichText.ts`.

```ts
type CsrTextRun = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

type CsrNarrativeBlock =
  | { type: "paragraph"; children: CsrTextRun[] }
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "ordered_list" | "unordered_list"; items: CsrTextRun[][] }

type CsrNarrativeDocument = {
  schemaVersion: 1
  blocks: CsrNarrativeBlock[]
}
```

**Proposed rule:** the block document is the canonical persisted form. HTML is not canonical. Plain text is a derived projection. The TipTap/ProseMirror document is an editor model and is never the persisted CSR narrative. **[Proposed]**

**Justification [Proposed]:** HTML has no stable schema, permits unsafe markup, and makes querying and validation harder. Typed blocks match the existing importer, the existing sanitizer, and the existing PDF block renderer.

### 8.2 Editor document and canonical block adapters

Conversion is explicit and one-directional per operation. Domain code owns the adapters; the editor and the renderers do not write canonical data.

| Direction | Input | Output | Responsibility | Rule |
| --- | --- | --- | --- | --- |
| a. Editor to canonical | TipTap document | `CsrNarrativeDocument` | CSR domain editor adapter | Map only the supported nodes in 8.3. Report unsupported nodes. Do not drop or flatten them silently. |
| b. Canonical to editor | `CsrNarrativeDocument` | TipTap document | CSR domain editor adapter | Every canonical block must have a defined editor representation. An unknown block is an error, not an empty document. |
| c. Canonical to derived plain text | `CsrNarrativeDocument` | Plain text | Single projection authority selected in 13.3 | Deterministic and stable for search, export, and V1 readers. |
| d. Canonical to rendering | `CsrNarrativeDocument` | Web HTML or PDF blocks | Read-only render adapter | HTML is produced for web output. PDF blocks enter the prepared contract. Neither path parses stored HTML. |

Rules:

- HTML MAY be used for web rendering and for import or export interchange. HTML SHALL NOT be a required intermediate for persistence, editor conversion, or PDF conversion. **[Proposed]**
- Adapters SHALL be pure functions with no database access.
- Conversion is **contract-equivalent**, not claimed to be lossless. Normalization of whitespace or character encoding is permitted. Words, list order, and supported marks SHALL NOT change. Content outside the supported contract is reported to the user.
- Unsupported editor nodes (tables, images, links, code blocks, block quotes, mentions) SHALL be rejected with a message that names the node type. They SHALL NOT be converted to plain text silently.
- Malformed canonical content (unknown block type, missing `children`, non-string text, invalid heading level) SHALL fail validation with the field name and block index. The editor SHALL NOT open with partial content.
- An empty document is valid only where the field is optional. It SHALL be represented as zero blocks, not as an empty paragraph. Existing print fallbacks, such as "None reported" for defects, SHALL remain.
- A legacy plain-text value SHALL be loaded under 8.7 or kept as V1 text until the record is upgraded. It SHALL NOT be parsed as HTML.

### 8.3 Supported formatting

| Formatting | Allowed | Rationale |
| --- | --- | --- |
| Paragraphs | Yes | Base structure |
| Headings | Yes, levels 2–3 in UI | Long reports need sections; level 1 is reserved for document title |
| Bold | Yes | Emphasis |
| Italic | Yes | Emphasis and technical names |
| Bulleted lists | Yes | Findings and parts |
| Numbered lists | Yes | Procedures and steps |
| Underline | Yes, existing editor support | Verified in `RichTextEditor.tsx` |
| Links | No in v1 | Not required for a printed report |
| Images | No in v1 | Signature and logo are separate concerns |
| Tables in narrative | No in v1 | Measurements are structured with a table renderer |
| Code blocks, quotes | No | Not requested |

### 8.4 Field applicability

| Field | Rich text | Notes |
| --- | --- | --- |
| Problem reported | Must | Primary structured narrative |
| Service rendered / work performed | Must | Procedures and lists |
| Defects found / findings | Must | List-heavy |
| Engineer remarks / recommendations | Must | Recommendations list |
| Customer feedback | Should | Enable only if the product approves; otherwise plain text |

### 8.5 Projections

Every narrative SHALL have these projections:

| Projection | Purpose | Authority |
| --- | --- | --- |
| Canonical blocks | Persistence and editing source for V2 records | CSR domain contract; the only editable narrative source |
| TipTap document | Live editor state and adapter input or output | Editor component; transient, never persisted as canonical |
| Plain text | Search, exports, compatibility, and V1 readers | Single designated projection authority (Section 13.3; OD-17) |
| Sanitized HTML | Web preview and import or export interchange | App-derived at read time; never stored as canonical |
| PDF blocks | Print rendering | Prepared contract; read-only |

No projection other than canonical blocks is independently editable.

### 8.6 Authoritative source and legacy narrative columns

**Verified current state:** each narrative field is a `text` column, and current readers, search functions, and PDF renderers read those columns (`20260520090004_csrs.sql`; `document_search_phase3.sql`; `prepareCsrDocument.ts`).

**Recommended rule [Proposed]:** for a record with `content_version = 2`:

- The structured narrative document is the single authoritative source for narrative content.
- Legacy narrative text columns remain populated as **derived plain-text projections** for existing readers, imports, exports, SQL search, and V1 fallback. They are not independently editable in the CSR 2.0 form.
- A write updates the canonical document and the derived projections in the same transaction.
- A save SHALL NOT leave a V2 record whose legacy projection disagrees with its canonical document.

Projection update and staleness:

- The projection is recomputed on every canonical write, including edit, duplicate, and import.
- A consistency check SHALL compare each projection with the canonical document and report mismatches. Repair SHALL use the projection authority, never manual text edits.
- A mismatch SHALL be logged and SHALL NOT silently produce empty search text.

**Unresolved:** the projection authority is not approved. It may be a database trigger, an application service, or a generated expression. Section 13.3 compares the options; OD-17 records the decision. No requirement in this PRD selects a mechanism.

### 8.7 Historical plain-text handling

- A CSR saved before CSR 2.0 has `content_version = 1`. Its narrative strings are authoritative.
- On read, a V1 string SHALL be treated as plain text, never as HTML. Blank lines MAY delimit paragraphs; this rule is decided in Phase 0. **[Unresolved]**
- On first edit and save, the system MAY upgrade that field to blocks. The upgrade SHALL preserve words and line order. Whitespace normalization is permitted.
- V1 records SHALL NOT be bulk-rewritten by a migration.

### 8.8 Reuse boundary

CSR 2.0 MAY reuse:

- `parseCommercialRichTextBlocks` for import validation semantics.
- `commercialRichTextToHtml` and `commercialRichTextToPlainText` as reference implementations.
- `sanitizeRichTextHtml` and `renderRichTextContent` for web output.
- `renderPdfRichText` as a reference for legacy PDF blocks.

CSR 2.0 SHALL NOT:

- Modify `src/lib/commercialRichText.ts` or commercial parser behaviour.
- Store HTML as the canonical CSR form.
- Depend on untracked files without a stability decision.
- Let the editor or a renderer write canonical data.

If the shared module is not committed and stabilised before Phase 2, CSR SHALL implement a CSR-owned, contract-equivalent block module. **[Proposed]** CSR SHALL own the editor↔block adapters in either case.

### 8.9 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-020 | CSR narratives SHALL be stored as typed block documents with a schema version. | Must |
| CSR2-FR-021 | Supported blocks SHALL be limited to paragraphs, headings (levels 1–3 in data, 2–3 in UI), ordered lists, and unordered lists, with bold, italic, and underline runs. | Must |
| CSR2-FR-022 | HTML SHALL NOT be the canonical stored narrative format. | Must |
| CSR2-FR-023 | Every narrative SHALL expose a plain-text projection for search and compatibility. | Must |
| CSR2-FR-024 | Web rendering SHALL sanitize HTML before insertion. | Must |
| CSR2-FR-025 | PDF rendering SHALL consume blocks directly and SHALL NOT parse stored HTML. | Must |
| CSR2-FR-026 | Malformed blocks SHALL be rejected with a field-level error. They SHALL NOT be silently flattened or dropped. | Must |
| CSR2-FR-027 | Empty narratives SHALL remain valid where the current product allows them; defects display fallback "None reported" SHALL be preserved in print. | Must |
| CSR2-FR-028 | Narrative documents SHALL have a maximum block count and total character limit. Suggested: 2,000 blocks and 200,000 characters per CSR. | Should |
| CSR2-FR-029 | V1 plain-text narratives SHALL remain printable and searchable without conversion. | Must |
| CSR2-FR-030 | The rich-text editor SHALL be available for the four core narrative fields. Customer feedback support SHALL follow the product decision. | Must |
| CSR2-FR-031 | The CSR domain SHALL provide explicit adapters between the TipTap editor document and canonical blocks in both directions, and between canonical blocks and each rendering projection. | Must |
| CSR2-FR-032 | Unsupported nodes and malformed content SHALL be reported to the user. Adapters SHALL NOT drop or flatten them silently. | Must |
| CSR2-FR-033 | For V2 records, canonical blocks SHALL be the single editable narrative source. Legacy narrative columns SHALL be derived projections and SHALL NOT be independently editable. | Must |
| CSR2-FR-034 | Projection updates SHALL occur on every canonical write. Stale projections SHALL be detectable and repairable. | Must |
| CSR2-FR-035 | HTML MAY be used for rendering or interchange but SHALL NOT be a required intermediate for persistence or every conversion. | Must |

---

## 9. Measurement model specification

### 9.1 Canonical measurement document

```ts
type CsrMeasurementValue =
  | { kind: "numeric"; value: number | null; unit: string | null; precision: number }
  | { kind: "text"; value: string | null; unit?: string | null }
  | { kind: "categorical"; value: string | null; options: string[] }
  | { kind: "pass_fail"; value: "pass" | "fail" | null; note?: string | null }

type CsrMeasurementItem = {
  key: string
  label: string
  value: CsrMeasurementValue
  reference?: {
    min?: number | null
    max?: number | null
    source: "tenant" | "profile" | "manual"
    mode: "informational" | "warning" | "validation"
  }
  note?: string | null
  legacyKey?: "voltage" | "frequency" | "battery" | "temperature" | "pressure" | "hours"
}

type CsrMeasurementRow = {
  key: string
  label?: string | null
  items: CsrMeasurementItem[]
}

type CsrMeasurementGroup = {
  key: string
  label: string
  repeatable: boolean
  rows: CsrMeasurementRow[]
}

type CsrMeasurementDocument = {
  schemaVersion: 1
  groups: CsrMeasurementGroup[]
}
```

### 9.2 Model rules

| Rule | Statement | Priority |
| --- | --- | --- |
| M-01 | Every measurement belongs to a group and a row. | Must |
| M-02 | Group and item keys are stable identifiers, not display labels. | Must |
| M-03 | Numeric values are stored as numbers, not strings. | Must |
| M-04 | Units are stored with the value. A unit MAY be null when the metric is unitless. | Must |
| M-05 | Precision is stored per item. Display rounds to that precision. Stored value is not mutated by display. | Must |
| M-06 | Reference ranges are optional. They SHALL come only from tenant configuration, profile configuration, or manual entry. The system SHALL never invent a range. | Must |
| M-07 | Pass/fail results are explicit values. The system SHALL NOT infer pass/fail from a reference range unless a named, validated rule is approved. | Must |
| M-08 | Repeatable groups use rows. Each row may carry a label such as an asset or phase set. | Should |
| M-09 | Item notes are optional free text and are excluded from numeric parsing. | Should |
| M-10 | Calculations and derived values are allowed only when a named, validated domain definition exists. | Must |
| M-11 | A CSR stores its own measurement snapshot. It does not read live equipment values when printing. | Must |
| M-12 | Measurement labels and units are snapshotted so later profile edits do not change history. | Must |
| M-13 | Every reference range SHALL declare a mode: informational, warning, or validation. | Must |
| M-14 | Informational ranges are display-only. Warning ranges may show an out-of-range indicator without blocking save. Validation ranges block completion when the value is outside the bounds. | Must |
| M-15 | An out-of-range indicator SHALL appear only when bounds exist and the mode is warning or validation. It SHALL NOT alter the stored value. | Must |
| M-16 | Reference ranges, their source, and their mode SHALL be snapshotted with the CSR. They SHALL NOT be hardcoded for a generator or any other service type. | Must |

**Range mode meanings:**

| Mode | Display | Save or completion effect |
| --- | --- | --- |
| Informational | Range shown for reference | None |
| Warning | Range shown; out-of-range indicator MAY appear | None; save is allowed |
| Validation | Range shown; out-of-range indicator appears | Completion is blocked until the value is corrected |

A pass/fail item keeps its explicit result. A range never converts a numeric value into pass or fail.

### 9.3 Legacy default group

The six current readings SHALL become the default group for CSRs without a measurement profile.

| Legacy field | Group item key | Display label (preserve current) | Unit behaviour |
| --- | --- | --- | --- |
| `voltage` | `voltage` | `GEN. VOLTAGE V` | Preserve current renderer behaviour |
| `frequency` | `frequency` | `FREQUENCY Hz` | Preserve current renderer behaviour |
| `battery` | `battery` | `BATTERY/ALT. Vdc` | Preserve current renderer behaviour |
| `temperature` | `temperature` | `TEMPERATURE °C` | Preserve current renderer behaviour |
| `pressure` | `pressure` | `PRESSURE` | Preserve current renderer behaviour |
| `hours` | `hours` | `ENGINE HOURS` | Preserve current renderer behaviour |

**Must:** The first CSR 2.0 release SHALL preserve the current six-reading presentation for CSRs that use the default group. `prepareCsrDocument` SHALL keep producing the legacy six-key `readings` projection for both PDF engines. **[Must]**

**Verified constraint:** Current labels and units are renderer constants in `csrPdfcnUtils.tsx:130` and are not stored. The default group SHALL therefore carry `legacyKey` so renderers can reproduce the current presentation until a display-constant migration is approved.

### 9.4 Ownership decision

**Recommendation [Proposed]:** measurements are **CSR-owned snapshots**. An equipment record MAY provide a starting template or suggested group in a later phase, but a printed CSR SHALL read only its own snapshot.

Reasons:

1. Historical accuracy requires the value as recorded, not the current equipment state.
2. A CSR may cover equipment that is not registered as an asset.
3. It avoids blocking CSR 2.0 on an equipment registry design.

Equipment-level trend history is a separate future capability. **[Unresolved]**

### 9.5 Ambiguity to resolve

`hours` is currently used for two meanings: service-window operating hours and engine running hours (V-13). CSR 2.0 SHALL separate them. The service window keeps `start_date`, `start_time`, `end_date`, `end_time`. Engine hours become a measurement item. Any existing value SHALL be preserved and mapped to the measurement item, with no data loss. **[Must]**

### 9.6 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-040 | Measurements SHALL be stored as a versioned group/row/item document. | Must |
| CSR2-FR-041 | The model SHALL support numeric, text, categorical, and pass/fail values. | Must |
| CSR2-FR-042 | Numeric items SHALL support unit, precision, and an optional reference range with an explicit source and mode. | Must |
| CSR2-FR-043 | Groups SHALL support repeatable rows with optional row labels. | Should |
| CSR2-FR-044 | Items SHALL support an optional note. | Should |
| CSR2-FR-045 | The six legacy readings SHALL render as the default group and preserve the current six-reading presentation. | Must |
| CSR2-FR-046 | The prepared contract SHALL keep a six-key legacy readings projection. | Must |
| CSR2-FR-047 | The system SHALL NOT compute or display derived values without a named, validated definition. | Must |
| CSR2-FR-048 | Reference ranges SHALL come from tenant or profile configuration, or manual entry, with an explicit source and mode. The system SHALL NOT supply a default range. | Must |
| CSR2-FR-049 | Engine hours and service-window duration SHALL be separate concepts. | Must |
| CSR2-FR-050 | Measurement order and grouping SHALL be profile-configurable and snapshotted on the CSR. | Must |
| CSR2-FR-051 | Invalid numeric input SHALL block save with a field-level error. | Must |
| CSR2-FR-052 | Measurements SHALL be printable in both PDF engines with repeated row labels and units. | Must |
| CSR2-FR-053 | Reference range modes SHALL follow Section 9.2: informational ranges do not affect state, warning ranges do not block save, and validation ranges block completion. No mode SHALL infer pass/fail. | Must |
| CSR2-FR-054 | Reference ranges and their modes SHALL be snapshotted with the CSR. | Must |

---

## 10. Materials and work-record specification

### 10.1 Canonical materials document

```ts
type CsrMaterialQuantity =
  | { kind: "numeric"; value: number }   // includes fractional quantities such as 0.5
  | { kind: "text"; value: string }      // legacy or non-numeric values such as "1 set"
  | { kind: "unspecified" }              // no quantity recorded

type CsrMaterialLine = {
  lineNo: number
  description: string
  partNo?: string | null
  qty: CsrMaterialQuantity
  unit?: string | null
  remarks?: string | null
  category?: string | null
  billable?: boolean | null
}

type CsrMaterialsDocument = {
  schemaVersion: 1
  title: string
  lines: CsrMaterialLine[]
}
```

### 10.2 Rules

| Rule | Statement | Priority |
| --- | --- | --- |
| MAT-01 | Materials SHALL stay separate from narrative work description. | Must |
| MAT-02 | `description` is mandatory when a line is not empty. | Must |
| MAT-03 | Quantity SHALL be stored as a number, a text value, or unspecified. Numeric values MAY be fractional. Text SHALL NOT be coerced to a number. Legacy text values SHALL be preserved verbatim. | Must |
| MAT-04 | The system SHALL NOT create stock, purchasing, procurement, or inventory records. | Must |
| MAT-05 | The envelope `__CSR_META_V1__` SHALL remain readable for all historical CSRs. | Must |
| MAT-06 | The materials title SHALL be persisted. | Should |
| MAT-07 | Empty lines SHALL be removed on save. | Must |
| MAT-08 | Existing display meta (`showOperationalReadings`, labels, sign-off toggles) SHALL remain supported. | Must |
| MAT-09 | A material line MAY reference an item library record in a later phase, but SHALL remain readable without it. | Could |
| MAT-10 | Display SHALL show a numeric quantity with its recorded value and unit, a text quantity as recorded, and an unspecified quantity as blank. No rounding or unit conversion is applied at display. | Must |
| MAT-11 | Conversion of a text quantity to a numeric quantity SHALL require an explicit user action and SHALL NOT happen during read, print, or import. | Must |

### 10.3 Legacy compatibility

`parseCsrMaterials` currently accepts:

- The `__CSR_META_V1__` envelope.
- Plain text without the prefix, treated as a single item.

CSR 2.0 SHALL keep both read paths. New writes SHALL produce the materials document plus a derived envelope-compatible representation or a derived plain-text column. **[Proposed]** The derived representation SHALL preserve the quantity kind: a numeric quantity SHALL NOT become text, and a legacy text quantity SHALL NOT become a number. No historical envelope is deleted or rewritten in place.

### 10.4 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-060 | Materials SHALL be stored as a versioned line document with a persisted title. | Must |
| CSR2-FR-061 | Each line SHALL support description, part number, quantity, unit, remarks, category, and billable indicator. Quantity SHALL use the typed representation in Section 10.1. | Must for description/qty/unit; Should for the rest |
| CSR2-FR-062 | Historical `__CSR_META_V1__` materials SHALL remain readable and printable. | Must |
| CSR2-FR-063 | Plain-text legacy materials SHALL remain readable as a single line. | Must |
| CSR2-FR-064 | Materials SHALL NOT create inventory or procurement dependencies. | Must |
| CSR2-FR-065 | The materials title SHALL be saved and printed. | Should |
| CSR2-FR-066 | PDF material tables SHALL repeat headers across pages. | Must |
| CSR2-FR-067 | The prepared contract SHALL receive enriched material lines while keeping `description`, `qty`, `unit`, and `partNo`. The prepared `qty` SHALL be a display value derived from the typed quantity and SHALL NOT require re-parsing at render time. | Must |
| CSR2-FR-068 | Legacy and free-text quantities SHALL be preserved verbatim and SHALL NOT be silently coerced to numbers. | Must |

---

## 11. Service profile specification

### 11.1 Entity

```ts
type CsrServiceProfile = {
  id: string
  name: string
  description: string
  serviceType: string            // e.g. generator_pm
  callTypes: string[]            // existing call_type values
  serviceBases?: string[]        // optional applicability
  equipmentTypes?: string[]      // optional applicability
  status: "draft" | "active" | "archived"
  version: number
  config: CsrProfileConfig
  createdAt: string
  updatedAt: string
  createdBy: string
}

type CsrProfileConfig = {
  schemaVersion: 1
  sections: Array<{
    key: "client" | "classification" | "equipment" | "narratives" | "serviceWindow" | "measurements" | "materials" | "signoff" | "status"
    enabled: boolean
    order: number
    heading?: string
    help?: string
  }>
  narrativeGuidance: Record<string, string>
  narrativeSkeletons?: Record<string, CsrNarrativeBlock[]> // guidance-only; see 11.4
  measurementTemplate: CsrMeasurementDocument | null
  materialSuggestions: Array<Pick<CsrMaterialLine, "description" | "unit" | "category">>
  validation: {
    requiredFields?: string[]
    requiredMeasurementKeys?: string[]
    requiredMaterialLine?: boolean
    allowedStatuses?: string[] // optional subset of the tenant CSR status vocabulary
  }
  display: {
    showOperationalReadings: boolean
    modelLabel?: string
    serialLabel?: string
    showAcknowledgement: boolean
    recipientTitle?: string
    technicianSignLine?: boolean
  }
}
```

### 11.2 Snapshot rule

A CSR created from a profile SHALL store:

- `service_profile_id`
- `service_profile_version`
- `service_profile_snapshot` (the full config used at creation)

Later edits to the profile SHALL NOT change the snapshot or the printed report. Deleting or archiving a profile SHALL NOT affect existing CSRs. **[Must]**

### 11.3 Authoring and permissions

| Action | Recommended role | Priority |
| --- | --- | --- |
| Create draft profile | Supervisor or administrator | Should |
| Publish (activate) profile | Administrator | Must |
| Edit a profile | Administrator; creates a new version | Must |
| Archive a profile | Administrator | Must |
| Use a profile | Technician and above | Must |

### 11.4 Prefill decision

**Recommendation [Proposed]:** profiles provide **structure and guidance only**. They SHALL NOT prefill narrative statements of fact.

Allowed:

- Section headings.
- Guidance text.
- Empty list skeletons with placeholder prompts (for example "Step", "Finding").
- Measurement groups with empty values.
- Material suggestions that the technician must confirm.

Not allowed:

- Pre-written sentences that assert a condition, action, or result.
- Pre-filled pass results.
- Pre-filled quantities.

Reasons:

1. A service report is a factual record. Pre-filled facts create false records and liability.
2. Technicians may submit without review.
3. Historical truth is harder to defend.

### 11.5 Optional status restriction

A profile MAY declare `validation.allowedStatuses`. Semantics:

- The value SHALL be a subset of the tenant CSR status vocabulary in Section 15.1.
- When present, the form SHALL offer only the listed statuses for CSRs created from that profile.
- When absent, the full tenant vocabulary remains available.
- The restriction SHALL NOT block foundation lifecycle transitions required for archive, deletion, or correction by an authorised role.
- The restriction SHALL be validated when the profile is activated (FR-077).
- The restriction SHALL be snapshotted with the profile (FR-073).

**Proposed.** This property is not present in current code and is not required for a CSR to function. If the product does not approve it, it is removed from the profile contract without affecting other profile fields.

### 11.6 Ownership scope

**Unresolved.** The recommended default is **tenant-wide** profiles, because service methods belong to the company, not to a device or an individual. Branch-level or team-level profiles are a possible later extension. FR-070 requires tenant scoping only; the scope within a tenant is OD-02.

### 11.7 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-070 | Service profiles SHALL be tenant-scoped records with draft, active, and archived states. Scope within a tenant is OD-02. | Must |
| CSR2-FR-071 | A profile SHALL define applicability, enabled sections, narrative guidance, measurement template, material suggestions, validation overlays, and display metadata. | Must |
| CSR2-FR-072 | Profile edits SHALL create a new version. | Must |
| CSR2-FR-073 | A CSR SHALL store the profile id, version, and an immutable configuration snapshot. | Must |
| CSR2-FR-074 | Historical CSRs SHALL remain readable if the source profile is edited, archived, or removed. | Must |
| CSR2-FR-075 | Profiles SHALL NOT prefill factual narrative text, pass/fail results, or quantities. | Must |
| CSR2-FR-076 | Only authorised roles SHALL publish profiles. | Must |
| CSR2-FR-077 | Profile configuration SHALL be validated against the registered section, measurement, and status vocabulary schemas before activation. | Must |
| CSR2-FR-078 | Profile selection SHALL be optional and SHALL NOT be required to print or search. | Must |
| CSR2-FR-079 | A profile SHALL NOT remove required foundation validation for identity, numbering, or sign-off. | Must |
| CSR2-FR-080 | Profile scope (tenant-wide vs branch) SHALL be recorded as a product decision before implementation. | Must |
| CSR2-FR-081 | A profile MAY restrict the CSR statuses offered to CSRs created from it. The restriction SHALL be a subset of the tenant vocabulary, validated on activation, and snapshotted with the CSR. | Should |

---

## 12. PDF and document-generation specification

### 12.1 Prepared contract expansion

The prepared CSR contract SHALL add:

| Addition | Purpose |
| --- | --- |
| `narrativeBlocks` per narrative field | Print structured content |
| `measurementGroups` | Print configured groups, rows, items, units, notes, results |
| `materials` enriched with `remarks`, `category`, `billable` | Print work records |
| `profile: { id, name, version } \| null` | Document provenance where enabled |
| `contentVersion` | Select V1 or V2 rendering rules |
| `signatures` complete for both parties | Sign-off integrity |

Existing fields SHALL remain. The six-key `readings` projection SHALL remain for both engines. **[Must]**

### 12.2 Engines

Both engines SHALL remain supported during the initial evolution. **[Must]** This PRD retains both engines for the initial architecture; engine consolidation is not approved (OD-08). A shared rendering specification is recommended: block rendering and pagination rules should be stated once and implemented in each engine. **[Proposed]**

| Engine | Scope in CSR 2.0 | Constraint |
| --- | --- | --- |
| Legacy `@react-pdf/renderer` | Supported, with block rendering | Must preserve V1 recorded information and readability |
| PDFCN (`@formepdf`) | Supported, with block and group rendering | Must keep fixed footer page counters correct |

### 12.3 Layout and pagination rules

1. Readability wins over one-page output. **[Must]**
2. No clipping, overlap, or content loss at any length. **[Must]**
3. A heading stays with its following content. If it does not fit, it moves to the next page. **[Should]**
4. List items split between items, not inside a line. **[Should]**
5. Material and measurement tables repeat headers on each page. **[Must]**
6. Empty optional blocks collapse. They do not reserve space. **[Must]**
7. Signature blocks appear after the final content. They never overlap content or each other. **[Must]**
8. Page numbers reflect the real total after pagination. **[Must]**
9. Long single values wrap. They do not overflow the page. **[Must]**
10. One-page preference applies only when all content fits without reducing text below the minimum readable size. **[Must]**
11. The minimum readable text size is not yet approved. **Proposed:** body text 8 pt, table cells 7 pt, footnotes 6.5 pt. No layout may reduce text below the approved minimum. Decision: OD-19. **[Unresolved]**

### 12.4 Sign-off

- Two sign-off blocks are required by current validation: service engineer and client representative.
- Printed name, designation, date, and optional signature image SHALL be supported.
- `recipient_signature_uri` SHOULD be persisted and printable. Today it is dropped by the persistence whitelist (V-10).
- If a signature image is absent, a signature line SHALL print. The report SHALL remain valid.
- Signature images SHALL be size-limited and served from an approved location. **[Unresolved]** (data URI vs storage bucket)

### 12.5 Historical output

A CSR with `content_version = 1` SHALL render through the V1 path and preserve its recorded narrative, measurement, material, sign-off, label, unit, and fallback information. Historical preservation does not require byte-identical, pixel-identical, or layout-identical PDF output. **[Must]**

Two checks are separate:

1. **Historical data preservation.** Golden fixtures compare the information, meaning, and readability of the rendered report with the stored record.
2. **Visual-template regression.** Baseline images catch unintended template changes. A reviewed template change may alter layout without failing historical preservation.

Both checks SHALL exist before Phase 6 closes.

### 12.6 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-090 | The prepared CSR contract SHALL expose narrative blocks, measurement groups, enriched materials, profile metadata, and content version. | Must |
| CSR2-FR-091 | Both engines SHALL render the extended contract during the transition. | Must |
| CSR2-FR-092 | PDF output SHALL contain no clipped, overlapping, or truncated content. | Must |
| CSR2-FR-093 | Tables SHALL repeat headers across pages. | Must |
| CSR2-FR-094 | Heading blocks SHALL stay with following content when possible. | Should |
| CSR2-FR-095 | Page numbers SHALL state the correct current page and total pages. | Must |
| CSR2-FR-096 | Signature blocks SHALL print after content and never overlap. | Must |
| CSR2-FR-097 | A one-page result SHALL be preferred only when readability is preserved. | Must |
| CSR2-FR-098 | V1 CSRs SHALL preserve their recorded content, meaning, labels, units, and narrative fallbacks when rendered. Byte-identical output is not required. | Must |
| CSR2-FR-099 | Render layers SHALL NOT mutate CSR data. | Must |
| CSR2-FR-100 | Profile provenance SHALL print only when the tenant enables it. | Should |
| CSR2-FR-101 | Empty blocks SHALL collapse without leaving blank sections. | Must |

---

## 13. Import and search specification

### 13.1 Import contract

The import schema SHALL accept:

| Input | Behaviour |
| --- | --- |
| Legacy string narrative | Normalize as today, then store as V1-compatible text or a single paragraph |
| Block array narrative | Validate strictly, store as canonical blocks |
| `materials` array | Map to material lines, preserving item, quantity, unit |
| Missing optional field | Leave empty |
| Missing required field | Reject with field-level error |
| Unsupported block type | Reject the import. Do not flatten. |

**Verified basis:** the current prompt and schema already accept blocks; only `CsrImportSheet.tsx:64` flattens them.

### 13.2 Round-trip requirement

An imported narrative SHALL survive without change to words, list order, or supported marks through:

1. Persistence.
2. Form editing.
3. Plain-text projection.
4. Web rendering.
5. PDF rendering.

No stage may change words, list order, or supported emphasis within the contract in Section 8.3. Unsupported formatting is rejected at import; it is not normalized into content that looks supported.

### 13.3 Derived plain-text mechanism

**Options compared**

| Mechanism | Advantages | Disadvantages |
| --- | --- | --- |
| Application-managed on save | Simple, no DB function | Bypassable by RPC, SQL fixes, duplicate paths; drift; must be repeated in every writer |
| Database trigger with an immutable helper | One authority; covers all writers; testable; search always current | Requires migration and careful function versioning; trigger cost on write |
| Generated column | Declarative; cannot drift | Expression must be immutable; function changes are awkward; cannot be manually repaired; limited error handling |

**Recommendation [Proposed — decision OD-17]:** database-managed derivation with a `BEFORE INSERT OR UPDATE` trigger that calls an `IMMUTABLE` helper function. Whichever authority is selected, no other writer SHALL update derived columns.

Reasons:

1. Duplicate, import, and any future RPC become correct by default.
2. Search reads a normal indexed column.
3. The rule is enforceable in one place.
4. A backfill can reuse the same function.

**Alternative:** application-managed derivation in the CSR service. It is simpler to deploy, but every writer (form, duplicate, import, future RPC) must apply it, and drift is possible.

**Decision dependency:** this recommendation is not an approved decision. Phase 1 SHALL NOT implement either mechanism until OD-17 is resolved. **Technical validation required:** for the trigger option, confirm trigger cost on the expected write volume and confirm that the helper is safe for `IMMUTABLE`. See TV-01 and TV-02.

### 13.4 Search rules

- Global search SHALL use derived plain text for narratives and materials. **[Must]**
- Search SHALL NOT match raw JSON keys, HTML tags, or block type names. **[Must]**
- Search SHALL continue to read the legacy text columns for V1 records. **[Must]**
- List search SHALL keep its current three-field behaviour unless a later change is approved. **[Must]**
- The existing materials search behaviour SHALL remain for V1 envelopes. **[Must]**
- New derived columns SHOULD have trigram indexes consistent with the current search migration. **[Should]**

### 13.5 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-110 | Import SHALL preserve structured narrative blocks. | Must |
| CSR2-FR-111 | Import SHALL reject malformed blocks with field-level messages. | Must |
| CSR2-FR-112 | Imported content SHALL round-trip through all five surfaces without change to words, list order, or supported marks. | Must |
| CSR2-FR-113 | Global search SHALL read derived plain text, not raw JSON or HTML. | Must |
| CSR2-FR-114 | Plain-text derivation SHALL have exactly one authoritative mechanism, selected under OD-17 before Phase 1 implementation. | Must |
| CSR2-FR-115 | Existing list search, global search ranking, and materials search SHALL not regress. | Must |
| CSR2-FR-116 | Derived text SHALL be backfilled for all existing CSRs. | Must |
| CSR2-FR-117 | Search SHALL match words inside headings and list items. | Must |

---

## 14. Persistence and compatibility architecture

### 14.1 Storage option comparison

| Criterion | JSONB sidecar columns | Versioned metadata envelope |
| --- | --- | --- |
| Queryability | High: native JSONB operators | Low: text parsing only |
| Search | Derived plain-text columns; optional JSONB path indexes | Requires SQL string parsing or application decoding |
| Indexing | GIN on JSONB; trigram on derived text | Only on the whole text column |
| Validation | App schema plus optional `CHECK (jsonb_typeof(...))` | App schema only; DB cannot enforce inner shape |
| Historical compatibility | Additive; legacy text remains | Additive; envelope version can coexist |
| Tenant provisioning | New columns/tables must join the template | No schema change; template untouched |
| Migration safety | Additive columns and backfill | No DDL; but no schema contract |
| Data integrity | Stronger types and constraints | Weak; one opaque text value |
| Maintainability | Clear fields and contracts | Hidden structure; easy to corrupt |
| Performance | One row, larger payload; TOAST handled by Postgres | One text column, also TOAST |
| Reporting/analytics | Direct SQL | Very difficult |

### 14.2 Recommended target architecture (not approved)

**Recommended target [Proposed — decision OD-18]:** JSONB sidecar columns.

Add:

| Column | Type | Purpose |
| --- | --- | --- |
| `narratives_doc` | jsonb | Canonical narrative blocks per field |
| `measurements_doc` | jsonb | Canonical measurement document |
| `materials_doc` | jsonb | Canonical materials document |
| `content_version` | smallint not null default 1 | Rendering and migration switch |
| `narratives_text` | text | Derived plain text for search |
| `materials_text` | text | Derived readable materials for search |
| `profile_id` | uuid null | Profile provenance |
| `profile_version` | integer null | Snapshot version |
| `profile_snapshot` | jsonb null | Immutable configuration snapshot |
| `updated_at` | timestamptz | Change tracking |

New table: `csr_service_profiles`.

The **versioned metadata envelope** is the alternative. It avoids schema changes but does not give the queryability, reporting, or validation of the sidecar option. It is retained as a bridge option only.

**Decision dependency:** JSONB sidecar columns are a recommendation, not an approved decision. Phase 0 must resolve OD-18 before schema freeze. TV-08 must confirm row size and query performance. If OD-18 selects the envelope, the requirements in 14.6 remain valid except for the storage wording in FR-120.

### 14.3 Compatibility floor

- Existing columns remain writable and readable.
- For V1 records, existing text columns are the authoritative narrative source.
- For V2 records, existing text columns are derived plain-text projections under Section 8.6; they are not independently editable.
- Existing envelope data remains readable.
- `content_version = 1` means legacy rendering.
- No destructive column removal or rewrite in CSR 2.0.
- No `NOT NULL` added to legacy nullable fields without a data audit.

### 14.4 Integrity corrections and priority

| Finding | Correction | Priority | Justification |
| --- | --- | --- | --- |
| Missing `updated_at` | Add nullable column with default now for new writes; backfill from `created_at` | Should | Needed for conflict and audit clarity, not for first UI release |
| Random UUID defaults | Drop defaults; make nullable | Should | Prevents orphan links; low migration risk |
| `recipient_signature_uri` dropped | Persist in a dedicated column or signature JSON | Should | Completes sign-off; not a release blocker |
| `materialsTitle` not persisted | Store in materials document | Should | Small usability fix with the materials phase |
| Envelope compatibility | Keep parser and search decoder | Must | Protects history |
| Default status `Complete` | New CSR default `Incomplete` | Should | Prevents false completion; needs product approval |
| Status vocabulary mismatch | Define canonical status list and resolve the meaning of `in_progress` | Should | Mapping is unresolved (OD-12); field mode writes an unlisted status |

**Explicit rule:** not every defect is a launch requirement. Among the integrity corrections, only envelope compatibility is a Must in Phase 1.

### 14.5 Tenant provisioning and migrations

- New columns and tables SHALL be added to the tenant master template and the provisioning path.
- Migrations SHALL be idempotent.
- Backfill SHALL process rows in batches.
- RLS SHALL be enabled on new tables and verified with a tenant-isolation test.
- No production write is part of this PRD task.

### 14.6 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-120 | Structured CSR content SHALL be stored in one versioned structured representation. The recommended target is JSONB sidecar columns; the mechanism SHALL be confirmed under OD-18 before Phase 1 begins. | Must |
| CSR2-FR-121 | Legacy text columns and envelope data SHALL remain readable and printable. | Must |
| CSR2-FR-122 | `content_version` SHALL select V1 or V2 rendering. | Must |
| CSR2-FR-123 | Derived plain text SHALL be persisted so search can read it without parsing JSON or HTML. | Must |
| CSR2-FR-124 | New tables and columns SHALL join tenant provisioning. | Must |
| CSR2-FR-125 | Migrations SHALL be additive and idempotent. | Must |
| CSR2-FR-126 | Historical rows SHALL NOT be destructively rewritten. | Must |
| CSR2-FR-127 | `updated_at` SHOULD be added for change tracking. | Should |
| CSR2-FR-128 | Optional UUID defaults SHOULD be removed. | Should |
| CSR2-FR-129 | Recipient signature data SHOULD be persisted and printable. | Should |
| CSR2-FR-130 | Materials title SHOULD be persisted with materials content. | Should |
| CSR2-FR-131 | Duplicate SHALL copy content documents and the profile snapshot, and SHALL generate a new number. | Must |
| CSR2-FR-132 | Only the derivation authority selected under OD-17 SHALL write derived plain-text columns. Other application writers SHALL NOT write them. | Must |
| CSR2-FR-133 | CSR payload size SHALL be bounded and validated before write. | Should |

---

## 15. Validation and lifecycle requirements

### 15.1 Status vocabulary

**Verified current options:** `Complete`, `Incomplete`, `Pending for spares`, `Under observation`, `Working solution provided` (`CsrFormScreen.tsx:70–76`). Duplicate writes `in_progress`; a new CSR defaults to `Complete`; field mode uses `Field Entry Pending`.

The verified values and the proposed vocabulary are different sets. The table below is the **proposed** target vocabulary, not a description of current code.

| Status | Meaning | Current state | Editable | Printable |
| --- | --- | --- | --- | --- |
| Draft | Work in progress | Proposed; not in the current form list | Yes | Preview only |
| Incomplete | Work done, data missing | Current form value | Yes | Yes, marked incomplete |
| Pending for spares | Waiting for parts | Current form value | Yes | Yes |
| Under observation | Awaiting outcome | Current form value | Yes | Yes |
| Working solution provided | Interim remedy | Current form value | Yes | Yes |
| Complete | Final report | Current form value; current default | Warning on edit | Yes |
| Field Entry Pending | Field placeholder only | Current field-mode value; not in the form list | Yes | No (or watermarked) |

**Recommendation [Proposed]:** keep the five current form labels and the field-mode value. Add `Draft` only after OD-12 confirms its meaning. Do not remove existing values.

**Unresolved [OD-12]:** `in_progress` is written by the duplicate path and is not in the form list. Existing evidence does not establish whether it means `Draft`, `Incomplete`, or a separate state. This PRD SHALL NOT map it until the duplicate behaviour is reviewed. The mapping is a product decision, not an implementation detail.

Profile status restrictions (Section 11.5) SHALL use this vocabulary and SHALL NOT introduce new status values.

### 15.2 Validation rules

| Rule | Statement | Priority |
| --- | --- | --- |
| VAL-01 | CSR number is required and unique within the tenant. | Must |
| VAL-02 | Date is required for PDF generation. | Must |
| VAL-03 | Client name is required for PDF generation. | Must |
| VAL-04 | Equipment location is required for PDF generation. | Must |
| VAL-05 | Both sign-off blocks are required for final print. | Must |
| VAL-06 | Profile-required fields block status change to Complete. Profile `allowedStatuses`, when present, restrict the offered statuses. | Must / Should |
| VAL-07 | Invalid block, measurement, or material structure blocks save. | Must |
| VAL-08 | Numeric measurements reject non-numeric input. | Must |
| VAL-09 | Required measurement keys block completion. | Must |
| VAL-10 | Empty material lines are removed, not validated. | Must |
| VAL-11 | Editing a Complete CSR shows a warning and records an audit event. | Should |
| VAL-12 | A profile snapshot cannot be edited after creation. | Must |
| VAL-13 | Profile `allowedStatuses` SHALL be enforced on every status change. It SHALL NOT block required archive or correction transitions. | Should |

### 15.3 Lifecycle requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-140 | New CSRs SHALL NOT default to `Complete`. | Must |
| CSR2-FR-141 | The status vocabulary SHALL be documented and applied by every writer. | Must |
| CSR2-FR-142 | Status values written by duplicate, field mode, and import SHALL be valid vocabulary values. | Must |
| CSR2-FR-143 | Completion SHALL enforce profile validation and sign-off readiness. | Must |
| CSR2-FR-144 | Archive SHALL preserve the record, content versions, and snapshot. | Must |
| CSR2-FR-145 | Editing a completed CSR SHOULD require confirmation and SHOULD record an audit entry. | Should |
| CSR2-FR-146 | Validation errors SHALL identify the field or section. | Must |

---

## 16. Historical record handling

### 16.1 Rules

1. Every CSR carries `content_version`.
2. V1 records read and print through the legacy path.
3. V2 records read and print through the structured path.
4. A profile snapshot is immutable after creation.
5. Measurement labels, units, and reference ranges are stored with the CSR.
6. Material descriptions are stored as recorded. Item-library changes do not alter history.
7. No migration rewrites narrative text or envelope content.
8. Archive preserves all versions. Delete remains a separate explicit action.
9. Duplicate creates a new record. It never mutates the source.
10. Search projections reflect what is stored, including historical records.
11. Historical preservation means the recorded information, meaning, and readability are retained. It does not require byte-identical, pixel-identical, or layout-identical PDF output.
12. Visual-template regression is tested separately from historical data preservation. A reviewed template change may alter layout if the recorded information remains complete and readable.

### 16.2 Upgrade on edit

When a user edits a V1 CSR:

- The form loads plain text safely.
- The user may keep plain text.
- On save, the system MAY write blocks and increment to V2.
- The plain-text projection SHALL preserve words and line order. Whitespace normalization is permitted.
- The user sees no content change.

**Recommendation [Proposed]:** lazy upgrade per record on edit. Do not bulk-upgrade the whole table.

### 16.3 Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-FR-150 | Every CSR SHALL expose its content version. | Must |
| CSR2-FR-151 | V1 records SHALL preserve their recorded content, meaning, and readability through every supported document pipeline. Byte-identical output is not required. | Must |
| CSR2-FR-152 | Profile snapshots SHALL be immutable. | Must |
| CSR2-FR-153 | Measurement and material snapshots SHALL be self-contained. | Must |
| CSR2-FR-154 | Historical search results SHALL remain accurate after backfill. | Must |
| CSR2-FR-155 | Bulk upgrade of historical narratives SHALL NOT be part of CSR 2.0. | Must |

---

## 17. Non-functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| CSR2-NFR-001 | CSR forms SHALL meet WCAG 2.2 AA for labels, focus order, error identification, and contrast. | Must |
| CSR2-NFR-002 | Every form control and editor toolbar action SHALL be keyboard operable. | Must |
| CSR2-NFR-003 | Validation errors SHALL be announced to assistive technology and linked to their fields. | Must |
| CSR2-NFR-004 | The CSR list query and response shape SHALL not regress in performance. | Must |
| CSR2-NFR-005 | Opening a CSR detail SHALL render within 2 seconds at p95 on a staging dataset of 500 CSRs per tenant, including 50 records at the FR-028 size limit. Measurement starts at the navigation action and ends at completed render, on production-like staging hardware with a warm application instance. | Should |
| CSR2-NFR-006 | PDF generation for a representative 12-page CSR (12 narrative pages, 40 material lines, 6 measurement groups) SHALL complete within 10 seconds at p95 on the same staging environment with a warm function instance. Cold start is excluded. | Should |
| CSR2-NFR-007 | New tables SHALL enforce tenant isolation with RLS and `tenantClient`. | Must |
| CSR2-NFR-008 | Client code SHALL NOT use service-role credentials for CSR operations. | Must |
| CSR2-NFR-009 | Structured content SHALL be validated before write and re-validated on read in preview. | Must |
| CSR2-NFR-010 | One canonical contract module SHALL define narrative, measurement, and material types. | Must |
| CSR2-NFR-011 | PDF templates SHALL contain presentation logic only. | Must |
| CSR2-NFR-012 | Derivation failures SHALL be logged and SHALL NOT silently produce empty search text. | Must |
| CSR2-NFR-013 | Critical contracts SHALL have automated tests for round-trip, validation, and rendering. | Must |
| CSR2-NFR-014 | CSR writes SHALL reject payloads above the agreed size limit with a clear error. | Should |
| CSR2-NFR-015 | No render or preview path SHALL mutate CSR data. | Must |
| CSR2-NFR-016 | No PDF layout SHALL reduce body text below the approved minimum readable size to satisfy a one-page preference. The minimum is defined by OD-19 before Phase 6. | Must |

No performance target in this PRD has been measured. Targets are verified in staging under the stated conditions before the relevant phase closes.

---

## 18. Scope exclusions

| Excluded item | Note |
| --- | --- |
| Commercial invoice, quotation, and PO PDF migration | Separate workstream; must not be mixed with CSR 2.0 |
| PDF engine consolidation | Not mandated; both engines remain during transition |
| Inventory, stock, procurement, purchasing | No dependency introduced |
| Equipment asset registry and trend analytics | Future capability; measurements remain CSR-owned snapshots |
| Client portal and electronic signature workflow | Not in CSR 2.0 |
| Backend AI extraction improvements beyond the import contract | Out of scope |
| Bulk historical narrative rewrite | Explicitly forbidden |
| Numbering system changes | Out of scope |

---

## 19. Prioritized requirements with unique IDs

Priorities: **Must / Should / Could**. Phases reference Section 20.

### 19.1 Foundation

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-001 | One shared CSR foundation for all service types | Must | 0–1 |
| CSR2-FR-002 | Numbering unchanged | Must | 0 |
| CSR2-FR-003 | Existing routes and actions preserved | Must | 1 |
| CSR2-FR-004 | Registered section types; profile configures only | Must | 5 |
| CSR2-FR-005 | Canonical contracts defined once | Must | 0 |
| CSR2-FR-006 | CSR readable without a profile | Must | 2 |
| CSR2-FR-007 | Keep current equipment fields | Must | 1 |

### 19.2 Service experiences

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-010 | Profile-merged section rendering | Must | 5 |
| CSR2-FR-011 | Guidance displayed, not saved | Must | 5 |
| CSR2-FR-012 | Profiles optional | Must | 5 |
| CSR2-FR-013 | Safe profile switch on draft | Should | 5 |
| CSR2-FR-014 | Required sections enforced | Must | 5 |

### 19.3 Rich text

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-020 | Versioned block documents | Must | 1–2 |
| CSR2-FR-021 | Limited node and mark set | Must | 2 |
| CSR2-FR-022 | HTML not canonical | Must | 1 |
| CSR2-FR-023 | Plain-text projection per narrative | Must | 1 |
| CSR2-FR-024 | Sanitized web rendering | Must | 2 |
| CSR2-FR-025 | PDF consumes blocks | Must | 2 |
| CSR2-FR-026 | Malformed content rejected | Must | 2 |
| CSR2-FR-027 | Preserve empty/defects fallbacks | Must | 2 |
| CSR2-FR-028 | Size limits | Should | 2 |
| CSR2-FR-029 | V1 narratives remain printable/searchable | Must | 1 |
| CSR2-FR-030 | Editor on four core fields | Must | 2 |
| CSR2-FR-031 | TipTap↔block and block→render adapters | Must | 1–2 |
| CSR2-FR-032 | Unsupported nodes and malformed content reported | Must | 2 |
| CSR2-FR-033 | Canonical blocks are the only editable V2 source | Must | 1–2 |
| CSR2-FR-034 | Every write updates projections; drift detectable | Must | 1 |
| CSR2-FR-035 | HTML is not a mandatory intermediate | Must | 1–2 |

### 19.4 Measurements

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-040 | Versioned measurement document | Must | 1–3 |
| CSR2-FR-041 | Four value kinds | Must | 3 |
| CSR2-FR-042 | Unit, precision, source, and range mode | Must | 3 |
| CSR2-FR-043 | Repeatable rows | Should | 3 |
| CSR2-FR-044 | Item notes | Should | 3 |
| CSR2-FR-045 | Legacy six-group presentation preserved | Must | 3 |
| CSR2-FR-046 | Legacy readings projection | Must | 3 |
| CSR2-FR-047 | No unvalidated calculations | Must | 3 |
| CSR2-FR-048 | No invented ranges | Must | 3 |
| CSR2-FR-049 | Engine hours separate from service window | Must | 3 |
| CSR2-FR-050 | Profile-configurable, snapshotted order | Must | 3–5 |
| CSR2-FR-051 | Numeric validation | Must | 3 |
| CSR2-FR-052 | Printable groups and units | Must | 3–6 |
| CSR2-FR-053 | Range mode semantics; no inferred pass/fail | Must | 3 |
| CSR2-FR-054 | Ranges and modes snapshotted | Must | 3 |

### 19.5 Materials

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-060 | Versioned materials document + title | Must | 4 |
| CSR2-FR-061 | Extended line fields | Must/Should | 4 |
| CSR2-FR-062 | V1 envelope readable | Must | 1 |
| CSR2-FR-063 | Plain-text materials readable | Must | 1 |
| CSR2-FR-064 | No inventory dependency | Must | 4 |
| CSR2-FR-065 | Title saved and printed | Should | 4 |
| CSR2-FR-066 | Repeated table headers | Must | 6 |
| CSR2-FR-067 | Enriched prepared materials | Must | 4 |
| CSR2-FR-068 | No silent quantity coercion | Must | 4 |

### 19.6 Service profiles

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-070 | Tenant profile entity | Must | 5 |
| CSR2-FR-071 | Full profile configuration | Must | 5 |
| CSR2-FR-072 | Versioned edits | Must | 5 |
| CSR2-FR-073 | Immutable snapshot | Must | 5 |
| CSR2-FR-074 | History survives profile removal | Must | 5 |
| CSR2-FR-075 | No factual prefill | Must | 5 |
| CSR2-FR-076 | Publish permissions | Must | 5 |
| CSR2-FR-077 | Config validated before activation | Must | 5 |
| CSR2-FR-078 | Profile optional | Must | 5 |
| CSR2-FR-079 | Required foundation validation retained | Must | 5 |
| CSR2-FR-080 | Scope decision recorded | Must | 0 |
| CSR2-FR-081 | Optional profile status restriction | Should | 5 |

### 19.7 PDF

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-090 | Extended prepared contract | Must | 1–6 |
| CSR2-FR-091 | Both engines supported | Must | 6 |
| CSR2-FR-092 | No clipping or overlap | Must | 6 |
| CSR2-FR-093 | Repeated table headers | Must | 6 |
| CSR2-FR-094 | Heading attachment | Should | 6 |
| CSR2-FR-095 | Correct page counters | Must | 6 |
| CSR2-FR-096 | Signature placement | Must | 6 |
| CSR2-FR-097 | One-page preference subordinate | Must | 6 |
| CSR2-FR-098 | V1 information preserved; byte-identical output not required | Must | 1–6 |
| CSR2-FR-099 | Renderers read-only | Must | 6 |
| CSR2-FR-100 | Optional profile provenance | Should | 6 |
| CSR2-FR-101 | Empty blocks collapse | Must | 6 |

### 19.8 Import and search

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-110 | Import preserves blocks | Must | 2 |
| CSR2-FR-111 | Field-level import errors | Must | 2 |
| CSR2-FR-112 | Round-trip on all surfaces | Must | 2 |
| CSR2-FR-113 | Search reads derived text | Must | 1 |
| CSR2-FR-114 | One derivation authority | Must | 1 |
| CSR2-FR-115 | No search regression | Must | 1–7 |
| CSR2-FR-116 | Backfill derived text | Must | 1 |
| CSR2-FR-117 | Search headings and list items | Must | 1 |

### 19.9 Persistence and lifecycle

| ID | Requirement | Priority | Phase |
| --- | --- | --- | --- |
| CSR2-FR-120 | Structured storage (mechanism OD-18) | Must | 1 |
| CSR2-FR-121 | Legacy compatibility floor | Must | 1 |
| CSR2-FR-122 | Content version switch | Must | 1 |
| CSR2-FR-123 | Derived text columns | Must | 1 |
| CSR2-FR-124 | Provisioning parity | Must | 1 |
| CSR2-FR-125 | Additive idempotent migrations | Must | 1 |
| CSR2-FR-126 | No destructive rewrite | Must | 1 |
| CSR2-FR-127 | `updated_at` | Should | 7 |
| CSR2-FR-128 | Remove UUID defaults | Should | 7 |
| CSR2-FR-129 | Persist recipient signature | Should | 7 |
| CSR2-FR-130 | Persist materials title | Should | 4 |
| CSR2-FR-131 | Duplicate copies content + snapshot | Must | 4–5 |
| CSR2-FR-132 | Only selected authority writes derived text | Must | 1 |
| CSR2-FR-133 | Payload size guard | Should | 1 |
| CSR2-FR-140 | No default `Complete` | Must | 3 |
| CSR2-FR-141 | Documented status vocabulary | Must | 3 |
| CSR2-FR-142 | Valid status on every writer | Must | 3 |
| CSR2-FR-143 | Completion validation | Must | 5 |
| CSR2-FR-144 | Archive preserves versions | Must | 7 |
| CSR2-FR-145 | Edit-complete confirmation + audit | Should | 7 |
| CSR2-FR-146 | Field-level validation errors | Must | 2–5 |
| CSR2-FR-150 | Content version exposed | Must | 1 |
| CSR2-FR-151 | V1 information preserved | Must | 1–6 |
| CSR2-FR-152 | Immutable snapshot | Must | 5 |
| CSR2-FR-153 | Self-contained snapshots | Must | 3–5 |
| CSR2-FR-154 | Accurate historical search | Must | 1 |
| CSR2-FR-155 | No bulk narrative upgrade | Must | 1 |

### 19.10 Traceability to audit gaps

| Audit gap | Requirements |
| --- | --- |
| G1 narrative storage | FR-020, FR-022, FR-032, FR-033, FR-120, FR-122 |
| G2 narrative rendering | FR-025, FR-031, FR-035, FR-090, FR-092 |
| G3 search projection | FR-023, FR-034, FR-113, FR-114, FR-116 |
| G4 prepared contract | FR-090, FR-091, FR-098 |
| G5 measurement model | FR-040–FR-054 |
| G6 equipment/job info | FR-007, FR-071 |
| G7 materials work record | FR-060–FR-068 |
| G8 service profiles | FR-070–FR-081 |
| G9 PDF pagination | FR-092–FR-097 |
| G10 import alignment | FR-110–FR-112 |
| G12 signature persistence | FR-129 |
| G13 UUID defaults | FR-128 |
| G14 change tracking | FR-127 |
| G15 materials title | FR-130 |
| G16 list search | FR-115 |

---

## 20. Phased implementation roadmap

Each phase is independently reviewable. A phase may ship in a later release. Phase 3 requires Phases 1 and 2. Phase 4 requires Phase 1 and may start in parallel with Phase 2. Phase 3 and Phase 4 may overlap after Phase 2. Phase 5 requires Phases 3 and 4. Phase 6 requires Phases 2, 3, and 4. Phase 7 requires Phases 1–6.

### Phase 0 — Product contracts and fixtures

| Item | Detail |
| --- | --- |
| Objective | Freeze the contracts and the historical baseline before any write-path change. |
| Capabilities | Block schema, measurement schema, materials schema, profile schema, content version rules, golden CSR fixtures, PDF fixture outputs for visual regression and historical information checks. |
| Dependencies | PRD approval; open decisions OD-01, OD-03, OD-08, OD-14, OD-17, OD-18 resolved or explicitly deferred. |
| Areas | Domain contracts, database design, PDF fixtures, import schema. |
| Acceptance criteria | All schemas reviewed; 10+ golden CSRs including long narratives, V1 envelope materials, six-reading reports; information fixtures and visual-template baselines stored separately. |
| Risks | Schema churn after review; incomplete fixtures. |
| Exclusions | No production schema change, no UI change, no rendering change. |

### Phase 1 — Persistence architecture and compatibility

| Item | Detail |
| --- | --- |
| Objective | Add structured storage and derived plain text without changing visible behaviour. |
| Capabilities | Structured storage columns for the OD-18 option, `content_version`, derived columns, the OD-17 derivation authority, backfill, search migration, provisioning, RLS. |
| Dependencies | Phase 0; OD-17 and OD-18 resolved; TV-08, TV-11, TV-12 complete; TV-01 and TV-02 complete only if OD-17 selects the trigger option. |
| Areas | Migrations, `csrService`, search SQL, provisioning, types. |
| Acceptance criteria | V1 CSRs read and render with their recorded information intact; search recall matches baseline; derivation is correct for V1 and V2 rows; projection consistency check passes; tenant isolation test passes; rollback plan exists. |
| Risks | Search regression; trigger or service derivation errors; projection drift; provisioning drift. |
| Exclusions | No editor, no new form fields. |

### Phase 2 — Rich-text narrative authoring and import round-trip

| Item | Detail |
| --- | --- |
| Objective | Let technicians structure the four core narratives without losing compatibility. |
| Capabilities | Editor, TipTap↔block adapters, block validation, plain-text projection, import preservation, web preview rendering. |
| Dependencies | Phase 1; contract module stability decision; TV-03 and TV-04 complete. |
| Areas | Form, import, rich-text utilities, render model, web preview. |
| Acceptance criteria | Rich text round-trips through form, DB, import, search, preview; malformed and unsupported content rejected; a V1 edit preserves words and line order. |
| Risks | Editor↔block conversion fidelity; editor content loss; commercial module coupling. |
| Exclusions | No PDF block rendering yet; no measurement or profile work. |

### Phase 3 — Configurable measurement groups

| Item | Detail |
| --- | --- |
| Objective | Replace the universal six-field assumption with grouped, typed measurements while preserving it as the default. |
| Capabilities | Group/row/item model, numeric/text/categorical/pass-fail, units, precision, notes, repeatable rows, legacy group, engine-hours separation, validation. |
| Dependencies | Phases 1 and 2 (form patterns); OD-05 and OD-12 resolved. |
| Areas | Form, prepared contract, legacy PDF, PDFCN, validation. |
| Acceptance criteria | Default group preserves the current six-reading presentation; a generator profile group with electrical and engine readings prints correctly; invalid numerics block save; six-key projection preserved. |
| Risks | Visual regression; ambiguous unit ownership; scope creep into calculations. |
| Exclusions | No invented formulas or reference bands; no equipment registry. |

### Phase 4 — Materials and work records

| Item | Detail |
| --- | --- |
| Objective | Capture complete material lines while keeping legacy materials readable. |
| Capabilities | Part number, remarks, category, billable, typed numeric or text quantity, persisted title, adaptive PDF columns, search text. |
| Dependencies | Phase 1. May start in parallel with Phase 2. |
| Areas | Form, `csrUtils`, prepared contract, both PDF engines, search. |
| Acceptance criteria | V1 envelope renders with its recorded information intact; new lines round-trip; fractional, text, and unspecified quantities are preserved without coercion; search finds descriptions and part numbers; no inventory writes occur. |
| Risks | Envelope migration errors; table layout overflow. |
| Exclusions | No stock, purchasing, or item-library dependency. |

### Phase 5 — Service profiles and service-specific form experiences

| Item | Detail |
| --- | --- |
| Objective | Deliver the shared foundation plus six example service profiles. |
| Capabilities | Profile CRUD, versioning, snapshot, section activation, guidance, measurement templates, material suggestions, validation overlays, display metadata. |
| Dependencies | Phase 3 and Phase 4; OD-02 resolved. |
| Areas | New table and RLS, profile UI, form composition, prepared contract, provisioning. |
| Acceptance criteria | A CSR created from a profile keeps its snapshot after profile edits; required sections enforce validation; a CSR without a profile still works; no factual prefill; an enabled status restriction offers only its listed statuses. |
| Risks | Over-configuration; permission gaps; profile scope disputes. |
| Exclusions | No approval workflow unless OD-16 resolves it; no branch scoping unless approved. |

### Phase 6 — PDF/document contract and rendering reliability

| Item | Detail |
| --- | --- |
| Objective | Print structured content reliably in both engines. |
| Capabilities | Contract expansion, block rendering, measurement groups, enriched materials, pagination, header repetition, signature placement, page counters, V1 information preservation. |
| Dependencies | Phases 2, 3, 4; OD-19 resolved before layout acceptance. |
| Areas | Prepared contract, both engines, pagination utilities, tests. |
| Acceptance criteria | Long narrative and table fixtures paginate without clipping; headers repeat; signatures do not overlap; V1 fixtures preserve recorded information; template regression baselines are reviewed separately; text is not reduced below the approved minimum. |
| Risks | Dual-engine divergence; Forme fixed-header constraints; react-pdf rich-text limits. |
| Exclusions | No mandatory engine consolidation; no commercial template changes. |

### Phase 7 — Search, integrity, and historical-record hardening

| Item | Detail |
| --- | --- |
| Objective | Close integrity gaps and prove historical reliability. |
| Capabilities | `updated_at`, UUID defaults, recipient signature, edit-complete audit, archive verification, search tuning, documentation. |
| Dependencies | Phases 1–6. |
| Areas | Migrations, `csrService`, actions, search indexes, audit. |
| Acceptance criteria | Integrity checks pass; search index healthy; historical rendering verified; no orphan references from new writes. |
| Risks | Migration risk on large tables; index bloat. |
| Exclusions | No bulk content rewrite. |

### 20.1 Parallel work

| Parallel set | Condition |
| --- | --- |
| Phase 3 ∥ Phase 4 | After Phase 2; Phase 4 may already be in progress because it requires only Phase 1 |
| Phase 4 ∥ Phase 2 | Both depend only on Phase 1; they touch different form areas |
| PDF fixture preparation ∥ Phase 1 | Fixtures do not depend on the new storage |
| Search backfill tuning ∥ Phase 2 UI | Backfill is server-side |
| Profile authoring UI ∥ Phase 4 | Profile UI depends on measurement and material schemas, not their UI completion |

---

## 21. Acceptance criteria

| ID | Acceptance criterion | Verifies |
| --- | --- | --- |
| CSR2-AC-001 | A V1 CSR opened after CSR 2.0 shows its original narrative text and renders all recorded information without loss or misrepresentation. Byte-level comparison with an old PDF is not part of this criterion. | FR-098, FR-151 |
| CSR2-AC-002 | Search for a word inside a bold or list narrative returns the CSR and highlights readable text, not markup. | FR-113, FR-117 |
| CSR2-AC-003 | Renaming a bold phrase in the editor and saving preserves emphasis and updates search within the same request cycle. | FR-020, FR-023 |
| CSR2-AC-004 | Importing a report with an ordered list keeps the list order and numbering through form, database, and PDF. | FR-110, FR-112 |
| CSR2-AC-005 | Importing a malformed block reports the field and the block index. Nothing is saved. | FR-111 |
| CSR2-AC-006 | A CSR without a profile shows the six legacy readings and all foundation sections. | FR-012, FR-045 |
| CSR2-AC-007 | A generator PM profile adds electrical and engine groups; the six legacy readings are replaced, not duplicated. | FR-040, FR-050 |
| CSR2-AC-008 | Entering `abc` in a numeric measurement blocks save and names the item. | FR-051 |
| CSR2-AC-009 | A pass/fail measurement prints its result and does not invent a range. An informational range is displayed without evaluation; a validation range blocks completion when the value is outside the bounds. | FR-041, FR-048, FR-053 |
| CSR2-AC-010 | A repeatable group with two rows prints both row labels. | FR-043, FR-052 |
| CSR2-AC-011 | A 40-line material table prints on multiple pages with repeated headers and no clipped rows. | FR-066, FR-093 |
| CSR2-AC-012 | A 12-page narrative report has correct page counters, no heading stranded at a page bottom, and no text below the approved minimum size. | FR-094, FR-095, NFR-016 |
| CSR2-AC-013 | Signature blocks print after content, with names and dates, and never overlap. | FR-096 |
| CSR2-AC-014 | A CSR created from profile version 1 still shows version 1 configuration after the profile is edited to version 2. | FR-073, FR-074 |
| CSR2-AC-015 | Archiving a profile does not break existing CSRs. | FR-074 |
| CSR2-AC-016 | A profile cannot contain factual narrative prefill or a prefilled pass result. | FR-075 |
| CSR2-AC-017 | A new CSR does not start in `Complete` status. | FR-140 |
| CSR2-AC-018 | Every status written by duplicate, import, and field mode is a valid vocabulary value. | FR-141, FR-142 |
| CSR2-AC-019 | Duplicate copies narrative, measurement, and material documents, then generates a new unique number. | FR-131 |
| CSR2-AC-020 | A tenant cannot read another tenant's CSR or profile. | NFR-007 |
| CSR2-AC-021 | Keyboard-only operation can complete a CSR, including editor formatting. | NFR-002 |
| CSR2-AC-022 | Screen-reader output identifies each field, its guidance, and its error. | NFR-003 |
| CSR2-AC-023 | Legacy envelope materials and plain-text materials both print and search correctly. | FR-062, FR-063 |
| CSR2-AC-024 | Derived text equals the expected plain-text projection for 100 fixture documents. | FR-114, FR-116 |
| CSR2-AC-026 | A profile that restricts allowed statuses offers only those statuses; a CSR without a profile offers the full tenant vocabulary. | FR-081 |
| CSR2-AC-027 | A material line with quantity `2.5` stores and prints as a numeric quantity; a legacy line with `1 set` remains text and is not coerced. | FR-061, FR-068 |
| CSR2-AC-028 | A V2 CSR has exactly one editable narrative source; the legacy text column is not editable from the form, and its projection matches the canonical document after save. | FR-033, FR-034 |
| CSR2-AC-029 | Pasting an unsupported node, such as a table, into the editor is rejected with the node name, and no content is saved. | FR-031, FR-032 |

---

## 22. Risks and mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R-01 | Search silently loses recall when structured narratives arrive | High | High | Phase 1 projection before Phase 2 UI; baseline recall tests |
| R-02 | Editor document↔block conversion changes text or emphasis | Medium | High | Word and mark equivalence tests; reject lossy conversions |
| R-03 | Dual PDF engines diverge | High | Medium | Shared specification and fixtures; no engine-specific data rules |
| R-04 | Long narrative pagination clips content | Medium | High | Pagination fixtures in Phase 0/6; block-level splitting |
| R-05 | Profile snapshot missed, history mutates | Medium | High | Snapshot column, immutability test, duplicate test |
| R-06 | Commercial rich-text module changes underneath CSR | Medium | High | Reuse boundary; CSR-owned contract if not stabilised |
| R-07 | Measurement scope expands into calculations | High | Medium | No formula without validation; explicit exclusion |
| R-08 | V1 information or readability regresses after form changes | Medium | High | Information fixtures; visual baselines; content-version switch |
| R-09 | Provisioning drift for new tables/columns | Medium | High | Provisioning checklist; tenant bootstrap test |
| R-10 | Payload size or JSONB performance issues | Low | Medium | Size limits; staging measurement; GIN only where needed |
| R-11 | Over-configured profiles confuse technicians | Medium | Medium | Limit section types; one-page profile authoring; review |
| R-12 | Status vocabulary remains inconsistent | Medium | Medium | One documented vocabulary; writer audit |
| R-13 | Signature storage grows the row | Low | Medium | Size limits; storage URL decision (TV-15) |
| R-15 | Historical bulk rewrite attempted | Low | High | Hard prohibition; lazy upgrade only |
| R-16 | Canonical content and legacy text columns drift apart | Medium | High | Single editable source; projection on every write; consistency check |
| R-17 | Adapter drops unsupported formatting silently | Medium | High | Reject with the node name; round-trip corpus; no lossless claim |
| R-18 | Storage or derivation decision delayed and blocks Phase 1 | Medium | High | Resolve OD-17 and OD-18 in Phase 0; keep requirements mechanism-neutral |
| R-19 | Minimum readable size undefined when templates change | Medium | Medium | OD-19 before Phase 6; NFR-016 |

---

## 23. Open product decisions

| ID | Decision | Recommendation | Owner |
| --- | --- | --- | --- |
| OD-01 | Do profiles prefill narrative text? | Guidance and structure only; no factual statements | Product + service lead |
| OD-02 | Profile scope within a tenant | Tenant-wide recommended; branch/team later; unresolved | Product |
| OD-03 | Measurement ownership | CSR-owned snapshot; equipment template later | Product + architecture |
| OD-04 | Mandatory measurement sets per service basis | Define per profile; do not hardcode globally | Service lead |
| OD-05 | Reference range authority and enforcement mode | Tenant, profile, or manual entry with an explicit informational, warning, or validation mode; no default range | Service lead + product |
| OD-06 | Rich text for customer feedback | Plain text first; enable later if requested | Product |
| OD-07 | Heading levels in reports | Levels 2–3 in UI; level 1 reserved | Design |
| OD-08 | PDF engine consolidation | Keep both for CSR 2.0; revisit after Phase 6 | Architecture |
| OD-09 | Client signature capture | Persist image where available; line otherwise | Product |
| OD-10 | Material quantity representation | Store numeric (including fractional), text, or unspecified; never coerce. Decide later whether new lines must be numeric. | Product |
| OD-11 | Item-library linkage | Defer; no inventory dependency | Product |
| OD-12 | Canonical status list and meaning of `in_progress` | Unresolved. Review duplicate behaviour before any mapping. Keep current labels. | Product |
| OD-13 | Editing a Complete CSR | Warn and audit; do not hard-lock | Product |
| OD-14 | Historical narrative upgrade | Lazy per-record upgrade on edit | Architecture |
| OD-15 | Display metadata ownership | Profile defaults; per-document override allowed | Product |
| OD-16 | Profile approval workflow | Not in v1; add if multi-author use grows | Product |
| OD-17 | Plain-text projection owner | Database trigger recommended; application-managed alternative. Select before Phase 1. | Architecture + data |
| OD-18 | Structured content storage | JSONB sidecar columns recommended; versioned envelope alternative. Select before Phase 1. | Architecture + data |
| OD-19 | Minimum readable PDF text size | Design to approve. Provisional floor: 8 pt body, 7 pt table cells, 6.5 pt footnotes. | Design |

Phase 0 requires OD-01, OD-03, OD-08, OD-14, OD-17, and OD-18 to be resolved or explicitly deferred. OD-05 and OD-12 block Phase 3. OD-02 blocks Phase 5. OD-19 blocks Phase 6.

---

## 24. Technical validation requirements before implementation

| ID | Validation | Blocks | Method |
| --- | --- | --- | --- |
| TV-01 | Trigger option: plain-text derivation cost at expected write volume | Phase 1 (if OD-17 selects the trigger) | Staging benchmark with realistic row sizes |
| TV-02 | Trigger option: `IMMUTABLE` helper correctness for all block types | Phase 1 (if OD-17 selects the trigger) | Unit tests with fixtures; SQL review |
| TV-03 | TipTap→block and block→TipTap conversion fidelity, including unsupported and empty documents | Phase 2 | Round-trip corpus: paragraphs, marks, lists, headings |
| TV-04 | Block schema alignment with TipTap node schema | Phase 2 | Editor content matrix |
| TV-05 | Pagination strategy per engine | Phase 6 | Measure block heights; page-break fixtures |
| TV-06 | Forme fixed-header and page-counter behaviour with dynamic content | Phase 6 | Multi-page fixtures in PDFCN |
| TV-07 | `@react-pdf` rich-text long-content behaviour | Phase 6 | 12+ page fixtures in legacy engine |
| TV-08 | Row size and query performance for the selected storage option (JSONB measured as the candidate) | Phase 1 | `EXPLAIN` and payload measurement |
| TV-09 | Tenant provisioning update mechanics for new columns/tables | Phase 1 | Provision a new tenant in staging |
| TV-10 | RLS policy correctness on `csr_service_profiles` and new columns | Phase 1/5 | Cross-tenant access test |
| TV-11 | Backfill idempotency and rollback | Phase 1 | Re-run backfill; verify counts and text |
| TV-12 | Search recall baseline before and after projection | Phase 1 | Fixed query set with expected results |
| TV-13 | Profile snapshot size and read cost | Phase 5 | Large-profile fixture |
| TV-14 | V1 envelope → materials document mapping without loss | Phase 4 | Envelope corpus |
| TV-15 | Signature storage approach (data URI vs object storage) | Phase 7 | Size, access, and print tests |
| TV-16 | Accessibility conformance of the editor and validation flow | Phase 2/5 | WCAG 2.2 AA manual and automated checks |
| TV-17 | Projection consistency check and repair for V2 records | Phase 1 | Drift fixtures; repair re-run; verify search text |
| TV-18 | Minimum readable text size across both engines | Phase 6 | Print measurement at 100% scale against OD-19 |

---

## 25. Verification record

Two documentation-only tasks produced this document: the original PRD authoring and this targeted editorial and architectural revision. Neither task changed application code.

**Before this revision**

- Branch: `main`
- HEAD: `a1b4b4d9`
- Working tree: 110 pre-existing entries, including modified CSR preview/import files, deleted legacy PDF templates and fonts, and untracked commercial rich-text and PDF migration work. `docs/prd/CSR-2.0-PRD.md` was already untracked (`??`) from the PRD authoring task.
- No file was staged, committed, stashed, reset, or discarded.

**After this revision**

- Working tree entry count: 110 → 112. The two additional entries were created by concurrent in-flight work, not by this revision.
- The only path written by this revision is `docs/prd/CSR-2.0-PRD.md`, which remains `?? docs/prd/CSR-2.0-PRD.md` in git status.
- No application source, schema, migration, PDF template, asset, configuration, or existing report was modified by this revision.
- Pre-existing changes were preserved, including the 63 tracked files and 8 staged deletions that were present before this revision. Some commercial/PDF files have recent modification times because other in-flight work continues; this revision did not write to them.

**Revision scope**

- Brand corrected to BOUXRE; legacy BIGDROPS identifiers retained and not migrated.
- Non-application work-mode content removed from requirements, exclusions, risks, roadmap, and acceptance criteria, with no replacement exclusion section.
- Historical preservation reframed as information, meaning, and readability rather than byte, pixel, or layout identity.
- Rich-text adapters, canonical block authority, and derived plain-text projections defined; projection ownership left unresolved (OD-17).
- Service profile `allowedStatuses` added with explicit semantics.
- Unapproved architecture recommendations labelled and tied to decisions and validation.
- Phase dependencies made consistent; status migration, material quantity, and reference-range semantics clarified.
- Minimum readable text size and performance measurement conditions defined; decision OD-19 added.
- Requirement IDs, acceptance criteria, risks, open decisions, phases, and cross-references reconciled after the changes above.

**Forbidden actions not performed**

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- Any test execution
- Any database migration or schema change
- Any runtime validation

The final `git status` confirmation is reported in the task response.
