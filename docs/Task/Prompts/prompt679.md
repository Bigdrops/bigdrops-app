
# WAYBILL ARCHITECTURE INVESTIGATION PROMPT (CLEAN AUDIT MODE v2.0)

## CONTEXT

You are analyzing the current Waybill system implementation in this repository.

You must compare the implementation strictly against the canonical architecture contract:


docs/contracts/Waybill-golden-contract.md

This is the ONLY source of truth for architecture expectations.

Do NOT assume, rename, reinterpret, or substitute this file.

---

## OBJECTIVE

Perform a **strict compliance and drift audit** of the current Waybill system.

You must determine:

1. How closely the implementation matches the Waybill Golden Contract
2. Whether there are architectural violations or inconsistencies
3. Whether the system is:
   - Fully aligned
   - Mostly aligned
   - Partially aligned
   - Misaligned
   - Requires refactor or rewrite

4. Whether migration effort is:
   - Low
   - Medium
   - High
   - Rewrite-level

5. Whether current architecture is already stable enough to retain without change

---

## SCOPE (WAYBILL ONLY)

Analyze ONLY Waybill domain modules:

- Table Settings (column authority system)
- Waybill Render Engine (transformation layer)
- PDF Templates (Minimal / Classic / Industry)
- Waybill Import pipeline (if present)
- Supabase Waybill schema + DB types

DO NOT reference any external domains or assumptions.

---

## ANALYSIS REQUIREMENTS

### 1. TABLE SETTINGS (COLUMN AUTHORITY LAYER)

Verify:
- Is it the ONLY source of truth for column schema?
- Does it resolve:
  - visibility
  - ordering
  - custom column definitions
- Does it enforce deterministic column keys?
- Does it avoid business logic or rendering logic?

Compare strictly to golden contract Column System rules.

---

### 2. WAYBILL RENDER ENGINE (TRANSFORMATION LAYER)

Verify:
- Is it a pure deterministic transformer?
- Does it ONLY consume resolved Table Settings output?
- Does it avoid schema definition responsibilities?
- Does it correctly enforce:
  - blank preservation rules
  - sanitization rules
  - deterministic output
- Does it avoid mutating input or inferring missing structure?

Compare strictly to golden contract engine rules.

---

### 3. PDF TEMPLATE LAYER (PRESENTATION ONLY)

Verify:
- Are templates fully dumb renderers?
- Do they avoid:
  - business logic
  - filtering columns
  - computing values (qty/unit/etc.)
  - schema decisions
- Do they strictly render provided model only?

Compare strictly to golden contract template rules.

---

### 4. COLUMN SYSTEM INTEGRITY

Verify:
- Single source of truth exists for columns
- No duplicate column systems exist
- No schema drift between:
  - Table Settings
  - Engine
  - Templates
- No conflicting custom column strategies

---

### 5. END-TO-END DATA FLOW

Validate pipeline:


Waybill DB → Table Settings → Render Engine → Render Model → PDF Templates → Final PDF

Check:
- No bypass paths
- No direct DB → template access
- No UI state leakage into engine
- No template-side computation of business logic

---

### 6. WAYBILL TYPE SYSTEM

Verify:
- `type: 'internal' | 'external'` exists in render model
- Both modes are fully supported
- Engine does NOT branch presentation logic
- Templates handle conditional rendering only

---

### 7. FOOTER + PAGINATION MODEL

Verify:
- Page numbers are NOT engine-owned
- Footer is data-only (no layout logic)
- Pagination is template-controlled (React-PDF runtime behavior)
- Engine does NOT compute layout or page breaks

---

## OUTPUT REQUIREMENT

Save the final report to:


docs/task/reports/waybill-architecture-audit-report.md

---

## REPORT STRUCTURE

### 1. EXECUTIVE SUMMARY
- Architecture health score (0–10)
- Classification:
  - Fully aligned
  - Mostly aligned
  - Partially aligned
  - Misaligned
  - Requires refactor

---

### 2. DEVIATION MATRIX

| System Area | Compliance Level | Severity | Notes |
|-------------|------------------|----------|------|

---

### 3. CRITICAL GAPS

Only include issues that:
- break determinism
- violate separation of concerns
- introduce schema duplication
- cause cross-layer leakage
- violate blank preservation rules

---

### 4. MIGRATION ANALYSIS

Provide:
- Estimated effort (hours / days / weeks)
- Risk level (low / medium / high)
- Incremental migration feasibility
- Whether system should remain unchanged

---

### 5. FINAL RECOMMENDATION

Choose ONE:

- DO NOT MIGRATE (system is stable)
- GRADUAL ALIGNMENT (recommended)
- REFACTOR ENGINE ONLY
- FULL ARCHITECTURAL MIGRATION

Justify strictly based on observed evidence.

---

### 6. STABLE CORE IDENTIFICATION

Identify:
- Already-compliant modules
- Safe-to-leave-untouched systems
- Extension-safe boundaries

---

## CONSTRAINTS

- DO NOT rename files or references
- DO NOT assume external architectures
- DO NOT introduce legacy or unrelated domains
- DO NOT propose fixes or redesigns
- DO NOT modify code
- DO NOT implement changes
- This is strictly an audit

---

## SUCCESS CRITERIA

The report must allow a senior engineer to decide:

> “Do we keep this architecture as-is, or migrate toward the golden contract?”


