# Report: PDF Customization Extension Standard Created

This report was written by OpenCode on 2026-07-08 via Local Runner.

## Objective

Create the PDF Customization Extension Standard at `docs/STANDARD/pdf-customization-extension-standard.md` to canonically document the validated production architecture after the Waybill PDF customization rollout (Phases 1–2.4). This standard serves as the implementation guide for all future document families (quotation, invoice, BOQ, RFQ, etc.).

## Scope

**In scope:**
- Reading all source engine files, the locked PRD, and all five implementation reports covering the waybill adoption cycle
- Creating a single `docs/STANDARD/pdf-customization-extension-standard.md` file
- Verifying no source code files were touched via `git status`

**Excluded:**
- No application code modifications (standard only updates documentation)
- No refactoring, formatting, or code generation
- No linting, typecheck, or build runs (per AGENTS.md hardware policy for pure doc tasks)

## Evidence-Based Findings

### Source Material Inspected

| File | Role |
|------|------|
| `docs/PRD/pdf-customization-extension-system.md` | Locked product requirements — section 18 specifies standard creation rule |
| `docs/Reports/PDF/pdf-customization-engine-implementation.md` | Engine creation report — confirms three-layer architecture |
| `docs/Reports/PDF/phase-1.5-audit-report.md` | Resolver audit — confirmed `handwritingFont`/`handwritingColor` naming |
| `docs/Reports/PDF/waybill-pdf-customization-engine-adoption.md` | Waybill bridge adoption — documents `bridgeToDesignPreset()` pattern |
| `docs/Reports/WAYBILL/waybill-embed-customize-panel-report.md` | Confirms embedded DocumentSheet pattern, no standalone drawer |
| `docs/Reports/WAYBILL/waybill-phase2.3-ink-propagation-and-switch.md` | Documents CSR-style Switch with auto/custom sentinel |
| `docs/Reports/WAYBILL/waybill-phase2.4-ink-audit-fix.md` | Phase 2.4 completion — ink propagation verified across all 6 templates |
| `src/domain/pdf/customization/types.ts` | Live types — `PdfCustomizationCapabilities`, `PdfCustomizationPolicy`, `PdfTemplateDefaults`, `ResolvedPdfCustomization`, `PdfCustomizationDocumentFamily` |
| `src/domain/pdf/customization/resolver.ts` | Pure resolver — three exported functions: `resolveSettings`, `resolvePdfCustomization`, `resolveFull` |
| `src/domain/pdf/customization/hooks.ts` | `usePdfCustomization` hook — localStorage persistence with category key |
| `src/domain/pdf/customization/fontRegistry.ts` | Font registration — two separate registration functions |
| `src/domain/pdf/customization/waybill.ts` | Waybill metadata — capabilities, policy, defaults, bridge function |
| `src/pages/ViewWaybill.tsx` (lines 421–601) | Production integration — hook usage, DocumentSheet controls, Switch UX |
| `src/pages/ViewCSR.tsx` (lines 307–447) | CSR customization — Switch + template carousel pattern |
| `src/components/waybill/WaybillPDF.tsx` | Template renderer — receives `PdfDesignPreset`, never imports hook |

### Key Architecture Confirmed (vs. PRD)

| PRD Statement | Production Reality | Standard Reflection |
|--------------|-------------------|-------------------|
| `PdfCustomizationTheme` type | `ResolvedPdfCustomization` | Uses `ResolvedPdfCustomization` |
| Storage key `pdf_customization_{category}` | `pdf_customization_<family>` | Both — standard uses category key pattern |
| Standalone `PdfCustomizationPanel` | Embedded `DocumentSheet` controls | No standalone drawer — each page owns its layout |
| PRD theoretical field naming | `handwritingFont`/`handwritingColor` in capabilities, `inkFont`/`inkColour` in settings | Documents both names and the bridge mapping |

## Standard Content Summary

The standard contains 14 sections:

1. **Architecture Overview** — three-layer engine/hook/UI stack
2. **Capability Declaration** — static capabilities per family
3. **Policy Declaration** — master switch per capability
4. **Template Defaults** — per-template fallback values
5. **Resolver Usage** — resolver as single source of truth
6. **Hook Usage** — `usePdfCustomization` API
7. **UI Wiring** — DocumentSheet-embedded, CSR-style Switch pattern
8. **Category Storage Keys** — `pdf_customization_<family>` convention
9. **Font Library Extensibility** — three-step font addition
10. **Renderer-Hook Separation** — templates never call hooks
11. **Bridge Pattern** — `bridgeToDesignPreset()` for legacy compatibility
12. **Migration Order** — 9-step checklist for new families
13. **Fillable Content Definition** — what fields are fillable per family
14. **Lessons Learned** — 7 findings from the waybill rollout

All 13 required architecture points from the task specification are incorporated across these sections.

## Verification

- `git status` confirms `docs/STANDARD/pdf-customization-extension-standard.md` is the only new untracked file
- No `.ts`, `.tsx`, `.js`, or `.css` files were modified
- `git diff --stat` shows zero changes to application source code
- Build/typecheck skipped per AGENTS.md hardware policy (standard-only doc task)

## Risks & Limitations

- The standard reflects waybill as the reference implementation. CSR uses a slightly older pattern (manual localStorage writes, not the hook). Future families should follow the waybill/hook pattern.
- Attached-document fallback (CSR+invoice bundles) is noted as a known limitation in section 8. The standard flags this as deferred.
- `PdfCustomizationDocumentFamily` currently uses per-document-family values (`invoice`, `quotation`, `csr`, `waybill`, `boq`). If a future audience-based grouping (e.g., category) is needed, the key convention would need updating — but the standard currently reflects the deployed reality.

## Deferred Work

- CSR to migrate from manual localStorage writes to `usePdfCustomization` hook (not required for correctness, but reduces duplication)
- Quotation and Invoice families to adopt the engine pattern following the migration checklist in section 12
- PDF renderer components for quotation/invoice/BOQ/RFQ to consume `bridgeToDesignPreset()` output
- Unified per-audience customization bundles (e.g., CSR+invoice pair download with combined settings)
