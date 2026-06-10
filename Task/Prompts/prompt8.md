

---

```
You are a senior systems analyst conducting a gap audit. Your task is non-interactive. Execute fully and deliver a written plan.

---

## 1. CONTEXT ACQUISITION

Read the following files in the repository to establish your baseline:

- `docs/WAYBILL_ARCHITECTURE.md` — the target specification for the Waybill module.
- All existing Waybill-related code currently in the codebase. Search broadly: pages, components, hooks, services, types, migrations, and any route definitions. Identify every file that touches waybill functionality.

Also read the Invoice form implementation — specifically the UI structure, layout patterns, and component composition. You will reference this visually, not logically.

---

## 2. GAP ANALYSIS

Compare the current Waybill implementation against every requirement in `WAYBILL_ARCHITECTURE.md`. Produce a structured gap report covering these dimensions:

### 2.1 Schema & Database Layer
- Does the Supabase migration match the DDL in the architecture doc?
- Are all constraints present? (check_waybill_type, check_waybill_status, check_waybill_transport_mode, check_waybill_purpose_conditional, check_items_json_structure)
- Does the `blank_waybill_logs` table exist with its reconciliation constraint and index?
- Are RLS policies active?
- Are all indexes from the spec in place?

### 2.2 TypeScript Types & Interfaces
- Do the types align with every column in the DDL? Check for missing fields (custom_fields, receiver_signature_url, receiver_description, archived_at, etc.)
- Are the union types for `status`, `type`, `transport_mode`, and `purpose` correctly narrowed?

### 2.3 Sequence Number Engine
- Does the current code implement `generateWaybillSequenceNumber()` as specified in Section 4.3?
- Does it support the manual token (`M`) injection for blank bypass documents?
- Is the prefix configurable (configuredPrefix parameter)?

### 2.4 Three-State Segmented View (All | External | Internal)
- Does the list view implement this filter?
- Does the [Internal] view unmount the Client field and show routing trail (Releasing Location ➔ Receiving Location)?
- Does selecting a client filter in [All] state automatically suppress internal documents?

### 2.5 Four-State Lifecycle Machine
- Are all four statuses (dispatched, pending_confirmation, delivered, returned) functional?
- Can status transitions be executed?
- Does [Returned] flag warehouse re-inventory logic?

### 2.6 Creation Form & Field Interlocking
- Does `transport_mode` selection dynamically show/hide `vehicle_plate`? (By Hand → unmount plate)
- Does `By Vehicle` show both Driver Name and Vehicle Plate?
- Are Courier and Self Pick-Up modes handled correctly?
- Is the form structurally similar to the Invoice form in layout, spacing, card arrangement, and component style (without sharing business logic)?

### 2.7 Field Masking Rules
- On-screen: do empty optional fields render a dash (—)?
- Print PDF: do empty fields render pen-and-ink lines (___________)?

### 2.8 Invoice-to-Waybill Spawning Pipeline
- Can a Waybill be spawned from an Invoice?
- Does it extract Client, P.O. Number, Description, Qty, Unit while stripping all financial fields?
- Is the parent invoice relational link created?
- Is the (✕ Unlink) action present?

### 2.9 Blank Document Bypass System
- Does the [Download Blank Waybill Template] action exist?
- Does it call the prefix engine with the manual token?
- Does it insert a row into `blank_waybill_logs` and permanently consume the number?
- Does the reconciliation loop exist (linking a returned paper document to a digital record)?

### 2.10 Automated Table Column Logic
- Are S/N, QTY, UNIT, and ITEM DESCRIPTION mandatory and fixed?
- Do Part Number and Condition columns auto-show/hide based on scanning logic from Section 6.2?
- Does the empty-column stripping apply to both screen and PDF?

### 2.11 Inline Eye Toggle (Visibility Override)
- Does the Linked Invoice and P.O. Number field have the 👁 / 👁‍🗨 toggle?
- Does it strip those fields from the PDF when toggled to hidden?

### 2.12 Validation Gates
- Does the save logic enforce the 4 conditions for External Waybills?
- Does it enforce the 5 conditions for Internal Waybills?

---

## 3. UPGRADE PLAN

Based on the gap analysis, write a detailed implementation plan. The plan must:

- Be organized into sequential phases. Each phase must be independently executable and deliverable.
- Phase 1 must address schema alignment (migration corrections if needed).
- Subsequent phases must address UI, logic, and feature gaps in dependency order.
- Every phase must reference the specific section of `WAYBILL_ARCHITECTURE.md` it satisfies.
- The Invoice form UI/UX is the visual benchmark for the Waybill form. Describe how the Waybill form should mirror its layout structure (card arrangement, spacing, typography hierarchy, input styling, section headers) while maintaining completely separate business logic. Do not propose copying Invoice logic — only visual composition.

---

## 4. JSON IMPORT MODIFICATION

The project includes a JSON import feature. Identify where it lives in the codebase. In your plan, include a phase that modifies the JSON import to:

- Accept and validate Waybill-structured JSON against the Waybill schema.
- Apply the same validation gates (Section 7) to imported Waybill records.
- Reject imports that violate the Purpose Mutex Constraint or the Waterproof JSONB Check.
- Generate waybill numbers via the prefix engine for imported records if not explicitly provided.

---

## 5. OUTPUT REQUIREMENTS

Write your full analysis and plan into a single file:

```

TASK/reports/waybill-upgrade-plan.md

```

### File structure:
```

Waybill Module Upgrade Plan

Gap Analysis Summary

[Structured findings organized by the 12 dimensions above. For each, state: ALIGNED, PARTIAL, or MISSING with a one-paragraph explanation.]

Phased Implementation Plan

Phase 1: [Title]

· Architecture Ref: [Section X.Y]
· Current State: [Brief]
· Required Changes: [Specific file-level changes]
· Acceptance Criteria: [Testable conditions]

[Repeat for all phases]

JSON Import Modification

[Phase for JSON import changes, same structure]

Estimated File Scope

[List every file expected to be created or modified]

```

---

## 6. CONSTRAINTS

- Write the full plan. No truncation, no "// ... rest of plan" placeholders.
- Do not modify any code. This is analysis and planning only.
- Do not ask clarifying questions. Fill gaps with reasoned assumptions and note them.
- Run `bun run audit:load` after any file reads to verify the current state, but you are not modifying code in this task.
- After writing the plan, commit it and push to the remote repository.

---

## 7. SUCCESS CRITERIA

Done when:
- `TASK/reports/waybill-upgrade-plan.md` exists in the repository.
- It contains a complete gap analysis covering all 12 dimensions.
- It contains a phased implementation plan with clear acceptance criteria.
- The JSON import modification is included as a phase.
- The file is pushed to GitHub and the operator confirms it is readable.
```

Target: Claude Code / Codex | Strategy: Non-interactive gap audit producing a structured upgrade plan; all 12 architecture dimensions must be explicitly addressed with ALIGNED/PARTIAL/MISSING verdicts; Invoice form is visual benchmark only — logic copying explicitly forbidden.