# CSR 2.0 Architecture Audit

**Report type:** Architecture audit (investigation only). No code, schema, migration, template, or asset changes.
**Date:** 2026-11-01
**Repository:** `bigdrops-app` (BOURXE)
**Branch / HEAD at audit:** `main` / `a1b4b4d9`
**Scope:** CSR module only — form, persistence, search, offline, integrations, and PDF/document rendering.
**Out of scope:** Implementation of CSR 2.0. Commercial invoice/quotation/PO rich-text behaviour. The in-flight PDF renderer/template experiment.

**Skills used:** `pdf-rendering-correctness`, `typescript-advanced-types`, `supabase-postgres-best-practices`, `react-pdf`, `accessibility`, `database-schema-designer` (from `docs/PROJECTSKILLINDEX.md`).
**Documentation standard:** ASD-STE100 Simplified Technical English.

**Path note:** The task requests `docs/Reports/`. This repository uses `docs/reports/` (lowercase) on a case-insensitive Windows volume. This report is at `docs/reports/CSR-2.0-Architecture-Audit.md`, which is the same directory. No second report was created.

---

## Evidence classification

Every material statement below carries one of four tags:

| Tag | Meaning |
| --- | --- |
| **[Verified]** | Directly observed in the current working tree at HEAD plus the listed path and symbol. |
| **[Interpretation]** | A conclusion drawn from verified facts. It is not written in code or schema. |
| **[Recommendation]** | A proposed direction. It is not implemented and not approved. |
| **[Unresolved]** | A product, policy, or platform question that this audit cannot settle. |

---

## 1. Executive summary

CSR is a **single flat database row** with **41 columns** and no nested content model. All narrative, measurement, and material data is stored in `text` columns. Materials alone use an encoded text envelope (`__CSR_META_V1__` + JSON). **[Verified]**

The codebase already contains a complete **rich-text rendering stack** for commercial documents (block parser, HTML sanitizer, TipTap editor, PDF rich-text renderer). CSR does **not** use it for authoring or rendering. The CSR importer *accepts* rich-text block arrays from JSON, then **flattens them to plain text** before saving. **[Verified]**

Measurements are **six fixed readings** (`voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours`) with **hardcoded units and labels** inside the prepared PDF contract. CSR has no configurable measurement groups, no reference ranges, no precision rules, and no calculated values. **[Verified]**

Materials are the most structured CSR data: item, quantity, and unit rows, plus display metadata, inside the text envelope. The PDF prepared contract already supports a `partNo`, but the form cannot capture it. Search reads the envelope through a SQL function. **[Verified]**

There is **no service-profile or starting-template concept**. "Template" in CSR means a *PDF visual template* only (three legacy `@react-pdf` templates and two PDFCN templates). **[Verified]**

The PDF pipeline has two engines and one shared "prepared document" contract. The contract is **strict and fixed**: six readings, four narratives, flat material rows, exactly two sign-off blocks, and a hardcoded location label. Long rich content and variable measurement groups cannot pass through it unchanged. **[Verified]**

The largest compatibility hazards are:

1. HTML or block JSON in narrative columns will **break current search** (`ILIKE` on raw text in `_search_csr_materials` and `csr_header`) unless a plain-text projection is added. **[Interpretation]**
2. Offline `csrs_local` is a **flat mirror** of the cloud table with explicit column lists. Any new structured field needs a matching local schema change and sync payload change. **[Verified]**
3. `recipient_signature_uri` is collected by the form but **silently dropped** by the persistence whitelist. **[Verified]**
4. `csrs.client_id` and `csrs.linked_invoice_id` default to `gen_random_uuid()`, not `NULL`. An omitted value creates a random orphan reference. **[Verified]**
5. `csrs` has **no `updated_at`** column, although the duplicate path destructures one. Change tracking for 2.0 content cannot rely on it. **[Verified]**

**Recommended direction [Recommendation]:** keep existing text columns and behaviour as the compatibility floor; add an **additive structured content layer** (JSONB sidecar or a versioned envelope) with **derived plain-text shadow columns**; extend the prepared contract; make the six readings the *default* measurement group; add tenant-scoped service profiles as copy-on-use snapshots; and keep every renderer read-only.

No application code was modified. See Section 15 for the before/after git verification.

---

## 2. Current architecture map

### 2.1 Runtime layers

```
Route (src/pages/NewCSR.tsx, EditCSR.tsx)
  └─ CsrFormPage.tsx                ← create/edit orchestration, save, offline, blank CSR, PDF download
       └─ CsrFormScreen.tsx         ← 10 form sections, mobile/desktop presentation, import sheet, signatories
            ├─ csrImport.ts / CsrImportSheet.tsx   ← JSON import (shared commercial block contract, flattened)
            ├─ csrUtils.ts                        ← meta envelope, material rows, preview model
            └─ CsrTemplateCarousel / CSRPreviewPanel ← template choice + live preview

ViewCSR.tsx                          ← detail view, template selection, download, actions
CSR.tsx                              ← list via DocumentQueryProvider(module="csr")
view-csr-actions.ts                  ← archive / delete / status / duplicate

Domain
  ├─ src/domain/csr/csrService.ts     ← CRUD, column whitelist, cache invalidation, audit
  ├─ src/domain/csr/csrNumbering.ts   ← number families/cursors
  └─ src/domain/csr/csrRenderModel.ts ← display resolution + layout density

PDF
  ├─ legacy: src/components/csr/preview-templates/*  (@react-pdf/renderer)
  └─ PDFCN:  src/components/pdf/pdfcn/csr/*          (@formepdf)
       └─ src/domain/pdf/resolver/csr/prepareCsrDocument.ts → csrPreparedContract.ts

Persistence
  ├─ Supabase/Postgres, one schema per tenant (`tenantClient`)
  ├─ src/lib/native/csrOffline.ts  (SQLite `csrs_local`)
  └─ src/lib/native/csrSync.ts     (sync_queue `csr.create` → `csrs`)

Cross-cutting
  ├─ src/config/moduleAdapters.ts (csrAdapter)
  ├─ supabase/migrations/20261014160000_document_search_phase3.sql
  ├─ src/hooks/useDashboardData.ts
  ├─ src/domain/projectDetailUtils.ts, clientWorkspace.ts, audit/*
  └─ src/domain/notifications/notificationRoutes.ts
```

### 2.2 Write path (online)

