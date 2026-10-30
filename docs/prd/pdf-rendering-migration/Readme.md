# PDF Rendering Migration — Project PRD & Specifications

> **Status:** APPROVED SPECIFICATION & FROZEN DOCUMENTATION BASELINE (Ready for M1 Implementation Planning)  
> **Target Engine:** Forme (`@formepdf/react` and `@formepdf/core` v0.20.1)  
> **Component Architecture:** `pdfcn` Design System  
> **Writing Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Executive Summary

BIGDROPS will replace `@react-pdf/renderer` with a modern, deterministic PDF rendering architecture. The target architecture uses **Forme** as the underlying layout and PDF generation engine and **pdfcn** as the document presentation, token, and component layer.

This migration resolves long-standing rendering defects in BIGDROPS commercial documents:
1. **Natural Pagination & Usable Space:** Eliminates avoidable premature page breaks by decoupling rigid closing sections, calibrating table column widths, and dynamically reserving footer space.
2. **Selective Keep-Together & Oversized Row Handling:** Protects small logical units (individual signature blocks, ordinary single table rows) while allowing long sections (notes, commercial terms, attachments) to fragment naturally. For oversized table rows exceeding available page height, the system defines a safe fragmentation or controlled fallback strategy to prevent clipping or silent content loss.
3. **Adaptive Closing Layout:** Displays Bank Details and Totals side-by-side when space and content permit, with a deliberate, readable fallback (adaptive stacking or continuation) when space is restricted.
4. **Typography & Encoding Diagnostics:** Addresses observed character corruptions (such as `2″`, `3″`, `4″` rendering as `23`, `33`, `43` in `SASQUO-000428.pdf`), with font coverage and encoding paths identified as technically plausible suspected causes requiring implementation-stage empirical verification.
5. **Three Controlled Density Modes:** Formalizes three distinct pagination modes: **Normal** (natural flow), **Compact** (content-aware density reduction), and **Force 1 Page** (two-pass fitting prioritizing commercial legibility over arbitrary page counts, with strict safeguards and readable multi-page fallback).
6. **5-Step Rich-Text Pipeline:** Defines a structured pipeline (Sanitize $\to$ Parse $\to$ Allowlisted AST $\to$ Forme Render $\to$ Fallback) prioritizing essential commercial formatting.
7. **Scoped Emoji Fallback:** Preserves surrounding text and applies clean stripping or optional minimal icon replacement without requiring a massive emoji library.
8. **Evidence-Driven Font Packaging:** Evaluates static TTF asset delivery first, assessing mobile/offline export reliability, with binary font bundling retained as a verified fallback.
9. **Interactive & Visual Capabilities:** Introduces native coordinate-accurate image hyperlinks (`/Annots` `/Link`), logo aspect-ratio preservation (`objectFit: 'contain'`), and robust A4 Landscape orientation.

The documentation baseline is formally frozen. The implementation follows a strict progressive rollout. New Forme Invoice and Quotation templates must be built, verified, and approved before production migration begins. Existing production templates will continue to use `@react-pdf/renderer` until their Forme replacements pass all verification gates.

---

## 2. Document Index

This directory contains the complete frozen specification and planning suite for the PDF rendering migration:

| File | Purpose | Primary Audience |
| :--- | :--- | :--- |
| [`draft.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/draft.md) | **Master Product Requirements Document (PRD)**. Defines architecture, principles, superseded decisions, technical capability statuses, and non-goals. | Engineering Leads, Architects |
| [`functional-req.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/functional-req.md) | **Detailed Functional Requirements & Problem Register**. Specifies natural pagination, the 3 modes, Unicode handling, rich text, and hyperlinks. | Developers, QA Engineers |
| [`Prerequisites.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Prerequisites.md) | **Pre-Implementation Gates**. Checklists that teams must verify before implementation starts. | All Agents, Project Leads |
| [`risk-register.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/risk-register.md) | **Risk Register & Mitigations**. Identifies technical and commercial risks with concrete mitigation steps. | Project Leads, Developers |
| [`Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Waterfall-roadmap.md) | **Execution Roadmap & Phased Gates**. Milestone tracker enforcing that Natural Pagination precedes Compact implementation. | Scrum Masters, Developers |
| [`test-plan.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/test-plan.md) | **Verification & Test Plan**. Test cases anchored by a representative document suite (`SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`, short/long docs). | QA Engineers, Developers |

