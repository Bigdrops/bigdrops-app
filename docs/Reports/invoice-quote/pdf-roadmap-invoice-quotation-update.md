# PDF Roadmap Update — Invoice & Quotation Templates

**Date:** 2026-06-16
**Status:** Documentation-only — no source code modified
**Scope:** Roadmap update reflecting Invoice/Quotation template audit findings and locked strategy

---

## What Changed

### 1. Phase 3A Added — Invoice/Quotation Template Audit & Repair

New phase inserted before the existing PDF Quality Audit (renumbered to 3B). Contains:

- **Audit Results Table** — 5 templates audited: Industry (working), Editorial (broken), Apex (placeholder), Bolt (broken), Obsidian (broken)
- **Root Cause** — Editorial, Bolt, Obsidian bypass `industryAdapter` and HTML parsing pipeline. Apex never built.
- **Locked Strategy** — Repair Editorial, Destroy Apex/Bolt/Obsidian, Standardise before rebuilding
- **Tasks** — 3A-1 (Repair Editorial), 3A-2 (Destroy Broken), 3A-3 (Establish Template Standard)

### 2. Phase 3 Renumbered to 3B

Existing "Phase 3 — PDF Quality Audit (All Document Types)" renamed to "Phase 3B — PDF Quality Audit (Remaining Types)". Invoice/Quotation removed from its scope (covered by 3A).

### 3. Execution Order Updated

```
Phase 1 → Phase 2A → Phase 2B → Phase 3A (Invoice/Quotation Templates) → Phase 3B (PDF Audit — Remaining Types) → Phase 4 (Blank Templates) → Phase 5 (CSR Landscape) → Phase 6+ (Per findings)
```

---

## Files Modified

| File | Change |
|------|--------|
| `docs/PRD/pdf-rendering-roadmap.md` | Added Phase 3A, renumbered Phase 3 → 3B, updated execution order |

## Files NOT Modified

- No source code files touched
- No template files touched
- No config files touched

---

## Verification

1. ✅ Phase 3A present with audit table, strategy, and tasks
2. ✅ Phase 3B renumbered from old Phase 3
3. ✅ Execution order updated with new numbering
4. ✅ No source code files modified
5. ✅ Work report saved