1. `CsrFormPage.tsx` builds the payload. It serializes materials with `serializeCsrMaterials(materialsRows, csrMeta)`. **[Verified]**
2. `csrService.ts` filters keys through `CSR_TABLE_COLUMNS`. Keys not in the set are dropped. **[Verified]**
3. `createCsr` / `updateCsr` write to `csrs` through `tenantClient`. Cache invalidation and audit calls follow. **[Verified]**
4. `advanceAutoCursor` runs after a successful create. **[Verified]**

### 2.3 Write path (offline)

1. `createOfflineCsrDraft` writes a flat row to SQLite `csrs_local`. It creates the CSR number from a per-device counter (`csr_counter_<CODE>`). **[Verified]**
2. `enqueueSyncQueueItem('csr.create', …)` stores `{entity, action, localId, csrNumber}`. **[Verified]**
3. `processCsrCreateQueueRow` reads `csrs_local`, inserts flat columns into `csrs` with the shared `supabase` client, and marks the row synced or failed. **[Verified]**

### 2.4 Read path (list)

`CSR.tsx` mounts `DocumentQueryProvider module="csr"`. `csrAdapter` selects **10 columns**: `id, csr_number, client_name, equipment_type, make, date, created_at, status, linked_invoice_id, project_id`. **[Verified]** Search is `.or(csr_number, client_name, equipment_type)` plus status/client/date filters. **[Verified]**

### 2.5 Read path (detail and PDF)

`ViewCSR.tsx` loads the full CSR and signatory rows, calls `buildCsrPreviewData`, applies template choice from `localStorage['csr_view_template']`, and calls either the legacy or PDFCN generator. **[Verified]**

### 2.6 Key architectural fact

Business logic and rendering are already separated: `prepareCsrDocument` is pure and non-mutating, and templates only read `CanonicalPreparedCsr`. **[Verified]** This is the correct seam for CSR 2.0. The gap is that the contract is too narrow, not that the layering is wrong. **[Interpretation]**

---

## 3. Existing CSR field and data inventory

### 3.1 Database table `csrs`

Source: `supabase/migrations/20260520090004_csrs.sql` (lines 11–50), plus `20260620000001_add_csr_engine_no.sql`. The tenant template mirror is `20260915194332_tenant_template_seed.sql` (`tenant_master_template.csrs`). **[Verified]**

| Group | Columns | Type | Notes |
| --- | --- | --- | --- |
| Identity | `id` | uuid | PK, `gen_random_uuid()` |
| | `csr_number` | text | UNIQUE partial index `idx_csrs_csr_number_unique` |
| | `date` | date | Nullable |
| Client | `client_id` | uuid | FK to `clients`; **default `gen_random_uuid()`** |
| | `client_name` | text | Denormalized display name |
| | `address` | text | Site address (also used in prepared `location.site`) |
| | `po_number` | text | Indexed (`csrs_po_number_idx`) |
| | `show_po` | boolean | Default false |
| Classification | `call_type` | text | Free text; UI offers 7 options |
| | `service_basis` | text | Free text; UI offers 3 options |
| | `status` | text | Free text; indexed |
| Equipment | `equipment_type` | text | |
| | `equipment_location` | text | |
| | `make` | text | |
| | `model` | text | |
| | `serial_no` | text | |
| | `engine_no` | text | Added later |
| | `capacity` | text | Numeric value stored as text |
| Narratives | `problem_reported` | text | Plain text today |
| | `service_rendered` | text | Plain text today |
| | `defects_found` | text | Plain text today |
| | `engineer_remarks` | text | Plain text today |
| | `customer_feedback` | text | Plain text today |
| Readings | `voltage` | text | Unit implied by PDF |
| | `frequency` | text | Unit implied by PDF |
| | `battery` | text | Unit implied by PDF |
| | `temperature` | text | Unit implied by PDF |
| | `pressure` | text | Unit implied by PDF |
| | `hours` | text | Unit implied by PDF |
| Materials | `materials_used` | text | Encoded envelope: `__CSR_META_V1__` + JSON |
| Service window | `start_date`, `end_date` | date | |
| | `start_time`, `end_time` | text | Not `time` type |
| | `system_down` | boolean | Default false |
| Sign-off | `technician_signatory_id` | uuid | FK to `signatories` |
| | `acknowledgement_name` | text | Client representative name/title |
| Linkage | `linked_invoice_id` | uuid | **Default `gen_random_uuid()`** |
| | `project_id` | uuid | FK to `projects` |
| Lifecycle | `created_at` | timestamptz | **No `updated_at`** |
| | `archived_at` | timestamptz | Soft archive |

**Indexes [Verified]:** `idx_csrs_archived_active`, `idx_csrs_created_at`, `idx_csrs_client_id`, `idx_csrs_archived_at`, `idx_csrs_project_id`, `csrs_po_number_idx`, `idx_csrs_status`, `idx_csrs_technician_signatory_id`, unique `idx_csrs_csr_number_unique`, plus `idx_csrs_csr_number_trgm` from the search migration.

**RLS [Verified]:** enabled at line 117. Policies allow authenticated SELECT, DELETE, and UPDATE broadly (`csrs_authenticated_*`). The audit does not evaluate production policy correctness.

**Data-integrity observations [Verified]:**
- `client_id uuid DEFAULT gen_random_uuid()` and `linked_invoice_id uuid DEFAULT gen_random_uuid()` are permissive defaults. A payload that omits them creates a random identifier instead of `NULL`.
- `date` is nullable, but both PDF paths validate it. (`validateCsrDocument` rejects an empty date.)
- No version, content-hash, or revision column exists.

### 3.2 Materials envelope (`materials_used`)

Source: `src/components/csr/csrUtils.ts`. **[Verified]**

```
__CSR_META_V1__{"materialsRows":[{"item","quantity","unit"}],"materialsText":"1. item (qty unit)…","meta":{…}}
```

- `MaterialRow` has exactly three fields: `item`, `quantity`, `unit`. (lines 10–14)
- `CsrMeta` has eight fields: `showOperationalReadings`, `modelLabel`, `serialLabel`, `showAcknowledgement`, `recipientTitle`, `recipientRole`, `technicianName`, `showTechnicianSignLine`. (lines 22–31)
- `parseCsrMaterials` returns a fallback **plain-text** envelope when the prefix is absent. Legacy rows remain readable. (line 174)
- `serializeCsrMaterials` rebuilds the envelope on every save. (line 212)

**Consequence [Interpretation]:** structured CSR data already lives outside the relational model. A CSR 2.0 redesign does not have to start from zero, but the envelope has no schema version beyond `V1` and no migration hook for envelope changes.

