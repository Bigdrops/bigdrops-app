# Coding agent-Production-Grade Spec: JSON Import System
 * **Project:** BIGDROPS Business Platform
 * **Scope:** All JSON import modules + Open in AI feature
 * **Status:** In Progress
 * **Last Updated:** 2026-06-14
## 0. Global Prompt Discipline Layer (Hard Gate)
### JSON Import Discipline Spec (SYSTEM-WIDE ENFORCEMENT)
This layer applies to **ALL** AI-generated import prompts across **ALL** modules.
#### Non-Negotiable Rules
 * Return **ONLY** data explicitly present in the source document.
 * Never infer, guess, or fabricate values.
 * Missing values **MUST** be null.
 * Do not rename or reorder fields.
 * Output **MUST** be valid JSON only.
 * JSON **MUST** be wrapped in a code block.
 * MUST end with: "Copy the JSON above and paste it back into the app."
 * No explanations outside the JSON block.
 * No markdown outside the JSON block.
 * Groups are allowed **ONLY** if explicitly present in the source document.
 * Never create groups from layout, indentation, or spacing.
 * Each document type is independent (no cross-domain inference).
 * Identifier rule (po_number) is strict:
   * Only set if explicitly labeled PO/Voucher.
   * Otherwise, it **MUST** be null.
## 1. System Overview (Current State)
### Import Architecture Map

| Module | State | Notes |
| :--- | :--- | :--- |
| **Invoice / Quotation** | Shared dynamic pipeline | Stable core system |
| **Waybill** | Mixed (inline + shared parser) | Needs full separation |
| **RFQ** | Hardcoded prompt + inline parser | Non-standard |
| **CSR** | Hardcoded + manual parser | Needs Zod migration |
| **Compliance Hub** | Multi-schema (Zod per type) | Semi-standard |
| **Project Document** | Inline JSON.parse + multi-type | High-risk |
| **Item Library** | Utility only | No UI |
| **BOQ / Reports** | No import system | Out of scope | <br> ## 2. Open in AI System (Cross-Module Feature) <br> ### Current Issues <br> * Only Gemini is exposed in the UI. <br> * ChatGPT + Claude remain unused despite backend support. <br> * DeepSeek / Qwen / Kimi are not implemented. <br> * Missing silent clipboard copy functionality. <br> * Missing toast feedback. <br> * Missing cross-platform deep-link validation. <br> * Prompts currently lack the global discipline wrapper enforcement. <br> ### Required Implementation <br> #### Providers <br> * Gemini <br> * ChatGPT <br> * Claude <br> * DeepSeek <br> * Qwen <br> * Kimi <br> #### UI Behavior <br> * Replace the single button with an OpenInAIDropdown. <br> * Execute a silent clipboard copy before launching the provider interface. <br> * Trigger a toast confirmation tailored per provider. <br> * Extract and use the designated module prompt from JsonImportLayout.tsx. <br> #### Prompt Enforcement <br> Must include: <br> * JSON Discipline Spec <br> * Code block requirement <br> * Paste-back instruction <br> ## 3. Waybill (Full Rewrite Required) <br> ### Goal <br> External and Internal Waybills must become fully isolated systems. <br> ### Architecture Requirement
| Type | Prompt | Adapter | Schema |
| :--- | :--- | :--- | :--- |
| **External** | externalWaybillPrompt.ts | externalWaybillImportAdapter.ts | externalWaybillSchema.ts |
| **Internal** | internalWaybillPrompt.ts | internalWaybillImportAdapter.ts | internalWaybillSchema.ts |

### Constraints
 * Zero shared logic between External and Internal architectures.
 * No shared schema assumptions.
 * No inline UI import logic allowed.
 * No reused prompt fragments.
### Required Work
 1. Audit External/Internal fields.
 2. Remove all dead or deprecated fields.
 3. Build dedicated, isolated prompts per type.
 4. Create dedicated data adapters.
 5. Implement strict validation using Zod schemas.
 6. Strip all inline parsing logic directly out of the UI components.
## 4. Invoice — Add Mode (Anti-Inference Layer)
### Goal
Prevent the AI from generating structural elements or groups that do not exist in the source document.
### Required Changes
 * Inject the Global Discipline Spec directly into the prompt generator.
 * Enforce:
   * Strict prohibition of inferred grouping.
   * null-only representation for missing values.
 * **Explicit Rule:** Groups are created *only* if explicit visual headers are present in the source.
