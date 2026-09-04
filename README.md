# BIGDROPS

Internal business operations tool used by company staff to create, manage, and export documents across invoicing, logistics, and project tracking.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3FCF8E?logo=supabase)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)](https://vitejs.dev)
[![Bun](https://img.shields.io/badge/Bun-1.x-000?logo=bun)](https://bun.sh)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://vercel.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.x-119EFF?logo=capacitor)](https://capacitorjs.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

---

## What is BIGDROPS

BIGDROPS is a private internal operations tool used exclusively by company staff. It manages document creation, financial calculations, logistics tracking, and project aggregation. The only customer-facing output is generated PDFs.

## Core Modules

| Module | Description |
|---|---|
| **Invoices** | Create, edit, and view invoices with JSONB line items, tax, extra charges, and PDF generation (`INV-000001`) |
| **Quotations** | Quote generation reusing the invoice domain layer for consistent pricing, items, and PDF output |
| **Letters** | Formal correspondence documents with letterhead, PDF export, and project/document linking |
| **CSR** | Customer Service Reports with service date tracking, problem/service logs, technician remarks, and PDF export |
| **Waybills (External)** | Client delivery notes with prefix engine numbering (`WBL-E-000001`), custody sign-off, and field-masked PDFs |
| **Waybills (Internal)** | Internal transfer notes (`WBL-ME-000001`) with `purpose` field enforced as NULL by database constraint |
| **Payments** | Record payments against invoices with amount, method, date, and automatic outstanding balance computation |
| **Receipts** | Immutable payment receipts with sequential numbering and PDF output |
| **Projects** | Project-centric aggregation of invoices, payments, quotations, and CSRs under a single client engagement |
| **Client Management** | Add, edit, view, and link clients to projects and documents |
| **Workspaces & Companies** | Multi-company organization: workspace selection and creation, entity (company) switching, invitations, and role-based access |
| **Reports** | Aggregated reporting views across documents and financials |
| **Compliance Hub** | Compliance tracking and regulatory document management |
| **Item Library** | Centralized catalog of reusable line items across documents |
| **BOQ** | Bill of Quantities creation and management |
| **RFQ** | Request for Quotation creation and management |
| **Notifications** | In-app notification system for document events and updates |
| **Audit** | Blank waybill token audit log and document change tracking |
| **Dashboard** | Overview of operations with summary widgets and quick-access tiles |
| **Settings** | Company profile, branding, banking, signatories, document defaults, user management, theme, archives, and notifications |
| **Lifetime Data Hub** | Historical data aggregation and lifetime metrics view |
| **Document Import/Export** | Bulk import and export of document data |
| **Batch Operations** | Batch actions across multiple documents |

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 + Radix UI primitives |
| Database | Supabase (Postgres) with JSONB validation constraints |
| Auth | Supabase Auth (Row Level Security) |
| Storage | Supabase Storage |
| Build Tool | Vite 7 |
| Runtime | Bun |
| Deployment | Vercel |
| Mobile | Capacitor 8 (Android) |

## Project Structure

```
src/
├── app/           App bootstrap (useSyncBootstrap)
├── assets/        Static assets
├── auth/          Session error handling
├── components/    Shared UI, document components, module-specific components
├── config/        Module adapters, filter configs, quick tiles
├── context/       React contexts (DocumentQueryContext)
├── contexts/      Additional React contexts
├── domain/        Domain logic per module (invoice, quotation, waybill, csr, boq, rfq, audit, compliance)
├── hooks/         Custom React hooks
├── lib/           Calculations.ts (single source of truth), fonts, icons, PDF, themes, tenant client, utilities
├── modules/       Module-specific logic (invoices, quotations, compliance, item-library)
├── pages/         Route-level page components
├── services/      External service integrations
├── styles/        Global CSS
├── supabase.ts    Supabase client bootstrap
├── supabase/      Supabase policies
├── tests/         Critical path tests
├── types/         Shared type definitions
└── utils/         Utility functions (export compilers, number formatting)
```

## Getting Started

```bash
git clone https://github.com/Bigdrops/bigdrops-app.git
bun install
bun run dev
```

> **Note:** Do not run `bun run build` locally. Production builds are RAM-intensive and are handled by Vercel / the project lead. Use `bun run typecheck` and `bun run lint` to verify changes.

## Environment Variables

Create a `.env` file in the project root before running `bun run dev`:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Both are required — the Supabase client in `src/supabase.ts` will not initialize without them.

## Scripts

| Script | Command | Description |
|---|---|---|
| dev | `bun run dev` | Start Vite dev server |
| build | `bun run build` | Production build |
| test | `bun run test` | Run critical path tests (`node --test`) |
| typecheck | `bun run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| lint | `bun run lint` | ESLint across the project |
| preview | `bun run preview` | Preview production build locally |
| audit:load | `bun run audit:load` | Check load risk on Supabase queries |
| audit:supabase-queries | `bun run audit:supabase-queries` | Audit Supabase query patterns |

## Architecture Highlights

- **Single source of truth for calculations.** `src/lib/Calculations.ts` owns all pricing, tax, and total computations. `computeDocument()` is the only entry point used in production. `calcTotals()` and `resolveRowVat()` in `src/domain/invoice/calculations.ts` are deprecated with no production callers as of 2026-09-04. No duplicate logic exists elsewhere.
- **Field masking rules.** Waybill PDFs render blank pen-and-ink lines for empty fields while the on-screen view hides them. Inline eye toggles let operators hide fields from PDF output without deleting data.
- **Prefix engine with `MAX(suffix)` sequence logic.** Document numbers are generated dynamically (`WBL-E-000001`, `WBL-ME-000001`, `INV-000001`) with a permanent blank token audit log that prevents number reuse.
- **JSONB structural validation at DB level.** Waybill `items` arrays are enforced by a Postgres CHECK constraint (`validate_waybill_items`): the array must be non-empty and every item must have a `description` and a numeric `qty` greater than 0.
- **Invoice-to-waybill spawning pipeline.** A transform pipeline extracts item descriptions, quantities, and units from invoices, strips all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`), and binds the new waybill to the parent document.
- **Schema-per-entity multi-tenancy.** Every company (entity) owns an isolated Postgres schema. The app resolves the active workspace and entity at startup and routes all queries through a tenant-scoped Supabase client using `supabase.schema()`. Row-level security and action-based permissions enforce isolation. The authoritative model is `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`.

## Agent Workflow

All coding agents must read `AGENTS.md` at the project root before modifying any file and consult the relevant skill files in `.agents/skills/` before writing code. The full skills registry is cataloged at `docs/PROJECTSKILLINDEX.md`.

## License

Proprietary. This is a private internal tool. All rights reserved. Not licensed for external use, redistribution, or modification outside the company.