### 3.3 Form field inventory

Source: `src/components/csr/CsrFormScreen.tsx`. **[Verified]**

| Section (approx. lines) | Fields |
| --- | --- |
| Client account (300–424) | Client picker, CSR number, report date, customer contact, P.O. number |
| Classification (425–476) | Call type, service basis, system down |
| Equipment (477–545) | Type, location, make, capacity, model (label configurable), serial (label configurable), engine no |
| Narratives (546–589) | Problem reported, service rendered, defects found, engineer remarks — all `<TextArea>` |
| Service window (590–645) | Start date/time, end date/time |
| Status (646–691) | Status after service |
| Readings (692–775) | Six inputs with hardcoded labels and placeholders (lines 671–676) |
| Materials (776–841) | Editable `materialsTitle`, rows of item/quantity/unit (header at line 711) |
| Sign-off (842–935) | Technician signatory, technician name, signature display; recipient name & title; feedback; recipient signature upload (lines 870–929) |
| Options sheet (977+) | Document mode and display toggles |

**Observed gaps [Verified]:**
- Narratives are plain textareas. No editor, no formatting, no lists.
- Readings are fixed. Labels and units are not editable.
- Materials cannot record part number, description, remarks, serial, or batch. Quantity is a string.
- `materialsTitle` is React state only (line 213). It is not part of the payload, so it is lost on reload unless it maps into `CsrMeta` (it does not).
- Recipient signature `onUpdate('recipient_signature_uri', …)` (line 911) is not in `CSR_TABLE_COLUMNS`, so it is dropped at save. It exists in the form and in the prepared contract only.

### 3.4 Persistence whitelist

Source: `src/domain/csr/csrService.ts` lines 67–95. **[Verified]**
`CSR_TABLE_COLUMNS` is an allowlist. Unknown keys are dropped. The comment at line 82 explicitly names `recipient_signature_uri` as an orphan form field.

### 3.5 Numbering

Source: `src/domain/csr/csrNumbering.ts` and `src/pages/view-csr-actions.ts`. **[Verified]**
- Numbers follow prefix families with letter suffixes (`incrementTrailingLetters`, `csrFamilyFor`).
- `getNextCsrNumber(lastValue, prefix, cursor, occupied)` prevents duplicates.
- Duplicate uses `withUniqueRetry` and `advanceAutoCursor`.
- Offline numbers use `SASCSR-<DEVICE><NNN>` with a device counter in app meta.

**Consequence [Interpretation]:** numbering is independent of content shape. CSR 2.0 does not need to change it, and must not.

---

## 4. Rich-text readiness assessment

### 4.1 What exists [Verified]

| Capability | Location | Used by CSR? |
| --- | --- | --- |
| Block contract (`paragraph`, `heading`, `ordered_list`, `unordered_list`) | `src/lib/commercialRichText.ts` (untracked, part of commercial work) | Import only, then flattened |
| Strict block parser and HTML projection | `commercialRichTextToHtml`, `commercialRichTextToPlainText`, `normalizeImportedRichTextField` | Import |
| HTML tokenizer / normalizer | `src/components/pdf/core/richText.ts`: `parseRichText` (127), `normalizeRichTextHtml` (322), `richTextToPlainText` (349), `normalizeRichTextSection` (368) | Commercial PDFs |
| Sanitizer and web renderer | `src/lib/richText.tsx`: `sanitizeRichTextHtml` (DOMPurify), `renderRichTextContent` | Commercial UI |
| Editor | `src/components/RichTextEditor.tsx`: TipTap StarterKit + Underline; Bold, Italic, Underline, Bullet, Ordered, Clear | No CSR usage |
| PDF rich text | `src/components/pdf/core/pdfRichText.ts`: `renderPdfRichText` (react-pdf; paragraph/heading/list, glyph-aware, plain-text fallback) | No CSR usage |

### 4.2 CSR import behaviour [Verified]

- `CSR_IMPORT_PROMPT` (`csrImport.ts` line 3) tells the extractor to emit block arrays for `problem_reported`, `service_rendered`, `defects_found`, and `engineer_remarks` (lines 29–30).
- `csrJsonSchema` accepts `z.union([z.string(), z.array(z.unknown())])` for those fields (lines 43, 57–59).
- `CsrImportSheet.tsx` calls `normalizeImportedRichTextField(..., 'plain-text')` (line 64).
- Result: list structure from the importer is **lost** before persistence.

**Interpretation:** the import contract and the editor contract already agree on block JSON. Only the storage and render layers block rich text. The shortest path to CSR rich text is to keep the blocks, not to invent a new format.

### 4.3 Rendering behaviour [Verified]

- Legacy templates (`Zinc.tsx:266–274`, `Minimal.tsx:521–537`, `IndustryCsr.tsx:373–405`, `components.tsx:398–414`) render `csr.problem_reported` and peers as plain `<Text>`.
- PDFCN portrait template (`CsrPortraitReferenceTemplate.tsx:368–377`) passes `csr.narratives.problemReported` etc. into plain text nodes.
- No CSR template calls `renderPdfRichText` or `renderRichTextContent`.
- Therefore HTML or blocks in the database would print as literal markup or raw JSON. **[Interpretation, high confidence]**

### 4.4 Search behaviour [Verified]

`supabase/migrations/20261014160000_document_search_phase3.sql`:
- `csr_header` CTE compares `problem_reported`, `service_rendered`, `materials_text`, `defects_found`, `equipment_*`, `engineer_remarks`, `address`, `customer_feedback` with `ILIKE` (lines 649–651, 666–668, 685–687, 715–717).
- `_search_csr_materials(text)` (line 188) strips the `__CSR_META_V1__` envelope and returns readable material text.
- Malformed envelopes return `NULL` (per the function body).

**Consequence [Interpretation]:** storing `<p>Isolated…</p>` would still match a single-word search but would return markup in the matched text and would fail multi-word phrase intuition. Storing block JSON would not match prose at all. A derived plain-text column (or a SQL projection function) is mandatory before HTML/JSON narratives go live.

### 4.5 Readiness verdict

**Rich text is 70% built but 0% wired to CSR. [Interpretation]**
- Ready: editor, sanitizer, HTML normalization, PDF renderer, block import contract.
- Missing: CSR storage shape, plain-text projection, renderer adoption, template participation, tests.

---

## 5. Measurement architecture assessment

### 5.1 Current model [Verified]

