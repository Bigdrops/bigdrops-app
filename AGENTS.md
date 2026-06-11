# AGENTS.md

## 1. Project Identity
BigDrops is a logistics tracking platform for physical custody management, item verification, and transit tracking. It serves logistics companies, warehouse management teams, and businesses with physical inventory requiring real-time tracking and custody verification.

**Tech Stack**: React/Next.js frontend, Node.js backend, Tailwind CSS v3 + shadcn/ui, Supabase PostgreSQL, Capacitor mobile integration, TypeScript, Vite.

**Runtime Environment**: Browser-based web application using Capacitor for mobile deployment with Bun package manager.

## 2. Hard Architecture Rules
- Waybill module strips commercial metrics to protect profit margins
- Three-state segmented filter: `[All] | [External] | [Internal]`
- Waybill numbering: `AWB-E-000001` (external) or `AWB-I-000001` (internal)
- Manual entries: `AWB-ME-000001` or `AWB-MI-000001`
- No Tailwind v4 syntax, no framer-motion
- Never modify `src/lib/Calculations.ts` without explicit instruction
- Waybill numbers: `${basePrefix}-${manualToken}${routingToken}-${serializedNumber}`

## 3. File Structure Map
- `src/app/` - Application routing and layout
- `src/components/` - Reusable UI components
- `src/lib/` - Core application libraries and business logic
- `src/domain/` - Domain models and data structures
- `src/pages/` - Page-level components
- `src/services/` - API integrations
- `src/types/` - TypeScript type definitions
- `src/hooks/` - Custom React hooks
- `src/context/` - React context providers
- `src/config/` - Application configuration
- `src/auth/` - Authentication mechanisms
- `src/styles/` - Global styling and design system

## 4. Naming Conventions
- Components: `WaybillList` (PascalCase), `waybill-list` (kebab-case)
- Files: `waybill-form.tsx`, `20260520090000_core_tables.sql`
- Fields: `waybill_number`, `client_id`, `transport_mode` (snake_case)
- Waybill Numbers: `AWB-E-000001`, `AWB-ME-000001`

## 5. Skills Registry
**`.agents/skills/`** (15 skills):
- `accessibility` - WCAG 2.2 compliance and accessibility audits
- `deploy-to-vercel` - Vercel deployment with CLI auth and preview URLs
- `frontend-design` - Production-grade UI design avoiding "AI slop"
- `nodejs-backend-patterns` - Production-ready Node.js backends
- `nodejs-best-practices` - Node.js framework selection and async patterns
- `pdf-rendering-correctness` - PDF generation preventing data mutation
- `seo` - Technical SEO including structured data
- `shadcn` - shadcn/ui components and form patterns
- `supabase-postgres-best-practices` - Postgres performance optimization
- `tailwind-css-patterns` - Tailwind CSS utility-first styling
- `tailwind-v4-shadcn` - Tailwind v4 with shadcn/ui using `@theme inline`
- `typescript-advanced-types` - Advanced TypeScript generics and conditional types
- `vercel-composition-patterns` - React composition avoiding boolean prop proliferation
- `vercel-react-best-practices` - React/Next.js performance optimization (70 rules)
- `vite` - Vite build tool with SSR and environment API

**`.claude/skills/`** (5 skills):
- `awesome-claude-skills` - Collection of 30+ bundled sub-skills
- `Karpathy` - Coding discipline with goal-driven execution
- `skill-creator` - SKILL.md structure for meta-skill creation
- `ui-ux-pro-max` - UI/UX design intelligence with 67 styles
- `webapp-testing` - Playwright-based web app testing

## 6. Module Status
| Built | In Progress | Pending |
|-------|------------|---------|
| Waybill module | Item library | Advanced invoice workflows |
| Authentication system | Mobile Capacitor setup | Export hub integration |
| Dashboard interface | Waybill forms | Performance optimization |

**Migrations**: All 11 Supabase migrations completed

## 7. Workflow Rules
- Bun only - Never npm or yarn
- Run `bun run audit:load` before typecheck or build
- Read relevant skill files before writing code
- No Tailwind v4 syntax
- No framer-motion
- Never modify `src/lib/Calculations.ts` without explicit instruction

## 8. No-Touch Zones
**Files**: `src/lib/Calculations.ts`, `docs/WAYBILL_ARCHITECTURE.md`, migration scripts, `package.json`, `vite.config.ts`, skills directories

**Functions**: Waybill number generation, validation gates, three-state filter system, prefix engine, PDF rendering rules

**Database**: Waybill constraints, purpose field checks, items validation, access policies

The AGENTS.md file has been successfully created at the project root.