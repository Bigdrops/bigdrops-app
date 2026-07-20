# Official Letter & Correspondence Architecture Investigation

**Status:** Investigation & Architecture Design (No Immediate Feature Implementation)
**Date:** 2026-07-10
**Harness:** MiMoCode via Local Runner
**PRD Source:** `docs/prompts/prompt-letter.md`

---

## Table of Contents

1. [Objective](#1-objective)
2. [Background](#2-background)
3. [Existing Standards Review](#3-existing-standards-review)
4. [Upstream Library Investigation](#4-upstream-library-investigation)
5. [Architectural Questions](#5-architectural-questions)
6. [Standards Conformance Matrix](#6-standards-conformance-matrix)
7. [Prefix Engine](#7-prefix-engine)
8. [Audit Trail](#8-audit-trail)
9. [Transformation Analysis](#9-transformation-analysis)
10. [Rendering Architecture Recommendation](#10-rendering-architecture-recommendation)
11. [Risk Assessment](#11-risk-assessment)
12. [Deliverables Summary](#12-deliverables-summary)

---

## 1. Objective

Investigate the feasibility of introducing a new Correspondence Document Family into BIGDROPS. The investigation determines how Official Letters can integrate into the existing document ecosystem while maintaining strict conformity with existing platform standards and minimizing architectural duplication.

**Key finding:** Official Letter introduces a fundamentally different document category. Unlike financial documents, correspondence has no pricing engine, VAT, payment lifecycle, or financial transformation semantics. The objective is integration, not duplication.

---

## 2. Background

### 2.1 Current Document Families

BIGDROPS provides 8 document families with prefix keys:

| Family | Prefix | Domain Directory | PDF Support |
|--------|--------|-----------------|-------------|
| Invoice | `INV` | `src/domain/invoice/` | Yes (pdf-new, 7 templates) |
| Quotation | `QTN` | `src/domain/quotation/` | Yes (pdf-new, 7 templates) |
| Waybill | `WBL` | `src/domain/waybill/` | Yes (waybill pipeline, 6 templates) |
| CSR | `CSR` | `src/domain/csr/` | Yes (pdf-new) |
| BOQ | `BOQ` | `src/domain/boq/` | Yes (pdf-new) |
| RFQ | `RFQ` | `src/domain/rfq/` | Yes (pdf-new) |
| Project | `PRJ` | `src/domain/projects.ts` | No |
| Receipt | `RCP` | `src/domain/receipt/` | Yes (standalone ReceiptPdf) |

### 2.2 Existing Standards Conformed To

All financial document families conform to:
- Prefix Engine (`docs/standard/prefix-engine-settings-standard.md`)
- Save Orchestration (`docs/standard/document-save-orchestration.md`)
- Lifecycle Ownership (`docs/standard/lifecycle-ownership-standard.md`)
- Audit Trail (`docs/standard/audit-trail-standard.md`)
- PDF Customization Extension (`docs/standard/pdf-customization-extension-standard.md`)
- Document Columns (`docs/standard/document-column-standard.md`)
- Document Transformation (`docs/standard/document-transformation-standard.md`)

### 2.3 No Existing Correspondence Infrastructure

A thorough codebase search confirms:
- **Zero** matches for "letter" or "correspondence" (excluding CSS `letterSpacing`)
- **Zero** email sending functionality (no `sendEmail`, `email_template`, `email_service`)
- **No** mail merge, template rendering, or document composition system
- The `src/domain/notifications/` directory exists but contains no email infrastructure

---

## 3. Existing Standards Review

### 3.1 Prefix Engine Settings Standard

**Classification: FULLY APPLICABLE**

Official Letter MUST participate in the existing prefix engine. Justification:
- The prefix engine is designed for all auto-numbered document types (`docs/standard/prefix-engine-settings-standard.md` §1)
- The `DocumentPrefixKey` type is derived from `DEFAULT_PREFIXES` keys — adding `letter: 'LTR'` (or similar) is a one-line change
- The `resolvePrefix()` function accepts any key in the union type
- Settings UI at `DocumentPrefixesSettingsSection.tsx` iterates `DEFAULT_PREFIXES` dynamically — new keys appear automatically
- `withUniqueRetry` collision resilience applies to letter inserts identically
- 6-digit zero-padded serial format is appropriate for letters

**Required changes:**
1. Add `letter: 'LTR'` to `DEFAULT_PREFIXES` in `src/domain/prefixConstants.ts`
2. Add `DocumentPrefixKey` auto-extends (it's `keyof typeof DEFAULT_PREFIXES`)
3. Create `getNextLetterNumber(rows, prefix)` utility
4. Wrap INSERT with `withUniqueRetry` in the letter mutation file
5. Add settings UI entry in `DocumentPrefixesSettingsSection.tsx` (auto via iteration)
6. Add preview template in `PREVIEW_TEMPLATES`

### 3.2 Document Save Orchestration Standard

**Classification: FULLY APPLICABLE**

Official Letter can use the shared `useDocumentSave` hook. Justification:
- The strategy interface (`DocumentSaveStrategy<TInput>`) is document-type agnostic
- It requires: `validate`, `buildPayload`, `persist`, `afterSave`, `getNavigationTarget`
- Letters have simpler validation (no financial invariants), simpler payloads (no line items, totals, VAT), and simpler persistence (single row insert)
- The hook manages all shared concerns: saving state, save timer, error handling, navigation
- A letter strategy would be one of the simplest implementations — roughly 100-150 lines

**Required changes:**
1. Create `src/hooks/useLetterSave.ts` implementing `DocumentSaveStrategy<UseLetterSaveParams>`
2. Create `UseLetterSaveParams` interface carrying letter fields (recipient, subject, body, date, attachments)

### 3.3 Lifecycle Ownership Standard

**Classification: PARTIALLY APPLICABLE**

The standard's ownership boundaries apply, but several lifecycle stages need reinterpretation for correspondence:

| Stage | Financial Doc Owner | Letter Owner | Justification |
|-------|-------------------|--------------|---------------|
| Init | Page | Page | Same — mode routing, defaults |
| Load | Page | Page | Same — load persisted data |
| Hydrate | Domain | Domain | Same — normalize DB→form |
| Edit | Form State | Form State | Same — mutable document state |
| Compute | Domain | **Not Applicable** | No financial calculations |
| Validate | Domain | Domain | Simpler rules (recipient required, body non-empty) |
| Persist | Page + Service | Page + Service | Same — Supabase insert/update |
| Export | Action | Action | PDF + HTML email rendering |
| Convert | Domain + Service | **Not Applicable** | No quotation→invoice semantics |
| Revert | Domain + Service | **Not Applicable** | No financial correction semantics |

**Key difference:** Letters have no Compute, Convert, or Revert stages. The Domain layer for letters is simpler — focused on validation and normalization, not financial calculations.

### 3.4 Audit Trail Standard

**Classification: FULLY APPLICABLE**

The audit trail system supports adding new entity types. Justification:
- `entity_type` is a CHECK-constrained whitelist in `record_activity_event()` SQL RPC
- Adding `'letter'` to the whitelist enables audit tracking
- The `audit_logs` mechanism (field-diff tracking) applies to letter field changes
- The `activity_events` mechanism (domain events) applies to letter lifecycle events
- The pattern requires: one audit function per event in `audit.ts`, one matching SQL RPC, entity_type whitelist update

**Required changes:**
1. Add `'letter'` to the `entity_type` CHECK constraint in a migration
2. Add letter-specific audit functions: `recordLetterCreated`, `recordLetterStatusChanged`
3. Define `LETTER_TRACKED_FIELDS` array for field-diff tracking
4. Add SQL RPCs: `record_letter_created`, `record_letter_status_changed`

### 3.5 PDF Customization Extension Standard

**Classification: PARTIALLY APPLICABLE**

Letters may or may not need the PDF customization engine. Justification:
- The engine provides accent color, document font, handwriting font, handwriting color
- For letters, accent color and document font are relevant (letterhead styling)
- Handwriting font/color are less relevant (no fillable fields like waybill/CSR)
- If letters support PDF output, they can declare minimal capabilities: `{ accentColor: true, documentFont: true, handwritingFont: false, handwritingColor: false }`
- If letters only support HTML email output (no PDF), this standard is **Not Applicable**

**Recommendation:** Defer PDF customization adoption until the rendering architecture decision (§10) is finalized. If PDF output is needed, follow the 12-step migration order in §12 of the standard.

### 3.6 Document Column Standard

**Classification: NOT APPLICABLE**

Letters do not have line items with configurable columns. Justification:
- The column standard governs `useInvoiceColumns` hook, `BUILTIN_COLUMNS`, drag contracts, PDF column rendering
- Letters have a fixed field set (recipient, subject, body, date, attachments) — no dynamic columns
- The standard explicitly states it covers "Invoice, Quotation" and excludes Waybill

### 3.7 Document Transformation Standard (3 Laws)

**Classification: PARTIALLY APPLICABLE**

The 3 Laws apply differently to correspondence:

| Law | Financial Doc | Letter | Justification |
|-----|--------------|--------|---------------|
| Edit Law | Identity immutability (client, number, type, lineage) | **Partially applicable** — document number immutability applies; client immutability is less strict (letters may be re-sent to different recipients) | Letter identity is simpler |
| Duplicate Law | Full duplication with identity reset | **Fully applicable** — duplicating a letter creates a new draft with new number, no lineage | Standard behavior |
| Revert Law | Invoice-only correction | **Not applicable** — no financial correction semantics | No revert for letters |

**Key difference:** The Edit Law's identity fields for letters are narrower. Lineage is not a concept for letters (they aren't converted from quotations). The identity contract should be:

```ts
interface LetterIdentity {
  id: string
  type: 'letter'
  documentNumber: string
  recipientId?: string  // may change if letter is re-drafted
  createdAt: string
  updatedAt: string
}
```

**Recommendation:** Letters should lock `documentNumber` after save (like all documents) but should NOT lock `recipientId` — a letter can be re-drafted for a different recipient. This is a deliberate deviation from the financial Edit Law, justified by the non-financial nature of correspondence.

---

## 4. Upstream Library Investigation

### 4.1 React Email Evaluation

**Repository:** https://github.com/resend/react-email
**Version:** 6.6.9 (latest, 2026-07-09)
**Stars:** 19.4k | **Forks:** 1.1k | **License:** MIT
**Language:** TypeScript 93.2%

#### What React Email Is

React Email is a collection of **unstyled, high-quality React components** for building email templates. It renders to **HTML email** (table-based layouts) with cross-client compatibility (Gmail, Outlook, Apple Mail, Yahoo, HEY, Superhuman).

#### Component Library

| Component | Purpose |
|-----------|---------|
| `Html`, `Head`, `Body` | Document structure |
| `Container`, `Section`, `Column`, `Row` | Layout (table-based) |
| `Button`, `Link`, `Image` | Interactive/media elements |
| `Heading`, `Paragraph` | Typography |
| `Divider`, `Preview` | Visual/UX |
| `CodeBlock`, `CodeInline` | Code rendering |
| `Font` | Web font loading |
| `Markdown` | Markdown content |
| `Tailwind` | Tailwind CSS support |

#### Critical Findings for BIGDROPS

1. **React Email is an HTML email renderer, NOT a PDF renderer.** It produces `<table>`-based HTML optimized for email clients. It does NOT produce PDF output. BIGDROPS currently uses `@react-pdf/renderer` for PDF generation — these are orthogonal technologies.

2. **Can React Email become the canonical HTML renderer?**
   - **YES** — React Email can serve as the HTML rendering target for Official Letters. Letters need HTML email output for sending, and React Email provides cross-client compatible HTML.
   - **NO** — React Email CANNOT replace `@react-pdf/renderer` for PDF generation. They solve different problems.

3. **Can existing branding assets be reused?**
   - **Partially.** React Email components are unstyled — they accept `style` props. BIGDROPS branding tokens (accent colors, fonts, company info) can be mapped to React Email component styles. But the component primitives differ (`View`/`Text` from react-pdf vs `Section`/`Paragraph` from react-email).

4. **Can templates share design tokens with existing PDFs?**
   - **Yes, with a bridge function.** Similar to `bridgeToDesignPreset()` in the PDF customization engine, a `bridgeToEmailDesign()` function can map `ResolvedPdfCustomization` to React Email-compatible style objects.

5. **Constraints React Email imposes:**
   - Table-based HTML output (no modern CSS Grid/Flexbox — email client limitations)
   - No PDF output capability
   - Requires a rendering step: React components → HTML string → email client or file
   - The `render()` function from `@react-email/renderer` converts React components to HTML
   - Tailwind support is available but email-compatible only

6. **Functionality BIGDROPS must NOT duplicate:**
   - Cross-client HTML compatibility testing (React Email already covers Gmail, Outlook, Apple Mail)
   - Table-based layout generation (React Email handles this)
   - Email preview functionality (React Email provides this)

#### React Email + BIGDROPS Integration Architecture

```
Letter Domain Data (subject, body, recipient, sender)
    |
    v
adaptLetterEmailData(model)        [NEW: letterAdapter.ts]
  - Maps letter fields to React Email component props
  - Resolves branding tokens
  - Formats dates, addresses
    |
    v
LetterEmailTemplate (React Email)  [NEW: src/components/letter-email/]
  - Uses React Email components (Html, Head, Body, Container, etc.)
  - Receives shaped data, never computes
  - Multiple template variants possible
    |
    v
render() from @react-email/renderer  [produces HTML string]
    |
    v
HTML Email Output → Email Client / Download / Print
```

#### Verdict

**React Email is the recommended HTML rendering library for Official Letters.** It provides:
- Production-tested cross-client email HTML compatibility
- React component model (consistent with BIGDROPS's React architecture)
- Unstyled components that accept BIGDROPS branding tokens
- No runtime dependency on BIGDROPS (can be used independently)
- Active maintenance (19.4k stars, 2,492 commits, 597 releases)
- TypeScript-first

**Install cost:** `react-email` is a lightweight package. The `@react-email/renderer` package is needed for server-side/client-side HTML generation. Total bundle impact is minimal since letters are not rendered in hot paths.

### 4.2 pdfx Evaluation

**Repository:** https://github.com/akii09/pdfx
**Version:** 0.6.1 (CLI) | **Stars:** 1.1k | **Forks:** 46 | **License:** MIT
**Language:** TypeScript 99.2% | **Status:** Beta

#### What pdfx Is

pdfx is a **copy-paste component library for React PDF** — similar to shadcn/ui but for PDF documents. It provides pre-built, themeable PDF components built on `@react-pdf/renderer`. Components are copied into the user's project (no runtime dependency).

#### Architecture

```
packages/shared/     — Types, Zod schemas, theme presets
packages/cli/        — CLI tool (pdfx add, pdfx block add, pdfx theme)
apps/www/            — Docs site + registry server
```

Key design decisions:
- **No runtime dependency** — `pdfx add` copies component files into your project
- **Theme system** — `pdfx theme init` writes a local `pdfx-theme.ts` file
- **Components are self-contained** — each has `.types.ts`, `.styles.ts`, `.tsx`, `.test.tsx`

#### Findings for BIGDROPS

1. **pdfx is NOT a replacement for the existing PDF pipeline.** BIGDROPS has 7 invoice/quotation templates + 6 waybill templates with a mature engine layer, presentation layer, and customization system. pdfx provides generic PDF components — it cannot replicate the business-specific rendering logic (group headers, totals, advance summaries, party cards).

2. **Migration cost is HIGH.** Adopting pdfx would require:
   - Rewriting all 13 templates to use pdfx components
   - Losing the engine layer's pure behavior functions (replaced by pdfx's generic components)
   - Losing the customization engine's template defaults and bridge pattern
   - Losing the industry/ledger/obsidian template identities
   - Potential loss of compact layout overrides

3. **Benefits over current implementation:**
   - Pre-built components could accelerate new template creation
   - Theme system is more structured than BIGDROPS's current approach
   - But BIGDROPS already has a more sophisticated customization system

4. **Compatibility with renderer separation:** pdfx wraps `@react-pdf/renderer` — same underlying renderer. But the component API differs from BIGDROPS's template contract.

#### Verdict

**Recommendation: RETAIN the current PDF architecture. Do NOT adopt pdfx.**

Justification:
- BIGDROPS's existing PDF pipeline is more mature and more specialized than pdfx
- The migration cost far outweighs any benefit
- pdfx is in Beta (not production-stable)
- The existing engine/presentation/template separation is architecturally sound
- pdfx would introduce a runtime dependency pattern (copy-paste) that conflicts with BIGDROPS's owned-component approach

---

## 5. Architectural Questions

### 5.A: New Document Module vs. Correspondence Architecture?

**Recommendation: Start as a new document module, design for future Correspondence extensibility.**

Justification:
- Official Letter is the **first** correspondence document type — there's no proven need for a broader Correspondence architecture yet
- Building a generic "Correspondence" abstraction now would violate YAGNI (You Aren't Gonna Need It)
- However, the domain layer should be designed so that adding future correspondence types (memos, notices, circulars) doesn't require refactoring the Letter module

**Architecture pattern:**
```
src/domain/letter/          — Letter-specific business logic
src/domain/correspondence/  — [FUTURE] shared correspondence utilities (if needed)
```

Start with `src/domain/letter/`. Only extract `src/domain/correspondence/` when a second correspondence type proves the pattern.

### 5.B: React Email as Another Rendering Target?

**Recommendation: YES — evolve toward a multi-renderer architecture.**

The current flow is:

```
Document → PDF Renderer → PDF Blob
```

The proposed flow is:

```
Document → Renderer Router
              ├── PDF Renderer (@react-pdf/renderer)
              ├── HTML Email Renderer (React Email)
              ├── Plain Text Renderer (custom)
              └── Print Renderer (browser print dialog)
```

This does NOT violate existing ownership boundaries because:
- The **document domain** (data model, validation, persistence) is renderer-agnostic
- The **export action** (§8 of Lifecycle Ownership) already owns rendering
- Adding a new renderer is adding a new export target, not changing the document lifecycle
- The existing `adaptCommercialDocumentData()` pattern already separates data shaping from rendering

**Implementation approach:**
- Create a `DocumentRenderer` interface that abstracts the rendering pipeline
- Each renderer (PDF, HTML, Plain Text) implements this interface
- The export action routes to the appropriate renderer based on user selection
- This is an **additive** change — existing PDF rendering is unaffected

### 5.C: Evolving PDF Customization Extension Standard?

**Recommendation: Defer generalization until a second non-PDF renderer needs customization.**

Currently, the PDF Customization Extension Standard governs only PDF rendering customization (accent color, fonts). If we generalize it to a "Document Rendering Extension Standard," we'd need to consider:

**Advantages:**
- Consistent customization experience across PDF and HTML email output
- Shared branding tokens between renderers
- Single user preference surface

**Risks:**
- Premature abstraction — only one non-PDF renderer (HTML email) exists now
- Email customization needs differ (no handwriting font, no template selection carousel)
- The bridge pattern already handles cross-renderer token mapping

**Recommendation:** Keep the PDF Customization Extension Standard as-is. When HTML email templates need customization, extend the existing system by:
1. Adding `'letter'` to `PdfCustomizationDocumentFamily` (or renaming the type to `DocumentFamily`)
2. Declaring letter capabilities in a new `src/domain/pdf/customization/letter.ts`
3. Using the existing bridge pattern to map to email-compatible styles

Do NOT create a new standard. Extend the existing one incrementally.

---

## 6. Standards Conformance Matrix

| Standard | Status | Notes |
|----------|--------|-------|
| **Prefix Engine** | Fully Applicable | Add `letter: 'LTR'` to `DEFAULT_PREFIXES`. Create `getNextLetterNumber()`. Wrap insert with `withUniqueRetry`. |
| **Save Orchestration** | Fully Applicable | Create `useLetterSave()` strategy. Simplest implementation: no financial logic, no line items. |
| **Lifecycle Ownership** | Partially Applicable | Same ownership boundaries, but Compute/Convert/Revert stages are Not Applicable. Domain layer is simpler. |
| **Audit Trail** | Fully Applicable | Add `'letter'` entity type. Add `recordLetterCreated`, `recordLetterStatusChanged`. Define `LETTER_TRACKED_FIELDS`. |
| **PDF Customization** | Partially Applicable | Only if PDF output is needed. Declare minimal capabilities (accentColor, documentFont). Defer until rendering architecture is decided. |
| **Document Columns** | Not Applicable | Letters have fixed fields, no configurable line item columns. |
| **Document Transformation** | Partially Applicable | Duplicate Law fully applies. Edit Law partially applies (number locked, recipient may change). Revert Law not applicable. |
| **JSON Import** | Not Applicable | Letters are not imported from JSON in the initial scope. |
| **Document Image Upload** | Partially Applicable | If letters support attachments (letterhead images, signatures), the shared policy applies. |

---

## 7. Prefix Engine

### 7.1 Recommendation

Official Letter SHOULD participate in the existing prefix engine.

### 7.2 Proposed Configuration

| Property | Value |
|----------|-------|
| Prefix Key | `letter` |
| Default Prefix | `LTR` |
| Format | `LTR-{6-digit serial}` (e.g., `LTR-000001`) |
| Routing Token | None (unlike Waybill's `-E-`, `-I-` tokens) |
| Serial Format | 6-digit zero-padded (`padStart(6, '0')`) |

### 7.3 Implementation Requirements

Per `docs/standard/prefix-engine-settings-standard.md` Appendix B:

- [ ] Add `letter: 'LTR'` to `DEFAULT_PREFIXES` in `src/domain/prefixConstants.ts`
- [ ] `DocumentPrefixKey` auto-extends via `keyof typeof DEFAULT_PREFIXES`
- [ ] Create `getNextLetterNumber(rows, prefix)` in `src/domain/letter/normalize.ts`
- [ ] Wrap INSERT with `withUniqueRetry` in the letter mutation file
- [ ] Settings UI entry auto-appears (iteration over `DEFAULT_PREFIXES`)
- [ ] Add preview template in `PREVIEW_TEMPLATES` (e.g., `LTR-000001`, `LTR-000002`)
- [ ] No blank download logging needed (letters are digital-first, not pre-printed forms)

### 7.4 Database Schema

```sql
-- letters table
CREATE TABLE letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  letter_number TEXT UNIQUE NOT NULL,
  recipient_id UUID REFERENCES clients(id),
  recipient_name TEXT,
  recipient_address TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  letter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  custom_fields JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. Audit Trail

### 8.1 Required Events

| Event Type | Mechanism | When |
|------------|-----------|------|
| `CREATE` | `activity_events` + `audit_logs` | Letter saved for the first time |
| `UPDATE` | `audit_logs` | Letter fields changed on re-edit |
| `STATUS_CHANGE` | `activity_events` + `audit_logs` | Status transitions (draft→sent, draft→archived) |
| `DUPLICATE` | `activity_events` + `audit_logs` | Letter duplicated from existing |

### 8.2 Not Required (Initially)

| Event Type | Reason |
|------------|--------|
| `SENT` | Future — requires email sending integration |
| `DELIVERY_FAILED` | Future — requires email sending integration |
| `OPENED` | Future — requires email tracking pixels |
| `REPLIED` | Future — requires email thread tracking |

### 8.3 Implementation Requirements

1. **Migration:** Add `'letter'` to `record_activity_event()` entity_type CHECK constraint
2. **Audit functions in `src/lib/audit.ts`:**
   ```ts
   export async function recordLetterCreated(...) { ... }
   export async function recordLetterStatusChanged(...) { ... }
   ```
3. **SQL RPCs:** `record_letter_created`, `record_letter_status_changed` delegating to `record_activity_event()`
4. **Tracked fields:** `LETTER_TRACKED_FIELDS = ['subject', 'body', 'recipient_id', 'recipient_name', 'status', 'letter_date']`

---

## 9. Transformation Analysis

### 9.1 Edit Law (Identity Immutability)

**Partially applicable to Letters.**

| Identity Field | Locked After Save? | Justification |
|----------------|-------------------|---------------|
| `letter_number` | YES | Document numbering integrity — same as all documents |
| `recipient_id` | **NO** | Letters may be re-drafted for different recipients. Unlike invoices where `client_id` is a financial invariant, letter recipients are not financial identity. |
| `type` | YES | Document type is structural |
| Lineage | N/A | Letters don't have source document lineage (no conversion chain) |

**Business reasoning:** A letter is not a financial record. The recipient is the target audience, not a financial counterparty. Re-drafting a letter for a different recipient is a common workflow (e.g., "same letter, different client"). Locking the recipient would force unnecessary duplication.

**Architectural implication:** The Edit Law's identity contract for letters is narrower than for financial documents. This is a **deliberate, documented deviation** — not a violation of the standard, since the standard defines financial document identity and letters are explicitly non-financial.

### 9.2 Duplicate Law (New Origin)

**Fully applicable to Letters.**

Duplication creates a clean draft with:
- New `letter_number` (generated via prefix engine)
- Cleared `id` (new database row)
- Cleared `recipient_id` and `recipient_name` (new recipient)
- Cleared `status` (reset to 'draft')
- Preserved: `subject`, `body`, `letter_date`, `custom_fields`, `attachments`
- No lineage (letters don't have source documents)

### 9.3 Revert Law (Invoice Correction)

**Not applicable to Letters.**

Revert is an invoice-only correction operation that converts invoices back to quotations. Letters have no source document concept and no financial correction semantics. The Revert operation is architecturally meaningless for correspondence.

---

## 10. Rendering Architecture Recommendation

### 10.1 Current State

BIGDROPS has two parallel PDF rendering systems:
1. **pdf-new** (Invoice/Quotation/CSR/BOQ/RFQ) — 7 templates, engine layer, presentation layer
2. **waybill/** (Waybill) — 6 templates, separate domain engine

Neither supports HTML email output.

### 10.2 Recommended Architecture: Multi-Renderer with Shared Domain

```
┌─────────────────────────────────────────────────────────┐
│                    Letter Domain Layer                    │
│  src/domain/letter/                                      │
│  Owns: types, validation, normalization, business rules  │
│  Renderer-agnostic — no knowledge of PDF or HTML         │
├─────────────────────────────────────────────────────────┤
│                  Rendering Router                        │
│  selectRenderer(target: 'pdf' | 'html' | 'print')       │
│  Routes to the appropriate renderer                      │
├────────┬──────────────┬──────────────┬──────────────────┤
│  PDF   │  HTML Email  │  Plain Text  │  Print           │
│  Renderer │ Renderer │  Renderer    │  Renderer         │
│  (@react-pdf)│(React Email)│(custom)    │(browser print)  │
└────────┴──────────────┴──────────────┴──────────────────┘
```

### 10.3 Why This Architecture

1. **Domain separation:** The letter domain knows nothing about rendering. It provides typed data. This follows the Lifecycle Ownership Standard (§4.8 — Export owns rendering).

2. **Renderer independence:** Each renderer is a separate module. Adding a new renderer (e.g., DOCX export) doesn't affect existing renderers.

3. **Shared branding:** A `resolveBrandingTokens()` function in the domain layer provides consistent branding to all renderers. React Email templates receive the same accent color, fonts, and company info as PDF templates.

4. **No existing ownership violations:** The Export stage is already owned by "Action" in the Lifecycle Ownership Standard. Adding renderers is extending the Export action, not changing document lifecycle.

### 10.4 React Email Integration

React Email becomes the HTML email renderer:

```ts
// src/components/letter-email/LetterEmailTemplate.tsx
import { Html, Head, Body, Container, Section, Paragraph, Heading } from 'react-email';

export function LetterEmailTemplate({ data }: { data: LetterEmailData }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Section>
            {/* Company branding */}
            <Heading>{data.companyName}</Heading>
            {/* Letter content */}
            <Paragraph>{data.body}</Paragraph>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

The `render()` function from `@react-email/renderer` converts this to an HTML string for email sending or browser display.

### 10.5 PDF Output for Letters

If letters need PDF output (for printing or download), two options:

**Option A: Use the existing pdf-new engine.**
- Create a `LetterTemplate.tsx` in `src/components/pdf-new/templates/`
- Register it as a new template ID
- The letter adapter provides `CommercialDocumentData`-shaped data
- Pros: Reuses existing infrastructure
- Cons: Letters don't have line items, groups, totals — the data shape doesn't fit

**Option B: Create a minimal letter PDF renderer.**
- A standalone `@react-pdf/renderer` component for letters
- Simpler than the financial document templates
- Pros: Clean separation, appropriate complexity
- Cons: One more renderer to maintain

**Recommendation: Option B.** Letters have fundamentally different content (prose text, not tabular data). Forcing them into the financial document template system would create awkward data transformations. A minimal letter PDF renderer (~200 lines) is the cleaner approach.

---

## 11. Risk Assessment

### 11.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Prefix collision with existing `LTR` prefix | Low | Low | Verify no external system uses `LTR`. Fallback: use `OFF` (Official) or `COR` (Correspondence). |
| React Email bundle size impact | Low | Low | React Email is lightweight. Only loaded when letter rendering is needed. |
| Audit trail CHECK constraint migration | Medium | Low | Add ALL new entity types in a single migration (per AGENTS.md memory rule). |
| Edit Law deviation for recipient immutability | Medium | Medium | Document the deviation explicitly in the transformation standard. Get user approval. |
| Two PDF renderers (pdf-new + letter) create maintenance burden | Low | Low | Letter PDF is minimal (~200 lines). No shared template system needed. |

### 11.2 Architectural Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Scope creep into full correspondence platform | High | Medium | Strict non-goals in PRD §11. Only implement Official Letter. |
| Premature Correspondence abstraction | Medium | Medium | Start with `src/domain/letter/`. Only extract `correspondence/` when a second type proves the need. |
| Email sending integration complexity | Medium | Low | Defer email sending to a future phase. Initial scope: compose + PDF/HTML export only. |
| Database schema changes | Low | Low | Single new `letters` table. No modifications to existing tables. |

### 11.3 Business Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| User expectations exceed MVP scope | Medium | High | Clear PRD §11 non-goals. MVP: compose + preview + PDF/HTML export. No sending, no tracking. |
| Nigerian business context requires specific letter formats | Low | Low | Template system allows adding Nigerian business letter templates later. |

---

## 12. Deliverables Summary

### 12.1 Architecture Investigation Report

This document. Covers all 11 sections of the PRD.

### 12.2 Standards Conformance Matrix

| Standard | Status | Action Required |
|----------|--------|----------------|
| Prefix Engine | Fully Applicable | Add `letter: 'LTR'`, create `getNextLetterNumber()` |
| Save Orchestration | Fully Applicable | Create `useLetterSave()` strategy |
| Lifecycle Ownership | Partially Applicable | Adopt boundaries; Compute/Convert/Revert N/A |
| Audit Trail | Fully Applicable | Add entity type, audit functions, SQL RPCs |
| PDF Customization | Partially Applicable | Defer until rendering architecture decided |
| Document Columns | Not Applicable | None |
| Document Transformation | Partially Applicable | Edit Law deviation for recipient; Duplicate applies; Revert N/A |
| JSON Import | Not Applicable | None (initial scope) |
| Document Image Upload | Partially Applicable | Apply if attachments supported |

### 12.3 React Email Evaluation

**Verdict: RECOMMENDED** for HTML email rendering. Production-tested, MIT licensed, 19.4k stars, TypeScript-first, unstyled components accept BIGDROPS branding tokens. Cannot replace `@react-pdf/renderer` — orthogonal technology for HTML email output.

### 12.4 pdfx Evaluation

**Verdict: NOT RECOMMENDED.** Beta status, migration cost exceeds benefit, BIGDROPS's existing PDF pipeline is more mature and specialized. Retain current architecture.

### 12.5 Rendering Architecture Recommendation

Multi-renderer architecture with shared domain layer. React Email for HTML output. Minimal standalone PDF renderer for letter printing. No changes to existing pdf-new or waybill pipelines.

### 12.6 Correspondence Architecture Proposal

Start as a single document module (`src/domain/letter/`). Do NOT build a generic Correspondence abstraction yet. Design the domain layer so future correspondence types can be added without refactoring the Letter module.

### 12.7 Risk Assessment

12 risks identified across technical, architectural, and business categories. Highest risk: scope creep into full correspondence platform (mitigated by strict non-goals). Second highest: Edit Law deviation for recipient immutability (requires explicit approval).

### 12.8 Migration Strategy

**No migration needed.** Official Letter is a new module. Existing document families are unaffected. The only schema changes are:
1. Add `letter: 'LTR'` to `DEFAULT_PREFIXES` (code change, not migration)
2. Add `'letter'` to audit trail entity_type CHECK constraint (single migration)
3. Create `letters` table (new table, no modifications to existing tables)

---

## Appendix A: File Reference Map (Planned)

| New File | Role |
|----------|------|
| `src/domain/letter/normalize.ts` | `getNextLetterNumber()`, letter normalization |
| `src/domain/letter/types.ts` | Letter types, interfaces |
| `src/hooks/useLetterSave.ts` | Letter save strategy |
| `src/pages/NewLetter.tsx` | Letter creation page |
| `src/pages/EditLetter.tsx` | Letter edit page |
| `src/pages/ViewLetter.tsx` | Letter view page |
| `src/pages/Letters.tsx` | Letter list page |
| `src/components/letter-email/LetterEmailTemplate.tsx` | React Email template |
| `src/components/letter-pdf/LetterPdfTemplate.tsx` | Minimal PDF renderer |
| `src/lib/audit.ts` | Extended with letter audit functions |
| `src/domain/prefixConstants.ts` | Extended with `letter: 'LTR'` |

## Appendix B: Explicit Non-Goals (Reconfirmed)

Per PRD §11, this phase MUST NOT:
1. Implement Official Letter (investigation only)
2. Introduce new database schema (documented here, not implemented)
3. Create React components (documented here, not implemented)
4. Modify rendering code (no changes to existing pipelines)
5. Introduce new standards (extend existing ones incrementally)
6. Replace existing PDF architecture (retain current pipelines)

---

*End of report.*