- Storage: six independent `text` columns (`voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours`).
- Form: six fixed inputs with placeholders `415 V`, `50 Hz`, `24 VDC`, `85 °C`, `4.5 Bar`, `Running Hrs` (`CsrFormScreen.tsx:671–676`).
- Prepared contract: `CsrOperationalReadings` with exactly those six keys (`csrPreparedContract.ts:7–15`).
- Units are applied at render time. `READING_FIELDS` in `csrPdfcnUtils.tsx:130` supplies labels such as `GEN. VOLTAGE V`, `FREQUENCY Hz`, `BATTERY/ALT. Vdc`, `TEMPERATURE °C`, `PRESSURE`, `ENGINE HOURS`.
- `prepareCsrDocument.ts:114–143` builds each reading with `value` and optional unit. It does not parse numbers.
- `CsrReadingItem` has `label`, `value`, and optional `unit` — but no precision, range, or group.

### 5.2 Gaps [Verified unless marked]

| Gap | Evidence | Effect |
| --- | --- | --- |
| No configurable groups | Fixed six keys in contract | Cannot add oil pressure, coolant temp, insulation resistance, etc. |
| No units in data | Units live in renderer constants | Same value renders with one unit only; tenant/device variants impossible |
| No numeric typing | All `text` | No validation, no trend, no range check |
| No reference range | No field anywhere | Cannot print "normal band" or flag out-of-range |
| No precision/decimal policy | Free text | Inconsistent display |
| No repeated readings | Single value per metric | Cannot record before/after or multiple generators |
| No measurement catalogue | No table or constant registry | Profiles cannot inherit a measurement set |
| No conditional visibility | Six always shown unless `showOperationalReadings` is false | Cannot hide inapplicable readings per call type |

### 5.3 Compatibility constraint [Verified]

`validateCsrDocument` and both PDFCN templates expect the six-key shape. Any new measurement model must map back to these six keys, or the contract and both templates must change together. **[Interpretation]**

### 5.4 Unresolved product questions

- **[Unresolved]** Are measurements always per equipment unit, or can one CSR cover several units?
- **[Unresolved]** Which metrics are mandatory per service basis (AMC vs paid vs warranty)?
- **[Unresolved]** Do historical CSRs need a unit snapshot even if the tenant later changes the default?
- **[Unresolved]** Is out-of-range flagging in scope, or is the reference range informational only?

---

## 6. Materials and work-record assessment

### 6.1 Current model [Verified]

- Form rows: `item`, `quantity`, `unit` only.
- Envelope: rows plus `materialsText` plus display meta.
- Prepared contract: `CsrMaterialItem` with `no`, `description`, `qty`, `unit`, optional `partNo` (`csrPreparedContract.ts:16–22`).
- `prepareCsrDocument` synthesizes `no` and maps `item → description`.
- PDF layouts adapt column count: `getAdaptiveMaterialColumns` (`csrPdfcnUtils.tsx:62`); portrait grouping `groupMaterialsVertically` (`prepareCsrDocument.ts:41`).
- Search decodes the envelope in SQL (`_search_csr_materials`) and matches item names only.

### 6.2 Gaps

| Gap | Evidence | Effect |
| --- | --- | --- |
| No part number input | Contract supports it; form does not | Cannot print manufacturer references |
| No stock/item linkage | Materials are free text; no FK to item library | No inventory, no cost, no reuse |
| Quantity is string | `MaterialRow.quantity: string` | Cannot total, validate, or unit-convert |
| No remarks per line | Not in row type | Cannot record serial/batch/replacement notes |
| No categories | Flat rows | Consumables, spares, and tools mix |
| No billable flag | No field | Cannot separate chargeable vs included under AMC |
| Title not persisted | `materialsTitle` local state | Custom title lost on reload |
| No labour/work lines | Only materials | Work is prose in `service_rendered` |
| No template/material kit | No profile concept | Repeats data entry for common jobs |

### 6.3 Compatibility constraint [Verified]

The envelope has a `V1` prefix and a lenient parser: unknown row keys survive round-trip because `parseCsrMaterials` spreads `...DEFAULT_MATERIAL_ROW, ...row`. **[Verified at line 189]** Adding optional row fields is backward compatible at the parser level. Rendering, search, and offline mirror still need explicit updates. **[Interpretation]**

---

## 7. Service-profile assessment

### 7.1 Finding

**No service-report starting profile exists. [Verified]**

Searches for profile-like concepts returned only PDF template identifiers:
- `CSR_TEMPLATE_OPTIONS`, `CSR_TEMPLATE_VARIANTS` (`src/components/csr/CSRPreviewContent.js`, `CsrTemplateCarousel.tsx`, `CSRPreviewPanel.tsx`) are visual templates.
- `CSR_TEMPLATE_KEY = 'csr_view_template'` (`ViewCSR.tsx:47`) stores a visual template choice in localStorage.
- No table, type, or constant for default narratives, default measurements, default materials, default call-type checklists, or job-type presets.

### 7.2 What a profile would have to contain [Recommendation]

- Identity: name, description, visibility, tenant scope, active flag.
- Applicability: call type, service basis, equipment type/make (optional).
- Narrative skeletons: starting blocks for problem/service/defects/remarks (never auto-filled as facts without review).
- Measurement template: ordered groups/items with label, unit, precision, optional reference range.
- Materials template: suggested lines with optional quantities.
- Default display meta: which sections show, labels, sign-off roles.
- Version: immutable version number so a CSR snapshot remains reproducible.

### 7.3 Critical design constraint [Recommendation]

Profiles must be **copy-on-use snapshots**, not references. A CSR must keep the exact narrative skeleton, measurement labels, and material suggestions that were used at creation. Otherwise editing a profile would silently rewrite historical printed documents. This matches the project rule that PDFs read data and never mutate it.

### 7.4 Unresolved

- **[Unresolved]** Are profiles tenant-wide or per-user? Are they shared across branches?
- **[Unresolved]** Who can author and publish a profile (admin only, engineers, both)?
- **[Unresolved]** Do profiles pre-fill narrative text (risk of false statements) or only section structure/placeholders?

---

## 8. PDF and document assessment

### 8.1 Two engines [Verified]

| Engine | CSR templates | Entry point |
| --- | --- | --- |
| Legacy `@react-pdf/renderer` | Template 3 (Zinc), Template 6 (Minimal), Template 8 (IndustryCsr) | `src/components/csr/preview-templates/index.tsx`: `getCsrPdfDocument` |
| PDFCN (`@formepdf`) | `csr-blueprint-landscape`, `csr-reference-portrait` (plus `.html` aliases) | `src/components/pdf/pdfcn/csr/index.ts`; `generateCsrPdfcnPdf` in `src/components/pdf/index.ts` |

