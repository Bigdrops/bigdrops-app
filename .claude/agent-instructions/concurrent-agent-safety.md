# Concurrent Agent Safety

## Overview

Multiple AI agents may work on this repository at the same time. These rules prevent agents from destroying each other's work. They apply to every task.

## Rules

### Pre-existing Changes

- Treat any pre-existing uncommitted, staged, or untracked change as belonging to another agent.
- Do NOT destroy another agent's work.
- Do NOT delete untracked files, revert modifications, or overwrite files that you did not change.
- Do NOT revert changes because they cause typecheck, lint, or build failures. Pre-existing failures from another agent are not your responsibility. You verify that your own changes do not introduce new failures.
- A file that seems unrelated or contains errors is still protected.

### Forbidden Commands

Do not run these commands without explicit user authorization:

- `git reset`
- `git reset --hard`
- `git checkout -- <file>`
- `git restore <file>`
- `git clean`
- `git stash` (on another agent's work)
- Any equivalent command that discards or overwrites pre-existing work.

### Git Status Workflow

`git status` and `git diff` are for observation only. They do not permit cleanup.

For every task:

1. Capture `git status` before changes.
2. Record pre-existing modified/staged/untracked files.
3. Make only task-scoped changes.
4. Capture `git status` after changes.
5. Confirm no pre-existing files were reverted or overwritten.

### Collision Handling

- Before you modify any file, run `git status` and identify pre-existing changes.
- Modify only files required by the current task.
- If pre-existing changes block verification, do not modify or revert them. Report the conflict.
- If another agent modifies the same file, stop and report the collision. Do not overwrite or merge.

## Examples

### Good

```bash
# Before starting a task
git status
# Record: 2 modified, 1 untracked — none are yours yet
# Make only task-scoped changes
# After changes: git status — confirm pre-existing files unchanged
```

### Avoid

```bash
# DO NOT do this — you cannot know what changes were intentional
git checkout -- src/domain/invoice/calculations.ts
# DO NOT do this — pre-existing failures are not yours to revert
git restore src/lib/Calculations.ts
```
