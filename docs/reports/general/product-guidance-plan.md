# Product Guidance Plan Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Rewrite the tips approach as an implementation-ready Product Guidance and
Engagement System plan. Planning only. No code changes.

## Scope

- New plan document only.
- Current tips code and loading PRD were inspected as evidence.
- No source files modified.

## Files changed

- `docs/prd/Product-Guidance-Engagement-System.md` (the plan)
- `docs/reports/GENERAL/product-guidance-plan.md` (this report)

## Skills used: mobile-app-ui-design, mobile-android-design

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Wrote the full plan with all required sections: problem, goal, principles,
  loading relationship, engine concept, triggers, eligibility, rotation,
  presentation levels, contextual and inactivity guidance, workflow safety,
  animation, mascot framework, loading integration, accessibility, mobile
  behavior, content architecture, attention rules, scenarios, payment
  example, open questions, phases, non-goals.
- Confirmed the repetition defect in code: `useLoadingTip` resets tip,
  session count, and recent history on every deactivate.
- Kept the loading PRD authoritative. The plan extends it without override.

## Verification result

Verification:

- `bun run typecheck`: not run (no code changes, planning only)
- `bun run audit:load`: not run (no data-layer contact)
- `bun run build`: not run (hardware ban, and no code changes)
- `git status`: only the new plan document added (plus a pre-existing
  untracked vendor directory belonging to another agent, left intact)

## Risks or limitations

- Thresholds (45/90/120 seconds, cooldowns, caps) are recommendations.
  They need product review before implementation.
- Open architectural questions (§22 of the plan) need architect decisions
  before Phase 1 tickets.

## Deferred work

- Implementation tickets from the plan phases.
- Copy review of the existing tip library.