The untracked `src/components/pdf/forme/IndustryFormeDocument.tsx` is **commercial** (`CommercialDocumentData`). It is not a CSR renderer. **[Verified]**

### 8.2 Prepared contract [Verified]

`CanonicalPreparedCsr` (`csrPreparedContract.ts:87–112`) exposes:
- `serviceProvider` (tenant branding only)
- `client` (`name`, `address`, `accountRef`, `poNumber`)
- `location` (`label` fixed to `'Site / Equipment Location'`, `site`, `subLocation`)
- `equipment` (`type`, `make`, `model`, `serialNo`, `capacity`, `engineNo`)
- `serviceWindow` (start/end date+time, `operatingHours`)
- `readings` (six fixed)
- `narratives` (four prose fields + `defectsList` + `customerFeedback`)
- `materials` and `materialGroups`
- `signatories.serviceEngineer` and `signatories.clientRepresentative` only

`validateCsrDocument` (`prepareCsrDocument.ts:231–252`) requires: CSR number, date, client name, the exact location label, and both sign-off blocks.

### 8.3 Rendering facts [Verified]

- Portrait reference: fixed masthead (`BrandLogo` height-led), hazard stripe, client/equipment panels, six readings, narratives as plain text, materials schedule with adaptive columns, two sign panels, fixed footer `Page {{pageNumber}} of {{totalPages}}` (`CsrPortraitReferenceTemplate.tsx:451`).
- Landscape blueprint: consumes the same contract through `blueprintSections.tsx` and `blueprintTitleBlock.tsx`.
- `layoutDensity` in `csrRenderModel.ts:157–161` is computed (`tight` > 900 narrative chars or > 4 materials; `compact` > 520 or > 2) but is **not consumed by the PDFCN path**, which uses its own fixed layout rules. **[Verified by import inspection; interpretation on effect]**

### 8.4 Pagination and long-content risks [Interpretation, grounded in verified structure]

- The contract carries prose as unbounded strings. PDFCN uses fixed-header `Fixed` nodes and page counters, so very long narrative or material sections will push content, not flow intelligently.
- No CSR template implements rich-text pagination (no widow/orphan control, no block splitting), because no CSR narrative is rich text today.
- The legacy `renderPdfRichText` exists but is not used by CSR. Its pagination behaviour for long CSR narratives is untested.
- Materials adapt columns but do not split a long schedule across pages deliberately.
- `layoutDensity` is a heuristic only for legacy templates and does not guarantee fit.

### 8.5 PDF assessment conclusion

The pipeline is **contract-ready but content-model-limited**. The right move is to widen the contract and add pagination rules, not to add renderer-specific logic. **[Recommendation]**

---

## 9. Import and integration compatibility assessment

### 9.1 CSR JSON import [Verified]

- Prompt (`CSR_IMPORT_PROMPT`, `csrImport.ts:3`) documents the shared block contract for four narrative fields and `materials: [{item, quantity, unit}]`.
- Schema accepts blocks but the sheet flattens to plain text (`CsrImportSheet.tsx:64`).
- Malformed blocks reject the import (`parseCsrJson` + normalizer).
- Import maps readings flags and materials rows, then calls `onApplyImport`.

**Interpretation:** the import feature is forward-compatible with CSR rich text if storage stops flattening. The shared commercial normalizer is **untracked work in progress**; the task forbids modifying it. CSR 2.0 must consume it as-is or add a CSR-local adapter.

### 9.2 Search [Verified]

- `csrAdapter` list search covers only `csr_number`, `client_name`, `equipment_type` (`moduleAdapters.ts:533–584`).
- Global document search (`document_search_phase3.sql`) covers much more, including narratives and decoded materials.
- Global search is the only place that already understands the materials envelope.

**Consequence:** new structured fields are invisible to search until the SQL projection and/or header CTE is extended.

### 9.3 Dashboard and workspace integrations [Verified]

- `useDashboardData.ts` builds recent documents with `id, csr_number, client_name, status, created_at, date` and route `/csr/:id`.
- `projectDetailUtils.ts` and `clientWorkspace.ts` read CSR summary fields.
- `audit/*` records CSR actions.
- `notificationRoutes.ts` maps `'csr'` to an `/rfqs/...` path — an existing routing inconsistency, outside this audit's scope but a dependency for any CSR navigation change.

### 9.4 Offline [Verified]

- `csrOffline.ts` creates `csrs_local` with one column per `csrs` field (`problem_reported` line 139, `materials_used` line 153, readings lines 147–152).
- `csrSync.ts` inserts a flat payload to `csrs`.
- The table is created with `CREATE TABLE IF NOT EXISTS`. There is **no migration mechanism** for adding columns to an existing device database in this file.
- The envelope stays opaque text; sync never parses or transforms it.

**Consequence:** any new structured column must be added to (a) the local `CREATE TABLE`, (b) an `ALTER TABLE` path for existing installs, (c) the insert list, and (d) the sync payload. Alternatively, all new structure must remain inside `materials_used` or another existing text column. **[Interpretation]**

### 9.5 Blank CSR and field mode [Verified]

`CsrFormPage.tsx` supports the field/blank CSR flow: it inserts a `blank_csr_logs` row and renders template `'3'`. This path reads `csr_number`, `date`, and branding only. It is low-risk for 2.0 but must not be broken.

### 9.6 Provisioning [Verified]

`20260810050000_csr_aggregate_provisioning.sql` adds `blank_csr_logs` to the provisioning template and maps it to `'csr'`. New CSR tables (for example profiles) must be added to the provisioning template, or new tenants will lack them.

---

## 10. Prioritized gap matrix

Severity: **P0** blocks CSR 2.0 or breaks current behaviour; **P1** required for a complete release; **P2** quality or hygiene.

