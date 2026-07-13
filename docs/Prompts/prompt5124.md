You are working on the BIGDROPS business platform.

Stack:
React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime: Bun only.

====================================================================
CRITICAL
====================================================================

Read AGENTS.md first.

Load the following skills:

- Karpathy
- typescript-advanced-types
- capacitor-best-practices

This is an INVESTIGATION ONLY.

Do NOT modify any source files.

Do NOT implement any changes.

Do NOT generate patches.

====================================================================
OBJECTIVE
====================================================================

Perform a complete architectural audit of the PDF generation and delivery system.

The goal is to determine whether BIGDROPS should adopt a single unified PDF pipeline where:

- Every document generates a common PDF asset (Blob or equivalent).
- Delivery (download, native open, share, upload, email, print, preview) is handled by a separate layer.
- Generation and delivery become completely decoupled.

====================================================================
INSPECTION SCOPE
====================================================================

Inspect every PDF-related path in the project.

Include, but do not limit yourself to:

- src/components/pdf-new/
- src/components/document-view/
- src/lib/native/pdfexport.ts
- downloadPdf.tsx
- Invoice
- Quotation
- CSR
- RFQ
- Waybill
- BOQ
- Receipt

Identify any additional PDF generation or delivery code not previously discussed.

====================================================================
ANALYZE
====================================================================

For every document type, identify:

1. Entry point
2. Generation pipeline
3. Rendering engine
4. Blob creation
5. Download mechanism
6. Native save mechanism
7. Sharing mechanism
8. Preview mechanism
9. File opening mechanism

Produce a comparison table showing every document's current pipeline.

====================================================================
ARCHITECTURE ANALYSIS
====================================================================

Determine:

- How many distinct PDF pipelines currently exist.
- Which responsibilities belong to generation.
- Which belong to delivery.
- Which logic is duplicated.
- Which logic should become shared.
- Which abstractions already exist and can be reused.
- Whether introducing a common PdfAsset abstraction would simplify the architecture.
- Whether a Delivery Strategy layer would reduce duplication.
- Whether existing public APIs should remain stable.

====================================================================
MIGRATION ANALYSIS
====================================================================

If the architecture is unified:

Estimate:

- Number of files affected.
- Public APIs that would change.
- Backward compatibility impact.
- Migration complexity.
- Risks.
- Benefits.
- Recommended implementation order.

Identify the smallest safe migration path.

====================================================================
DELIVERABLE
====================================================================

Produce a Markdown architecture report only.

Include:

1. Executive Summary
2. Current Architecture
3. Pipeline Inventory
4. Duplication Analysis
5. Proposed Unified Architecture
6. Migration Strategy
7. Risk Assessment
8. Recommendation
9. Suggested implementation phases

====================================================================
VERIFICATION
====================================================================

This is a read-only audit.

Run only:

- git status (before)
- git status (after)

Verify that ZERO application source files were modified.

Do NOT run:

- bun run build
- bun run typecheck
- lint