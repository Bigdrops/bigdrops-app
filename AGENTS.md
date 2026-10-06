# AGENTS.md — BIGDROPS AI Agent Guide

## Project

B2B business management suite for Nigerian SMEs. Stack: React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase/Postgres, Vite 7, Bun, Vercel, Capacitor 8. Package Manager: Bun only (no npm/yarn/pnpm).

## Commands

```bash
bun install
bun run audit:load    # MUST run before typecheck
bun run typecheck     # NO build — limited RAM; manual use by project lead only
bun run lint
bun run test
bun run dev
```

## Architecture Map

```
src/app/          App bootstrap
src/components/   UI components and reusable UI modules
src/domain/       Business logic, module rules, types, factories
src/lib/          Core utilities, formatters, Calculations.ts
src/modules/      Module integrations and adapters
src/pages/        Route-level pages
src/supabase/     Database client
src/tests/        Critical tests
```

Business logic lives in `src/domain/` or `src/lib/`. PDF components are renderers only. Database access goes through the Supabase layer.

## Naming Conventions

- Components: PascalCase · Files: kebab-case · Database fields: snake_case

## Detailed Instructions

- [Concurrent Agent Safety](.claude/agent-instructions/concurrent-agent-safety.md) — git safety, pre-existing changes
- [Core Guardrails](.claude/agent-instructions/core-guardrails.md) — financial integrity, domain boundaries, database rules
- [Execution Rules](.claude/agent-instructions/execution-rules.md) — pre-change checklist, surgical changes
- [Verification Gate](.claude/agent-instructions/verification-gate.md) — commands to run before reporting completion
- [Reporting & Documentation](.claude/agent-instructions/documentation.md) — report format, ASD-STE100 writing standard
- [Agent System](.claude/agent-instructions/agent-system.md) — standards, skills, subagents, rule precedence
- [Standards](docs/standard/) • [Skills](docs/PROJECTSKILLINDEX.md) • [Subagents](docs/SUBAGENTS.md) • [Database Workflow](supabase/database-workflow.md)
