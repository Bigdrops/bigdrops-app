

***

### **ORCHESTRATION & AGENTS**
**Primary Agents:** @minimal-change-engineer, @frontend-developer, @code-reviewer
**Pipeline Manager:** @agents-orchestrator

**MANDATORY SKILLS TO CONSULT:**
Before writing any code, you are strictly commanded to bypass any tool failures and manually read the following skill files from the workspace [1]:
- **Skill #1:** `.mimocode/skills/ponytail/SKILL.md` (Lazy senior dev mode: YAGNI, root-cause fixes) [2]
- **Skill #2:** `.claude/skills/karpathy/SKILL.md` (Surgical changes, simplicity first) [3]
- **Skill #4:** `.agents/skills/pdf-rendering-correctness/SKILL.md` (PDF pipeline integrity) [4]
- **Skill #10:** `.agents/skills/typescript-advanced-types/SKILL.md` (Type-safe patterns) [4]
- **Skill #15:** `.agents/skills/react-pdf/SKILL.md` (PDF generation logic) [4]
- **Skill #81:** `.agents/skills/react-dev/SKILL.md` (React 19 / TypeScript standards) [5]

---

### **PROJECT CONTEXT**
**Project:** BIGDROPS Business Platform [6]
**Stack:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel [7]
**Runtime:** **Bun only.** Never use npm, yarn, or pnpm [7].
**Critical Instruction:** Read `AGENTS.md` and `docs/PROJECTSKILLINDEX.md` before modifying any code [1, 8].

---

### **OBJECTIVES**

#### **PART 1 — Fix the New CSR crash**
Investigate why opening a brand new CSR throws: `Cannot read properties of null (reading 'duplicateState')`.
- Audit the document form consolidation in `src/pages/CsrFormPage.tsx`.
- Ensure "New", "Edit", and "Duplicate" workflows all handle state initialization correctly.
- Do not remove existing functionality; fix the root cause only.

#### **PART 2 — Improve Call Type UX**
Refine the dropdown experience for **Call Type** and **Service Basis**.
- **Call Type Options:** Breakdown, Preventive Maintenance, Installation, Commissioning, Inspection, Emergency Repair, Other.
- **Service Basis Options:** Paid Service, AMC, Warranty.
- **Requirement:** Both must begin with a **"Select..."** option.
- **Logic:** "Select..." is NOT a stored value; internally it must behave as an empty string or null.

#### **PART 3 — Hide Empty Fields**
Apply a "Hide if Empty" policy to **Call Type** and **Service Basis**.
- If a field is empty, **DO NOT** render it (do not show a blank label).
- Apply this consistently to: CSR Preview, CSR PDF, every preview template, and Document Preview.

#### **PART 4 — Preserve Backwards Compatibility**
- Existing records containing "Warranty", "AMC", or "Paid Service" inside the `call_type` field must continue to display correctly.
- Only new records should be required to populate the new `service_basis` field.

---

### **FILES TO AUDIT**
- `src/pages/CsrFormPage.tsx`
- `src/pages/NewCSR.tsx` / `src/pages/EditCSR.tsx`
- `src/components/csr/CsrFormScreen.tsx`
- `src/components/csr/csrUtils.ts`
- `src/domain/csr/csrRenderModel.ts`
- `src/domain/csr/csrService.ts`

---

### **CONSTRAINTS**
- **Minimal Surgical Changes:** Refuse scope creep [9].
- **No Redesign:** Do not change the database schema or create migrations.
- **No Build:** Do not run `bun run build`. Use `bun run typecheck` to verify [7, 10].

---

### **OUTPUT & VERIFICATION**
**Verification Steps:**
1. Run `bun run typecheck` and `bun run audit:load` [10].
2. Verify "Select..." stores no value.
3. Verify historical records still render correctly.

**Final Deliverable:**
Save a comprehensive report to `docs/Reports/CSR/csr-call-type-finalisation.md` detailing the root cause of the crash, the exact fix applied, and results of the verification checklist.