| ID | Area | Current state (evidence) | Needed capability | Severity | Compatibility risk |
| --- | --- | --- | --- | --- | --- |
| G1 | Narrative storage | Four `text` columns, plain text (`csrs.sql:17,31,32,46`; form lines 553–582) | Versioned rich content (blocks/HTML) with plain-text projection | P0 | High — search, PDF, offline |
| G2 | Narrative rendering | Legacy and PDFCN print plain `<Text>` (`Zinc.tsx:266`, `CsrPortraitReferenceTemplate.tsx:368`) | Render blocks in both engines, or unify on one | P0 | High — layout and pagination |
| G3 | Search projection | `ILIKE` on raw columns (`document_search_phase3.sql:649–717`) | Derived plain text indexed and searched | P0 | High — silent recall loss |
| G4 | Prepared contract | Fixed six readings, four narratives (`csrPreparedContract.ts:7–112`) | Extensible content and measurement model | P0 | Medium — internal callers only |
| G5 | Measurement model | Six `text` columns, units hardcoded (`csrPdfcnUtils.tsx:130`) | Groups, units, precision, ranges, repeatability | P1 | Medium — must map to six defaults |
| G6 | Equipment/job info | Flat text fields, no structured extras | Structured equipment + job metadata (service type, checklist refs) | P1 | Low–medium |
| G7 | Materials work record | item/qty/unit strings (`csrUtils.ts:10`) | Part no, remarks, categories, billable flag, item linkage | P1 | Medium — envelope and search function |
| G8 | Service profiles | None | Tenant profiles with copy-on-use snapshots | P1 | Medium — new tables + provisioning |
| G9 | PDF pagination | Fixed layouts; no rich-text pagination in CSR | Deterministic pagination, table splitting, orphan control | P0 for long content | High — visual regression |
| G10 | Import alignment | Blocks flattened (`CsrImportSheet.tsx:64`) | Preserve blocks end-to-end | P1 | Medium — shared untracked module |
| G11 | Offline parity | Flat mirror, no ALTER path (`csrOffline.ts:129`) | Schema evolution strategy | P0 | High — data loss if skipped |
| G12 | Signature persistence | `recipient_signature_uri` dropped (`csrService.ts:82`) | Persist and render both signatures | P2 | Low |
| G13 | Integrity defaults | `gen_random_uuid()` defaults (`csrs.sql:14,38`) | Explicit nullable defaults | P1 | Medium — orphan refs |
| G14 | Change tracking | No `updated_at` (`csrs.sql`) | Revision/timestamp for conflict and audit | P2 | Low |
| G15 | Form metadata | `materialsTitle` not saved (line 213) | Persist display meta | P2 | Low |
| G16 | List search | Adapter searches 3 fields (`moduleAdapters.ts:547`) | Optional search over new content | P2 | Low |

---

## 11. Proposed target architecture

**Status: recommendation only. Nothing below is implemented.**

### 11.1 Principles

1. **Preserve V1 behaviour by default.** Existing text columns remain valid inputs and outputs forever.
2. **One canonical content model, many projections.** Store structured content once. Derive plain text for search, HTML for editing, and blocks for PDF.
3. **Contract-first rendering.** Templates read only the prepared contract. No template reads Supabase rows directly.
4. **Copy-on-use for profiles.** Snapshots, never live references.
5. **Offline is a first-class schema.** Every cloud field change has a local and sync change.
6. **Tenant isolation and provisioning parity.** New tables join the provisioning template.

### 11.2 Target data model

Additive, alongside the existing row:

| Object | Purpose |
| --- | --- |
| `csrs.narratives_doc jsonb` | `{ version, problemReported: Block[], serviceRendered: Block[], defectsFound: Block[], engineerRemarks: Block[], customerFeedback?: Block[] }` |
| `csrs.measurements_doc jsonb` | `{ version, groups: [{ key, label, items: [{ key, label, value, unit, precision, refMin, refMax }] }] }` |
| `csrs.materials_doc jsonb` | `{ version, title, rows: [{ lineNo, item, partNo, qty, unit, remarks, category, billable }] }` |
| `csrs.content_version smallint` | 1 = legacy text, 2 = structured |
| `csrs.narratives_text text` | Derived plain text, refreshed on every write; search and fallback source |
| `csrs.materials_text text` | Derived readable materials, kept in step with `_search_csr_materials` semantics |
| `csr_service_profiles` | Profile definitions (tenant schema), versioned, with default narratives/measurements/materials |
| `csrs.service_profile_id` + `csrs.service_profile_snapshot jsonb` | Provenance plus immutable snapshot |
| `csrs.updated_at timestamptz` | Change tracking |

**Alternative [Recommendation]:** if a migration is not allowed yet, embed the same documents in a `__CSR_META_V2__` envelope. This avoids DDL but blocks indexed search, JSONB querying, reporting, and clean provisioning. Treat it as a bridge, not the destination.

### 11.3 Canonical content model

- **Narrative document:** the existing commercial block contract (`paragraph`, `heading`, `ordered_list`, `unordered_list`). No new node types in phase 1. Sanitize on write and on render.
- **Measurement:** a group/item tree. The six current readings become the default group with identical labels and units, so V1 CSRs render byte-compatibly.
- **Materials:** rows extend the current shape; `partNo` is already supported by the contract. Keep `item` meaningful, because search matches item names.
- **Defects:** keep `defectsList` derived from `defectsFound` blocks (list items), as today.

### 11.4 Prepared contract (target)

Extend `CanonicalPreparedCsr` with:
- `narrativeBlocks` per field (plus existing plain strings for fallback).
- `measurementGroups` (plus the legacy `readings` projection for both templates).
- `materials` enriched with `remarks`, `category`, `billable`; keep `description`, `qty`, `unit`, `partNo`.
- `profile: { id, name, version } | null`.
- `contentVersion`.

Keep `validateCsrDocument` behaviour; add validation for malformed blocks and out-of-range numeric values only when the product decides to enforce ranges.

### 11.5 Rendering

- One shared block renderer for PDFCN and legacy (or migrate CSR to one engine before adding rich text). Two renderers means two pagination bugs.
- Pagination rules: measure blocks; avoid orphan headings; split list items at item boundaries; repeat table headers; footer page counters.
- Web preview uses sanitized HTML; PDF uses blocks. Never render unsanitized HTML.

### 11.6 Search

- Add generated/derived `narratives_text` and keep `_search_csr_materials` semantics for `materials_doc`.
- Extend `csr_header` to read derived columns, not raw JSON.
- Optionally extend `csrAdapter` list search to `problem_reported` only after the projection exists.

### 11.7 Offline

- Store the JSON documents as text in `csrs_local` (`narratives_doc TEXT`, `measurements_doc TEXT`, `materials_doc TEXT`) and derived text columns.
- Add an idempotent `ALTER TABLE ... ADD COLUMN` bootstrap path for existing installs.
- Sync sends the same columns. Server-side triggers or app code recompute derived text (choose one; do not rely on both).

---

## 12. Recommended implementation phases

