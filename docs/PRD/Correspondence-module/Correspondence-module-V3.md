# PRD — Correspondence Module V3 (Letters)

## Metadata

- **Version:** 3.0
- **Status:** APPROVED
- **Date:** 2026-07-13
- **Supersedes:** Correspondence-module-V2.md

---

## 1. Executive Summary

The Correspondence Module enables BIGDROPS users to create, manage, render, and archive professional business letters. Unlike invoices or quotations, correspondence is document-centric rather than transactional — the core value is a well-formatted, branded letter that can be delivered as PDF, email HTML, or plain text.

V3 introduces a clean separation between document content (the letter body, recipient, and subject) and business identity (company profile, logo, signature, stamp). The letter stores a sender snapshot at creation time, insulating archived documents from later profile changes. The body is represented as structured JSON blocks — never HTML, never Markdown, never an editor-specific format — ensuring all renderers read from a single canonical source.

Key architectural decisions include a simplified lifecycle (`draft` → `issued` → `archived`), reusable letterheads in scope, a LetterTextSegment infrastructure for inline formatting, and an AI JSON import adapter with strict scope boundaries. Templates, approvals, and page breaks are explicitly deferred to future phases.

---

## 2. Problem Statement

Nigerian SMEs produce significant volumes of business correspondence: cover letters for tenders, official notices to clients, memoranda to partners, and letters of introduction. Before BIGDROPS, these were created in Microsoft Word or Google Docs — no branding consistency, no numbering system, no audit trail, no integration with the business's other document workflows.

Users need a single place to compose letters that:

- Carry the company's official branding (logo, letterhead, stamp, signature).
- Use a consistent, auto-generated numbering scheme.
- Support rich formatting (headings, lists, quotes, bold, italic, links).
- Allow attachment of supporting documents (PDFs, images).
- Produce professional PDF output that matches what other BIGDROPS document families produce.
- Archive letters in a searchable, tenant-scoped list.

The module must be built once and serve all correspondence needs — not reinvented per document type.

---

## 3. Goals & Non-Goals

### User-Facing Goals

- Users can compose a letter with a structured body editor (headings, paragraphs, lists, quotes, dividers, signatures, images).
- Users can select a company letterhead (sender + logo + branding) when creating a letter.
- Users can upload attachments and include inline images.
- Users can see a preview before issuing.
- Users can issue a letter (transition from draft to issued), at which point it is locked for editing.
- Users can view a list of all letters, filterable and sortable.
- Users can duplicate an existing letter to create a new draft.
- Users can import structured letter content via AI JSON import (subject, recipient, representative, body blocks only).
- Users can download a letter as PDF.

### Technical Goals

- LetterBody JSON is the single source of truth — all renderers consume it, no editor state leaks into storage.
- All renderers (PDF, email HTML, plain text) derive from the same LetterBody pipeline.
- The sender is snapshotted at creation time — later edits to the Company Profile do not change archived letters.
- The numbering engine uses the same prefix infrastructure as all other document families (`LTR-000001` format).
- The save lifecycle follows the DocumentSaveStrategy pattern from `docs/STANDARD/document-save-orchestration.md`.
- Audit events are recorded for CREATE, UPDATE, STATUS_CHANGE, and DUPLICATE per `docs/STANDARD/audit-trail-standard.md`.

### Non-Goals

- Email transport / SMTP — not in scope. Email rendering is architecture-ready but transport is future.
- AI content generation — only structured JSON import is in scope. Freeform AI generation is future.
- DOCX / Markdown / HTML import — JSON-only. No alternative import formats.
- Page break control — future block type. Not in V2.
- Table block type — future. Not in V2.
- Approvals / workflow engine — future. The lifecycle has no `approved` state.
- `cancelled` state — removed. Documents transition `draft` → `issued` → `archived`.
- Client lookup / recipient linking — V2 uses manual entry only. The `clientId` field remains in types as a future extension point but is always null/undefined.
- Template management UI — templates are architecture-anticipated (templateId field on letter, separate DB table planned) but no UI in V2.
- Full correspondence platform (Memo, Circular, Notice) — future document families. V2 covers `letter` only.
- Configurable columns for list view — deferred per `docs/STANDARD/document-column-standard.md`.

---

## 4. User Stories

**As a business manager**, I want to create a new letter from a letterhead template that already has my company logo and address, so I don't have to re-enter sender information every time.

**As an admin assistant**, I want to compose the letter body using headings, bullet lists, and block quotes, so the letter looks professional and well-structured.