### Validation Tests
 * **Visual indentation only:** Must result in **NO** groups.
 * **Explicit headers present:** Groups are **allowed**.
## 5. Invoice / Quotation — Update Mode (Critical System)
### Goal
A safe, bounded, row-based mutation system.
### Required Improvements
#### Row Safety
 * Inject the valid row_number range (1 \rightarrow N) into the prompt.
 * Block any incoming invalid row_number values.
 * Prevent silent row skips.
#### Group Support
 * Restore appropriate group handling within the Update pipeline.
 * Ensure data persistence across sequential updates.
#### Overwrite Protection
 * Wire the detectOverwriteTargets() utility directly into the UI layer.
 * Force a hard user confirmation dialog before completing any overwrites.
#### UI Constraint Warning
 * Empty values do **NOT** clear fields (must remain explicitly displayed in UI).
### Validation Scenarios
 * **Overflow rows:** Triggers a warning message and auto-truncation.
 * **Valid rows:** Executes targeted, correct patch updates.
 * **Overwrites:** Halts execution until explicit user confirmation is given.
## 6. Quotation
 * Fully inherits the core Invoice pipeline.
 * Must remain behaviorally identical to the Invoice module.
 * Zero architectural divergence is allowed.
## 7. Compliance Hub
### Required Fixes
 * Inject the Global Discipline Spec into all 3 document prompts:
   * vat_input
   * tax_filing
   * wht_receipt
### Enforcement
 * null-only values for missing data.
 * Strict anti-inference rules.
 * Zero schema drift tolerated.
## 8. RFQ
### Goal
Strict structured 3-field extraction.
### Required Fields
 1. item_name
 2. quantity
 3. specification
### Improvements
 * Inject the Global Discipline Spec.
 * Recommended optimization: Migrate the parser to a strict Zod schema paired with the shared system parser.
## 9. CSR
### Required Fixes
 * Rename the legacy utility function from parseCsvImport() to parseCsrJson().
 * Replace the current manual code validation steps with a comprehensive Zod schema.
 * Append the Global Discipline Spec to the prompt configuration.
 * Enforce null-only formats for missing fields.
## 10. Project Documents (High Risk System)
### Critical Issues
 * Frequent po_number misclassification.
 * AI party-role inference errors.
 * Financial calculation duplication (subtotal vs total).
 * Lack of runtime schema enforcement.
### Required Fixes
#### Identity Rules
 * Inject target company identities explicitly into the AI context.
 * Enforce the strict PO/Voucher-only identification rule for the po_number property. (Otherwise, default to null).
#### Schema Cleanup
Remove the following calculated fields from the AI prompt scope:
 * subtotal
 * total
#### Validation Upgrade
Replace all legacy native JSON.parse implementations with target Zod schemas mapped to the respective document types:
 * purchase_order
 * receipt
 * receiving_waybill
 * other
## 11. System Architecture Rules
>  1. External and Internal Waybills are completely isolated domains.
>  2. No semantic reuse is allowed across different document types.
>  3. The po_number acts as a global structural identifier lock.
>  4. All platform ingestion modules must converge toward a unified Zod validation pipeline.
>  5. The prompt layer is designed to enforce structural discipline, not execution logic.
>  6. UI presentation files must never contain core data-import or parsing logic.
> 
## 12. Open AI Prompt Standard
Every module prompt **MUST** explicitly bundle:
 1. The Core JSON Discipline Spec.
 2. The specific system code block wrapper requirements.
 3. The designated app paste-back instructions.
## 13. Phase Execution Plan (Codex Tracking Layer)
### Phase 0 — Open in AI System
 * [ ] Replace Gemini-only UI with the provider dropdown component.
 * [ ] Integrate all 6 AI platform providers.
 * [ ] Add clipboard copy operation before launching windows.
 * [ ] Implement localized UI toast feedback.
 * [ ] Apply prompt discipline injection wrappers.
 * [ ] Validate functional deep links across all external platforms.
### Phase 1 — Waybill Rewrite
 * [ ] Audit both External and Internal field structural definitions.
 * [ ] Generate distinct, isolated prompt text files.
 * [ ] Build isolated code data adapters.
 * [ ] Create discrete, isolated runtime Zod schemas.
 * [ ] Excise all inline parsing code fragments from UI files.
 * [ ] Run individual, isolated end-to-end integration tests.
