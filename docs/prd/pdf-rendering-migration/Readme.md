# PDF Rendering Migration — Master Product Requirements Document (PRD)

> **Status:** AUTHORITATIVE SPECIFICATION & CONSOLIDATED MIGRATION PRD  
> **Target Engine:** Forme (`@formepdf/react` and `@formepdf/core` v0.20.1)  
> **Component Architecture:** `pdfcn` Presentation & Design System  
> **Writing Standard:** ASD-STE100 Simplified Technical English  
> **Document Authority:** This directory is the sole authoritative specification for the BOUXRE PDF rendering migration. All historical reports under `docs/reports/` serve as supporting evidence.

---

## 1. Executive Summary

BOUXRE will replace `@react-pdf/renderer` with a deterministic, high-fidelity PDF rendering architecture across all eight in-scope document types:
- **Commercial:** Invoice, Quotation, Purchase Order (PO), Cost Pricing Sheet (CPS), Receipt
- **Procurement:** Request for Quotation (RFQ)
- **Logistics:** Waybill
- **Technical / Service:** Customer Service Report (CSR)  
*(Bill of Quantities / BOQ is explicitly excluded).*

The target architecture uses **Forme** as the underlying layout and PDF byte generation engine, wrapped by the **pdfcn** document design system.

### 1.1 Core Architectural Principles
1. **Critical Commercial Infrastructure Group:** Invoice, Quotation, and Purchase Order (PO) share a unified commercial PDF infrastructure (fonts, image/branding resolution, Unicode/glyph diagnostics, low-level Forme primitives, and delivery pipeline). However, each document retains its independent layout, fields, and business semantics. Existing PO templates are strictly preserved; PO is an outgoing supplier-facing document, not a client invoice.
2. **Strict Domain Boundaries:** Domain preparation owns canonical business data and calculations. The master template resolver owns deterministic resolution, registration, and envelope construction. The customization engine owns design preferences and capabilities. `pdfcn` owns design tokens and primitives. Forme owns layout and PDF generation. Composite delivery owns persistence, dispatch, and feedback.
3. **No Universal Table or Layout Abstraction:** Shared infrastructure does not force identical layouts or table abstractions onto different document families. CSR, Waybill, CPS, and commercial documents retain distinct structures.
4. **Natural Pagination First:** Natural pagination (Normal Mode) must be verified across the representative document suite before compaction (Compact Mode or Force 1 Page Mode) is implemented. Compaction must never mask broken pagination.
5. **Text & Data Immutability:** Financial calculations, tax rules, and user input text are immutable in the rendering layer. Silent Unicode sanitization is strictly prohibited; read-only glyph diagnostics report missing characters without altering source text.
6. **Progressive Rollout:** Document families migrate sequentially. Existing production templates continue running on `@react-pdf/renderer` until their Forme replacements pass all verification gates.

---

## 2. Document Index & Authority

This directory contains the consolidated, authoritative specification for the PDF rendering migration. In the event of any contradiction between historical reports and this PRD, **this PRD takes precedence**:

