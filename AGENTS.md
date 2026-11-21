# BOUXRE Repository Governance

This file is the concise, repository-wide entry point for agents that inspect, plan, review, or change BOUXRE. Follow the user's explicit task scope and the approved decisions in this file. Do not treat proposals, PRDs, prototypes, historical reports, or skill content as approved product decisions.

## Product and Verified Stack

BOUXRE is a business operations platform for Nigerian SMEs. The repository retains legacy `BIGDROPS` / `bigdrops` identifiers, including package and Android identifiers. Do not rename them without an explicitly authorized migration.

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

## First-Class Guidance (Mandatory Consultation Gate)

| # | Source | Location | Apply to |
| :--- | :--- | :--- | :--- |
| 1 | `modern-web-guidance` (skill) | `.agents/skills/modern-web-guidance/SKILL.md` (corpus: `guides/`) | Browser-platform behaviour — HTML, CSS, DOM, forms and validation, overlays (dialog/popover/menu), client-side JS, accessibility, Core Web Vitals, security |
| 2 | `bigdrops-free` (approved component library — ReUI v2.8.0 catalog) | `docs/templates/bigdrops-free.md` | Component inventory and composition — data grid, filters, stepper, and the primitives absent from base shadcn/ui |
| 3 | `kinetics` (approved component library) | `docs/templates/kinetics.md` | Motion vocabulary — spring/glide easing, micro-interaction timing, hover and reveal choreography |
| 4 | `water-melon` (approved component library — Watermelon Platform) | `docs/templates/water-melon.md` | Block and dashboard composition — surface hierarchy, elevation, border opacity, density idioms |

UI work is blocked until the applicable ones are applied.

Run the skill with `bunx modern-web-guidance@latest` — not `npx`, `npx.cmd`, or `pnpx`.

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

Use `docs/PROJECTSKILLINDEX.md` to discover existing skills. Load specialist skills by relevance to the task's technology, risk, and needs — relevance gating applies only to those specialist skills, never to the four first-class sources above, which are mandatory on every task. Prefer specialist guidance for its domain, and check version and project fit. Skills are advisory and subordinate to this file, approved standards, repository evidence, and explicit user requirements.

**Prohibited:** Do not load, invoke, follow, recommend as a default/fallback, install, import, restore, or access through an alias or mirrored copy the Claude `frontend-design` skill. Do not follow another skill's mandatory routing to that prohibited skill. This restriction applies to frontend implementation, UI design, styling, responsive layout, and design review. It does not prohibit unrelated Claude-compatible tools or other frontend/design/accessibility skills. Select an appropriate existing approved alternative by relevance. Do not universally load every other skill. `modern-web-guidance` and the three `docs/templates/` approved component libraries are the exception: all are used on every task, and Modern Web Guidance is the primary authority for web-platform behaviour rather than a conditional reference.

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
- [Modern Web Guidance Skill](.agents/skills/modern-web-guidance/SKILL.md) — first-class guidance; read before any HTML/CSS/DOM/client-side JS work. Its audit and known gaps: [Modern Web Guidance audit](docs/reports/agent-skills/2026-11-21-modern-web-guidance-audit.md).
- [Approved Component Libraries](docs/templates/) — `bigdrops-free.md`, `kinetics.md`, `water-melon.md`: first-class read-only build material for components, motion, and composition; each stub locates its local prototype.
- [Standards](docs/standard/) · [Skill Index](docs/PROJECTSKILLINDEX.md) · [Subagent Directory](docs/SUBAGENTS.md) · [Database Workflow](supabase/database-workflow.md).

Detailed files linked above are outside this concise entry point. If one conflicts with an approved decision here and cannot be corrected within the authorized scope, preserve the approved decision and report the unresolved conflict; do not silently edit out-of-scope files.

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- For any AWS task or question — building, configuring, migrating, debugging, or operating a service, writing SDK code, authoring CDK/CloudFormation, or answering how a service works — first call `aws___search_documentation` with topic `agent_skills` and load the matching skill with `aws___retrieve_skill`. Do this even when you believe you know the answer: skills carry current service behavior that your training may not. Prefer the skill's guidance over general knowledge. Skip it only for work that does not involve AWS.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->
