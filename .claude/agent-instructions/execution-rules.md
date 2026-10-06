# Execution Rules

## Overview

A checklist for every code change. Follow this sequence before, during, and after modification to ensure surgical, correct changes.

## Rules

### Pre-Change Checklist

Before you change code:

1. Understand the task.
2. Identify affected files.
3. Check callers and shared usage before editing utilities.
4. Load the matching skill if one exists (see `docs/PROJECTSKILLINDEX.md`).
5. Plan the change.
6. Make the smallest correct change.
7. Verify.

### Change Rules

- Make surgical changes only.
- Do not refactor unrelated code.
- Do not rename unrelated symbols.
- Do not change business behavior unless requested.
- Preserve audit trails, document lineage, and existing output behavior.
- Prefer simple, readable control flow over abstraction.

## Examples

### Good

```bash
# 1. Understand — read the task requirements
# 2. Identify files — grep for affected symbol usage
# 3. Check callers — find all importers of the function
# 4. Load skill — open .claude/skills/react-dev/SKILL.md if React work
# 5. Plan — decide the minimal edit needed
# 6. Edit — change only what is required
# 7. Verify — run typecheck and test
```

### Avoid

```bash
# DO NOT refactor an entire file when only one function needs changing
# DO NOT rename symbols beyond the task scope
# DO NOT change business rules without explicit instruction
```