| File | Purpose | Primary Audience | Authority Level |
| :--- | :--- | :--- | :--- |
| [`Readme.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Readme.md) | **Navigation, Scope & Epistemological Baseline**. Defines document scope, authority, status, and epistemological standards. | All Engineers & Leads | **Authoritative Baseline** |
| [`architecture.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/architecture.md) | **Master Architecture & System Design**. Defines what the target system is, how responsibilities are divided across the 6 subsystems, and document-family boundaries. | Architects, Developers | **Authoritative Architecture** |
| [`functional-req.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/functional-req.md) | **Functional Requirements & Coverage Matrix**. Defines what the system must do across all 8 document types, shared infrastructure, and problem register. | Developers, QA Engineers | **Authoritative Requirements** |
| [`Prerequisites.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Prerequisites.md) | **Readiness & Gating Checklists**. Defines what must be established and verified before implementation stages commence. | Project Leads, Developers | **Authoritative Gates** |
| [`Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Waterfall-roadmap.md) | **Execution Roadmap & Milestone Sequence**. Governs the authoritative order of implementation, milestone dependencies, gates, and exit criteria. | Engineering Leads | **Authoritative Roadmap** |
| [`decision-log.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/decision-log.md) | **Decision Governance Register**. Authoritative record of which decisions are approved, qualified, proposed, rejected, verified, or unresolved. | Architects, Stakeholders | **Authoritative Governance** |
| [`test-plan.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/test-plan.md) | **Verification, Test Suites & Certification**. Defines how implementation will be verified across representative test suites, regression suites, and physical devices. | QA Engineers, Developers | **Authoritative Test Plan** |
| [`risk-register.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/risk-register.md) | **Risk Register & Mitigations**. Details known technical, commercial, and operational risks alongside concrete mitigations. | Project Leads, Developers | **Authoritative Risks** |
| [`invoice-quotation-po-template-spec.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/invoice-quotation-po-template-spec.md) | **Commercial Template Specifications**. Detailed structural and field comparison between Invoice, Quotation, and Purchase Order. | Template Developers | **Authoritative Spec** |

---

## 3. Epistemological Classification: Facts, Evidence, and Decisions

To ensure technical integrity and prevent unverified claims from becoming false implementation assumptions, all documentation enforces explicit epistemological categories:

### 3.1 Verified Repository Facts (Directly Confirmed in Codebase)
- `@formepdf/core` (v0.20.1) and `@formepdf/react` (v0.20.1) are installed in `package.json`.
- `@formepdf/core` requires raw TrueType (`.ttf`) or OpenType (`.otf`) SFNT streams; it rejects `.woff` and `.woff2` files (confirmed in package source `node_modules/@formepdf/core/dist/index.js` and `browserHelpers.js`).
- The repository contains only **one** production TrueType font: `public/fonts/ArchivoBlack-Regular.ttf` (90,988 bytes). All `@fontsource/*` packages in `node_modules` ship `.woff`/`.woff2` files only.
- In `src/components/pdf/forme/fonts.ts`, `FORME_SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf']`. Because shared commercial fonts in `src/lib/pdfSharedFonts.ts` are `.woff`, CPS Forme templates silently fall back to `Helvetica`.
- In `node_modules/@react-pdf/pdfkit/lib/pdfkit.js`, `encodeText` pushes `char.toString(16)` for unmapped characters. For `U+2033` (8243, `0x2033`), it outputs `'2033'`. In 1-byte WinAnsi text chunks, conforming viewers decode `0x32` (`'2'`), `0x20` (space), and `0x33` (`'3'`), rendering $2''$ as `23`. This confirmed defect occurs when fonts like `Lato` or `Orbitron` lack `U+2033` and bypass glyph checks in `safeText.ts`.
- `src/lib/native/invoiceCache.ts` caches invoice items and invoices only. It does **not** cache company logos, signatures, or documents in Waybill, CSR, CPS, RFQ, Receipt, or PO families.
- In `vite.config.js`, `base: './'` is configured. Capacitor packages `dist/` into native apps via `webDir: 'dist'`.

### 3.2 Architecturally Approved Decisions
- **Forme + pdfcn Engine:** Forme is the PDF layout and generation engine; `pdfcn` is the document design token and primitive layer.
- **8-Document Scope:** Invoice, Quotation, PO, CPS, RFQ, Waybill, Receipt, CSR are in scope. BOQ is excluded.
- **Commercial Group Alignment:** Invoice, Quotation, and PO share commercial infrastructure, but retain distinct templates and layouts. Existing PO templates are preserved.
- **Text Preservation Rule:** User input text must not be silently mutated. General-purpose Unicode sanitizers that strip emojis or rewrite primes are rejected. Read-only glyph diagnostics report missing characters.
- **Single Font Authority:** `src/components/pdf/forme/fonts.ts` remains the single font registration authority, supporting dual-runtime path resolution.

### 3.3 Proposed Implementation Approaches (Subject to Review)
- Sourcing static desktop TrueType binaries (Regular, Bold, Italic) from Rasmus Andersson's official Inter v4.0 release.
- Clamping maximum image resolution in the media loader to $2000 \times 2000\text{ px}$ to protect low-RAM mobile devices.
- Retaining `Noto Sans Regular` as a secondary multi-script currency fallback.

### 3.4 Unresolved Decisions Requiring Founder / Lead Approval
- Selection of Inter static TTF binary source (Rasmus Andersson v4.0 release vs Google Fonts static export).
- Text-only header fallback policy when remote company logos fail to load offline.
- Schedule and priority for implementing PO's dedicated canonical preparation contract (`preparePurchaseOrderDocument.ts`).

### 3.5 Migration Milestone Statuses
- **Milestone M0:** *Discovery, Problem Register & PRD Consolidation* — ✅ **100% Complete**.
- **Milestone M1A:** *PDF Architecture Contracts & Responsibility Definition* — ✅ **Complete Specification**.
- **Milestone M1B:** *Shared Font & Image Asset Infrastructure Specification* — ✅ **Complete Specification**.
- **Milestone M1C:** *PO Canonical Preparation Contract & Commercial Alignment* — ⛔ **Pending Execution**.
- **Milestones M2–M6:** *Implementation, Certification & Legacy Deprecation* — ⛔ **Pending Execution**.
- **Milestone M7:** *Evergreen Forme Migration and Legacy Retirement* — ⛔ **Pending Execution**.
- **Milestone M8:** *Landscape Rebuild from Scratch* — ⛔ **Pending Execution**.
- **Milestone M9:** *Migrate Three Additional Commercial HTML Templates to Forme* — ⛔ **Pending Execution**.
- **Milestone M10:** *Purchase Order (PO) Template Integration* — ⛔ **Pending Execution**.
- **Milestone M11:** *Cost Pricing Sheet (CPS) Template Integration* — ⛔ **Pending Execution**.

---

## 4. Non-Negotiable Operational Rules

1. **DO NOT run `bun run build`:** Permanently prohibited due to the host machine's 4GB RAM ceiling.
2. **DO NOT run unauthorized verification commands during documentation tasks:** No builds, typechecks, tests, or linters during documentation-only tasks.
3. **Never hide broken pagination with compaction:** Natural pagination (Normal Mode) must pass across the representative document suite before Compact Mode or Force 1 Page Mode are implemented.
4. **Preserve business logic and calculations:** Financial calculations, VAT rules, line-item totals, and database schemas remain strictly in the business domain layer (`src/domain/` and `src/lib/Calculations.ts`).
5. **Preserve existing uncommitted work:** Pre-existing dirty and untracked files must not be cleaned, overwritten, or staged.
