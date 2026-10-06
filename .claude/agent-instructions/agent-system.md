# Agent System: Standards, Skills & Subagents

## Overview

Three interlocking governance layers control how agent instructions are resolved: **Standards** (`docs/standard/`), **Skills** (`.agents/skills/`, `.claude/skills/`), and **Subagents** (`docs/SUBAGENTS.md`). This file defines how they interact.

---

## Part 1: Standards

### Overview

Standards live under `docs/standard/`. This directory is normative.

### Rules

- Follow all active standards under `docs/standard/`.
- Do not silently diverge from a standard.
- If an implementation conflicts with a standard, fix the implementation or stop and ask.
- Extend an existing standard before creating a new one.
- Do not duplicate a concept already covered by an existing standard.
- If a standard is marked placeholder, coming soon, or excluded, do not treat it as authoritative unless the user says otherwise.
- New document modules must conform to:
  - `docs/standard/json-import-standard.md`
  - `docs/standard/document-column-standard.md`

### Rule Precedence

1. Explicit user instruction
2. `docs/standard/`
3. This file (including linked instructions)
4. Module-specific documentation

---

## Part 2: Skills

### Overview

Skills are the primary instruction mechanism for how work is performed.

### Loading

Load skills from one of these locations:

- `.agents/skills/`
- `.claude/skills/`
- `.mimocode/skills/`
- `.opencode/agents/`

Skill index: `docs/PROJECTSKILLINDEX.md`

### Rules

- If a skill is loaded, record it in the task report.
- A loaded skill may guide or override non-normative workflow behavior in this file.
- A skill must not silently override:
  - Active standards under `docs/standard/`
  - Financial calculation integrity
  - Document transformation integrity
  - Audit trail integrity
  - Database safety rules (including the mandatory push rule)
  - Security rules
- If a skill appears to conflict with any of those, stop and ask.

---

## Part 3: Subagents

### Overview

Subagents are optional.

### Usage

Use a subagent only when:

- The user explicitly asks for one, or
- No suitable skill exists and a specialist persona is clearly useful.

Subagent index: `docs/SUBAGENTS.md`

### Rules

- Subagents do not override skills.
- Subagents do not require delegation logs.
- Subagents must not bypass standards or locked business rules.
- If a skill and a subagent conflict, follow the skill.
- If the user gives direct instruction, follow the user.
