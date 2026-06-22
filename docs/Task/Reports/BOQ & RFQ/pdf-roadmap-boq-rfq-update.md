# PDF Roadmap Update — BOQ & RFQ Phase 3D

**Date:** 2026-06-16  
**Task:** Add Phase 3D (BOQ & RFQ Overhaul) to PDF Rendering Roadmap  
**Source Audit:** `docs/Task/reports/boq-rfq-audit.md`

---

## What Was Done

### 1. Added Phase 3D — BOQ & RFQ Overhaul

Inserted after Phase 3C (PDF Quality Audit — Remaining Types) in `docs/PRD/pdf-rendering-roadmap.md`.

**Phase 3D includes:**
- Critical bug documentation: BOQ storage split (localStorage create vs Supabase view)
- Confirmed issues table (10 issues: 1 CRITICAL, 5 HIGH, 2 MEDIUM, 2 LOW)
- Locked strategy (7 points)
- 6 task groups: 3D-1 (Storage Split), 3D-2 (JSON Import), 3D-3 (Form Alignment), 3D-4 (Template Replacement), 3D-5 (Image Output), 3D-6 (Palette System)
- Completion signal with 7 criteria

### 2. Updated Execution Order

```
Phase 1 → Phase 2A → Phase 2B → Phase 3A → Phase 3B → Phase 3C → Phase 3D (BOQ & RFQ) → Phase 4 → Phase 5 → Phase 6+
```

### 3. No Source Code Modified

All changes were documentation-only.

---

## Key Content Captured

### Critical Bug (BLOCKING)
- BOQ `NewBoq.tsx` saves to localStorage (`domain/boq/storage.ts`)
- `ViewBoq.tsx` reads from Supabase — newly created BOQs are invisible
- Fix: migrate to Supabase insert, wire prefix engine, deprecate localStorage

### Confirmed Issues from Audit
| Severity | Count | Examples |
|---|---|---|
| CRITICAL | 1 | BOQ storage split |
| HIGH | 5 | Hardcoded prefix, unreadable templates, no page breaks, bad image output, broken palette |
| MEDIUM | 2 | Form visual disconnect, missing JSON import |
| LOW | 2 | No totals row, no logo support |

### Strategy (LOCKED)
1. Fix BOQ storage split first
2. Wire BOQ prefix engine
3. Scrap both templates — replace with readable alternatives
4. Fix mobile image output
5. Replace freeform palette with curated presets
6. Align forms to Invoice design system
7. Add missing JSON import

---

## Files Modified

| File | Change |
|---|---|
| `docs/PRD/pdf-rendering-roadmap.md` | Added Phase 3D section, updated execution order |

## Files Created

| File | Purpose |
|---|---|
| `docs/Task/reports/pdf-roadmap-boq-rfq-update.md` | This work report |