---

## 3. Epistemological Classification: Facts, Evidence, and Assumptions

To maintain technical rigor, all documents enforce clear distinctions between confirmed facts, empirical observations, suspected causes, provisional targets, and open decisions:

1. **Verified Repository Facts (Codebase State):**
   - `@formepdf/core` (v0.20.1) and `@formepdf/react` (v0.20.1) are installed in `package.json`.
   - Core API exports (`renderDocumentWithLayout`, `Table`, `Row`, `Cell`, `Fixed`, `Image`, `Link`, etc.) exist in the installed packages.
   - `@react-pdf/renderer` (v4.3.2) is installed and pinned for legacy templates.
2. **Observed Reproduction Evidence (Document Benchmarks):**
   - In `SASQUO-000427 (1).pdf`, an indivisible 113.73 pt closing block spilled to Page 2 despite 75.25 pt remaining on Page 1. This is diagnostic evidence from an observed reproduction, not a universal physical constant across all documents.
   - In `SASQUO-000428.pdf`, dimensions `2″`, `3″`, and `4″` rendered as `23`, `33`, and `43`. This is confirmed reproduction evidence of a rendering bug.
3. **Suspected Causes (Requiring Empirical Tracing):**
   - WinAnsi modulo-256 truncation in React-PDF fallback fonts is a **technically plausible suspected cause** for the `2″` $\to$ `23` defect ($0x2033 \pmod{256} = 0x33$). However, it is not claimed as proven until the exact font encoding and fallback execution path is traced empirically during Phase 1.
4. **Provisional Planning Targets (Subject to Testing):**
   - Candidate values—including the **72 pt** candidate `make` column width, the **32** compact styling tokens, the **7 pt** typography floor, and the **2 pt** row padding floor—are **provisional candidate targets** subject to empirical readability testing during Phase 2 and Phase 3. They are not permanently fixed or universally non-negotiable.
5. **Forme Runtime Behavior Status:**
   - Package export inspection confirms that an API exists; it does **not** prove runtime correctness.
   - Runtime repetition of table headers (`<Row header>`), dynamic footer reservation (`<Fixed position="footer">`), coordinate accuracy in `renderDocumentWithLayout`, and PDF link annotations (`/Annots /Link`) are explicitly classified as **implementation-stage empirical verification requirements**.
6. **Roadmap Milestone Statuses:**
   - Milestone M0 (*Discovery, Problem Register & PRD Documentation*) is **100% complete** as a documentation deliverable. Milestones M1 through M6 represent software implementation phases that are **pending execution**.

---

## 4. Architectural Hierarchy

```
+-------------------------------------------------------------+
|                     Business Data Layer                     |
|                 (Supabase / Domain Entities)                |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                  Canonical Document Model                   |
|              (PdfDocumentModel / Data Adapter)              |
|        *Strictly renderer-independent; math locked*         |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   pdfcn Presentation Layer                  |
|          (Design Tokens, Spacing, Layout Primitives)        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                     Forme Engine Backend                    |
|             (@formepdf/react & @formepdf/core)              |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                     Final PDF Document                      |
|          (Accurate Vector Output, Links, Embedded TTF)      |
+-------------------------------------------------------------+
```

---

## 5. Non-Negotiable Operational Rules

1. **Do not run `bun run build`:** The build process is excluded due to local host memory constraints.
2. **Never hide broken pagination with compaction:** Natural pagination must work cleanly across the representative document suite in Normal Mode before Compact or Force 1 Page modes are applied.
3. **Preserve business logic:** Tax calculations, totals, discounts, document numbering, and database schemas remain strictly outside the rendering layer.
4. **Build and approve new Forme templates before migration:** Production document traffic must not switch to Forme until new templates pass all acceptance gates.
