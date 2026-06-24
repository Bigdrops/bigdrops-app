# ROLE

You are a **Senior React PDF + TypeScript Engineer** for the BIGDROPS project.

Your task is to create a **brand-new CSR PDF template** inspired by the existing **Invoice Industry** template.

This is a **new template**, **NOT a modification** of PulseFrame, Crimson, Zinc, or SignalBands.

---

# REQUIRED SKILLS (MANDATORY)

Before writing any code you MUST follow the project skill system.

## Step 1

Read:

docs/PROJECTSKIILINDEX.md

## Step 2

Load these skills:

- using-superpowers
- react-pdf

If the loader fails:

- manually locate the skill paths from PROJECTSKIILINDEX.md
- open the corresponding SKILL.md files directly
- continue only after reading them.

If the skill files cannot be loaded manually, STOP and report failure.

---

# OBJECTIVE

Create a new CSR template that visually follows the design language of the **Invoice Industry template**.

The goal is to reuse its:

- header proportions
- spacing
- typography
- logo sizing
- alignment
- visual hierarchy

while still rendering CSR data.

This is **NOT** an invoice.

It is a CSR document that borrows the Invoice Industry branding style.

---

# IMPORTANT

DO NOT modify:

- PulseFrame
- Crimson
- Zinc
- SignalBands

They are production templates.

Create a completely new template.

---

# TEMPLATE NAME

Create:

IndustryCSR.tsx

under

src/components/csr/preview-templates/

Register it in the CSR template registry exactly the same way the other templates are registered.

---

# DESIGN SOURCE

Locate the existing Invoice Industry template.

Study it carefully.

Reuse its:

- header layout
- logo dimensions
- company information placement
- font sizes
- section spacing
- margins
- border treatment
- page rhythm

Do NOT guess.

Copy the visual system.

---

# HEADER REQUIREMENTS

The header should visually match the Invoice Industry template.

Specifically:

- same logo size
- same logo alignment
- same company name size
- same company information placement
- same whitespace
- same spacing after the header

The current PulseFrame header MUST NOT be copied.

Use the Invoice Industry header instead.

---

# BODY

Render the existing CSR Render Model.

Do NOT invent fields.

Consume the existing

CsrRenderModel

pipeline.

Do NOT bypass it.

---

# SIGNATURE SECTION

Reuse the corrected shared signature component.

Do NOT create another custom signature implementation.

No inline signature JSX.

No duplicated signature layout.

---

# COMMENTS

Support the existing compact Client Notes implementation.

No large multiline notes area.

---

# NO BUSINESS LOGIC

Do NOT modify:

- csrRenderModel
- buildCsrRenderModel
- calculations
- services
- database
- forms

Only create a presentation layer.

---

# NO DUPLICATION

If there are reusable helpers from the Invoice template:

extract or reuse them.

Do NOT duplicate styles unnecessarily.

---

# VALIDATION

Verify:

- header matches Invoice Industry proportions
- logo size matches Invoice Industry
- single-page rendering remains intact
- signatures render correctly
- PDF generation succeeds
- no TypeScript errors

Run:

bun run typecheck

and

bun run build

Both must pass.

---

# REPORT

Write a report to:

Task/reports/csr-industry-template.md

Include:

- files created
- files modified
- Invoice template files referenced
- reusable components reused
- styling decisions
- screenshots or rendering observations if available
- validation results
- confirmation that no existing CSR template was modified

---

# SUCCESS CRITERIA

✔ New template added

✔ Existing templates untouched

✔ Uses Invoice Industry visual style

✔ Uses existing CsrRenderModel

✔ Uses shared signature component

✔ Logo size matches Invoice Industry

✔ its obviously a different template from the others 

✔ Builds successfully

✔ Report written