# BOUXRE

**BOUXRE** is a business operations platform for Nigerian SMEs. The repository and integrations retain legacy `BIGDROPS` / `bigdrops` identifiers. This README uses the product name without an acronym expansion because no independent source for the expansion was verified.

> **Compatibility:** Do not rename legacy identifiers, package names, Android IDs, database objects, routes, APIs, or storage paths without an explicitly authorized migration.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev)
[![Bun](https://img.shields.io/badge/Bun-Runtime-000?logo=bun)](https://bun.sh)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor)](https://capacitorjs.com)

This repository contains a React web application, server API handlers, Supabase migrations and Edge Functions, and a Capacitor Android project. Local configuration does not establish live deployment or hosted database state. Vercel configuration is present, but Git-based Vercel deployment is disabled in `Vercel.json`; no live deployment claim is made here.

## Product capabilities

The codebase contains implementation areas for commercial documents, procurement, pricing, logistics, service reports, projects, accounting, tax/compliance, reporting, company administration, the Bolu assistant, and Android support. This confirms repository implementation exists in those areas, not that every workflow is complete, enabled, or production-ready.

| Status | Meaning |
|---|---|
| **Implemented area (code present)** | Repository code exists for the workflow; this does not certify completeness, production availability, or regulatory compliance. |
| **Partial / verify** | Implementation exists, but end-to-end completeness or production enablement is not established here. Check the relevant route, service, domain logic, policies, and runtime configuration. |
| **Planned / experimental** | A PRD, design, roadmap, or prototype describes the work, but current application evidence does not establish delivery. Use this status only when the source document supports it. |
| **Retired** | This README does not establish a comprehensive retired-feature list. Do not infer retirement from an old PRD or an absent route alone. |

The codebase contains implementation areas for commercial documents, procurement, pricing, logistics, service reports, projects, accounting, tax/compliance, reporting, company administration, the Bolu assistant, and Android support. This is not an exhaustive feature-status audit. A compliance-related feature is not a claim of legal or regulatory certification.

### Bolu and Cloudzyro

Bolu is BOUXRE's conversational business-operations assistant. Repository code provides Bolu chat API handlers, including streaming chat, and a persistent Bun backend entry point in `server.ts`. An integration report dated 2026-11-16 records deployment of that backend as Cloudzyro service `bouxre-api` at `https://bouxre-api.cloudzyro.app`; a later report records triggering a Version 7 build. These are historical repository records, not verification of the current live deployment. See [`docs/integrations/persistent-bun-vps-deployment.md`](docs/integrations/persistent-bun-vps-deployment.md) for the documented deployment approach.

## Technology

| Area | Repository configuration |
|---|---|
| Web UI | React 19, TypeScript 5.9, React Router 7 |
| Build and development server | Vite 7 |
| Styling and UI | Tailwind CSS 3.4, Radix UI primitives, shadcn/ui ecosystem |
| Server-side data and auth | Supabase, PostgreSQL, Supabase Auth and Storage |
| API deployment integration | Vercel-compatible `api/` handlers and `Vercel.json` routing |
| Native app | Capacitor 8 with Android project |
| Package manager and runtime | Bun only for project commands and dependency management |

Versions above reflect current repository manifest ranges, not a guarantee about production deployment versions. Use Bun for project package operations; do not use npm, yarn, or pnpm.

## Repository map

```text
api/                 Server API handlers
android/             Capacitor Android project
src/
  app/               Application bootstrap/support
  components/        Shared and feature-specific UI
  domain/            Business rules and domain types
  hooks/             React hooks
  lib/               Shared utilities and core business logic
  modules/           Feature modules and adapters
  pages/              Route-level UI
  services/           Service integrations
  supabase.ts         Browser Supabase client
  tests/              Application tests
supabase/
  functions/          Supabase Edge Functions
  migrations/         Ordered database migrations
  database-workflow.md Database migration and verification guidance
docs/                 Standards, product docs, reports, and skill index
```

The exact boundaries vary by feature. Follow existing code and the repository governance in [`AGENTS.md`](AGENTS.md), rather than inferring architecture from directory names alone.

## Setup and development

### Requirements

- Bun
- Git
- Authorized Supabase project configuration for the features you need

### Install and run

```sh
git clone https://github.com/Bigdrops/bigdrops-app.git
cd bigdrops-app
bun install
```

Create a local `.env` file from `.env.example` and fill only the values required for your local work. Do not commit `.env` or put server-only secrets in `VITE_*` variables. The browser requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; API handlers and optional integrations may require additional server-side variables described in `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or other server credentials to the client.

Start the Vite development server:

```sh
bun run dev
```

`vite.config.js` provides local `/api/*` middleware for API handlers. Vercel routing is described in `Vercel.json`. Supabase Edge Functions are located under `supabase/functions/`; their deployment and hosted state are environment-dependent.

## Available commands

These commands are defined in the root `package.json`. Run only checks appropriate to the task and authorized environment.

| Command | Defined behavior |
|---|---|
| `bun run dev` | Start Vite development server. |
| `bun run start` | The current `start` script delegates to `bun run server`, but no `server` script is defined in the root manifest. Treat this command as unresolved; `bun run dev` is the documented local development command. |
| `bun run typecheck` | Run `tsc --noEmit`. Use for meaningful application code changes when proportionate; first run `bun run audit:load` according to the established project sequence. |
| `bun run lint` | Run ESLint across the repository. |
| `bun run test` | Run Node's test runner over `src/tests/critical/*.test.js`; it does not cover every test file in the repository. |
| `bun run audit:load` | Run the repository's static Supabase query-load risk scan. Run it before typecheck as required by the current project sequence. Treat findings as heuristic review signals, not a full test. |
| `bun run audit:supabase-queries` | Run the query audit script defined in `package.json`. Its current script invokes `npx tsx`; that conflicts with the Bun-only policy and should not be used until the invocation is reconciled. |
| `bun run preview` | Preview an available Vite production build. |
| `bun run build` | **Do not run on the constrained host.** The host has a 4 GB RAM limit. |
| `bun run bolu:setup` | Invoke the PowerShell provider setup script defined in `package.json`; use only when the task requires it and review that script first. |
| `bun run android:debug`, `bun run android:debug:release`, `bun run android:test-release` | Run the Android scripts defined in the project. Use only when the task requires and the environment supports them. |

Typecheck is risk-based, not automatic for documentation-only, read-only, or trivial changes. Never run the build command. The current working tree may contain other work; preserve it and verify task scope rather than requiring a clean tree. See `AGENTS.md` for the authoritative verification and safety rules.

## Database changes and deployment

Automatic deployment of approved database migrations is the default direction. For an authorized migration task, use the existing automatic deployment path, migration naming and ordering conventions, and [`supabase/database-workflow.md`](supabase/database-workflow.md). Preserve environment and authorization boundaries, migration integrity, audit, verification, and failure handling. This default does not authorize arbitrary production data mutation or bypassing migration controls. If the target environment or operation is outside the task's authorization, stop before deployment. Do not infer hosted schema or migration status from local files.

## Architecture and engineering governance

Business rules are primarily in `src/domain/` and `src/lib/`; preserve existing feature boundaries and the financial calculation source of truth. UI is implemented with React and existing shared/Radix-based components. API handlers, Supabase Edge Functions, and Android native integration have separate runtime boundaries. Detailed rules are in the applicable standards and linked instructions.

- [`AGENTS.md`](AGENTS.md) — repository governance authority, safety, scope, and verification.
- [`docs/standard/`](docs/standard/) — approved engineering standards.
- [`supabase/database-workflow.md`](supabase/database-workflow.md) — migration workflow.
- [`docs/PROJECTSKILLINDEX.md`](docs/PROJECTSKILLINDEX.md) — existing specialist skill discovery. Load skills only when relevant. Modern Web Guidance is a conditional browser-platform reference, not the primary development skill. The Claude `frontend-design` skill and identifiable mirrors or aliases are prohibited; use a relevant existing approved alternative.
- [`docs/SUBAGENTS.md`](docs/SUBAGENTS.md) — repository subagent catalog; use only when applicable and authorized.

PRDs, designs, roadmaps, prototypes, and historical reports can contain proposals. They are not automatically approved requirements or proof that a feature is implemented.

## Brand assets and compatibility

The existing brand artwork and design references are documented under `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/`. The 404 prototype is under `docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Temps/404-v1.html`. These are design references, not proof that every screen matches them.

The product is BOUXRE, while technical and historical identifiers can remain `BIGDROPS` or `bigdrops`. Preserve compatibility unless a separately authorized migration explicitly covers the affected identifiers and systems.

## License

This is proprietary software. Follow the organization's distribution and access requirements.
