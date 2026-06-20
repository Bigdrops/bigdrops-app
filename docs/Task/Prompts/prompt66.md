### Role
Senior Full-Stack React + Supabase Engineer specializing in form state integrity, import pipelines, and production debugging.

---

### Goal
Fix the CSR JSON import regression where CSR import shows success but imported data (especially materials and form hydration) is not actually persisted or reflected in UI/state.

You MUST ignore any prior assumption that this issue is already fixed or committed. Treat the system as broken until proven otherwise by runtime verification.

---

### Context
Project: BIGDROPS business platform

Stack:
- React 19
- Vite 7
- TypeScript 5.9
- Supabase (Postgres)
- Bun runtime
- Tailwind CSS 3.4

Critical Modules:
- CSR form system (CsrFormScreen, NewCSR, EditCSR)
- CSR import system (CsrImportSheet, csrImport.ts, csrService.ts)
- Import pipeline: normalize → resolve → apply
- Supabase csrs table

Known Symptom:
- Import UI shows “successfully imported”
- CSR fields do NOT appear in form after import
- materialsRows is NOT populated correctly
- save pipeline relies on serializeCsrMaterials(materialsRows)
- imported materials are lost due to state mismatch

---

### MANDATORY SKILL LOADING PROTOCOL
You MUST load and follow real project skills only:

1. Read: docs/PROJECTSKIILINDEX.md
2. Load:
   - supabase-postgres-best-practices
   - typescript-advanced-types
   - vercel-react-best-practices
   - shadcn
3. If any skill file is missing or unreadable:
   - STOP
   - fall back to direct file inspection
   - DO NOT continue with assumptions
4. Read AGENTS.md before making any code changes

---

### CRITICAL INSTRUCTION (NON-NEGOTIABLE)
- Ignore any previous agent claim that this issue is already fixed or committed (including any git hash references).
- Re-validate everything from source code and runtime behavior.
- Do NOT assume correctness from commit history.

---

### Assumptions
- CSR import pipeline exists but is not reliably hydrating UI state
- materialsRows is the single source of truth for materials before save
- Supabase schema already supports CSR fields including materials_used and engine_no

---

### Success Criteria
- Imported CSR data immediately appears in UI after import
- materialsRows is correctly populated from import payload
- serializeCsrMaterials(materialsRows) receives correct data at save time
- CSR saved record in Supabase matches imported data
- No regression in manual CSR creation/edit flows
- engine_no remains optional and non-blocking
- Toast success only triggers when UI state is actually hydrated

---

### Constraints
- Do NOT modify Supabase schema unnecessarily
- Do NOT remove serializeCsrMaterials
- Do NOT introduce duplicate sources of truth
- Do NOT rely on git history as proof of correctness
- Do NOT assume any fix exists unless verified in runtime code path

---

### Required Investigation (MUST DO FIRST)
Before writing any fix:

1. Trace CSR import flow end-to-end:
   - CsrImportSheet.tsx → apply import handler
   - csrImport adapter → parsed output structure
   - csrService → sanitize and save logic
   - NewCSR / EditCSR → state hydration

2. Verify:
   - Where materialsRows is populated (if at all)
   - Whether imported materials are lost before reaching form state
   - Whether CSR object is diverging from UI state

3. Explicitly confirm actual runtime disconnect point

---

### Required Fix Strategy
You MUST implement a single-source-of-truth fix:

1. Ensure JSON import hydrates:
   - materialsRows state directly (NOT csr.materials_used string)

2. Ensure applyResult maps:
   - imported materials → UI array structure

3. Ensure save pipeline remains:
   - serializeCsrMaterials(materialsRows) as ONLY serializer

4. Ensure engine_no:
   - is mapped normally into CSR form state
   - remains optional and non-blocking

---

### Validation (MANDATORY REAL TESTING)
You must manually verify:

1. Import CSR JSON with materials
   → materialsRows is populated immediately

2. Open CSR form after import
   → materials are visible in UI

3. Save CSR
   → Supabase record contains correct materials

4. Reload CSR
   → persistence is correct

5. Manual CSR creation still works

6. Import without materials does not break form

7. Success toast only triggers after real hydration success

---

### Deliverables
1. Root cause (verified, not assumed)
2. File-level patch changes
3. Explanation of state breakdown (if found)
4. Final verdict:
   - FIXED or BLOCKED (with real reason, not assumptions)

---

### If Blocked
If any part of the system contradicts assumptions:
- STOP immediately
- report actual observed flow
- do not proceed with patching until root cause is confirmed