**As a procurement officer**, I want to upload a PDF RFP document as an attachment to a cover letter, so both documents are associated and archived together.

**As a managing director**, I want to sign off on a letter with my name, title, and signature image, so the PDF output looks official.

**As an accountant**, I want to issue a letter (transition from draft to issued), so it becomes read-only and I can reference it later with confidence that it hasn't been tampered with.

**As a records clerk**, I want to search the letter list by document number, subject, or recipient, so I can quickly locate a specific letter.

**As a business owner**, I want to import an AI-generated letter draft from JSON (subject, recipient, body), so I can accelerate the drafting process without starting from scratch.

**As an IT administrator**, I want the letter numbering to follow the same prefix system as invoices and waybills, so all document families share consistent numbering rules.

---

## 5. Core Design Principle

**Document Content vs Business Identity** is the fundamental separation that governs the entire Correspondence Module.

### Document Content

Owned by the letter. These fields travel with the document forever and never change after issuance:

- Subject
- Recipient (embedded snapshot — name, organisation, address, email, phone, title)
- Body (LetterBody JSON block array)
- Attachments (metadata references)
- Signature block content (name, title)

### Business Identity

Managed by the application. These fields are resolved at letter creation time (snapshotted) or at render time:

- Company profile (logo, address, website, default signature, default stamp)
- Letterhead (sender snapshot + logo + branding style)
- Stamp (none, company stamp, custom uploaded — rendered at export only)

The sender snapshot is copied into the letter at creation time via `custom_fields` JSONB. Later edits to the Company Profile never change letters that have already been created. This is the same pattern used by invoices and quotations in the BIGDROPS document family.

---

## 6. Data Model

All canonical types live in `src/domain/correspondence/types.ts` (shared contracts) and `src/domain/correspondence/letter/types.ts` (letter-specific extensions). The database table is `letters` with snake_case columns mapped by the persistence layer in `src/domain/correspondence/letter/persistence.ts`.

### 6.1 CorrespondenceDocument (Base)

| Field | Type | Description |
|-------|------|-------------|
| `identity` | `CorrespondenceIdentity` | Immutable: id, documentNumber, type |
| `recipient` | `CorrespondenceRecipient` | Embedded recipient snapshot |
| `sender` | `CorrespondenceSender` | Sender snapshot (company info) |
| `subject` | `string` | Subject / re: line |
| `referenceNumber` | `string?` | Optional cross-reference |
| `date` | `string` | ISO 8601 date |
| `status` | `CorrespondenceLifecycleState` | `draft` / `issued` / `archived` |
| `attachments` | `CorrespondenceAttachment[]` | Attachment metadata |
| `metadata` | `Record<string, unknown>` | Custom fields JSONB |
| `createdAt` / `updatedAt` | `string` | ISO 8601 timestamps |

### 6.2 LetterDocument (Extends Base)

| Field | Type | Description |
|-------|------|-------------|
| `body` | `LetterBody` | Structured JSON block array |

### 6.3 LetterBody (Canonical Storage Format)

```typescript
interface LetterBody {
  blocks: readonly LetterBodyBlock[]
}
```

This is the single source of truth. All renderers consume it. No HTML, no Markdown, no editor state is ever stored.

### 6.4 LetterBodyBlock (Discriminated Union)

#### heading
```typescript
interface LetterHeadingBlock {
  type: 'heading'
  text: string
  level: 1 | 2 | 3 | 4 | 5 | 6
}
```

#### paragraph
```typescript
interface LetterParagraphBlock {
  type: 'paragraph'
  text: string
}
```

#### list
```typescript
interface LetterListBlock {
  type: 'list'
  variant: 'bullet' | 'ordered'
  items: readonly string[]
}
```

#### quote
```typescript
interface LetterQuoteBlock {
  type: 'quote'
  text: string
  attribution?: string
}
```

#### divider
```typescript
interface LetterDividerBlock {
  type: 'divider'
}
```

#### signature
```typescript
interface LetterSignatureBlock {
  type: 'signature'
  name: string
  title?: string
  imageUrl?: string
}
```

#### image
```typescript
interface LetterImageBlock {
  type: 'image'
  url: string
  alt: string
  caption?: string
  width?: string
}
```

### 6.5 LetterTextSegment (Inline Formatting)

```typescript
interface LetterTextSegment {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}
```

Used inside list items and paragraphs that require mixed formatting. This is infrastructure — the first renderer may output plain text or basic HTML, but the schema preserves format intent for future renderers.

