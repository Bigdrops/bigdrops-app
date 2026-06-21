.

# WAYBILL ARCHITECTURE INVESTIGATION PROMPT (AUDIT MODE)

## CONTEXT

You are analyzing the current Waybill system implementation inside this repository:

- Table Settings module (column system + resolution logic)
- Waybill Render Engine (transform layer)
- PDF Templates (Minimal, Classic, Industry, etc.)
- Import pipeline (if present)
- Supabase schema + DB types

AND comparing it against the **Golden Architecture Spec v1.0** located at:


docs/contracts/Waybill-System-Architecture-Spec.md

---

## OBJECTIVE

You must perform a **full architecture divergence audit**.

Determine:

1. How far the current implementation deviates from the Golden Architecture Spec
2. Whether the system is already close to compliance or structurally misaligned
3. Whether migration is:
   - Low effort
   - Medium effort
   - High effort
   - Requires rewrite-level refactor
4. Whether the current architecture is already "good enough" and should NOT be changed

---

## WHAT YOU MUST ANALYZE

### 1. TABLE SETTINGS MODULE
Check:
- Does it fully own column schema definition?
- Does it enforce deterministic column keys?
- Does it resolve visibility + ordering correctly?
- Does any business logic leak into it?

Compare against spec Section 2.

---

### 2. WAYBILL RENDER ENGINE
Check:
- Is it a pure transformer (no schema logic)?
- Does it fully respect ResolvedColumnConfig from Table Settings?
- Does it implement blank preservation correctly?
- Does it incorrectly generate or mutate schema?

Compare against spec Section 3–5.

---

### 3. PDF TEMPLATES (Minimal / Classic / Industry)
Check:
- Do templates contain business logic?
- Do they compute qty/unit or formatting?
- Do they filter columns or decide visibility?
- Do they violate "dumb renderer" rule?

Compare against spec Section 6.

---

### 4. COLUMN SYSTEM CONSISTENCY
Verify:
- single source of truth for columns
- no duplicate column systems
- no legacy invoice coupling
- no conflicting custom column strategies

Compare against spec Section 7.

---

### 5. DATA FLOW INTEGRITY

Validate full pipeline:


DB → Table Settings → Render Engine → Render Model → Template → PDF

Check:
- Any bypass paths?
- Any direct DB → template access?
- Any UI state leaking into rendering?

---

### 6. INTERNAL vs EXTERNAL WAYBILL SUPPORT

Check:
- Is `type: internal | external` correctly supported?
- Are both modes handled consistently in engine?
- Are templates branching correctly OR incorrectly?

---

### 7. PAGINATION + FOOTER MODEL

Check:
- Who owns page numbers (should be templates only)
- Does engine avoid layout decisions?
- Is footer correctly data-only?

Compare against spec Section 5.8–5.9.

---

## OUTPUT REQUIRED

Generate a report saved to:


docs/task/reports/waybill-architecture-audit-report.md

---

## REPORT STRUCTURE

### 1. EXECUTIVE SUMMARY
- Overall architecture health score (0–10)
- Current state classification:
  - Fully aligned
  - Mostly aligned
  - Partially aligned
  - Misaligned
  - Requires rewrite

---

### 2. DEVIATION MAP

List:

| System | Spec Compliance | Gap Severity | Notes |
|-------|----------------|-------------|------|

---

### 3. CRITICAL GAPS

Only include issues that:
- break determinism
- break separation of concerns
- cause schema duplication
- leak DB/UI into render layer

---

### 4. MIGRATION COMPLEXITY ASSESSMENT

Answer:

- Estimated effort (hours/days/weeks)
- Risk level (low/medium/high)
- Whether incremental migration is possible
- Whether current system should be preserved

---

### 5. RECOMMENDATION

One of:

- DO NOT MIGRATE (system already stable)
- GRADUAL ALIGNMENT (recommended)
- REFACTOR CORE ENGINE ONLY
- FULL ARCHITECTURAL MIGRATION

Explain clearly WHY.

---

### 6. SAFE STATE IDENTIFICATION

Identify:
- What parts of system are already "golden compliant"
- What parts must NEVER be changed (stable primitives)

---

## CONSTRAINTS

- Do NOT modify code
- Do NOT propose new architecture
- Do NOT implement fixes
- This is strictly an evaluation
- Be precise, not speculative
- Prefer structural truth over opinion

---

## SUCCESS CRITERIA

The report must allow a senior engineer to decide:

> "Do we keep this architecture, or migrate it to the golden spec?"