### Phase 2 — Invoice Add Mode
 * [ ] Inject the Discipline Spec into the main prompt generation utility.
 * [ ] Implement hard blocks against AI-inferred grouping layouts.
 * [ ] Enforce strict null conversions for all missing fields.
 * [ ] Test parser outputs against flat documents vs heavily sectioned documents.
### Phase 2b — Invoice/Quotation Update Mode
 * [ ] Dynamically pass structural row ranges (1 \rightarrow N) to the prompt.
 * [ ] Build the UI overflow warning system components.
 * [ ] Construct and wire up the overwrite confirmation modal UI.
 * [ ] Re-integrate structural group handling into the system update stream.
 * [ ] Code and display UI warnings regarding empty-field retention limitations.
 * [ ] Run validation testing on row overflows and explicit confirmation scenarios.
### Phase 3 — Quotation
 * [ ] Perform parity testing against the core Invoice system pipeline to ensure absolute conformity.
### Phase 4 — Compliance Hub
 * [ ] Update all 3 core compliance prompts with the standard discipline rules.
 * [ ] Force absolute enforcement of the missing data discipline rules.
 * [ ] Run structured contract-type validation suites across the hub.
### Phase 5 — RFQ
 * [ ] Restructure the prompt format to lock down formatting.
 * [ ] Execute the optional migration path to a strict Zod schema.
 * [ ] Verify the parser accepts only the defined 3-field output footprint.
### Phase 6 — CSR
 * [ ] Complete the parser function rename task.
 * [ ] Build and map the new Zod schema structure.
 * [ ] Merge prompt discipline logic into the module configurations.
### Phase 7a — Project Documents
 * [ ] Fix the current po_number identifier resolution bug.
 * [ ] Dynamically inject corporate identity values.
 * [ ] Strip out structural subtotal and total properties from AI instructions.
 * [ ] Construct independent, production-grade Zod schemas.
 * [ ] Upgrade unsafe native JSON.parse operations to safe schema validations.
### Phase 7b — Project PDF
 * [ ] Review and audit file structural layouts.
 * [ ] Align overall data extraction quality to match Invoice/Quotation standards.
### Phase 8 — Clipboard Detector
 * [ ] Develop window focus handlers that check for structural JSON configurations.
 * [ ] Build the inline paste-suggestion notification interface element.
 * [ ] Program error-handling fallback routes for when permission scopes are denied.
 * [ ] Validate cross-platform behavior (MacOS, Windows, iOS, Android).
## 14. New Module Standard (MANDATORY)
Every new import module built moving forward **MUST** adhere to this lifecycle structural loop:
### 1. Scope Definition
 * Outline explicit fields only.
 * Classify as bulk execution vs single execution.
 * Maintain clean structural variant separation.
### 2. Prompt Design
 * Bundle the Discipline Spec.
 * Include code block wrapper + paste-back instruction structures.
 * Apply system-wide global identifier rules.
### 3. Schema Design
 * Use Zod schemas exclusively.
 * Manual string checking or custom validation functions are prohibited.
### 4. Adapter Layer
 * Create an isolated, dedicated importAdapter.ts handler file.
 * Keep data handling completely clear of UI components.
### 5. UI Integration
 * Connect modules using the central JsonImportLayout container.
 * No ad-hoc, custom formatting or import logic is permitted in view layers.
### 6. Testing Validation
 * Verify first-paste success criteria.
 * Check for proper missing value null enforcement.
 * Ensure zero grouping leakages occur on visually formatted documents.
 * Pass all integration tests through runtime Zod validations.
## 15. Success Definition
The implementation is complete when:
 * **Zero AI data inference** occurs anywhere across the application platform.
 * All document text parsing imports operate deterministically.
 * Unpopulated data fields uniformly resolve to null.
 * No phantom grouping logic is introduced from visual layout indentation patterns.
 * Update operations are structurally bounded and safe across all targeted row indices.
 * Every intake module passes verification using a Zod schema or unified parser pipeline.
 * Project Documents correctly apply corporate identities and structural po_number rules.
 * The "Open in AI" dropdown functions reliably across all 6 vendor integrations.
 * Clipboard capture sequences work consistently across all runtime platforms.
 * Future platform modules are built explicitly following these standardization laws before engineering work starts.