Each phase must leave V1 data readable and printable. No phase may edit the untracked commercial rich-text or Forme files as part of CSR work.

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0. Contracts and fixtures | Finalize block schema, measurement schema, material row v2, profile schema. Capture golden CSRs (short, long, legacy envelope, offline draft). | Approved schemas; golden PDFs recorded for regression. |
| 1. Storage + projection (no UI change) | Additive columns/envelope; dual-write from existing plain text; derived plain text; migration/backfill; search reads projection. | Legacy CSRs render identically; search recall unchanged; offline round-trip passes. |
| 2. Narrative authoring | Wire `RichTextEditor` into the four narrative fields; store blocks; render blocks in preview; import stops flattening. | Rich lists round-trip web → DB → PDF; plain-text fallback correct. |
| 3. Measurements | Measurement groups with the six defaults; form editor for groups/units; contract mapping; PDF renders groups. | Default CSRs print identically; additional groups render; validation behaves. |
| 4. Materials work record | Part number, remarks, category, billable, numeric qty; adaptive PDF columns; search update. | Envelope v2 round-trips online and offline; search still finds items. |
| 5. Service profiles | `csr_service_profiles`, authoring UI, copy-on-use snapshot, provenance display. | New CSR from profile reproduces snapshot after profile edit. |
| 6. PDF reliability | Pagination, table splitting, long-content regression suite, both engines (or one). | Long and edge-case CSRs paginate deterministically. |
| 7. Hardening | Integrity defaults, `updated_at`, signature persistence, metadata persistence, provisioning parity. | All P1/P2 gaps closed or explicitly deferred. |

**Sequencing rule [Recommendation]:** Phase 1 must ship before any UI that writes HTML or JSON, because Phase 1 is what protects search and offline.

---

## 13. Risks, dependencies, and unresolved product decisions

### 13.1 Risks

1. **Silent search regression.** Raw HTML/JSON in narrative columns degrades global search without an error. **[Interpretation]**
2. **Two PDF engines.** Rich text must be implemented twice or the CSR must consolidate engines. Divergence is likely. **[Interpretation]**
3. **Strict prepared contract.** `validateCsrDocument` rejects anything missing the fixed location label or either sign-off. New models must keep those valid. **[Verified]**
4. **Offline schema drift.** `CREATE TABLE IF NOT EXISTS` will not add columns to existing devices. Without an ALTER path, writes fail or data is lost. **[Verified structure; interpretation on impact]**
5. **Tenant provisioning drift.** New tables need entries in the provisioning migration/template, or new tenants break. **[Verified pattern in `20260810050000_csr_aggregate_provisioning.sql`]**
6. **Shared untracked rich-text module.** `src/lib/commercialRichText.ts` is part of in-flight commercial work and must not be modified. CSR must adapt around it. **[Verified by git status]**
7. **Signature loss.** Any 2.0 redesign that keeps `CSR_TABLE_COLUMNS` unchanged keeps dropping `recipient_signature_uri`. **[Verified]**
8. **Integrity defaults.** Random UUID defaults can produce orphan client/invoice links under partial payloads. **[Verified]**
9. **Stale documentation.** `docs/reports/csr/csr-data-flow-verification.md` and `csr-form-inventory.md` describe older templates and layouts. They must not be used as design input without re-verification. **[Verified by inspection]**
10. **Template state in localStorage.** Visual template choice is device-local (`csr_view_template`); profile defaults could conflict with it. **[Verified]**
11. **Import reliance on flattening.** If import keeps flattening while the editor stores blocks, the two entry paths will produce different data shapes. **[Interpretation]**
12. **No `updated_at`.** Offline/online conflict detection cannot use timestamps today. **[Verified]**

### 13.2 Dependencies

- Product approval of rich-text nodes and measurement taxonomy.
- A decision on one PDF engine versus two for CSR.
- A migration policy for offline SQLite.
- Provisioning template update process.
- A decision on whether profiles are tenant-wide.
- Agreement that the commercial import contract is the shared block format (without modifying the shared module).

### 13.3 Unresolved product decisions

| # | Question |
| --- | --- |
| U1 | Which narrative fields accept rich text? All five, or only problem/service/remarks? |
| U2 | Are headings allowed, or only paragraphs and lists? |
| U3 | Are measurements per equipment unit, per CSR, or both? |
| U4 | Which measurement metrics are mandatory per service basis? |
| U5 | Are reference ranges informational or enforced? |
| U6 | Are materials linked to the item library (stock/cost) or free text only? |
| U7 | Are profiles tenant-wide, branch-wide, or personal? |
| U8 | Do profiles pre-fill narrative content or only structure? |
| U9 | Must historical CSRs remain byte-identical after 2.0 ships? (Recommended: yes.) |
| U10 | Which PDF engine survives for CSR? |
| U11 | Is recipient signature capture in scope for 2.0? |
| U12 | Do profiles need approval/versioning workflow? |
| U13 | Should `client_id`/`linked_invoice_id` defaults be corrected to `NULL` in the same migration? |
| U14 | Do CSRs need a printable revision history? |

---

## 14. Exact files and database objects likely affected by future implementation

**This is a prediction. Nothing below was changed by this audit.**

### 14.1 Database objects and migrations

- `csrs` table — additive columns (`narratives_doc`, `measurements_doc`, `materials_doc`, `narratives_text`, `materials_text`, `content_version`, `updated_at`, `service_profile_id`, `service_profile_snapshot`), plus optional default corrections for `client_id` / `linked_invoice_id`.
- New `csr_service_profiles` table (tenant schema) with versioning and tenant-scoped RLS.
- `tenant_master_template.csrs` and the provisioning template list — mirror new columns/tables.
- `supabase/migrations/20261014160000_document_search_phase3.sql` — `csr_header` and `_search_csr_materials` must read derived text; add a `materials_doc` decoder if the envelope becomes JSONB.
- New indexes: GIN on JSONB documents if queried; trigram on `narratives_text` if searched.
- Possible trigger or RPC to recompute derived text on write (choose one owner).

### 14.2 Domain and service layer

- `src/domain/csr/csrService.ts` — `CSR_TABLE_COLUMNS`, `sanitizeCsrInsertPayload`, `createCsr`, `updateCsr`.
- `src/domain/csr/csrRenderModel.ts` — model and `computeLayoutDensity` (or retirement in the PDFCN path).
- New content model module(s) under `src/domain/csr/` for block/document types and validation.
- `src/domain/csr/csrNumbering.ts` — no change expected; must remain untouched.
- `src/domain/pdf/resolver/csr/csrPreparedContract.ts` — contract extension.
- `src/domain/pdf/resolver/csr/prepareCsrDocument.ts` — mapping, defaults for six readings, validation.
- `src/components/csr/csrUtils.ts` — envelope versioning, `MaterialRow` extension, meta persistence.
- `src/components/csr/csrImport.ts` — align schema with blocks (read-only use of the shared normalizer).
- `src/components/csr/CsrImportSheet.tsx` — stop flattening; map blocks.

