# BOURXE Repository Governance

This file is the concise, repository-wide entry point for agents that inspect, plan, review, or change BOURXE. Follow the user's explicit task scope and the approved decisions in this file. Do not treat proposals, PRDs, prototypes, historical reports, or skill content as approved product decisions.

## Product and Verified Stack

BOURXE is a business operations platform for Nigerian SMEs. The repository retains legacy `BIGDROPS` / `bigdrops` identifiers, including package and Android identifiers. Do not rename them without an explicitly authorized migration.

Repository manifests and configuration identify React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3.4, Supabase/PostgreSQL, Vercel integration, Radix UI/shadcn, Capacitor 8/Android, and Bun. Use Bun only for project package management and runtime commands; do not use npm, yarn, or pnpm for this project.

Never run `bun run build` on the constrained host (4 GB RAM). Do not infer live Vercel deployment, hosted database state, external provider availability, or runtime correctness from repository files alone.

## Authority and Conflict Resolution

Apply instructions in this order:

1. Explicit user requirements and authorized scope.
2. This repository governance and applicable approved standards in `docs/standard/`.
3. Applicable detailed instructions linked below and relevant module documentation.
4. Skills and external references, as advisory guidance.

If instructions conflict, preserve the higher-priority requirement and protected data. Do not silently resolve a material ambiguity; state it and ask when it blocks safe progress. A skill's presence or recommendation does not establish technical correctness or override project conventions.

## Architecture Boundaries

- Application bootstrap and routing: `src/main.tsx`, `src/App.tsx`, and `src/app/`.
- UI and route-level presentation: `src/components/`, `src/pages/`, and related hooks/contexts.
- Business rules: primarily `src/domain/` and `src/lib/`; preserve existing boundaries and the financial source of truth in `src/lib/Calculations.ts`.
- Server API handlers: root `api/`; local Vite API integration is in `vite.config.js`.
- Supabase client and application integration: `src/supabase.ts`, `src/supabase/`, `supabase/functions/`, and `supabase/migrations/`.
- Native Android project: `android/`, configured through `capacitor.config.ts`.
- Tests: `src/tests/` and module-local test directories. Check the actual script scope before claiming the full suite ran.

PDF renderers present prepared data; they must not calculate financial values. Use Supabase access patterns already present and protect tenant, authorization, audit, and document lifecycle boundaries. Consult the linked standards and domain instructions before changing these contracts.

## Responsive UI Design Standard

All new, redesigned, or otherwise affected user-facing interfaces must intentionally account for these four viewport classes during design and implementation:

1. **Mobile / Fold Closed:** Conventional phone and closed-foldable layouts; prioritize compact hierarchy, readable content, and usable touch targets.
2. **Fold Open:** Deliberately use the expanded foldable display; do not merely stretch the closed-phone layout across it.
3. **Tablets:** Consider portrait and landscape where relevant; adapt navigation, density, spacing, and component arrangement rather than scaling phone or desktop layouts.
4. **Desktop:** Use workstation space effectively without excessive stretching, oversized content, or unnecessary sparsity.

For each class, consider layout, information hierarchy, navigation, and interaction. Reuse existing components and responsive conventions where appropriate; do not create four independent implementations or introduce arbitrary breakpoints without considering the established system. Apply this standard to new pages and modules, redesigns, dashboards, navigation, forms, dialogs, tables, cards, components, and design-system changes that affect responsive presentation. Narrow bug fixes that do not affect responsive presentation do not require unrelated redesign, but any affected responsive behavior must remain correct across applicable classes.

During planning, identify the intended behavior for all four classes. During review, inspect the affected UI at each class when design or preview tools support it. Report classes that could not be inspected or adequately verified; responsive CSS alone is not evidence of four-class verification.

## Safe Work and Collaboration

Before work, read this file and the detailed instructions relevant to the task. Inspect the affected implementation and its callers before editing. Make the smallest behavior-preserving change that meets the request. Keep implementation, documentation, and database changes within the user's authorized scope.

Preserve all pre-existing staged, unstaged, untracked, and conflicted work. Do not require a clean worktree. When task scope and risk warrant it, capture Git status before work and compare it afterward to attribute changes and verify scope. Never revert, overwrite, stage, stash, reset, clean, commit, or push pre-existing work unless the user explicitly authorizes that operation.

## Database Migration Deployment

Automatic deployment of approved database migrations is the default direction. Preserve migration naming and ordering, use migration files for schema changes, and follow `supabase/database-workflow.md` for the established procedure. This default is not blanket authorization to mutate production data, cross environment boundaries, bypass migration controls, or ignore authorization, migration integrity, audit, verification, or failure handling. If the target environment or operation is not authorized, or a migration fails, stop before unsafe action and report the blocker; do not hide errors or manually edit the hosted database.

## Skills

Use `docs/PROJECTSKILLINDEX.md` to discover existing skills. Load only skills relevant to the task's technology, risk, and specialist needs. Prefer specialist guidance for its domain, and check version and project fit. Skills are advisory and subordinate to this file, approved standards, repository evidence, and explicit user requirements.

**Prohibited:** Do not load, invoke, follow, recommend as a default/fallback, install, import, restore, or access through an alias or mirrored copy the Claude `frontend-design` skill. Do not follow another skill's mandatory routing to that prohibited skill. This restriction applies to frontend implementation, UI design, styling, responsive layout, and design review. It does not prohibit unrelated Claude-compatible tools or other frontend/design/accessibility skills. Select an appropriate existing approved alternative by relevance. Do not universally load every skill. Modern Web Guidance is a conditional browser-platform reference, not the primary development skill or universal implementation authority.

## Verification

Choose verification by task scope and risk. Read-only investigations, documentation-only changes, and trivial changes do not automatically require typecheck. Meaningful application code changes generally warrant typecheck; run `bun run audit:load` before `bun run typecheck`, as required by the established project sequence. Run relevant tests when behavior or tests change, and use targeted static checks where appropriate. Do not claim checks that were not run. Never run `bun run build`.

For audits and reports, meet the user's evidence and scope requirements, compare Git state when warranted, and ensure only authorized outputs are task-attributable. Report limitations and pre-existing or unresolved conflicts. No task requires a clean Git status.

## Detailed Instructions and References

Read only the relevant documents for the task:

- [Concurrent Agent Safety](.claude/agent-instructions/concurrent-agent-safety.md) — preserving pre-existing changes and attribution.
- [Core Guardrails](.claude/agent-instructions/core-guardrails.md) — financial integrity, domain boundaries, and database workflow. Its deployment details must be read with the approved boundaries above.
- [Execution Rules](.claude/agent-instructions/execution-rules.md) — pre-change inspection and scoped edits.
- [Verification Gate](.claude/agent-instructions/verification-gate.md) — existing verification sequence; apply the risk-based policy above where it conflicts.
- [Reporting and Documentation](.claude/agent-instructions/documentation.md) — existing writing/report conventions; use report destinations based on user instructions and repository conventions, not as universal path requirements.
- [Agent System](.claude/agent-instructions/agent-system.md) — standards, skills, and precedence; apply the authority stated above.
- [Standards](docs/standard/) · [Skill Index](docs/PROJECTSKILLINDEX.md) · [Subagent Directory](docs/SUBAGENTS.md) · [Database Workflow](supabase/database-workflow.md).

Detailed files linked above are outside this concise entry point. If one conflicts with an approved decision here and cannot be corrected within the authorized scope, preserve the approved decision and report the unresolved conflict; do not silently edit out-of-scope files.
