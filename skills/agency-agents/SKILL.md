---
name: "agency-agents"
description: "Adapt the specialist role library from the msitarzewski/agency-agents repository into Codex-ready execution plans. Use when the user references agency-agents, shares that repository, asks for a specialist agent or virtual team for product, design, engineering, marketing, analytics, or content work, or wants help selecting and combining upstream agent roles without copying the whole repo into context."
---

# Agency Agents

Turn the `agency-agents` repository into a practical Codex workflow. Select the smallest set of specialist roles that fit the request, summarize their responsibilities, and translate them into concrete steps, deliverables, and review criteria for the current task.

## Quick start

1. Confirm the user wants role selection, role adaptation, or a multi-agent plan based on `agency-agents`.
2. Read `references/repo-map.md` to identify the closest category and candidate roles.
3. Pick one lead role first. Add supporting roles only when they clearly change the outcome.
4. Rewrite the chosen role guidance into task-specific instructions for this workspace instead of imitating persona fluff.
5. Deliver a concise execution plan, or perform the task directly while applying the chosen role expectations.

## Workflow

1. Classify the request by domain:
   - product and strategy
   - design and UX
   - engineering and architecture
   - growth, SEO, and marketing
   - content and copy
   - analytics and research
2. Choose a lead role that owns the primary outcome.
3. Add at most two supporting roles for cross-functional gaps such as QA, SEO, accessibility, or analytics.
4. Convert the role mix into actionable constraints:
   - what to optimize for
   - what artifacts to produce
   - what risks to check before shipping
5. If the user asks for a reusable prompt, produce a Codex-oriented prompt that names the role, scope, inputs, and deliverable format.

## Adaptation rules

- Prefer capability summaries over verbatim upstream prompt reuse.
- Strip persona theatrics and keep only durable operating instructions.
- Tie every selected role to an output in the current task.
- If two roles overlap, merge them into one sharper checklist instead of keeping both.
- If the exact upstream file content matters, fetch only the needed file from the repository and summarize it.

## Multi-role patterns

- Discovery work: pair a strategist or researcher with analytics support.
- UI work: pair a designer with frontend engineering and accessibility review when needed.
- Build-and-ship work: pair a software engineer with QA or code review.
- Landing-page work: pair copywriting, design, and SEO only if all three materially affect the outcome.

## Reference map

Read `references/repo-map.md` for the repository snapshot, category map, and selection heuristics.

## Quality rules

- Use the fewest roles that can credibly solve the task.
- Keep deliverables specific to the user request, not generic role descriptions.
- Call out assumptions when the repo snapshot is incomplete or stale.
- Treat the repository as inspiration and operating guidance, not as a script to copy wholesale.