### 14.3 UI

- `src/components/csr/CsrFormScreen.tsx` — narrative editors, measurement groups, material columns, meta persistence, signature persistence.
- `src/pages/CsrFormPage.tsx` — payload assembly, offline draft input, save flow.
- `src/pages/ViewCSR.tsx` — rendering model, template selection, actions.
- `src/pages/CSR.tsx` — list preview fields if narratives are summarized.
- `src/components/csr/CSRPreviewPanel.tsx`, `CSRPreviewContent.js`, `CsrTemplateCarousel.tsx` — preview participation.
- `src/components/csr/preview-templates/*` — legacy templates if they stay.
- `src/components/RichTextEditor.tsx`, `src/lib/richText.tsx` — reuse; change only if CSR needs a node type not already supported (and without breaking commercial use).
- `src/pages/view-csr-actions.ts` — duplicate must copy/snapshot the new content correctly.

### 14.4 PDF

- `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx`
- `src/components/pdf/pdfcn/csr/CsrLandscapeBlueprintTemplate.tsx`
- `src/components/pdf/pdfcn/csr/blueprintSections.tsx`, `blueprintTitleBlock.tsx`
- `src/components/pdf/pdfcn/csr/csrMaterialsSchedule.tsx`, `csrPortraitMaterials.tsx`, `csrPortraitMaterialsLayout.ts`
- `src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx` — `READING_FIELDS`, `getAdaptiveMaterialColumns`
- `src/components/pdf/pdfcn/csr/index.ts` — registry and validation
- `src/components/pdf/index.ts` — generator selection
- `src/components/pdf/core/pdfRichText.ts`, `src/components/pdf/core/richText.ts` — reuse for block rendering (shared with commercial; change cautiously)
- `src/domain/pdf/customization/csr.ts` and resolver/types — only if new design controls are added.

### 14.5 Search, dashboard, integrations

- `src/config/moduleAdapters.ts` — `csrAdapter` select columns/search.
- `src/context/DocumentQueryContext.tsx` — no change expected.
- `src/hooks/useDashboardData.ts` — summary fields only.
- `src/domain/projectDetailUtils.ts`, `src/domain/clientWorkspace.ts` — summary reads.
- `src/domain/audit/*` — audit payloads if new fields are audited.
- `src/domain/notifications/notificationRoutes.ts` — correct the CSR route only if navigation is in scope.

### 14.6 Offline

- `src/lib/native/csrOffline.ts` — `csrs_local` schema, `ALTER TABLE` path, insert statement, `CreateOfflineCsrInput`.
- `src/lib/native/csrSync.ts` — `LocalCsrRow`, insert payload.
- `src/lib/native/appStorage.ts` — only if new meta keys are added.

### 14.7 Tests and fixtures (to add later, not now)

- `src/tests/csr/*` — content round-trip, projection, measurement mapping, materials v2.
- `src/tests/pdf/*` — long narrative pagination, material splitting, legacy fidelity.
- `src/tests/critical/pdfcnMasterResolver.test.js` — contract/registry updates.
- Offline sync fixture tests.

### 14.8 Documentation

- `docs/reports/csr/*` — existing reports are stale; a CSR 2.0 PRD should supersede them, not extend them blindly.

---

## 15. Verification

### 15.1 Git status before the investigation

Captured at audit start (HEAD `a1b4b4d9`, branch `main`). Pre-existing changes included:

- Modified: `src/components/csr/CSRPreviewPanel.tsx`, `src/components/csr/CsrImportSheet.tsx`, `src/components/csr/csrImport.ts`, `src/pages/ViewCSR.tsx`, `src/domain/import/normalize.ts`, `src/domain/import/promptGenerator.ts`, `src/components/pdf/index.ts`, `src/components/pdf/core/pdfRichText.ts`, `src/components/pdf/core/richText.ts`, `src/components/pdf/core/pdfCompact.ts`, PDF customization/font files, several PDF tests, `src/main.tsx`, and PDF migration docs.
- Deleted: legacy PDF templates (`Bolt`, `Ember`, `Ledger`), legacy fonts, deleted invoice prototypes.
- Untracked: `src/lib/commercialRichText.ts`, `src/components/pdf/pdfcn/commercial.ts`, `src/components/pdf/forme/IndustryFormeDocument.tsx`, `src/tests/pdf/formeIndustryTemplate.test.ts`, `docs/reports/pdf/*`, `docs/reports/invoice-quote/*`, template assets.

These are **pre-existing** and belong to other in-flight work (commercial rich-text import and PDF migration). They are **not** part of this audit and were not touched.

### 15.2 Git status after the investigation

Captured after the report was written (HEAD unchanged at `a1b4b4d9`).

**Result:**

- The audit added **exactly one file**: `docs/reports/CSR-2.0-Architecture-Audit.md` (`??` in git status).
- The audit made **no edits** to application source, database objects, migrations, templates, assets, or dependencies.
- The working tree still contains the same pre-existing change set captured before the audit (41 modified tracked paths, plus deletions and untracked commercial/PDF work). Entry count moved from 103 to 104, and the only added path is this report.

**Concurrent-work note:** A few files that were already modified or untracked at audit start (`src/main.tsx`, `src/components/pdf/index.ts`, `src/components/pdf/forme/IndustryFormeDocument.tsx`, `src/components/pdf/pdfcn/commercial.ts`, PDF tests, PDF PRD docs) show recent modification times. They are the same paths listed in the pre-audit status and belong to other in-flight commercial/PDF work. This audit did not write to them. The pre-existing work was preserved, not reverted.

### 15.3 Actions deliberately not performed

- `bun run build` — not run.
- `bun run typecheck` — not run.
- `bun run lint` — not run.
- Tests — not run.
- Database migrations or writes — not run.
- No dependency added.

### 15.4 Residual uncertainty

- RLS policy correctness in production was not evaluated.
- The exact behaviour of Forme layout under very long rich text was not executed; pagination risks are structural inferences, not observed failures.
- Production data shape (how many rows use the flat legacy material fallback vs `V1` envelope) was not queried.
- The in-flight commercial rich-text module may change before CSR 2.0 starts; the audit describes it as observed, not as a frozen API.
