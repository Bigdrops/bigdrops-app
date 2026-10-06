# Verification Gate

## Overview

Run these checks before you report task completion. This gate ensures that every task ships with passing typecheck, clean git status, and (when SQL changed) a successful Supabase push.

## Rules

### Standard Verification

Run these commands before reporting completion:

```bash
bun run audit:load
bun run typecheck
git status
```

If the task changed tests, also run:

```bash
bun run test
```

If the task changed SQL or the database:

```bash
supabase db push
```

The push MUST succeed before you report completion. See [Core Guardrails — Database Guardrails](core-guardrails.md).

### Build Restriction

```bash
bun run build
```

must not be used as a normal verification step. The local machine has limited RAM. Build testing is reserved for manual use by the project lead.

### Verification Reporting

When reporting results, state exact outcomes. For example:

```
Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: clean
- supabase db push: passed
- bun run build: skipped due to hardware policy
```

If no SQL changed, write:

```
Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: clean
- supabase db push: not applicable
- bun run build: skipped due to hardware policy
```

## Notes

- Run `bun run audit:load` before `bun run typecheck` — this is a hard prerequisite.
- Pre-existing failures from another agent (see [Concurrent Agent Safety](concurrent-agent-safety.md)) are not introduced by your changes. Report them as limitations, not as regressions you caused.