### 6.6 CorrespondenceIdentity

```typescript
interface CorrespondenceIdentity {
  readonly id: string          // UUID, assigned by DB
  readonly documentNumber: string  // e.g. "LTR-000001"
  readonly type: 'letter'
}
```

These fields are immutable after first save per the Edit Law in `docs/STANDARD/document-transformation-standard.md`.

### 6.7 CorrespondenceRecipient

```typescript
interface CorrespondenceRecipient {
  companyName: string
  contactName?: string
  address?: string
  email?: string
  phone?: string
  title?: string       // Added in V3
  clientId?: string    // Future extension point, always null/undefined in V2
}
```

All fields are embedded in the letter. No dependency on saved clients. The `title` field is added in V3 (recipient's job title, e.g. "Procurement Manager").

### 6.8 CorrespondenceSender (Snapshot)

```typescript
interface CorrespondenceSender {
  companyName: string
  address?: string
  cityState?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
}
```

This is snapshotted at letter creation time. Stored in the `custom_fields` JSONB column via the persistence layer.

### 6.9 CorrespondenceAttachment

```typescript
interface CorrespondenceAttachment {
  label: string
  url: string
  mimeType?: string
}
```

### 6.10 Lifecycle States

```typescript
type CorrespondenceLifecycleState = 'draft' | 'issued' | 'archived'
```

#### Transition Constraints

| From | To | Description |
|------|----|-------------|
| `draft` | `issued` | Finalise the letter. Lock all fields. |
| `issued` | `archived` | Archive. Terminal state — no further transitions. |
| `draft` | *(edit)* | Editable in draft. |
| `issued` | *(duplicate)* | Duplicate creates a new draft with copied content. |

The `approved` and `cancelled` states from V2 are removed. No approval workflow. No cancellation concept — if a letter is issued in error, duplicate it with corrections and archive the erroneous original.

### 6.11 Database Column: Sender Snapshot Storage

The `letters` table stores sender information and additional metadata in the `custom_fields` JSONB column:

| custom_fields key | Maps to sender field |
|-------------------|---------------------|
| `senderCompanyName` | `companyName` |
| `senderAddress` | `address` |
| `senderCityState` | `cityState` |
| `senderPhone` | `phone` |
| `senderEmail` | `email` |
| `senderWebsite` | `website` |
| `senderLogoUrl` | `logoUrl` |
| `referenceNumber` | `referenceNumber` |
| `date` | `date` |

Additional recipient fields (`contactName`, `email`, `phone`, `title`) are also stored in `custom_fields` to ensure the recipient snapshot is complete.

### 6.12 Letterheads Table (New)

A new `letterheads` table stores reusable sender + logo + branding presets:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant scope |
| `name` | `string` | User-defined label (e.g. "Official Letterhead") |
| `sender` | `jsonb` | Sender snapshot (CorrespondenceSender shape) |
| `logo_url` | `string?` | Logo image URL |
| `is_default` | `boolean` | Default for this tenant |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 6.13 Templates Table (Planned — Not V2)

A `letter_templates` table is anticipated but not implemented in V2:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant scope |
| `name` | `string` | Template name |
| `body` | `jsonb` | LetterBody structure (blocks) |
| `metadata` | `jsonb` | Categories, tags |

The `LetterDocument` type includes an optional `templateId` field (stored in `custom_fields`) to allow future template association without breaking existing documents.

---

## 7. Functional Requirements

### 7.1 Recipient Management

- Recipient is always entered manually. No client lookup or saved recipient selection in V2.
- Fields: name, organisation, address, email, phone, title.
- All fields are optional except `companyName` (organisation).
- The `title` field represents the recipient's job title (e.g. "Procurement Manager", "Managing Director").
- If "Import from Client" is added in a future phase, it MUST be implemented as a convenience action that copies data into the form fields. The saved document still stores its own embedded recipient snapshot — no foreign key link.

### 7.2 Sender & Company Identity

- The Company Profile is the reusable source of truth (logo, address, website, default signature, default stamp, branding).
- A Sender Snapshot is copied from the Company Profile at letter creation time and stored inline in `custom_fields`.
- Editing the Company Profile later MUST NOT change already-created letters.
- The user can override the signatory name via the signature block in the body, independent of the Company Profile.
- Logo, company name, and address are immutable after the letter is created (snapshotted).

### 7.3 Signature & Stamp

- The signature is a block type in the letter body (`signature` block: name, title, optional image URL).
- Multiple signature blocks are supported (e.g. "Prepared by" and "Approved by").
- Signature images are never imported via AI JSON import.
- The stamp is not a block type — it is rendered at export time only.
- Stamp options: none, company stamp (from Company Profile), custom uploaded stamp.
- Stamp rendering occurs only in the PDF output, never in the editor or plain text view.

### 7.4 Rich Text Body (Block Builder)

The body is composed of an ordered sequence of content blocks. Supported block types in V2:

| Block Type | Description | Fields |
|-----------|-------------|--------|
| `heading` | H1–H6 section titles | `text`, `level` |
| `paragraph` | Standard prose | `text` |
| `list` | Bullet or ordered list | `variant`, `items[]` |
| `quote` | Block quotation | `text`, `attribution?` |
| `divider` | Horizontal rule | *(none)* |
| `signature` | Signatory block | `name`, `title?`, `imageUrl?` |
| `image` | Embedded image | `url`, `alt`, `caption?`, `width?` |

**Planned — not in V2 scope:**
- `table` — structured table with rows, columns, and cell formatting (future).
- `page-break` — explicit page break control for PDF rendering (future).

#### Inline Formatting (LetterTextSegment)

Paragraphs and list items that require mixed formatting use `LetterTextSegment`:

| Format | Property | Example |
|--------|----------|---------|
| Bold | `bold: true` | **Important** |
| Italic | `italic: true` | *emphasis* |
| Underline | `underline: true` | <u>underscore</u> |
| Strikethrough | `strikethrough: true` | ~~deprecated~~ |
| Inline code | `code: true` | `const x = 1` |

The first renderer may emit plain text or basic HTML. The schema structure ensures that richer renderers (email HTML, advanced PDF) can consume the same data without data migration.

#### Storage Contract

The LetterBody JSON is the canonical source of truth. All of the following consume it and nothing else:

- Editor (serializes into it)
- PDF renderer (reads from it)
- Email HTML renderer (reads from it)
- Plain text renderer (reads from it)
- Import adapter (produces it)
- API payloads (transport it)

No HTML is ever stored. No Markdown is ever stored. No TipTap/ProseMirror node state is ever stored.

### 7.5 Images

- Images are supported in the letter body via the `image` block type.
- Image uploads MUST comply with `docs/STANDARD/document-image-upload-policy.md`.
- Images are referenced by URL (hosted or data URI).
- AI JSON import MUST NOT import logo, signature images, or any other image assets per the import scope rules.

### 7.6 Attachments

- Supported file types: PDF, images. Future types: Excel, ZIP, Word.
- Attachments are stored as metadata references (label, URL, MIME type) in the `attachments` array.
- The upload pipeline follows `docs/STANDARD/document-image-upload-policy.md` for image attachments.
- Attachments render as appendix pages in PDF, download links in email HTML, and a listing in plain text.

### 7.7 Letterhead (In Scope — V2)

- A letterhead is a reusable preset containing: sender snapshot, logo URL, and branding metadata.
- Users can create, view, select, and manage letterheads via the `LetterheadPicker` UI component.
- When creating a new letter, the user selects a letterhead, which populates the sender fields and logo.
- Letterheads are stored in the `letterheads` table (see §6.12).
- The default letterhead per tenant is flagged via `is_default`.
- Letterheads are tenant-scoped.

### 7.8 Templates (Phase 2 — Documented, Not Built)

- The data model anticipates a `letter_templates` table (see §6.13) and a `templateId` field on `LetterDocument`.
- V2 does NOT implement a template management UI.
- V2 does NOT auto-apply templates on letter creation.
- A future phase will add: save body structure as template, apply template to new letter, template library management.

### 7.9 JSON Import (AI)

#### Import Scope (MUST import only)

| Field | Notes |
|-------|-------|
| `subject` | Letter subject line |
| `recipient` | All recipient fields (name, organisation, address, email, phone, title) |
| `representative` | Signatory name and title |
| `body` | Blocks array with content and formatting |

#### NEVER Import

| Field | Reason |
|-------|--------|
| Logo | Business asset — never imported |
| Company profile | Business asset — always from Company Profile or letterhead |
| Signature image | Business asset — user selects manually |
| Stamp | Rendered at export only |
| Reference number | Generated by the system |
| Date | Always set to today on import |

#### Implementation

The import adapter lives at `src/domain/correspondence/importAdapter.ts` and MUST conform to `docs/STANDARD/json-import-standard.md`. It consists of:

1. **Zod schema** — validates the incoming JSON against the allowed import shape.
2. **AI prompt** — includes a discipline preamble that instructs the AI to NEVER include excluded fields.
3. **`applyResult()`** — merges validated data into a `CreateLetterInput`, setting date to today and reference number to undefined.

---

## 8. Lifecycle & State Management

### State Machine

```
                    ┌─────────────┐
                    │   draft     │
                    └──────┬──────┘
                           │ issue
                           ▼
                    ┌─────────────┐
                    │   issued    │
                    └──────┬──────┘
                           │ archive
                           ▼
                    ┌─────────────┐
                    │  archived   │
                    └─────────────┘
```

### Transition Rules

| Transition | Precondition | Effect | Audit Event |
|-----------|-------------|--------|-------------|
| `draft` → `issued` | All required fields valid (subject, recipient.companyName, sender.companyName, body non-empty) | Lock all fields. Generate final document number if not already assigned. Set `updatedAt`. | STATUS_CHANGE |
| `issued` → `archived` | Must be in `issued` state | Terminal state. Document becomes read-only for all users. | STATUS_CHANGE |

### Edit Rules

- **Draft**: All fields editable. Attachments can be added/removed. Body blocks can be reordered.
- **Issued**: Read-only. No edits permitted. Duplicate to create a new draft with copied content.
- **Archived**: Read-only. No transitions out.

### Ownership Boundaries

Per `docs/STANDARD/lifecycle-ownership-standard.md`:

| Operation | Applicable to Letters? |
|-----------|----------------------|
| Compute | N/A — letters have no financial calculations |
| Convert | N/A — letters have no type conversion paths |
| Revert | N/A — no approval workflow to revert from |

---

## 9. Rendering Architecture

### Three Render Targets

All renderers consume `LetterBody` blocks. None access editor state, database rows, or storage internals.

| Target | Phase | Status |
|--------|-------|--------|
| PDF | V2 | In scope. Via `DefaultPdfGenerator` + `CompositePdfDelivery`. |
| Plain Text | Initial | First renderer. Extracts block text as plain UTF-8. |
| Email HTML | Future | Architecture-ready. Not implemented in V2. |

### PDF Pipeline

Per `docs/STANDARD/pdf-migration-standard.md`:

1. `DefaultPdfGenerator` — letter-specific generator that consumes `LetterBody` and produces PDF bytes.
2. `CompositePdfDelivery` — orchestrates delivery mode (download, save, open, share, print).
3. `DefaultFeedbackBus` — emits feedback events for analytics.

#### PdfDocumentType Registration

The `PdfDocumentType` union at `src/lib/pdf/types.ts` MUST add `'letter'`:

```typescript
export type PdfDocumentType = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'boq' | 'rfq' | 'receipt' | 'letter'
```

#### Stamp Rendering

Stamp is rendered in PDF output only. The user's stamp choice (none, company stamp, custom uploaded) is resolved at export time, never embedded in the LetterBody.

### Renderer Contract

```
LetterBody (blocks[]) → BlockRenderer → Target Output (PDF / HTML / Text)

BlockRenderer:
  - heading → <h1-6> or bold+size
  - paragraph → <p> or text+newline
  - list → <ul>/<ol> or bullet/numbered
  - quote → <blockquote> or indented text
  - divider → <hr> or rule line
  - signature → name + title + image or text block
  - image → <img> or [IMAGE: alt]
```

All renderers MUST handle every block type. No renderer should crash on an unknown block type — unknown types are rendered as an empty paragraph with a warning comment in debug mode.

---

## 10. Numbering

### Prefix

Per `docs/STANDARD/prefix-engine-settings-standard.md` and `src/domain/prefixConstants.ts`:

- Default prefix key: `letter`
- Default prefix value: `LTR`
- Registered in `DEFAULT_PREFIXES`:

```typescript
export const DEFAULT_PREFIXES = {
  // ... existing prefixes
  letter: 'LTR',
} as const
```

### Format

```
{resolvedPrefix}-{6-digit serial}
```

Examples: `LTR-000001`, `LTR-000042`, `LTR-999999`.

### Collision Resilience

Number generation MUST use the `withUniqueRetry` wrapper described in `docs/STANDARD/prefix-engine-settings-standard.md` Appendix B. The current implementation in `src/domain/correspondence/letter/numbering.ts` (which computes the next serial from existing rows) MUST be wrapped with `withUniqueRetry` before final persistence to handle concurrent insert scenarios.

### Date

The letter date is always set to today's date on creation. AI JSON import does not override this — the date is always `new Date().toISOString().slice(0, 10)` on import.

---

## 11. Save Orchestration

Per `docs/STANDARD/document-save-orchestration.md` §7, letters MUST implement the `DocumentSaveStrategy` pattern.

### UseLetterSaveParams

```typescript
interface UseLetterSaveParams {
  mode: 'create' | 'update'
  input: CreateLetterInput | UpdateLetterInput
  existingDoc?: LetterDocument   // for updates
}
```

### letterStrategy

The save strategy follows this pipeline:

1. **validate** — call `validateCreateLetterInput()` or re-validate updated fields. Return validation errors before touching the database.
2. **buildPayload** — assemble the insert or update payload from domain models via `documentToInsertPayload()` or `documentToUpdatePayload()`.
3. **persist** — insert/update via Supabase. For create, wrap in `withUniqueRetry` for collision-safe number assignment.
4. **afterSave** — record audit event (CREATE or UPDATE), update local state.
5. **navigate** — redirect to the saved letter view or list.

### Immutable Identity Enforcement

The identity fields (`id`, `documentNumber`, `type`) MUST be treated as immutable after first save. The `CORRESPONDENCE_IMMUTABLE_IDENTITY_KEYS` set in `src/domain/correspondence/types.ts` enforces this. Update payloads MUST exclude identity fields.

---

## 12. Audit Trail

Per `docs/STANDARD/audit-trail-standard.md`:

### Entity Type Registration

The `record_activity_event()` SQL function's whitelist MUST include `'letter'` as a valid entity type.

### Events

| Event | Trigger | Data |
|-------|---------|------|
| `CREATE` | Letter saved for the first time | Document number, subject |
| `UPDATE` | Draft edited and saved | Changed fields summary |
| `STATUS_CHANGE` | `draft` → `issued` or `issued` → `archived` | From state, to state |
| `DUPLICATE` | Letter duplicated from existing | Source document number, new document number |

### Lifecycle Ownership Audit

Per `docs/STANDARD/lifecycle-ownership-standard.md`, the following are N/A for letters and produce no audit events:
- Compute (N/A)
- Convert (N/A)
- Revert (N/A)

---

## 13. UI Component Architecture

The V2 UI consists of the following components, organized under `src/components/letter/`:

### Page-Level Components

| Component | Role |
|-----------|------|
| `LetterFormPage` | Orchestrator — manages save lifecycle, route params, mode (create/edit/duplicate) |
| `ViewLetter` | Read-only view for issued/archived letters |
| `LetterListPage` | List view with search, filter, sort |

### Form Components

| Component | Role |
|-----------|------|
| `LetterForm` | Form state — manages all letter fields, validation state, save strategy |
| `LetterBodyEditor` | Block builder UI — add, edit, reorder, delete body blocks |
| `LetterheadPicker` | Select a letterhead from saved presets |
| `AttachmentSection` | Upload and manage attachments |
| `LetterPreview` | Preview panel — renders LetterBody as structured document |

### Component Hierarchy

```
LetterFormPage
├── LetterheadPicker (letterhead selection, create/manage)
├── LetterForm
│   ├── SubjectField
│   ├── RecipientFields (name, organisation, address, email, phone, title)
│   ├── DateField (auto-set to today, editable in draft)
│   ├── LetterBodyEditor
│   │   ├── BlockToolbar (add block type)
│   │   ├── HeadingBlockEditor
│   │   ├── ParagraphBlockEditor
│   │   ├── ListBlockEditor
│   │   ├── QuoteBlockEditor
│   │   ├── DividerBlockEditor
│   │   ├── SignatureBlockEditor
│   │   └── ImageBlockEditor
│   ├── AttachmentSection
│   └── ActionBar (save draft, issue, preview)

LetterListPage
├── SearchBar
├── FilterDropdown
├── LetterTable (sortable columns)
└── BulkActions

ViewLetter
├── LetterMetadata (number, date, status)
├── LetterPreview (read-only, full document)
└── ActionBar (duplicate, archive, download PDF)
```

---

## 14. Integration Points Summary

| Integration | Reference | Scope |
|------------|-----------|-------|
| Prefix Engine | `docs/STANDARD/prefix-engine-settings-standard.md` | Letter number generation with `withUniqueRetry` |
| Save Orchestration | `docs/STANDARD/document-save-orchestration.md` | `DocumentSaveStrategy` pattern, `letterStrategy` |
| Document Transformation | `docs/STANDARD/document-transformation-standard.md` | Edit Law (immutable identity), Duplicate Law (copy with new number). Revert Law is N/A. |
| Audit Trail | `docs/STANDARD/audit-trail-standard.md` | Entity type `letter`, events CREATE/UPDATE/STATUS_CHANGE/DUPLICATE |
| PDF Pipeline | `docs/STANDARD/pdf-migration-standard.md` | `DefaultPdfGenerator`, `CompositePdfDelivery`, `PdfDocumentType` including `'letter'` |
| JSON Import | `docs/STANDARD/json-import-standard.md` | Import adapter pattern, Zod schema, discipline prompt |
| Image Upload | `docs/STANDARD/document-image-upload-policy.md` | Body images and image attachments |
| Lifecycle Ownership | `docs/STANDARD/lifecycle-ownership-standard.md` | Compute/Convert/Revert are N/A for letters |
| Configurable Columns | `docs/STANDARD/document-column-standard.md` | Deferred — future list view columns |
| Naming Conventions | `AGENTS.md` §1 | PascalCase components, kebab-case files, snake_case DB fields |

---

## 15. Out of Scope (Explicit)

The following are explicitly excluded from V3 scope:

- **Email transport / SMTP** — email HTML rendering is architecture-ready, but transport implementation is future.
- **AI content generation** — beyond the structured JSON import adapter, no freeform AI generation.
- **DOCX / Markdown / HTML import** — JSON is the only supported import format.
- **Page breaks** — no `page-break` block type in V2. Future.
- **Table block type** — no `table` block in V2. Future.
- **Spacer block type** — not a distinct type. Use divider or padding.
- **Approvals / workflow engine** — no `approved` state. No multi-step approval routing.
- **`cancelled` state** — removed from the lifecycle. Documents are archived, not cancelled.
- **Client lookup / recipient linking** — manual entry only. The `clientId` field is a future extension point.
- **Template management UI** — template table anticipated but no UI in V2.
- **Full correspondence platform** — only `letter` type. Memo, Circular, Notice are future document families.
- **Configurable columns** — deferred per `docs/STANDARD/document-column-standard.md`.
- **`framer-motion` animations** — prohibited in production per `AGENTS.md` §2.

---

## 16. Glossary

| Term | Definition |
|------|------------|
| **Correspondence** | The document family encompassing all business correspondence types (letters, memos, circulars, notices). V2 covers `letter` only. |
| **Letter** | A single correspondence document of type `letter`. Has a subject, recipient, sender snapshot, body, and attachments. |
| **LetterBody** | The canonical structured representation of a letter's content — an ordered array of typed blocks. |
| **Letterhead** | A reusable preset containing sender identity (company logo, name, address, branding). Selected at letter creation time. |
| **Content Template** | A saved LetterBody structure + metadata that can be applied to new letters. Phase 2. |
| **Rendering Template** | A visual layout template controlling PDF presentation (fonts, colors, header/footer styles). Not to be confused with content templates. |
| **Company Profile** | The tenant's reusable source of truth for company information (logo, address, default signature, default stamp, branding). |
| **Sender Snapshot** | A copy of Company Profile data taken at letter creation time and stored inline on the letter. Guarantees archival accuracy. |
| **Lifecycle State** | The current status of a letter in its lifecycle: `draft` (editable), `issued` (finalised, read-only), `archived` (terminal). |
| **LetterTextSegment** | An inline formatting unit supporting bold, italic, underline, strikethrough, and code. Used within paragraphs and list items. |

---

## 17. References

| Document | Relevance |
|----------|-----------|
| `docs/STANDARD/prefix-engine-settings-standard.md` | Number format, prefix resolution, `withUniqueRetry` pattern |
| `docs/STANDARD/document-save-orchestration.md` | Save lifecycle, `DocumentSaveStrategy`, `UseXxxSaveParams` |
| `docs/STANDARD/document-transformation-standard.md` | 3 Laws: Edit (immutable identity), Duplicate (new number, copied content), Revert (N/A) |
| `docs/STANDARD/audit-trail-standard.md` | Entity type registration, event types, `record_activity_event()` |
| `docs/STANDARD/pdf-migration-standard.md` | PDF generation pipeline, `DefaultPdfGenerator`, `CompositePdfDelivery` |
| `docs/STANDARD/pdf-customization-extension-standard.md` | Future PDF customization extension |
| `docs/STANDARD/json-import-standard.md` | Import adapter pattern, Zod schema, `applyResult()` |
| `docs/STANDARD/document-image-upload-policy.md` | Image upload rules, supported formats |
| `docs/STANDARD/lifecycle-ownership-standard.md` | Ownership boundaries (Compute/Convert/Revert N/A) |
| `docs/STANDARD/document-column-standard.md` | Configurable columns (deferred) |
| `AGENTS.md` | Naming conventions, runtime constraints, hard architecture rules |
| `src/domain/correspondence/types.ts` | Shared correspondence contracts (base types) |
| `src/domain/correspondence/letter/types.ts` | Letter-specific types, block definitions |
| `src/domain/correspondence/letter/persistence.ts` | Row ↔ domain mapping, sender snapshot in custom_fields |
| `src/domain/correspondence/letter/numbering.ts` | Current number generation (to be wrapped with `withUniqueRetry`) |
| `src/domain/correspondence/letter/validation.ts` | Validation rules (to be updated for simplified lifecycle) |
| `src/domain/correspondence/letter/normalize.ts` | Pure normalization helpers |
| `src/domain/prefixConstants.ts` | `DEFAULT_PREFIXES` including `letter: 'LTR'` |
| `src/lib/pdf/types.ts` | `PdfDocumentType` — to add `'letter'` |

---

## 18. Appendix: Changes from V2

| Area | V2 (Superseded) | V3 (Current) |
|------|-----------------|--------------|
| **Lifecycle states** | `draft` → `approved` → `issued` → `archived` + `cancelled` | `draft` → `issued` → `archived`. Removed `approved` and `cancelled`. |
| **Transitions** | `draft` → `approved` or `cancelled`; `approved` → `issued` or `draft` or `cancelled` | `draft` → `issued`; `issued` → `archived`. Simplified to 2 transitions. |
| **Recipient** | Manual or Saved Client (`clientId` linked) | Manual only. `clientId` field exists but is always null/undefined. "Import from Client" is a future convenience action (copies data, no link). |
| **Recipient title field** | Not present | Added `title` field to `CorrespondenceRecipient`. |
| **Sender** | Mixed — referenced Company Profile | Always a snapshot copied at creation time. Never changes if profile is edited later. |
| **Letterhead** | Not explicitly scope-defined | In scope for V2. Separate `letterheads` table, CRUD UI via `LetterheadPicker`. |
| **Templates** | Mentioned without architecture | Explicitly Phase 2. Data model anticipated (`templateId` on letter, separate table planned). No UI. |
| **LetterTextSegment** | Not defined | Defined as infrastructure for inline formatting (bold, italic, underline, strikethrough, code). |
| **Block types** | Comprehensive (tables included) | Exact match to implementation: `heading`, `paragraph`, `list`, `quote`, `divider`, `signature`, `image`. Tables and page-breaks listed as planned future types. |
| **PdfDocumentType** | Not mentioned | MUST add `'letter'` to the union at `src/lib/pdf/types.ts`. |
| **Numbering** | Basic `getNextLetterNumber` | MUST wrap with `withUniqueRetry` for concurrent-safety. |
| **Save orchestration** | Direct repository calls | MUST implement `DocumentSaveStrategy` per `docs/STANDARD/document-save-orchestration.md`. |
| **Audit trail** | Not mentioned | MUST register `'letter'` entity type in `record_activity_event()` whitelist. Events: CREATE, UPDATE, STATUS_CHANGE, DUPLICATE. |
| **PDF pipeline** | Not specified | MUST use `DefaultPdfGenerator` + `CompositePdfDelivery` per `docs/STANDARD/pdf-migration-standard.md`. |
| **JSON import adapter** | Not specified | MUST create `src/domain/correspondence/importAdapter.ts` with Zod schema, discipline prompt, and `applyResult()`. |
| **Company Profile vs Sender Snapshot** | Implicit | Explicitly documented. Profile = source of truth. Snapshot = copied at creation, immutable per letter. |
| **Stamp** | Mentioned as future | In scope: rendered at PDF export only. Options: none, company stamp, custom uploaded. Not importable. |
| **Lifecycle ownership** | Not referenced | Explicitly N/A for Compute, Convert, Revert per `docs/STANDARD/lifecycle-ownership-standard.md`. |
| **Configurable columns** | Not mentioned | Explicitly deferred per `docs/STANDARD/document-column-standard.md`. |
