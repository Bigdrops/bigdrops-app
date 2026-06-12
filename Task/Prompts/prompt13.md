

**Task: Generate `README.md` and `AGENTS.md` for the BIGDROPS project**

Before writing a single line, read these files in this exact order:

1. `.agents/PROJECTSKIILINDEX.md` — full skills registry, read every row
2. `docs/TECHNICAL_SPEC.md` — core entities, domain layer, module structure
3. `docs/WAYBILL_ARCHITECTURE.md` — waybill module architecture
4. `package.json` — actual stack, scripts, and dependencies
5. `supabase/migrations/` — list all migration filenames
6. `src/` — top-level directory scan only, no deep reading

Do not write anything until all six sources are read.

---

### DELIVERABLE 1: `README.md` (Public-Facing, Root Level)

This is a **public GitHub README**. It must look professional, impressive, and immediately communicate what the platform does to a developer or potential client visiting the repo.

**Required sections in order:**

**1. Hero Section**
- Large bold project name with a one-line description
- Stack badges using shields.io — include: React, TypeScript, Tailwind CSS, Supabase, Vite, Bun, Vercel, Capacitor
- Status badges: build status, license, last commit

**2. What is BIGDROPS**
- 3–4 sentence description of the platform — B2B business management, Nigerian market, invoicing/quotations/CSR/waybills/payments/projects
- Do not describe it as a "logistics platform" — it is a full business management suite

**3. Core Modules Table**
A clean markdown table listing every built or in-progress module with a one-line description:
Invoices, Quotations, CSR, Payments, Projects, Waybills (External + Internal), Client Management

**4. Tech Stack Section**
Two columns — Category and Technology. Cover: Frontend, Language, Styling, Database, Auth, Storage, Build Tool, Runtime, Deployment, Mobile

**5. Project Structure**
Condensed directory tree showing top-level folders only with one-line annotations

**6. Getting Started**
```bash
# Clone
git clone https://github.com/Bigdrops/bigdrops-app.git

# Install
bun install

# Dev server
bun run dev

# Build
bun run build
```
Note: Bun only. Never npm or yarn.

**7. Scripts Reference**
Table of all scripts from `package.json` with descriptions

**8. Architecture Highlights**
3–5 bullet points on key design decisions — single source of truth for calculations, field masking rules, waybill prefix engine, JSONB validation, invoice-to-waybill spawning

**9. Contributing / Agent Workflow**
One paragraph noting that AI coding agents operate via `.agents/` skill system and must read `AGENTS.md` before any task

**Format rules:**
- Use emoji section headers sparingly but meaningfully
- shields.io badges must be real and correctly formatted
- No filler sentences
- Must look good on GitHub's rendered markdown

---

### DELIVERABLE 2: `AGENTS.md` (Dev/Agent-Facing, Root Level)

This file is read by every AI coding agent before they touch the repo. It must be dense, scannable, and authoritative.

**Required sections:**

**1. Project Identity**
- Platform: B2B business management suite for Nigerian SMEs
- Stack: React, TypeScript, Tailwind CSS v3, Supabase, Vite, Bun, Vercel, Capacitor
- Runtime: Bun — never npm or yarn

**2. Hard Architecture Rules** (non-negotiable, never override)
- `src/lib/Calculations.ts` — single source of truth for all financial calculations. Never modify without explicit instruction
- Quotations must reuse the invoice domain layer — never duplicate logic
- PDFs are dumb renderers — they receive shaped data, never compute
- No Tailwind v4 syntax — project is on v3
- No framer-motion
- Waybill numbers follow the prefix engine: `[PREFIX]-[M?][E|I]-[000000]`
- `purpose` field is NULL for internal waybills — enforced by DB constraint
- `items` JSONB arrays must pass structural validation — never write raw unvalidated arrays

**3. File Structure Map**
Extract from `src/` scan — one line per directory

**4. Naming Conventions**
- Components: PascalCase
- Files: kebab-case
- DB fields: snake_case
- Invoice numbers: extract format from migrations or TECHNICAL_SPEC
- Waybill numbers: `AWB-E-000001`, `AWB-ME-000001`

**5. Skills Registry**
Copy the full table from `.agents/PROJECTSKIILINDEX.md` verbatim — both `.agents/skills/` and `.claude/skills/` sections

**6. Module Status**
Three-column table — Built | In Progress | Pending
Infer from migration filenames and directory structure. Do not invent entries.

**7. Workflow Rules**
- Bun only
- Run `bun run audit:load` before typecheck or build
- Read relevant SKILL.md files before writing any code
- PowerShell PATH note: `C:\Users\DELL\.bun\bin` must appear before Kiro's stub at `AppData\Local\Kiro-Cli\bun`
- Lint excludes: `android/` and `dist/` must be in `.eslintignore`

**8. No-Touch Zones**
Files, functions, and DB constraints that must never be modified without explicit written instruction

**Format rules:**
- Pure markdown, no HTML
- Every section must be scannable in under 30 seconds
- Use tables over bullet lists where applicable
- Zero placeholders — if you can't determine a value, flag it at the end as an open question

---

**Done when:**
- `README.md` exists at project root, renders correctly on GitHub, all badges are valid
- `AGENTS.md` exists at project root, covers all 8 sections, skills table matches `PROJECTSKIILINDEX.md` exactly
- No placeholders in either file
- Open questions listed at the end if anything was genuinely unresolvable

Do not ask questions before starting. Read the files, write both documents, list open questions at the end.

---

