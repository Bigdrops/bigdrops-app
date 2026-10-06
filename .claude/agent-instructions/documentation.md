# Reporting & Documentation Standard

## Overview

Two related concerns governed in one file: the format of task completion reports (§9) and the writing standard for all technical documentation (§10). Both use ASD-STE100 Simplified Technical English.

---

## Part 1: Reports

### Overview

Every completed task must produce a report under `docs/reports/<domain>/`. Reports must not be placed in the repository root.

### Report Location

```
docs/reports/<domain>/
```

Examples:

```
docs/reports/invoice-quote/
docs/reports/WAYBILL/
docs/reports/GENERAL/
docs/reports/boq-rfq/
docs/reports/CSR/
docs/reports/ANDROID/
docs/reports/json-import/
docs/reports/item-library/
```

### Report Format

Each report must begin with a title and identity line:

```markdown
# Waybill PDF Adjustment Report

This report was written by Qwen on 2026-07-04 via Local Runner.
```

Use the actual AI name, date, and harness. Do not use placeholder text.

### Required Fields

Each report must include:

- Objective
- Scope
- Files changed
- Skills used
- Documentation standard
- Changes made
- Verification result (include the push result if the task changed SQL)
- Supabase push status
- Risks or limitations
- Deferred work

Required fields in exact format:

```markdown
Skills used: <exact-skill-name>, <exact-skill-name>
Documentation standard: ASD-STE100 Simplified Technical English
```

If no skill was used:

```markdown
Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English
```

If a subagent was used, include it (optional):

```markdown
Subagent used: <subagent-name>
```

If no subagent was used, omit that line.

### Verification Section

Must state exact results. For example:

```
Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: clean
- supabase db push: passed
- bun run build: skipped due to hardware policy
```

If no SQL changed:

```
Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: clean
- supabase db push: not applicable
- bun run build: skipped due to hardware policy
```

---

## Part 2: Documentation Standard (ASD-STE100)

### Overview

All technical documentation must adhere to ASD-STE100 Simplified Technical English. This applies to architecture documents, design documents, pattern documents, READMEs, specifications, API documentation, developer guides, contribution guides, AI-generated documentation, and reports.

### Writing Rules

- Use short, direct sentences.
- Use active voice.
- Use consistent terminology.
- Define technical terms before using them.
- Explain concepts before implementation details.
- Use one idea per paragraph.
- Prefer bullet lists and tables over long prose.
- Remove unnecessary adjectives and filler.
- Do not use marketing language.
- Do not use conversational language.
- Do not use AI-style hedging.
- Avoid repetition.
- Make documents easy to scan.

### Documentation Workflow

1. Inspect existing documentation first.
2. Identify the authoritative source document.
3. Extend existing documentation before creating a new document.
4. Cross-reference related documents instead of duplicating information.
5. Keep terminology consistent.
6. Update links when files move.

Duplicate documentation is a defect.
