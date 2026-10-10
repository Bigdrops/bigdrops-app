![BOURXE](docs/prd/Adaptive%20Mobile-First%20UIUX%20Facelift%20PRD/Design-direction/icons/appstore.png)

# BOURXE

**BOURXE** — Business Operations, Unified Resources & eXecution Engine — is an integrated business operations platform for Nigerian SMEs.

It brings commercial documents, finance, procurement, logistics, service operations, projects, compliance, reporting, and company administration into one system.

> BOURXE is the current product name. Existing `BIGDROPS` / `bigdrops` identifiers remain in repository infrastructure, database objects, environment configuration, routes, APIs, storage paths, and other compatibility-sensitive areas. They should change only through an explicitly scoped migration.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev)
[![Bun](https://img.shields.io/badge/Bun-Runtime-000?logo=bun)](https://bun.sh)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://vercel.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor)](https://capacitorjs.com)

---

## Overview

BOURXE provides a shared operational workspace for company staff to manage business activity from initial commercial requests through documentation, execution, payment, reporting, and record keeping.

The platform combines traditionally separate workflows while preserving clear domain boundaries, permissions, auditability, and company data isolation.

BOURXE is designed for use across mobile, foldable, and desktop interfaces, with Android support through Capacitor.

## Key Capabilities

| Area | Capabilities |
|---|---|
| **Sales & Commercial** | Quotations, invoices, payments, receipts, pricing, and commercial document workflows |
| **Procurement** | RFQs, item management, sourcing records, and procurement workflows |
| **Cost & Pricing** | Cost & Pricing Sheets for structured costing and commercial preparation |
| **Logistics** | Waybills, deliveries, internal transfers, and movement records |
| **Service Operations** | Customer Service Reports and service activity records |
| **Projects** | Project workspaces connecting clients, documents, financial activity, and operational records |
| **Accounting** | Chart of accounts, journal entries, double-entry accounting, and financial reporting |
| **Compliance** | Compliance tracking, regulatory records, and supporting documentation |
| **Documents** | Letters, PDF generation, document import/export, and batch operations |
| **Business Data** | Client management, Item Library, historical records, and reporting |
| **Administration** | Workspaces, companies, users, roles, permissions, settings, notifications, and audit records |

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 |
| Language | TypeScript 5.9 |
| Build Tool | Vite 7 |
| Runtime | Bun |
| Styling | Tailwind CSS 3.4 + Radix UI primitives |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Web Deployment | Vercel |
| Mobile | Capacitor / Android |

## Project Structure

```text
src/
├── app/           Application bootstrap
├── assets/        Static application assets
├── auth/          Authentication and session handling
├── components/    Shared and module-specific UI
├── config/        Application and module configuration
├── context/       React context
├── contexts/      Additional application contexts
├── domain/        Business and domain logic
├── hooks/         Custom React hooks
├── lib/           Shared libraries and core utilities
├── modules/       Feature modules
├── pages/         Route-level pages
├── services/      External service integrations
├── styles/        Global styles
├── supabase/      Supabase-related application logic
├── tests/         Critical-path tests
├── types/         Shared TypeScript types
└── utils/         Shared utilities

android/           Capacitor Android project
docs/              Product, architecture, design, and engineering documentation
supabase/          Database migrations and Supabase configuration

Getting Started
Requirements

Bun
Git
Access to the required Supabase environment configuration

Clone the repository:
git clone https://github.com/Bigdrops/bigdrops-app.git
cd bigdrops-app

The repository continues to use the `bigdrops-app` project path and `BIGDROPS` / `bigdrops` identifiers for infrastructure, historical references, and compatibility.

Install dependencies:
bun install

Create a .env file in the project root:
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

Start the development server:
bun run dev

Local Verification
Use the project's lightweight verification commands during development:
bun run typecheck
bun run lint

Additional checks may be required depending on the area being changed. Follow AGENTS.md and the relevant project skills before modifying the codebase.

Build constraint: Do not run bun run build on the constrained local development host. Production builds are handled through the designated build and deployment workflow.

Common Scripts



Command
Purpose




bun run dev
Start the Vite development server


bun run typecheck
Run TypeScript type checking


bun run lint
Run ESLint


bun run test
Run the project test suite


bun run preview
Preview an available production build


bun run audit:load
Check Supabase query load risk


bun run audit:supabase-queries
Audit Supabase query patterns



Architecture
BOURXE uses a modular domain architecture with shared infrastructure for business documents, calculations, permissions, tenancy, PDF generation, and operational workflows.
Core architectural principles include:

Centralized business rules — shared calculations and critical document behavior use defined sources of truth.
Tenant isolation — company data is separated through workspace, entity, permission, and tenant boundaries.
Action-based permissions — access is based on permitted business actions rather than UI visibility alone.
Domain separation — invoices, quotations, logistics, accounting, compliance, projects, and other modules maintain explicit domain responsibilities.
Database integrity — critical persisted business rules are enforced at the appropriate database boundary.
Auditability — sensitive business and document operations maintain traceable records where required.
Responsive presentation — interfaces are designed across mobile, foldable, and desktop form factors.
Shared document infrastructure — related document types reuse common infrastructure where doing so preserves consistent behavior.

Detailed implementation contracts belong in the relevant PRDs and engineering documentation rather than this README.
Development Workflow
Before changing the repository:

Read AGENTS.md.
Identify the area of the system being changed.
Consult docs/PROJECTSKILLINDEX.md.
Load the relevant registered project skills.
Inspect existing implementation patterns before introducing new ones.
Keep changes scoped to the requested objective.
Perform the verification required for that type of change.

Do not perform broad refactors or migrations as part of unrelated work.
Documentation
The repository contains detailed product, architecture, design, migration, and implementation documentation under docs/.
Primary documentation areas include:



Area
Location




Multi-tenancy
docs/prd/multi-tenancy/


Taxation & compliance
docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/


Adaptive UI/UX
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/


Engineering reports
docs/reports/


Project skill registry
docs/PROJECTSKILLINDEX.md



AGENTS.md at the repository root defines the mandatory workflow and repository rules for coding agents.
Repository Compatibility
The product is named BOURXE. Parts of the underlying system retain historical `BIGDROPS` / `bigdrops` identifiers.

These identifiers remain in repository infrastructure, database objects, environment configuration, routes, APIs, storage paths, historical documentation, and other compatibility-sensitive areas. They are not renamed here.

Do not treat the product-name change as authorization for a repository-wide rename. Technical identifiers should change only through an explicitly scoped migration.
License
Proprietary software.
BOURXE is a private business platform. Unauthorized redistribution or external modification is not permitted.

